# 口算无痛训练工具（iPad 网页版）

> 为 6\~8 岁二年级学生设计的"无压力口算训练"应用，纯本地、零成本、即开即用。

---

## 一、项目定位

**一句话**：通过 4 选 1 选择题的形式，配合"连续首次正确"的精熟判定算法，让孩子在无惩罚、无时间压力的环境中扎实掌握二年级口算。

**核心差异化**：

- 🛡️ **无痛**：错误不扣分、不换题，可当场修正
- 🎯 **精熟**：连续首次正确达到目标才算"通过"，杜绝蒙对
- 📱 **零成本**：纯 PWA + 单 HTML 文件，iPad Safari 添加到主屏即用
- 🔒 **隐私优先**：所有数据仅存设备本地

---

## 二、目标用户

| 角色 | 画像 | 核心诉求 |
|---|---|---|
| **孩子**（主用户） | 6\~8 岁，二年级 | 无挫败感、有掌控感、获得正向反馈 |
| **家长**（次用户） | 30\~40 岁，关心教育 | 掌握学情、不强制干预、保护学习自主性 |

---

## 三、设备要求

| 项 | 要求 |
|---|---|
| 设备 | iPad（推荐 iPad 第 6 代及以上） |
| 系统 | iPadOS 14+ |
| 浏览器 | Safari 14+ |
| 网络 | 首次访问需联网；之后完全离线 |
| 存储 | 约 2\~5MB（含 PWA 缓存） |

> **iPhone 兼容性**：核心功能可运行，但屏幕较小，建议优先 iPad。详见 [UI-SPEC.md](./UI-SPEC.md)。

---

## 四、技术栈

| 层 | 技术 |
|---|---|
| 运行时 | 现代浏览器（Safari/Chrome） |
| 语言 | 原生 HTML + CSS + JavaScript（ES2020+） |
| 模块化 | 单 HTML + 内嵌 IIFE 命名空间 |
| 样式 | 原生 CSS（CSS Variables + Grid + Flexbox） |
| 存储 | localStorage（多键分域 + schema 版本化） |
| 音频 | WebAudio API（实时合成，无音频文件） |
| PWA | manifest.json + Service Worker |
| 字体 | 系统字体栈 + 可选中文字体子集 |

**不使用**：任何框架（React/Vue）、构建工具（webpack/vite）、CDN 依赖、npm 包。

---

## 五、运行方法

### 5.1 开发期（本地）

```bash
# 任选一种静态服务器方式
python3 -m http.server 8080
# 或
npx serve .
```

在 iPad Safari 打开 `http://<电脑 IP>:8080`。

### 5.2 部署与发布

将 `index.html` + `manifest.json` + `service-worker.js` + `icons/` 上传至任意静态托管（如 GitHub Pages、Netlify、Vercel）。

> ⚠️ **必须 HTTPS**：Service Worker 与 PWA 添加到主屏要求 HTTPS（GitHub Pages / Netlify 默认满足）。

### 5.3 iPad 添加到主屏

1. iPad Safari 打开应用 URL
2. 点击底部分享按钮「⬆️」
3. 选择「添加到主屏幕」
4. 命名后确认，应用以独立窗口全屏运行

---

## 六、目录结构

```
haoxue/
├── docs/                  # 本目录：开发文档
│   ├── README.md          # 项目概览（本文件）
│   ├── PRD.md             # 产品需求
│   ├── ARCHITECTURE.md    # 架构与 ADR
│   ├── DATA-MODEL.md      # 数据模型
│   ├── LEVELS.md          # 关卡与题库算法
│   ├── UI-SPEC.md         # 界面与交互规范
│   ├── A11Y.md            # 无障碍设计
│   ├── PWA.md             # PWA 配置
│   └── TESTING.md         # 测试策略
├── index.html             # 单文件应用（核心产物）
├── manifest.json          # PWA 清单
├── service-worker.js      # 离线缓存
└── icons/                 # 应用图标（192/512）
```

---

## 七、文档导览

| 我想了解... | 看这份文档 |
|---|---|
| 产品要做什么、为什么这么做 | [PRD.md](./PRD.md) |
| 代码如何组织、为什么这么组织 | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| 数据存在哪、怎么存 | [DATA-MODEL.md](./DATA-MODEL.md) |
| 题目怎么生成、怎么判定"通过" | [LEVELS.md](./LEVELS.md) |
| 页面长什么样、怎么交互 | [UI-SPEC.md](./UI-SPEC.md) |
| 如何对儿童和无障碍友好 | [A11Y.md](./A11Y.md) |
| 如何安装到 iPad 主屏 | [PWA.md](./PWA.md) |
| 如何测试 | [TESTING.md](./TESTING.md) |

---

## 八、版本

| 版本 | 日期 | 说明 |
|---|---|---|
| 0.1.0 | 2026-06-23 | 初始开发文档建立 |

详见 [CHANGELOG.md](./CHANGELOG.md)。

---

## 九、许可与隐私

- **代码许可**：MIT
- **数据隐私**：所有用户数据仅存储在设备 localStorage，**不上传任何服务器**
- **第三方依赖**：无
- **账号体系**：无
- **可重置**：家长面板提供"清除所有数据"功能，二次确认

---

## 十、联系与反馈

本文档为内部开发文档。如需对需求、架构、算法提出修改建议，请直接在对应文档中提交 Issue。