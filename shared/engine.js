/* ============================================================
 * 引导引擎 · 共享底座
 * 一次「聆听」＝ 导语 → 逐句聆听 → 提问 → 回应 → 揭晓 → 延伸
 * 聆听发生在页面顶部的 B 站播放器里；提问与回应默认走内置脚本，
 * 填了 API Key 的话交给大模型润色 —— 但绝不替你把答案说出来。
 *
 * 设计立场：先让人听，再让人说，最后才给结论。
 * ============================================================ */
(function (global) {
  "use strict";

  var Catalog = global.MZCatalog;
  var Player = global.MZPlayer;
  var LLM = global.MZLLM;

  var ACK = [
    "嗯，你听到的这个点很重要。",
    "有意思——你注意到了很多人会忽略的地方。",
    "谢谢你说出来，这已经是很细的观察了。",
    "对，就是这个感觉。",
    "你的耳朵挺敏锐的。"
  ];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function Session(opts) {
    this.song = opts.song;
    this.chat = opts.chatEl;
    this.composer = opts.composerEl;
    this.onStage = opts.onStage || function () { };
    this.onFinish = opts.onFinish || function () { };
    this.answers = [];
    this.partIndex = 0;
    this.awaiting = false;
    this.askEl = null;
    this.done = false;
    this._ackSeq = 0;
  }

  /* ---------- 渲染 ---------- */
  Session.prototype.scroll = function () {
    this.chat.scrollTop = this.chat.scrollHeight;
  };

  Session.prototype.bubble = function (role, node) {
    var msg = el("div", "msg " + role);
    var av = el("div", "msg-avatar", role === "bot" ? "🎵" : "🙂");
    var b = el("div", "bubble");
    if (typeof node === "string") b.appendChild(document.createTextNode(node));
    else b.appendChild(node);
    msg.appendChild(av);
    msg.appendChild(b);
    this.chat.appendChild(msg);
    this.scroll();
    return b;
  };

  Session.prototype.bot = function (node) { return this.bubble("bot", node); };
  Session.prototype.user = function (text) { return this.bubble("user", text); };

  Session.prototype.clearComposer = function () {
    this.composer.innerHTML = "";
  };

  /* 底部快捷按钮 */
  Session.prototype.setQuick = function (items) {
    this.clearComposer();
    var bar = el("div", "quick-area");
    var self = this;
    items.forEach(function (it) {
      var b = el("button", "quick-btn" + (it.ghost ? " ghost" : ""), it.label);
      b.onclick = function () { it.run(self); };
      bar.appendChild(b);
    });
    this.composer.appendChild(bar);
  };

  /* 底部输入框（自由回答） */
  Session.prototype.setInput = function (placeholder, onSubmit) {
    this.clearComposer();
    var bar = el("div", "input-bar");
    var input = el("input");
    input.type = "text";
    input.placeholder = placeholder || "说说你听到的……";
    var send = el("button", "send-btn", "➤");
    var self = this;
    function submit() {
      var v = input.value.trim();
      if (!v) { input.focus(); return; }
      input.value = "";
      onSubmit(self, v);
    }
    send.onclick = submit;
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submit();
    });
    bar.appendChild(input);
    bar.appendChild(send);
    this.composer.appendChild(bar);
    setTimeout(function () { input.focus(); }, 60);
    return input;
  };

  /* 聆听卡片：把注意力引到顶部那台真播放器上 */
  Session.prototype.listenCard = function (part) {
    var s = this.song;
    var card = el("div", "listen-card");
    var head = el("div", "listen-head");
    head.appendChild(el("span", "listen-label", part.label));
    card.appendChild(head);
    card.appendChild(el("p", "listen-tip", s.bvid
      ? "在上面的播放器里听这一段，听两遍，再回答问题。"
      : "先在上面去 B 站找到这首歌，听这一段，再回答问题。"));

    if (s.bvid && part.t != null) {
      var seekBtn = el("button", "listen-btn", "▶ 从这一句开始听");
      seekBtn.onclick = function () { Player.seek(part.t); };
      card.appendChild(seekBtn);
    }
    return card;
  };

  /* ---------- 流程 ---------- */
  Session.prototype.start = function () {
    var s = this.song;
    this.bot(s.intro);
    this.onStage("导语", 0, s.parts.length);
    this.bot(el("div", "tip-line", s.bvid
      ? "播放器已经装在上面 —— 点一下就能听，不用跳走。"
      : "这首曲子没有预置录音，点上面的按钮去 B 站找一段来听。"));
    this.nextPart();
  };

  Session.prototype.nextPart = function () {
    var s = this.song;
    if (this.partIndex >= s.parts.length) { this.reveal(); return; }
    var part = s.parts[this.partIndex];
    this.onStage(part.label, this.partIndex + 1, s.parts.length);

    this.bot(el("div", "stage-line", "现在听「" + part.label + "」"));
    this.bot(this.listenCard(part));

    var self = this;
    this.setQuick([{
      label: "我听完这一句了", run: function () { self.afterListen(part); }
    }]);
  };

  Session.prototype.afterListen = function (part) {
    var self = this;
    var qEl = el("div", "ask-line", part.guide);
    var b = this.bot(qEl);
    b.appendChild(el("div", "hint", part.hint));
    this.askEl = qEl;
    this.awaiting = true;

    this.setInput("把你的感觉说出来（说错也没关系）", function (sess, text) {
      self.answer(text, part);
    });
    this.setQuick([
      { label: "▶ 再听一遍", ghost: true, run: function () { self.replay(part); } },
      { label: "我想想再说", ghost: true, run: function () { self.setInput("慢慢想，说出来就行", function (sess, text) { self.answer(text, part); }); } },
      { label: "跳过这一句", ghost: true, run: function () { self.skip(part); } }
    ]);

    if (LLM && LLM.ready()) {
      LLM.talk({ song: this.song, stage: part.label, said: "", builtin: part.guide, want: "question" })
        .then(function (txt) {
          if (txt && self.awaiting && self.askEl === qEl && qEl.isConnected) qEl.textContent = txt;
        });
    }
  };

  Session.prototype.replay = function (part) {
    if (!this.song.bvid) return;
    Player.seek(part && part.t != null ? part.t : 0);
  };

  Session.prototype.answer = function (text, part) {
    if (!this.awaiting) return;
    this.awaiting = false;
    this.askEl = null;
    this.user(text);
    this.answers.push({ part: part.label, text: text });

    var self = this;
    var builtin = ACK[this._ackSeq % ACK.length];
    this._ackSeq++;
    var b = this.bot(el("div", "ack-line", builtin + "我们接着往下听。"));

    var ai = LLM && LLM.ready();
    if (ai) {
      LLM.talk({ song: this.song, stage: part.label, said: text, builtin: part.guide, want: "ack" })
        .then(function (txt) { if (txt && b.isConnected) b.textContent = txt; });
    }

    this.partIndex++;
    this.clearComposer();
    setTimeout(function () { self.nextPart(); }, ai ? 1200 : 800);
  };

  Session.prototype.skip = function (part) {
    if (!this.awaiting) return;
    this.awaiting = false;
    this.askEl = null;
    this.bot("没关系，先往下听。");
    this.partIndex++;
    this.clearComposer();
    var self = this;
    setTimeout(function () { self.nextPart(); }, 650);
  };

  Session.prototype.reveal = function () {
    var s = this.song;
    this.onStage("揭晓", s.parts.length, s.parts.length);
    var self = this;
    var box = el("div", "reveal");
    box.appendChild(el("h4", null, "现在揭晓"));
    box.appendChild(el("p", null, s.reveal));
    setTimeout(function () { self.bot(box); self.extend(s); }, 400);
  };

  Session.prototype.extend = function (s) {
    var box = el("div", "extend");
    box.appendChild(el("h4", null, "再听深一点"));
    box.appendChild(el("p", null, s.extend));
    this.bot(box);

    var sum = el("div", "summary");
    sum.appendChild(el("h4", null, "这一趟你听到了什么"));
    sum.appendChild(el("p", null, "《" + s.title + "》· " + s.composer + "（" + s.era + "）"));
    if (this.answers.length) {
      var ul = el("ul", "summary-list");
      this.answers.forEach(function (a) {
        var li = el("li");
        li.appendChild(el("b", null, a.part + "："));
        li.appendChild(document.createTextNode(a.text));
        ul.appendChild(li);
      });
      sum.appendChild(ul);
    } else {
      sum.appendChild(el("p", "summary-empty", "这一次你只是安静地听了听，也很好。"));
    }
    this.bot(sum);

    this.done = true;
    var record = {
      id: s.id,
      title: s.title,
      composer: s.composer,
      era: s.era,
      date: new Date().toISOString().slice(0, 10),
      answers: this.answers.slice()
    };
    this.onFinish(record);
    global.MZStore.save(record);

    this.setQuick([
      { label: "保存好了，再听一首", run: function () { global.MZApp.goHome(); } },
      { label: "把这一首重听一遍", ghost: true, run: function () { global.MZApp.restart(); } }
    ]);
  };

  /* ---------- 我的聆听（本地保存） ---------- */
  var KEY = "mz_listen_records_v1";
  global.MZStore = {
    all: function () {
      try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
      catch (e) { return []; }
    },
    save: function (rec) {
      var list = this.all();
      list.unshift(rec);
      if (list.length > 60) list = list.slice(0, 60);
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { }
    },
    count: function () { return this.all().length; },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) { } }
  };

  global.MZEngine = {
    Session: Session,
    ACK: ACK
  };
})(typeof window !== "undefined" ? window : this);