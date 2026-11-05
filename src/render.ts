import { AFFIXES, ENEMIES, SHAMAN, SKILL, MAP_H, MAP_W, RANGE_Y_RATIO, TILE, TowerType } from './config';
import { Enemy, Game, Tower, towerStats, isSpecial } from './game';
import { Sprite, SpriteBank, towerKey } from './sprites';

export interface DragState {
  source: 'shop' | 'inv' | 'tower';
  type: TowerType; star: number; id?: number; index?: number;
  x: number; y: number; // 逻辑坐标（已加触屏偏移）
  tile: { c: number; r: number } | null;
  verdict: 'place' | 'merge' | 'move' | 'bad' | 'none';
}

export interface ViewState {
  selectedTower: number | null;
  selectedEnemy: number | null;
  drag: DragState | null;
  armed: { type: TowerType } | null; // 键盘/点按选中商店塔后，悬停格预览
  hover: { c: number; r: number } | null;
  skillArmed: boolean;
  pointer: { x: number; y: number } | null;
}

const OUT = '#2B1E16';
const TAU = Math.PI * 2;

export class Renderer {
  ctx: CanvasRenderingContext2D;
  dpr = 1;
  constructor(public canvas: HTMLCanvasElement, public sp: SpriteBank) {
    this.ctx = canvas.getContext('2d')!;
    this.resize(1);
  }

  resize(scale: number) {
    this.dpr = Math.min(3, (window.devicePixelRatio || 1) * scale);
    this.canvas.width = Math.round(MAP_W * this.dpr);
    this.canvas.height = Math.round(MAP_H * this.dpr);
  }

  private drawSprite(s: Sprite, x: number, y: number, sx = 1, sy = sx, alpha = 1, img: HTMLCanvasElement = s.img) {
    const c = this.ctx;
    c.save();
    c.globalAlpha *= alpha;
    c.translate(x, y);
    c.scale(sx, sy);
    c.drawImage(img, -s.ax, -s.ay, s.w, s.h);
    c.restore();
  }

  private ellipse(x: number, y: number, rx: number, ry: number) {
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  }

  private rangeEllipse(x: number, y: number, range: number, color: string, fill: string, dash = [10, 6]) {
    const c = this.ctx;
    const rx = range * TILE;
    this.ellipse(x, y, rx, rx * RANGE_Y_RATIO);
    c.fillStyle = fill;
    c.fill();
    c.setLineDash(dash);
    c.lineWidth = 2.5;
    c.strokeStyle = color;
    c.stroke();
    c.setLineDash([]);
  }

  draw(g: Game, v: ViewState) {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, MAP_W, MAP_H);
    c.save();
    if (g.shake > 0) {
      const k = g.shake * 8;
      c.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
    }
    c.drawImage(this.sp.ground.get(g.map.def.id)!, -4, -4, MAP_W + 8, MAP_H + 8);

    this.drawBuildHints(g, v);
    this.drawAuras(g);

    // 选中塔的射程
    const sel = v.selectedTower != null ? g.towers.find((t) => t.id === v.selectedTower) : null;
    if (sel && !v.drag) {
      const s = towerStats(sel.type, sel.star, g.relics);
      this.rangeEllipse(sel.x, sel.y + 4, s.range, '#F6D36A', 'rgba(255,231,160,0.16)');
    }
    const preview = v.drag ?? (v.armed && v.hover ? { type: v.armed.type, star: 1, tile: v.hover, verdict: g.canPlace(v.hover.c, v.hover.r) ? 'place' : 'bad' } as const : null);
    if (preview?.tile && (preview.verdict === 'place' || preview.verdict === 'move')) {
      const s = towerStats(preview.type, preview.star, g.relics);
      this.rangeEllipse(preview.tile.c * TILE + 20, preview.tile.r * TILE + 24, s.range, '#F6D36A', 'rgba(255,231,160,0.14)');
    }

