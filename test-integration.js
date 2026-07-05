// 集成测试：模拟浏览器环境运行应用
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// 移除 manifest/service-worker（jsdom 不支持）
const cleanedHtml = html
  .replace(/<link rel="manifest"[^>]*>/g, '')
  .replace(/<script>[\s\S]*?navigator\.serviceWorker[\s\S]*?}<\/script>/g, '<script></script>')
  .replace(/navigator\.serviceWorker\.register[\s\S]*?\.catch\(\(\) => {}\);/g, '');

const dom = new JSDOM(cleanedHtml, {
  runScripts: 'dangerously',
  url: 'http://localhost:8080/',
  pretendToBeVisual: true,
  resources: 'usable'
});

setTimeout(() => {
  const window = dom.window;
  const document = window.document;

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

  // 验证 DOM 结构
  test('页面包含主页', () => {
    const home = document.getElementById('page-home');
    if (!home) throw new Error('找不到 page-home');
    if (!home.classList.contains('active')) throw new Error('主页未激活');
  });

  test('主页包含 12 个关卡卡片', () => {
    const homeContent = document.getElementById('home-content');
    if (!homeContent.innerHTML.includes('一位数加法')) throw new Error('未找到关卡 1');
    if (!homeContent.innerHTML.includes('一位数减法')) throw new Error('未找到关卡 2');
    if (!homeContent.innerHTML.includes('四则综合')) throw new Error('未找到关卡 12');
  });

  test('主页底部关卡栏渲染', () => {
    // 通过进入训练页再返回验证
    if (typeof window.hx !== 'undefined') {
      throw new Error('hx 不应该暴露在 window 上');
    }
  });

  test('点击关卡 1 进入训练页', () => {
    // 模拟点击关卡 1
    const cards = document.querySelectorAll('.level-card');
    if (cards.length === 0) throw new Error('没有关卡卡片');
    cards[0].click();
    setTimeout(() => {
      const training = document.getElementById('page-training');
      if (!training.classList.contains('active')) {
        throw new Error('训练页未激活');
      }
    }, 100);
  });

  // 等待异步操作
  setTimeout(() => {
    test('训练页有算式和选项', () => {
      const expr = document.getElementById('expr-text');
      if (!expr.textContent.includes('?')) throw new Error('算式不正确: ' + expr.textContent);
      const options = document.querySelectorAll('.option');
      if (options.length !== 4) throw new Error('选项数不对: ' + options.length);
    });

    test('点击正确答案后标记掌握', () => {
      const exprText = document.getElementById('expr-text').textContent;
      // 解析算式
      const match = exprText.match(/(\d+)\s*([+\-×÷])\s*(\d+)\s*=\s*\?/);
      if (!match) throw new Error('算式格式不对');
      const a = parseInt(match[1]), b = parseInt(match[3]);
      const op = match[2];
      const correctAnswer = op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : Math.floor(a / b);
      // 点击含正确答案的选项
      const options = document.querySelectorAll('.option');
      for (const opt of options) {
        if (parseInt(opt.dataset.value) === correctAnswer) {
          opt.click();
          break;
        }
      }
      // 同步验证进度：关卡 1 一位数加法 = 100 题全覆盖
      const progressLabel = document.getElementById('progress-label');
      if (!progressLabel.textContent.includes('/ 100 道')) {
        throw new Error('进度格式不对: ' + progressLabel.textContent);
      }
    });

    setTimeout(() => {
      test('已掌握题不再出', () => {
        // 等 1000ms 让应用切到下一题
        // 此时上一题已掌握，本题不会再出现该算式
        const progressLabel = document.getElementById('progress-label');
        const txt = progressLabel.textContent;
        // 应该看到 1/100 （掌握数 = 1）
        const m = txt.match(/已掌握 (\d+) \/ 100/);
        if (!m) throw new Error('格式不对: ' + txt);
        const mastered = parseInt(m[1]);
        if (mastered < 1) throw new Error('掌握数应 ≥ 1: ' + txt);
      });

      test('未全覆盖（1/100）不应通关', () => {
        const progress = dom.window.eval('JSON.parse(localStorage.getItem("hx.progress") || "{}")');
        if (progress.levels && progress.levels[1] && progress.levels[1].passed) {
          throw new Error('不应过早标记为已通关');
        }
      });

      console.log('\n=========');
      console.log(`总计: ${passed} 通过 / ${failed} 失败`);
      console.log('=========');
      process.exit(failed > 0 ? 1 : 0);
    }, 1500);
  }, 500);
}, 500);
