/**
 * sound-manager.js — Web Audio API 程序化音效合成
 * - 刮擦声：模拟树叶/纸张翻动的沙沙声（柔和不刺耳）
 * - 揭示铃声：温暖钟声旋律
 */
const SoundManager = (() => {
  let audioCtx = null;
  let scratchNodes = null;
  let isScratching = false;

  function getContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function ensureContext() {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
  }

  /**
   * 树叶翻动般的沙沙声
   * - 使用低频棕噪声 + 多层调制
   * - 音量小、柔和、不刺耳
   */
  function startScratch() {
    const ctx = getContext();
    if (isScratching) return;
    isScratching = true;

    // 生成棕噪声（低频更丰富，听起来像树叶摩擦）
    const bufferSize = ctx.sampleRate * 1.0;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // 棕噪声：对白噪声积分（每样本累积，模拟 1/f² 频谱）
    let brown = 0;
    for (let i = 0; i < bufferSize; i++) {
      brown += (Math.random() * 2 - 1) * 0.04;
      // 防止漂移
      brown *= 0.999;
      // 裁剪
      data[i] = Math.max(-0.8, Math.min(0.8, brown));
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    // 低通滤波器 — 只保留中低频（树叶翻动感）
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1200;
    lowpass.Q.value = 0.3;

    // 增益 — 非常轻的背景音
    const gain = ctx.createGain();
    gain.gain.value = 0.025;

    // 轻微的不规则颤音调制（模拟树叶间歇翻动）
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 3; // 3Hz 的不规则感
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.005;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start(0);

    noiseSource.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);
    noiseSource.start(0);

    scratchNodes = { source: noiseSource, filter: lowpass, gain, lfo, lfoGain };
  }

  function stopScratch() {
    if (!isScratching) return;
    isScratching = false;

    if (scratchNodes && audioCtx) {
      const now = audioCtx.currentTime;
      scratchNodes.gain.gain.linearRampToValueAtTime(0, now + 0.15);
      setTimeout(() => {
        try {
          scratchNodes.source.stop();
          scratchNodes.lfo.stop();
        } catch(e) {}
        scratchNodes = null;
      }, 200);
    }
  }

  /**
   * 温暖圣诞铃声
   * - Cmaj7 和弦为基础的旋律
   * - 三角波 + 柔和泛音
   * - 带自然衰减和轻微延迟
   */
  function playBells() {
    const ctx = getContext();

    // 温暖和弦：C-E-G-B (Cmaj7) + D (add9)
    const melody = [
      // 第一句 — 上行
      { freq: 523.25, time: 0,      dur: 0.7 },  // C5
      { freq: 659.25, time: 0.22,   dur: 0.65 }, // E5
      { freq: 783.99, time: 0.44,   dur: 0.6 },  // G5
      { freq: 987.77, time: 0.66,   dur: 0.9 },  // B5 (maj7)
      // 第二句 — 轻柔下行
      { freq: 783.99, time: 1.15,   dur: 0.55 }, // G5
      { freq: 659.25, time: 1.35,   dur: 0.5 },  // E5
      { freq: 587.33, time: 1.55,   dur: 0.5 },  // D5 (add9)
      { freq: 523.25, time: 1.75,   dur: 1.2 },  // C5 (home)
    ];

    melody.forEach(note => {
      const startTime = ctx.currentTime + note.time;
      const duration = note.dur;

      // 基频 — 三角波（比正弦温暖）
      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.value = note.freq;

      // 泛音 — 高八度正弦（轻微）
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = note.freq * 2;
      osc2.detune.value = 3; // 微调音，制造厚度

      // 基频包络
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0, startTime);
      gain1.gain.linearRampToValueAtTime(0.12, startTime + 0.03);  // 快速起音
      gain1.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // 自然衰减

      // 泛音包络（更轻更快衰减）
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0, startTime);
      gain2.gain.linearRampToValueAtTime(0.04, startTime + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.6);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(startTime);
      osc1.stop(startTime + duration);
      osc2.start(startTime);
      osc2.stop(startTime + duration * 0.6);
    });

    // 余韵：在最后轻轻弹一个完整 Cmaj7 和弦
    setTimeout(() => {
      const chordNotes = [261.63, 329.63, 392.00, 493.88]; // C4-E4-G4-B4
      const chordStart = ctx.currentTime;

      chordNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = i * 2; // 略微失谐

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, chordStart);
        gain.gain.linearRampToValueAtTime(0.06, chordStart + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 2.0);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(chordStart);
        osc.stop(chordStart + 2.0);
      });
    }, 2100);
  }

  return { ensureContext, startScratch, stopScratch, playBells };
})();
