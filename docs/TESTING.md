# 测试策略（TESTING）

> 单元测试 + 手工测试清单 + 跨设备兼容 + 自动化建议

---

## 一、测试原则

| 原则 | 说明 |
|---|---|
| **关键路径优先** | 题库生成器、掌握度算法、数据迁移必须测试 |
| **手工兜底** | UI / 交互 / 动效依赖手工 |
| **真实设备** | iPad Safari 真实设备是最终基准 |
| **可重复** | 所有手工用例附带复现步骤 |

---

## 二、单元测试目标

由于单 HTML 文件不建议引入完整测试框架，可选用**轻量方案**：

### 2.1 测试方案选择

| 方案 | 适用 | 备注 |
|---|---|---|
| **Node + jsdom**（推荐） | 业务逻辑层 | 复用业务代码，无需打包 |
| **Node 原生 assert** | 简单算法 | 零依赖 |
| **浏览器内断言页** | UI 集成 | `?test=1` 路由进入测试页 |

### 2.2 测试范围

#### 题库生成器（必测）

```js
// tests/generator.test.js

describe('genAddition', () => {
  test('不进位模式：所有生成题目满足个位相加 < 10', () => {
    for (let i = 0; i < 1000; i++) {
      const q = genAddition({ range: {a:[0,9],b:[0,9]}, filter: {type:'noCarry'} });
      expect((q.a % 10) + (q.b % 10)).toBeLessThan(10);
    }
  });

  test('进位模式：所有生成题目满足个位相加 >= 10', () => {
    for (let i = 0; i < 1000; i++) {
      const q = genAddition({ range: {a:[0,9],b:[0,9]}, filter: {type:'carry'} });
      expect((q.a % 10) + (q.b % 10)).toBeGreaterThanOrEqual(10);
    }
  });

  test('答案正确', () => {
    const q = genAddition({ range: {a:[5,5],b:[3,3]}, filter: {type:'mixed'} });
    expect(q.answer).toBe(q.a + q.b);
    expect(q.expr).toBe(`${q.a} + ${q.b}`);
  });
});

describe('genSubtraction', () => {
  test('不退位：个位相减无需借位', () => {
    for (let i = 0; i < 1000; i++) {
      const q = genSubtraction({ range: {a:[10,99],b:[1,9]}, filter: {type:'noBorrow'} });
      expect(q.a % 10).toBeGreaterThanOrEqual(q.b % 10);
      expect(q.a).toBeGreaterThanOrEqual(q.b);
    }
  });

  test('不退位但 a < b 时重试', () => {
    // 1000 次抽样不应有负数结果
    for (let i = 0; i < 1000; i++) {
      const q = genSubtraction({ range: {a:[10,99],b:[1,9]}, filter: {type:'noBorrow'} });
      expect(q.answer).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('genDivision', () => {
  test('结果为整数', () => {
    for (let i = 0; i < 1000; i++) {
      const q = genDivision({ range: {a:[1,81],b:[1,9]} });
      expect(q.a % q.b).toBe(0);
      expect(q.answer).toBe(q.a / q.b);
    }
  });

  test('商在 1\~9 之间', () => {
    for (let i = 0; i < 1000; i++) {
      const q = genDivision({ range: {a:[1,81],b:[1,9]} });
      expect(q.answer).toBeGreaterThanOrEqual(1);
      expect(q.answer).toBeLessThanOrEqual(9);
    }
  });
});

describe('genMixed', () => {
  test('权重分布在 ±5% 内', () => {
    const counts = { '+': 0, '-': 0, '×': 0, '÷': 0 };
    const N = 10000;
    const level = { weights: { '+': 0.3, '-': 0.3, '×': 0.2, '÷': 0.2 } };
    for (let i = 0; i < N; i++) {
      const q = genMixed(level);
      counts[q.op] += 1;
    }
    expect(counts['+'] / N).toBeCloseTo(0.3, 1);
    expect(counts['-'] / N).toBeCloseTo(0.3, 1);
    expect(counts['×'] / N).toBeCloseTo(0.2, 1);
    expect(counts['÷'] / N).toBeCloseTo(0.2, 1);
  });
});
```

#### 精熟判定算法（必测）

