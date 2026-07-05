# 关卡与精熟算法（LEVELS）

> 6 关卡递进体系 + 严格按教学大纲分类的题库生成器 + 精熟判定算法 + 错集机制

---

## 一、设计哲学：精熟判定 + 超时全覆盖

**核心信念**：不是"做对 N 题就过关"，而是"**每一道需要掌握的题都被掌握**才算过关"。同时**任何题都不能卡住**——全题限时作答。

### 1.1 三种题状态

| 状态 | 含义 | 持久化 |
|---|---|---|
| `unseen` | 该题从未抽到过 | ❌（仅内存） |
| `pending` | 待掌握（在错集中，等待重出） | ✅ |
| `mastered` | 已掌握 | ✅ |

### 1.2 状态转换

```
未出现 ──[抽到+首次正确]──► 已掌握 ✓
   │
   └────────[抽到+首次错误/超时]──► 待掌握 ──[重出+首次正确]──► 已掌握 ✓
                                          │
                                          └────[重出+首次错误/超时]──► 仍待掌握（errorCount++）
```

> **超时视为错误**：超时未答等同于答错，该题进入错集等待重做。

### 1.3 通关条件

关卡通关 = **两个条件同时满足**：

1. ✅ **当前错集为空**（没有 pending 题）
2. ✅ **当前 session 内所有抽到的题都已掌握**

> **不设最小掌握集合硬性要求**。孩子做了多少题就掌握多少题，错题全部清除即通关。

---

## 二、6 关卡配置

| ID | 名称 | 内容 | 操作数范围 | 默认超时 | 解锁条件 |
|---|---|---|---|---|---|
| 1 | 一位数加法 | 0\~9 + 0\~9 | 全表 100 题 | **5 秒** | 默认 |
| 2 | 两位数加法 | 10\~99 + 10\~99 | 全表 | **10 秒** | 第 1 关通过 |
| 3 | 混合加减 | 两位数 ± 一位数 | 全表 | **10 秒** | 第 2 关通过 |
| 4 | 表内乘法 | 1\~9 × 1\~9 | 81 题 | **10 秒** | 第 3 关通过 |
| 5 | 表内除法 | 整除，商 1\~9 | 81 题 | **10 秒** | 第 4 关通过 |
| 6 | 综合运算 | + - × ÷ 混合 | 各关卡并集 | **10 秒** | 第 5 关通过 |

**超时规则**：

- 一位数关卡（关卡 1）：**5 秒**
- 两位数及以上（关卡 2\~6）：**10 秒**
- 家长可调：1 位数 3\~10 秒 / 2 位数 5\~30 秒

**已解锁关卡可随时回退练习**，进度独立保存。

---

## 三、关卡完整配置

### 3.1 Schema

```js
{
  id: 1,
  name: "一位数加法",
  icon: "🍎",
  desc: "10 以内的加法",
  operators: ['+'],
  range: {
    a: [0, 9],
    b: [0, 9]
  },
  filter: {
    type: 'mixed'        // 'carry' | 'noCarry' | 'mixed'
  },
  timeoutSec: 5,         // 超时时长（秒）：一位数 5 秒
  cooldownThreshold: 5,  // 同题连续错 N 次进入冷却
  cooldownMinutes: 5     // 冷却时长
}
```

### 3.2 关卡 1：一位数加法（5 秒超时）

```js
{
  id: 1, name: "一位数加法", icon: "🍎",
  desc: "10 以内的加法",
  operators: ['+'],
  range: { a: [0, 9], b: [0, 9] },
  filter: { type: 'mixed' },
  timeoutSec: 5          // 一位数 5 秒
}
```

### 3.3 关卡 2：两位数加法（10 秒超时）

```js
{
  id: 2, name: "两位数加法", icon: "🌳",
  desc: "100 以内加法",
  operators: ['+'],
  range: { a: [10, 99], b: [10, 99] },
  filter: { type: 'mixed' },
  timeoutSec: 10         // 两位数 10 秒
}
```

### 3.4 关卡 3：混合加减（10 秒超时）

```js
{
  id: 3, name: "混合加减", icon: "🎈",
  desc: "两位数与一位数加减",
  operators: ['+', '-'],
  range: {
    add: { a: [10, 99], b: [1, 9] },
    sub: { a: [10, 99], b: [1, 9] }
  },
  weights: { '+': 0.5, '-': 0.5 },
  filter: { type: 'mixed' },
  timeoutSec: 10
}
```

### 3.5 关卡 4：表内乘法（10 秒超时）

