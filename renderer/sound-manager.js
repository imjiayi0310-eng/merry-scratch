/**
 * sound-manager.js — 音频管理
 * - 刮擦声：风雪环境音循环（Bilibili 冬季风雪 HQ 片段）
 * - 揭示铃声：Christmas List 钢琴版（Anson Seabra）
 */
const SoundManager = (() => {
  let audioCtx = null;
  let scratchBuffer = null;   // 预加载的风雪音频
  let scratchSource = null;   // 当前播放的刮擦音源
  let scratchGain = null;
  let isScratching = false;
  let revealBuffer = null;    // 预加载的揭示音频

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

  /** 预加载所有音频 */
  function preloadAll() {
    const ctx = getContext();
    return Promise.all([
      // 风雪刮擦声
      fetch('assets/scratch.m4a')
        .then(r => r.arrayBuffer())
        .then(b => ctx.decodeAudioData(b))
        .then(d => { scratchBuffer = d; }),
      // 揭示铃声
      fetch('assets/reveal.m4a')
        .then(r => r.arrayBuffer())
        .then(b => ctx.decodeAudioData(b))
        .then(d => { revealBuffer = d; }),
    ]).catch(() => {
      console.log('部分音频加载失败，使用回退方案');
    });
  }

  /** 开始播放风雪刮擦声（循环） */
  function startScratch() {
    const ctx = getContext();
    if (isScratching) return;
    isScratching = true;

    if (scratchBuffer) {
      scratchSource = ctx.createBufferSource();
      scratchSource.buffer = scratchBuffer;
      scratchSource.loop = true;
      scratchGain = ctx.createGain();
      scratchGain.gain.value = 0.25; // 轻柔音量
      scratchSource.connect(scratchGain);
      scratchGain.connect(ctx.destination);
      scratchSource.start(0);
    }
    // 无预加载音频时静默，不合成噪音
  }

  /** 停止刮擦声（淡出） */
  function stopScratch() {
    if (!isScratching) return;
    isScratching = false;

    if (scratchGain && audioCtx) {
      const now = audioCtx.currentTime;
      scratchGain.gain.linearRampToValueAtTime(0, now + 0.2);
      setTimeout(() => {
        try { scratchSource.stop(); } catch(e) {}
        scratchSource = null;
        scratchGain = null;
      }, 250);
    }
  }

  /** 播放揭示铃声 */
  function playBells() {
    const ctx = getContext();
    // 确保 context 处于运行状态
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => playNow(ctx));
    } else {
      playNow(ctx);
    }
  }

  function playNow(ctx) {
    if (revealBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = revealBuffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.05); // 更快的淡入
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    }
  }

  return { ensureContext, preloadAll, startScratch, stopScratch, playBells };
})();
