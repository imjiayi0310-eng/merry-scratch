/**
 * sound-manager.js — Web Audio API 程序化音效合成
 * - 刮擦沙沙声：白噪声 → 带通滤波器 → 增益包络
 * - 圣诞铃声：正弦波振荡器叠加，模拟钟声旋律
 */
const SoundManager = (() => {
  let audioCtx = null;
  let scratchNoise = null;     // 当前刮擦噪声节点组
  let scratchGain = null;
  let isScratching = false;
  let fadeTimeout = null;

  function getContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * 开始播放刮擦沙沙声
   * 白噪声源 → 带通滤波器 → 增益控制
   */
  function startScratch() {
    const ctx = getContext();
    if (isScratching) return; // already playing

    isScratching = true;

    // 创建白噪声
    const bufferSize = ctx.sampleRate * 0.5; // 0.5s buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    // 带通滤波器 — 模拟沙沙高频
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 3000;
    bandpass.Q.value = 0.5;

    // 增益 — 小音量背景音
    scratchGain = ctx.createGain();
    scratchGain.gain.value = 0.03;

    noiseSource.connect(bandpass);
    bandpass.connect(scratchGain);
    scratchGain.connect(ctx.destination);
    noiseSource.start(0);

    scratchNoise = { source: noiseSource, filter: bandpass };
  }

  /**
   * 停止刮擦音效（带短暂淡出避免咔嗒声）
   */
  function stopScratch() {
    if (!isScratching) return;
    isScratching = false;

    if (scratchGain && audioCtx) {
      const gain = scratchGain;
      const now = audioCtx.currentTime;
      gain.gain.linearRampToValueAtTime(0, now + 0.08);

      // 清理节点
      clearTimeout(fadeTimeout);
      fadeTimeout = setTimeout(() => {
        if (scratchNoise) {
          try { scratchNoise.source.stop(); } catch(e) { /* already stopped */ }
          scratchNoise = null;
        }
      }, 120);
    }
  }

  /**
   * 播放圣诞铃声旋律
   * 简单上行旋律 C5-E5-G5-C6，模拟钟声
   */
  function playBells() {
    const ctx = getContext();

    // 钟声频率: C5=523.25, E5=659.25, G5=783.99, C6=1046.5
    const notes = [
      { freq: 523.25, time: 0 },
      { freq: 659.25, time: 0.18 },
      { freq: 783.99, time: 0.36 },
      { freq: 1046.50, time: 0.54 },
    ];

    notes.forEach(note => {
      const startTime = ctx.currentTime + note.time;
      const duration = 0.8;

      // 基频振荡器
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = note.freq;

      // 泛音振荡器（高八度 + 五度，模拟钟声泛音）
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = note.freq * 2.5;

      // 各自增益
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0, startTime);
      gain1.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0, startTime);
      gain2.gain.linearRampToValueAtTime(0.06, startTime + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.7);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(startTime);
      osc1.stop(startTime + duration);
      osc2.start(startTime);
      osc2.stop(startTime + duration * 0.7);
    });

    // 第二个和弦 — 稍微延迟后播一个更丰富的和弦
    setTimeout(() => {
      const chordNotes = [523.25, 659.25, 783.99, 1046.50];
      const chordStart = ctx.currentTime;

      chordNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, chordStart);
        gain.gain.linearRampToValueAtTime(0.1, chordStart + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(chordStart);
        osc.stop(chordStart + 1.2);
      });
    }, 900);
  }

  /**
   * 确保 AudioContext 已激活（iOS Safari 要求用户手势）
   * 在第一个用户交互时调用
   */
  function ensureContext() {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  return { ensureContext, startScratch, stopScratch, playBells };
})();
