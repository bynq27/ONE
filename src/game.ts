import {
  AFFIX_LIST, Affix, ARMOR_PIERCE, HUNTER_BONUS, INTEREST_CAP, INTEREST_RATE, SKILL, ELITE_BOUNTY, ELITE_HP, BASIC_TOWERS, BUILD_TIME, DIFFICULTIES, Difficulty, DifficultyDef, BasicTower, CARD_WEIGHTS, EARLY_BONUS_PER_SEC, ENEMIES, EnemyDef, EnemyKind,
  MAX_STAR, MOVES_PER_WAVE, RANGE_Y_RATIO, RECIPES, RECIPE_GUARANTEE_BY_WAVE, RELICS, REROLL_COST, RelicId,
  STAR_DMG, STAR_RANGE, SpecialTower, TILE, TOWERS, SHAMAN,
  TOWER_CARD_STAR2_CHANCE, TowerType, hpScale, waveClearBonus,
} from './config';
import { GameMap, MapId, Pt, getMap, tileCenter } from './map';
import { Rng } from './rng';

export type Phase = 'title' | 'build' | 'combat' | 'draft' | 'won' | 'lost';

export interface Tower {
  id: number; type: TowerType; star: number; c: number; r: number; x: number; y: number;
  cd: number; spent: number; stunned: number; recoil: number; born: number; dealt: number;
}

export interface Enemy {
  id: number; kind: EnemyKind; def: EnemyDef; hp: number; maxHp: number; dist: number; x: number; y: number;
  auraSlow: number; timedSlow: number; timedSlowT: number; burnDps: number; burnT: number; burnSrc: number;
  freeze: number; freezeCd: number; skillT: number; dashT: number; flash: number; speedMul: number; bounty: number; affix: Affix | null; lane: number;
  dying: number; phase: number; dir: number;
}

export interface Arrow { id: number; x: number; y: number; target: number; dmg: number; angle: number; fireArrow: boolean; src: number }
export interface Fireball {
  src: number;
  sx: number; sy: number; tx: number; ty: number; t: number; dur: number; dmg: number; radius: number;
  steam: boolean;
}

export type FxKind = 'heal' | 'healPulse' | 'blast' | 'beam' | 'text' | 'coin' | 'puff' | 'shards' | 'quake' | 'merge' | 'steamBlast' | 'leak' | 'iceBeam' | 'stun';
export interface Fx { kind: FxKind; x: number; y: number; x2?: number; y2?: number; t: number; dur: number; text?: string; color?: string; size?: number; vx?: number; vy?: number }

export type Card =
  | { kind: 'tower'; type: BasicTower; star: number }
  | { kind: 'recipe'; id: SpecialTower }
  | { kind: 'relic'; id: RelicId };

export interface InvItem { type: BasicTower; star: number }

export type GameEvent =
  | 'shoot' | 'fire' | 'boom' | 'bolt' | 'hit' | 'kill' | 'coin' | 'merge' | 'build' | 'sell' | 'leak'
  | 'elite' | 'skill' | 'waveStart' | 'waveClear' | 'draft' | 'won' | 'lost' | 'deny' | 'boss' | 'quake' | 'pick';

export interface MergeCheck { ok: boolean; result?: { type: TowerType; star: number }; reason?: string }

export const isSpecial = (t: TowerType): t is SpecialTower => t === 'steam' || t === 'repeater' || t === 'icelance';

export function towerStats(type: TowerType, star: number, relics: Set<RelicId>) {
  const d = TOWERS[type];
  const s = isSpecial(type) ? 1 : star;
  let damage = d.damage * Math.pow(STAR_DMG, s - 1);
  const range = d.range + STAR_RANGE * (s - 1);
  let rate = d.rate;
  if ((type === 'sentry' || type === 'repeater') && relics.has('eagle')) rate *= 1.25;
  const fire = type === 'brazier' || type === 'steam';
  if (fire && relics.has('lava')) damage *= 1.2;
  let slow = 0;
  if (type === 'frost') slow = 0.3 + 0.1 * (star - 1);
  if (type === 'steam') slow = 0.2;
  if (slow && relics.has('permafrost')) slow += 0.1;
  const pierce = type === 'ballista' ? (star >= 3 ? 5 : 3) : type === 'icelance' ? 5 : 1;
  return { damage, range, rate, slow, pierce, air: d.air, fire };
}

export function inRange(tx: number, ty: number, range: number, x: number, y: number) {
  const rx = range * TILE, ry = rx * RANGE_Y_RATIO;
  const dx = (x - tx) / rx, dy = (y - ty) / ry;
  return dx * dx + dy * dy <= 1;
}

