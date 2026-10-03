# 执行步骤 — Merry Scratch

## 本地开发

```bash
cd merry-scratch

# 启动本地服务器（Python）
python3 -m http.server 8080

# 浏览器打开
open http://localhost:8080

# 手机测试（同 WiFi）
# 查看本机 IP：ifconfig | grep 'inet ' | grep -v 127.0.0.1
# 手机访问：http://<IP>:8080
```

## 部署流程

```bash
cd merry-scratch

# 1. 查看改动
git status

# 2. 暂存并提交
git add -A
git commit -m "描述改动内容"

# 3. 推送（如 Token 过期需重新生成）
git push
```

## Token 过期处理

1. 打开 https://github.com/settings/tokens
2. Generate new token (classic) → No expiration → 勾选 repo
3. 复制新 Token，执行：
```bash
git remote set-url origin https://imjiayi0310-eng:<新TOKEN>@github.com/imjiayi0310-eng/merry-scratch.git
git push
```

## 验证部署

- 主应用：https://imjiayi0310-eng.github.io/merry-scratch/
- 音效试听：https://imjiayi0310-eng.github.io/merry-scratch/sound-test.html
- 构建状态：`curl -sH "Authorization: token <TOKEN>" https://api.github.com/repos/imjiayi0310-eng/merry-scratch/pages/builds/latest | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"`
