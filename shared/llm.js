/* ============================================================
 * 可选 AI 引导 · 共享底座
 * 与老师原版一致：接口地址、模型、密钥都由使用者自己填，
 * 只存在本机浏览器（localStorage），不经过任何中间服务器。
 * 不填也能用 —— 内置引导脚本本身就能走完一整趟聆听；
 * 填了以后，大模型会把「提问」和「回应」说得更贴合你的回答，
 * 但绝不替你把答案说出来。
 * ============================================================ */
(function (global) {
  "use strict";

  var KEY = "mz_llm_v1";

  /* 国内主流大模型预设，均为 chat/completions 兼容格式 */
  var PRESETS = {
    doubao:   { name: "豆包 · 火山方舟", ep: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",          model: "doubao-seed-2-0-lite-260428" },
    deepseek: { name: "DeepSeek · 深度求索", ep: "https://api.deepseek.com/chat/completions",                       model: "deepseek-flash" },
    qwen:     { name: "通义千问 · 阿里", ep: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen3.8-flash" },
    glm:      { name: "智谱 GLM", ep: "https://open.bigmodel.cn/api/paas/v4/chat/completions",                       model: "glm-5.3-flash" },
    kimi:     { name: "Kimi · 月之暗面", ep: "https://api.moonshot.ai/v1/chat/completions",                          model: "kimi-k2.6" },
    custom:   { name: "自定义（OpenAI 兼容）", ep: "", model: "" }
  };

  var state = { enabled: false, ep: "", token: "", model: "", prov: "deepseek", pro: false, lastError: "" };

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "{}");
      state.enabled = !!s.enabled;
      state.ep = s.ep || "";
      state.token = s.token || "";
      state.model = s.model || "";
      state.prov = s.prov || "deepseek";
      state.pro = !!s.pro;
    } catch (e) { }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        enabled: state.enabled, ep: state.ep, token: state.token,
        model: state.model, prov: state.prov, pro: state.pro
      }));
    } catch (e) { }
  }

  function ready() { return state.enabled && !!state.ep && !!state.token; }

  function headers(json) {
    var h = {};
    if (json) h["Content-Type"] = "application/json";
    if (state.token) h["Authorization"] = "Bearer " + String(state.token).replace(/^Bearer\s+/i, "").trim();
    return h;
  }

  function readErr(r) {
    return r.clone().text().then(function (t) {
      var j = null;
      try { j = JSON.parse(t); } catch (e) { }
      var d = j ? (j.error && (j.error.message || j.error.code || j.error.type)) || j.message || j.msg || j.detail || "" : t;
      return String(d || "").replace(/\s+/g, " ").slice(0, 220);
    }).catch(function () { return ""; });
  }

  /* 用同一把 Key 拉取可用模型，用于模型名失效时自动纠正 */
  function listModels() {
    var ep = String(state.ep || "");
    var i = ep.lastIndexOf("/chat/completions");
    if (i < 0) return Promise.resolve([]);
    var head = ep.slice(0, i);
    var urls = [head + "/models"];
    if (!/\/v\d+$/.test(head)) urls.push(head + "/v1/models");
    return urls.reduce(function (p, u) {
      return p.then(function (found) {
        if (found.length) return found;
        return fetch(u, { headers: headers(false) }).then(function (r) {
          return r.ok ? r.json() : null;
        }).then(function (j) {
          var arr = j && Array.isArray(j.data) ? j.data : (Array.isArray(j) ? j : []);
          return arr.map(function (x) { return x && (x.id || x.model || x.name); }).filter(Boolean).map(String);
        }).catch(function () { return []; });
      });
    }, Promise.resolve([]));
  }

  function pickModel(ids) {
    var bad = /(embed|rerank|image|video|tts|voice|speech|ocr|moderation|drawing|whisper)/i;
    function score(s) {
      var l = String(s).toLowerCase(), v = 0;
      if (bad.test(l)) v -= 100;
      if (l.indexOf("flash") >= 0) v += 8;
      if (l.indexOf("chat") >= 0) v += 7;
      if (l.indexOf("lite") >= 0) v += 6;
      if (l.indexOf("air") >= 0 || l.indexOf("mini") >= 0 || l.indexOf("turbo") >= 0) v += 5;
      if (l.indexOf("plus") >= 0) v += 4;
      if (l.indexOf("pro") >= 0) v += 3;
      if (l.indexOf("search") >= 0 || l.indexOf("reason") >= 0 || l.indexOf("thinking") >= 0 || /r1/.test(l)) v -= 12;
      return v;
    }
    var best = null, bv = -Infinity;
    ids.forEach(function (id) { var v = score(id); if (v > bv) { bv = v; best = id; } });
    return best;
  }

  function requestChat(messages) {
    function send(model) {
      var body = { messages: messages };
      if (model) body.model = model;
      return fetch(state.ep, { method: "POST", headers: headers(true), body: JSON.stringify(body) });
    }
    return send(state.model).then(function (r) {
      return readErr(r).then(function (detail) {
        if (!r.ok && (r.status === 400 || r.status === 404) && state.token && /model/i.test(detail)) {
          return listModels().then(function (ids) {
            var alt = ids.length ? pickModel(ids) : "";
            if (!alt) return { r: r, detail: detail, available: ids };
            var oldModel = state.model;
            state.model = alt; save();
            return send(alt).then(function (r2) {
              return readErr(r2).then(function (d2) {
                return { r: r2, detail: d2, autoFixed: alt, oldModel: oldModel };
              });
            });
          });
        }
        return { r: r, detail: detail };
      });
    });
  }

  function errMsg(status, detail) {
    var map = {
      400: "请求参数有误（多半是模型名不对）", 401: "API Key 无效或已过期", 402: "账户余额不足",
      403: "无权限：检查余额或该模型是否已开通", 404: "接口地址或模型名不存在",
      408: "请求超时", 429: "请求太频繁，稍后再试", 500: "服务商服务端故障",
      502: "服务商网关错误", 503: "服务暂时不可用"
    };
    return "失败（HTTP " + status + "）" + (map[status] ? " · " + map[status] : "") + (detail ? "\n" + detail : "");
  }

  function pickText(j) {
    return (j && j.reply) ||
      (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
  }

  /* 让大模型说一句引导的话；失败返回 null，调用方回落到内置脚本 */
  function talk(opts) {
    if (!ready()) return Promise.resolve(null);
    var s = opts.song || {};
    var depth = state.pro ? "（使用者开启了专业模式：可以在恰当处使用更专业的术语，但仍以引导为主。）" : "";
    var sys = "你是「音乐作品助手」——用苏格拉底式引导，教没有音乐基础的人欣赏音乐。" +
      "铁则：①绝不直接说出答案（比如「这是圆舞曲」），而是用大白话引导他自己听出来；" +
      "②先接住他的感受，再轻轻点一句；③每次只说一件事，简短（不超过 60 字）；④中文，鼓励为主；" +
      "⑤对方说「说不好 / 不知道」时给他一个方法支架，不往下推进。" +
      "当前曲子：'" + (s.title || "") + "'，作曲家：" + (s.composer || "") + "。" + depth;
    var user;
    if (opts.want === "ack") {
      user = "他刚回答：「" + (opts.said || "") + "」。请先肯定他话里的具体那个点，再用一句话引出下一步，别给答案。";
    } else {
      user = "现在要引导他听「" + (opts.stage || "") + "」。参考问题：「" + (opts.builtin || "") +
        "」。把它说得更亲近、更像聊天，只问一个问题。";
    }
    return requestChat([{ role: "system", content: sys }, { role: "user", content: user }])
      .then(function (res) {
        if (!res.r.ok) {
          state.lastError = "HTTP " + res.r.status + " " + String(res.detail || "").slice(0, 120);
          return null;
        }
        return res.r.json().then(function (j) {
          return pickText(j) || null;
        });
      })
      .catch(function (e) {
        state.lastError = "网络/跨域失败：" + (e && e.message ? e.message : "请求被拦截");
        return null;
      });
  }

  function test() {
    if (!state.ep) return Promise.resolve({ ok: false, msg: "请先填写接口地址" });
    if (!state.token) return Promise.resolve({ ok: false, msg: "请先填写 API Key" });
    state.lastError = "";
    return requestChat([{ role: "user", content: "回复两个字：正常" }]).then(function (res) {
      if (!res.r.ok) {
        var m = errMsg(res.r.status, res.detail);
        if (res.available && res.available.length) m += "\n该账号可用模型：" + res.available.slice(0, 10).join("、");
        return { ok: false, msg: m };
      }
      return res.r.json().then(function (j) {
        var head = res.autoFixed
          ? "连接成功（模型名已自动纠正：" + (res.oldModel || "空") + " → " + res.autoFixed + "）"
          : "连接成功";
        return { ok: true, msg: head + " · 模型回复：" + String(pickText(j)).slice(0, 60) };
      });
    }).catch(function (e) {
      return {
        ok: false,
        msg: "请求失败：" + (e && e.message ? e.message : "") +
          "\n（若提示 Failed to fetch / CORS，说明该服务商不允许浏览器直连，需要走附带的本机代理 llm-proxy.js）"
      };
    });
  }

  /* ---------- 设置面板 ---------- */
  var mask = null;

  function field(label, node) {
    var f = document.createElement("label");
    f.className = "field";
    var lb = document.createElement("span");
    lb.className = "lb";
    lb.textContent = label;
    f.appendChild(lb);
    f.appendChild(node);
    return f;
  }

  function open() {
    if (!mask) build();
    syncForm();
    mask.classList.add("on");
  }
  function close() { if (mask) mask.classList.remove("on"); }

  var form = {};

  function build() {
    mask = document.createElement("div");
    mask.className = "sheet-mask llm-mask";

    var sheet = document.createElement("div");
    sheet.className = "sheet";

    var h = document.createElement("h3");
    h.textContent = "AI 引导设置（可选）";
    sheet.appendChild(h);

    var intro = document.createElement("p");
    intro.className = "sheet-note";
    intro.textContent = "不填也能用：内置引导脚本能走完一整趟聆听。填上以后，AI 会把提问说得更贴合你的回答。密钥只保存在这台电脑的浏览器里，不会上传到任何第三方服务器。";
    sheet.appendChild(intro);

    var enable = document.createElement("input");
    enable.type = "checkbox";
    var enableRow = document.createElement("label");
    enableRow.className = "check-row";
    enableRow.appendChild(enable);
    var enTxt = document.createElement("span");
    enTxt.textContent = "启用 AI 引导";
    enableRow.appendChild(enTxt);
    sheet.appendChild(enableRow);

    var prov = document.createElement("select");
    Object.keys(PRESETS).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k;
      o.textContent = PRESETS[k].name;
      prov.appendChild(o);
    });
    sheet.appendChild(field("服务商", prov));

    var ep = document.createElement("input");
    ep.type = "text";
    ep.placeholder = "https://api.deepseek.com/chat/completions";
    sheet.appendChild(field("接口地址", ep));

    var model = document.createElement("input");
    model.type = "text";
    model.placeholder = "如 deepseek-chat / qwen-plus";
    sheet.appendChild(field("模型名", model));

    var token = document.createElement("input");
    token.type = "password";
    token.placeholder = "留空表示沿用已保存的密钥";
    sheet.appendChild(field("API Key", token));

    var pro = document.createElement("input");
    pro.type = "checkbox";
    var proRow = document.createElement("label");
    proRow.className = "check-row";
    proRow.appendChild(pro);
    var proTxt = document.createElement("span");
    proTxt.textContent = "专业模式（可用更专业的术语）";
    proRow.appendChild(proTxt);
    sheet.appendChild(proRow);

    var msg = document.createElement("div");
    msg.className = "sheet-msg";
    sheet.appendChild(msg);

    var btns = document.createElement("div");
    btns.className = "sheet-btns";
    var testBtn = document.createElement("button");
    testBtn.className = "icon-btn"; testBtn.type = "button"; testBtn.textContent = "测试连接";
    var saveBtn = document.createElement("button");
    saveBtn.className = "icon-btn strong"; saveBtn.type = "button"; saveBtn.textContent = "保存";
    var closeBtn = document.createElement("button");
    closeBtn.className = "icon-btn"; closeBtn.type = "button"; closeBtn.textContent = "关闭";
    btns.appendChild(testBtn); btns.appendChild(saveBtn); btns.appendChild(closeBtn);
    sheet.appendChild(btns);

    form = { enable: enable, prov: prov, ep: ep, model: model, token: token, pro: pro, msg: msg };

    prov.onchange = function () {
      var p = PRESETS[prov.value];
      if (p && prov.value !== "custom") {
        ep.value = p.ep;
        model.value = p.model;
      }
      collect();
    };
    testBtn.onclick = function () {
      collect();
      msg.className = "sheet-msg";
      msg.textContent = "正在测试……";
      test().then(function (r) {
        msg.className = "sheet-msg " + (r.ok ? "ok" : "bad");
        msg.textContent = r.msg;
      });
    };
    saveBtn.onclick = function () {
      collect();
      var okNow = !!state.ep && !!state.token;
      msg.className = "sheet-msg " + (okNow ? "ok" : "");
      msg.textContent = okNow ? "已保存，回到对话就能用上。" : "已保存，但还没填齐接口地址和密钥，暂时不会调用 AI。";
      if (global.MZApp && global.MZApp.syncAiBtn) global.MZApp.syncAiBtn();
    };
    closeBtn.onclick = close;
    mask.addEventListener("click", function (e) { if (e.target === mask) close(); });

    mask.appendChild(sheet);
    document.body.appendChild(mask);
  }

  function collect() {
    state.prov = form.prov.value;
    state.ep = form.ep.value.trim();
    state.model = form.model.value.trim();
    state.pro = form.pro.checked;
    state.enabled = form.enable.checked;
    var t = form.token.value.trim();
    if (t) state.token = t;   /* 留空 = 沿用原密钥 */
    save();
  }

  function syncForm() {
    if (!form.enable) return;
    form.enable.checked = state.enabled;
    form.prov.value = state.prov;
    var p = PRESETS[state.prov];
    form.ep.value = state.ep || (p ? p.ep : "");
    form.model.value = state.model || (p ? p.model : "");
    form.pro.checked = state.pro;
    form.token.value = "";   /* 不回填密钥 */
    form.msg.className = "sheet-msg";
    form.msg.textContent = state.token ? "已保存一把密钥。想更换时再填一次。" : "";
  }

  load();

  global.MZLLM = {
    ready: ready,
    talk: talk,
    test: test,
    open: open,
    close: close,
    state: state,
    presets: PRESETS
  };
})(typeof window !== "undefined" ? window : this);