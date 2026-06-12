/**
 * particle-system.js — 粒子系统
 * 管理两种粒子：刮擦火花（跟随手指） + 雪花（揭示后持续飘落）
 */
const ParticleSystem = (() => {
  let sparkles = [];    // 火花粒子
  let snowflakes = [];  // 雪花粒子
  let snowActive = false;
  let canvasWidth = 0;
  let canvasHeight = 0;

  /**
   * 火花粒子: {x, y, vx, vy, life, maxLife, size, color, alpha}
   * 雪花粒子: {x, y, vy, vx, size, alpha, wobbleAmp, wobbleSpeed, wobblePhase}
   */

  function init(width, height) {
    canvasWidth = width;
    canvasHeight = height;
    sparkles = [];
    snowflakes = [];
    snowActive = false;
  }

  /** 在指定位置生成火花粒子 */
  function emitSparkles(x, y, count) {
    count = count || 4;
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
  }

  /** 激活雪花效果 */
  function startSnow() {
    snowActive = true;
    // 预生成初始雪花
    for (let i = 0; i < 60; i++) {
      const sf = createSnowflake();
      sf.y = Math.random() * canvasHeight; // 分散到整个画面
      snowflakes.push(sf);
    }
  }

  function createSnowflake() {
    return {
      x: Math.random() * canvasWidth,
      y: -10 - Math.random() * 40,
      vy: 20 + Math.random() * 50,       // 下落速度 px/s
      vx: 0,
      size: 1.5 + Math.random() * 5,
      alpha: 0.3 + Math.random() * 0.6,
      wobbleAmp: 8 + Math.random() * 25, // 水平摇摆幅度
      wobbleSpeed: 0.5 + Math.random() * 1.5,
      wobblePhase: Math.random() * Math.PI * 2,
    };
  }

  /** 每帧更新粒子状态 */
  function update(dt) {
    // 更新火花
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        sparkles.splice(i, 1);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 200 * dt; // 微重力
      s.alpha = 1 - (s.life / s.maxLife);
      s.size *= 0.995;   // 逐渐缩小
    }

    // 更新雪花
    if (!snowActive) return;

    // 维持雪花池 60-100 片
    const target = 80;
    while (snowflakes.length < target) {
      snowflakes.push(createSnowflake());
    }

    for (let i = snowflakes.length - 1; i >= 0; i--) {
      const sf = snowflakes[i];
      sf.y += sf.vy * dt;
      sf.wobblePhase += sf.wobbleSpeed * dt;
      sf.x += Math.sin(sf.wobblePhase) * sf.wobbleAmp * dt;

      // 超出底部 — 回收
      if (sf.y > canvasHeight + 15) {
        sf.y = -15;
        sf.x = Math.random() * canvasWidth;
      }
      // 超出左右 — 折返
      if (sf.x < -20) sf.x = canvasWidth + 20;
      if (sf.x > canvasWidth + 20) sf.x = -20;
    }

    // 限制雪花数量
    if (snowflakes.length > 120) {
      snowflakes.splice(0, snowflakes.length - 100);
    }
  }

  /** 绘制粒子到 canvas */
  function draw(ctx) {
    // 绘制火花
    sparkles.forEach(s => {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      // 光晕
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      // 亮核
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = s.alpha * 0.8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 绘制雪花
    if (!snowActive) return;

    snowflakes.forEach(sf => {
      ctx.save();
      ctx.globalAlpha = sf.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255,255,255,0.5)';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.arc(sf.x, sf.y, sf.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  /** 获取当前活跃粒子总数（调试用） */
  function count() {
    return sparkles.length + snowflakes.length;
  }

  /** 获取雪花是否激活 */
  function isSnowActive() {
    return snowActive;
  }

  return { init, emitSparkles, startSnow, update, draw, count, isSnowActive };
})();
