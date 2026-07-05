# PWA 配置（PWA）

> manifest.json + Service Worker + 添加到主屏流程

---

## 一、PWA 概述

**目标**：让用户像原生应用一样从 iPad 主屏启动口算训练工具，离线可用。

**核心组件**：

1. `manifest.json` — 应用元数据与图标
2. `service-worker.js` — 离线缓存与资源管理
3. HTTPS 部署 — 必需前提

---

## 二、文件结构

```
haoxue/
├── index.html              # 主入口（含 manifest link、SW 注册）
├── manifest.json           # PWA 清单
├── service-worker.js       # 离线缓存
├── icons/
│   ├── icon-192.png        # 应用图标 192×192
│   ├── icon-512.png        # 应用图标 512×512
│   ├── icon-maskable-192.png  # 自适应图标
│   ├── icon-maskable-512.png
│   └── apple-touch-icon.png   # iOS 专用 180×180
└── ...
```

---

## 三、manifest.json

```json
{
  "name": "口算小达人",
  "short_name": "口算",
  "description": "二年级口算无痛训练",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#FFFBF5",
  "theme_color": "#5BA8E0",
  "lang": "zh-CN",
  "dir": "ltr",
  "categories": ["education", "kids"],
  "icons": [
    {
      "src": "./icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "./icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "./icons/icon-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "./icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### 字段说明

| 字段 | 值 | 说明 |
|---|---|---|
| `name` | "口算小达人" | 安装时与应用列表显示名 |
| `short_name` | "口算" | 主屏图标下文字 |
| `display` | "standalone" | 隐藏 Safari UI，全屏运行 |
| `orientation` | "any" | 允许横竖屏 |
| `theme_color` | `#5BA8E0` | 状态栏颜色 |
| `background_color` | `#FFFBF5` | 启动屏背景 |
| `start_url` | `./index.html` | 从主屏启动的入口 |

---

## 四、HTML 引用

### 4.1 index.html head

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1,
                user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#5BA8E0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="口算">

  <!-- iOS 图标 -->
  <link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">

  <!-- Manifest -->
  <link rel="manifest" href="./manifest.json">

  <title>口算小达人</title>
</head>
<body>
  ...
  <script>
    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then(reg => console.log('SW registered:', reg.scope))
          .catch(err => console.error('SW registration failed:', err));
      });
    }
  </script>
</body>
</html>
```

---

## 五、Service Worker

### 5.1 缓存策略

| 资源类型 | 策略 | 说明 |
|---|---|---|
| HTML | Network-first, fallback to cache | 保证更新可用 |
| CSS / JS | Cache-first, revalidate | 体积小、变更少 |
| 图标 | Cache-first | 几乎不变 |
| 字体 | Cache-first | 系统字体优先 |
| 数据 | 不缓存 | localStorage 处理 |

### 5.2 service-worker.js 模板

```js
const CACHE_VERSION = 'hx-v1.0.0';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// 请求：HTML 用 network-first，其他用 cache-first
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 跳过非 GET 请求
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 仅处理同源
  if (url.origin !== location.origin) return;

  // HTML：network-first
  if (request.mode === 'navigate' ||
      request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(c => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 其他资源：cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(c => c.put(request, clone));
        return response;
      });
    })
  );
});
```

### 5.3 更新策略

```js
// 用户启动后检测更新
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CHECK_UPDATE') {
    self.registration.update();
  }
});
```

应用内提供"检查更新"按钮（隐藏在家长面板或关于页），点击后调用。

---

## 六、添加到主屏流程

### 6.1 iPad Safari 操作步骤

1. 在 Safari 打开应用 URL（**首次需联网**）
2. 等待页面完全加载
3. 点击底部分享按钮 ⬆️
4. 下滑找到「添加到主屏幕」
5. 可修改名称（默认"口算小达人"）
6. 点击「添加」
7. 主屏出现应用图标

### 6.2 启动效果

- **冷启动**：白色背景 → 应用图标（启动屏）
- **Web 内容加载**：100\~500ms
- **完全可交互**：1\~2 秒

### 6.3 引导提示

首次访问时，可在主屏底部展示引导（家长面板提供开关关闭）：

```
┌────────────────────────────────────────┐
│  📌 提示：                              │
│  点击分享按钮 → 添加到主屏幕            │
│  就能像 App 一样使用啦！                │
│  [我知道了]                             │
└────────────────────────────────────────┘
```

---

## 七、图标设计规范

### 7.1 尺寸

| 用途 | 尺寸 | 说明 |
|---|---|---|
| manifest 192 | 192×192 | 普通图标 |
| manifest 512 | 512×512 | 普通图标 |
| maskable 192 | 192×192 | 自适应（带安全区） |
| maskable 512 | 512×512 | 自适应（带安全区） |
| apple-touch-icon | 180×180 | iOS 主屏 |

### 7.2 设计要点

- **形状**：圆角矩形（iOS 自动加圆角，但建议主动圆角更兼容）
- **背景**：纯色或渐变（主色 `#5BA8E0` 或暖黄 `#FFC857`）
- **主体**：大号算式符号（如 `3 + 5`）或简单几何图形（如星星）
- **留白**：至少 12% 安全区，避免被系统裁剪
- **风格**：卡通、鲜艳、儿童友好

