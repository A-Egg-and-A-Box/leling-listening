/* ============================================================
 * 应用控制器 · 共享底座
 * 负责：首页曲库渲染、搜索筛选、路由切换、我的聆听、字号调节。
 * 两个版本共用，靠 init({ senior: true }) 打开乐龄版专属能力。
 * ============================================================ */
(function (global) {
  "use strict";

  var Catalog = global.MZCatalog;
  var Audio = global.MZAudio;

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
        recBtn: $("recBtn"), recCount: $("recCount"), fsBar: $("fsBar")
      };

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
        e.textContent = "没有找到曲目，换个词试试。";
        grid.appendChild(e);
        return;
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
    },

    /* ---------- 路由 ---------- */
    goHome: function () {
      if (this.session) { Audio.stop(); this.session = null; }
      this.el.chatView.classList.add("hidden");
      this.el.home.classList.remove("hidden");
      this.el.recBtn.classList.remove("hidden");
      this.refreshCount();
      this.renderGrid();
    },

    openSong: function (id) {
      var song = Catalog.byId(id);
      if (!song) return;
      this.el.home.classList.add("hidden");
      this.el.chatView.classList.remove("hidden");
      this.el.chat.innerHTML = "";
      this.el.subTitle.textContent = song.emoji + " " + song.title;
      this.el.stageBar.innerHTML = "";

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
      if (this.session) this.openSong(this.session.song.id);
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