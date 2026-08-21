#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'web', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Add manifest link if not present
if (!html.includes('manifest.json')) {
  html = html.replace(
    '</head>',
    '<link rel="manifest" href="/manifest.json">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="default">\n<meta name="apple-mobile-web-app-title" content="fampad">\n<link rel="apple-touch-icon" href="/favicon.png">\n</head>'
  );
  fs.writeFileSync(indexPath, html);
  console.log('✓ Injected manifest and PWA meta tags into index.html');
} else {
  console.log('✓ Manifest already present in index.html');
}
