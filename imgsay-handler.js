// imgsay-handler.js
const { generateTextImage } = require('./imgsay');

module.exports = async function handleImgSay(interaction) {
  const text = interaction.options.getString('text');
  if (!text || !text.trim()) {
    await interaction.reply({ content: 'Please provide some text to render.', ephemeral: true });
    return;
  }
  try {
    const buffer = generateTextImage(text);
    await interaction.reply({ files: [{ attachment: buffer, name: 'imgsay.png' }] });
  } catch (err) {
    console.error('Error generating image:', err);
    await interaction.reply({ content: 'Error generating image: ' + err.message, ephemeral: true });
  }
};
