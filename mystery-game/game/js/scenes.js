// 幕布背景（皮影镂空剪影）与证物图标。画布 640×360，脚底基线 y=350，前景台口从 y=338 开始。
(function () {
  const C = '#2a1810', H = '#f6d28d', INK = '#1a1210';

  const DEFS = `
    <radialGradient id="lamp" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#fbe3a8"/><stop offset=".6" stop-color="#eeb466"/><stop offset="1" stop-color="#a85a26"/></radialGradient>
    <radialGradient id="lampDim" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="#f2c47e"/><stop offset=".55" stop-color="#c07a38"/><stop offset="1" stop-color="#5e2f14"/></radialGradient>
    <radialGradient id="lampNight" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#c98a4a"/><stop offset=".6" stop-color="#7a4421"/><stop offset="1" stop-color="#2e170b"/></radialGradient>
    <radialGradient id="lampDusk" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#fcd9a8"/><stop offset=".55" stop-color="#e99a6c"/><stop offset="1" stop-color="#8a3e2a"/></radialGradient>
    <pattern id="lat" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${C}"/><rect x="3" y="3" width="10" height="10" fill="${H}" opacity=".8"/></pattern>
    <pattern id="bars" width="26" height="10" patternUnits="userSpaceOnUse"><rect width="8" height="10" fill="${C}"/></pattern>
    <pattern id="rainPat" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(16)">
      <line x1="8" y1="0" x2="8" y2="14" stroke="#1b1b1b" stroke-opacity=".35"/><line x1="26" y1="18" x2="26" y2="30" stroke="#1b1b1b" stroke-opacity=".25"/>
    </pattern>
    <filter id="rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="8"/><feDisplacementMap in="SourceGraphic" scale="12"/></filter>`;

  const lamp = id => `<rect width="640" height="360" fill="url(#${id})"/>`;
  const floor = `<rect y="338" width="640" height="22" fill="${C}"/><rect y="338" width="640" height="3" fill="#6b3a22"/>`;
  const lantern = (x, y) => `<line x1="${x}" y1="0" x2="${x}" y2="${y - 18}" stroke="${C}" stroke-width="2"/><ellipse cx="${x}" cy="${y}" rx="14" ry="18" fill="${C}"/><path d="M${x - 8} ${y - 6} h16 M${x - 9} ${y + 2} h18 M${x - 7} ${y + 10} h14" stroke="${H}" stroke-width="2" opacity=".8"/><rect x="${x - 3}" y="${y + 18}" width="6" height="10" fill="${C}"/>`;
  const rainLines = (n, op) => { let s = ''; for (let i = 0; i < n; i++) { const x = (i * 53) % 640, y = (i * 97) % 300; s += `M${x} ${y} l-6 22 `; } return `<path d="${s}" stroke="${C}" stroke-opacity="${op}" stroke-width="1.5"/>`; };

  const BG = {
    black: { back: `<rect width="640" height="360" fill="#0b0705"/>`, front: '' },

    title: {
      back: lamp('lampNight') +
        `<path d="M0 286 L640 286 L640 338 L0 338 Z" fill="${C}" opacity=".55"/>` +
        `<rect x="0" y="198" width="640" height="14" fill="${C}"/>` +
        `<path d="M40 212 Q320 300 600 212 L600 228 Q320 316 40 228 Z" fill="${C}"/>` +
        `<g fill="${C}">${[60, 140, 220, 300, 380, 460, 540].map(x => `<rect x="${x}" y="178" width="6" height="22"/>`).join('')}<rect x="0" y="178" width="640" height="4"/></g>` +
        `<rect x="40" y="212" width="22" height="126" fill="${C}"/><rect x="578" y="212" width="22" height="126" fill="${C}"/>` +
        lantern(90, 120) + lantern(550, 120),
      front: floor
    },

    bridgeNight: {
      back: lamp('lampNight') +
        `<path d="M0 290 Q160 280 320 292 T640 288 L640 338 L0 338 Z" fill="${C}" opacity=".55"/>` +
        `<path d="M20 306 q14 -6 28 0 t28 0 M200 318 q14 -6 28 0 t28 0 M420 310 q14 -6 28 0 t28 0" stroke="${H}" stroke-width="1.2" fill="none" opacity=".5"/>` +
        `<rect x="0" y="202" width="640" height="12" fill="${C}"/>` +
        `<path d="M40 214 Q320 300 600 214 L600 230 Q320 316 40 230 Z" fill="${C}"/>` +
        `<g fill="${C}">${[30, 110, 190, 270, 350, 430, 510, 590].map(x => `<rect x="${x}" y="180" width="6" height="22"/>`).join('')}<rect x="0" y="180" width="640" height="4"/></g>` +
        `<rect x="40" y="214" width="24" height="124" fill="${C}"/><rect x="576" y="214" width="24" height="124" fill="${C}"/>`,
      front: floor
    },

    hall: {
      back: lamp('lamp') +
        `<rect x="150" y="96" width="340" height="150" fill="url(#lat)" opacity=".55"/>` +
        `<rect x="150" y="96" width="340" height="150" fill="none" stroke="${C}" stroke-width="8"/>` +
        `<rect x="218" y="22" width="204" height="46" fill="${C}"/>` +
        `<text x="320" y="56" text-anchor="middle" font-size="27" fill="${H}" font-family="'Ma Shan Zheng','STKaiti','KaiTi',serif">明镜高悬</text>` +
        `<rect x="34" y="0" width="28" height="338" fill="${C}"/><rect x="578" y="0" width="28" height="338" fill="${C}"/>` +
        `<path d="M34 30 h28 M34 300 h28 M578 30 h28 M578 300 h28" stroke="${H}" stroke-width="2" opacity=".5"/>`,
      front:
        `<rect x="196" y="246" width="248" height="14" fill="${C}"/>` +
        `<path d="M206 260 L434 260 L434 338 L206 338 Z" fill="#6b1e16"/>` +
        `<path d="M206 260 L434 260 L434 338 L206 338 Z" fill="none" stroke="${C}" stroke-width="5"/>` +
        `<path d="M240 290 q20 -16 40 0 t40 0 t40 0 t40 0" stroke="${H}" stroke-width="2" fill="none" opacity=".55"/>` +
        `<rect x="398" y="222" width="18" height="24" fill="${C}"/><path d="M402 222 l-3 -14 M407 222 v-16 M412 222 l3 -14" stroke="${C}" stroke-width="2.5"/>` +
        `<rect x="226" y="236" width="40" height="10" fill="${C}"/>` + floor
    },

    yizhuang: {
      back: lamp('lampDim') +
        `<line x1="320" y1="0" x2="320" y2="70" stroke="${C}" stroke-width="2"/><path d="M304 70 h32 l-6 16 h-20 Z" fill="${C}"/><ellipse cx="320" cy="94" rx="6" ry="8" fill="${H}" opacity=".9"/>` +
        `<path d="M540 338 L548 250 L630 250 L640 338 Z" fill="${C}" opacity=".85"/><path d="M548 250 Q590 236 630 250" stroke="${C}" stroke-width="6" fill="none"/>` +
        `<path d="M0 338 L0 230 L60 230 L72 338 Z" fill="${C}" opacity=".7"/>`,
      front:
        `<rect x="196" y="272" width="248" height="10" fill="${C}"/><rect x="206" y="282" width="10" height="56" fill="${C}"/><rect x="424" y="282" width="10" height="56" fill="${C}"/>` +
        `<path d="M206 272 Q226 242 258 246 Q300 236 342 248 Q384 238 422 254 Q436 264 434 272 Z" fill="#efe6cf" fill-opacity=".85" stroke="${C}" stroke-width="3"/>` +
        `<path d="M260 250 q30 10 60 0 M340 252 q30 8 60 2" stroke="${C}" stroke-width="1.5" fill="none" opacity=".5"/>` + floor
    },

    houchu: {
      back: lamp('lamp') +
        `<path d="M20 338 L20 236 L170 236 L170 338 Z" fill="${C}"/><path d="M60 338 L60 300 Q80 280 100 300 L100 338 Z" fill="${H}" opacity=".9"/>` +
        `<path d="M40 236 Q70 206 100 236 Z" fill="${C}"/><rect x="128" y="120" width="22" height="116" fill="${C}"/>` +
        `<rect x="64" y="226" width="56" height="5" fill="${H}" opacity=".6"/><path d="M78 224 l30 -8 l4 4 l-30 8 Z" fill="${C}"/>` +
        `<rect x="178" y="264" width="72" height="8" fill="${C}"/><rect x="184" y="272" width="6" height="66" fill="${C}"/><rect x="238" y="272" width="6" height="66" fill="${C}"/>` +
        `<rect x="196" y="252" width="30" height="12" fill="${C}"/><rect x="230" y="256" width="14" height="8" fill="${C}"/>` +
        `<path d="M262 262 Q258 300 270 338 L326 338 Q338 300 334 262 Z" fill="${C}"/><ellipse cx="298" cy="262" rx="37" ry="7" fill="${H}" opacity=".5" stroke="${C}" stroke-width="3"/>` +
        `<line x1="400" y1="96" x2="400" y2="118" stroke="${C}" stroke-width="2"/><rect x="356" y="118" width="96" height="5" fill="${C}"/>` +
        `<path d="M366 123 L362 170 M366 123 L380 170" stroke="${C}" stroke-width="1.5"/><path d="M352 170 Q371 184 390 170 Z" fill="${C}"/>` +
        `<line x1="440" y1="123" x2="440" y2="150" stroke="${C}" stroke-width="1.5" stroke-dasharray="3 3"/>` +
        `<rect x="470" y="150" width="82" height="188" fill="${C}"/><rect x="478" y="160" width="66" height="70" fill="url(#lat)"/>` +
        `<rect x="462" y="250" width="30" height="8" fill="#6b3a22"/><path d="M562 190 q8 0 8 8 q0 6 -6 6" stroke="${C}" stroke-width="3" fill="none"/>` +
        `<rect x="576" y="176" width="64" height="162" fill="url(#lat)"/><rect x="576" y="176" width="64" height="162" fill="none" stroke="${C}" stroke-width="6"/>`,
      front: floor
    },

    qiantang: {
      back: lamp('lamp') +
        `<path d="M20 338 L130 140 L150 140 L40 338 Z" fill="${C}"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${36 + i * 15}" y="${310 - i * 27}" width="34" height="5" fill="${C}"/>`).join('')}` +
        `<rect x="0" y="130" width="640" height="10" fill="${C}"/><rect x="150" y="60" width="190" height="70" fill="url(#lat)" opacity=".7"/>` +
        `<rect x="520" y="150" width="120" height="188" fill="${C}"/>${[0, 1, 2, 3].map(i => `<rect x="${526 + i * 28}" y="156" width="22" height="176" fill="#4a2a18"/>`).join('')}` +
        `<g fill="${C}"><rect x="200" y="280" width="110" height="8"/><rect x="206" y="288" width="6" height="50"/><rect x="298" y="288" width="6" height="50"/>` +
        `<rect x="210" y="252" width="90" height="6"/><rect x="216" y="226" width="6" height="26"/><rect x="288" y="226" width="6" height="26"/><rect x="216" y="226" width="78" height="4"/>` +
        `<rect x="350" y="296" width="120" height="7"/><rect x="356" y="303" width="6" height="35"/><rect x="458" y="303" width="6" height="35"/></g>` +
        lantern(420, 60),
      front: floor
    },

    jail: {
      back: lamp('lampDim') +
        `<rect x="470" y="50" width="70" height="44" fill="${C}"/><rect x="478" y="56" width="54" height="32" fill="${H}" opacity=".85"/><path d="M490 56 v32 M505 56 v32 M520 56 v32" stroke="${C}" stroke-width="4"/>` +
        `<path d="M0 0 L640 0 L640 30 L0 30 Z" fill="${C}"/>` +
        `<path d="M380 338 Q420 320 470 330 Q520 318 580 332 L640 326 L640 338 Z" fill="${C}" opacity=".6"/>`,
      front: `<rect x="370" y="30" width="270" height="10" fill="${C}"/><rect x="370" y="318" width="270" height="12" fill="${C}"/>` +
        `<rect x="370" y="30" width="270" height="300" fill="url(#bars)"/>` + floor
    },

    street: {
      back: lamp('lamp') +
        `<path d="M0 90 L200 120 L200 338 L0 338 Z" fill="${C}" opacity=".5"/><path d="M0 80 Q100 96 214 112 L214 124 Q100 108 0 94 Z" fill="${C}"/>` +
        `<rect x="40" y="170" width="110" height="80" fill="url(#lat)" opacity=".8"/>` +
        `<path d="M640 70 L460 110 L460 338 L640 338 Z" fill="${C}" opacity=".5"/><path d="M640 60 Q550 80 446 102 L446 114 Q550 92 640 74 Z" fill="${C}"/>` +
        `<rect x="490" y="160" width="40" height="178" fill="#4a2a18"/>` +
        `<path d="M200 338 L460 338 L400 260 L260 260 Z" fill="${C}" opacity=".18"/><path d="M230 300 h200 M245 280 h170 M262 264 h136" stroke="${C}" stroke-width="2" opacity=".4"/>` +
        `<ellipse cx="300" cy="322" rx="34" ry="5" fill="${H}" opacity=".7"/><ellipse cx="400" cy="330" rx="22" ry="4" fill="${H}" opacity=".6"/>` +
        lantern(180, 150),
      front: floor
    },

    shop: {
      back: lamp('lamp') +
        `<rect x="40" y="70" width="560" height="10" fill="${C}"/><rect x="40" y="150" width="560" height="8" fill="${C}"/><rect x="40" y="226" width="560" height="8" fill="${C}"/>` +
        `<rect x="40" y="70" width="10" height="200" fill="${C}"/><rect x="590" y="70" width="10" height="200" fill="${C}"/>` +
        `<g fill="${C}"><rect x="60" y="104" width="40" height="46"/><rect x="106" y="110" width="40" height="40"/><rect x="200" y="104" width="40" height="46"/><rect x="420" y="110" width="40" height="40"/>` +
        `<rect x="70" y="186" width="40" height="40"/><rect x="330" y="180" width="40" height="46"/><rect x="520" y="186" width="40" height="40"/></g>` +
        `<g stroke="${H}" stroke-width="2" opacity=".6"><path d="M66 120 h28 M112 126 h28 M206 120 h28 M426 126 h28 M76 200 h28 M336 196 h28 M526 200 h28"/></g>` +
        `<rect x="250" y="22" width="140" height="36" fill="${C}"/><text x="320" y="49" text-anchor="middle" font-size="22" fill="${H}" font-family="'Ma Shan Zheng','STKaiti','KaiTi',serif">周记绸缎</text>`,
      front: `<rect x="230" y="268" width="180" height="70" fill="${C}"/><rect x="222" y="262" width="196" height="8" fill="#6b3a22"/>` + floor
    },

    zhouzao: {
      back: lamp('lampDim') +
        `<path d="M200 338 L200 220 L440 220 L440 338 Z" fill="${C}"/><path d="M270 338 L270 290 Q320 256 370 290 L370 338 Z" fill="#5e3a22"/>` +
        `<path d="M280 338 Q300 326 320 332 Q340 324 360 338 Z" fill="#9a8a78" opacity=".8"/>` +
        `<path d="M240 220 Q300 186 360 220 Z" fill="${C}"/><rect x="400" y="80" width="26" height="140" fill="${C}"/>` +
        `<rect x="40" y="260" width="90" height="78" fill="${C}" opacity=".85"/><rect x="520" y="200" width="80" height="138" fill="${C}" opacity=".75"/>`,
      front: floor
    },

    bridgeDay: {
      back: lamp('lamp') +
        `<path d="M0 250 Q160 238 320 252 T640 246 L640 338 L0 338 Z" fill="${C}" opacity=".45"/>` +
        `<path d="M30 276 q14 -6 28 0 t28 0 M180 300 q14 -6 28 0 t28 0 M300 284 q14 -6 28 0 t28 0" stroke="${H}" stroke-width="1.5" fill="none" opacity=".7"/>` +
        `<rect x="0" y="40" width="640" height="16" fill="${C}"/><path d="M0 56 L640 56 L640 70 Q480 150 320 150 Q160 150 0 70 Z" fill="${C}" opacity=".9"/>` +
        `<rect x="430" y="56" width="70" height="282" fill="${C}"/><path d="M430 120 h70 M430 200 h70 M430 280 h70" stroke="#6b3a22" stroke-width="3"/>` +
        `<path d="M500 220 q14 10 10 30 q-6 16 -2 30" stroke="${C}" stroke-width="3" fill="none"/>`,
      front: floor
    },

    dusk: {
      back: lamp('lampDusk') +
        `<path d="M60 120 L320 70 L580 120 L560 132 L320 88 L80 132 Z" fill="${C}"/><rect x="100" y="132" width="440" height="206" fill="${C}" opacity=".45"/>` +
        `<rect x="616" y="8" width="5" height="330" fill="${C}"/><path d="M574 22 L616 22 L616 150 L595 138 L574 150 Z" fill="#6b1e16" stroke="${C}" stroke-width="2"/>` +
        `<text font-size="24" fill="${H}" font-family="'Ma Shan Zheng','STKaiti','KaiTi',serif" text-anchor="middle"><tspan x="595" y="54">清</tspan><tspan x="595" y="84">风</tspan><tspan x="595" y="114">楼</tspan></text>` +
        `<rect x="130" y="170" width="90" height="70" fill="url(#lat)"/><rect x="420" y="170" width="90" height="70" fill="url(#lat)"/>` +
        `<rect x="268" y="200" width="104" height="138" fill="${H}" opacity=".55"/><path d="M320 200 v138" stroke="${C}" stroke-width="4"/>` +
        lantern(240, 180) + lantern(400, 180),
      front: floor
    },

    map: {
      back: lamp('lamp') +
        `<path d="M0 226 Q160 206 320 230 T640 220 L640 262 Q480 272 320 258 T0 266 Z" fill="${C}" opacity=".78"/>` +
        `<path d="M40 246 q14 -6 28 0 t28 0 M240 250 q14 -6 28 0 t28 0 M520 244 q14 -6 28 0 t28 0" stroke="${H}" stroke-width="1.5" fill="none" opacity=".7"/>` +
        `<rect x="414" y="0" width="12" height="360" fill="${C}" opacity=".35"/>` +
        `<path d="M404 218 Q420 206 436 218 L436 268 Q420 256 404 268 Z" fill="${C}"/>` +
        `<g fill="url(#lat)" opacity=".55"><rect x="60" y="50" width="110" height="70"/><rect x="230" y="40" width="140" height="60"/><rect x="470" y="50" width="120" height="80"/>` +
        `<rect x="80" y="140" width="80" height="50"/><rect x="250" y="120" width="120" height="70"/><rect x="460" y="150" width="100" height="40"/>` +
        `<rect x="60" y="290" width="140" height="50"/><rect x="260" y="282" width="120" height="56"/><rect x="460" y="290" width="140" height="48"/></g>` +
        `<text x="30" y="40" font-size="28" fill="${C}" font-family="'Ma Shan Zheng','STKaiti','KaiTi',serif">汴京</text>` +
        `<text x="560" y="238" font-size="16" fill="${H}" font-family="'Ma Shan Zheng','STKaiti','KaiTi',serif">汴河</text>`,
      front: ''
    }
  };

  // 逆转时的水墨层
  const INK_LAYER = `<rect width="640" height="360" fill="#ebe8e0"/>` +
    `<g filter="url(#rough)"><path d="M-10 230 Q80 150 160 190 Q230 120 320 180 Q400 130 480 180 Q560 120 650 190 L650 360 L-10 360 Z" fill="#1b1b1b" opacity=".16"/>` +
    `<path d="M-10 290 Q100 230 200 270 Q300 220 400 280 Q500 240 650 280 L650 360 L-10 360 Z" fill="#1b1b1b" opacity=".32"/></g>` +
    `<rect width="640" height="360" fill="url(#rainPat)"/>`;

  // 证物图标，画在 60×60 里
  const doc = (mark) => `<rect x="12" y="6" width="36" height="48" fill="#efe3c4" stroke="${INK}" stroke-width="2.5"/><path d="M18 16 h24 M18 24 h24 M18 32 h24 M18 40 h16" stroke="${INK}" stroke-width="2"/>${mark || ''}`;
  const ICON = {
    doc: doc(),
    docred: doc(`<rect x="32" y="38" width="12" height="12" fill="#b3261e"/>`),
    docseal: doc(`<circle cx="38" cy="44" r="6" fill="#b3261e"/>`),
    weight: `<path d="M30 8 v8" stroke="${INK}" stroke-width="3"/><path d="M24 16 h12 l8 34 h-28 Z" fill="${INK}"/><circle cx="30" cy="12" r="4" fill="none" stroke="${INK}" stroke-width="2.5"/>`,
    knife: `<path d="M8 40 L44 12 L52 18 L22 46 Z" fill="#e9e0c8" stroke="${INK}" stroke-width="2.5"/><path d="M22 46 L12 54 L6 48 L16 40" fill="${INK}"/><circle cx="36" cy="24" r="3" fill="#7a1a12"/>`,
    book: `<rect x="10" y="10" width="40" height="40" fill="#7a5230" stroke="${INK}" stroke-width="2.5"/><rect x="18" y="16" width="12" height="28" fill="#efe3c4"/><rect x="38" y="38" width="8" height="8" fill="#b3261e"/>`,
    bar: `<rect x="8" y="10" width="44" height="40" fill="none" stroke="${INK}" stroke-width="3"/><rect x="4" y="27" width="40" height="7" fill="#7a5230" stroke="${INK}" stroke-width="2"/><path d="M30 10 v40" stroke="${INK}" stroke-width="2"/>`,
    umbrella: `<path d="M6 30 Q30 4 54 30 Z" fill="#efe1b8" stroke="${INK}" stroke-width="2.5"/><path d="M30 16 L6 30 M30 16 L18 30 M30 16 L30 30 M30 16 L42 30 M30 16 L54 30" stroke="${INK}" stroke-width="1.2"/><path d="M30 30 V52 Q30 56 25 55" stroke="${INK}" stroke-width="2.5" fill="none"/>`,
    plan: `<rect x="8" y="8" width="44" height="44" fill="#efe3c4" stroke="${INK}" stroke-width="2.5"/><path d="M8 30 h44 M30 8 v44" stroke="${INK}" stroke-width="2"/><rect x="11" y="11" width="16" height="16" fill="#b3261e" opacity=".7"/>`,
    bang: `<rect x="18" y="10" width="24" height="40" rx="5" fill="#8a5a2e" stroke="${INK}" stroke-width="2.5"/><path d="M18 24 h24 M18 36 h24" stroke="${INK}" stroke-width="2"/>`,
    burnt: `<path d="M12 10 L46 10 L48 24 Q40 30 44 40 Q34 44 36 52 L14 50 Q18 38 10 30 Z" fill="#d9c49a" stroke="${INK}" stroke-width="2.5"/><path d="M18 20 h20 M18 28 h14" stroke="${INK}" stroke-width="2"/><path d="M44 40 Q34 44 36 52" stroke="#3a2a20" stroke-width="4" fill="none"/>`,
    cape: `<path d="M24 8 Q12 30 8 52 L52 52 Q48 30 36 8 Z" fill="#7a6232" stroke="${INK}" stroke-width="2.5"/><path d="M20 24 l-4 20 M28 22 l-2 26 M36 24 l4 22" stroke="${INK}" stroke-width="1.5"/><path d="M24 10 Q30 16 36 10" stroke="#b3261e" stroke-width="3" fill="none"/><circle cx="30" cy="38" r="5" fill="#5a1410"/>`
  };

  window.YY = window.YY || {};
  YY.STAGE_DEFS = DEFS;
  YY.BG = BG;
  YY.INK_LAYER = INK_LAYER;
  YY.ICON = ICON;
})();
