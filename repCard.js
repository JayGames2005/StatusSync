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

  // Background with rounded corners
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

  // Draw avatar with border
  try {
    const avatar = await loadImage(avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 120, 70, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 30, 50, 140, 140);
    ctx.restore();
    // Avatar border
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 120, 70, 0, Math.PI * 2, true);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.restore();
  } catch (e) {
    // Avatar failed to load
  }

  // Display name
  ctx.font = 'bold 36px "Segoe UI", Sans';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(displayName, 200, 80);

  // Rep
  ctx.font = 'bold 28px "Segoe UI", Sans';
  ctx.fillStyle = '#00bfff';
  ctx.fillText(`Rep: ${rep}`, 200, 120);

  // Rank
  ctx.font = '24px "Segoe UI", Sans';
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`Rank: #${rank}`, 200, 155);

  // Level
  ctx.font = '24px "Segoe UI", Sans';
  ctx.fillStyle = '#9b59b6';
  ctx.fillText(`Level: ${level}`, 340, 155);

  // XP
  ctx.font = '22px "Segoe UI", Sans';
  ctx.fillStyle = '#fff';
  ctx.fillText(`XP: ${xp} / ${xpNeeded}`, 200, 190);

  // Progress bar background
  ctx.fillStyle = '#444';
  ctx.roundRect(200, 200, 400, 20, 10);
  ctx.fill();
  // Progress bar fill
  ctx.fillStyle = '#00bfff';
  ctx.roundRect(200, 200, Math.max(0, Math.min(1, xp / xpNeeded)) * 400, 20, 10);
  ctx.fill();

  // XP percent text
  ctx.font = '18px "Segoe UI", Sans';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor((xp / xpNeeded) * 100)}%`, 590, 215);

  return canvas.toBuffer();
}

module.exports = { generateRepCard };