# 技术规范 — Merry Scratch

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 平台 | PWA（Progressive Web App） | 纯前端，无需后端 |
| 图形 | HTML5 Canvas（3 层） | treeCanvas / scratchCanvas / particleCanvas |
| 音效 | Web Audio API + 预加载 M4A | 真实音频文件 |
| 存储 | localStorage | 圣诞树编号持久化 |
| 部署 | GitHub Pages | 免费静态托管 |

## 项目结构

```
merry-scratch/
├── index.html              # 入口 + 三层 Canvas + 按钮
├── manifest.json           # PWA 清单
├── sw.js                   # Service Worker（离线缓存）
├── renderer/
│   ├── app.js              # 主控制器（状态机 + 动画循环）
│   ├── scratch-layer.js    # 刮开层（Canvas 擦除 + 进度）
│   ├── tree-drawer.js      # 树绘制（图片加载 + 光点 + 聚光灯）
│   ├── particle-system.js  # 粒子（星光 + 火花 + 柔光 + 雪花）
│   ├── sound-manager.js    # 音效（预加载 + 播放 + 循环）
│   └── storage.js          # 持久化（随机分配 + 读写）
├── assets/
│   ├── tree-{1..6}.jpg     # 6 张圣诞树图片（1000px 高）
│   ├── scratch.m4a         # 风雪刮擦音（4s）
│   ├── reveal.m4a          # 揭示铃声（10s）
│   └── icon-*.png          # PWA 图标
├── docs/                   # 项目文档
└── devlog/                 # 开发日志
```

## 状态机

```
GUIDE → SCRATCHING → REVEALED
  ↓         ↓           ↓
 光晕引导   刮擦+火花    飘雪+铃声+重抽按钮
```

## 关键参数

| 参数 | 值 |
|------|-----|
| 揭示阈值 | 40% |
| 刮擦画笔（手机） | 70px |
| 刮擦画笔（桌面） | 45px |
| 进度采样间隔 | 0.4s |
| 揭示淡出时长 | 1.0s |
| 光晕爆炸时长 | 0.5s |
