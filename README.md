# 口算小达人

> 二年级口算无痛训练 · iPad 网页版 · PWA 单文件应用

---

## 快速开始

### 1. 启动本地服务器

由于使用了 Service Worker，需要通过 HTTP 协议访问（不能直接打开文件）。

**Python**：
```bash
python3 -m http.server 8080
```

**Node.js**：
```bash
npx serve -p 8080
```

### 2. 访问应用

浏览器打开：`http://localhost:8080`

### 3. iPad 上添加到主屏

1. iPad Safari 打开应用 URL
2. 点击分享按钮（⬆️）
3. 选择「添加到主屏幕」
4. 命名后确认

### 4. Docker 部署（飞牛 NAS）

```bash
docker-compose up -d
# 访问 http://NAS_IP:8080
```

---

## 核心特性

✅ **精熟判定**：每道题独立掌握状态，错题自动重做
✅ **错题优先**：错题进入错集，下次优先抽取
✅ **智能超时**：根据孩子表现动态调整倒计时速度
✅ **多孩子档案**：多个孩子独立进度，自由切换
✅ **游戏化激励**：连击特效、XP 等级、每日任务、成就徽章
✅ **12 关卡递进**：一位数加法 → 四则综合运算
✅ **智能分析**：准确率趋势图、弱项分析、周报
✅ **本地存储**：所有数据存于 localStorage，零上传
✅ **家长面板**：连点 3 次或长按 ⚙️ 进入
✅ **PWA 离线**：添加到主屏后完全离线
✅ **自动更新**：通过 GitHub Releases 检测新版本

---

## 部署到飞牛 NAS

### 方式一：Docker（推荐）

```bash
# 克隆或下载项目到 NAS
git clone https://github.com/YourName/haoxue.git
cd haoxue

# 启动
docker-compose up -d

# 访问 http://nas_ip:8080
```

### 方式二：静态文件托管

将 `index.html`、`manifest.json`、`service-worker.js`、`icons/` 放到 NAS 的 Web 目录中。

---

## 文件结构

```
haoxue/
├── index.html              # 主应用（单文件）
├── manifest.json           # PWA 清单
├── service-worker.js       # 离线缓存（支持在线更新）
├── Dockerfile              # Docker 构建文件
├── docker-compose.yml      # 一键部署
├── nginx.conf              # Nginx 配置
├── generate-icons.js       # 图标生成脚本
├── .github/workflows/      # GitHub Actions 自动发布
├── icons/                  # 应用图标（SVG + PNG）
└── docs/                   # 开发文档
```

---

## 家长入口

- **连点 ⚙️ 图标 3 次**（每次间隔 < 500ms）
- **长按 ⚙️ 图标 2 秒**

入口在主屏右上角和训练页右上角。

---

## 浏览器兼容性

- iPadOS 14+ Safari（主）
- 现代 Chrome / Edge / Firefox
- 不支持 IE

---

## 隐私

- 所有数据存于设备 localStorage
- 不上传任何服务器
- 不使用任何第三方 CDN
- 家长面板可一键清除所有数据

---

## 许可

MIT
