/* Clearspring — a Watch course page.

   Plays the course in YouTube's privacy-enhanced embed, loaded only when you
   press play (so nothing is fetched from YouTube before then). Talks to the
   player with plain postMessage — the same messages YouTube's own IFrame API
   sends — so no YouTube script is loaded into the app.

   Remembers your lesson and position, ticks lessons you finish, learns lesson
   titles beyond the first 15 as you reach them, and keeps your notes. */
(function () {
  "use strict";
  var L = window.Learn; if (!L) return;
  var root = document.getElementById("wc");
  var slug = root.dataset.slug;
  var D = JSON.parse(document.getElementById("wcData").textContent);
  var $ = function (id) { return document.getElementById(id); };
  var ORIGIN = "https://www.youtube-nocookie.com";
  var frame = null, ready = false, info = {}, lastSaved = 0, current = { n: 1, vid: null }, pendingSeek = 0;
  var serverTotal = +root.dataset.total || 0;

  function lessonEls() { return Array.prototype.slice.call($("wcLessons").querySelectorAll("li")); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  /* ---------- lesson list ---------- */
  function ensureRow(n, vid) {
    var li = $("wcLessons").querySelector('li[data-n="' + n + '"]');
    if (li) { if (vid && !li.dataset.vid) li.dataset.vid = vid; return li; }
    // A lesson beyond the ones the server knows about (playlist feeds list 15).
    var ol = $("wcLessons");
    for (var k = ol.children.length + 1; k <= n; k++) {
      li = el("li"); li.dataset.n = k;
      var b = el("button", "wc-lesson"); b.type = "button";
      b.append(el("span", "wc-n", String(k)), el("span", "wc-lt", L.get(slug).titles[k] || "Lesson " + k), el("span", "wc-len", ""), el("span", "wc-tick"));
      b.lastChild.setAttribute("aria-hidden", "true");
      li.appendChild(b); ol.appendChild(li);
    }
    if (vid) li.dataset.vid = vid;
    return li;
  }
  function paint() {
    var c = L.get(slug);
    // Titles learned from the player for lessons the server didn't list
    Object.keys(c.titles).forEach(function (n) {
      var li = $("wcLessons").querySelector('li[data-n="' + n + '"]');
      if (li) { var t = li.querySelector(".wc-lt"); if (/^Lesson \d+$/.test(t.textContent)) t.textContent = c.titles[n]; }
    });
    var total = Math.max(serverTotal, c.total || 0, lessonEls().length);
    var done = 0;
    lessonEls().forEach(function (li) {
      var on = !!(li.dataset.vid && c.done[li.dataset.vid]);
      if (on) done++;
      li.classList.toggle("done", on);
      li.classList.toggle("now", +li.dataset.n === current.n && !!frame);
      var b = li.querySelector(".wc-lesson");
      b.setAttribute("aria-label", "Lesson " + li.dataset.n + ": " + li.querySelector(".wc-lt").textContent + (on ? " (watched)" : ""));
      if (+li.dataset.n === current.n && frame) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
    done = Math.max(done, Object.keys(c.done).length > lessonEls().length ? Object.keys(c.done).length : done);
    $("wcBar").style.width = total ? Math.round(done / total * 100) + "%" : "0";
    if (done) $("wcProgT").textContent = done + " of " + total + " lessons watched" + (done >= total && total ? ". Well done!" : "");
    $("wcReset").hidden = !done;
    var last = c.last;
    if (!frame) {
      $("wcPosterT").textContent = last ? "Carry on: lesson " + last.n : (done ? "Carry on" : "Start the course");
      if (last && last.vid && $("wcPosterImg")) $("wcPosterImg").src = "https://i.ytimg.com/vi/" + last.vid + "/hqdefault.jpg";
    }
  }

  /* ---------- the player ---------- */
  function send(func, args) {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage(JSON.stringify({ event: "command", func: func, args: args || [], id: 1, channel: "widget" }), ORIGIN);
  }
  function listen() {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), ORIGIN);
  }
  function embedSrc(n) {
    var p = "enablejsapi=1&rel=0&modestbranding=1&playsinline=1&autoplay=1&origin=" + encodeURIComponent(location.origin);
    if (D.playlist) return ORIGIN + "/embed/videoseries?list=" + encodeURIComponent(D.playlist) + "&index=" + (n - 1) + "&" + p;
    var ids = D.lessons.slice(n - 1).concat(D.lessons.slice(0, n - 1));
    return ORIGIN + "/embed/" + ids[0] + "?playlist=" + ids.slice(1).join(",") + "&" + p;
  }
  // For a list of videos the embed's queue starts at lesson n, so its
  // positions are shifted; work out the real lesson number.
  var queueStart = 1;
  function lessonFromIndex(idx) {
    if (D.playlist) return idx + 1;
    return ((idx + queueStart - 1) % D.lessons.length) + 1;
  }

  function play(n, at) {
    n = Math.max(1, n || 1);
    current.n = n; pendingSeek = at || 0;
    var row = $("wcLessons").querySelector('li[data-n="' + n + '"]');
    L.setLast(slug, n, row ? row.dataset.vid : null, at || 0);
    if (!frame) {
      frame = document.createElement("iframe");
      frame.title = D.title;
      frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.setAttribute("allowfullscreen", "");
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      queueStart = n;
      frame.src = embedSrc(n);
      $("wcPlayer").replaceChildren(frame);
      frame.addEventListener("load", function () {
        ready = false;
        var tries = 0;
        var iv = setInterval(function () { if (ready || ++tries > 20) clearInterval(iv); else listen(); }, 250);
      });
    } else if (D.playlist || ready) {
      send("playVideoAt", [D.playlist ? n - 1 : ((n - queueStart + D.lessons.length) % D.lessons.length)]);
    }
    paint();
    $("wcPlayer").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== ORIGIN || !frame || e.source !== frame.contentWindow) return;
    var m; try { m = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch (err) { return; }
    if (!m || typeof m !== "object") return;
    if (m.event === "onReady" || m.event === "initialDelivery") {
      if (!ready) {
        ready = true;
        send("addEventListener", ["onStateChange"]);
        if (pendingSeek > 5) { var s = pendingSeek; pendingSeek = 0; setTimeout(function () { send("seekTo", [s, true]); }, 400); }
      }
    }
    var i = m.info;
    if (!i || typeof i !== "object") return;
    Object.assign(info, i);
    if (Array.isArray(i.playlist) && i.playlist.length) {
      var tot = i.playlist.length;
      if (tot > serverTotal) { L.setTotal(slug, tot); }
    }
    var vid = info.videoData && info.videoData.video_id;
    if (typeof info.playlistIndex === "number" && info.playlistIndex >= 0) {
      var n = lessonFromIndex(info.playlistIndex);
      if (n !== current.n || (vid && current.vid !== vid)) {
        current.n = n; current.vid = vid;
        var li = ensureRow(n, vid);
        if (info.videoData && info.videoData.title) {
          L.learnTitle(slug, n, info.videoData.title);
          var t = li.querySelector(".wc-lt"); if (/^Lesson \d+$/.test(t.textContent)) t.textContent = info.videoData.title;
        }
        paint();
      }
    }
    var dur = +info.duration || 0, t2 = +info.currentTime || 0;
    if (vid && dur > 0) {
      var now = Date.now();
      if (now - lastSaved > 5000) { lastSaved = now; L.setLast(slug, current.n, vid, t2); }
      if ((t2 / dur > 0.9 || info.playerState === 0) && !L.get(slug).done[vid]) {
        L.markDone(slug, vid); paint();
      }
    }
  });

  /* ---------- controls ---------- */
  $("wcPoster").addEventListener("click", function () {
    var last = L.get(slug).last;
    if (last && last.n) play(last.n, last.t);
    else {
      // First lesson not yet watched
      var c = L.get(slug), first = lessonEls().find(function (li) { return !c.done[li.dataset.vid]; });
      play(first ? +first.dataset.n : 1);
    }
  });
  $("wcLessons").addEventListener("click", function (e) {
    var b = e.target.closest(".wc-lesson"); if (!b) return;
    var li = b.closest("li");
    var last = L.get(slug).last;
    play(+li.dataset.n, last && last.n === +li.dataset.n ? last.t : 0);
  });
  $("wcReset").addEventListener("click", function () {
    if (!confirm("Clear the ticks and start this course again?")) return;
    L.reset(slug); paint();
  });

  /* ---------- notes ---------- */
  var notes = $("wcNotes"), nt = null;
  notes.value = L.get(slug).notes || "";
  notes.addEventListener("input", function () {
    clearTimeout(nt);
    $("wcSaved").textContent = "";
    nt = setTimeout(function () { L.setNotes(slug, notes.value); $("wcSaved").textContent = "Saved"; }, 700);
  });

  /* Lessons the player taught us about on an earlier visit */
  var known = L.get(slug);
  var maxN = Object.keys(known.titles).reduce(function (m, k) { return Math.max(m, +k); }, 0);
  if (D.playlist && maxN > lessonEls().length) ensureRow(maxN);
  if (D.playlist && known.total > lessonEls().length && $("wcMore")) {
    $("wcMore").textContent = "And " + (known.total - lessonEls().length) + " more lessons. They play on from the last one in the list.";
  }
  paint();
  L.sync().then(function (ch) { if (ch) { notes.value = L.get(slug).notes || notes.value; paint(); } });
})();