```js
// tests/mastery.test.js

describe('mastery（精熟判定）', () => {
  test('错题进入错集', () => {
    const state = makeState();
    state = markError(state, { expr: '3+5', wrong: 7 });
    expect(state.errorSets[1]).toContain('3+5');
    expect(state.mastery.questions['3+5'].status).toBe('pending');
  });

  test('错集中的题答对 → 从错集移除并标记掌握', () => {
    let state = makeState();
    state.errorSets[1] = ['3+5'];
    state.mastery.questions['3+5'] = {
      status: 'pending', errorCount: 2, attempts: 2
    };
    state = markMastered(state, { expr: '3+5' });
    expect(state.errorSets[1]).not.toContain('3+5');
    expect(state.mastery.questions['3+5'].status).toBe('mastered');
  });

  test('错集空 → 通关（无最小题数要求）', () => {
    let state = makeState();
    state.mastery.questions = {
      '0+0': { status: 'mastered' }
    };
    state.errorSets[1] = [];
    expect(checkLevelPassed(state, 1)).toBe(true);
  });

  test('错集非空 → 不通关', () => {
    let state = makeState();
    state.mastery.questions = {
      '0+0': { status: 'mastered' },
      '0+1': { status: 'mastered' }
    };
    state.errorSets[1] = ['7+8'];
    expect(checkLevelPassed(state, 1)).toBe(false);
  });

  test('同题连续错 5 次进入冷却', () => {
    let state = makeState({ cooldownThreshold: 5 });
    state.mastery.questions['3+5'] = {
      status: 'pending', errorCount: 4, attempts: 4
    };
    state = markError(state, { expr: '3+5', wrong: 7 });
    expect(state.mastery.questions['3+5'].cooldownUntil).toBeDefined();
    expect(state.errorSets[1]).not.toContain('3+5');
  });

  test('冷却期间该题不出现在题面', () => {
    let state = makeState({ cooldownMinutes: 5 });
    state.errorSets[1] = ['3+5'];
    state.mastery.questions['3+5'] = {
      status: 'pending',
      cooldownUntil: Date.now() + 5 * 60 * 1000
    };
    for (let i = 0; i < 100; i++) {
      const q = nextQuestion(state, 1);
      expect(q.expr).not.toBe('3+5');
    }
  });

  test('错集不为空时优先抽错集', () => {
    let state = makeState();
    state.errorSets[1] = ['3+5', '7+8'];
    state.mastery.questions['3+5'] = {
      status: 'pending', errorCount: 1, attempts: 1
    };
    state.mastery.questions['7+8'] = {
      status: 'pending', errorCount: 1, attempts: 1
    };
    for (let i = 0; i < 100; i++) {
      const q = nextQuestion(state, 1);
      expect(['3+5', '7+8']).toContain(q.expr);
    }
  });

  test('已掌握的题不再出', () => {
    let state = makeState();
    state.mastery.questions['3+5'] = {
      status: 'mastered', firstCorrectAt: Date.now(), attempts: 1
    };
    for (let i = 0; i < 100; i++) {
      const q = nextQuestion(state, 1);
      expect(q.expr).not.toBe('3+5');
    }
  });
});

describe('timeout（超时判定）', () => {
  test('一位数关卡超时时长为 5 秒', () => {
    const config = LEVELS.find(l => l.id === 1);
    expect(config.timeoutSec).toBe(5);
  });

  test('两位数关卡超时时长为 10 秒', () => {
    for (const id of [2, 3, 4, 5, 6]) {
      const config = LEVELS.find(l => l.id === id);
      expect(config.timeoutSec).toBe(10);
    }
  });

  test('超时未答 → 进入错集', () => {
    let state = makeState();
    state = markError(state, { expr: '3+5', wrong: null, reason: 'timeout' });
    expect(state.errorSets[1]).toContain('3+5');
    expect(state.mastery.questions['3+5'].status).toBe('pending');
    expect(state.mastery.questions['3+5'].timeoutCount).toBe(1);
  });

  test('错集中的题也参与超时', () => {
    let state = makeState();
    state.errorSets[1] = ['3+5'];
    state.mastery.questions['3+5'] = {
      status: 'pending', errorCount: 1, attempts: 1
    };
    // 出题时仍会触发 5 秒超时
    const q = nextQuestion(state, 1);
    expect(q.expr).toBe('3+5');
    // 模拟超时
    state = markError(state, { expr: '3+5', wrong: null, reason: 'timeout' });
    expect(state.mastery.questions['3+5'].errorCount).toBe(2);
  });

  test('家长可调超时时长', () => {
    const settings = { timeoutSecByType: { single: 8, double: 15 } };
    // 应用设置后，关卡 1 超时变为 8 秒
    // 关卡 2 超时变为 15 秒
  });
});
```

#### 干扰项生成（必测）

