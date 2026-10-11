/* ============================================================
 * 乐龄版增强 · 适老化能力
 *  1. 语音朗读：浏览器自带语音合成，离线可用
 *  2. 陪听模式：把当前要问的问题放大显示，方便志愿者/子女照着念
 * 实现方式：监听对话区的新消息，不改动共享底座。
 * ============================================================ */
(function (global) {
  "use strict";

  var Senior = {
    voice: false,
    companion: false,
    chatEl: null,
    bannerEl: null,

    init: function (opts) {
      var self = this;
      this.chatEl = opts.chatEl;
      this.bannerEl = opts.bannerEl;
      if (!this.chatEl) return;

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

    speak: function (text) {
      if (!text || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN";
        u.rate = 0.88;
        u.pitch = 1;
        window.speechSynthesis.speak(u);
      } catch (e) { /* 部分浏览器不支持，静默降级 */ }
    },

    stopSpeak: function () {
      try { window.speechSynthesis.cancel(); } catch (e) { }
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