/**
 * sound-manager.js — Web Audio API 程序化音效合成
 * - 刮擦声：模拟树叶/纸张翻动的沙沙声（柔和不刺耳）
 * - 揭示铃声：温暖钟声旋律
 */
const SoundManager = (() => {
  let audioCtx = null;
  let scratchNodes = null;
  let isScratching = false;
  let revealBuffer = null;  // 预加载的揭示音频

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
   * 预加载揭示音频（Christmas List 钢琴版片段）
   */
  function preloadReveal() {
    const ctx = getContext();
    return fetch('assets/reveal.m4a')
      .then(res => res.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => {
        revealBuffer = decoded;
      })
      .catch(() => {
        // 加载失败时回退到合成铃声
        console.log('揭示音频加载失败，使用合成铃声');
      });
  }

  /**
   * 播放揭示音频
   */
  function playBells() {
    const ctx = getContext();
    if (revealBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = revealBuffer;
      // 轻柔淡入
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.1);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    } else {
      // 回退：简单三角波铃声
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now + i * 0.2);
        g.gain.linearRampToValueAtTime(0.1, now + i * 0.2 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.8);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(now + i * 0.2);
        osc.stop(now + i * 0.2 + 0.8);
      });
    }
  }

  return { ensureContext, preloadReveal, startScratch, stopScratch, playBells };
})();
