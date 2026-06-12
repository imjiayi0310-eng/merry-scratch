/**
 * tree-drawer.js — 圣诞树绘制模块
 * 5 种不同设计的圣诞树，每棵带闪烁灯光动画
 */
const TreeDrawer = (() => {
  let lights = [];           // {x, y, radius, color, phase, speed}

  // ========== 辅助绘图函数 ==========

  /** 绘制五角星 */
  function drawStar(ctx, cx, cy, outerR, innerR, color, glowColor) {
    const spikes = 5;
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;

    // Glow
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20;

    ctx.beginPath();
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerR;
      let y = cy + Math.sin(rot) * outerR;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerR;
      y = cy + Math.sin(rot) * innerR;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  /** 绘制圆形装饰球 */
  function drawOrnament(ctx, x, y, r, color, highlight) {
    ctx.save();
    // Shadow for depth
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // Main ball
    const grad = ctx.createRadialGradient(x - r*0.3, y - r*0.3, r*0.1, x, y, r);
    grad.addColorStop(0, highlight || '#ffffff');
    grad.addColorStop(0.4, color);
    grad.addColorStop(1, '#000000');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Cap
    ctx.restore();
    ctx.fillStyle = '#888';
    ctx.fillRect(x - r*0.3, y - r - 2, r*0.6, 3);
  }

  /** 绘制礼物盒 */
  function drawGift(ctx, x, y, w, h, boxColor, ribbonColor) {
    ctx.save();
    // Box body
    ctx.fillStyle = boxColor;
    ctx.fillRect(x - w/2, y - h, w, h);

    // Ribbon vertical
    ctx.fillStyle = ribbonColor;
    ctx.fillRect(x - w*0.1, y - h, w*0.2, h);

    // Ribbon horizontal
    ctx.fillRect(x - w/2, y - h*0.6, w, h*0.2);

    // Bow on top
    ctx.beginPath();
    ctx.arc(x - w*0.2, y - h, w*0.25, 0, Math.PI * 2);
    ctx.arc(x + w*0.2, y - h, w*0.25, 0, Math.PI * 2);
    ctx.fillStyle = ribbonColor;
    ctx.fill();

    // Slightly darker shade
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x - w/2, y - h, w, h*0.1);
    ctx.restore();
  }

  /** 绘制树干 */
  function drawTrunk(ctx, cx, cy, w, h) {
    const grad = ctx.createLinearGradient(cx - w/2, 0, cx + w/2, 0);
    grad.addColorStop(0, '#4a2c0a');
    grad.addColorStop(0.3, '#7a4c1a');
    grad.addColorStop(0.7, '#6b3a10');
    grad.addColorStop(1, '#3d1f05');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - w/2, cy, w, h);

    // bark lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < h; i += 8) {
      ctx.beginPath();
      ctx.moveTo(cx - w/2 + 3, cy + i + Math.random()*3);
      ctx.lineTo(cx + w/2 - 3, cy + i + Math.random()*3);
      ctx.stroke();
    }
  }

  /** 在树上点缀灯光数据点 */
  function addLight(x, y, color, r) {
    lights.push({
      x, y,
      radius: r || 4,
      color: color,
      phase: Math.random() * Math.PI * 2,
      speed: 1.5 + Math.random() * 4,
    });
  }

  // ========== 5 种圣诞树绘制 ==========

  const treeDefs = [
    // Tree 1: 经典之星
    {
      name: '经典之星',
      draw(ctx, cx, topY, baseY) {
        const treeH = baseY - topY;
        const baseW = treeH * 0.55;

        // Three tiers
        const tiers = [
          { topOff: 0,       w: baseW * 0.45, h: treeH * 0.45, color: '#1a5632' },
          { topOff: treeH * 0.28, w: baseW * 0.75, h: treeH * 0.40, color: '#1d6b3a' },
          { topOff: treeH * 0.55, w: baseW * 1.0,  h: treeH * 0.45, color: '#1a5632' },
        ];

        tiers.forEach(t => {
          const tTop = topY + t.topOff;
          const tBot = tTop + t.h;
          const halfW = t.w / 2;
          const grad = ctx.createLinearGradient(0, tTop, 0, tBot);
          grad.addColorStop(0, '#2d8a4e');
          grad.addColorStop(0.5, t.color);
          grad.addColorStop(1, '#0f3d1f');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(cx, tTop);
          ctx.lineTo(cx + halfW, tBot);
          ctx.lineTo(cx - halfW, tBot);
          ctx.closePath();
          ctx.fill();

          // Small zigzag edge
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          for (let i = 0; i < 8; i++) {
            const px = cx - halfW + (t.w / 8) * i;
            ctx.beginPath();
            ctx.moveTo(px, tBot);
            ctx.lineTo(px + t.w/16, tBot - 8);
            ctx.lineTo(px + t.w/8, tBot);
            ctx.fill();
          }
        });

        // Star on top
        drawStar(ctx, cx, topY - 8, 18, 7, '#ffd700', '#ffa500');

        // Trunk
        drawTrunk(ctx, cx, baseY - 5, 30, 50);

        // Ornaments — red and gold balls
        const ornaments = [
          { x: cx - 40, y: topY + treeH*0.25 },
          { x: cx + 50, y: topY + treeH*0.30 },
          { x: cx - 70, y: topY + treeH*0.50 },
          { x: cx + 65, y: topY + treeH*0.48 },
          { x: cx,      y: topY + treeH*0.40 },
          { x: cx - 30, y: topY + treeH*0.70 },
          { x: cx + 35, y: topY + treeH*0.72 },
          { x: cx - 80, y: topY + treeH*0.80 },
          { x: cx + 75, y: topY + treeH*0.78 },
        ];
        ornaments.forEach((o, i) => {
          drawOrnament(ctx, o.x, o.y, 8, i % 2 === 0 ? '#cc2222' : '#ffd700', '#fff');
        });

        // Gifts
        drawGift(ctx, cx - 60, baseY + 35, 40, 30, '#cc3333', '#ffd700');
        drawGift(ctx, cx + 45, baseY + 40, 35, 25, '#2255cc', '#ffaa00');
        drawGift(ctx, cx + 10, baseY + 30, 30, 20, '#228833', '#ffcc00');

        // Lights around edges
        for (let i = 0; i < 20; i++) {
          const t = i / 20;
          const edgeY = topY + t * treeH;
          const halfW = (baseW / 2) * (1 - (edgeY - topY) / treeH) * 1.1;
          const lx = cx + (Math.sin(t * Math.PI * 4) * 0.3) * halfW;
          addLight(cx - halfW * 0.85, edgeY + 5, '#ffdd44', 3);
          addLight(cx + halfW * 0.85, edgeY + 5, '#ffdd44', 3);
        }
      }
    },

    // Tree 2: 雪地胖树
    {
      name: '雪地胖树',
      draw(ctx, cx, topY, baseY) {
        const treeH = baseY - topY;
        const baseW = treeH * 0.70;

        // Wide rounded body
        const grad = ctx.createLinearGradient(0, topY, 0, baseY);
        grad.addColorStop(0, '#2d7a3e');
        grad.addColorStop(1, '#0f3d1f');
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(cx, topY);
        // Right side — wide curve
        ctx.bezierCurveTo(
          cx + baseW * 0.7, topY + treeH * 0.2,
          cx + baseW * 0.55, topY + treeH * 0.7,
          cx + baseW * 0.4, baseY
        );
        ctx.lineTo(cx - baseW * 0.4, baseY);
        // Left side — wide curve
        ctx.bezierCurveTo(
          cx - baseW * 0.55, topY + treeH * 0.7,
          cx - baseW * 0.7, topY + treeH * 0.2,
          cx, topY
        );
        ctx.closePath();
        ctx.fill();

        // Snow scallops on edges — white fluffy border
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        const scallopCount = 12;
        for (let i = 0; i < scallopCount; i++) {
          const t = i / scallopCount;
          const edgeY = topY + 25 + t * (treeH - 30);
          const halfW = (baseW * 0.42) * Math.sin(t * Math.PI * 0.5 + 0.3);
          const lx = cx - halfW;
          const rx = cx + halfW;
          ctx.beginPath();
          ctx.arc(lx + 8, edgeY, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(rx - 8, edgeY, 14, 0, Math.PI * 2);
          ctx.fill();
        }

        // Snow on top
        ctx.beginPath();
        ctx.arc(cx, topY + 5, 18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();

        // Trunk
        drawTrunk(ctx, cx, baseY, 35, 45);

        // Colorful lights
        const bulbColors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
        for (let i = 0; i < 28; i++) {
          const angle = (i / 28) * Math.PI * 1.8 - Math.PI * 0.9;
          const dist = (baseW * 0.38) * Math.sin(angle * 0.6 + 0.3);
          const lx = cx + Math.cos(angle) * dist;
          const ly = topY + treeH * 0.1 + (i / 28) * treeH * 0.85;
          addLight(lx, ly, bulbColors[i % bulbColors.length], 3.5);
        }

        // Gifts
        drawGift(ctx, cx - 50, baseY + 35, 38, 30, '#dd4444', '#fff');
        drawGift(ctx, cx + 55, baseY + 38, 42, 32, '#44aa44', '#ffdd00');
      }
    },

    // Tree 3: 瘦高松
    {
      name: '瘦高松',
      draw(ctx, cx, topY, baseY) {
        const treeH = baseY - topY;
        const baseW = treeH * 0.40;

        // 5 narrow tiers
        const tierCount = 5;
        for (let i = 0; i < tierCount; i++) {
          const tTop = topY + (i / tierCount) * treeH;
          const tBot = topY + ((i + 1) / tierCount) * treeH;
          const progress = (i + 0.5) / tierCount;
          const halfW = baseW * 0.5 * progress;

          const grad = ctx.createLinearGradient(0, tTop, 0, tBot);
          grad.addColorStop(0, '#2d8a3e');
          grad.addColorStop(1, '#154a25');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(cx, tTop - 8);
          ctx.lineTo(cx + halfW, tBot);
          ctx.lineTo(cx - halfW, tBot);
          ctx.closePath();
          ctx.fill();
        }

        // Star
        drawStar(ctx, cx, topY - 10, 14, 5, '#ffd700', '#ffa500');

        // Trunk — tall and thin
        drawTrunk(ctx, cx, baseY - 3, 22, 55);

        // Silver bells
        for (let i = 0; i < 8; i++) {
          const t = 0.1 + (i / 8) * 0.85;
          const side = i % 2 === 0 ? -1 : 1;
          const halfW = (baseW * 0.5) * t * 0.8;
          const bx = cx + side * halfW;
          const by = topY + t * treeH;
          // Bell
          ctx.fillStyle = '#c0c0c0';
          ctx.beginPath();
          ctx.arc(bx, by - 4, 6, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = '#e8e8e8';
          ctx.beginPath();
          ctx.arc(bx, by - 6, 3, 0, Math.PI * 2);
          ctx.fill();
          // Small red bow above bell
          ctx.fillStyle = '#cc2222';
          ctx.beginPath();
          ctx.arc(bx - 3, by - 3, 2.5, 0, Math.PI * 2);
          ctx.arc(bx + 3, by - 3, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // White/silver lights
        for (let i = 0; i < 20; i++) {
          const t = 0.05 + (i / 20) * 0.9;
          const halfW = (baseW * 0.5) * t * 0.85;
          addLight(cx - halfW, topY + t * treeH, '#eeeeff', 2.5);
          addLight(cx + halfW, topY + t * treeH, '#eeeeff', 2.5);
        }

        // Gifts
        drawGift(ctx, cx - 35, baseY + 40, 30, 24, '#8844aa', '#ffcc00');
        drawGift(ctx, cx + 40, baseY + 42, 32, 26, '#cc4444', '#ffffff');
      }
    },

    // Tree 4: 梦幻紫树
    {
      name: '梦幻紫树',
      draw(ctx, cx, topY, baseY) {
        const treeH = baseY - topY;
        const baseW = treeH * 0.50;

        // Smooth purple gradient body
        const grad = ctx.createLinearGradient(0, topY, 0, baseY);
        grad.addColorStop(0, '#6a3d8a');
        grad.addColorStop(0.5, '#4a2d6a');
        grad.addColorStop(1, '#1a0a2e');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx, topY);
        ctx.lineTo(cx + baseW * 0.48, baseY);
        ctx.lineTo(cx - baseW * 0.48, baseY);
        ctx.closePath();
        ctx.fill();

        // Second pass — slightly smaller for depth
        ctx.fillStyle = 'rgba(130, 70, 170, 0.3)';
        ctx.beginPath();
        ctx.moveTo(cx, topY + 15);
        ctx.lineTo(cx + baseW * 0.35, baseY - 10);
        ctx.lineTo(cx - baseW * 0.35, baseY - 10);
        ctx.closePath();
        ctx.fill();

        // Glowing star
        drawStar(ctx, cx, topY - 5, 20, 8, '#dda0ff', '#9944ff');

        // Spiral star lights
        const spiralLights = 30;
        for (let i = 0; i < spiralLights; i++) {
          const t = i / spiralLights;
          const angle = t * Math.PI * 6;
          const r = (baseW * 0.45) * (1 - t * 0.85);
          const lx = cx + Math.cos(angle) * r;
          const ly = topY + 20 + t * (treeH - 25);
          addLight(lx, ly, Math.random() > 0.5 ? '#dda0ff' : '#ffd700', 3.5);
        }

        // Trunk
        drawTrunk(ctx, cx, baseY, 28, 48);

        // Gold/purple ornaments
        for (let i = 0; i < 10; i++) {
          const t = 0.1 + (i / 10) * 0.8;
          const side = i % 2 === 0 ? -1 : 1;
          const halfW = (baseW * 0.45) * (1 - t);
          drawOrnament(ctx, cx + side * halfW * 0.75 * (0.7 + Math.random() * 0.6), topY + t * treeH, 7, i % 3 === 0 ? '#ffd700' : '#b088dd', '#fff');
        }

        // Gifts
        drawGift(ctx, cx - 48, baseY + 38, 36, 28, '#6a2d8a', '#ffd700');
        drawGift(ctx, cx + 42, baseY + 40, 30, 22, '#8844cc', '#eebbff');
        drawGift(ctx, cx + 5, baseY + 35, 28, 20, '#ddcc44', '#8844aa');
      }
    },

    // Tree 5: 童趣彩树
    {
      name: '童趣彩树',
      draw(ctx, cx, topY, baseY) {
        const treeH = baseY - topY;
        const baseW = treeH * 0.55;

        // Irregular fun shape — overlapping circles
        const layers = [
          { cy: topY + treeH * 0.12, rx: baseW * 0.22, ry: treeH * 0.10 },
          { cy: topY + treeH * 0.28, rx: baseW * 0.35, ry: treeH * 0.12 },
          { cy: topY + treeH * 0.46, rx: baseW * 0.45, ry: treeH * 0.13 },
          { cy: topY + treeH * 0.65, rx: baseW * 0.52, ry: treeH * 0.15 },
          { cy: topY + treeH * 0.82, rx: baseW * 0.48, ry: treeH * 0.18 },
        ];

        layers.forEach((l, idx) => {
          const grad = ctx.createRadialGradient(cx, l.cy - l.ry * 0.3, l.ry * 0.1, cx, l.cy, l.ry * 1.2);
          const greens = ['#44bb44', '#33aa33', '#2d9a2d', '#228b22', '#1d7a1d'];
          grad.addColorStop(0, '#88dd66');
          grad.addColorStop(0.6, greens[idx]);
          grad.addColorStop(1, '#0f3d0f');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(cx, l.cy, l.rx, l.ry, 0, 0, Math.PI * 2);
          ctx.fill();
        });

        // Big star on top
        drawStar(ctx, cx, topY - 5, 22, 9, '#ffdd00', '#ff8800');

        // Trunk
        drawTrunk(ctx, cx, baseY, 28, 42);

        // Big colorful bulbs
        const bigBulbColors = ['#ff3333', '#33ff33', '#3333ff', '#ffff33', '#ff33ff', '#ff8833', '#33ffff'];
        for (let i = 0; i < 15; i++) {
          const t = 0.08 + (i / 15) * 0.8;
          const angle = (i / 15) * Math.PI * 2.5;
          const r = (baseW * 0.48) * Math.sin(t * Math.PI * 0.55);
          const lx = cx + Math.cos(angle) * r;
          const ly = topY + t * treeH;
          drawOrnament(ctx, lx, ly, 10, bigBulbColors[i % bigBulbColors.length], '#fff');
        }

        // Candy canes
        for (let side = -1; side <= 1; side += 2) {
          const caneX = cx + side * baseW * 0.42;
          const caneY = topY + treeH * 0.65;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(caneX, caneY);
          ctx.lineTo(caneX, caneY + 25);
          ctx.stroke();

          // Red stripes
          ctx.strokeStyle = '#ff2222';
          ctx.lineWidth = 5;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(caneX, caneY);
          ctx.lineTo(caneX, caneY + 25);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineWidth = 1;

          // Hook top
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(caneX, caneY, 8, Math.PI, 0);
          ctx.stroke();
        }

        // Lights
        for (let i = 0; i < 25; i++) {
          const t = 0.05 + (i / 25) * 0.85;
          const angle = (i / 25) * Math.PI * 3;
          const r = (baseW * 0.46) * Math.sin(t * Math.PI * 0.6);
          addLight(cx + Math.cos(angle) * r, topY + t * treeH, bigBulbColors[i % bigBulbColors.length], 3.5);
        }

        // Gifts
        drawGift(ctx, cx - 55, baseY + 36, 40, 32, '#ff6622', '#44ff44');
        drawGift(ctx, cx + 50, baseY + 38, 36, 28, '#ff44ff', '#ffff00');
      }
    },
  ];

  // ========== 公共接口 ==========

  /**
   * 初始化指定编号的圣诞树
   * @param {number} treeId - 1-5
   * @returns {number} 返回该树的灯光数量
   */
  function init(treeId) {
    lights = [];
    // Just validate — actual drawing happens in draw()
    if (treeId < 1 || treeId > treeDefs.length) {
      treeId = 1;
    }
    return treeId;
  }

  /**
   * 绘制当前帧的圣诞树（含闪烁灯光）
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width - canvas 宽度
   * @param {number} height - canvas 高度
   * @param {number} treeId - 1-5
   * @param {number} time - 已运行秒数 (用于灯光动画)
   */
  function draw(ctx, width, height, treeId, time) {
    ctx.clearRect(0, 0, width, height);

    if (treeId < 1 || treeId > treeDefs.length) treeId = 1;

    // 背景渐变 — 深色夜空
    const bgGrad = ctx.createRadialGradient(width / 2, height * 0.35, height * 0.1, width / 2, height / 2, height * 0.8);
    bgGrad.addColorStop(0, '#0a1a2e');
    bgGrad.addColorStop(1, '#000010');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 地面微光
    const groundGrad = ctx.createLinearGradient(0, height * 0.78, 0, height);
    groundGrad.addColorStop(0, 'rgba(255,255,255,0.05)');
    groundGrad.addColorStop(1, 'rgba(255,255,255,0.12)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, height * 0.78, width, height * 0.22);

    // 背景小星星
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    const starSeed = treeId * 137;
    for (let i = 0; i < 40; i++) {
      const sx = ((starSeed + i * 271) % width);
      const sy = ((starSeed + i * 173) % (height * 0.7));
      const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.3 + i * 0.7));
      ctx.globalAlpha = twinkle * 0.6;
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 计算树的位置
    const topY = height * 0.08;
    const baseY = height * 0.78;

    // 重设灯光数组并调用树的专属绘制
    lights = [];
    treeDefs[treeId - 1].draw(ctx, width / 2, topY, baseY);

    // 绘制闪烁灯光
    lights.forEach(light => {
      const brightness = 0.3 + 0.7 * Math.abs(Math.sin(time * light.speed + light.phase));
      ctx.save();
      ctx.shadowColor = light.color;
      ctx.shadowBlur = brightness * 12;
      ctx.globalAlpha = 0.6 + brightness * 0.4;
      ctx.fillStyle = light.color;
      ctx.beginPath();
      ctx.arc(light.x, light.y, light.radius * (0.8 + brightness * 0.4), 0, Math.PI * 2);
      ctx.fill();
      // Bright core
      ctx.globalAlpha = brightness;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(light.x, light.y, light.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  /** 获取圣诞树名称 */
  function getTreeName(treeId) {
    if (treeId < 1 || treeId > treeDefs.length) return '未知的树';
    return treeDefs[treeId - 1].name;
  }

  return { init, draw, getTreeName };
})();
