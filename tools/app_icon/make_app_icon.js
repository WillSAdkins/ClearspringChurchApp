const { chromium } = require('playwright');
const fs = require('fs');
const b64 = f => fs.readFileSync(f).toString('base64');
const FONTS = `@font-face{font-family:H;src:url(data:font/woff2;base64,${b64(__dirname + '/frank-ruhl-libre-hebrew-700.woff2')}) format('woff2');font-weight:700}
@font-face{font-family:F;src:url(data:font/woff2;base64,${b64(__dirname + '/../../static/fonts/figtree.woff2')}) format('woff2');font-weight:100 900}`;
function icon(dark, size=1024, withText=true, transparent=false) {
  const fg = dark ? '#FFFFFF' : '#0B0B0B', bg = transparent ? 'transparent' : (dark ? '#000000' : '#FFFFFF');
  const s = size / 1024;
  return `<div class="ic" style="width:${size}px;height:${size}px;background:${bg};position:relative;overflow:hidden;">
  <svg viewBox="0 0 1024 1024" width="${size}" height="${size}" style="position:absolute;inset:0">
    <defs>
      <filter id="ripple${dark}" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.11" numOctaves="1" seed="3"/>
        <feDisplacementMap in="SourceGraphic" scale="12" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <linearGradient id="fade${dark}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <mask id="water${dark}"><rect x="0" y="560" width="1024" height="300" fill="url(#fade${dark})"/></mask>
      <pattern id="lines${dark}" width="1024" height="14" patternUnits="userSpaceOnUse"><rect width="1024" height="8" fill="#fff"/></pattern>
      <mask id="stripes${dark}"><rect x="0" y="560" width="1024" height="300" fill="url(#lines${dark})"/></mask>
    </defs>
    <!-- the name -->
    <text x="512" y="520" text-anchor="middle" font-family="H" font-weight="700" font-size="300" fill="${fg}">יהוה</text>
    <!-- the shoreline -->
    <line x1="140" y1="560" x2="884" y2="560" stroke="${fg}" stroke-width="5" stroke-linecap="round"/>
    <!-- its reflection in the water -->
    <g mask="url(#water${dark})"><g mask="url(#stripes${dark})"><g filter="url(#ripple${dark})">
      <text x="512" y="520" text-anchor="middle" font-family="H" font-weight="700" font-size="300" fill="${fg}" transform="translate(0 1120) scale(1 -1)">יהוה</text>
    </g></g></g>
    <!-- spring ripples -->
    <g fill="none" stroke="${fg}" stroke-width="3" opacity=".3">
      <ellipse cx="512" cy="812" rx="230" ry="16"/><ellipse cx="512" cy="812" rx="140" ry="9"/><ellipse cx="512" cy="812" rx="56" ry="4"/>
    </g>
    ${withText ? `<text x="512" y="902" text-anchor="middle" font-family="F" font-weight="700" font-size="58" letter-spacing="15" fill="${fg}">CLEARSPRING</text>
    <text x="512" y="958" text-anchor="middle" font-family="F" font-weight="600" font-size="30" letter-spacing="22" fill="${fg}" opacity=".7">APP</text>` : ''}
    <text x="512" y="170" text-anchor="middle" font-family="F" font-weight="600" font-size="0" fill="${fg}"> </text>
  </svg></div>`;
}
/* Clearspring app icon: the divine name, יהוה, above a still lake with its
   reflection, and "CLEARSPRING APP" beneath. Black and white.
     node tools/app_icon/make_app_icon.js
   writes static/icons/icon-1024.png (the master), icon-1024-light.png (white
   version) and icon-1024-mark.png (the name and lake only, on transparency,
   for Android's adaptive icon). Then run: python tools/build_app_assets.py */
const OUT = __dirname + '/../../static/icons/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setViewportSize({ width: 1024, height: 1024 });
  for (const [name, dark, text, transparent] of [['icon-1024', true, true, false], ['icon-1024-light', false, true, false], ['icon-1024-mark', true, false, true]]) {
    await p.setContent(`<style>${FONTS} body{margin:0;background:transparent}</style>${icon(dark, 1024, text, transparent)}`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.locator('.ic').screenshot({ path: OUT + name + '.png', omitBackground: transparent });
  }
  await b.close();
})();
