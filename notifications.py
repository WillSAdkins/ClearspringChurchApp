"""Web push notifications.

Sending requires the `pywebpush` package and a VAPID key pair. Both are optional:
if either is missing the app runs normally and simply doesn't send. That means a
church can deploy without notifications and switch them on later.

Setup on the server:
    pip install pywebpush
    python -c "from notifications import generate_vapid_keys; generate_vapid_keys()"
then set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT in the environment.
"""

import json
import os

import requests

try:
    from pywebpush import webpush, WebPushException
    PUSH_AVAILABLE = True
except ImportError:  # pragma: no cover - depends on deployment
    webpush = None
    WebPushException = Exception
    PUSH_AVAILABLE = False


def _clean_key(raw):
    """Environment variables often arrive with stray quotes or whitespace,
    especially when pasted into a Windows Command Prompt. A single trailing
    space is enough to make a VAPID key invalid, so normalise it here."""
    if not raw:
        return ""
    return raw.strip().strip('"').strip("'").strip()


VAPID_PUBLIC_KEY = _clean_key(os.environ.get("VAPID_PUBLIC_KEY", ""))
VAPID_PRIVATE_KEY = _clean_key(os.environ.get("VAPID_PRIVATE_KEY", ""))
VAPID_SUBJECT = _clean_key(os.environ.get("VAPID_SUBJECT", "mailto:hello@clearspringchurch.com"))


def validate_public_key(key=None):
    """Check the public key is the 65-byte uncompressed point browsers require.

    Returns (ok, message). The browser's own error for a bad key is opaque,
    so this gives a usable explanation instead.
    """
    import base64

    key = VAPID_PUBLIC_KEY if key is None else key
    if not key:
        return False, "No public key set."
    if len(key) != 87:
        return False, (f"Public key is {len(key)} characters, expected 87. "
                       "It was probably cut short when copying, or has extra "
                       "characters on the end.")
    try:
        padded = key + "=" * ((4 - len(key) % 4) % 4)
        raw = base64.urlsafe_b64decode(padded)
    except Exception:
        return False, "Public key isn't valid base64 — check for stray spaces or quotes."
    if len(raw) != 65:
        return False, f"Public key decodes to {len(raw)} bytes, expected 65."
    if raw[0] != 4:
        return False, "Public key isn't in the uncompressed-point format browsers need."
    return True, "Public key looks valid."


# Notification types. Everything is opt-in — nothing is enabled by default.
NOTIFICATION_TYPES = [
    {
        "key": "service",
        "name": "Service reminders",
        "blurb": "A nudge before Sunday services and midweek meetings",
    },
    {
        "key": "sermon",
        "name": "New sermons",
        "blurb": "When a new message is added to the archive",
    },
    {
        "key": "event",
        "name": "Event reminders",
        "blurb": "The day before events you might want to attend",
    },
    {
        "key": "prayer",
        "name": "Prayer wall",
        "blurb": "When new requests are shared publicly. Private requests never trigger these.",
    },
    {
        "key": "emergency",
        "name": "Urgent announcements",
        "blurb": "Cancellations, closures and anything genuinely urgent",
    },
    {
        "key": "reading",
        "name": "Daily reading reminder",
        "blurb": "A nudge at the time you choose to read today’s passage",
    },
    {
        "key": "praytime",
        "name": "Daily prayer reminder",
        "blurb": "A gentle prompt at the time you choose to stop and pray",
    },
    {
        "key": "groups",
        "name": "Your groups",
        "blurb": "New posts and prayer requests in groups you belong to (you need to be signed in)",
    },
    {
        "key": "encouragement",
        "name": "Daily encouragement",
        "blurb": "A verse or short thought each morning",
    },
]

TYPE_KEYS = {t["key"] for t in NOTIFICATION_TYPES}


def is_configured():
    """True if push can actually be sent."""
    return bool(PUSH_AVAILABLE and VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY)


def generate_vapid_keys():
    """Print a fresh VAPID key pair for the server environment."""
    try:
        import base64
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
    except ImportError:
        print("Missing dependency. Run:  pip install pywebpush")
        return None

    def b64url(raw):
        return base64.urlsafe_b64encode(raw).decode("utf8").rstrip("=")

    # Generate a P-256 key pair directly. py_vapid wraps this same primitive,
    # but its helper API has changed between versions, so we do it ourselves.
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    # Public key as an uncompressed point — the form browsers expect for
    # applicationServerKey (65 raw bytes, 87 chars once base64url encoded).
    public = b64url(
        public_key.public_bytes(
            serialization.Encoding.X962,
            serialization.PublicFormat.UncompressedPoint,
        )
    )

    # Private key as the raw 32-byte scalar, which is what pywebpush accepts.
    private = b64url(private_key.private_numbers().private_value.to_bytes(32, "big"))

    print("VAPID keys generated.\n")
    print("Windows (this session only):")
    print(f'  set VAPID_PUBLIC_KEY={public}')
    print(f'  set VAPID_PRIVATE_KEY={private}')
    print('  set VAPID_SUBJECT=mailto:you@clearspringchurch.com')
    print("\nMac/Linux:")
    print(f'  export VAPID_PUBLIC_KEY={public}')
    print(f'  export VAPID_PRIVATE_KEY={private}')
    print('  export VAPID_SUBJECT=mailto:you@clearspringchurch.com')
    print("\nKeep the private key secret. Never commit it to GitHub.")
    return public, private


