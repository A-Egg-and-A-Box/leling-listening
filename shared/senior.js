/* ============================================================
 * 乐龄版增强 · 适老化能力
 *  1. 语音朗读：浏览器自带语音合成，离线可用
 *  2. 陪听模式：把当前要问的问题放大显示，方便志愿者/子女照着念
 * 实现方式：监听对话区的新消息，不改动共享底座。
 * ============================================================ */
(function (global) {
  "use strict";

  /* ---------- 手机端朗读的两个坑，先在这里填平 ----------
     1) iOS 与部分安卓浏览器要求「本页第一次朗读必须由用户点击触发」，
        否则整页一声都不出 —— 所以借用户的第一次点击把语音解锁。
     2) 中文语音包是浏览器异步加载的，要等 voiceschanged 才拿得到；
        不挑语音的话，常会拿英文嗓去念中文，听起来像没声音。 */
  var synth = (typeof window !== "undefined" && "speechSynthesis" in window)
    ? window.speechSynthesis : null;
  var zhVoice = null;

  function pickVoice() {
    if (!synth || !synth.getVoices) return;
    var vs = synth.getVoices();
    if (!vs || !vs.length) return;
    var i;
    for (i = 0; i < vs.length; i++) {
      var l = String(vs[i].lang || "").toLowerCase();
      if (l.indexOf("zh") === 0 || l.indexOf("cmn") === 0) { zhVoice = vs[i]; return; }
    }
    for (i = 0; i < vs.length; i++) {
      if (/chinese|mandarin|中文|普通话/i.test(vs[i].name || "")) { zhVoice = vs[i]; return; }
    }
  }

  var Senior = {
    voice: false,
    companion: false,
    chatEl: null,
    bannerEl: null,
    unlocked: false,
    _broken: false,

    init: function (opts) {
      var self = this;
      this.chatEl = opts.chatEl;
      this.bannerEl = opts.bannerEl;
      if (!this.chatEl) return;

      if (synth) {
        pickVoice();
        if (synth.addEventListener) synth.addEventListener("voiceschanged", pickVoice);
        else synth.onvoiceschanged = pickVoice;
        this.bindUnlock();
      } else {
        this.broken();
      }

      var mo = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.nodeType === 1 && n.classList &&
                n.classList.contains("msg") && n.classList.contains("bot")) {
              self.onBotMessage(n);
            }
          });
        });
      });
      mo.observe(this.chatEl, { childList: true });
    },

    onBotMessage: function (node) {
      var bubble = node.querySelector(".bubble");
      if (!bubble) return;
      var self = this;

      /* 每条消息都配一个「读给我听」，随时可以再听一遍 */
      if (!bubble.querySelector(".speak-btn")) {
        var sb = document.createElement("button");
        sb.type = "button";
        sb.className = "speak-btn";
        sb.textContent = "🔊 读给我听";
        sb.setAttribute("aria-label", "朗读这段话");
        sb.onclick = function () { self.speak(self.readable(bubble)); };
        bubble.appendChild(sb);
      }

      if (this.voice) this.speak(this.readable(bubble));
      if (this.companion) this.updateBanner(bubble);
    },

    readable: function (bubble) {
      var t = bubble.innerText || bubble.textContent || "";
      return t.replace(/[▶■➤🎵←🔊✓]/g, " ").replace(/读给我听/g, " ").replace(/\s+/g, " ").trim();
    },

    /* 借用户第一次点击把语音解锁：iOS 上不这么做，整页都不出声 */
    bindUnlock: function () {
      if (!synth || this.unlocked) return;
      var self = this;
      var events = ["pointerdown", "touchstart", "click", "keydown"];
      function unlock() {
        if (self.unlocked) return;
        self.unlocked = true;
        var i;
        for (i = 0; i < events.length; i++) {
          document.removeEventListener(events[i], unlock, true);
        }
        try {
          var u = new SpeechSynthesisUtterance("　");
          u.volume = 0;
          u.lang = "zh-CN";
          synth.speak(u);
        } catch (e) { /* 忽略：解锁失败不影响后续手动点按 */ }
        pickVoice();
      }
      var i;
      for (i = 0; i < events.length; i++) {
        document.addEventListener(events[i], unlock, true);
      }
    },

    speak: function (text) {
      text = (text || "").trim();
      if (!text) return;
      if (!synth) { this.broken(); return; }
      pickVoice();
      try {
        synth.cancel();
        var u = new SpeechSynthesisUtterance(text);
        if (zhVoice) u.voice = zhVoice;
        u.lang = (zhVoice && zhVoice.lang) || "zh-CN";
        u.rate = 0.88;
        u.pitch = 1;
        synth.speak(u);
      } catch (e) { this.broken(); }
    },

    stopSpeak: function () {
      try { if (synth) synth.cancel(); } catch (e) { }
    },

    /* 设备确实没有语音能力时，别再假装能读——直接告诉用户还能怎么办 */
    broken: function () {
      if (this._broken) return;
      this._broken = true;
      this.voice = false;
      var b = document.getElementById("voiceBtn");
      if (b) {
        b.textContent = "🔇 本机无朗读";
        b.disabled = true;
        b.className = "icon-btn toggle-btn";
        b.title = "这台设备的浏览器没有语音朗读，可以让家人照着念，或打开手机的读屏功能";
      }
      var hint = document.querySelector(".senior-hint");
      if (hint && !hint.querySelector(".nv")) {
        var s = document.createElement("div");
        s.className = "nv";
        s.style.marginTop = "10px";
        s.style.fontWeight = "700";
        s.style.color = "var(--accent)";
        s.textContent = "这台设备暂时没法朗读。可以让旁边的家人照着念；也可以用手机自带的读屏（设置 → 辅助功能 → 屏幕朗读）。";
        hint.appendChild(s);
      }
    },

    updateBanner: function (bubble) {
      var q = bubble.querySelector(".ask-line");
      var stage = bubble.querySelector(".stage-line");
      var h = bubble.querySelector(".hint");
      var title, question, hint;
      if (q) {
        title = "陪听提示 · 请把这句话念给他/她听";
        question = q.textContent;
        hint = h ? h.textContent : "";
      } else if (stage) {
        title = "陪听提示 · 下一步";
        question = stage.textContent;
        hint = "";
      } else {
        return;
      }
      this.bannerEl.innerHTML = "";
      var t = document.createElement("div"); t.className = "ct"; t.textContent = title;
      var c = document.createElement("div"); c.className = "cq"; c.textContent = question;
      this.bannerEl.appendChild(t);
      this.bannerEl.appendChild(c);
      if (hint) {
        var hh = document.createElement("div"); hh.className = "ch"; hh.textContent = hint;
        this.bannerEl.appendChild(hh);
      }
      this.bannerEl.classList.add("on");
    },

    setVoice: function (on) {
      if (on && this._broken) return;
      this.voice = on;
      if (!on) this.stopSpeak();
    },

    setCompanion: function (on) {
      this.companion = on;
      if (!on) this.bannerEl.classList.remove("on");
    }
  };

  global.MZSenior = Senior;
})(typeof window !== "undefined" ? window : this);