export class Game {
  phase: Phase = 'title';
  difficulty: Difficulty = 'easy';
  get diff(): DifficultyDef { return DIFFICULTIES[this.difficulty]; }
  seed = 0;
  rng = new Rng(1);
  eliteRng = new Rng(2);
  fxRng = new Rng(3);
  gold = 200;
  lives = 20;
  maxLives = 20;
  wave = 0; // 已开打的波次（1 起）
  buildTimer = 0;
  towers: Tower[] = [];
  enemies: Enemy[] = [];
  arrows: Arrow[] = [];
  fireballs: Fireball[] = [];
  meteors: { x: number; y: number; t: number }[] = [];
  skillCd = 0;
  fx: Fx[] = [];
  inventory: InvItem[] = [];
  relics = new Set<RelicId>();
  recipes = new Set<SpecialTower>();
  seenRecipeCard = false;
  cards: Card[] = [];
  rerolled = false;
  movesLeft = MOVES_PER_WAVE;
  time = 0;
  shake = 0;
  spawnQueue: { t: number; kind: EnemyKind; lane: number }[] = [];
  map: GameMap = getMap('valley');
  combatT = 0;
  stats = { kills: 0, merges: 0, goldEarned: 0, leaks: 0, startedAt: 0, interest: 0, dmg: {} as Record<string, number>, leaked: {} as Record<string, { count: number; lives: number; elite: number }> };
  listener: (e: GameEvent, data?: unknown) => void = () => {};
  private nextId = 1;

  newRun(seed: number, difficulty: Difficulty = 'easy', mapId: MapId = 'valley') {
    const d = DIFFICULTIES[difficulty];
    Object.assign(this, {
      map: getMap(mapId),
      phase: 'build', seed, difficulty, rng: new Rng(seed), eliteRng: new Rng(seed ^ 0x5bd1e995), fxRng: new Rng(seed + 7), gold: d.gold, lives: d.lives, maxLives: d.lives,
      wave: 0, buildTimer: Infinity, towers: [], enemies: [], arrows: [], fireballs: [], meteors: [], skillCd: 0, fx: [], inventory: [],
      relics: new Set(), recipes: new Set(), seenRecipeCard: false, cards: [], rerolled: false,
      movesLeft: MOVES_PER_WAVE, time: 0, shake: 0, spawnQueue: [], combatT: 0,
      stats: { kills: 0, merges: 0, goldEarned: 0, leaks: 0, startedAt: Date.now(), interest: 0, dmg: {}, leaked: {} },
    });
  }

  private emit(e: GameEvent, data?: unknown) { this.listener(e, data); }
  get nextWave() { return this.wave + 1; }
  get canBuild() { return this.phase === 'build' || this.phase === 'combat' || this.phase === 'draft'; }

  // ---------- 波次 ----------
  startWave() {
    if (this.phase !== 'build') return;
    if (this.diff.earlyBonus && isFinite(this.buildTimer) && this.buildTimer > 0) {
      const bonus = Math.floor(this.buildTimer) * EARLY_BONUS_PER_SEC;
      if (bonus > 0) { this.addGold(bonus); this.text(480, 300, `提前开波 +${bonus}`, '#F2C14E', 18); }
    }
    this.wave++;
    this.phase = 'combat';
    this.combatT = 0;
    this.spawnQueue = [];
    let t = 0;
    let groupStart = 0;
    const lanes = this.map.lanes.length;
    for (const grp of this.map.def.waves[this.wave - 1]) {
      if (grp.with) t = groupStart;
      t += grp.delay ?? 0;
      groupStart = t;
      const n = this.groupCount(grp);
      const gap = grp.interval; // 数量变多时波次变长，不压缩间隔（否则范围塔反而更强）
      for (let i = 0; i < n; i++) {
        const lane = grp.lane === 'alt' ? i % lanes : Math.min(lanes - 1, grp.lane ?? 0);
        this.spawnQueue.push({ t, kind: grp.kind, lane });
        t += gap;
      }
    }
    this.spawnQueue.sort((a, b) => a.t - b.t);
    this.emit('waveStart', this.wave);
  }

  interestPreview() { return Math.min(INTEREST_CAP, Math.floor(this.gold * INTEREST_RATE)); }

  private endWave() {
    const interest = this.interestPreview();
    if (interest > 0) { this.addGold(interest); this.stats.interest += interest; }
    let bonus = waveClearBonus(this.wave);
    if (this.relics.has('caravan')) bonus += 20;
    this.addGold(bonus);
    this.emit('waveClear', { bonus, interest });
    if (this.wave >= this.totalWaves) { this.phase = 'won'; this.emit('won'); return; }
    this.makeDraft();
    this.phase = 'draft';
    this.emit('draft');
  }

