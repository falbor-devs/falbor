const fs = require('fs');
const path = require('path');
const ph = require('@iconify-json/ph/icons.json');

const iconsToExtract = ['download-simple', 'copy', 'pencil-fill', 'trash'];
const outDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

iconsToExtract.forEach(icon => {
  const iconData = ph.icons[icon];
  if (iconData) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ph.width || 256} ${ph.height || 256}">${iconData.body}</svg>`;
    fs.writeFileSync(path.join(outDir, `${icon}.svg`), svg);
    console.log(`Extracted ${icon}.svg`);
  } else {
    console.log(`Icon ${icon} not found in @iconify-json/ph`);
  }
});
