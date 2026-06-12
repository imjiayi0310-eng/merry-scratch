/**
 * particle-system.js — 粒子系统
 * 管理 4 种粒子：
 *   1. 待机星光（IDLE 状态若隐若现的小星点）
 *   2. 刮擦火花（金色粒子向外飞散）
 *   3. 粉色柔光（手指边缘柔光扩散）
 *   4. 雪花（揭示后持续飘落）
 */
const ParticleSystem = (() => {
  let sparkles = [];      // 火花粒子
  let pinkGlows = [];     // 粉色柔光扩散
  let idleStars = [];     // 待机星光
  let snowflakes = [];    // 雪花粒子
  let snowActive = false;
  let canvasWidth = 0;
  let canvasHeight = 0;

  function init(width, height) {
    canvasWidth = width;
    canvasHeight = height;
    sparkles = [];
    pinkGlows = [];
    snowflakes = [];
    snowActive = false;
    initIdleStars();
  }

  /** 初始化待机星光 — 散布在画面各处，微微闪烁 */
  function initIdleStars() {
    idleStars = [];
    const count = Math.floor((canvasWidth * canvasHeight) / 15000); // 适量分布
    for (let i = 0; i < Math.min(count, 80); i++) {
      idleStars.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        size: 0.5 + Math.random() * 2.5,
        alpha: 0.15 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.8,
        color: Math.random() > 0.7 ? '#ffccdd' : '#ffffff', // 偶尔粉色
      });
    }
  }

  /** 在指定位置生成火花 + 粉色柔光 */
  function emitSparkles(x, y, count) {
    count = count || 4;

    // 金色火花
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      sparkles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.45,
        size: 1 + Math.random() * 3.5,
        color: Math.random() > 0.5 ? '#ffd700' : '#ffaa44',
        alpha: 1,
      });
    }

    // 粉色柔光扩散 — 更大、更慢、更柔和
    for (let i = 0; i < 2; i++) {
      pinkGlows.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.5,
        maxRadius: 25 + Math.random() * 35,
        alpha: 0.35 + Math.random() * 0.25,
        color: i === 0 ? '#ffb8c6' : '#ffd1dc',
      });
    }
  }

  function startSnow() {
    snowActive = true;
    for (let i = 0; i < 60; i++) {
      const sf = createSnowflake();
      sf.y = Math.random() * canvasHeight;
      snowflakes.push(sf);
    }
  }

  function createSnowflake() {
    return {
      x: Math.random() * canvasWidth,
      y: -10 - Math.random() * 40,
      vy: 20 + Math.random() * 50,
      vx: 0,
      size: 1.5 + Math.random() * 5,
      alpha: 0.3 + Math.random() * 0.6,
      wobbleAmp: 8 + Math.random() * 25,
      wobbleSpeed: 0.5 + Math.random() * 1.5,
      wobblePhase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.85 ? '#ffd1dc' : '#ffffff', // 少量粉色雪花
    };
  }

  function update(dt, time) {
    // 更新火花
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i];
      s.life += dt;
      if (s.life >= s.maxLife) { sparkles.splice(i, 1); continue; }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 200 * dt;
      s.alpha = 1 - (s.life / s.maxLife);
      s.size *= 0.995;
    }

    // 更新粉色柔光 — 从出现位置向外膨胀扩散，然后淡出
    for (let i = pinkGlows.length - 1; i >= 0; i--) {
      const g = pinkGlows[i];
      g.life += dt;
      if (g.life >= g.maxLife) { pinkGlows.splice(i, 1); continue; }
      const progress = g.life / g.maxLife;
      g.currentRadius = g.maxRadius * progress;           // 逐渐变大
      g.alpha = 0.35 * (1 - progress) * (1 - progress);  // 加速衰减
    }

    // 更新雪花
    if (snowActive) {
      const target = 80;
      while (snowflakes.length < target) snowflakes.push(createSnowflake());
      for (let i = snowflakes.length - 1; i >= 0; i--) {
        const sf = snowflakes[i];
        sf.y += sf.vy * dt;
        sf.wobblePhase += sf.wobbleSpeed * dt;
        sf.x += Math.sin(sf.wobblePhase) * sf.wobbleAmp * dt;
        if (sf.y > canvasHeight + 15) { sf.y = -15; sf.x = Math.random() * canvasWidth; }
        if (sf.x < -20) sf.x = canvasWidth + 20;
        if (sf.x > canvasWidth + 20) sf.x = -20;
      }
      if (snowflakes.length > 120) snowflakes.splice(0, snowflakes.length - 100);
    }
  }

  function draw(ctx, time) {
    // 1. 粉色柔光（画在火花下面）
    pinkGlows.forEach(g => {
      const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.currentRadius || 20);
      grad.addColorStop(0, g.color);
      grad.addColorStop(1, 'transparent');
      ctx.save();
      ctx.globalAlpha = g.alpha;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.currentRadius || 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 2. 待机星光
    idleStars.forEach(s => {
      const twinkle = 0.3 + 0.7 * Math.abs(Math.sin((time || 0) * s.speed + s.phase));
      ctx.save();
      ctx.globalAlpha = s.alpha * twinkle;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 4;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * twinkle, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 3. 金色火花
    sparkles.forEach(s => {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = s.alpha * 0.8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 4. 雪花
    if (!snowActive) return;
    snowflakes.forEach(sf => {
      ctx.save();
      ctx.globalAlpha = sf.alpha;
      ctx.fillStyle = sf.color || '#ffffff';
      ctx.shadowColor = 'rgba(255,255,255,0.5)';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.arc(sf.x, sf.y, sf.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  /** 隐藏待机星光（开始刮擦后调用） */
  function fadeOutIdleStars() {
    idleStars.forEach(s => { s.alpha *= 0.3; });
  }

  function count() {
    return sparkles.length + pinkGlows.length + idleStars.length + snowflakes.length;
  }

  function isSnowActive() {
    return snowActive;
  }

  return { init, emitSparkles, startSnow, fadeOutIdleStars, update, draw, count, isSnowActive };
})();