  private enterBuild() {
    this.phase = 'build';
    this.buildTimer = BUILD_TIME;
    this.movesLeft = MOVES_PER_WAVE;
  }

  // ---------- 三选一 ----------
  private makeDraft() {
    const cards: Card[] = [];
    const lockedRecipes = RECIPES.map((r) => r.id).filter((id) => !this.recipes.has(id));
    const freeRelics = (Object.keys(RELICS) as RelicId[]).filter((id) => !this.relics.has(id));
    const forceRecipe = !this.seenRecipeCard && this.wave + 1 >= RECIPE_GUARANTEE_BY_WAVE && lockedRecipes.length > 0;
    const key = (c: Card) => c.kind + ':' + (c.kind === 'tower' ? c.type + c.star : c.id);
    let guard = 0;
    while (cards.length < 3 && guard++ < 100) {
      let kind: Card['kind'];
      if (forceRecipe && !cards.some((c) => c.kind === 'recipe')) kind = 'recipe';
      else {
        const w = { ...CARD_WEIGHTS };
        if (!lockedRecipes.length) { w.tower += w.recipe; w.recipe = 0; }
        if (!freeRelics.length || cards.some((c) => c.kind === 'relic')) { w.tower += w.relic; w.relic = 0; }
        const roll = this.rng.next() * (w.tower + w.recipe + w.relic);
        kind = roll < w.tower ? 'tower' : roll < w.tower + w.recipe ? 'recipe' : 'relic';
      }
      let card: Card;
      if (kind === 'tower') card = { kind, type: this.rng.pick(BASIC_TOWERS), star: this.rng.next() < TOWER_CARD_STAR2_CHANCE ? 2 : 1 };
      else if (kind === 'recipe') { if (!lockedRecipes.length) continue; card = { kind, id: this.rng.pick(lockedRecipes) }; }
      else { if (!freeRelics.length) continue; card = { kind, id: this.rng.pick(freeRelics) }; }
      if (cards.some((c) => key(c) === key(card))) continue;
      cards.push(card);
    }
    if (cards.some((c) => c.kind === 'recipe')) this.seenRecipeCard = true;
    this.cards = cards;
    this.rerolled = false;
  }

  reroll() {
    if (this.phase !== 'draft' || this.rerolled || this.gold < REROLL_COST) { this.emit('deny'); return; }
    this.gold -= REROLL_COST;
    this.makeDraft();
    this.rerolled = true;
  }

  pickCard(i: number) {
    if (this.phase !== 'draft') return;
    const card = this.cards[i];
    if (!card) return;
    if (card.kind === 'tower') this.inventory.push({ type: card.type, star: card.star });
    else if (card.kind === 'recipe') this.recipes.add(card.id);
    else {
      this.relics.add(card.id);
      if (card.id === 'gate') { this.maxLives += 3; this.lives += 3; }
    }
    this.cards = [];
    this.emit('pick', card);
    this.enterBuild();
  }

  // ---------- 建造 / 合成 ----------
  towerAt(c: number, r: number) { return this.towers.find((t) => t.c === c && t.r === r); }
  occupied(c: number, r: number) { return !!this.towerAt(c, r); }
  canPlace(c: number, r: number) { return this.map.buildable(c, r) && !this.occupied(c, r); }

  checkMerge(src: { type: TowerType; star: number }, dst: Tower): MergeCheck {
    if (isSpecial(src.type) || isSpecial(dst.type)) return { ok: false, reason: '配方塔不能再合成' };
    if (src.type === dst.type) {
      if (src.star !== dst.star) return { ok: false, reason: '星级不同，不能合成' };
      if (dst.star >= MAX_STAR) return { ok: false, reason: '已经是最高星级' };
      return { ok: true, result: { type: dst.type, star: dst.star + 1 } };
    }
    const recipe = RECIPES.find((r) => (r.a === src.type && r.b === dst.type) || (r.b === src.type && r.a === dst.type));
    if (!recipe) return { ok: false, reason: '这两种塔没有配方' };
    if (src.star !== 2 || dst.star !== 2) return { ok: false, reason: '配方合成需要两座 ★★ 塔' };
    if (!this.recipes.has(recipe.id)) return { ok: false, reason: `配方「${TOWERS[recipe.id].name}」未解锁` };
    return { ok: true, result: { type: recipe.id, star: 2 } };
  }

  private applyMerge(dst: Tower, result: { type: TowerType; star: number }, addSpent: number) {
    dst.type = result.type;
    dst.star = result.star;
    dst.spent += addSpent;
    dst.cd = 0.2;
    dst.born = this.time;
    this.stats.merges++;
    if (this.relics.has('hammer')) { this.addGold(20); this.text(dst.x, dst.y - 50, '+20', '#F2C14E', 14); }
    this.fx.push({ kind: 'merge', x: dst.x, y: dst.y, t: 0, dur: 0.7 });
    this.emit('merge', dst);
  }

