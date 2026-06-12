/**
 * scratch-layer.js — 刮开层
 * 管理顶层 Canvas 的黑色覆盖、擦除交互、进度追踪
 */
const ScratchLayer = (() => {
  let canvas, ctx;
  let width, height;
  let isPointerDown = false;
  let lastX = 0, lastY = 0;
  let brushRadius = 50;
  let pointerType = 'mouse';   // 'mouse' | 'touch'
  let totalPixels = 0;
  const MOBILE_BRUSH = 70;     // 手指触控画笔（更大）
  const DESKTOP_BRUSH = 45;    // 鼠标画笔
  let progressCallback = null;
  let revealCallback = null;
  let currentProgress = 0;
  // 存储事件引用以便清理
  let _preventDefault = null;

  // 进度采样控制
  let sampleTimer = 0;
  const SAMPLE_INTERVAL = 0.4;     // 每 0.4s 采样一次
  const REVEAL_THRESHOLD = 0.40;   // 刮开 40% 触发揭示

  // 揭示过渡动画
  let isRevealing = false;
  let revealAlpha = 1.0;
  let revealStartTime = 0;
  const REVEAL_DURATION = 1.0;     // 1 秒淡出

  function init(canvasEl, onProgress, onReveal) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    progressCallback = onProgress;
    revealCallback = onReveal;
    isRevealing = false;
    revealAlpha = 1.0;

    resize();
    reset();

    // 事件监听
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    // 防止默认触摸行为（滚动、缩放）
    _preventDefault = e => e.preventDefault();
    canvas.addEventListener('touchstart', _preventDefault, { passive: false });
    canvas.addEventListener('touchmove', _preventDefault, { passive: false });
  }

  function resize() {
    width = canvas.width = canvas.clientWidth * window.devicePixelRatio;
    height = canvas.height = canvas.clientHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    totalPixels = canvas.clientWidth * canvas.clientHeight;
    // 根据屏幕大小自适应画笔：手机 ~70px，平板 ~80px，桌面 ~45px
    const screenW = canvas.clientWidth;
    if (screenW < 768) {
      brushRadius = MOBILE_BRUSH; // 手机
    } else if (screenW < 1024) {
      brushRadius = 80;           // 平板
    } else {
      brushRadius = DESKTOP_BRUSH; // 桌面
    }
  }

  /** 填充纯黑 */
  function reset() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }

  // ========== 指针事件 ==========

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function onPointerDown(e) {
    isPointerDown = true;
    pointerType = e.pointerType; // 'touch' | 'mouse' | 'pen'
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;

    // 擦一个初始圆
    eraseAt(pos.x, pos.y);

    // 通知外部 — 开始刮擦（触发音效等）
    if (typeof window.onScratchStart === 'function') {
      window.onScratchStart();
    }
  }

  function onPointerMove(e) {
    if (!isPointerDown || isRevealing) return;
    const pos = getPos(e);

    // 在两点之间插值画圆，保证连续
    const dx = pos.x - lastX;
    const dy = pos.y - lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = Math.max(1, brushRadius * 0.4);

    if (dist > step) {
      const steps = Math.ceil(dist / step);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        eraseAt(lastX + dx * t, lastY + dy * t);
      }
    } else {
      eraseAt(pos.x, pos.y);
    }

    lastX = pos.x;
    lastY = pos.y;

    // 通知粒子系统生成火花
    if (typeof window.onScratchMove === 'function') {
      window.onScratchMove(pos.x, pos.y);
    }
  }

  function onPointerUp() {
    if (!isPointerDown) return;
    isPointerDown = false;

    if (typeof window.onScratchEnd === 'function') {
      window.onScratchEnd();
    }
  }

  /** 在指定位置擦除一个圆形区域 */
  function eraseAt(x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // ========== 进度统计 ==========

  /**
   * 采样已擦除像素比例
   * 使用缩略图采样法提升性能
   */
  function sampleProgress() {
    // 创建缩略图
    const thumbW = Math.floor(canvas.clientWidth / 4);
    const thumbH = Math.floor(canvas.clientHeight / 4);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = thumbW;
    offCanvas.height = thumbH;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(canvas, 0, 0, thumbW, thumbH);

    const imageData = offCtx.getImageData(0, 0, thumbW, thumbH);
    const pixels = imageData.data;
    let transparent = 0;
    const total = thumbW * thumbH;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 128) transparent++; // alpha < 50%
    }

    return transparent / total;
  }

  // ========== 主更新循环 ==========

  function update(dt, time) {
    if (isRevealing) {
      // 揭示过渡动画 — 整个 canvas 淡出
      const elapsed = time - revealStartTime;
      const progress = Math.min(1, elapsed / REVEAL_DURATION);
      // Ease-in-out
      revealAlpha = 1 - (progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2);

      canvas.style.opacity = revealAlpha;

      if (progress >= 1) {
        // 动画完成
        canvas.style.opacity = '0';
        canvas.style.pointerEvents = 'none';
        isRevealing = false;
      }
      return;
    }

    // 进度采样
    sampleTimer += dt;
    if (sampleTimer >= SAMPLE_INTERVAL && isPointerDown) {
      sampleTimer = 0;
      const percent = sampleProgress();
      currentProgress = percent;
      if (progressCallback) progressCallback(percent);
    }
  }

  /** 获取当前擦除进度 */
  function getProgress() {
    return currentProgress;
  }

  /** 触发揭示流程 */
  function triggerReveal(time) {
    if (isRevealing) return;
    isRevealing = true;
    revealStartTime = time;
    revealAlpha = 1.0;

    if (revealCallback) revealCallback();
  }

  function destroy() {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointerleave', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    if (_preventDefault) {
      canvas.removeEventListener('touchstart', _preventDefault);
      canvas.removeEventListener('touchmove', _preventDefault);
    }
  }

  return { init, resize, reset, update, triggerReveal, getProgress, destroy };
})();
