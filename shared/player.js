/* ============================================================
 * 播放器 · 共享底座
 * 把 B 站播放器嵌进页面里 —— 点开曲子就能原地听，不用跳走。
 * 每首曲子预配一个 bvid；没有预配录音的曲子，给一个「去 B 站找」
 * 的入口，绝不拿合成音冒充。
 *
 * B 站播放器不开放控制接口，所以「跳到某一句」＝ 重新载入 iframe
 * 并带上 t=秒 参数，这也正是老师原版的做法。
 * 「听这一句」还能限定时长：到点把 iframe 重新载入成暂停状态（不带
 * autoplay），声音就停住了 —— 不用手动按暂停，也不会一路放下去。
 * ============================================================ */
(function (global) {
  "use strict";

  var PLAYER = "https://player.bilibili.com/player.html";
  var SEARCH = "https://search.bilibili.com/all?keyword=";
  var WATCH = "https://www.bilibili.com/video/";

  var P = {
    el: null,
    song: null,
    iframe: null,
    at: 0,
    page: 1,
    segTimer: null,

    /* 把播放器挂到页面顶部的坞里 */
    dock: function (container, song) {
      this.stopSeg();
      this.el = container;
      this.song = song;
      this.at = 0;
      this.page = (song && song.p) || 1;
      this.iframe = null;
      if (!container) return;
      container.innerHTML = "";
      container.classList.remove("min");
      container.classList.add("on");
      container.appendChild(song && song.bvid ? this._player(song) : this._search(song));
    },

    undock: function () {
      this.stopSeg();
      if (this.el) {
        this.el.innerHTML = "";
        this.el.classList.remove("on");
      }
      this.el = null;
      this.song = null;
      this.iframe = null;
      this.at = 0;
      this.page = 1;
    },

    src: function (bvid, sec, autoplay, page) {
      var url = PLAYER + "?bvid=" + bvid + "&high_quality=1&autoplay=" + (autoplay ? 1 : 0) +
        "&danmaku=0";
      if (page && page > 1) url += "&p=" + page;
      if (sec) url += "&t=" + sec;
      return url;
    },

    _player: function (song) {
      var self = this;

      var wrap = document.createElement("div");
      wrap.className = "player-card";

      var box = document.createElement("div");
      box.className = "frame-box";
      var f = document.createElement("iframe");
      f.setAttribute("scrolling", "no");
      f.setAttribute("frameborder", "0");
      f.setAttribute("allowfullscreen", "true");
      f.setAttribute("loading", "lazy");
      f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-presentation");
      f.src = this.src(song.bvid, 0, false, this.page);
      box.appendChild(f);
      wrap.appendChild(box);
      this.iframe = f;

      var bar = document.createElement("div");
      bar.className = "player-bar";

      var title = document.createElement("span");
      title.className = "player-title";
      title.textContent = "🎧 " + (song.videoTitle || song.title);
      bar.appendChild(title);

      var open = document.createElement("a");
      open.className = "player-link";
      open.href = WATCH + song.bvid + (this.page > 1 ? "?p=" + this.page : "");
      open.target = "_blank";
      open.rel = "noopener";
      open.textContent = "新窗口打开 ↗";
      bar.appendChild(open);

      var fold = document.createElement("button");
      fold.className = "player-fold";
      fold.type = "button";
      fold.textContent = "收起";
      fold.onclick = function () {
        var min = self.el.classList.toggle("min");
        fold.textContent = min ? "展开" : "收起";
      };
      bar.appendChild(fold);
      wrap.appendChild(bar);

      /* 定位回听：拖进度条太费劲时，直接跳到某一分某一秒 */
      var seek = document.createElement("div");
      seek.className = "player-seek";
      seek.appendChild(el("span", "ps-label", "跳到"));
      var mi = el("input", "ps-in");
      mi.type = "text"; mi.placeholder = "分"; mi.setAttribute("inputmode", "numeric");
      var si = el("input", "ps-in");
      si.type = "text"; si.placeholder = "秒"; si.setAttribute("inputmode", "numeric");
      seek.appendChild(mi);
      seek.appendChild(el("span", "ps-colon", "："));
      seek.appendChild(si);
      var go = el("button", "ps-go", "跳过去听");
      go.type = "button";
      go.onclick = function () {
        var m = parseInt(mi.value || "0", 10) || 0;
        var s = parseInt(si.value || "0", 10) || 0;
        self.seek(m * 60 + s);
      };
      seek.appendChild(go);
      wrap.appendChild(seek);

      return wrap;
    },

    _search: function (song) {
      var wrap = document.createElement("div");
      wrap.className = "player-card search-card";
      var q = song && (song.searchTerm || song.title) || "";
      var line = el("div", "search-line",
        "🔍 《" + (q || "这首曲子") + "》没有预置录音，先去 B 站找一段来听：");
      wrap.appendChild(line);
      var a = document.createElement("a");
      a.className = "player-link strong";
      a.href = SEARCH + encodeURIComponent(song && song.custom ? q : q + " " + (song.composer || ""));
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "🎬 去 B 站搜这首歌";
      wrap.appendChild(a);
      return wrap;
    },

    /* 跳到第 sec 秒（可带分 P）开始播，之后一直放着（自由听） */
    seek: function (sec, page) {
      if (!this.iframe || !this.song || !this.song.bvid) return false;
      this.stopSeg();
      this.at = Math.max(0, Math.floor(sec) || 0);
      if (page) this.page = page;
      this.iframe.src = this.src(this.song.bvid, this.at, true, this.page);
      return true;
    },

    /* 只听这一段：从 sec 秒起播 dur 秒，到点自动停（重载为暂停态） */
    playSeg: function (sec, dur, page, onEnd) {
      if (!this.iframe || !this.song || !this.song.bvid) return false;
      this.stopSeg();
      this.at = Math.max(0, Math.floor(sec) || 0);
      var d = Math.max(4, Math.floor(dur) || 30);
      if (page) this.page = page;
      this.iframe.src = this.src(this.song.bvid, this.at, true, this.page);
      var self = this;
      this.segTimer = setTimeout(function () {
        self.segTimer = null;
        /* 重载为「暂停在句尾」：旧页面卸载 → 声音立刻停住 */
        self.iframe.src = self.src(self.song.bvid, self.at + d, false, self.page);
        if (typeof onEnd === "function") onEnd(d);
      }, d * 1000);
      return true;
    },

    stopSeg: function () {
      if (this.segTimer) {
        clearTimeout(this.segTimer);
        this.segTimer = null;
      }
    },

    current: function () { return this.at; }
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  global.MZPlayer = P;
})(typeof window !== "undefined" ? window : this);