# ---------------------------------------------------------------------------
# Native apps: Firebase Cloud Messaging, HTTP v1 API
#
# Google switched off the old "server key" API (fcm.googleapis.com/fcm/send)
# in 2024. The v1 API authenticates with a service account instead: download
# its JSON key from Firebase (Project settings → Service accounts → Generate
# new private key) and paste the whole JSON into the FIREBASE_SERVICE_ACCOUNT
# environment variable on Render. Firebase relays to Apple (APNs) for iPhones
# once the APNs key is uploaded in Firebase, so one setting covers both apps.
# ---------------------------------------------------------------------------
import base64 as _b64
import time as _time

_fcm_token = {"value": None, "expires": 0}


def _service_account():
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT", "").strip()
    if not raw:
        return None
    try:
        if not raw.startswith("{"):
            raw = _b64.b64decode(raw).decode("utf-8")   # accept it base64-encoded too
        info = json.loads(raw)
        if info.get("client_email") and info.get("private_key") and info.get("project_id"):
            return info
    except Exception:
        pass
    return None


def native_is_configured():
    """True when a Firebase service account is set for the native apps."""
    return _service_account() is not None


def native_status():
    """For Admin → Status: what's set up, in words."""
    if _service_account():
        return "ok"
    if os.environ.get("FCM_SERVER_KEY"):
        return "legacy"   # the old key no longer works
    return "off"


def _b64url(data):
    return _b64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _fcm_access_token(info):
    """An OAuth access token for FCM, from a signed JWT (cached for its hour)."""
    now = int(_time.time())
    if _fcm_token["value"] and _fcm_token["expires"] - 60 > now:
        return _fcm_token["value"]
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    header = {"alg": "RS256", "typ": "JWT"}
    claims = {"iss": info["client_email"], "scope": "https://www.googleapis.com/auth/firebase.messaging",
              "aud": info.get("token_uri") or "https://oauth2.googleapis.com/token", "iat": now, "exp": now + 3600}
    signing_input = _b64url(json.dumps(header, separators=(",", ":")).encode()) + "." + \
        _b64url(json.dumps(claims, separators=(",", ":")).encode())
    key = serialization.load_pem_private_key(info["private_key"].encode(), password=None)
    sig = key.sign(signing_input.encode(), padding.PKCS1v15(), hashes.SHA256())
    assertion = signing_input + "." + _b64url(sig)
    resp = requests.post(claims["aud"], data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                                              "assertion": assertion}, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    _fcm_token["value"] = data["access_token"]
    _fcm_token["expires"] = now + int(data.get("expires_in", 3600))
    return _fcm_token["value"]


def send_to_native(token, platform, title, body, url="/", tag=None):
    """Send to an iOS/Android device via FCM HTTP v1.
    Returns (ok, should_remove_subscription) to match the Web Push signature."""
    info = _service_account()
    if not info or not token:
        return False, False
    message = {
        "token": token,
        "notification": {"title": title, "body": body},
        "data": {"url": url or "/", "tag": tag or "clearspring"},
        "android": {"priority": "high", "notification": {"tag": tag or "clearspring", "click_action": "FCM_PLUGIN_ACTIVITY"}},
        "apns": {"payload": {"aps": {"sound": "default", "thread-id": tag or "clearspring"}}},
    }
    try:
        access = _fcm_access_token(info)
        resp = requests.post(
            f"https://fcm.googleapis.com/v1/projects/{info['project_id']}/messages:send",
            headers={"Authorization": f"Bearer {access}", "Content-Type": "application/json"},
            json={"message": message}, timeout=10)
    except Exception:
        return False, False
    if resp.status_code == 200:
        return True, False
    # The app was deleted or the token is stale: forget this device.
    try:
        err = resp.json().get("error", {})
        codes = {d.get("errorCode") for d in err.get("details", []) if isinstance(d, dict)}
    except ValueError:
        err, codes = {}, set()
    if resp.status_code == 404 or "UNREGISTERED" in codes or (resp.status_code == 400 and "INVALID_ARGUMENT" in codes):
        return False, True
    if resp.status_code == 401:
        _fcm_token["value"] = None
    return False, False


def send_to_subscription(subscription_info, title, body, url="/", tag=None):
    """Send one notification. Returns (ok, should_remove_subscription)."""
    # Native app tokens take a different path entirely — no VAPID involved.
    if isinstance(subscription_info, dict) and subscription_info.get("native"):
        return send_to_native(
            subscription_info.get("token", ""),
            subscription_info.get("platform", ""),
            title, body, url, tag,
        )

    if not is_configured():
        return False, False

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "tag": tag or "clearspring",
    })

    try:
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_SUBJECT},
            timeout=10,
        )
        return True, False
    except WebPushException as e:
        # 404/410 mean the subscription is dead and should be cleaned up.
        status = getattr(getattr(e, "response", None), "status_code", None)
        return False, status in (404, 410)
    except Exception:
        return False, False