```js
// tests/options.test.js

describe('generateOptions', () => {
  test('返回 4 个不重复项', () => {
    const opts = generateOptions(8);
    expect(opts).toHaveLength(4);
    expect(new Set(opts).size).toBe(4);
  });

  test('包含正确答案', () => {
    for (let i = 0; i < 100; i++) {
      const correct = randInt(1, 100);
      const opts = generateOptions(correct);
      expect(opts).toContain(correct);
    }
  });

  test('所有项为非负整数', () => {
    for (let i = 0; i < 100; i++) {
      const correct = randInt(1, 100);
      const opts = generateOptions(correct);
      opts.forEach(o => {
        expect(o).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(o)).toBe(true);
      });
    }
  });
});
```

#### 数据迁移（必测）

```js
// tests/migrate.test.js

describe('migrate', () => {
  test('v1 → v2：recentQuestions 字段自动填充', () => {
    const oldData = { schemaVer: 1, levels: { 1: { unlocked: true } } };
    localStorage.setItem('hx.progress', JSON.stringify(oldData));
    migrateProgress(1);
    const newData = JSON.parse(localStorage.getItem('hx.progress'));
    expect(newData.schemaVer).toBe(2);
    expect(newData.levels[1].recentQuestions).toEqual([]);
  });

  test('未知版本不破坏数据', () => {
    const oldData = { schemaVer: 99 };
    localStorage.setItem('hx.profile', JSON.stringify(oldData));
    expect(() => migrateAll()).not.toThrow();
  });
});
```

#### 错题本容量控制

```js
// tests/errors.test.js

describe('errors', () => {
  test('超过 200 条时按时间淘汰', () => {
    const items = Array.from({ length: 250 }, (_, i) => ({
      id: `e${i}`, expr: `${i}+1`, answer: i+1,
      recordedAt: i, hitCount: 1, consecutiveCorrect: 0, removedAt: null
    }));
    const result = cleanupErrors({ items });
    expect(result.items).toHaveLength(200);
    expect(result.items[0].recordedAt).toBeGreaterThanOrEqual(50);
  });

  test('7 天内同算式去重', () => {
    const errors = { items: [{
      id: 'e1', expr: '3+5', answer: 8,
      recordedAt: Date.now() - 24 * 3600 * 1000, // 1 天前
      hitCount: 1, consecutiveCorrect: 0, removedAt: null
    }]};
    const after = recordError(errors, { expr: '3+5', answer: 8, levelId: 1 }, 7);
    expect(after.items).toHaveLength(1);
    expect(after.items[0].hitCount).toBe(2);
  });
});
```

---

## 三、手工测试清单

### 3.1 核心流程（精熟判定 + 超时版）

#### 关卡 1 一位数加法（5 秒超时）

- [ ] 进入关卡，看到第一题 `a + b = ?`（a、b ∈ [0,9]）
- [ ] 顶部显示"已掌握 0 道，待掌握 0 道"
- [ ] 倒计时进度条显示 5 秒
- [ ] 4 个选项含正确答案
- [ ] 点错 → 按钮抖动 + 红色 + 提示语"再看看哦~"
- [ ] 题目不变，可在剩余 3 个选项中继续选
- [ ] 选对 → 绿色高亮 + 上行音效 + "你掌握啦！"
- [ ] "已掌握 X + 1"，题目自动切换
- [ ] **错题自动进入错集**，下一题优先出错的题
- [ ] 错题答对 → 从错集移除
- [ ] **超时未答** → 该题进入错集 + "没关系的~"
- [ ] **错集空** → 通关动画 + 解锁第 2 关（无最小题数硬性要求）

#### 超时判定

- [ ] 1 位数关卡超时 5 秒
- [ ] 2 位数及以上超时 10 秒
- [ ] 倒计时进度条匀速缩减
- [ ] 剩 3 秒（1 位数剩 2 秒）进度条变黄 + 闪烁
- [ ] 剩 1 秒选项按钮轻微缩放
- [ ] 超时未答 → 进入错集（不指责）
- [ ] 错集中的题也参与超时判定
- [ ] 家长可调超时时长

#### 6 关卡完整通关

- [ ] 第 1 关：一位数加法，5 秒超时
- [ ] 第 2 关：两位数加法，10 秒超时
- [ ] 第 3 关：混合加减，10 秒超时
- [ ] 第 4 关：表内乘法，10 秒超时
- [ ] 第 5 关：表内除法，10 秒超时
- [ ] 第 6 关：综合运算，10 秒超时

#### 错集机制

