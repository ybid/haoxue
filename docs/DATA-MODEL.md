# 数据模型（DATA-MODEL）

> v4 · localStorage 多键分域存储 + profile 作用域隔离 + schema 版本化迁移

---

## 一、存储总览

### v4 架构（多孩子档案）

数据分为两类：

**全局数据**（不加 profile 前缀，所有孩子共享）：

| Key | 类型 | 说明 |
|---|---|---|
| `hx.versionInfo` | object | 版本更新检查记录 |
| `hx.profiles` | object | 多孩子档案列表 |

**Profile 作用域数据**（每个孩子独立，key 格式 `hx.{profileId}.{key}`）：

| 逻辑 Key | 估算大小 | 说明 |
|---|---|---|
| `profile` | < 1KB | 孩子级信息 |
| `progress` | < 5KB | 各关卡进度 |
| `mastery` | < 50KB | 每道题的掌握状态（精熟判定核心） |
| `errorSets` | < 10KB | 各关卡当前错集 |
| `errors` | < 50KB | 错题本历史（最多 200 条） |
| `achievements` | < 5KB | 成就解锁记录 |
| `challenges` | < 10KB | 计时挑战记录 |
| `daily` | < 30KB | 每日练习统计 |
| `settings` | < 1KB | 训练设置 |
| `smartStats` | < 20KB | 智能难度数据 |
| `xp` | < 5KB | 经验值与等级 |
| `missions` | < 5KB | 每日任务 |
| `streakCalendar` | < 50KB | 日历年（连续练习） |
| **合计** | **< 200KB** | 远低于 5MB 限额 |

### Schema 版本历史

| 版本 | 说明 |
|---|---|
| v1 | 初版，6 关卡 |
| v2 | 关卡配置优化 |
| v3 | 扩展为 12 关卡，新增迁移逻辑 |
| **v4 (当前)** | **多孩子档案，`profiles` 模块作用域隔离，新增 `smartStats/xp/missions/streakCalendar`** |

---

## 二、核心数据模型

### hx.profiles（全局）
```js
{
  schemaVer: 4,
  activeProfileId: 'p_xxx',        // 当前活跃孩子 ID
  list: [
    {
      id: 'p_xxx',                  // 唯一标识
      name: '小明',                 // 名字
      avatar: '👦',                 // Emoji 头像
      createdAt: 1719129600000,
      lastActiveAt: 1719129600000
    }
  ]
}
```

### hx.{pid}.mastery（精熟判定核心）
```js
{
  schemaVer: 4,
  byLevel: {
    "1": {
      questions: {
        "3+5": {
          status: "mastered",        // "unseen" | "pending" | "mastered"
          errorCount: 2,
          attempts: 3,
          timeoutCount: 1,
          firstCorrectAt: 1719129600000,
          addedToErrorSetAt: 1719129600000,
          cooldownUntil: null
        }
      },
      stats: { mastered: 10, pending: 2, sessionAttempted: 15 }
    }
  }
}
```

### hx.{pid}.smartStats（智能难度）
```js
{
  schemaVer: 4,
  byLevel: {
    "1": {
      recentResults: [
        { timestamp: 1719129600000, correct: true, responseMs: 3200, timeouted: false },
        // ...最多 30 条滑动窗口
      ],
      totalAttempts: 50,
      totalCorrect: 40,
      totalTimeout: 3,
      avgResponseMs: 3500,
      accuracyRate: 0.80,
      trendDirection: 'improving',   // 'improving' | 'declining' | 'stable'
      dynamicTimeoutMs: 5000,
      suggestion: null               // 'easier' | 'harder' | null
    }
  }
}
```

### hx.{pid}.xp（经验值/等级）
```js
{
  totalXp: 1250,
  level: 4,                // level = floor(sqrt(totalXp/100)) + 1
  history: [
    { timestamp: 1719129600000, amount: 10, eventType: 'correct', detail: '3+5' }
    // ...最多 50 条
  ]
}
```

### hx.{pid}.missions（每日任务）
```js
{
  schemaVer: 4,
  today: {
    date: '2025-07-05',
    missions: [
      { id: 'daily_30', type: 'questions', target: 30, progress: 12,
        completed: false, title: '完成 30 题', xpReward: 50 }
    ],
    allCompleted: false
  }
}
```

### hx.{pid}.achievements（成就）
```js
{
  schemaVer: 4,
  unlocked: [
    { id: 'first_correct', title: '第一次答对', desc: '回答正确第一道题',
      icon: '🎯', xpReward: 20, unlockedAt: 1719129600000, seen: false }
  ],
  totalUnlocked: 1
}
```

---

## 三、数据迁移

### v3 → v4 迁移

```js
// 检测旧数据
if (store.hasOldData()) {
  // 1. 创建默认 profile
  // 2. 将 hx.mastery / hx.progress / hx.settings 等迁移到 hx.{pid}.xxx
  // 3. 删除旧的全局 key
}
```

迁移仅执行一次，之后所有数据读写通过 `profiles.get/set('key')` 自动作用域化。
