# 架构文档（ARCHITECTURE）

> 单 HTML 文件 + 内嵌模块化的口算训练应用架构总览

---

## 一、设计原则

| 原则 | 含义 |
|---|---|
| **简单优先** | 单文件可分享、零依赖、零构建、零 CDN |
| **数据本地** | 无服务器、无网络请求（除自动更新检查外） |
| **儿童友好** | 反应快、容错好、不卡顿 |
| **可演进** | IIFE 包裹 + 对象命名空间隔离，模块间松耦合 |
| **离线优先** | PWA + Service Worker，完全离线可用 |

---

## 二、模块架构

```
index.html (IIFE 自执行函数)
│
├── autoUpdate        # GitHub 版本检查 + 更新横幅
├── utils             # 工具函数（随机数、格式化、HTML 转义）
├── store             # localStorage 封装（LRU 缓存 + 容量保护）
│   ├── get/set/remove
│   ├── getGlobal/setGlobal       # 全局数据（profiles列表、versionInfo）
│   └── getForProfile/setForProfile  # 作用域数据
├── schema            # 默认数据工厂 + v3→v4 数据迁移
├── profiles          # 多孩子档案管理（CRUD + 数据隔离）
├── levels            # 12 关卡配置 + 解锁判定
├── generator         # 四则运算题库生成器 + 干扰项
├── smartDifficulty   # 智能难度（滑动窗口 + 动态超时 + 自适应建议）
├── gamification      # 游戏化激励（连击/XP/任务/成就/日历）
├── mastery           # 精熟判定核心（标记/错集/冷却/通关）
├── state             # 应用状态管理
├── router            # 简单 hash 路由
├── ui                # 通用 UI（Toast/Modal/声效/庆祝动画）
├── audio             # WebAudio API 音效合成
├── reports           # 家长看板报表（弱项分析/趋势图/周报）
└── pages             # 页面渲染（home/training/parent/errors/achievements）
    └── boot          # 启动入口
```

---

## 三、数据流

```
用户操作
    ↓
pages.*() 渲染
    ↓
mastery / smartDifficulty / gamification 逻辑处理
    ↓
profiles.get/set (数据隔离层)
    ↓
store.get/set (localStorage 封装)
    ↓
localStorage (浏览器持久化)
```

所有数据读写通过 `profiles` 模块自动添加 `hx.{profileId}.` 前缀，实现多孩子数据隔离。

---

## 四、新增模块说明 (v1.1.0)

### autoUpdate
- `GITHUB_REPO` 配置为实际仓库地址后生效
- 每小时检查 1 次 GitHub Releases API (带 5s 超时)
- 发现新版本 → 页面顶部显示「新版本可用」横幅
- 点击「更新」按钮 → 跳转到 Release 页面
- 静默失败，不影响离线使用

### profiles
- `profiles.get(key)` / `profiles.set(key)` 自动作用域到当前活跃孩子
- `profiles.switch(id)` 切换孩子，自动刷新 UI
- `profiles.create(name, avatar)` 创建新孩子档案
- `profiles.remove(id)` 删除孩子及其所有数据

### smartDifficulty
- 滑动窗口记录最近 30 题答题数据
- 动态超时：表现好缩短（下限 3s），表现差放宽（上限 30s）
- 建议生成：`easier`（建议回顾）、`harder`（建议挑战）、`more_practice`

### gamification
- 连击系统：连续答对计数 + 特效（5/10/15 连击 Toast + Confetti）
- XP/等级：答对 10XP、通关 100XP，`level = floor(sqrt(totalXp/100)) + 1`
- 每日任务：每天随机 3 个任务（完成 N 题/连击/准确率）
- 成就系统：15 个成就（首次答对/百题/全关卡王者/30 天连续等）
- 日历年：自动记录练习天数，连续 streak 统计

### reports
- 弱项分析：按四种运算符统计掌握率
- 准确率趋势：14 天滑动折线图（inline SVG，零依赖）
- 周报生成：练习天数/题数/时长统计
- CSV 导出：每条题目一行，含时间戳/正确性/反应时间