- [ ] 错题进入错集
- [ ] 错集中的题优先级最高（必被优先抽取）
- [ ] 错题答对后从错集移除
- [ ] 错题答错仍在错集，错误次数 +1
- [ ] 同题连续错 5 次后进入冷却（5 分钟）
- [ ] 冷却期间该题不出现在题面
- [ ] 冷却结束后自动回到错集

#### 防挫败机制

- [ ] 同题连续错 5 次后进入 5 分钟冷却
- [ ] 冷却期间不会反复出现该题
- [ ] 冷却结束后自动回到错集等待重出

### 3.2 横竖屏

- [ ] 横屏：算式居中、选项 1×4、底部关卡栏 1 行
- [ ] 竖屏：算式居中、选项 2×2、底部关卡栏 2 行
- [ ] 旋转屏幕不丢失连击进度
- [ ] 旋转屏幕不丢失当前题目
- [ ] iPad mini（8.3 寸）布局不破

### 3.3 家长入口

- [ ] 主屏角落显示 ⚙️ 图标
- [ ] 连点 3 次（间隔 < 500ms）→ 进入家长面板
- [ ] 长按 2 秒 → 进入家长面板
- [ ] 不满足条件时，单纯点击无效果
- [ ] 8 岁孩子很难误入

### 3.4 家长面板

- [ ] 显示各关卡状态、连击、首次正确率
- [ ] 显示 7 天练习时长柱状图
- [ ] 显示错题本数量
- [ ] 修改关卡目标数：5\~20 范围内可选
- [ ] 锁定/解锁关卡生效
- [ ] 导出错题为文本格式
- [ ] 导出全部数据为 JSON
- [ ] 导入 JSON 还原数据
- [ ] 重置全部数据需二次确认 + 输入"删除"
- [ ] 重置后页面刷新，回到初始状态
- [ ] 音效/动效/字号开关生效

### 3.5 错题本

- [ ] 主线首次错题自动入错题本
- [ ] 错题本满 200 条后按时间淘汰
- [ ] 复习模式出题规则与主线一致
- [ ] 错题连续 3 次首次正确 → 从错题本移除
- [ ] 错题本空 → 显示鼓励语
- [ ] 按关卡筛选错题

### 3.6 计时挑战

- [ ] 仅已通关关卡显示入口
- [ ] 倒计时精度误差 ≤ 1 秒
- [ ] 答错立即换题（不可修正）
- [ ] 结束显示得分、正确率、最高纪录
- [ ] 突破最高分 → 成就触发

### 3.7 成就系统

- [ ] 通关第 1 关 → "初出茅庐"成就
- [ ] 通关第 6 关 → "口算达人"成就
- [ ] 任意关卡连续 15 次 → "一鼓作气"成就
- [ ] 累计首次正确 100 题 → "持之以恒"成就
- [ ] 成就弹出动画 + 音效
- [ ] 成就墙显示已解锁与未解锁
- [ ] 下一个目标提示正确

### 3.8 数据持久化

- [ ] 关闭页面再打开，进度保留
- [ ] 添加到主屏后从主屏启动，进度保留
- [ ] 横竖屏切换不丢数据
- [ ] 后台 5 分钟后回前台，进度保留
- [ ] 多个 tab 切换时数据同步
- [ ] 家长面板导出 JSON 可被解析

### 3.9 PWA

- [ ] 首次访问后断网仍可使用
- [ ] iPad Safari 添加到主屏
- [ ] 从主屏启动为全屏（无 Safari UI）
- [ ] 图标显示正确
- [ ] 启动屏显示（首屏背景色 + 图标）

### 3.10 无障碍

- [ ] 减弱动效模式下无动画
- [ ] 键盘 1\~4 可选对应选项
- [ ] 键盘 Tab 顺序合理
- [ ] 关闭音效后所有交互正常
- [ ] 色盲模拟下功能可用
- [ ] 字号"大"档布局不破

---

## 四、跨设备测试矩阵

### 4.1 设备

| 设备 | 屏幕 | 分辨率 | 优先级 |
|---|---|---|---|
| iPad Pro 12.9" | 12.9 寸 | 2732×2048 | P0 |
| iPad Air 10.9" | 10.9 寸 | 2360×1640 | P0 |
| iPad 第 9 代 10.2" | 10.2 寸 | 2160×1620 | P0 |
| iPad mini 8.3" | 8.3 寸 | 2266×1488 | P1 |
| iPhone 15 | 6.1 寸 | 2532×1170 | P2（可选） |

### 4.2 iPadOS 版本

