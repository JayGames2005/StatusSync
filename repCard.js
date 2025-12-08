// repCard.js
// Generates a rep card image using node-canvas
const { createCanvas, loadImage } = require('canvas');

async function generateRepCard({
  displayName,
  avatarURL,
  rep,
  rank = 1,
  level = 1,
  xp = 0,
  xpNeeded = 100,
  bgColor = '#23272A'
}) {
  const width = 700;
  const height = 240;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Draw background first
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(width - 20, 0);
  ctx.quadraticCurveTo(width, 0, width, 20);
  ctx.lineTo(width, height - 20);
  ctx.quadraticCurveTo(width, height, width - 20, height);
  ctx.lineTo(20, height);
  ctx.quadraticCurveTo(0, height, 0, height - 20);
  ctx.lineTo(0, 20);
  ctx.quadraticCurveTo(0, 0, 20, 0);
  ctx.closePath();
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.restore();

  // Draw avatar with border (original working logic)
  try {
    const avatar = await loadImage(avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 120, 64, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 36, 56, 128, 128);
    ctx.restore();
    // Avatar border
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 120, 64, 0, Math.PI * 2, true);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.restore();
  } catch (e) {
    // Avatar failed to load
  }

  // Display name (top left)
  ctx.font = 'bold 32px "Segoe UI", Sans';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(displayName, 200, 60);

  // Rep (top right)
  ctx.font = 'bold 28px "Segoe UI", Sans';
  ctx.fillStyle = '#00bfff';
  ctx.textAlign = 'right';
  ctx.fillText(`Rep: ${rep}`, 670, 60);

  // Level and Rank (below name)
  ctx.font = '24px "Segoe UI", Sans';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'left';
  ctx.fillText(`Level: ${level}`, 200, 100);
  ctx.fillStyle = '#9b59b6';
  ctx.fillText(`Rank: #${rank}`, 350, 100);

  // XP (above bar, left)
  ctx.font = '22px "Segoe UI", Sans';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(`XP: ${xp} / ${xpNeeded}`, 200, 150);

  // Progress bar background
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.moveTo(200, 170);
  ctx.lineTo(590, 170);
  ctx.quadraticCurveTo(600, 170, 600, 180);
  ctx.lineTo(600, 200);
  ctx.quadraticCurveTo(600, 210, 590, 210);
  ctx.lineTo(200, 210);
  ctx.quadraticCurveTo(190, 210, 190, 200);
  ctx.lineTo(190, 180);
  ctx.quadraticCurveTo(190, 170, 200, 170);
  ctx.closePath();
  ctx.fill();
  // Progress bar fill
  ctx.fillStyle = '#00bfff';
  const barWidth = Math.max(0, Math.min(1, xp / xpNeeded)) * 400;
  ctx.beginPath();
  ctx.moveTo(200, 170);
  ctx.lineTo(200 + barWidth, 170);
  ctx.quadraticCurveTo(200 + barWidth + 10, 170, 200 + barWidth + 10, 180);
  ctx.lineTo(200 + barWidth + 10, 200);
  ctx.quadraticCurveTo(200 + barWidth + 10, 210, 200 + barWidth, 210);
  ctx.lineTo(200, 210);
  ctx.quadraticCurveTo(190, 210, 190, 200);
  ctx.lineTo(190, 180);
  ctx.quadraticCurveTo(190, 170, 200, 170);
  ctx.closePath();
  ctx.fill();

  // XP percent text (inside bar, right)
  ctx.font = '18px "Segoe UI", Sans';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor((xp / xpNeeded) * 100)}%`, 590, 195);

  return canvas.toBuffer();
}

module.exports = { generateRepCard };