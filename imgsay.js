// imgsay.js
// Generates an image with user-provided text using DejaVu Serif font
const { createCanvas, registerFont } = require('canvas');
const path = require('path');

registerFont(path.join(__dirname, 'fonts', 'DejaVuSerif-Italic.ttf'), { family: 'DejaVu Serif' });

function generateTextImage(text, options = {}) {
  const width = options.width || 700;
  const height = options.height || 200;
  const bgColor = options.bgColor || '#23272A';
  const fontSize = options.fontSize || 40;
  const fontColor = options.fontColor || '#fff';

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Text
  ctx.font = `italic ${fontSize}px "DejaVu Serif"`;
  ctx.fillStyle = fontColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Support multi-line text
  const lines = String(text).split(/\r?\n/);
  const lineHeight = fontSize * 1.2;
  const totalHeight = lines.length * lineHeight;
  const startY = (height - totalHeight) / 2 + lineHeight / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + i * lineHeight);
  });

  return canvas.toBuffer();
}

module.exports = { generateTextImage };