```js
{
  id: 4, name: "表内乘法", icon: "🎲",
  desc: "1~9 乘法表",
  operators: ['×'],
  range: { a: [1, 9], b: [1, 9] },
  filter: { type: 'mixed' },
  timeoutSec: 10
}
```

### 3.6 关卡 5：表内除法（10 秒超时）

```js
{
  id: 5, name: "表内除法", icon: "🍰",
  desc: "整除（商 1~9）",
  operators: ['÷'],
  range: { a: [1, 81], b: [1, 9] },
  filter: { type: 'exact' },
  timeoutSec: 10
}
```

### 3.7 关卡 6：综合运算（10 秒超时）

```js
{
  id: 6, name: "综合运算", icon: "🌟",
  desc: "加减乘除混合",
  operators: ['+', '-', '×', '÷'],
  weights: { '+': 0.3, '-': 0.3, '×': 0.2, '÷': 0.2 },
  timeoutSec: 10
}
```

---

## 四、出题算法（精熟判定核心）

### 4.1 三优先级抽题

```js
function nextQuestion(levelId) {
  const mastery = store.get('hx.mastery').byLevel[levelId];
  const errorSet = store.get('hx.errorSets').byLevel[levelId] || [];
  const config = LEVELS.find(l => l.id === levelId);

  // 优先级 1：错集（待掌握题）
  const pendingFiltered = errorSet
    .filter(expr => !isInCooldown(expr, mastery))
    .filter(expr => !recentlyShown(expr, mastery));

  if (pendingFiltered.length > 0) {
    const expr = pickRandom(pendingFiltered);
    return makeQuestionFromExpr(expr, config);
  }

  // 优先级 2：未覆盖过的题（保证题库覆盖）
  const unseen = getUnseenQuestions(config, mastery);
  if (unseen.length > 0) {
    return pickRandom(unseen);
  }

  // 优先级 3：从全部题库随机（这种题会自动进入错集被优先重出）
  return generateRandomAvoidingRecent(config, mastery);
}
```

### 4.2 关键：错集优先级的保障

**任何时候，错集中的题都比新题优先**。这是精熟判定的核心保证：

- 孩子错一道题 → 进入错集 → 100% 会在下一次出题时优先抽到
- 答对 → 从错集移除
- 答错 → 继续在错集，且 `errorCount++`
- 超时未答 → 同上，进入错集

### 4.3 防挫败：冷却机制

```js
function isInCooldown(expr, mastery) {
  const q = mastery.questions[expr];
  if (!q?.cooldownUntil) return false;
  return Date.now() < q.cooldownUntil;
}

function enterCooldown(levelId, expr) {
  const mastery = store.get('hx.mastery');
  const settings = store.get('hx.settings');
  const q = mastery.byLevel[levelId].questions[expr];

  q.cooldownUntil = Date.now() + settings.cooldownMinutes * 60 * 1000;
  q.errorCount = 0;  // 重置错误计数

  // 临时从错集移除（仅错集层面，不删除题）
  removeFromErrorSet(levelId, expr);

  store.set('hx.mastery', mastery);

  // 冷却结束后自动重新加入错集
  setTimeout(() => addToErrorSet(levelId, expr),
             settings.cooldownMinutes * 60 * 1000);
}
```

**触发条件**：同题连续错 `cooldownThreshold` 次（默认 5 次）。

**冷却期间**：该题不出现在题面，但冷却结束后会自动回到错集。

### 4.4 超时判定（全题统一覆盖）

```js
let timeoutTimer = null;
let timeoutStartTime = 0;

function onShowQuestion(question) {
  const settings = store.get('hx.settings');
  const config = LEVELS.find(l => l.id === state.currentLevelId);
  const timeoutSec = config.timeoutSec;

  timeoutStartTime = Date.now();

  // 倒计时提示：剩 N 秒时选项按钮闪烁
  const warnMs = (timeoutSec - settings.timeoutWarnSec) * 1000;
  setTimeout(() => flashOptions(), warnMs);

  // 超时判定
  clearTimeout(timeoutTimer);
  timeoutTimer = setTimeout(() => {
    // 超时未答 → 视为错误
    markError(state.currentLevelId, question.expr, null);
    showFeedback({ type: 'timeout', message: '没关系的，下次再来~' });
    scheduleNextQuestion(1000);
  }, timeoutSec * 1000);
}

function onOptionClick(optId, question) {
  clearTimeout(timeoutTimer);  // 一旦作答，取消超时
  // ...正常判定
}
```

