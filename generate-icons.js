// 生成应用图标（从 SVG 渲染为 PNG）
const fs = require('fs');
const path = require('path');

const sizes = [
  { name: 'icon-192', size: 192 },
  { name: 'icon-512', size: 512 },
  { name: 'apple-touch-icon', size: 180 },
];

function generateSVG(size) {
  const r = size * 0.2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5BA8E0"/>
      <stop offset="100%" stop-color="#7BD389"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>
  <text x="50%" y="42%" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif"
        font-size="${size * 0.16}" font-weight="700" fill="white" opacity="0.95">口算</text>
  <text x="50%" y="72%" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif"
        font-size="${size * 0.22}" font-weight="700" fill="white">3 + 5</text>
</svg>`;
}

async function main() {
  const iconsDir = path.join(__dirname, 'icons');

  // 生成 SVG 文件
  for (const { name, size } of sizes) {
    const svgPath = path.join(iconsDir, `${name}.svg`);
    const svgContent = generateSVG(size);
    fs.writeFileSync(svgPath, svgContent);
    console.log(`  ✅ ${name}.svg (${size}×${size})`);
  }

  // 尝试用 sharp 生成 PNG
  try {
    const sharp = require('sharp');
    console.log('');
    console.log('📦 sharp 已安装，生成 PNG...');

    for (const { name, size } of sizes) {
      const svgPath = path.join(iconsDir, `${name}.svg`);
      const pngPath = path.join(iconsDir, `${name}.png`);
      const svgBuffer = fs.readFileSync(svgPath);

      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(pngPath);

      console.log(`  ✅ ${name}.png (${size}×${size})`);
    }
    console.log('');
    console.log('🎉 所有 PNG 图标已生成到 icons/');
  } catch (e) {
    console.log('');
    console.log('⚠️  sharp 未安装，仅生成了 SVG 图标。');
    console.log('   如需生成 PNG，请执行: npm install sharp');
    console.log('   或使用在线工具 https://realfavicongenerator.net 转换');
    console.log('');
    console.log('   目前 SVG 图标已就绪，现代浏览器和 iOS Safari 均支持 SVG 作为应用图标。');
  }

  console.log('');
  console.log('📁 icons/ 目录文件列表:');
  fs.readdirSync(iconsDir).forEach(f => console.log(`   ${f}`));
}

main().catch(err => {
  console.error('❌ 生成失败:', err.message);
  process.exit(1);
});