  private makeTower(type: TowerType, star: number, c: number, r: number, spent: number) {
    const p = tileCenter(c, r);
    const t: Tower = { id: this.nextId++, type, star, c, r, x: p.x, y: p.y, cd: 0.3, spent, stunned: 0, recoil: 0, born: this.time, dealt: 0 };
    this.towers.push(t);
    this.fx.push({ kind: 'puff', x: p.x, y: p.y + 10, t: 0, dur: 0.45 });
    this.emit('build', t);
    return t;
  }

  buyAt(type: BasicTower, c: number, r: number): boolean {
    const cost = this.cost(type);
    if (!this.canBuild) return false;
    const dst = this.towerAt(c, r);
    if (dst) {
      const m = this.checkMerge({ type, star: 1 }, dst);
      if (!m.ok || this.gold < cost) { this.deny(dst.x, dst.y, this.gold < cost ? '金币不足' : m.reason!); return false; }
      this.gold -= cost;
      this.applyMerge(dst, m.result!, cost);
      return true;
    }
    if (!this.canPlace(c, r)) { this.emit('deny'); return false; }
    if (this.gold < cost) { const p = tileCenter(c, r); this.deny(p.x, p.y, '金币不足'); return false; }
    this.gold -= cost;
    this.makeTower(type, 1, c, r, cost);
    return true;
  }

  placeInventory(i: number, c: number, r: number): boolean {
    const item = this.inventory[i];
    if (!item || !this.canBuild) return false;
    const value = this.cost(item.type) * Math.pow(2, item.star - 1);
    const dst = this.towerAt(c, r);
    if (dst) {
      const m = this.checkMerge(item, dst);
      if (!m.ok) { this.deny(dst.x, dst.y, m.reason!); return false; }
      this.inventory.splice(i, 1);
      this.applyMerge(dst, m.result!, value);
      return true;
    }
    if (!this.canPlace(c, r)) { this.emit('deny'); return false; }
    this.inventory.splice(i, 1);
    this.makeTower(item.type, item.star, c, r, value);
    return true;
  }

  dropTower(id: number, c: number, r: number): boolean {
    const src = this.towers.find((t) => t.id === id);
    if (!src) return false;
    if (src.c === c && src.r === r) return false;
    const dst = this.towerAt(c, r);
    if (dst) {
      const m = this.checkMerge(src, dst);
      if (!m.ok) { this.deny(dst.x, dst.y, m.reason!); return false; }
      this.towers = this.towers.filter((t) => t !== src);
      dst.dealt += src.dealt;
      this.applyMerge(dst, m.result!, src.spent);
      return true;
    }
    if (!this.canPlace(c, r)) { this.emit('deny'); return false; }
    if (this.movesLeft <= 0) { this.deny(src.x, src.y, '本波移动次数已用完'); return false; }
    this.movesLeft--;
    const p = tileCenter(c, r);
    Object.assign(src, { c, r, x: p.x, y: p.y });
    this.fx.push({ kind: 'puff', x: p.x, y: p.y + 10, t: 0, dur: 0.45 });
    this.emit('build', src);
    return true;
  }

  sell(id: number) {
    const t = this.towers.find((x) => x.id === id);
    if (!t) return;
    const refund = this.sellValue(t);
    this.towers = this.towers.filter((x) => x !== t);
    this.gold += refund;
    this.text(t.x, t.y - 40, `+${refund}`, '#F2C14E', 16);
    this.fx.push({ kind: 'puff', x: t.x, y: t.y + 10, t: 0, dur: 0.45 });
    this.emit('sell', t);
  }

  sellValue(t: Tower) { return Math.floor(t.spent * this.diff.sell); }
  cost(type: TowerType) { return Math.round(TOWERS[type].cost * this.diff.costMul); }

  private deny(x: number, y: number, msg: string) {
    this.text(x, y - 44, msg, '#FF8A7A', 14);
    this.emit('deny', msg);
  }

  private addGold(n: number) { this.gold += n; this.stats.goldEarned += n; }
  private text(x: number, y: number, text: string, color: string, size = 16) {
    this.fx.push({ kind: 'text', x, y, t: 0, dur: 0.9, text, color, size });
  }

  // ---------- 敌人 ----------
  private rollAffix(boss: boolean): Affix | null {
    const el = this.diff.elite;
    if (!el || this.wave < el.from) return null;
    if (boss) return el.boss ? this.eliteRng.pick(AFFIX_LIST.filter((a) => a !== 'split')) : null;
    const chance = el.chance + el.perWave * (this.wave - el.from);
    return this.eliteRng.next() < chance ? this.eliteRng.pick(AFFIX_LIST) : null;
  }