**超时参数**：

| 关卡类型 | 超时时长 | 倒计时提示 |
|---|---|---|
| 1 位数（关卡 1） | 5 秒 | 剩 2 秒时闪烁 |
| 2 位数及以上（关卡 2\~6） | 10 秒 | 剩 3 秒时闪烁 |

**家长可调**（家长面板）：

- 1 位数：3 / 5 / 8 / 10 秒
- 2 位数：5 / 10 / 15 / 30 秒

### 4.5 倒计时 UI 提示

```js
function flashOptions() {
  // 剩余秒数内持续闪烁
  const interval = setInterval(() => {
    document.querySelectorAll('.option').forEach(opt => {
      opt.classList.toggle('timeout-warn');
    });
  }, 300);

  // 倒计时结束后清除闪烁
  setTimeout(() => {
    clearInterval(interval);
    document.querySelectorAll('.option').forEach(opt => {
      opt.classList.remove('timeout-warn');
    });
  }, settings.timeoutWarnSec * 1000);
}
```

```css
.option.timeout-warn {
  border-color: #FFC857;
  background: #FFF8E5;
  animation: pulse 0.6s ease infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}
```

---

## 五、错集机制详解

### 5.1 数据结构

错集 = `hx.errorSets.byLevel[levelId] = string[]`（待掌握的算式列表）

### 5.2 操作流程

```
孩子答错题 X
   │
   ├──► markError(levelId, X)
   │
   │   ┌─── X.status == 'pending'（已在错集）
   │   │     → errorCount++
   │   │     → cooldownThreshold 触发时进入冷却
   │   │
   │   └─── X.status == 'mastered' 或 unseen
   │         → X.status = 'pending'
   │         → 加入错集
   │
   ▼
题目继续展示（孩子可重选）
   │
   ▼
孩子答对 X
   │
   ├──► markMastered(levelId, X)
   │
   │   ┌─── X.status == 'pending'
   │   │     → X.status = 'mastered'
   │   │     → 从错集移除
   │   │     → 写入 hx.errors（含 removedAt）
   │   │     → 检查关卡通关条件
   │   │
   │   └─── X.status == 'unseen' / 已 mastered
   │         → 仅记录首次正确
   │
   ▼
进入下一题（nextQuestion 优先抽错集）
```

### 5.3 错集与错题本的关系

| 数据 | 含义 | 持久化 |
|---|---|---|
| `hx.errorSets` | **当前**待掌握题（活跃错集） | ✅ 必存 |
| `hx.errors` | **历史**错题全量（含已通过的） | ✅ 可清理（LRU 200 条） |

- 错集里的题**答对后从错集移除**，但**保留在错题本历史**中（家长可看）
- 错题本清理仅影响历史，不影响当前错集

---

## 六、通关判定算法（简化版）

```js
function checkLevelPassed(levelId) {
  const mastery = store.get('hx.mastery').byLevel[levelId];
  const errorSet = store.get('hx.errorSets').byLevel[levelId] || [];

  // 条件 1：错集为空
  const noErrors = errorSet.length === 0;

  // 条件 2：当前 session 所有抽到的题都已掌握
  // 这由 nextQuestion 流程保证：错集空才会抽新题，新题答错必进错集

  return noErrors;
}
```

> **简化要点**：去掉了"最小掌握集合"硬性要求。错集空 + session 流程自动保证 = 通关。孩子实际做多少题就掌握多少题。

### 6.1 通关动画触发

```js
function onPassLevel(levelId) {
  pause();
  showCelebration(levelId);          // 全屏庆祝动画
  unlockNextLevel(levelId + 1);
  triggerAchievement(`level_${levelId}_pass`);
  showUnlockedToast(levelId + 1);    // "已解锁下一关"
  onDismiss() {
    route.home();
  }
}
```

---

## 七、错题本业务（历史记录）

### 7.1 录入（错误发生时）

```js
function recordErrorOccurred(levelId, expr, wrongFirst) {
  const errors = store.get('hx.errors');
  const master = errors.items.find(
    e => e.expr === expr && !e.removedAt &&
         (Date.now() - e.recordedAt) < 7 * 24 * 3600 * 1000
  );

  if (master) {
    master.hitCount += 1;
    master.wrongFirst = wrongFirst;
  } else {
    errors.items.push({
      id: `err_${Date.now()}_${randInt(100, 999)}`,
      levelId,
      expr,
      answer: evalExpr(expr),
      wrongFirst,
      recordedAt: Date.now(),
      hitCount: 1,
      removedAt: null,
      totalAttempts: 1
    });
  }

  // 容量控制
  if (errors.items.length > 200) {
    errors.items.sort((a, b) => a.recordedAt - b.recordedAt);
    errors.items = errors.items.slice(errors.items.length - 200);
  }

  store.set('hx.errors', errors);
}
```

