// repCard.js
// Generates a rep card image using node-canvas
const { createCanvas, loadImage, registerFont } = require('canvas');
registerFont(__dirname + '/fonts/DejaVuSans.ttf', { family: 'DejaVuSans' });

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
  const width = 800;
  const height = 300;
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

  // Use DejaVuSans for all text for maximum compatibility
  // Display name (top left)
  ctx.font = 'bold 40px DejaVuSans';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(displayName, 240, 80);

  // Rep (top right)
  ctx.font = 'bold 32px DejaVuSans';
  ctx.fillStyle = '#00bfff';
  ctx.textAlign = 'right';
  ctx.fillText(`Rep: ${rep}`, 760, 80);

  // Level and Rank (below name)
  ctx.font = '28px DejaVuSans';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'left';
  ctx.fillText(`Level: ${level}`, 240, 130);
  ctx.fillStyle = '#9b59b6';
  ctx.fillText(`Rank: #${rank}`, 400, 130);

  // XP (above bar, left)
  ctx.font = '24px DejaVuSans';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(`XP: ${xp} / ${xpNeeded}`, 240, 180);

  // Progress bar background
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.moveTo(240, 210);
  ctx.lineTo(700, 210);
  ctx.quadraticCurveTo(720, 210, 720, 230);
  ctx.lineTo(720, 260);
  ctx.quadraticCurveTo(720, 280, 700, 280);
  ctx.lineTo(240, 280);
  ctx.quadraticCurveTo(220, 280, 220, 260);
  ctx.lineTo(220, 230);
  ctx.quadraticCurveTo(220, 210, 240, 210);
  ctx.closePath();
  ctx.fill();
  // Progress bar fill
  ctx.fillStyle = '#00bfff';
  const barWidth = Math.max(0, Math.min(1, xp / xpNeeded)) * 480;
  ctx.beginPath();
  ctx.moveTo(240, 210);
  ctx.lineTo(240 + barWidth, 210);
  ctx.quadraticCurveTo(240 + barWidth + 10, 210, 240 + barWidth + 10, 230);
  ctx.lineTo(240 + barWidth + 10, 260);
  ctx.quadraticCurveTo(240 + barWidth + 10, 280, 240 + barWidth, 280);
  ctx.lineTo(240, 280);
  ctx.quadraticCurveTo(220, 280, 220, 260);
  ctx.lineTo(220, 230);
  ctx.quadraticCurveTo(220, 210, 240, 210);
  ctx.closePath();
  ctx.fill();

  // XP percent text (inside bar, right, high contrast)
  ctx.font = 'bold 22px DejaVuSans';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor((xp / xpNeeded) * 100)}%`, 690, 255);

  return canvas.toBuffer();
}

module.exports = { generateRepCard };