  private spawn(kind: EnemyKind, dist = 0, allowAffix = true, hpFrac = 1, lane = 0) {
    const def = ENEMIES[kind];
    const d = this.diff;
    const affix = allowAffix ? this.rollAffix(def.boss) : null;
    const eliteMul = affix && !def.boss ? ELITE_HP : 1;
    const hp = Math.max(1, Math.round((def.boss ? def.hp * d.bossHp : def.hp * hpScale(this.wave, d)) * eliteMul * hpFrac * this.map.def.hpMul));
    const p = def.flying ? this.map.flyPointAt(lane, dist) : this.map.pointAt(lane, dist);
    const e: Enemy = {
      id: this.nextId++, kind, def, hp, maxHp: hp, dist, lane, x: p.x, y: p.y, auraSlow: 0, timedSlow: 0, timedSlowT: 0,
      burnDps: 0, burnT: 0, burnSrc: 0, freeze: 0, freezeCd: 0, skillT: 0, dashT: 0, flash: 0, speedMul: d.speed * (affix === 'swift' ? 1.15 : 1), bounty: Math.max(1, Math.round(def.bounty * d.bounty * (affix ? ELITE_BOUNTY : 1) * hpFrac)), affix, dying: 0, phase: this.fxRng.next() * 6, dir: 1,
    };
    this.enemies.push(e);
    if (def.boss) { this.emit('boss', e); this.shake = Math.max(this.shake, 0.4); }
    else if (affix) this.emit('elite', e);
    return e;
  }

  progress(e: Enemy) { const L = this.map.lanes[e.lane]; return e.def.flying ? e.dist / L.flyLen : e.dist / L.len; }
  get totalWaves() { return this.map.def.waves.length; }
  alive(e: Enemy) { return e.dying === 0 && e.hp > 0; }

  private hurt(e: Enemy, amount: number, fire: boolean, src: number, showText = true, splash = false) {
    if (!this.alive(e)) return;
    const t = this.towers.find((x) => x.id === src);
    if (t && (t.type === 'sentry' || t.type === 'repeater') && (e.def.boss || e.affix)) amount *= HUNTER_BONUS;
    const sentryLike = t && (t.type === 'sentry' || t.type === 'repeater');
    const pen = t && (t.type === 'ballista' || t.type === 'icelance' || (sentryLike && this.relics.has('piercer'))) ? ARMOR_PIERCE : 0;
    let dmg = fire ? amount : amount * (1 - e.def.armor * (1 - pen));
    if (e.affix === 'shield' && splash) dmg *= 0.5;
    if (e.affix === 'tough' && showText && dmg > 30) dmg = 30 + (dmg - 30) * 0.5;
    if (src === -1) this.stats.dmg.skill = (this.stats.dmg.skill ?? 0) + Math.min(dmg, e.hp);
    if (t) {
      const real = Math.min(dmg, e.hp);
      t.dealt += real;
      this.stats.dmg[t.type] = (this.stats.dmg[t.type] ?? 0) + real;
    }
    e.hp -= dmg;
    if (showText) e.flash = 0.12;
    if (showText && dmg >= 1) {
      this.fx.push({ kind: 'text', x: e.x + (this.fxRng.next() - 0.5) * 14, y: e.y - e.def.radius * 2 - 8, t: 0, dur: 0.7, text: `-${Math.round(dmg)}`, color: fire ? '#FFD25A' : '#FFFFFF', size: e.def.boss ? 18 : 15 });
    }
    if (e.hp <= 0) this.kill(e);
  }

  private kill(e: Enemy) {
    e.hp = 0;
    e.dying = 0.0001;
    this.stats.kills++;
    this.addGold(e.bounty);
    this.fx.push({ kind: 'coin', x: e.x, y: e.y - 20, t: 0, dur: 0.8, text: `+${e.bounty}` });
    this.fx.push({ kind: 'shards', x: e.x, y: e.y - 8, t: 0, dur: 0.5, color: e.kind === 'golem' || e.kind === 'colossus' ? '#8A8274' : e.kind.startsWith('slime') ? '#A55AD0' : e.kind === 'bat' ? '#5A3A7A' : '#B08A60' });
    this.emit('kill', e);
    if (e.kind === 'slimeKing') {
      for (let i = 0; i < 4; i++) {
        const s = this.spawn('slime', Math.max(0, e.dist - 18 + i * 12), false, 1, e.lane);
        s.phase = i;
      }
      this.shake = Math.max(this.shake, 0.3);
    }
    if (e.affix === 'split') {
      const kind = e.def.boss ? 'slime' : e.kind;
      for (let i = 0; i < 2; i++) {
        const c = this.spawn(kind, Math.max(0, e.dist - 10 + i * 20), false, e.def.boss ? 1 : 0.35, e.lane);
        c.phase = i * 2;
      }
    }
    if (e.def.boss) this.shake = Math.max(this.shake, 0.5);
  }

