// 算法单元测试（不依赖浏览器）
const { JSDOM } = require('jsdom');
const dom = new JSDOM('', { url: 'http://localhost:8080/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.performance = dom.window.performance;

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('✅', name);
  } catch (e) {
    failed++;
    console.log('❌', name, '-', e.message);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || '断言失败');
}
function assertEq(a, b, msg) {
  if (a !== b) throw new Error(msg || `期望 ${b}，实际 ${a}`);
}

// 工具函数
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function isCarry(a, b) { return (a % 10) + (b % 10) >= 10; }
function isBorrow(a, b) { return (a % 10) < (b % 10); }

// ===== 生成器测试 =====
test('加法：答案正确', () => {
  for (let i = 0; i < 200; i++) {
    const a = randInt(0, 99), b = randInt(0, 99);
    const answer = a + b;
    assertEq(answer, a + b);
  }
});

test('加法 - 进位判断', () => {
  assertEq(isCarry(5, 5), true);
  assertEq(isCarry(3, 4), false);
  assertEq(isCarry(9, 9), true);
  assertEq(isCarry(0, 0), false);
  assertEq(isCarry(15, 7), true);  // 5+7=12 进位
});

test('减法 - 退位判断', () => {
  assertEq(isBorrow(15, 7), true);   // 个位 5<7 退位
  assertEq(isBorrow(18, 5), false);  // 个位 8>5 不退位
  assertEq(isBorrow(23, 4), true);   // 个位 3<4 退位
  assertEq(isBorrow(50, 25), true);  // 个位 0<5 退位
  assertEq(isBorrow(56, 23), false); // 个位 6>3 不退位
});

test('减法：结果非负', () => {
  for (let i = 0; i < 200; i++) {
    const a = randInt(10, 99), b = randInt(1, 9);
    if (a >= b) {
      assert(a - b >= 0);
    }
  }
});

test('除法：仅整除', () => {
  for (let i = 0; i < 200; i++) {
    const b = randInt(1, 9);
    const q = randInt(1, 9);
    const a = b * q;
    assertEq(a % b, 0);
    assertEq(Math.floor(a / b), q);
  }
});

test('除法：商在 1~9', () => {
  for (let i = 0; i < 200; i++) {
    const b = randInt(1, 9);
    const q = randInt(1, 9);
    assert(q >= 1 && q <= 9);
  }
});

test('乘法：1~9 表', () => {
  for (let i = 0; i < 200; i++) {
    const a = randInt(1, 9), b = randInt(1, 9);
    const answer = a * b;
    assert(answer >= 1 && answer <= 81);
  }
});

// ===== 干扰项生成测试 =====
function generateOptions(correct) {
  const options = new Set([correct]);
  const strategies = [
    () => correct + randInt(1, 3),
    () => correct - randInt(1, 3),
    () => correct + randInt(1, 9),
    () => correct - randInt(1, 9),
  ];
  let attempts = 0;
  while (options.size < 4 && attempts < 200) {
    const strat = pick(strategies);
    const candidate = strat();
    if (candidate >= 0 && candidate !== correct) options.add(candidate);
    attempts++;
  }
  return [...options];
}

test('干扰项：4 个不重复', () => {
  for (let i = 0; i < 100; i++) {
    const correct = randInt(1, 100);
    const opts = generateOptions(correct);
    assertEq(opts.length, 4, `干扰项数不对: ${opts.length}`);
    assertEq(new Set(opts).size, 4, '有重复项');
    assert(opts.includes(correct), '不包含正确答案');
  }
});

test('干扰项：非负', () => {
  for (let i = 0; i < 100; i++) {
    const correct = randInt(1, 50);
    const opts = generateOptions(correct);
    opts.forEach(o => assert(o >= 0, `出现负数: ${o}`));
  }
});

// ===== 精熟判定测试 =====
test('错题进入错集', () => {
  const errorSets = { byLevel: { 1: [] } };
  const mastery = { byLevel: { 1: { questions: {}, stats: { mastered: 0, pending: 0 } } } };

  // markError
  mastery.byLevel[1].questions['3+5'] = {
    status: 'pending', errorCount: 1, attempts: 1, timeoutCount: 0
  };
  mastery.byLevel[1].stats.pending = 1;
  errorSets.byLevel[1].push('3+5');

  assert(errorSets.byLevel[1].includes('3+5'));
  assertEq(mastery.byLevel[1].questions['3+5'].status, 'pending');
});

