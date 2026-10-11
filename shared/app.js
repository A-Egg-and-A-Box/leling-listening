/* ============================================================
 * 应用控制器 · 共享底座
 * 负责：首页曲库渲染、搜索筛选、路由切换、我的聆听、字号调节。
 * 两个版本共用，靠 init({ senior: true }) 打开乐龄版专属能力。
 * ============================================================ */
(function (global) {
  "use strict";

  var Catalog = global.MZCatalog;
  var Player = global.MZPlayer;
  var LLM = global.MZLLM;

  var BILI_SEARCH = "https://search.bilibili.com/all?keyword=";

  function mk(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var App = {
    senior: false,
    filter: "全部",
    keyword: "",
    session: null,
    fsLevel: 2,
    el: {},

    init: function (opts) {
      this.senior = !!(opts && opts.senior);
      var $ = function (id) { return document.getElementById(id); };
      this.el = {
        home: $("home"), chatView: $("chatView"), grid: $("grid"),
        filter: $("filter"), search: $("search"), chat: $("chat"),
        composer: $("composer"), stageBar: $("stageBar"), subTitle: $("subTitle"),
        recordsSheet: $("recordsSheet"), recordsBody: $("recordsBody"),
        recBtn: $("recBtn"), recCount: $("recCount"), fsBar: $("fsBar"),
        playerDock: $("playerDock"), aiBtn: $("aiBtn")
      };

      this.syncAiBtn();

      if (this.senior) {
        this.fsLevel = 2;
        this.applyFs();
        if (this.el.fsBar) this.el.fsBar.classList.remove("hidden");
      }

      this.bind();
      this.renderFilter();
      this.renderGrid();
      this.refreshCount();
      return this;
    },

    bind: function () {
      var self = this;
      if (this.el.search) {
        this.el.search.addEventListener("input", function (e) {
          self.keyword = e.target.value.trim();
          self.renderGrid();
        });
      }
      if (this.el.recBtn) {
        this.el.recBtn.onclick = function () { self.showRecords(); };
      }
      if (this.el.aiBtn) {
        this.el.aiBtn.onclick = function () { LLM.open(); };
      }
      if (this.el.recordsSheet) {
        this.el.recordsSheet.addEventListener("click", function (e) {
          if (e.target === self.el.recordsSheet) self.hideRecords();
        });
      }
    },

    applyFs: function () {
      document.documentElement.classList.remove("fs-1", "fs-2", "fs-3");
      document.documentElement.classList.add("fs-" + this.fsLevel);
      var btns = document.querySelectorAll("[data-fs]");
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle("active", parseInt(btns[i].getAttribute("data-fs"), 10) === this.fsLevel);
      }
    },

    setFs: function (n) {
      this.fsLevel = n;
      this.applyFs();
    },

    /* ---------- 首页 ---------- */
    renderFilter: function () {
      var self = this;
      var box = this.el.filter;
      box.innerHTML = "";
      var items = ["全部"].concat(Catalog.levels);
      if (this.senior) items = ["推荐"].concat(items);
      items.forEach(function (lv) {
        var c = document.createElement("button");
        c.className = "chip" + (self.filter === lv ? " active" : "");
        c.textContent = lv;
        c.onclick = function () { self.filter = lv; self.renderFilter(); self.renderGrid(); };
        box.appendChild(c);
      });
    },

    visibleSongs: function () {
      var self = this;
      return Catalog.songs.filter(function (s) {
        if (s.custom && self.filter !== "全部") return false;
        if (self.filter === "推荐" && !s.focus) return false;
        if (Catalog.levels.indexOf(self.filter) >= 0 && s.level !== self.filter) return false;
        if (self.keyword) {
          var hay = (s.title + s.composer + s.era).toLowerCase();
          if (hay.indexOf(self.keyword.toLowerCase()) < 0) return false;
        }
        return true;
      });
    },

    renderGrid: function () {
      var self = this;
      var grid = this.el.grid;
      grid.innerHTML = "";
      var list = this.visibleSongs();
      if (!list.length) {
        var e = document.createElement("div");
        e.className = "empty";
        e.textContent = this.keyword
          ? "曲库里暂时没有《" + this.keyword + "》。没关系——到 B 站去搜，或用下面的框粘贴链接，一样能听。"
          : "没有找到曲目，换个词试试。";
        grid.appendChild(e);
      }
      list.forEach(function (s) {
        var card = document.createElement("button");
        card.className = "track-card";
        card.setAttribute("aria-label", s.title + " " + s.composer);

        var cover = document.createElement("div");
        cover.className = "cover";
        cover.style.background = "linear-gradient(135deg, hsl(" + s.hue + " 62% 60%), hsl(" + ((s.hue + 40) % 360) + " 58% 46%))";
        cover.textContent = s.emoji;
        var lv = document.createElement("span");
        lv.className = "lv";
        lv.textContent = s.level;
        cover.appendChild(lv);
        card.appendChild(cover);

        var meta = document.createElement("div");
        meta.className = "track-meta";
        var t = document.createElement("div");
        t.className = "t";
        t.textContent = s.title;
        var c = document.createElement("div");
        c.className = "c";
        c.textContent = s.composer + " · " + s.era;
        meta.appendChild(t);
        meta.appendChild(c);
        card.appendChild(meta);

        card.onclick = function () { self.openSong(s.id); };
        grid.appendChild(card);
      });
      grid.appendChild(this.toolRow());
    },

    /* ---------- 「曲库之外」入口：去 B 站搜 / 粘贴链接直接听 ---------- */
    toolRow: function () {
      var wrap = mk("div", "tool-row");
      wrap.appendChild(this.searchCard());
      wrap.appendChild(this.pasteCard());
      return wrap;
    },

    searchCard: function () {
      var self = this;
      var kw = this.keyword;
      var card = mk("div", "tool-card");
      card.appendChild(mk("div", "tc-t", "🔍 想听曲库以外的歌？"));
      card.appendChild(mk("div", "tc-d", kw
        ? "到 B 站搜「" + kw + "」，挑一段喜欢的，再把链接粘到右边，直接在页面里听。"
        : "在上面搜索框输入曲名，这里就能帮你去 B 站找。曲库里没有的，一样能听。"));
      var btn = mk("button", "tc-btn", kw ? "🎬 去 B 站搜「" + kw + "」" : "🎬 打开 B 站搜索");
      btn.onclick = function () {
        if (kw) window.open(BILI_SEARCH + encodeURIComponent(kw), "_blank", "noopener");
        else if (self.el.search) self.el.search.focus();
      };
      card.appendChild(btn);
      return card;
    },

    pasteCard: function () {
      var self = this;
      var card = mk("div", "tool-card");
      card.appendChild(mk("div", "tc-t", "🔗 粘贴 B 站链接，直接在页面里听"));
      card.appendChild(mk("div", "tc-d", "复制 B 站视频链接（或 BV 号）粘进来，用同一套「先听后说」的引导陪你听，不用跳走。"));
      var line = mk("div", "tc-line");
      var inp = mk("input", "tc-in");
      inp.type = "text";
      inp.placeholder = "https://www.bilibili.com/video/BV… 或 BV…";
      var btn = mk("button", "tc-btn", "开始听");
      var err = mk("div", "tc-err", "");
      function go() {
        var m = (inp.value || "").match(/BV[0-9A-Za-z]{10}/);
        if (!m) {
          err.textContent = "没认出 BV 号，请粘贴完整的 B 站链接或 12 位 BV 号。";
          inp.focus();
          return;
        }
        err.textContent = "";
        self.openBvid(m[0]);
      }
      btn.onclick = go;
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
      line.appendChild(inp);
      line.appendChild(btn);
      card.appendChild(line);
      card.appendChild(err);
      return card;
    },

    /* ---------- 路由 ---------- */
    goHome: function () {
      if (this.session) { this.session = null; }
      Player.undock();
      this.el.chatView.classList.add("hidden");
      this.el.home.classList.remove("hidden");
      this.el.recBtn.classList.remove("hidden");
      this.refreshCount();
      this.renderGrid();
    },

    openSong: function (id) {
      var song = Catalog.byId(id);
      if (!song) return;
      if (song.custom) { this.openCustom(); return; }
      this.openSongObj(song);
    },

    /* 曲库之外：输入曲名，用通用框架陪听（没有预置录音时给 B 站搜索入口） */
    openCustom: function () {
      var name = (this.keyword || "").trim();
      if (!name) {
        name = (window.prompt("想听哪一首？\n（曲库里没有也没关系，输入曲名即可）", "") || "").trim();
      }
      if (!name) { if (this.el.search) this.el.search.focus(); return; }
      var base = Catalog.byId("custom");
      var song = Object.assign({}, base, {
        title: name,
        searchTerm: name,
        custom: true
      });
      delete song.bvid;
      delete song.videoTitle;
      this.openSongObj(song);
    },

    /* 曲库之外：粘贴 B 站链接 / BV 号，直接在页面里听 */
    openBvid: function (bvid) {
      var base = Catalog.byId("custom");
      var song = Object.assign({}, base, {
        title: "自选曲目",
        searchTerm: "",
        custom: true,
        bvid: bvid,
        videoTitle: "B 站视频 " + bvid
      });
      this.openSongObj(song);
    },

    openSongObj: function (song) {
      if (!song) return;
      this.el.home.classList.add("hidden");
      this.el.chatView.classList.remove("hidden");
      this.el.chat.innerHTML = "";
      this.el.subTitle.textContent = song.emoji + " " + song.title;
      this.el.stageBar.innerHTML = "";
      Player.dock(this.el.playerDock, song);

      var self = this;
      this.session = new global.MZEngine.Session({
        song: song,
        chatEl: this.el.chat,
        composerEl: this.el.composer,
        onStage: function (label, i, total) { self.updateStage(label, i, total); }
      });
      this.session.start();
    },

    restart: function () {
      if (this.session) this.openSongObj(this.session.song);
    },

    updateStage: function (label, i, total) {
      var bar = this.el.stageBar;
      var chips = bar.querySelectorAll(".stage-chip");
      if (!chips.length) {
        var names = ["导语"].concat(this.session.song.parts.map(function (p) { return p.label; })).concat(["揭晓"]);
        names.forEach(function (n) {
          var c = document.createElement("span");
          c.className = "stage-chip";
          c.textContent = n;
          bar.appendChild(c);
        });
        chips = bar.querySelectorAll(".stage-chip");
      }
      for (var k = 0; k < chips.length; k++) {
        chips[k].className = "stage-chip" + (chips[k].textContent === label ? " active" : "");
      }
    },

    /* ---------- AI 入口状态 ---------- */
    syncAiBtn: function () {
      var b = this.el.aiBtn;
      if (!b) return;
      var on = LLM.ready();
      b.classList.toggle("on", on);
      b.textContent = "🤖 AI：" + (on ? "开" : "关");
      b.title = on ? "AI 引导已启用，点这里修改设置" : "点这里填写自己的大模型密钥，开启 AI 引导（可选）";
    },

    /* ---------- 我的聆听 ---------- */
    refreshCount: function () {
      if (!this.el.recCount) return;
      var n = global.MZStore.count();
      this.el.recCount.textContent = n ? String(n) : "";
      this.el.recCount.classList.toggle("hidden", !n);
    },

    showRecords: function () {
      var body = this.el.recordsBody;
      var list = global.MZStore.all();
      body.innerHTML = "";
      if (!list.length) {
        var e = document.createElement("div");
        e.className = "empty";
        e.textContent = "还没有记录。挑一首曲子，听一次就有了。";
        body.appendChild(e);
      } else {
        list.forEach(function (r) {
          var d = document.createElement("div");
          d.className = "rec";
          var t = document.createElement("div");
          t.className = "rt";
          t.textContent = "《" + r.title + "》 · " + r.composer;
          var dd = document.createElement("div");
          dd.className = "rd";
          dd.textContent = r.date;
          d.appendChild(t);
          d.appendChild(dd);
          if (r.answers && r.answers.length) {
            r.answers.forEach(function (a) {
              var ra = document.createElement("div");
              ra.className = "ra";
              ra.textContent = a.part + "：" + a.text;
              d.appendChild(ra);
            });
          }
          body.appendChild(d);
        });
      }
      this.el.recordsSheet.classList.add("on");
    },

    hideRecords: function () {
      this.el.recordsSheet.classList.remove("on");
    }
  };

  global.MZApp = App;
})(typeof window !== "undefined" ? window : this);