  // ---------- 主更新 ----------
  update(dt: number) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    this.updateFx(dt);
    if (this.phase === 'title' || this.phase === 'won' || this.phase === 'lost') return;

    if (this.phase === 'build' && isFinite(this.buildTimer)) {
      this.buildTimer -= dt;
      if (this.buildTimer <= 0) { this.buildTimer = 0; this.startWave(); }
    }

    if (this.phase === 'combat') {
      this.combatT += dt;
      while (this.spawnQueue.length && this.spawnQueue[0].t <= this.combatT) { const q = this.spawnQueue.shift()!; this.spawn(q.kind, 0, true, 1, q.lane); }
    }

    this.updateEnemies(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.updateSkill(dt);

    this.enemies = this.enemies.filter((e) => !(e.dying > 0.45));
    if (this.phase === 'combat' && !this.spawnQueue.length && !this.enemies.some((e) => this.alive(e))) {
      this.enemies = [];
      this.endWave();
    }
  }

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      e.phase += dt;
      if (e.flash > 0) e.flash -= dt;
      if (e.dying > 0) { e.dying += dt; continue; }
      // 状态
      if (e.burnT > 0) { e.burnT -= dt; this.hurt(e, e.burnDps * dt, true, e.burnSrc, false); if (!this.alive(e)) continue; }
      if (e.timedSlowT > 0) { e.timedSlowT -= dt; if (e.timedSlowT <= 0) e.timedSlow = 0; }
      if (e.freezeCd > 0) e.freezeCd -= dt;
      if (e.affix === 'regen' && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * (e.def.boss ? 0.01 : 0.02) * dt);
      // Boss 技能
      if (e.kind === 'shaman') {
        e.skillT += dt;
        if (e.skillT >= SHAMAN.interval) {
          e.skillT = 0;
          const r = SHAMAN.radius * TILE;
          let healed = false;
          for (const o of this.enemies) {
            if (o === e || !this.alive(o) || o.hp >= o.maxHp) continue;
            if (Math.hypot(o.x - e.x, (o.y - e.y) / RANGE_Y_RATIO) > r) continue;
            o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (o.def.boss ? SHAMAN.bossHeal : SHAMAN.heal));
            this.fx.push({ kind: 'heal', x: o.x, y: o.y - o.def.radius, t: 0, dur: 0.6 });
            healed = true;
          }
          if (healed) this.fx.push({ kind: 'healPulse', x: e.x, y: e.y, t: 0, dur: 0.7 });
        }
      }
      if (e.kind === 'wolfKing') {
        e.skillT += dt;
        if (e.dashT > 0) e.dashT -= dt;
        if (e.skillT >= 8) { e.skillT = 0; e.dashT = 2; this.fx.push({ kind: 'puff', x: e.x, y: e.y, t: 0, dur: 0.5 }); }
      }
      if (e.kind === 'colossus') {
        e.skillT += dt;
        if (e.skillT >= 10) {
          e.skillT = 0;
          this.fx.push({ kind: 'quake', x: e.x, y: e.y, t: 0, dur: 0.8 });
          this.shake = Math.max(this.shake, 0.5);
          for (const t of this.towers) if (Math.hypot(t.x - e.x, t.y - e.y) <= 2 * TILE + 20) { t.stunned = 2; this.fx.push({ kind: 'stun', x: t.x, y: t.y, t: 0, dur: 2 }); }
          this.emit('quake');
        }
      }
      // 移动
      let speed = e.def.speed * e.speedMul * TILE;
      const dashing = e.dashT > 0;
      if (dashing) speed *= 2;
      else if (e.affix === 'swift') { e.freeze = 0; }
      else {
        const slow = Math.min(0.7, Math.max(e.auraSlow, e.timedSlow));
        speed *= 1 - slow;
        if (e.freeze > 0) { e.freeze -= dt; speed = 0; }
      }
      e.auraSlow = 0;
      const old = e.x;
      e.dist += speed * dt;
      const p = e.def.flying ? this.map.flyPointAt(e.lane, e.dist) : this.map.pointAt(e.lane, e.dist);
      e.x = p.x; e.y = p.y;
      if (Math.abs(e.x - old) > 0.01) e.dir = e.x > old ? 1 : -1;
      if (this.progress(e) >= 1) {
        e.dying = 0.3;
        e.hp = 0;
        this.lives -= e.def.leak;
        this.stats.leaks += e.def.leak;
        const rec = (this.stats.leaked[e.kind] ??= { count: 0, lives: 0, elite: 0 });
        rec.count++; rec.lives += e.def.leak; if (e.affix) rec.elite++;
        this.shake = Math.max(this.shake, 0.25);
        this.fx.push({ kind: 'leak', x: e.x, y: e.y, t: 0, dur: 0.6, text: `-${e.def.leak}` });
        this.emit('leak', e);
        if (this.lives <= 0) { this.lives = 0; this.phase = 'lost'; this.emit('lost'); return; }
      }
    }
  }

  private targets(t: Tower, range: number, air: boolean) {
    return this.enemies.filter((e) => this.alive(e) && (air || !e.def.flying) && inRange(t.x, t.y, range, e.x, e.y));
  }

  private updateTowers(dt: number) {
    for (const t of this.towers) {
      if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 4);
      if (t.stunned > 0) { t.stunned -= dt; continue; }
      const s = towerStats(t.type, t.star, this.relics);
      if (t.type === 'frost') {
        for (const e of this.targets(t, s.range, true)) {
          e.auraSlow = Math.max(e.auraSlow, s.slow);
          this.hurt(e, s.damage * dt, false, t.id, false);
        }
        continue;
      }
      t.cd -= dt;
      if (t.cd > 0) continue;
      const list = this.targets(t, s.range, s.air);
      if (!list.length) { t.cd = 0; continue; }
      list.sort((a, b) => this.progress(b) - this.progress(a));
      t.cd = 1 / s.rate;
      t.recoil = 1;
      const top = { x: t.x, y: t.y - 34 };
      const target = list[0];
      switch (t.type) {
        case 'sentry':
          this.arrows.push({ id: this.nextId++, x: top.x, y: top.y, target: target.id, dmg: s.damage, angle: 0, fireArrow: false, src: t.id });
          this.emit('shoot');
          break;
        case 'repeater':
          for (let i = 0; i < 3; i++) {
            const tg = list[Math.min(i, list.length - 1)];
            this.arrows.push({ id: this.nextId++, x: top.x + (i - 1) * 6, y: top.y, target: tg.id, dmg: s.damage, angle: 0, fireArrow: false, src: t.id });
          }
          this.emit('shoot');
          break;
        case 'brazier':
        case 'steam': {
          const lead = Math.min(0.5, 0.55);
          const aheadD = target.dist + target.def.speed * TILE * lead * 0.6;
          const ahead = target.def.flying ? this.map.flyPointAt(target.lane, aheadD) : this.map.pointAt(target.lane, aheadD);
          this.fireballs.push({ src: t.id, sx: t.x, sy: t.y - 32, tx: ahead.x, ty: ahead.y, t: 0, dur: 0.55, dmg: s.damage, radius: 0.85 * TILE, steam: t.type === 'steam' });
          this.emit('fire');
          break;
        }
        case 'ballista':
        case 'icelance':
          this.bolt(t, target, s.damage, s.range, s.pierce, t.type === 'icelance');
          this.emit('bolt');
          break;
      }
    }
  }

  private bolt(t: Tower, target: Enemy, dmg: number, range: number, pierce: number, ice: boolean) {
    const sx = t.x, sy = t.y - 30;
    const dx = target.x - sx, dy = target.y - 10 - sy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const reach = range * TILE * 1.15;
    const ex = sx + ux * reach, ey = sy + uy * reach;
    const hits: { e: Enemy; along: number }[] = [];
    for (const e of this.enemies) {
      if (!this.alive(e) || e.def.flying) continue;
      const px = e.x - sx, py = e.y - 10 - sy;
      const along = px * ux + py * uy;
      if (along < 0 || along > reach) continue;
      const perp = Math.abs(px * uy - py * ux);
      if (perp <= e.def.radius + 8) hits.push({ e, along });
    }
    hits.sort((a, b) => a.along - b.along);
    for (const h of hits.slice(0, pierce)) {
      this.hurt(h.e, dmg, false, t.id);
      if (ice && h.e.freezeCd <= 0 && this.alive(h.e) && !h.e.def.boss) { h.e.freeze = 0.6; h.e.freezeCd = 2.5; }
    }
    this.fx.push({ kind: ice ? 'iceBeam' : 'beam', x: sx, y: sy, x2: ex, y2: ey, t: 0, dur: 0.22 });
  }

  private updateProjectiles(dt: number) {
    const speed = 560;
    for (const a of this.arrows) {
      const e = this.enemies.find((x) => x.id === a.target);
      if (!e || !this.alive(e)) { a.dmg = 0; continue; }
      const tx = e.x, ty = e.y - e.def.radius;
      const dx = tx - a.x, dy = ty - a.y;
      const d = Math.hypot(dx, dy);
      a.angle = Math.atan2(dy, dx);
      if (d <= speed * dt + 4) { this.hurt(e, a.dmg, false, a.src); this.emit('hit'); a.dmg = 0; continue; }
      a.x += (dx / d) * speed * dt;
      a.y += (dy / d) * speed * dt;
    }
    this.arrows = this.arrows.filter((a) => a.dmg > 0);

    for (const f of this.fireballs) {
      f.t += dt;
      if (f.t >= f.dur) {
        for (const e of this.enemies) {
          if (!this.alive(e) || e.def.flying) continue;
          const dx = e.x - f.tx, dy = (e.y - f.ty) / RANGE_Y_RATIO;
          if (Math.hypot(dx, dy) <= f.radius + e.def.radius) {
            this.hurt(e, f.dmg, true, f.src, true, true);
            if (f.steam) {
              e.timedSlow = Math.max(e.timedSlow, 0.2 + (this.relics.has('permafrost') ? 0.1 : 0));
              e.timedSlowT = 1.5;
              e.burnDps = 5 * (this.relics.has('lava') ? 1.2 : 1);
              e.burnT = 2;
              e.burnSrc = f.src;
            }
          }
        }
        this.fx.push({ kind: f.steam ? 'steamBlast' : 'blast', x: f.tx, y: f.ty, t: 0, dur: 0.5 });
        this.emit('boom');
      }
    }
    this.fireballs = this.fireballs.filter((f) => f.t < f.dur);
  }

  // ---------- 主动技能：火雨 ----------
  get skillReady() { return this.skillCd <= 0 && this.phase === 'combat'; }
  castSkill(x: number, y: number): boolean {
    if (!this.skillReady) { this.emit('deny', this.phase !== 'combat' ? '火雨只能在战斗中使用' : '火雨还在冷却'); return false; }
    this.skillCd = SKILL.cooldown;
    this.meteors.push({ x, y, t: 0 });
    this.emit('skill');
    return true;
  }

  private updateSkill(dt: number) {
    if (this.skillCd > 0) this.skillCd = Math.max(0, this.skillCd - dt);
    for (const m of this.meteors) {
      m.t += dt;
      if (m.t < SKILL.delay) continue;
      const r = SKILL.radius * TILE;
      for (const e of this.enemies) {
        if (!this.alive(e)) continue;
        const ey = e.def.flying ? e.y : e.y;
        const dx = (e.x - m.x) / r, dy = (ey - m.y) / (r * RANGE_Y_RATIO);
        if (dx * dx + dy * dy <= 1) {
          this.hurt(e, SKILL.damage(this.wave), true, -1);
          if (this.alive(e)) { e.burnDps = Math.max(e.burnDps, 10); e.burnT = 3; e.burnSrc = -1; }
        }
      }
      this.fx.push({ kind: 'blast', x: m.x, y: m.y, t: 0, dur: 0.6 });
      this.fx.push({ kind: 'quake', x: m.x, y: m.y, t: 0, dur: 0.6 });
      this.shake = Math.max(this.shake, 0.35);
      this.emit('boom');
    }
    this.meteors = this.meteors.filter((m) => m.t < SKILL.delay);
  }

  private updateFx(dt: number) {
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.dur);
  }

  // 下一波预告
  wavePreview(n = this.nextWave) {
    const groups = this.map.def.waves[n - 1];
    if (!groups) return null;
    const total = groups.reduce((s, g) => s + this.groupCount(g), 0);
    const bats = groups.filter((g) => g.kind === 'bat').reduce((s, g) => s + this.groupCount(g), 0);
    const boss = groups.find((g) => ENEMIES[g.kind].boss);
    const lanes = this.map.lanes.map(() => 0);
    for (const g of groups) {
      const n = this.groupCount(g);
      if (g.lane === 'alt') for (let i = 0; i < n; i++) lanes[i % lanes.length]++;
      else lanes[Math.min(lanes.length - 1, g.lane ?? 0)] += n;
    }
    return { total, bats, boss: boss ? ENEMIES[boss.kind].name : null, lanes };
  }

  groupCount(g: { kind: EnemyKind; count: number }) {
    return ENEMIES[g.kind].boss ? g.count : Math.max(1, Math.round(g.count * this.diff.count));
  }

  towerPos(id: number): Pt | null {
    const t = this.towers.find((x) => x.id === id);
    return t ? { x: t.x, y: t.y } : null;
  }
}