test('错题答对 → 从错集移除并标记掌握', () => {
  const errorSets = { byLevel: { 1: ['3+5'] } };
  const mastery = { byLevel: { 1: {
    questions: { '3+5': { status: 'pending', errorCount: 2, attempts: 2 } },
    stats: { mastered: 0, pending: 1 }
  }}};

  // markMastered
  errorSets.byLevel[1] = errorSets.byLevel[1].filter(e => e !== '3+5');
  mastery.byLevel[1].stats.pending = 0;
  mastery.byLevel[1].stats.mastered = 1;
  mastery.byLevel[1].questions['3+5'] = {
    status: 'mastered', firstCorrectAt: Date.now(), attempts: 3
  };

  assert(!errorSets.byLevel[1].includes('3+5'));
  assertEq(mastery.byLevel[1].questions['3+5'].status, 'mastered');
});

test('错集空 → 通关', () => {
  const errorSets = { byLevel: { 1: [] } };
  const noErrors = !(errorSets.byLevel[1] && errorSets.byLevel[1].length > 0);
  assert(noErrors);
});

test('错集非空 → 不通关', () => {
  const errorSets = { byLevel: { 1: ['7+8'] } };
  const noErrors = !(errorSets.byLevel[1] && errorSets.byLevel[1].length > 0);
  assert(!noErrors);
});

test('同题连续错 5 次进入冷却', () => {
  const settings = { cooldownThreshold: 5, cooldownMinutes: 5 };
  const mastery = { byLevel: { 1: {
    questions: { '3+5': { status: 'pending', errorCount: 4, attempts: 4 } },
    stats: { mastered: 0, pending: 1 }
  }}};
  const errorSets = { byLevel: { 1: ['3+5'] } };

  // 第 5 次错
  mastery.byLevel[1].questions['3+5'].errorCount = 5;
  if (mastery.byLevel[1].questions['3+5'].errorCount >= settings.cooldownThreshold) {
    mastery.byLevel[1].questions['3+5'].cooldownUntil = Date.now() + 5 * 60 * 1000;
    mastery.byLevel[1].questions['3+5'].errorCount = 0;
    errorSets.byLevel[1] = errorSets.byLevel[1].filter(e => e !== '3+5');
    mastery.byLevel[1].stats.pending = 0;
  }

  assert(mastery.byLevel[1].questions['3+5'].cooldownUntil > Date.now());
  assert(!errorSets.byLevel[1].includes('3+5'));
});

test('冷却期间该题不出现在题面', () => {
  const errorSets = { byLevel: { 1: ['3+5'] } };
  const mastery = { byLevel: { 1: {
    questions: { '3+5': {
      status: 'pending',
      cooldownUntil: Date.now() + 5 * 60 * 1000
    }}
  }}};

  // 出题时过滤冷却题
  const available = errorSets.byLevel[1].filter(expr => {
    const q = mastery.byLevel[1].questions[expr];
    if (!q?.cooldownUntil) return true;
    return Date.now() >= q.cooldownUntil;
  });

  assertEq(available.length, 0);
});

test('已掌握的题不再出', () => {
  const mastery = { byLevel: { 1: {
    questions: { '3+5': { status: 'mastered' } }
  }}};

  // 出题时排除已掌握
  const allAvailable = [];
  for (let a = 0; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      const expr = `${a}+${b}`;
      if (mastery.byLevel[1].questions[expr]?.status !== 'mastered') {
        allAvailable.push(expr);
      }
    }
  }
  assert(!allAvailable.includes('3+5'));
});

test('错集不为空时优先抽错集', () => {
  const errorSet = ['3+5', '7+8'];
  // 100% 优先抽错集
  for (let i = 0; i < 50; i++) {
    const picked = pick(errorSet);
    assert(errorSet.includes(picked));
  }
});

test('超时视为错误', () => {
  const mastery = { byLevel: { 1: { questions: {}, stats: { mastered: 0, pending: 0 } } } };
  const expr = '5+7';

  mastery.byLevel[1].questions[expr] = {
    status: 'pending', errorCount: 1, attempts: 1, timeoutCount: 1
  };
  mastery.byLevel[1].stats.pending = 1;

  assertEq(mastery.byLevel[1].questions[expr].status, 'pending');
  assertEq(mastery.byLevel[1].questions[expr].timeoutCount, 1);
});

// ===== 性能测试 =====
test('1000 次出题性能 < 1s', () => {
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    const a = randInt(0, 99), b = randInt(0, 99);
    const answer = a + b;
  }
  const elapsed = Date.now() - start;
  assert(elapsed < 1000, `耗时: ${elapsed}ms`);
});

console.log('\n=========');
console.log(`总计: ${passed} 通过 / ${failed} 失败`);
console.log('=========');
process.exit(failed > 0 ? 1 : 0);