    // 深度排序
    type Item = { y: number; draw: () => void };
    const items: Item[] = [];
    const BASE = g.map.def.base;
    for (const [tc, tr] of g.map.trees) items.push({ y: tr * TILE + 36, draw: () => this.drawSprite(this.sp.tree, tc * TILE + 20, tr * TILE + 34, 0.92) });
    items.push({ y: BASE.y + 14, draw: () => this.drawSprite(this.sp.castle, BASE.x - 20, BASE.y + 14) });
    for (const t of g.towers) {
      if (v.drag?.source === 'tower' && v.drag.id === t.id) {
        items.push({ y: t.y + 12, draw: () => this.drawTower(g, t, 0.35) });
        continue;
      }
      items.push({ y: t.y + 12, draw: () => this.drawTower(g, t, 1, sel === t) });
    }
    for (const e of g.enemies) items.push({ y: e.y + (e.def.flying ? 30 : 0), draw: () => this.drawEnemy(g, e, v.selectedEnemy === e.id) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    this.drawProjectiles(g);
    this.drawMeteors(g);
    this.drawFx(g);
    this.drawLaneForecast(g);
    this.drawSkillAim(g, v);
    this.drawGhost(g, v);
    c.restore();
  }

  private drawBuildHints(g: Game, v: ViewState) {
    const c = this.ctx;
    const active = v.drag || v.armed;
    if (!active) return;
    c.save();
    for (let r = 0; r < 15; r++)
      for (let col = 0; col < 24; col++) {
        if (!g.map.buildable(col, r) || g.occupied(col, r)) continue;
        c.fillStyle = 'rgba(255,255,255,0.07)';
        c.strokeStyle = 'rgba(255,255,255,0.18)';
        c.lineWidth = 1;
        c.beginPath();
        c.roundRect(col * TILE + 3, r * TILE + 3, TILE - 6, TILE - 6, 6);
        c.fill();
        c.stroke();
      }
    const tile = v.drag?.tile ?? v.hover;
    if (tile) {
      const verdict = v.drag ? v.drag.verdict : g.canPlace(tile.c, tile.r) ? 'place' : 'bad';
      const color = verdict === 'merge' ? '#F2C14E' : verdict === 'place' || verdict === 'move' ? '#9BEA5E' : '#FF6A5A';
      c.strokeStyle = color;
      c.lineWidth = 3;
      c.fillStyle = color + '33';
      c.beginPath();
      c.roundRect(tile.c * TILE + 2, tile.r * TILE + 2, TILE - 4, TILE - 4, 7);
      c.fill();
      c.stroke();
    }
    c.restore();
  }

  private drawAuras(g: Game) {
    const c = this.ctx;
    for (const t of g.towers) {
      if (t.type !== 'frost') continue;
      const s = towerStats(t.type, t.star, g.relics);
      const rx = s.range * TILE, ry = rx * RANGE_Y_RATIO;
      c.save();
      this.ellipse(t.x, t.y + 4, rx, ry);
      c.fillStyle = 'rgba(191,240,255,0.12)';
      c.fill();
      c.setLineDash([3, 8]);
      c.lineCap = 'round';
      c.lineWidth = 2;
      c.strokeStyle = 'rgba(230,250,255,0.55)';
      c.stroke();
      c.setLineDash([]);
      const p = (g.time * 0.6 + t.id * 0.37) % 1;
      this.ellipse(t.x, t.y + 4, rx * p, ry * p);
      c.strokeStyle = `rgba(230,250,255,${0.45 * (1 - p)})`;
      c.lineWidth = 2;
      c.stroke();
      c.restore();
    }
  }

  drawTower(g: Game, t: Tower, alpha = 1, selected = false) {
    const c = this.ctx;
    const sprite = this.sp.tower.get(towerKey(t.type, isSpecial(t.type) ? 2 : t.star))!;
    const base = isSpecial(t.type) ? 1.08 : 1 + 0.08 * (t.star - 1);
    const age = g.time - t.born;
    const pop = age < 0.35 ? 1 + 0.25 * Math.sin((age / 0.35) * Math.PI) : 1;
    const squash = 1 - 0.07 * t.recoil;
    const gx = t.x, gy = t.y + 12;
    c.save();
    c.globalAlpha = alpha;
    if (t.star >= 3 || isSpecial(t.type)) {
      const pulse = 0.5 + 0.5 * Math.sin(g.time * 3 + t.id);
      const grd = c.createRadialGradient(gx, gy - 30, 4, gx, gy - 30, 42);
      const col = isSpecial(t.type) ? '160,230,255' : '255,214,110';
      grd.addColorStop(0, `rgba(${col},${0.28 + 0.15 * pulse})`);
      grd.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = grd;
      c.beginPath();
      c.arc(gx, gy - 30, 42, 0, TAU);
      c.fill();
    }
    if (selected) {
      this.ellipse(gx, gy + 3, 26, 9);
      c.strokeStyle = '#F6D36A';
      c.lineWidth = 3;
      c.stroke();
    }
    this.drawSprite(sprite, gx, gy, base * pop * (2 - squash), base * pop * squash);
    // 火盆光晕
    if (t.type === 'brazier' || t.type === 'steam') {
      const pulse = 0.5 + 0.5 * Math.sin(g.time * 7 + t.id);
      const oy = gy - 32 * base;
      const grd = c.createRadialGradient(gx, oy, 2, gx, oy, 26);
      grd.addColorStop(0, `rgba(255,200,90,${0.35 + 0.25 * pulse})`);
      grd.addColorStop(1, 'rgba(255,140,40,0)');
      c.fillStyle = grd;
      c.beginPath();
      c.arc(gx, oy, 26, 0, TAU);
      c.fill();
    }
    // 星级标记
    const n = isSpecial(t.type) ? 2 : t.star;
    for (let i = 0; i < n; i++) {
      const sx = gx + (i - (n - 1) / 2) * 9;
      const sy = gy + 11;
      c.beginPath();
      c.moveTo(sx, sy - 4); c.lineTo(sx + 4, sy); c.lineTo(sx, sy + 4); c.lineTo(sx - 4, sy); c.closePath();
      c.fillStyle = isSpecial(t.type) ? '#8EE3FF' : '#F2C14E';
      c.fill();
      c.lineWidth = 1.5;
      c.strokeStyle = OUT;
      c.stroke();
    }
    if (t.stunned > 0) {
      c.fillStyle = 'rgba(40,30,20,0.25)';
      this.ellipse(gx, gy - 24, 24, 34);
      c.fill();
    }
    c.restore();
  }

  private drawEnemy(g: Game, e: Enemy, selected: boolean) {
    const c = this.ctx;
    const sp = this.sp.enemy.get(e.kind)!;
    const dyingK = e.dying > 0 ? Math.max(0, 1 - e.dying / 0.45) : 1;
    let sx = 1, sy = 1, oy = 0;
    const ph = e.phase;
    if (e.kind === 'slime' || e.kind === 'slimeKing') { const b = Math.sin(ph * 7); sy = 1 + 0.08 * b; sx = 1 - 0.06 * b; }
    else if (e.kind === 'wolf' || e.kind === 'wolfKing') { oy = -Math.abs(Math.sin(ph * (e.dashT > 0 ? 18 : 11))) * 3; }
    else if (e.kind === 'golem' || e.kind === 'colossus') { oy = -Math.abs(Math.sin(ph * 4)) * 1.5; sx = 1 + 0.02 * Math.sin(ph * 4); }
    else if (e.kind === 'bat') { sx = 0.75 + 0.25 * Math.abs(Math.sin(ph * 14)); }
    const fly = e.def.flying ? 26 + Math.sin(ph * 3) * 3 : 0;
    const frozen = e.freeze > 0;
    if (frozen) { sx = 1; sy = 1; oy = 0; }
    c.save();
    c.globalAlpha = dyingK;
    if (e.def.flying) {
      this.ellipse(e.x, e.y + 2, 11, 3.5);
      c.fillStyle = 'rgba(30,42,16,0.3)';
      c.fill();
    }
    const slowed = e.affix !== 'swift' && (e.auraSlow > 0 || e.timedSlowT > 0 || frozen);
    const af = e.affix ? AFFIXES[e.affix] : null;
    if (af && e.dying === 0) {
      const pulse = 0.6 + 0.4 * Math.sin(g.time * 5 + e.id);
      const r = e.def.radius + 7;
      this.ellipse(e.x, e.y + 2, r, r * 0.38);
      c.fillStyle = af.color + '55';
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = af.color;
      c.globalAlpha = dyingK * pulse;
      c.stroke();
      c.globalAlpha = dyingK;
    }
    if (slowed && !e.def.flying) {
      this.ellipse(e.x, e.y + 2, e.def.radius + 4, (e.def.radius + 4) * 0.35);
      c.fillStyle = 'rgba(191,240,255,0.75)';
      c.fill();
    }
    if (selected) {
      this.ellipse(e.x, e.y + 2, e.def.radius + 8, (e.def.radius + 8) * 0.4);
      c.strokeStyle = '#F6D36A';
      c.lineWidth = 2.5;
      c.stroke();
    }
    const scale = (e.dying > 0 ? 1 + 0.3 * (1 - dyingK) : 1) * (af && !e.def.boss ? 1.15 : 1);
    const dir = e.kind === 'wolf' || e.kind === 'wolfKing' ? e.dir : 1;
    const casting = e.kind === 'shaman' && e.castT > 0 && e.dying === 0;
    if (casting) {
      // 地面上的治疗范围随举杖逐渐亮起，提示玩家「快打断」
      const k = Math.min(1, e.castT / SHAMAN.cast);
      const R = SHAMAN.radius * TILE;
      this.ellipse(e.x, e.y + 2, R, R * RANGE_Y_RATIO);
      c.fillStyle = `rgba(155,234,94,${0.08 + 0.14 * k})`;
      c.fill();
      c.setLineDash([8, 6]);
      c.lineWidth = 2;
      c.strokeStyle = `rgba(155,234,94,${0.4 + 0.5 * k})`;
      c.stroke();
      c.setLineDash([]);
      this.ellipse(e.x, e.y + 2, R * k, R * k * RANGE_Y_RATIO);
      c.strokeStyle = '#C8FF8A';
      c.lineWidth = 2.5;
      c.stroke();
    }
    const body = casting ? this.sp.shamanCast : sp;
    const img = e.flash > 0 && body.flash ? body.flash : body.img;
    // 举杖时法杖从腰间抬到头顶：前 40% 做抬起的形变
    const lift = casting ? Math.min(1, e.castT / (SHAMAN.cast * 0.4)) : 1;
    this.drawSprite(body, e.x, e.y + oy - fly, sx * scale * dir, sy * scale * (casting ? 0.85 + 0.15 * lift : 1), 1, img);
    if (casting) {
      const k = Math.min(1, e.castT / SHAMAN.cast);
      const ox = e.x + 5 * scale * dir, oyy = e.y - 58 * scale * (0.85 + 0.15 * lift);
      const g2 = c.createRadialGradient(ox, oyy, 0, ox, oyy, 10 + 12 * k);
      g2.addColorStop(0, `rgba(230,255,200,${0.5 + 0.4 * k})`);
      g2.addColorStop(1, 'rgba(155,234,94,0)');
      c.fillStyle = g2;
      c.beginPath(); c.arc(ox, oyy, 10 + 12 * k, 0, TAU); c.fill();
    }
    if (frozen) {
      c.fillStyle = 'rgba(160,220,255,0.45)';
      c.strokeStyle = 'rgba(240,252,255,0.9)';
      c.lineWidth = 1.5;
      const r = e.def.radius;
      c.beginPath();
      c.roundRect(e.x - r - 2, e.y - r * 2 - 4, r * 2 + 4, r * 2 + 6, 4);
      c.fill();
      c.stroke();
    } else if (slowed) {
      c.fillStyle = '#E6FAFF';
      c.strokeStyle = OUT;
      c.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const ax = e.x + (i ? 9 : -11), ay = e.y - e.def.radius - fly - 2 + (i ? 4 : 0);
        c.beginPath(); c.moveTo(ax, ay - 5); c.lineTo(ax + 2.5, ay); c.lineTo(ax, ay + 3); c.lineTo(ax - 2.5, ay); c.closePath();
        c.fill(); c.stroke();
      }
    }
    if (af && e.affix === 'shield' && e.dying === 0) {
      c.strokeStyle = 'rgba(160,215,255,0.8)';
      c.lineWidth = 1.5;
      this.ellipse(e.x, e.y - e.def.radius - fly + oy, e.def.radius + 6, e.def.radius + 4);
      c.stroke();
    }
    if (e.burnT > 0 && e.dying === 0) {
      for (let i = 0; i < 3; i++) {
        const fx = e.x + (i - 1) * 7, fyy = e.y - e.def.radius - fly - ((g.time * 30 + i * 9) % 14);
        c.fillStyle = i % 2 ? '#FFD25A' : '#F06A22';
        c.beginPath(); c.arc(fx, fyy, 2.5, 0, TAU); c.fill();
      }
    }
    if (e.dashT > 0) {
      c.strokeStyle = 'rgba(255,255,255,0.7)';
      c.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        const yy = e.y - 10 - i * 7;
        c.moveTo(e.x - e.dir * 24, yy); c.lineTo(e.x - e.dir * 38, yy);
        c.stroke();
      }
    }
    // 血条
    if (e.dying === 0 && (e.hp < e.maxHp || e.def.boss)) {
      const w = e.def.boss ? 56 : 26, h = e.def.boss ? 7 : 5;
      const bx = e.x - w / 2, by = e.y - sp.ay - fly - 6;
      c.fillStyle = OUT;
      c.beginPath(); c.roundRect(bx - 1.5, by - 1.5, w + 3, h + 3, 3); c.fill();
      const k = Math.max(0, e.hp / e.maxHp);
      c.fillStyle = k > 0.5 ? '#7FD34E' : k > 0.25 ? '#F2C14E' : '#E8521F';
      c.beginPath(); c.roundRect(bx, by, w * k, h, 2); c.fill();
    }
    if (af && e.dying === 0) {
      const bx = e.x - (e.def.boss ? 28 : 13) - 11, by = e.y - sp.ay - fly - 4;
      c.beginPath(); c.arc(bx, by, 8, 0, TAU);
      c.fillStyle = af.color; c.fill();
      c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke();
      c.font = '900 10px "Noto Serif SC", serif';
      c.textAlign = 'center';
      c.fillStyle = OUT;
      c.fillText(af.mark, bx, by + 3.5);
    }
    c.restore();
  }

  private drawSkillAim(g: Game, v: ViewState) {
    if (!v.skillArmed || !v.pointer) return;
    const c = this.ctx;
    const rx = SKILL.radius * TILE;
    c.save();
    this.ellipse(v.pointer.x, v.pointer.y, rx, rx * RANGE_Y_RATIO);
    c.fillStyle = 'rgba(255,120,40,0.18)';
    c.fill();
    c.setLineDash([8, 6]);
    c.lineWidth = 3;
    c.strokeStyle = g.skillReady ? '#FFB547' : '#FF6A5A';
    c.stroke();
    c.restore();
  }

  private drawMeteors(g: Game) {
    const c = this.ctx;
    for (const m of g.meteors) {
      const k = Math.min(1, m.t / SKILL.delay);
      const rx = SKILL.radius * TILE;
      c.save();
      this.ellipse(m.x, m.y, rx * (0.3 + 0.7 * k), rx * (0.3 + 0.7 * k) * RANGE_Y_RATIO);
      c.fillStyle = `rgba(40,20,10,${0.15 + 0.25 * k})`;
      c.fill();
      const y = m.y - 420 * (1 - k), x = m.x - 160 * (1 - k);
      for (let i = 1; i <= 5; i++) {
        c.fillStyle = `rgba(255,170,60,${0.5 - i * 0.08})`;
        c.beginPath(); c.arc(x - i * 9, y - i * 22, 14 - i * 2, 0, TAU); c.fill();
      }
      const grd = c.createRadialGradient(x - 4, y - 4, 2, x, y, 16);
      grd.addColorStop(0, '#FFF8D0'); grd.addColorStop(0.4, '#FFC24A'); grd.addColorStop(1, '#C0300E');
      c.fillStyle = grd;
      c.strokeStyle = OUT;
      c.lineWidth = 2.5;
      c.beginPath(); c.arc(x, y, 15, 0, TAU); c.fill(); c.stroke();
      c.restore();
    }
  }

  private drawProjectiles(g: Game) {
    const c = this.ctx;
    for (const a of g.arrows) {
      c.save();
      c.translate(a.x, a.y);
      c.rotate(a.angle);
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(-26, 0); c.lineTo(-10, 0); c.stroke();
      c.strokeStyle = '#5A3820';
      c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(-12, 0); c.lineTo(6, 0); c.stroke();
      c.fillStyle = '#DDE3EA';
      c.strokeStyle = OUT;
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(6, -3); c.lineTo(12, 0); c.lineTo(6, 3); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#E04A3A';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(-12, 0); c.lineTo(-16, -4); c.moveTo(-12, 0); c.lineTo(-16, 4); c.stroke();
      c.restore();
    }
    for (const f of g.fireballs) {
      const k = f.t / f.dur;
      const x = f.sx + (f.tx - f.sx) * k;
      const y = f.sy + (f.ty - f.sy) * k - Math.sin(k * Math.PI) * 60;
      for (let i = 1; i <= 4; i++) {
        const kk = Math.max(0, k - i * 0.04);
        const tx = f.sx + (f.tx - f.sx) * kk, ty = f.sy + (f.ty - f.sy) * kk - Math.sin(kk * Math.PI) * 60;
        c.fillStyle = f.steam ? `rgba(230,245,255,${0.5 - i * 0.1})` : `rgba(255,170,60,${0.55 - i * 0.12})`;
        c.beginPath(); c.arc(tx, ty, 7 - i, 0, TAU); c.fill();
      }
      const grd = c.createRadialGradient(x - 2, y - 2, 1, x, y, 9);
      grd.addColorStop(0, '#FFF8D0');
      grd.addColorStop(0.4, f.steam ? '#8ED4F6' : '#FFC24A');
      grd.addColorStop(1, f.steam ? '#2F7FBF' : '#E8521F');
      c.fillStyle = grd;
      c.strokeStyle = OUT;
      c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill(); c.stroke();
    }
  }

  private drawFx(g: Game) {
    const c = this.ctx;
    for (const f of g.fx) {
      const k = f.t / f.dur;
      c.save();
      switch (f.kind) {
        case 'blast':
        case 'steamBlast': {
          const r = 14 + 40 * Math.min(1, k * 1.6);
          const grd = c.createRadialGradient(f.x, f.y - 6, 0, f.x, f.y - 6, r);
          if (f.kind === 'blast') {
            grd.addColorStop(0, `rgba(255,251,224,${1 - k})`);
            grd.addColorStop(0.35, `rgba(255,210,90,${0.9 * (1 - k)})`);
            grd.addColorStop(0.75, `rgba(240,106,34,${0.7 * (1 - k)})`);
            grd.addColorStop(1, 'rgba(192,48,14,0)');
          } else {
            grd.addColorStop(0, `rgba(255,255,255,${1 - k})`);
            grd.addColorStop(0.5, `rgba(200,236,255,${0.8 * (1 - k)})`);
            grd.addColorStop(1, 'rgba(142,212,246,0)');
          }
          c.fillStyle = grd;
          this.ellipse(f.x, f.y - 6, r, r * 0.8);
          c.fill();
          if (k < 0.5) {
            c.globalAlpha = 1 - k * 2;
            c.fillStyle = f.kind === 'blast' ? '#FFD25A' : '#F0FCFF';
            c.strokeStyle = f.kind === 'blast' ? '#C0300E' : '#2F7FBF';
            c.lineWidth = 2;
            c.beginPath();
            const n = 8, R = 26 + 20 * k, rr = 10;
            for (let i = 0; i < n * 2; i++) {
              const a = (i / (n * 2)) * TAU, rad = i % 2 ? rr : R;
              c.lineTo(f.x + Math.cos(a) * rad, f.y - 6 + Math.sin(a) * rad * 0.8);
            }
            c.closePath(); c.fill(); c.stroke();
          }
          c.globalAlpha = 0.8 * (1 - k);
          c.fillStyle = '#8C8478';
          for (let i = 0; i < 3; i++) {
            c.beginPath(); c.arc(f.x + (i - 1) * 20, f.y - 20 - k * 24 - (i % 2) * 6, 6 + k * 6, 0, TAU); c.fill();
          }
          break;
        }
        case 'beam':
        case 'iceBeam': {
          c.globalAlpha = 1 - k;
          c.lineCap = 'round';
          c.strokeStyle = f.kind === 'beam' ? 'rgba(255,242,168,0.45)' : 'rgba(142,212,246,0.5)';
          c.lineWidth = 10;
          c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x2!, f.y2!); c.stroke();
          c.strokeStyle = f.kind === 'beam' ? '#FFFBE0' : '#F0FCFF';
          c.lineWidth = 3;
          c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x2!, f.y2!); c.stroke();
          break;
        }
        case 'text':
        case 'leak': {
          const y = f.y - 26 * k;
          c.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
          const size = f.kind === 'leak' ? 22 : f.size ?? 16;
          c.font = `900 ${size}px Cinzel, "Noto Serif SC", serif`;
          c.textAlign = 'center';
          c.lineJoin = 'round';
          c.lineWidth = 4;
          c.strokeStyle = OUT;
          c.fillStyle = f.kind === 'leak' ? '#FF6A5A' : f.color ?? '#fff';
          const yy = f.kind === 'leak' ? f.y - 50 - 20 * k : y;
          c.strokeText(f.text!, f.x, yy);
          c.fillText(f.text!, f.x, yy);
          if (f.kind === 'leak' && k < 0.5) {
            c.globalAlpha = 0.4 * (1 - k * 2);
            c.fillStyle = '#FF3A2A';
            this.ellipse(f.x, f.y, 50, 30);
            c.fill();
          }
          break;
        }
        case 'coin': {
          const y = f.y - 30 * k;
          c.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
          const w = Math.abs(Math.cos(k * 10));
          c.fillStyle = '#F2C14E';
          c.strokeStyle = '#7A4A1E';
          c.lineWidth = 1.5;
          this.ellipse(f.x - 8, y, 6 * w + 1, 6);
          c.fill(); c.stroke();
          c.font = '900 13px Cinzel, serif';
          c.textAlign = 'left';
          c.lineWidth = 3;
          c.strokeStyle = OUT;
          c.fillStyle = '#FFE58A';
          c.strokeText(f.text!, f.x, y + 5);
          c.fillText(f.text!, f.x, y + 5);
          break;
        }
        case 'puff': {
          c.globalAlpha = 0.7 * (1 - k);
          c.fillStyle = '#E8DCC0';
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            const d = 10 + 18 * k;
            c.beginPath(); c.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.4, 6 - 3 * k, 0, TAU); c.fill();
          }
          break;
        }
        case 'shards': {
          c.globalAlpha = 1 - k;
          c.fillStyle = f.color ?? '#999';
          c.strokeStyle = OUT;
          c.lineWidth = 1;
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * TAU + 0.4;
            const d = 6 + 26 * k;
            const x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d * 0.6 - 18 * Math.sin(k * Math.PI);
            c.beginPath(); c.arc(x, y, 3.2 * (1 - k * 0.5), 0, TAU); c.fill(); c.stroke();
          }
          break;
        }
        case 'quake': {
          c.globalAlpha = 1 - k;
          c.strokeStyle = '#6E4E2C';
          c.lineWidth = 5;
          const r = 20 + 90 * k;
          this.ellipse(f.x, f.y, r, r * RANGE_Y_RATIO);
          c.stroke();
          c.strokeStyle = '#CBA06A';
          c.lineWidth = 2;
          this.ellipse(f.x, f.y, r * 0.7, r * 0.7 * RANGE_Y_RATIO);
          c.stroke();
          break;
        }
        case 'merge': {
          c.globalAlpha = 1 - k;
          c.strokeStyle = '#F2C14E';
          c.lineWidth = 4 * (1 - k) + 1;
          const r = 10 + 40 * k;
          this.ellipse(f.x, f.y + 6, r, r * 0.45);
          c.stroke();
          c.fillStyle = '#FFF2C0';
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU;
            const x = f.x + Math.cos(a) * r * 0.8, y = f.y - 20 + Math.sin(a) * r * 0.5 - 30 * k;
            c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 2, y); c.lineTo(x, y + 5); c.lineTo(x - 2, y); c.closePath(); c.fill();
          }
          const beam = c.createLinearGradient(f.x, f.y - 90, f.x, f.y);
          beam.addColorStop(0, 'rgba(255,230,140,0)');
          beam.addColorStop(1, `rgba(255,230,140,${0.5 * (1 - k)})`);
          c.fillStyle = beam;
          c.fillRect(f.x - 16, f.y - 90, 32, 90);
          break;
        }
        case 'heal': {
          c.globalAlpha = 1 - k;
          c.fillStyle = '#9BEA5E';
          c.strokeStyle = OUT;
          c.lineWidth = 1.5;
          const y = f.y - 10 - 18 * k;
          c.beginPath();
          c.rect(f.x - 2, y - 6, 4, 12); c.rect(f.x - 6, y - 2, 12, 4);
          c.fill(); c.stroke();
          break;
        }
        case 'healPulse': {
          c.globalAlpha = 0.8 * (1 - k);
          const r = 10 + (60 - 10) * k;
          this.ellipse(f.x, f.y, r, r * RANGE_Y_RATIO);
          c.fillStyle = 'rgba(155,234,94,0.15)';
          c.fill();
          c.strokeStyle = '#9BEA5E';
          c.lineWidth = 3;
          c.stroke();
          break;
        }
        case 'stun': {
          c.fillStyle = '#FFE07A';
          c.strokeStyle = OUT;
          c.lineWidth = 1;
          for (let i = 0; i < 3; i++) {
            const a = g.time * 5 + (i / 3) * TAU;
            const x = f.x + Math.cos(a) * 16, y = f.y - 62 + Math.sin(a) * 5;
            c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); c.stroke();
          }
          break;
        }
      }
      c.restore();
    }
  }

  // 每个出怪口旁边挂一块小牌子：这一路会来哪些怪、各几只
  private drawLaneForecast(g: Game) {
    if (g.phase !== 'build' && g.phase !== 'draft' && g.phase !== 'combat') return;
    const fc = g.laneForecast();
    const c = this.ctx;
    const multi = g.map.lanes.length > 1;
    const ICON = 24, GAP = 6, h = 32;
    c.save();
    c.globalAlpha = g.phase === 'combat' ? 0.75 : 1;
    c.textBaseline = 'middle';
    g.map.lanes.forEach((lane, i) => {
      const row = fc[i];
      if (!row.length) return;
      const label = multi ? g.map.def.laneNames[i] : (g.phase === 'combat' ? '待出' : '下一波');
      c.font = '900 13px "Noto Serif SC", serif';
      const labelW = c.measureText(label).width;
      c.font = '900 13px Cinzel, "Noto Serif SC", serif';
      const cells = row.map((it) => ({ ...it, tw: c.measureText(`×${it.count}`).width }));
      const w = 10 + labelW + 8 + cells.reduce((s, it) => s + ICON + 2 + it.tw + GAP, 0) + 4;
      const x = 6;
      // 备战时盖在路上（路上不能建塔，不挡视线）；战斗中挪到路下方，免得挡住刚出来的怪
      const combat = g.phase === 'combat';
      const y = combat ? lane.pts[0].y + 26 : lane.pts[0].y - h / 2;
      c.fillStyle = 'rgba(43,30,22,0.86)';
      c.strokeStyle = '#C8963E';
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(x, y, w, h, 8);
      c.fill();
      c.stroke();
      // 战斗中牌子在路下方：加个小三角指回这条路
      if (combat) {
      c.beginPath();
      c.moveTo(x + 14, y); c.lineTo(x + 20, y - 7); c.lineTo(x + 26, y);
      c.closePath();
      c.fill();
      }
      let cx = x + 10;
      c.font = '900 13px "Noto Serif SC", serif';
      c.fillStyle = '#E8D3A2';
      c.textAlign = 'left';
      c.fillText(label, cx, y + h / 2 + 1);
      cx += labelW + 8;
      c.font = '900 13px Cinzel, "Noto Serif SC", serif';
      for (const it of cells) {
        const def = ENEMIES[it.kind];
        const sp = this.sp.enemy.get(it.kind)!;
        const k = Math.min(ICON / sp.w, ICON / sp.h);
        // 精灵锚点在脚下：把它的可视中心对到格子中心
        const cyMid = y + h / 2;
        this.drawSprite(sp, cx + ICON / 2 + (sp.ax - sp.w / 2) * k, cyMid + (sp.ay - sp.h / 2) * k, k);
        if (def.boss) {
          c.strokeStyle = '#FF6A4A';
          c.lineWidth = 2;
          c.beginPath();
          c.arc(cx + ICON / 2, cyMid, ICON / 2 + 1, 0, TAU);
          c.stroke();
        }
        c.fillStyle = def.boss ? '#FF8A6A' : def.flying ? '#9FD4F2' : '#F6EBD2';
        c.fillText(`×${it.count}`, cx + ICON + 2, cyMid + 1);
        cx += ICON + 2 + it.tw + GAP;
      }
    });
    c.restore();
  }

  private drawGhost(g: Game, v: ViewState) {
    const d = v.drag;
    if (!d) return;
    const c = this.ctx;
    const sprite = this.sp.tower.get(towerKey(d.type, isSpecial(d.type) ? 2 : d.star))!;
    c.save();
    if (d.tile && (d.verdict === 'place' || d.verdict === 'move')) {
      this.drawSprite(sprite, d.tile.c * TILE + 20, d.tile.r * TILE + 32, 1, 1, 0.55);
    }
    this.drawSprite(sprite, d.x, d.y + 24, 0.9, 0.9, 0.9);
    if (d.verdict === 'merge' && d.tile) {
      const tgt = g.towerAt(d.tile.c, d.tile.r);
      if (tgt) {
        c.font = '900 15px "Noto Serif SC", serif';
        c.textAlign = 'center';
        c.lineWidth = 4;
        c.strokeStyle = OUT;
        c.fillStyle = '#FFE58A';
        c.strokeText('合成！', tgt.x, tgt.y - 66);
        c.fillText('合成！', tgt.x, tgt.y - 66);
      }
    }
    c.restore();
  }
}