### 7.2 移除（答对时）

```js
function recordErrorMastered(levelId, expr) {
  const errors = store.get('hx.errors');
  const master = errors.items.find(
    e => e.expr === expr && !e.removedAt && e.levelId === levelId
  );
  if (master) {
    master.removedAt = Date.now();  // 不删除，标记时间
    master.totalAttempts = (master.totalAttempts || 1) + 1;
  }
  store.set('hx.errors', errors);
}
```

### 7.3 错题本界面

家长面板展示"历史错题"列表，包括：

- 当前错集（活跃）
- 已通过的历史错题（带 ✓ 标记）
- 错误次数（hitCount）

---

## 八、计时挑战算法

计时挑战是独立模式，**不复用主线精熟判定**。

### 8.1 规则

```js
function startChallenge(level, durationSec = 60) {
  state.challenge = {
    level,
    startTime: performance.now(),
    duration: durationSec * 1000,
    score: 0,
    attempts: 0,
    firstCorrect: 0
  };
  nextChallengeQuestion();
}

function onChallengeAnswer(option, question) {
  state.challenge.attempts += 1;
  if (option === question.answer) {
    state.challenge.score += 1;
    state.challenge.firstCorrect += 1;
    playCorrectCue();
  } else {
    playWrongCue();
    // 答错立即换题（不重选，不入错集）
  }
  nextChallengeQuestion();  // 答错也立即换题
}
```

**注**：挑战模式不涉及错集，错题仅记入统计，不影响主线。

---

## 九、成就规则（精熟判定版）

| ID | 分类 | 条件 | 标题 |
|---|---|---|---|
| `level_1_pass` | progress | 第 1 关通过 | 初出茅庐 |
| `level_3_pass` | progress | 第 3 关通过 | 渐入佳境 |
| `level_6_pass` | progress | 第 6 关通过 | 口算达人 |
| `mastery_10` | mastery | 累计掌握 10 道不同的题 | 小有所成 |
| `mastery_50` | mastery | 累计掌握 50 道不同的题 | 融会贯通 |
| `mastery_100` | mastery | 累计掌握 100 道不同的题 | 触类旁通 |
| `error_clear_10` | mastery | 累计清除 10 道错题 | 知错能改 |
| `error_clear_50` | mastery | 累计清除 50 道错题 | 精益求精 |
| `effort_100` | effort | 累计作答 100 次 | 持之以恒 |
| `effort_500` | effort | 累计作答 500 次 | 千锤百炼 |
| `challenge_first` | challenge | 完成首次计时挑战 | 初试身手 |
| `challenge_break_record` | challenge | 计时挑战打破自己纪录 | 自我超越 |

**判定时机**：每次状态变更后扫描所有规则。

---

## 十、家长可调参数

| 参数 | 默认 | 范围 | 说明 |
|---|---|---|---|
| `timeoutSecByType.single` | 5 | 3 / 5 / 8 / 10 | 一位数关卡超时（秒） |
| `timeoutSecByType.double` | 10 | 5 / 10 / 15 / 30 | 两位数及以上超时（秒） |
| `timeoutWarnSec` | 3 | 2 / 3 / 5 | 倒计时提示阈值（剩 N 秒闪烁） |
| `cooldownThreshold` | 5 | 3 / 5 / 10 | 同题连续错几次进入冷却 |
| `cooldownMinutes` | 5 | 1 / 5 / 10 | 冷却时长（分钟） |
| `challengeDurationSec` | 60 | 30 / 60 / 90 | 计时挑战时长 |
| `correctDelayMs` | 1000 | 800\~1500 | 答对后停顿 |
| `sound` | true | true / false | 音效 |
| `motion` | true | true / false | 动效 |
| `fontSize` | normal | small / normal / large | 字号 |

---

## 十一、单元测试要点

### 11.1 出题优先级