### 7.3 Maskable 图标

maskable 图标的"安全区"是中心 80% 圆，外围 20% 可能被系统遮罩。

```
┌────────────────────┐
│░░░░░░░░░░░░░░░░░░░░│ ← 20% 可被遮罩
│░░░░░░░░░░░░░░░░░░░░│
│░░┌──────────────┐░░│ ← 中心 60% 必有内容
│░░│              │░░│
│░░│   3 + 5      │░░│
│░░│              │░░│
│░░└──────────────┘░░│
│░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░│
└────────────────────┘
```

---

## 八、部署

### 8.1 部署要求

- ✅ HTTPS 必需
- ✅ `manifest.json` MIME 类型 `application/manifest+json`
- ✅ Service Worker 同源
- ✅ 图标文件可访问

### 8.2 推荐平台

| 平台 | 优点 | 缺点 |
|---|---|---|
| **GitHub Pages** | 免费、简单、HTTPS 自动 | 公开仓库 |
| **Netlify** | 免费、自动 HTTPS、表单支持 | 需注册 |
| **Vercel** | 免费、自动 HTTPS、性能优 | 需注册 |
| **Cloudflare Pages** | 免费、自动 HTTPS、CDN | 需注册 |
| **自有服务器 + Nginx** | 完全可控 | 需自维护 HTTPS 证书 |

### 8.3 部署检查清单

```bash
# 1. Lighthouse PWA 检测
npx lighthouse https://your-domain.com --view

# 2. manifest 验证
https://manifest-validator.appspot.com/

# 3. SW 注册验证
# Chrome DevTools → Application → Service Workers
```

---

## 九、版本更新流程

### 9.1 发布流程

1. 修改代码
2. 更新 `CACHE_VERSION`（如 `hx-v1.0.0` → `hx-v1.1.0`）
3. 部署到服务器
4. 用户下次访问时自动检测更新
5. 旧缓存自动清理

### 9.2 用户视角的更新体验

- **透明更新**：后台下载新资源，下次启动生效
- **强制刷新按钮**：家长面板"检查更新"调用 `skipWaiting` + `clients.claim`，立即生效

```js
// 家长面板触发强制更新
async function forceUpdate() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  await reg.update();
  if (reg.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(() => location.reload(), 500);
  }
}
```

---

## 十、iOS Safari PWA 限制

### 10.1 已知限制

| 限制 | 影响 | 应对 |
|---|---|---|
| 无后台同步 | 数据仅 localStorage | 不需要后台同步（纯本地） |
| 缓存上限 ~50MB | 单 HTML 文件体积需控制 | 当前预估 ≤ 5MB，远低于上限 |
| 无推送通知 | 不能推送提醒 | 设计目标不需要 |
| WebAudio 需用户交互后才能播放 | 首次无声 | 首次点击时初始化 |
| 横竖屏切换可能丢失状态 | 当前关卡进度 | 监听 `visibilitychange` 恢复 |

### 10.2 iPadOS 14 / 15 / 16 / 17 兼容

- 所有 iPadOS 14+ Safari 14+ 均可运行
- 早期 iPadOS 缺失部分 CSS 特性（如 `:has()`），不依赖即可

### 10.3 Safari 私有模式

- 私有浏览模式下 Service Worker 与 localStorage 行为可能受限
- 提示用户「请使用普通模式访问」

---

## 十一、添加"安装"提示横幅

iOS 没有 `beforeinstallprompt` 事件（Android Chrome 才有），需要手动引导。

```js
function shouldShowInstallTip() {
  const isStandalone = window.navigator.standalone === true;
  const dismissed = localStorage.getItem('hx.installTipDismissed');
  return !isStandalone && !dismissed;
}

function showInstallTip() {
  if (!shouldShowInstallTip()) return;
  // 显示底部提示卡
  UI.toast({
    type: 'info',
    body: '📌 点击分享按钮 → 添加到主屏幕',
    action: { label: '我知道了', handler: dismissInstallTip }
  });
}

function dismissInstallTip() {
  localStorage.setItem('hx.installTipDismissed', '1');
}
```

---

## 十二、相关文档

- 架构：[ARCHITECTURE.md](./ARCHITECTURE.md)
- 数据：[DATA-MODEL.md](./DATA-MODEL.md)
- README：[README.md](./README.md)