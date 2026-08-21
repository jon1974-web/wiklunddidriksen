const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Rounded rectangle
  const radius = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();
  
  // Gradient background: #020D0E (bottom-left) to #0D7377 (top-right)
  const gradient = ctx.createLinearGradient(0, size, size, 0);
  gradient.addColorStop(0, '#020D0E');
  gradient.addColorStop(1, '#0D7377');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // "fp" text — clean sans-serif, letters glued together
  const fontSize = Math.round(size * 0.65);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `300 ${fontSize}px Helvetica, Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  
  // Draw f and p with heavy overlap to look like one word
  const fWidth = ctx.measureText('f').width;
  const pWidth = ctx.measureText('p').width;
  const overlap = fWidth * 0.45;
  const totalWidth = fWidth + pWidth - overlap;
  const startX = (size - totalWidth) / 2;
  
  ctx.textAlign = 'left';
  ctx.fillText('f', startX, size * 0.53);
  ctx.fillText('p', startX + fWidth - overlap, size * 0.53);
  
  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

// Generate all sizes
const assetsDir = path.join(__dirname, '..', 'assets');
generateIcon(1024, path.join(assetsDir, 'icon.png'));
generateIcon(512, path.join(assetsDir, 'icon-512.png'));
generateIcon(192, path.join(assetsDir, 'icon-192.png'));
generateIcon(180, path.join(assetsDir, 'icon-180.png')); // apple-touch-icon
generateIcon(48, path.join(assetsDir, 'favicon.png'));

console.log('All icons generated!');
