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
  xpNeeded = 100
}) {
  const width = 600;
  const height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#23272A';
  ctx.fillRect(0, 0, width, height);

  // Draw avatar
  try {
    const avatar = await loadImage(avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 100, 64, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 36, 36, 128, 128);
    ctx.restore();
  } catch (e) {
    // Avatar failed to load
  }

  // Display name
  ctx.font = 'bold 32px Sans';
  ctx.fillStyle = '#fff';
  ctx.fillText(displayName, 180, 70);

  // Rep
  ctx.font = '24px Sans';
  ctx.fillStyle = '#00bfff';
  ctx.fillText(`Rep: ${rep}`, 180, 110);

  // Rank, Level, XP
  ctx.fillStyle = '#fff';
  ctx.font = '20px Sans';
  ctx.fillText(`Rank: #${rank}   Level: ${level}`, 180, 145);
  ctx.fillText(`XP: ${xp} / ${xpNeeded}`, 180, 175);

  // Progress bar
  ctx.fillStyle = '#444';
  ctx.fillRect(180, 155, 300, 15);
  ctx.fillStyle = '#00bfff';
  ctx.fillRect(180, 155, Math.max(0, Math.min(1, xp / xpNeeded)) * 300, 15);

  return canvas.toBuffer();
}

module.exports = { generateRepCard };