```js
test('错集不为空时优先抽错集', () => {
  state.errorSets[1] = ['3+5', '7+8'];
  state.mastery.questions['3+5'] = {
    status: 'pending', errorCount: 1, attempts: 1
  };
  state.mastery.questions['7+8'] = {
    status: 'pending', errorCount: 1, attempts: 1
  };
  for (let i = 0; i < 100; i++) {
    const q = nextQuestion(1);
    expect(['3+5', '7+8']).toContain(q.expr);
  }
});

test('错集为空时抽未覆盖题', () => {
  state.errorSets[1] = [];
  state.mastery.questions = {};
  for (let i = 0; i < 100; i++) {
    const q = nextQuestion(1);
    expect(state.mastery.questions[q.expr]?.status).not.toBe('mastered');
  }
});
```

### 11.2 错集进入与移除

```js
test('答错 → 加入错集', () => {
  state.mastery.questions['3+5'] = undefined;
  markError(1, '3+5', 7);
  expect(state.errorSets[1]).toContain('3+5');
  expect(state.mastery.questions['3+5'].status).toBe('pending');
});

test('错集题答对 → 从错集移除并标记掌握', () => {
  state.errorSets[1] = ['3+5'];
  state.mastery.questions['3+5'] = {
    status: 'pending', errorCount: 2, attempts: 2
  };
  markMastered(1, '3+5');
  expect(state.errorSets[1]).not.toContain('3+5');
  expect(state.mastery.questions['3+5'].status).toBe('mastered');
});
```

### 11.3 冷却机制

```js
test('同题连续错 5 次后进入冷却', () => {
  state.mastery.questions['3+5'] = {
    status: 'pending', errorCount: 4, attempts: 4
  };
  markError(1, '3+5', 7);  // 第 5 次错
  expect(state.mastery.questions['3+5'].cooldownUntil).toBeDefined();
  expect(state.errorSets[1]).not.toContain('3+5');  // 临时移除
});

test('冷却期间该题不出现在题面', () => {
  state.mastery.questions['3+5'] = {
    status: 'pending',
    cooldownUntil: Date.now() + 5 * 60 * 1000
  };
  for (let i = 0; i < 100; i++) {
    const q = nextQuestion(1);
    expect(q.expr).not.toBe('3+5');
  }
});
```

### 11.4 超时判定（全题覆盖）

```js
test('一位数关卡超时时长为 5 秒', () => {
  const config = LEVELS.find(l => l.id === 1);
  expect(config.timeoutSec).toBe(5);
});

test('两位数关卡超时时长为 10 秒', () => {
  const config = LEVELS.find(l => l.id === 2);
  expect(config.timeoutSec).toBe(10);
});

test('超时未答 → 进入错集', () => {
  state.mastery.questions['3+5'] = undefined;
  markError(1, '3+5', null);  // null 表示超时
  expect(state.errorSets[1]).toContain('3+5');
  expect(state.mastery.questions['3+5'].status).toBe('pending');
  expect(state.mastery.questions['3+5'].timeoutCount).toBe(1);
});

test('错集中的题仍参与超时', () => {
  state.errorSets[1] = ['3+5'];
  state.mastery.questions['3+5'] = {
    status: 'pending', errorCount: 1, attempts: 1
  };
  // 出题时仍会触发 5 秒超时
  const q = nextQuestion(1);
  expect(q.expr).toBe('3+5');
  // 模拟超时
  markError(1, '3+5', null);
  expect(state.mastery.questions['3+5'].errorCount).toBe(2);  // 错集内又错一次
});
```

### 11.5 通关判定（简化）

```js
test('错集空 → 通关', () => {
  // 假设孩子做对了所有出现的题
  state.mastery.questions = {
    '0+0': { status: 'mastered' },
    '0+1': { status: 'mastered' },
    '1+0': { status: 'mastered' }
  };
  state.errorSets[1] = [];
  expect(checkLevelPassed(1)).toBe(true);
});

test('错集非空 → 不通关', () => {
  state.mastery.questions = {
    '0+0': { status: 'mastered' },
    '0+1': { status: 'mastered' }
  };
  state.errorSets[1] = ['7+8'];
  expect(checkLevelPassed(1)).toBe(false);
});

test('没有最小题数限制', () => {
  // 即使只掌握 1 道题，错集空也算通关
  state.mastery.questions = { '0+0': { status: 'mastered' } };
  state.errorSets[1] = [];
  expect(checkLevelPassed(1)).toBe(true);
});
```

---

## 十二、相关文档

- 数据模型：[DATA-MODEL.md](./DATA-MODEL.md)
- 架构：[ARCHITECTURE.md](./ARCHITECTURE.md)
- 界面：[UI-SPEC.md](./UI-SPEC.md)
- 测试：[TESTING.md](./TESTING.md)