| iPadOS | Safari | 优先级 |
|---|---|---|
| 17.x | Safari 17 | P0 |
| 16.x | Safari 16 | P1 |
| 15.x | Safari 15 | P1 |
| 14.x | Safari 14 | P2 |

### 4.3 浏览器

| 浏览器 | 优先级 |
|---|---|
| iPadOS Safari | P0 |
| iPadOS Chrome | P1 |
| Desktop Safari | P1（开发期） |
| Desktop Chrome | P1（开发期） |

---

## 五、性能基准

### 5.1 指标

| 指标 | 目标 | 测试方法 |
|---|---|---|
| FCP（首次内容渲染） | ≤ 1.5s | Lighthouse |
| LCP（最大内容渲染） | ≤ 2.5s | Lighthouse |
| TTI（可交互时间） | ≤ 2s | Lighthouse |
| 总传输大小 | ≤ 500KB | Lighthouse |
| 点击反馈延迟 | ≤ 100ms | 手工 / Performance API |
| 切关卡 | ≤ 200ms | 手工 |
| 单 HTML 体积 | ≤ 300KB | 文件大小 |

### 5.2 内存

| 场景 | 目标 |
|---|---|
| 主页常驻 | ≤ 30MB |
| 训练页 | ≤ 50MB |
| 计时挑战 | ≤ 50MB |
| 长时间使用 30 分钟 | ≤ 60MB（无明显泄漏） |

---

## 六、回归测试流程

每次发布前：

1. **跑单元测试**（npm test）：100% 通过
2. **手工核心流程**：关卡 1\~6 全部跑一遍通关
3. **横竖屏**：每关卡切换一次屏幕方向
4. **家长面板**：完整操作一遍（修改目标、导出、重置）
5. **错题本**：录入 5 道错题 → 复习 → 通过 3 次 → 移除
6. **PWA**：断网测试、清缓存测试
7. **Lighthouse**：跑分 ≥ 90

---

## 七、调试技巧

### 7.1 浏览器开发者工具

```js
// 控制台快捷命令
window.hxDebug.state()      // 查看完整状态
window.hxDebug.export()     // 导出 JSON
window.hxDebug.stats()      // localStorage 容量
window.hxDebug.reset()      // 重置（开发用）
```

### 7.2 Safari 远程调试

1. Mac Safari → 开发 → [iPad 名称] → [页面]
2. 可查看 Console、Network、Elements

### 7.3 iPad 现场调试

- 设置 → Safari → 高级 → 网页检查器 → 启用
- 通过 USB 连接 Mac 后调试

---

## 八、测试用例模板

每个手工测试用例应包含：

```markdown
### 用例编号：TC-XXX
**标题**：[一句话描述]
**前置条件**：[依赖的初始状态]
**步骤**：
1. ...
2. ...
3. ...
**预期结果**：[期望看到的状态]
**实际结果**：[ ]
**测试人**：[ ]
**日期**：[ ]
**通过**：[ ]
```

---

## 九、自动化测试建议

### 9.1 推荐工具链（可选）

```
vitest          # 单元测试（轻量、原生 ESM）
jsdom           # 浏览器环境模拟
@axe-core/playwright  # a11y 测试
playwright      # E2E（可选，仅当需要）
```

### 9.2 测试目录结构

```
tests/
├── unit/
│   ├── generator.test.js
│   ├── mastery.test.js
│   ├── options.test.js
│   ├── errors.test.js
│   └── migrate.test.js
├── integration/
│   ├── training-flow.test.js
│   └── parent-panel.test.js
└── a11y/
    └── axe.test.js
```

### 9.3 CI 集成（可选）

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm test
```

---

## 十、Bug 报告模板

发现 Bug 时：

```markdown
## Bug 描述
[一句话描述]

## 复现步骤
1. ...
2. ...

## 预期行为
[ ]

## 实际行为
[ ]

## 环境
- 设备：iPad 第 9 代
- iPadOS：17.4
- Safari：17.4
- 应用版本：v0.5.0
- 横竖屏：横屏

## 截图/录屏
[ ]

## 严重程度
- [ ] P0 阻塞（核心功能不可用）
- [ ] P1 严重（影响主要场景）
- [ ] P2 一般（边缘场景）
- [ ] P3 轻微（建议性）
```

---

## 十一、相关文档

- 架构：[ARCHITECTURE.md](./ARCHITECTURE.md)
- 关卡算法：[LEVELS.md](./LEVELS.md)
- 数据模型：[DATA-MODEL.md](./DATA-MODEL.md)
- 无障碍：[A11Y.md](./A11Y.md)