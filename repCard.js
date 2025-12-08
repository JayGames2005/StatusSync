// repCard.js
// Generates a rep card image using node-canvas
const { createCanvas, loadImage, registerFont } = require('canvas');
registerFont(__dirname + '/fonts/DejaVuSerif-Italic.ttf', { family: 'DejaVu Serif' });

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

  // Display name (top left, large, sanitized)
  ctx.font = 'bold 40px "DejaVu Serif"';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  // Only allow printable characters, fallback to 'User' if empty
  const safeName = (typeof displayName === 'string' ? displayName : String(displayName)).replace(/[^\w\s\-\.!?@#$%^&*()\[\]{}|:;,'"<>~`+=/\\]/g, '').trim() || 'User';
  ctx.fillText(safeName, 240, 70);

  // Rep (below display name, large and blue)
  ctx.font = 'bold 36px "DejaVu Serif"';
  ctx.fillStyle = '#00bfff';
  ctx.textAlign = 'left';
  ctx.fillText(`Rep: ${rep}`, 240, 115);

  // Level (below rep)
  ctx.font = 'italic 28px "DejaVu Serif"';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'left';
  ctx.fillText(`Level: ${level}`, 240, 155);

  // XP (below level)
  ctx.font = '24px "DejaVu Serif"';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(`XP: ${xp} / ${xpNeeded}`, 240, 190);

  // XP Progress bar background (rounded, shadow)
  const barX = 240;
  const barY = 220;
  const barW = 480;
  const barH = 40;
  const radius = 20;
  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(barX + radius, barY);
  ctx.lineTo(barX + barW - radius, barY);
  ctx.quadraticCurveTo(barX + barW, barY, barX + barW, barY + radius);
  ctx.lineTo(barX + barW, barY + barH - radius);
  ctx.quadraticCurveTo(barX + barW, barY + barH, barX + barW - radius, barY + barH);
  ctx.lineTo(barX + radius, barY + barH);
  ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH - radius);
  ctx.lineTo(barX, barY + radius);
  ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
  ctx.closePath();
  ctx.fillStyle = '#222';
  ctx.fill();
  ctx.restore();
  // Progress bar fill (gradient)
  const percent = Math.max(0, Math.min(1, xp / xpNeeded));
  const fillW = percent * barW;
  if (fillW > 0) {
    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    grad.addColorStop(0, '#00bfff');
    grad.addColorStop(1, '#0099ff');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(barX + radius, barY);
    ctx.lineTo(barX + fillW - radius, barY);
    ctx.quadraticCurveTo(barX + fillW, barY, barX + fillW, barY + radius);
    ctx.lineTo(barX + fillW, barY + barH - radius);
    ctx.quadraticCurveTo(barX + fillW, barY + barH, barX + fillW - radius, barY + barH);
    ctx.lineTo(barX + radius, barY + barH);
    ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH - radius);
    ctx.lineTo(barX, barY + radius);
    ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  // XP percent text (inside bar, right, high contrast)
  ctx.font = 'bold 22px "DejaVu Serif"';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(percent * 100)}%`, barX + barW - 10, barY + barH - 12);

  return canvas.toBuffer();
}

module.exports = { generateRepCard };
