/* ============================================================
 * 旋律播放 · 共享底座
 * 用浏览器自带的 Web Audio 合成旋律片段 —— 完全离线，不依赖
 * 网络，也不涉及任何录音版权。用于支撑「分段聆听」。
 * ============================================================ */
(function (global) {
  "use strict";

  var SEMI = {
    C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
    "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11
  };

  function freqOf(name) {
    var m = /^([A-G][#b]?)(-?\d)$/.exec(name);
    if (!m) return 0;
    var s = SEMI[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return 440 * Math.pow(2, (s - 69) / 12);
  }

  var ctx = null;
  var nodes = [];
  var timers = [];
  var playing = false;

  function ensure() {
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /* 单个音：基音 + 高八度泛音，经低通滤波，模拟柔和音盒音色 */
  function tone(freq, at, dur, gain) {
    var osc = ctx.createOscillator();
    var osc2 = ctx.createOscillator();
    var lp = ctx.createBiquadFilter();
    var g = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;
    osc2.type = "triangle";
    osc2.frequency.value = freq * 2;

    var g2 = ctx.createGain();
    g2.gain.value = 0.22;
    osc2.connect(g2);

    lp.type = "lowpass";
    lp.frequency.value = Math.min(freq * 6, 4200);
    lp.Q.value = 0.6;

    osc.connect(lp);
    g2.connect(lp);
    lp.connect(g);

    var peak = gain == null ? 0.26 : gain;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.015);
    g.gain.exponentialRampToValueAtTime(peak * 0.45, at + Math.max(0.08, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    g.connect(ctx.destination);
    osc.start(at);
    osc2.start(at);
    osc.stop(at + dur + 0.02);
    osc2.stop(at + dur + 0.02);
    nodes.push(osc, osc2);
  }

  function stop() {
    timers.forEach(function (t) { clearTimeout(t); });
    timers = [];
    nodes.forEach(function (n) { try { n.stop(); } catch (e) { } });
    nodes = [];
    playing = false;
  }

  /**
   * 播放一段旋律
   * @param {Array} notes  [[音名, 拍数], ...]
   * @param {Object} opts  { tempo: 秒/拍, onProgress: fn(i), onEnd: fn() }
   */
  function play(notes, opts) {
    opts = opts || {};
    var c = ensure();
    if (!c || !notes || !notes.length) {
      if (opts.onEnd) opts.onEnd();
      return;
    }
    stop();
    playing = true;

    var spb = opts.tempo || 0.52;
    var t0 = c.currentTime + 0.08;
    var elapsed = 0;
    var total = 0;

    notes.forEach(function (n) {
      var dur = Math.max(0.12, n[1] * spb);
      var f = freqOf(n[0]);
      if (f > 0) tone(f, t0 + elapsed, dur * 0.94, 0.26);
      var at = elapsed;
      var idx = notes.indexOf(n);
      timers.push(setTimeout(function () {
        if (opts.onProgress) opts.onProgress(idx);
      }, (at + 0.08) * 1000));
      elapsed += dur;
      total = elapsed;
    });

    timers.push(setTimeout(function () {
      playing = false;
      if (opts.onEnd) opts.onEnd();
    }, (total + 0.35) * 1000));
  }

  global.MZAudio = {
    ensure: ensure,
    play: play,
    stop: stop,
    isPlaying: function () { return playing; },
    freqOf: freqOf
  };
})(typeof window !== "undefined" ? window : this);