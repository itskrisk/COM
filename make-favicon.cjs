const fs = require('fs');

const src = 'public/logos/browserimage.png';
const out = 'public/logos/browserimage.svg';

const buf = fs.readFileSync(src);
const b64 = buf.toString('base64');

let mime = 'image/jpeg';
if (buf[0] === 0x89 && buf[1] === 0x50) mime = 'image/png';

const svg = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"',
  '     viewBox="0 0 648 648" width="648" height="648">',
  '  <defs>',
  '    <clipPath id="circle">',
  '      <circle cx="324" cy="324" r="324"/>',
  '    </clipPath>',
  '  </defs>',
  '  <rect width="648" height="648" fill="#ffffff"/>',
  `  <image xlink:href="data:${mime};base64,${b64}" x="24" y="24" width="600" height="600" clip-path="url(#circle)"/>`,
  '  <circle cx="324" cy="324" r="300" fill="none" stroke="#ffffff" stroke-width="48"/>',
  '</svg>'
].join('\n');

fs.writeFileSync(out, svg);
console.log('Wrote', out, 'size', svg.length);