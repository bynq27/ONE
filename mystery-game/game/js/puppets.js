// 皮影角色：每个角色拆成躯干、头、前臂、后臂，关节由程序转动。
// 坐标系：脚底中心为原点，向上为负，整体高约 255。默认面朝右。
(function () {
  const INK = '#1a1210', HOLE = '#f6d28d', SKIN = '#f7d79a', ROD = '#3a2a20';
  const SH_F = [8, -165], SH_B = [-4, -165], NECK = [4, -178];
  const S = Math.sin;
  const rad = d => d * Math.PI / 180;
  const rot = (x, y, a) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [x * c - y * s, x * s + y * c]; };

  const FACE_D = 'M0 0 L6 -6 Q14 -10 18 -14 L22 -20 L19 -23 L23 -27 L20 -29 L27 -33 L19 -38 Q18 -46 10 -50 Q-12 -54 -16 -34 Q-18 -14 -6 -6 Z';
  const FACE = `<path d="${FACE_D}" fill="${SKIN}" fill-opacity=".3" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>`;
  const EYE = `<path d="M8 -34 Q13 -38 18 -34 Q13 -32 8 -34 Z" fill="${INK}"/><path d="M6 -40 Q12 -43 19 -40" fill="none" stroke="${INK}" stroke-width="2.2"/>`;
  const NAPE = `<path d="M-15 -36 Q-20 -20 -10 -8" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  const WING_HAT = `<path d="M-17 -38 Q-16 -66 4 -66 Q20 -64 19 -44 Z" fill="${INK}"/><rect x="-80" y="-56" width="176" height="4" rx="2" fill="${INK}"/>`;

  const FAN = (() => {
    const p = (r, a) => [(r * Math.sin(rad(a))).toFixed(1), (r * Math.cos(rad(a))).toFixed(1)];
    const ri = 10, ro = 50, a0 = -42, a1 = 42;
    const [x0, y0] = p(ri, a0), [x1, y1] = p(ro, a0), [x2, y2] = p(ro, a1), [x3, y3] = p(ri, a1);
    let ribs = '';
    for (let a = a0; a <= a1 + 0.1; a += 14) { const [rx, ry] = p(ro, a); ribs += `M0 0 L${rx} ${ry} `; }
    return `<path d="M${x0} ${y0} L${x1} ${y1} A${ro} ${ro} 0 0 0 ${x2} ${y2} L${x3} ${y3} A${ri} ${ri} 0 0 1 ${x0} ${y0} Z" fill="#efe1b8" fill-opacity=".6" stroke="${INK}" stroke-width="2.2"/>` +
      `<path d="${ribs}" stroke="${INK}" stroke-width="1" fill="none"/>` +
      `<path d="M-14 40 Q-4 30 4 38 Q12 28 20 40" fill="none" stroke="#2f6b4f" stroke-width="2"/>`;
  })();

  const DEF = {
    shen: {
      top: '#2f6b4f', skirt: '#24553e', arm: '#2f6b4f', armB: '#24553e', L1: 42, L2: 38, hat: WING_HAT, extraHead: '',
      torso: `<rect x="-24" y="-103" width="50" height="9" fill="#b8322a" fill-opacity=".92" stroke="${INK}" stroke-width="2"/><path d="M2 -176 L10 -150 L18 -172" fill="none" stroke="${HOLE}" stroke-width="3"/>` +
        `<circle cx="2" cy="-140" r="4" fill="${HOLE}"/><circle cx="12" cy="-124" r="4" fill="${HOLE}"/><path d="M-14 -60 v40 M0 -60 v44 M14 -60 v40" stroke="${INK}" stroke-width="1.5"/>`,
      prop: `<line x1="0" y1="-4" x2="0" y2="40" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><path d="M-3 38 Q0 52 3 38 Z" fill="${INK}"/>`,
      idle(t) { const tap = Math.pow(Math.max(0, S(t * 3.4)), 8); return { h: -2 + 4 * tap, f1: -10, f2: -150 - 8 * tap, b1: 12, b2: -14 }; }
    },
    fan: {
      top: '#7a5230', skirt: '#644226', arm: '#7a5230', armB: '#644226', L1: 40, L2: 36, lean: 4,
      hat: `<path d="M-18 -36 Q-15 -62 8 -60 Q22 -56 17 -42 Q0 -48 -18 -36 Z" fill="#4a3426" stroke="${INK}" stroke-width="2"/><path d="M-16 -40 Q-30 -34 -30 -18" fill="none" stroke="#4a3426" stroke-width="5" stroke-linecap="round"/>`,
      extraHead: `<path d="M18 -15 Q26 6 16 26 Q11 34 5 26 Q1 8 6 -8 Z" fill="#efe3c4" fill-opacity=".75" stroke="${INK}" stroke-width="2"/><path d="M10 -6 Q14 8 10 20" fill="none" stroke="${INK}" stroke-width="1"/><path d="M5 -41 Q12 -46 20 -41" fill="none" stroke="#efe3c4" stroke-width="3"/>`,
      torso: `<path d="M-14 -150 h16 v14 h-16 Z" fill="none" stroke="${HOLE}" stroke-width="2" stroke-dasharray="3 2"/><path d="M8 -70 h14 v12 h-14 Z" fill="none" stroke="${HOLE}" stroke-width="2" stroke-dasharray="3 2"/>` +
        `<rect x="-24" y="-102" width="50" height="7" fill="#3a2a20" stroke="${INK}" stroke-width="1.5"/>`,
      prop: '',
      idle(t) { return { h: 8 + 3 * S(t * 1.1), f1: -14, f2: -146 + 12 * S(t * 1.7), b1: 18, b2: -24 }; }
    },
    fu: {
      top: '#b8322a', skirt: '#2f6b4f', arm: '#b8322a', armB: '#962920', L1: 40, L2: 36,
      hat: `<path d="M-17 -38 Q-16 -62 4 -62 Q20 -60 19 -44 Q2 -50 -17 -38 Z" fill="#2c3336" stroke="${INK}" stroke-width="2"/><path d="M-16 -44 Q-30 -42 -34 -30 M-16 -44 Q-26 -50 -34 -46" fill="none" stroke="#2c3336" stroke-width="4" stroke-linecap="round"/>`,
      extraHead: `<path d="M31 -40 q5 7 0 10 q-5 -3 0 -10 Z" fill="#9cc3cf"/>`,
      torso: `<path d="M-8 -176 L4 -176 L0 -118 L-12 -121 Z" fill="#e9dfc6" fill-opacity=".8" stroke="${INK}" stroke-width="2"/>` +
        `<path d="M-6 -96 L28 -96 L32 -40 L-2 -40 Z" fill="#e9dfc6" fill-opacity=".65" stroke="${INK}" stroke-width="2"/><circle cx="12" cy="-138" r="4" fill="${HOLE}"/>`,
      prop: '',
      idle(t) { const r = S(t * 13); return { x: 1.4 * S(t * 37), y: 0.8 * S(t * 29), h: -3 + 3 * S(t * 23), f1: -40, f2: -70 + 10 * r, b1: -34, b2: -80 - 10 * r }; }
    },
    zhou: {
      top: '#3d3a78', skirt: '#302d63', arm: '#3d3a78', armB: '#302d63', L1: 42, L2: 38, fan: true,
      hat: `<path d="M-16 -40 L-14 -78 L14 -78 L19 -43 Z" fill="${INK}"/><path d="M-10 -72 L12 -72 M-11 -60 L15 -60" stroke="${HOLE}" stroke-width="1.5" opacity=".7"/>`,
      extraHead: `<path d="M18 -18 Q22 -12 18 -6" fill="none" stroke="${INK}" stroke-width="2"/>` +
        `<g class="pp-reveal" style="opacity:0"><path d="${FACE_D}" fill="${INK}"/>` +
        `<path d="M-6 -30 Q4 -44 12 -28 Q18 -18 8 -14 M-10 -16 Q0 -22 6 -10" fill="none" stroke="#b3261e" stroke-width="2.4"/><path d="M8 -35 Q14 -38 19 -34 Q14 -33 8 -35 Z" fill="${HOLE}"/></g>`,
      torso: `<g fill="none" stroke="${HOLE}" stroke-width="2"><circle cx="0" cy="-146" r="5"/><circle cx="14" cy="-126" r="5"/><circle cx="2" cy="-110" r="5"/><circle cx="-12" cy="-60" r="5"/><circle cx="8" cy="-40" r="5"/><circle cx="18" cy="-70" r="5"/></g>` +
        `<g fill="${HOLE}"><rect x="-2" y="-148" width="4" height="4"/><rect x="12" y="-128" width="4" height="4"/><rect x="0" y="-112" width="4" height="4"/><rect x="-14" y="-62" width="4" height="4"/><rect x="6" y="-42" width="4" height="4"/><rect x="16" y="-72" width="4" height="4"/></g>`,
      prop: `<g class="pp-fanhand">${FAN}</g>`,
      idle(t) { return { h: 2 * S(t * 0.8), f1: -25, f2: -100 + 14 * S(t * 1.5), b1: 26, b2: -40 }; }
    },
    sun: {
      top: '#56677a', skirt: '#46566a', arm: '#56677a', armB: '#46566a', L1: 40, L2: 36,
      hat: `<path d="M-17 -38 Q-15 -62 5 -62 Q20 -59 18 -44 Q0 -50 -17 -38 Z" fill="#2c3336" stroke="${INK}" stroke-width="2"/>`,
      extraHead: `<path d="M-14 -40 Q-24 -28 -18 -14" fill="none" stroke="${INK}" stroke-width="2"/><path d="M6 -44 Q12 -40 19 -42" fill="none" stroke="${INK}" stroke-width="2"/>`,
      torso: `<circle cx="10" cy="-120" r="7" fill="#7a1a12" opacity=".75"/><circle cx="-6" cy="-142" r="4" fill="#7a1a12" opacity=".6"/><path d="M-12 -70 l8 10 l-6 8" fill="none" stroke="${HOLE}" stroke-width="2"/>` +
        `<rect x="-24" y="-102" width="50" height="6" fill="#2c3336" stroke="${INK}" stroke-width="1.5"/>`,
      neck: `<g class="pp-jia"><rect x="-48" y="-190" width="102" height="16" fill="#6b4426" stroke="${INK}" stroke-width="2.5"/><path d="M-40 -182 h20 M30 -182 h18" stroke="${HOLE}" stroke-width="1.5"/></g>`,
      prop: '',
      idle(t) { return { h: 10 + 2 * S(t * 1.3), f1: 4, f2: -10, b1: 2, b2: -8 }; }
    },
    han: {
      top: '#9e2a22', skirt: '#7e2019', arm: '#9e2a22', armB: '#7e2019', L1: 42, L2: 38, hat: WING_HAT,
      extraHead: `<path d="M18 -15 Q24 2 15 16 Q9 22 6 10 Q4 -2 8 -8 Z" fill="${INK}"/><path d="M5 -42 Q12 -47 21 -42" fill="none" stroke="${INK}" stroke-width="4"/>`,
      torso: `<rect x="-24" y="-103" width="50" height="9" fill="#c9a646" fill-opacity=".9" stroke="${INK}" stroke-width="2"/>` +
        `<g fill="none" stroke="${HOLE}" stroke-width="2"><path d="M-8 -150 q8 -8 16 0 q-8 8 -16 0 Z"/><path d="M2 -126 q8 -8 16 0 q-8 8 -16 0 Z"/><path d="M-10 -60 q8 -8 16 0 q-8 8 -16 0 Z"/><path d="M6 -36 q8 -8 16 0 q-8 8 -16 0 Z"/></g>`,
      prop: '',
      idle(t) { return { h: 1.5 * S(t * 0.7), f1: -32, f2: -62, b1: 10, b2: -20 }; }
    },
    zhong: {
      top: '#6b4a2e', skirt: '#5a3d26', arm: '#6b4a2e', armB: '#5a3d26', L1: 40, L2: 36,
      hat: `<path d="M-16 -40 Q-14 -60 4 -60 Q18 -58 17 -44 Z" fill="#3a2a20" stroke="${INK}" stroke-width="2"/>`,
      extraHead: `<circle cx="26" cy="-32" r="4.5" fill="#d9412f"/>`,
      torso: `<rect x="-24" y="-102" width="50" height="7" fill="#3a2a20" stroke="${INK}" stroke-width="1.5"/><path d="M-10 -150 h18 M-6 -136 h20" stroke="${HOLE}" stroke-width="2"/>`,
      prop: `<rect x="-6" y="2" width="12" height="28" rx="3" fill="#8a5a2e" stroke="${INK}" stroke-width="2"/><path d="M-6 10 h12 M-6 20 h12" stroke="${INK}" stroke-width="1.2"/>`,
      idle(t) { return { x: 1.5 * S(t * 1.4), h: 4 * S(t * 1.4), f1: -22, f2: -64 + 6 * S(t * 2), b1: 8, b2: -10 }; }
    },
    pu: {
      top: '#6f6f68', skirt: '#5d5d57', arm: '#6f6f68', armB: '#5d5d57', L1: 38, L2: 34, lean: 9,
      hat: `<path d="M-16 -40 Q-14 -58 4 -58 Q18 -56 16 -44 Q0 -48 -16 -40 Z" fill="#e8e2d2" stroke="${INK}" stroke-width="2"/><circle cx="-8" cy="-58" r="7" fill="#e8e2d2" stroke="${INK}" stroke-width="2"/>`,
      extraHead: `<path d="M17 -15 Q20 -4 13 4 Q8 6 7 -4 Z" fill="#e8e2d2" stroke="${INK}" stroke-width="1.5"/><path d="M6 -41 Q12 -44 19 -41" fill="none" stroke="#e8e2d2" stroke-width="3"/>`,
      torso: `<rect x="-24" y="-102" width="50" height="6" fill="#3a3a36" stroke="${INK}" stroke-width="1.5"/><path d="M-4 -150 v30 M8 -146 v30" stroke="${HOLE}" stroke-width="1.5" opacity=".7"/>`,
      prop: '',
      idle(t) { return { h: 12 + 2 * S(t * 1.2), f1: -32, f2: -52, b1: -22, b2: -42 }; }
    },
    shadow: {
      top: INK, skirt: INK, arm: INK, armB: INK, L1: 42, L2: 38, solid: true, cloak: true, baseY: 202, scale: 0.55,
      hat: `<path d="M-16 -40 L-14 -78 L14 -78 L19 -43 Z" fill="${INK}"/>`,
      extraHead: '', torso: '',
      prop: `<g class="pp-fanhand" style="opacity:0">${FAN.replace(/#efe1b8/g, INK).replace(/fill-opacity=".6"/, 'fill-opacity="1"')}</g>`,
      idle(t) { return { f1: 6 * S(t * 8), f2: -10, b1: -6 * S(t * 8), b2: -10, y: -3 * Math.abs(S(t * 8)) }; }
    }
  };

  function arm(id, c, col, prop, op) {
    return `<g data-j="${id}1">` +
      `<rect x="-6.5" y="-5" width="13" height="${c.L1 + 10}" rx="6.5" fill="${col}" fill-opacity="${op}" stroke="${INK}" stroke-width="2.5"/>` +
      `<g data-j="${id}2" transform="translate(0 ${c.L1})">` +
        `<rect x="-6" y="-4" width="12" height="${c.L2 + 6}" rx="6" fill="${col}" fill-opacity="${op}" stroke="${INK}" stroke-width="2.5"/>` +
        `<g transform="translate(0 ${c.L2})">${prop || ''}<ellipse cx="0" cy="6" rx="5" ry="7" fill="${c.solid ? INK : SKIN}" fill-opacity="${c.solid ? 1 : 0.45}" stroke="${INK}" stroke-width="2"/></g>` +
        `<circle r="3" fill="${INK}"/>` +
      `</g><circle r="3.2" fill="${INK}"/></g>`;
  }

  function markup(key) {
    const c = DEF[key];
    const op = c.solid ? 1 : 0.9;
    const face = c.solid ? `<path d="${FACE_D}" fill="${INK}"/>` : NAPE + FACE + EYE;
    const cloak = c.cloak
      ? `<g class="pp-cloak"><path d="M-6 -196 Q-40 -120 -58 -10 L58 -10 Q36 -120 22 -194 Z" fill="#3a2a1a" stroke="${INK}" stroke-width="3"/>` +
        `<path d="M-30 -120 l-10 40 M-14 -130 l-6 50 M4 -132 l2 54 M20 -124 l8 48 M-44 -60 l-6 40 M40 -60 l6 40 M0 -70 v50" stroke="#6b5232" stroke-width="2"/></g>`
      : '';
    const drop = c.fan && !c.solid ? `<g class="pp-fandrop" style="opacity:0" transform="translate(72 -40) rotate(-84)">${FAN}</g>` : '';
    return `<g data-j="root">
      <line data-r="n" stroke="${ROD}" stroke-width="2"/><line data-r="b" stroke="${ROD}" stroke-width="2"/><line data-r="f" stroke="${ROD}" stroke-width="2"/>
      ${arm('b', c, c.armB, '', op)}
      <path d="M-26 -95 L26 -95 L34 -8 L-34 -8 Z" fill="${c.skirt}" fill-opacity="${op}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-30 -8 L-6 -8 L-4 0 L-34 0 Z" fill="${INK}"/><path d="M8 -8 L32 -8 L44 0 L6 0 Z" fill="${INK}"/>
      <path d="M-22 -95 L-18 -170 Q0 -182 18 -172 L26 -130 Q28 -110 24 -95 Z" fill="${c.top}" fill-opacity="${op}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      ${c.torso}
      <g data-j="h">${face}${c.extraHead}${c.hat}<circle r="3" fill="${INK}"/></g>
      ${c.neck || ''}
      ${arm('f', c, c.arm, c.prop, op)}
      ${cloak}
    </g>${drop}`;
  }

  const NS = 'http://www.w3.org/2000/svg';

  class Puppet {
    constructor(key, parent) {
      this.key = key; this.c = DEF[key];
      this.g = document.createElementNS(NS, 'g');
      this.g.innerHTML = markup(key);
      parent.appendChild(this.g);
      const q = s => this.g.querySelector(s);
      this.el = { root: q('[data-j="root"]'), h: q('[data-j="h"]'), f1: q('[data-j="f1"]'), f2: q('[data-j="f2"]'), b1: q('[data-j="b1"]'), b2: q('[data-j="b2"]'),
        rn: q('[data-r="n"]'), rf: q('[data-r="f"]'), rb: q('[data-r="b"]'), reveal: q('.pp-reveal'), fanhand: q('.pp-fanhand'), fandrop: q('.pp-fandrop'), cloak: q('.pp-cloak'), jia: q('.pp-jia') };
      this.x = 320; this.dir = 1; this.sc = this.c.scale || 1; this.baseY = this.c.baseY || 350;
      this.state = 'idle'; this.stT0 = 0; this.speaking = false; this.kneel = false; this.jia = false;
      this.tween = null;
      if (this.el.jia) this.el.jia.style.display = 'none';
    }
    setJia(v) { this.jia = v; if (this.el.jia) this.el.jia.style.display = v ? '' : 'none'; }
    setState(s, now) {
      this.state = s; this.stT0 = now;
      const rev = s === 'reveal';
      if (this.el.reveal && rev) this.el.reveal.style.opacity = 1;
      if (this.el.fanhand && this.key === 'zhou') this.el.fanhand.style.opacity = rev ? 0 : 1;
      if (this.el.fandrop) this.el.fandrop.style.opacity = rev ? 1 : 0;
      if (this.key === 'shadow' && this.el.fanhand) this.el.fanhand.style.opacity = s === 'throwfan' ? 1 : 0;
    }
    moveTo(x, ms, now) { this.tween = { x0: this.x, x1: x, t0: now, ms }; }
    destroy() { this.g.remove(); }
    pose(t, st) {
      const b = Object.assign({ x: 0, y: 0, h: 0, f1: 0, f2: 0, b1: 0, b2: 0 }, this.c.idle(t));
      switch (this.state) {
        case 'shock': Object.assign(b, { h: -14, f1: -95, f2: -40, b1: -80, b2: -30 }); b.x += st < 0.5 ? 4 * S(st * 80) : 0; break;
        case 'sad': Object.assign(b, { h: 16, f1: 4, f2: -6, b1: 2, b2: -4, x: 0, y: 0 }); break;
        case 'point': Object.assign(b, { h: -4, f1: -86, f2: -6 }); break;
        case 'slam': Object.assign(b, st < 0.16 ? { f1: -150, f2: -30 } : { f1: -40, f2: -40 }); break;
        case 'reveal': Object.assign(b, { h: -12 + (st < 1.2 ? 2 * S(st * 40) : 0), f1: 14, f2: -18, b1: 8, b2: -10, x: 0 }); break;
        case 'nod': b.h += st < 1 ? 10 * Math.abs(S(st * 6)) : 0; break;
      }
      if (this.speaking && (this.state === 'idle' || this.state === 'nod')) b.h += 2.5 * S(t * 11);
      return b;
    }
    update(t, now, still) {
      if (this.tween) {
        const k = Math.min(1, (now - this.tween.t0) / this.tween.ms);
        this.x = this.tween.x0 + (this.tween.x1 - this.tween.x0) * k;
        if (k >= 1) this.tween = null;
      }
      const tt = still ? 0.6 : t;
      const st = (now - this.stT0) / 1000;
      const p = this.pose(tt, still ? 9 : st);
      if (this.key === 'shadow' && !this.tween) { p.y = 0; p.f1 = 0; p.b1 = 0; }
      const ky = this.kneel ? 46 : 0;
      const lean = this.c.lean || 0;
      this.g.setAttribute('transform', `translate(${(this.x + p.x).toFixed(1)} ${(this.baseY + p.y + ky).toFixed(1)}) scale(${this.dir * this.sc} ${this.sc}) rotate(${lean})`);
      const e = this.el;
      e.h.setAttribute('transform', `translate(${NECK[0]} ${NECK[1]}) rotate(${p.h.toFixed(2)})`);
      e.f1.setAttribute('transform', `translate(${SH_F[0]} ${SH_F[1]}) rotate(${p.f1.toFixed(2)})`);
      e.f2.setAttribute('transform', `translate(0 ${this.c.L1}) rotate(${p.f2.toFixed(2)})`);
      e.b1.setAttribute('transform', `translate(${SH_B[0]} ${SH_B[1]}) rotate(${p.b1.toFixed(2)})`);
      e.b2.setAttribute('transform', `translate(0 ${this.c.L1}) rotate(${p.b2.toFixed(2)})`);
      const hf = this.hand(SH_F, p.f1, p.f2), hb = this.hand(SH_B, p.b1, p.b2);
      this.rod(e.rf, hf); this.rod(e.rb, hb); this.rod(e.rn, [2, -150]);
      if (e.cloak) {
        if (this.state === 'throw' || this.state === 'throwfan') {
          const k = Math.min(1, st / 1.1);
          e.cloak.setAttribute('transform', `translate(${(30 * k).toFixed(1)} ${(260 * k * k).toFixed(1)}) rotate(${(50 * k).toFixed(1)})`);
          e.cloak.style.opacity = (1 - k).toFixed(2);
        } else { e.cloak.removeAttribute('transform'); e.cloak.style.opacity = 1; }
      }
    }
    hand(Sh, a1, a2) {
      const [ex, ey] = rot(0, this.c.L1, a1);
      const [hx, hy] = rot(...rot(0, this.c.L2 + 6, a2), a1);
      return [Sh[0] + ex + hx, Sh[1] + ey + hy];
    }
    rod(ln, [x, y]) { ln.setAttribute('x1', x.toFixed(1)); ln.setAttribute('y1', y.toFixed(1)); ln.setAttribute('x2', (x * 0.5 - 18).toFixed(1)); ln.setAttribute('y2', 60); }
  }

  window.YY = window.YY || {};
  YY.Puppet = Puppet;
  YY.PUPPET_KEYS = Object.keys(DEF);
})();
