/* Clearspring — shareable verse images
   Draws the selected verse onto a canvas as an elegant image and hands it to
   the phone's native share sheet, with a caption that links back to the app.
   Fallbacks: native share with image -> native share text -> clipboard copy. */

window.VerseShare = (function () {
  "use strict";

  const CARD = {
    width: 1080, height: 1080,
    bg: "#0B2E2F", ink: "#F5F8F7", accent: "#5FDCCB", muted: "rgba(245,248,247,0.6)",
    margin: 110, verseFont: "Literata", labelFont: "Figtree",
  };

  function wrapLines(ctx, text, maxWidth) {
    const words = text.split(/\s+/); const lines = []; let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
      else { line = test; }
    }
    if (line) lines.push(line);
    return lines;
  }

  function fitVerse(ctx, text, maxWidth, maxHeight) {
    for (let size = 72; size >= 34; size -= 2) {
      ctx.font = `400 ${size}px "${CARD.verseFont}", Georgia, serif`;
      const lineHeight = size * 1.34;
      const lines = wrapLines(ctx, text, maxWidth);
      if (lines.length * lineHeight <= maxHeight) return { size, lineHeight, lines };
    }
    ctx.font = `400 34px "${CARD.verseFont}", Georgia, serif`;
    const lineHeight = 34 * 1.34;
    return { size: 34, lineHeight, lines: wrapLines(ctx, text, maxWidth) };
  }

  async function drawCard(verseText, refLabel) {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.load(`400 72px "${CARD.verseFont}"`);
        await document.fonts.load(`600 34px "${CARD.labelFont}"`);
        await document.fonts.ready;
      } catch (e) {}
    }
    const canvas = document.createElement("canvas");
    canvas.width = CARD.width; canvas.height = CARD.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = CARD.bg; ctx.fillRect(0, 0, CARD.width, CARD.height);

    // Ripples of light from the top corner, like sun on spring water.
    ctx.strokeStyle = CARD.accent; ctx.lineWidth = 2;
    for (let r = 60; r < 760; r += 46) {
      ctx.globalAlpha = Math.max(0, 0.16 - r / 5200);
      ctx.beginPath(); ctx.arc(CARD.width * 0.82, CARD.height * 0.12, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const maxWidth = CARD.width - CARD.margin * 2;
    const maxVerseHeight = CARD.height - CARD.margin * 2 - 160;
    const fit = fitVerse(ctx, verseText, maxWidth, maxVerseHeight);

    ctx.fillStyle = CARD.ink;
    ctx.font = `400 ${fit.size}px "${CARD.verseFont}", Georgia, serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const blockHeight = fit.lines.length * fit.lineHeight;
    let y = (CARD.height - blockHeight) / 2 - 20;
    for (const line of fit.lines) { ctx.fillText(line, CARD.width / 2, y + fit.lineHeight / 2); y += fit.lineHeight; }

    ctx.fillStyle = CARD.accent;
    ctx.font = `600 38px "${CARD.labelFont}", system-ui, sans-serif`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(refLabel, CARD.width / 2, y + 70);

    ctx.fillStyle = CARD.ink;
    ctx.font = `600 40px "${CARD.verseFont}", Georgia, serif`;
    const word = "Clearspring", wW = ctx.measureText(word).width, dW = ctx.measureText(".").width;
    ctx.textAlign = "left";
    ctx.fillText(word, CARD.width / 2 - (wW + dW) / 2, CARD.height - 90);
    ctx.fillStyle = CARD.accent;
    ctx.fillText(".", CARD.width / 2 - (wW + dW) / 2 + wW, CARD.height - 90);
    ctx.textAlign = "center";
    ctx.fillStyle = CARD.muted;
    ctx.font = `500 26px "${CARD.labelFont}", system-ui, sans-serif`;
    ctx.fillText(shareHost(), CARD.width / 2, CARD.height - 52);

    return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.92));
  }

  function shareHost() { try { return location.host; } catch (e) { return "Clearspring"; } }
  function caption(v, r, url) { return `"${v}" \u2014 ${r}\n\nvia Clearspring: ${url}`; }

  function copyFallback(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast("Copied. Paste it to share"), () => toast("Couldn't copy"));
    } else { toast("Sharing isn't supported on this device"); }
  }

  function toast(msg) {
    if (window.Toast && typeof window.Toast.show === "function") { window.Toast.show(msg); return; }
    let el = document.getElementById("vshare-toast");
    if (!el) {
      el = document.createElement("div"); el.id = "vshare-toast";
      el.style.cssText = "position:fixed;left:50%;bottom:5.5rem;transform:translateX(-50%);background:rgba(20,20,20,0.92);color:#fff;padding:0.6rem 1rem;border-radius:0.6rem;font-size:0.85rem;z-index:9999;max-width:80%;text-align:center;transition:opacity 0.3s;";
      document.body.appendChild(el);
    }
    el.textContent = msg; el.style.opacity = "1";
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = "0"; }, 2200);
  }

  async function share(opts) {
    const verseText = (opts && opts.text || "").trim();
    const refLabel = (opts && opts.ref || "").trim();
    const url = (opts && opts.url) || location.origin;
    if (!verseText) return;
    const cap = caption(verseText, refLabel, url);

    let blob = null;
    try { blob = await drawCard(verseText, refLabel); } catch (e) { blob = null; }

    if (blob && navigator.canShare) {
      const file = new File([blob], "verse.png", { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text: cap }); return; }
        catch (e) { if (e && e.name === "AbortError") return; }
      }
    }
    if (navigator.share) {
      try { await navigator.share({ text: cap }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    copyFallback(cap);
  }

  return { share: share };
})();
