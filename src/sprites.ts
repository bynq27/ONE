// D 风格「手绘奇幻」美术：全部用代码画成 SVG，载入时预渲染成位图。
// 所有造型都是原创设计。
import { EnemyKind, TowerType } from './config';
import { GameMap, MAP_ORDER, MapId, getMap } from './map';

const OUT = '#2B1E16';
const RES = 2; // 预渲染倍率，保证高清屏清晰

const DEFS = `
<linearGradient id="stone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E4DBC8"/><stop offset="0.38" stop-color="#BDB29C"/><stop offset="1" stop-color="#6A604F"/></linearGradient>
<linearGradient id="stoneDark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#A7B4C2"/><stop offset="0.4" stop-color="#7E8C9C"/><stop offset="1" stop-color="#46505E"/></linearGradient>
<linearGradient id="roof" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#7EC0E8"/><stop offset="0.5" stop-color="#3D79AE"/><stop offset="1" stop-color="#22466E"/></linearGradient>
<linearGradient id="roofGreen" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#B6E27A"/><stop offset="0.5" stop-color="#5E9E36"/><stop offset="1" stop-color="#2F5E1C"/></linearGradient>
<linearGradient id="wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C98E52"/><stop offset="1" stop-color="#6E4423"/></linearGradient>
<linearGradient id="woodIce" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#CFE6F2"/><stop offset="1" stop-color="#6E8CA6"/></linearGradient>
<linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0FCFF"/><stop offset="0.45" stop-color="#8ED4F6"/><stop offset="1" stop-color="#2F7FBF"/></linearGradient>
<radialGradient id="orb" cx="0.38" cy="0.35" r="0.65"><stop offset="0" stop-color="#FFF8D0"/><stop offset="0.35" stop-color="#FFC24A"/><stop offset="0.75" stop-color="#E8521F"/><stop offset="1" stop-color="#8E1D0C"/></radialGradient>
<radialGradient id="glowO" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFC24A" stop-opacity="0.75"/><stop offset="1" stop-color="#FF8A2A" stop-opacity="0"/></radialGradient>
<radialGradient id="glowB" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#BFF0FF" stop-opacity="0.8"/><stop offset="1" stop-color="#6CC8F0" stop-opacity="0"/></radialGradient>
<radialGradient id="canopy" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stop-color="#A9DA62"/><stop offset="0.55" stop-color="#5A9A32"/><stop offset="1" stop-color="#2E5E1E"/></radialGradient>
<radialGradient id="slime" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stop-color="#E9A6FF"/><stop offset="0.6" stop-color="#A55AD0"/><stop offset="1" stop-color="#5E2A86"/></radialGradient>
<radialGradient id="slimeKing" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stop-color="#FFB0D8"/><stop offset="0.6" stop-color="#C8407E"/><stop offset="1" stop-color="#6E1A44"/></radialGradient>
<radialGradient id="rock" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#C9C2B4"/><stop offset="0.6" stop-color="#8A8274"/><stop offset="1" stop-color="#4E483E"/></radialGradient>
<radialGradient id="rockDark" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#9AA0A8"/><stop offset="0.6" stop-color="#5E646C"/><stop offset="1" stop-color="#2E3238"/></radialGradient>
<linearGradient id="fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9B98E"/><stop offset="1" stop-color="#8A6440"/></linearGradient>
<linearGradient id="furDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E8A9A"/><stop offset="1" stop-color="#3E3A48"/></linearGradient>
`;

