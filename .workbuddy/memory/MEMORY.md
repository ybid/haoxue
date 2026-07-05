# 口算小达人 — 项目记忆

## 核心架构决策
- **单文件 PWA**：index.html 单文件，零框架零构建零 CDN
- **多孩子数据隔离**：`hx.{profileId}.key` 前缀，store 层封装
- **智能难度**：滑动窗口 30 题，动态超时 3-30s
- **游戏化**：XP 等级公式 `sqrt(totalXp/100)+1`，前期升级快后期需要多
- **图表**：inline SVG 零依赖，iPad Safari 兼容

## 部署
- 飞牛 NAS：Docker（docker-compose up -d，端口 8080）
- 自动更新：配置 `autoUpdate.GITHUB_REPO` 后生效，GitHub Releases API 检查

## 关键文件
- `index.html`：主应用（~4051 行）
- `Dockerfile` / `docker-compose.yml` / `nginx.conf`：飞牛部署
- `.github/workflows/release.yml`：自动发布
- `service-worker.js`：PWA 离线缓存（stale-while-revalidate）

## 注意事项
- 首次运行会检测旧数据并自动迁移到 v4 多孩子模式
- 自动更新需配置 GitHub 仓库地址（`autoUpdate.GITHUB_REPO`）
- iOS 图标使用 SVG（iOS 14+ 支持），不再需要 PNG