const svgDoc = (vb: [number, number, number, number], body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${vb[2] * RES}" height="${vb[3] * RES}" viewBox="${vb.join(' ')}"><defs>${DEFS}</defs>${body}</svg>`;

const shadow = (rx: number, ry = rx * 0.3, op = 0.35) => `<ellipse cx="0" cy="4" rx="${rx}" ry="${ry}" fill="#1E2A10" opacity="${op}"/>`;
const star2Trim = (y: number, w: number) => `<path d="M${-w} ${y} A${w} ${w * 0.3} 0 0 0 ${w} ${y}" fill="none" stroke="#F2C14E" stroke-width="2.5"/>`;

// ---------------- 塔 ----------------
function towerBody(type: TowerType, star: number): string {
  const s2 = star >= 2;
  switch (type) {
    case 'sentry':
      return `${shadow(23)}
<path d="M-15 2 L-15 -26 L15 -26 L15 2 A15 5 0 0 1 -15 2 Z" fill="url(#stone)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-15 -14 A15 4 0 0 0 15 -14 M-5 -26 v12 M7 -14 v14" stroke="#5E5546" stroke-width="1.5" fill="none" opacity="0.7"/>
<path d="M-5 4 v-9 a5 5 0 0 1 10 0 v9" fill="#3A2A1E" stroke="${OUT}" stroke-width="2"/>
${s2 ? star2Trim(-18, 15) : ''}
<ellipse cx="0" cy="-26" rx="19" ry="6" fill="#D6CDBA" stroke="${OUT}" stroke-width="2.5"/>
<path d="M-21 -28 L0 -56 L21 -28 Q0 -19 -21 -28 Z" fill="url(#roof)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-9 -32 L-2 -50" stroke="#CDEBFA" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>
<line x1="0" y1="-56" x2="0" y2="-64" stroke="${OUT}" stroke-width="2"/>
<path d="M0 -64 l${s2 ? 14 : 10} 2.5 l-${s2 ? 14 : 10} 3.5 z" fill="${star >= 3 ? '#FF6A4A' : '#E8B83A'}" stroke="${OUT}" stroke-width="1.5" stroke-linejoin="round"/>`;
    case 'brazier':
      return `${shadow(25)}
<path d="M-21 2 L-17 -18 L17 -18 L21 2 A21 6 0 0 1 -21 2 Z" fill="url(#stone)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-8 -6 h5 M4 -10 h5 M-2 -2 h4" stroke="#F0742A" stroke-width="2.5" stroke-linecap="round"/>
${s2 ? star2Trim(-10, 19) : ''}
<ellipse cx="0" cy="-18" rx="17" ry="5.5" fill="#8C8170" stroke="${OUT}" stroke-width="2.5"/>
<path d="M-13 -22 Q-12 -12 0 -12 Q12 -12 13 -22 Z" fill="#4A3B30" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<circle cx="0" cy="-32" r="${10 + (star - 1)}" fill="url(#orb)" stroke="${OUT}" stroke-width="2"/>
<path d="M-5 -38 q1 -10 6 -15 q-1 8 4 12 q-2 -2 -4 1 z" fill="#FFD36B" opacity="0.95"/>`;
    case 'frost':
      return `${shadow(21)}
<path d="M-16 2 L-14 -12 L14 -12 L16 2 A16 5 0 0 1 -16 2 Z" fill="url(#stone)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
${s2 ? star2Trim(-4, 15) : ''}
<ellipse cx="0" cy="-12" rx="14" ry="4.5" fill="#C6DDE8" stroke="${OUT}" stroke-width="2.5"/>
<ellipse cx="0" cy="-13" rx="9" ry="2.5" fill="#BFF0FF"/>
<path d="M0 -60 L11 -40 L5 -22 L-5 -22 L-11 -40 Z" fill="url(#ice)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M0 -60 L2 -40 L5 -22 M2 -40 L11 -40" stroke="#F0FCFF" stroke-width="1.5" fill="none"/>
<path d="M-19 -38 l3 -7 l3 7 l-3 4 z M16 -48 l2.5 -5 l2.5 5 l-2.5 3 z" fill="#CFF3FF" stroke="${OUT}" stroke-width="1.5" stroke-linejoin="round"/>
${star >= 3 ? `<path d="M-22 -22 l2.5 -5 l2.5 5 l-2.5 3 z M18 -26 l2.5 -5 l2.5 5 l-2.5 3 z" fill="#CFF3FF" stroke="${OUT}" stroke-width="1.5"/>` : ''}`;
    case 'ballista':
      return `${shadow(23)}
<path d="M-15 3 L-11 -10 M15 3 L11 -10 M0 5 L0 -10" stroke="#4A2E18" stroke-width="5" stroke-linecap="round"/>
<ellipse cx="0" cy="-12" rx="21" ry="7.5" fill="url(#wood)" stroke="${OUT}" stroke-width="2.5"/>
${s2 ? `<ellipse cx="0" cy="-12" rx="17" ry="5" fill="none" stroke="#F2C14E" stroke-width="2"/>` : ''}
<rect x="-4" y="-50" width="8" height="38" rx="2.5" fill="#7A4A26" stroke="${OUT}" stroke-width="2.5"/>
<path d="M-20 -36 Q0 -50 20 -36" fill="none" stroke="${OUT}" stroke-width="6" stroke-linecap="round"/>
<path d="M-20 -36 Q0 -50 20 -36" fill="none" stroke="#9C6A3A" stroke-width="3" stroke-linecap="round"/>
<path d="M-20 -36 L0 -27 L20 -36" fill="none" stroke="#F0E6CC" stroke-width="1.5"/>
<path d="M0 -62 l5 9 h-10 z" fill="#DDE3EA" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
<circle cx="0" cy="-12" r="3.5" fill="#9BEA5E" stroke="${OUT}" stroke-width="1.5"/>`;
    case 'steam':
      return `${shadow(25)}
<path d="M-21 2 L-17 -18 L17 -18 L21 2 A21 6 0 0 1 -21 2 Z" fill="url(#stoneDark)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-10 -6 h6 M4 -9 h6" stroke="#8ED4F6" stroke-width="2.5" stroke-linecap="round"/>
<path d="M-4 -2 h8" stroke="#F0742A" stroke-width="2.5" stroke-linecap="round"/>
${star2Trim(-10, 19)}
<ellipse cx="0" cy="-18" rx="17" ry="5.5" fill="#7E8C9C" stroke="${OUT}" stroke-width="2.5"/>
<path d="M-13 -22 Q-12 -12 0 -12 Q12 -12 13 -22 Z" fill="#3A3F4A" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M0 -44 A12 12 0 0 0 0 -20 Z" fill="url(#orb)" stroke="${OUT}" stroke-width="2"/>
<path d="M0 -44 A12 12 0 0 1 0 -20 Z" fill="url(#ice)" stroke="${OUT}" stroke-width="2"/>
<circle cx="-10" cy="-52" r="5" fill="#F2F2F2" stroke="${OUT}" stroke-width="1.5" opacity="0.9"/>
<circle cx="-2" cy="-58" r="6.5" fill="#FFFFFF" stroke="${OUT}" stroke-width="1.5" opacity="0.9"/>
<circle cx="8" cy="-53" r="4.5" fill="#E8E8E8" stroke="${OUT}" stroke-width="1.5" opacity="0.9"/>`;
    case 'repeater':
      return `${shadow(24)}
<path d="M-16 2 L-16 -28 L16 -28 L16 2 A16 5 0 0 1 -16 2 Z" fill="url(#stone)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-9 -20 v8 M0 -22 v8 M9 -20 v8" stroke="#2B1E16" stroke-width="3" stroke-linecap="round"/>
${star2Trim(-6, 16)}
<ellipse cx="0" cy="-28" rx="20" ry="6" fill="#D6CDBA" stroke="${OUT}" stroke-width="2.5"/>
<path d="M-23 -30 L0 -56 L23 -30 Q0 -21 -23 -30 Z" fill="url(#roofGreen)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-10 -34 L-2 -50" stroke="#E2F5C4" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>
<path d="M-12 -2 Q0 -10 12 -2" fill="none" stroke="#5A3820" stroke-width="3.5" stroke-linecap="round"/>
<path d="M-12 -2 L0 3 L12 -2" fill="none" stroke="#F0E6CC" stroke-width="1.2"/>
<line x1="0" y1="-56" x2="0" y2="-64" stroke="${OUT}" stroke-width="2"/>
<path d="M0 -64 l14 2.5 l-14 3.5 z" fill="#9BEA5E" stroke="${OUT}" stroke-width="1.5" stroke-linejoin="round"/>`;
    case 'icelance':
      return `${shadow(23)}
<path d="M-15 3 L-11 -10 M15 3 L11 -10 M0 5 L0 -10" stroke="#46505E" stroke-width="5" stroke-linecap="round"/>
<ellipse cx="0" cy="-12" rx="21" ry="7.5" fill="url(#woodIce)" stroke="${OUT}" stroke-width="2.5"/>
<ellipse cx="0" cy="-12" rx="17" ry="5" fill="none" stroke="#F2C14E" stroke-width="2"/>
<rect x="-4" y="-48" width="8" height="36" rx="2.5" fill="#5E6E80" stroke="${OUT}" stroke-width="2.5"/>
<path d="M-20 -34 Q0 -48 20 -34" fill="none" stroke="${OUT}" stroke-width="6" stroke-linecap="round"/>
<path d="M-20 -34 Q0 -48 20 -34" fill="none" stroke="#8ED4F6" stroke-width="3" stroke-linecap="round"/>
<path d="M-20 -34 L0 -25 L20 -34" fill="none" stroke="#F0FCFF" stroke-width="1.5"/>
<path d="M0 -64 L6 -50 L0 -44 L-6 -50 Z" fill="url(#ice)" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
<path d="M-17 -16 l2 -4 l2 4 l-2 3 z M14 -18 l2 -4 l2 4 l-2 3 z" fill="#CFF3FF" stroke="${OUT}" stroke-width="1.2"/>`;
  }
}

export const towerSvg = (type: TowerType, star: number) => svgDoc([-34, -70, 68, 80], towerBody(type, star));

// ---------------- 敌人 ----------------
function enemyBody(kind: EnemyKind): { vb: [number, number, number, number]; body: string } {
  switch (kind) {
    case 'slime':
      return { vb: [-16, -26, 32, 32], body: `${shadow(13, 4)}
<path d="M-12 0 C-13 -12 -6 -20 0 -20 C6 -20 13 -12 12 0 Q0 3 -12 0 Z" fill="url(#slime)" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
<ellipse cx="-5" cy="-14" rx="3" ry="2" fill="#FFFFFF" opacity="0.7"/>
<circle cx="-4" cy="-8" r="2.6" fill="#FFF6D8"/><circle cx="4" cy="-8" r="2.6" fill="#FFF6D8"/>
<circle cx="-3.5" cy="-7.5" r="1.3" fill="${OUT}"/><circle cx="4.5" cy="-7.5" r="1.3" fill="${OUT}"/>` };
    case 'slimeKing':
      return { vb: [-28, -50, 56, 56], body: `${shadow(24, 7)}
<path d="M-23 0 C-25 -22 -12 -36 0 -36 C12 -36 25 -22 23 0 Q0 5 -23 0 Z" fill="url(#slimeKing)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<ellipse cx="-10" cy="-26" rx="5" ry="3" fill="#FFFFFF" opacity="0.6"/>
<circle cx="-7" cy="-15" r="4.2" fill="#FFF6D8"/><circle cx="7" cy="-15" r="4.2" fill="#FFF6D8"/>
<circle cx="-6" cy="-14" r="2" fill="${OUT}"/><circle cx="8" cy="-14" r="2" fill="${OUT}"/>
<path d="M-6 -6 Q0 -2 6 -6" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>
<path d="M-12 -34 L-12 -46 L-6 -40 L0 -48 L6 -40 L12 -46 L12 -34 Z" fill="#F2C14E" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
<circle cx="0" cy="-38" r="2" fill="#E04A3A"/>` };
    case 'wolf':
      return { vb: [-20, -28, 40, 32], body: `${shadow(15, 4)}
<path d="M-10 -6 L-12 0 M-4 -5 L-5 0 M5 -6 L5 0 M10 -7 L12 0" stroke="#4A3220" stroke-width="3" stroke-linecap="round"/>
<path d="M-15 -10 Q-18 -16 -13 -14 Q-8 -17 2 -16 L8 -17 L11 -24 L13 -17 Q18 -15 17 -10 L10 -9 Q4 -4 -6 -6 Q-11 -5 -15 -10 Z" fill="url(#fur)" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
<circle cx="12" cy="-14" r="1.4" fill="#FFE07A"/>` };
    case 'wolfKing':
      return { vb: [-34, -50, 68, 54], body: `${shadow(28, 7)}
<path d="M-18 -10 L-21 0 M-7 -9 L-9 0 M9 -10 L9 0 M18 -12 L21 0" stroke="#2E2A36" stroke-width="5" stroke-linecap="round"/>
<path d="M-27 -18 Q-33 -30 -24 -26 Q-14 -31 4 -29 L14 -31 L19 -43 L23 -31 Q32 -27 31 -18 L18 -16 Q7 -8 -11 -11 Q-20 -9 -27 -18 Z" fill="url(#furDark)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-20 -24 q4 -4 10 -3 M-6 -26 q4 -3 9 -2" stroke="#B8B4C4" stroke-width="2" fill="none" stroke-linecap="round"/>
<circle cx="22" cy="-25" r="2.2" fill="#FF5A3A"/>
<path d="M10 -36 L10 -44 L14 -40 L18 -46 L22 -40 L26 -44 L26 -36 Z" fill="#F2C14E" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>` };
    case 'golem':
      return { vb: [-22, -36, 44, 42], body: `${shadow(18, 5, 0.4)}
<path d="M-15 0 L-18 -15 L-9 -28 L9 -28 L18 -15 L15 0 Q0 3 -15 0 Z" fill="url(#rock)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-9 -28 Q0 -33 9 -28 Q4 -24 -3 -25 Z" fill="#6FAE3A" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M-6 -16 h4 M3 -16 h4" stroke="#FF9A2A" stroke-width="3" stroke-linecap="round"/>
<path d="M-12 -6 L-4 -9 M6 -4 L12 -8" stroke="#4E483E" stroke-width="1.5"/>` };
    case 'colossus':
      return { vb: [-36, -66, 72, 72], body: `${shadow(32, 9, 0.45)}
<path d="M-30 -20 L-36 -34 L-26 -40 L-22 -26 Z M30 -20 L36 -34 L26 -40 L22 -26 Z" fill="url(#rockDark)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-26 0 L-30 -26 L-16 -50 L16 -50 L30 -26 L26 0 Q0 5 -26 0 Z" fill="url(#rockDark)" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/>
<path d="M-16 -50 Q0 -60 16 -50 Q8 -44 -4 -46 Z" fill="#5E9E36" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
<path d="M-11 -30 h8 M4 -30 h8" stroke="#6CE0FF" stroke-width="4" stroke-linecap="round"/>
<path d="M-14 -16 L-6 -10 L2 -18 L10 -10 L16 -16" fill="none" stroke="#6CE0FF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M-20 -6 L-10 -12 M10 -4 L20 -10" stroke="#2E3238" stroke-width="1.8"/>` };
    case 'shaman':
      return { vb: [-18, -44, 36, 48], body: `${shadow(13, 4)}
<line x1="11" y1="2" x2="13" y2="-34" stroke="#5A3820" stroke-width="3" stroke-linecap="round"/>
<path d="M-11 2 L-7 -20 Q0 -26 7 -20 L11 2 Q0 5 -11 2 Z" fill="#4E7A5A" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M-7 -6 L7 -6" stroke="#C9A04A" stroke-width="2"/>
<path d="M-8 -20 Q-9 -34 0 -36 Q9 -34 8 -20 Q0 -16 -8 -20 Z" fill="#3E5E48" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
<ellipse cx="0" cy="-24" rx="4.5" ry="3.5" fill="#1A120C"/>
<circle cx="-1.8" cy="-24" r="1" fill="#9BEA5E"/><circle cx="1.8" cy="-24" r="1" fill="#9BEA5E"/>
<circle cx="13" cy="-37" r="5" fill="#9BEA5E" stroke="${OUT}" stroke-width="1.8"/>
<circle cx="11.5" cy="-38.5" r="1.6" fill="#E6FFD0"/>` };
    case 'bat':
      return { vb: [-20, -16, 40, 22], body: `
<path d="M-4 -4 Q-12 -14 -18 -6 Q-12 -6 -11 -1 Q-7 -4 -4 0 Z M4 -4 Q12 -14 18 -6 Q12 -6 11 -1 Q7 -4 4 0 Z" fill="#5A3A7A" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
<circle cx="0" cy="-2" r="6" fill="#7A52A0" stroke="${OUT}" stroke-width="2"/>
<circle cx="-2" cy="-3" r="1.3" fill="#FFE07A"/><circle cx="2" cy="-3" r="1.3" fill="#FFE07A"/>` };
  }
}

// ---------------- 场景物件 ----------------
const treeSvg = () => svgDoc([-28, -62, 56, 70], `${shadow(20, 6)}
<path d="M-4 2 L-3 -16 L3 -16 L4 2 Z" fill="#6E4423" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-20 -22 C-26 -34 -16 -46 -6 -44 C-4 -58 14 -58 16 -44 C26 -44 28 -28 20 -20 C14 -12 -14 -12 -20 -22 Z" fill="url(#canopy)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-10 -40 q4 -6 10 -6" stroke="#C6EC8A" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8"/>`);

const castleSvg = () => svgDoc([-46, -64, 92, 74], `
<ellipse cx="0" cy="4" rx="42" ry="9" fill="#1E2A10" opacity="0.35"/>
<path d="M-38 4 L-38 -24 L-24 -24 L-24 -10 L24 -10 L24 -24 L38 -24 L38 4 Z" fill="url(#stone)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-26 4 L-26 -14 L26 -14 L26 4 Z" fill="url(#stone)" stroke="${OUT}" stroke-width="2.5"/>
<path d="M-26 -14 v-6 h7 v6 M-9 -14 v-6 h7 v6 M8 -14 v-6 h7 v6" fill="#D6CDBA" stroke="${OUT}" stroke-width="2"/>
<path d="M-42 -24 L-31 -44 L-20 -24 Z M20 -24 L31 -44 L42 -24 Z" fill="url(#roof)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-9 4 v-12 a9 9 0 0 1 18 0 v12 Z" fill="#6E4423" stroke="${OUT}" stroke-width="2.5"/>
<path d="M-9 -2 h18 M0 -17 v21" stroke="#3A2414" stroke-width="1.5"/>
<line x1="31" y1="-44" x2="31" y2="-60" stroke="${OUT}" stroke-width="2"/>
<path d="M31 -60 l14 3.5 l-14 4.5 z" fill="#3D79AE" stroke="${OUT}" stroke-width="1.5"/>`);

function groundSvg(map: GameMap): string {
  const lanes = map.def.lanes;
  const poly = (dy: number, attrs: string) => lanes.map((L) => `<polyline points="${L.map((p) => `${p.x},${p.y + dy}`).join(' ')}" fill="none" ${attrs} stroke-linejoin="round" stroke-linecap="round"/>`).join('');
  const tufts: string[] = [];
  let s = 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 960, y = rnd() * 600;
    tufts.push(`M${x.toFixed(0)} ${y.toFixed(0)} l3 -7 l3 7`);
  }
  const flowers: string[] = [];
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 960, y = rnd() * 600;
    const c = ['#FFF6D8', '#FFD25A', '#FF9AB0', '#C8B6FF'][i % 4];
    flowers.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2.6" fill="${c}" stroke="${OUT}" stroke-width="0.8"/>`);
  }
  const pebbles: string[] = [];
  for (let i = 0; i < 40; i++) {
    const P = lanes[i % lanes.length];
    const seg = Math.floor(rnd() * (P.length - 1));
    const a = P[seg], b = P[seg + 1], t = rnd();
    const horiz = a.y === b.y;
    const x = a.x + (b.x - a.x) * t + (horiz ? 0 : (rnd() - 0.5) * 28);
    const y = a.y + (b.y - a.y) * t + (horiz ? (rnd() - 0.5) * 28 : 0);
    pebbles.push(`<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(2.5 + rnd() * 2).toFixed(1)}" ry="${(1.6 + rnd()).toFixed(1)}" fill="#A8804E" stroke="#6E4E2C" stroke-width="0.8"/>`);
  }
  const rocks = map.rocks.map(([c, r]) => {
    const x = c * 40 + 20, y = r * 40 + 24;
    return `<ellipse cx="${x}" cy="${y + 6}" rx="16" ry="5" fill="#1E2A10" opacity="0.3"/><path d="M${x - 15} ${y + 6} C${x - 17} ${y - 6} ${x - 6} ${y - 14} ${x + 2} ${y - 12} C${x + 12} ${y - 10} ${x + 17} ${y - 2} ${x + 15} ${y + 6} Q${x} ${y + 9} ${x - 15} ${y + 6} Z" fill="url(#rock)" stroke="${OUT}" stroke-width="2"/><path d="M${x - 8} ${y - 6} q4 -4 9 -3" stroke="#E4DDD0" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${960 * RES}" height="${600 * RES}" viewBox="0 0 960 600"><defs>${DEFS}</defs>
<rect width="960" height="600" fill="#78A845"/>
<g opacity="0.55">
<ellipse cx="130" cy="70" rx="140" ry="60" fill="#8DBD55"/><ellipse cx="420" cy="300" rx="110" ry="60" fill="#8DBD55"/>
<ellipse cx="660" cy="390" rx="120" ry="50" fill="#8DBD55"/><ellipse cx="880" cy="120" rx="110" ry="70" fill="#8DBD55"/>
<ellipse cx="380" cy="80" rx="120" ry="50" fill="#6A9A3C"/><ellipse cx="120" cy="420" rx="120" ry="50" fill="#6A9A3C"/>
<ellipse cx="900" cy="330" rx="80" ry="60" fill="#6A9A3C"/><ellipse cx="640" cy="560" rx="160" ry="50" fill="#8DBD55"/>
<ellipse cx="300" cy="560" rx="130" ry="40" fill="#6A9A3C"/>
</g>
<path d="${tufts.join(' ')}" stroke="#4F7F2C" stroke-width="2" stroke-linecap="round" fill="none"/>
${flowers.join('')}
${map.def.waterSvg}
${poly(3, 'stroke="#3E5A22" stroke-width="54" opacity="0.45"')}
${poly(0, 'stroke="#8A6438" stroke-width="48"')}
${poly(0, 'stroke="#CBA06A" stroke-width="42"')}
${poly(-4, 'stroke="#DDBC88" stroke-width="22" opacity="0.7"')}
${pebbles.join('')}
${rocks}
${lanes.map((L) => { const y = L[0].y - 140; return `<g transform="translate(0,${y})"><path d="M-6 98 C10 90 32 96 36 116 C40 136 40 158 34 172 C28 184 6 186 -6 182 Z" fill="url(#rock)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-6 116 C8 112 22 120 22 134 L22 166 L-6 166 Z" fill="#1A120C" stroke="${OUT}" stroke-width="2.5"/></g>`; }).join('')}
</svg>`;
}

// ---------------- 载入 ----------------
export interface Sprite { img: HTMLCanvasElement; flash?: HTMLCanvasElement; w: number; h: number; ax: number; ay: number }

function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

async function makeSprite(svg: string, vb: [number, number, number, number], withFlash = false): Promise<Sprite> {
  const img = await loadSvg(svg);
  const c = document.createElement('canvas');
  c.width = vb[2] * RES; c.height = vb[3] * RES;
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  const sp: Sprite = { img: c, w: vb[2], h: vb[3], ax: -vb[0], ay: -vb[1] };
  if (withFlash) {
    const f = document.createElement('canvas');
    f.width = c.width; f.height = c.height;
    const fx = f.getContext('2d')!;
    fx.drawImage(c, 0, 0);
    fx.globalCompositeOperation = 'source-in';
    fx.fillStyle = '#FFFFFF';
    fx.fillRect(0, 0, f.width, f.height);
    sp.flash = f;
  }
  return sp;
}

export interface SpriteBank {
  tower: Map<string, Sprite>;
  enemy: Map<EnemyKind, Sprite>;
  tree: Sprite;
  castle: Sprite;
  ground: Map<MapId, HTMLCanvasElement>;
}

export const towerKey = (type: TowerType, star: number) => `${type}:${star}`;

export async function loadSprites(): Promise<SpriteBank> {
  const tower = new Map<string, Sprite>();
  const jobs: Promise<void>[] = [];
  const tvb: [number, number, number, number] = [-34, -70, 68, 80];
  for (const type of ['sentry', 'brazier', 'frost', 'ballista'] as TowerType[])
    for (const star of [1, 2, 3]) jobs.push(makeSprite(towerSvg(type, star), tvb).then((s) => { tower.set(towerKey(type, star), s); }));
  for (const type of ['steam', 'repeater', 'icelance'] as TowerType[])
    jobs.push(makeSprite(towerSvg(type, 2), tvb).then((s) => { tower.set(towerKey(type, 2), s); }));
  const enemy = new Map<EnemyKind, Sprite>();
  for (const kind of ['slime', 'wolf', 'golem', 'bat', 'shaman', 'slimeKing', 'wolfKing', 'colossus'] as EnemyKind[]) {
    const { vb, body } = enemyBody(kind);
    jobs.push(makeSprite(svgDoc(vb, body), vb, true).then((s) => { enemy.set(kind, s); }));
  }
  let tree!: Sprite, castle!: Sprite;
  jobs.push(makeSprite(treeSvg(), [-28, -62, 56, 70]).then((s) => { tree = s; }));
  jobs.push(makeSprite(castleSvg(), [-46, -64, 92, 74]).then((s) => { castle = s; }));
  const ground = new Map<MapId, HTMLCanvasElement>();
  for (const id of MAP_ORDER) {
    const cv = document.createElement('canvas');
    cv.width = 960 * RES; cv.height = 600 * RES;
    ground.set(id, cv);
    jobs.push(loadSvg(groundSvg(getMap(id))).then((img) => { cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height); }));
  }
  await Promise.all(jobs);
  return { tower, enemy, tree, castle, ground };
}


// 用于 UI 图标（商店、卡牌）
export function towerIconUrl(type: TowerType, star: number) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(towerSvg(type, star));
}
