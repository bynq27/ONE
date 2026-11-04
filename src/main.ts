import './style.css';
import { MAP_ORDER, MAPS, MapId } from './map';
import { BASIC_TOWERS, BasicTower, DIFFICULTY_ORDER, Difficulty, MAP_H, MAP_W, TILE, TOWERS } from './config';
import { Audio } from './audio';
import { Card, Game, GameEvent } from './game';
import { DragState, Renderer, ViewState } from './render';
import { randomSeed } from './rng';
import { loadSprites } from './sprites';
import { UI } from './ui';

const STAGE_W = 960, STAGE_H = 704;
const SAVE_KEY = 'hecheng-td-save';

export type PerDiff = Record<Difficulty, number>;
export type PerMap = Record<MapId, PerDiff>;
interface Save { best: PerMap; wins: PerMap; muted: boolean; music: boolean; diff: Difficulty; map: MapId }
const zero = (): PerDiff => ({ easy: 0, hard: 0, nightmare: 0 });
const zeroMap = (): PerMap => ({ valley: zero(), river: zero() });
function loadSave(): Save {
  const s: Save = { best: zeroMap(), wins: zeroMap(), muted: false, music: true, diff: 'easy', map: 'valley' };
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    // 兼容旧存档：v0.1 是数字，v0.2–v0.8 是按难度记录，都算第一关
    const read = (v: unknown, into: PerMap) => {
      if (typeof v === 'number') into.valley.easy = v;
      else if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        if ('easy' in o || 'hard' in o || 'nightmare' in o) Object.assign(into.valley, o);
        else for (const id of MAP_ORDER) if (o[id]) Object.assign(into[id], o[id]);
      }
    };
    read(raw.best, s.best);
    read(raw.wins, s.wins);
    s.muted = !!raw.muted;
    if (raw.music === false) s.music = false;
    if (DIFFICULTY_ORDER.includes(raw.diff)) s.diff = raw.diff;
    if (MAP_ORDER.includes(raw.map)) s.map = raw.map;
  } catch { /* 存档损坏时用默认值 */ }
  return s;
}
function writeSave(s: Save) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* 无痕模式等 */ } }

const stage = document.getElementById('stage')!;
const canvas = document.getElementById('map') as HTMLCanvasElement;
const ui = new UI();
const audio = new Audio();
const game = new Game();
const save = loadSave();
audio.muted = save.muted;
audio.musicOn = save.music;
const view: ViewState = { selectedTower: null, selectedEnemy: null, drag: null, armed: null, hover: null, skillArmed: false, pointer: null };
let renderer: Renderer | null = null;
let scale = 1;
let paused = false;
let speed = 1;
const tipsShown = new Set<string>();

(window as unknown as { game: Game }).game = game; // 方便调试

// ---------- 缩放适配 ----------
function fit() {
  scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  const x = (window.innerWidth - STAGE_W * scale) / 2;
  const y = (window.innerHeight - STAGE_H * scale) / 2;
  stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  renderer?.resize(scale);
}
window.addEventListener('resize', fit);
fit();

// ---------- 事件 → 音效 / 提示 ----------
function tipOnce(key: string, text: string, ms = 6000) {
  if (tipsShown.has(key)) return;
  tipsShown.add(key);
  ui.showTip(text, ms);
}

game.listener = (e: GameEvent, data?: unknown) => {
  switch (e) {
    case 'shoot': audio.play('shoot'); break;
    case 'fire': audio.play('fire'); break;
    case 'boom': audio.play('boom'); break;
    case 'bolt': audio.play('bolt'); break;
    case 'hit': audio.play('hit'); break;
    case 'kill': audio.play('kill'); break;
    case 'merge': audio.play('merge'); refreshPopover(); break;
    case 'build': audio.play('build'); break;
    case 'sell': audio.play('sell'); break;
    case 'deny': audio.play('deny'); if (typeof data === 'string') ui.showTip(data, 1800); break;
    case 'leak': audio.play('leak'); ui.flashLives(); break;
    case 'boss': audio.play('boss'); ui.showTip(`Boss 登场：${(data as { def: { name: string; desc: string } }).def.name}——${(data as { def: { desc: string } }).def.desc}`, 4500); break;
    case 'quake': audio.play('quake'); break;
    case 'elite': audio.play('elite'); tipOnce('elite', '精英敌人登场：带彩色光环的敌人有特殊词缀（护盾、再生、疾行、分裂、坚韧），点它查看', 6000); break;
    case 'waveStart': {
      audio.play('wave');
      const w = data as number;
      if (game.map.def.waves[w - 1]?.some((gr) => gr.kind === 'shaman')) tipOnce('shaman', '萨满来了：它每 2 秒给周围的敌人回血，优先打掉它！（点它可以查看）', 6500);
      if (w === 2) tipOnce('skill', '战斗中可以点右下角的「火雨」（快捷键 Q），在任意位置落下火球救急，冷却 40 秒', 6000);
      if (w === 8) tipOnce('bat', '蝙蝠会直接飞向城门：只有哨塔、霜晶塔和连弩塔能打到它们');
      if (w === 6) tipOnce('golem', '石魔像有 30% 护甲：火焰伤害无视护甲');
      break;
    }
    case 'waveClear': { const d = data as { bonus: number; interest: number }; ui.showTip(`第 ${game.wave} 波通过 · 奖励 +${d.bonus} 金${d.interest ? ` · 利息 +${d.interest}` : ''}`, 2800); if (game.wave === 1) tipOnce('interest', '每波结束时，按手上金币的 10% 给利息（最多 30）：攒钱也是一种选择', 6000); break; }
    case 'skill': audio.play('skill'); break;
    case 'draft': audio.play('draft'); tipOnce('draft', '从三张卡里选一张：塔卡放进备用栏，配方卡解锁特殊塔，遗物全局生效', 6000); break;
    case 'pick': {
      audio.play('click');
      const c = data as Card;
      if (c.kind === 'tower') tipOnce('inv', '新塔放进了备用栏：把它拖到草地上，或拖到同类同星的塔上直接合成');
      if (c.kind === 'recipe') ui.showTip(`配方「${TOWERS[c.id].name}」已解锁：把两座指定的 ★★ 塔拖到一起即可合成`, 5000);
      if (game.nextWave === 2) tipOnce('merge', '把两座同类、同星级的塔拖到一起，就能合成升星：伤害 ×2.2，还空出一格', 7000);
      break;
    }
    case 'won': audio.play('win'); finish(true); break;
    case 'lost': audio.play('lose'); finish(false); break;
  }
};

function finish(won: boolean) {
  const d = game.difficulty, m = game.map.def.id;
  const wasLocked = MAP_ORDER.filter((id) => !unlocked(id));
  save.best[m][d] = Math.max(save.best[m][d], game.wave);
  if (won) save.wins[m][d]++;
  writeSave(save);
  const newly = wasLocked.find((id) => unlocked(id)) ?? null;
  cancelInteraction();
  ui.hidePopover();
  setTimeout(() => ui.showOverlay(ui.endHtml(game, won, newly)), won ? 600 : 900);
}

function unlocked(id: MapId) {
  const st = MAPS[id].stage;
  if (st === 1) return true;
  const prev = MAP_ORDER.find((x) => MAPS[x].stage === st - 1)!;
  return Object.values(save.wins[prev]).some((n) => n > 0);
}

function titleOverlay(seed = '') {
  ui.showOverlay(ui.titleHtml(save.best, save.wins, save.diff, save.map, MAP_ORDER.filter(unlocked), seed));
}

function startRun(seed: number) {
  if (!unlocked(save.map)) save.map = 'valley';
  game.newRun(seed, save.diff, save.map);
  paused = false;
  tipsShown.clear();
  cancelInteraction();
  ui.hidePopover();
  ui.hideOverlay();
  ui.showTip(game.map.lanes.length > 1 ? `第 ${game.map.def.stage} 关「${game.map.def.name}」：敌人分${game.map.def.laneNames.join('、')}两路进攻，在中部汇合` : '从下方商店把塔拖到草地上，准备好后点「开始第 1 波」', 7000);
}

function showTitle() {
  game.phase = 'title';
  game.towers = []; game.enemies = []; game.fx = [];
  titleOverlay();
}

// ---------- 输入 ----------
function toLogical(ev: PointerEvent | MouseEvent) {
  const r = stage.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / scale, y: (ev.clientY - r.top) / scale };
}
const tileOf = (x: number, y: number) => {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return null;
  return { c: Math.floor(x / TILE), r: Math.floor(y / TILE) };
};

interface Pending { source: DragState['source']; type: BasicTower | DragState['type']; star: number; id?: number; index?: number; sx: number; sy: number; touch: boolean }
let pending: Pending | null = null;

function cancelInteraction() {
  pending = null;
  view.drag = null;
  view.armed = null;
  view.skillArmed = false;
}

function judge(d: DragState) {
  const t = d.tile;
  if (!t) { d.verdict = 'none'; return; }
  const dst = game.towerAt(t.c, t.r);
  if (dst) {
    if (d.source === 'tower' && dst.id === d.id) { d.verdict = 'none'; return; }
    d.verdict = game.checkMerge({ type: d.type, star: d.star }, dst).ok ? 'merge' : 'bad';
    return;
  }
  d.verdict = game.canPlace(t.c, t.r) ? (d.source === 'tower' ? 'move' : 'place') : 'bad';
}

function onDown(ev: PointerEvent) {
  audio.unlock();
  if (!game.canBuild) return;
  const target = ev.target as HTMLElement;
  const p = toLogical(ev);
  const shopBtn = target.closest<HTMLElement>('.shop-item');
  const invBtn = target.closest<HTMLElement>('.inv-item');
  if (shopBtn) {
    const type = shopBtn.dataset.type as BasicTower;
    pending = { source: 'shop', type, star: 1, sx: p.x, sy: p.y, touch: ev.pointerType === 'touch' };
    ev.preventDefault();
    return;
  }
  if (invBtn) {
    const index = Number(invBtn.dataset.index);
    const it = game.inventory[index];
    if (!it) return;
    pending = { source: 'inv', type: it.type, star: it.star, index, sx: p.x, sy: p.y, touch: ev.pointerType === 'touch' };
    ev.preventDefault();
    return;
  }
  if (target !== canvas) return;
  if (view.skillArmed) {
    if (game.castSkill(p.x, p.y)) view.skillArmed = false;
    return;
  }
  const tile = tileOf(p.x, p.y);
  if (view.armed && tile) {
    game.buyAt(view.armed.type as BasicTower, tile.c, tile.r);
    if (!ev.shiftKey) view.armed = null;
    return;
  }
  const tw = tile ? game.towerAt(tile.c, tile.r) : undefined;
  if (tw) {
    pending = { source: 'tower', type: tw.type, star: tw.star, id: tw.id, sx: p.x, sy: p.y, touch: ev.pointerType === 'touch' };
    return;
  }
  // 点敌人
  let best: { id: number; d: number } | null = null;
  for (const e of game.enemies) {
    if (!game.alive(e)) continue;
    const ey = e.y - e.def.radius - (e.def.flying ? 26 : 0);
    const d = Math.hypot(e.x - p.x, ey - p.y);
    if (d < e.def.radius + 16 && (!best || d < best.d)) best = { id: e.id, d };
  }
  view.selectedTower = null;
  view.selectedEnemy = best ? best.id : null;
  if (!best) ui.hidePopover();
}

function onMove(ev: PointerEvent) {
  const p = toLogical(ev);
  view.hover = view.armed ? tileOf(p.x, p.y) : null;
  view.pointer = p.y < MAP_H ? p : null;
  if (!pending) return;
  const moved = Math.hypot(p.x - pending.sx, p.y - pending.sy) > 6;
  if (!view.drag && moved) {
    view.drag = { source: pending.source, type: pending.type, star: pending.star, id: pending.id, index: pending.index, x: p.x, y: p.y, tile: null, verdict: 'none' };
    view.armed = null;
    view.selectedTower = null;
    ui.hidePopover();
  }
  if (view.drag) {
    const off = pending.touch ? 60 : 0;
    view.drag.x = p.x;
    view.drag.y = p.y - off;
    view.drag.tile = tileOf(p.x, p.y - off);
    judge(view.drag);
  }
}

function onUp() {
  const pd = pending, d = view.drag;
  pending = null;
  view.drag = null;
  if (!pd) return;
  if (d) {
    if (!d.tile) return;
    if (d.source === 'shop') game.buyAt(d.type as BasicTower, d.tile.c, d.tile.r);
    else if (d.source === 'inv') game.placeInventory(d.index!, d.tile.c, d.tile.r);
    else game.dropTower(d.id!, d.tile.c, d.tile.r);
    return;
  }
  // 没拖动 = 点击
  if (pd.source === 'shop') {
    audio.play('click');
    view.armed = view.armed?.type === pd.type ? null : { type: pd.type };
    if (view.armed) tipOnce('armed', '点击草地放置；也可以直接把商店里的塔拖出去', 3500);
  } else if (pd.source === 'tower') {
    view.selectedEnemy = null;
    view.selectedTower = view.selectedTower === pd.id ? null : pd.id!;
    if (view.selectedTower == null) ui.hidePopover();
  } else if (pd.source === 'inv') {
    ui.showTip('把备用塔拖到草地上，或拖到同类同星的塔上合成', 3000);
  }
}

stage.addEventListener('pointerdown', onDown);
window.addEventListener('pointermove', onMove);
window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', () => { pending = null; view.drag = null; });
canvas.addEventListener('pointerleave', () => { view.hover = null; });
stage.addEventListener('contextmenu', (e) => e.preventDefault());

function refreshPopover() {
  if (view.selectedTower != null) ui.towerPopover(game, view.selectedTower);
}

document.addEventListener('click', (ev) => {
  const t = ev.target as HTMLElement;
  const mapBtn = t.closest<HTMLElement>('[data-map]');
  if (mapBtn) {
    audio.unlock();
    const id = mapBtn.dataset.map as MapId;
    if (!unlocked(id)) { audio.play('deny'); return; }
    audio.play('click');
    save.map = id;
    writeSave(save);
    const seed = (document.getElementById('seed-input') as HTMLInputElement | null)?.value ?? '';
    titleOverlay(seed.replace(/\D/g, ''));
    (document.querySelector(`[data-map="${id}"]`) as HTMLElement | null)?.focus();
    return;
  }
  const diffBtn = t.closest<HTMLElement>('[data-diff]');
  if (diffBtn) {
    audio.unlock(); audio.play('click');
    save.diff = diffBtn.dataset.diff as Difficulty;
    writeSave(save);
    const seed = (document.getElementById('seed-input') as HTMLInputElement | null)?.value ?? '';
    titleOverlay(seed.replace(/\D/g, ''));
    (document.querySelector(`[data-diff="${save.diff}"]`) as HTMLElement | null)?.focus();
    return;
  }
  const perk = t.closest<HTMLElement>('[data-perk]');
  if (perk) { ui.showTip(ui.perkText(perk.dataset.perk!), 5000); return; }
  const card = t.closest<HTMLElement>('[data-card]');
  if (card) { game.pickCard(Number(card.dataset.card)); return; }
  const sell = t.closest<HTMLElement>('[data-sell]');
  if (sell) { game.sell(Number(sell.dataset.sell)); view.selectedTower = null; ui.hidePopover(); return; }
  if (t.closest('[data-close]')) { view.selectedTower = null; view.selectedEnemy = null; ui.hidePopover(); return; }
  const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
  if (act) {
    audio.unlock();
    audio.play('click');
    if (act === 'start') {
      const v = (document.getElementById('seed-input') as HTMLInputElement | null)?.value.trim();
      const n = v && /^\d+$/.test(v) ? Number(v) : randomSeed();
      startRun(n);
    } else if (act === 'again') startRun(randomSeed());
    else if (act === 'next') { const n = MAP_ORDER.find((id) => MAPS[id].stage === game.map.def.stage + 1); if (n) { save.map = n; writeSave(save); } startRun(randomSeed()); }
    else if (act === 'same') startRun(game.seed);
    else if (act === 'resume') togglePause(false);
    else if (act === 'quit') { paused = false; ui.hidePopover(); showTitle(); }
    return;
  }
  if (t.closest('#btn-start')) { game.startWave(); return; }
  if (t.closest('#btn-skill')) { toggleSkill(); return; }
  if (t.closest('#btn-reroll')) { game.reroll(); audio.play('click'); return; }
  if (t.closest('#btn-pause')) { togglePause(); return; }
  if (t.closest('#btn-music')) { audio.unlock(); save.music = !save.music; audio.setMusic(save.music); writeSave(save); return; }
  if (t.closest('#btn-mute')) { audio.muted = !audio.muted; save.muted = audio.muted; writeSave(save); return; }
  const sp = t.closest<HTMLElement>('[data-speed]');
  if (sp) { speed = Number(sp.dataset.speed); audio.play('click'); }
});

function toggleSkill() {
  audio.unlock();
  if (!game.skillReady) { ui.showTip(game.phase === 'combat' ? `火雨冷却中：还要 ${Math.ceil(game.skillCd)} 秒` : '火雨只能在战斗中使用', 1800); audio.play('deny'); return; }
  view.skillArmed = !view.skillArmed;
  view.armed = null;
  if (view.skillArmed) { audio.play('click'); tipOnce('skillAim', '点击地图上的位置落下火雨；Esc 或再按一次 Q 取消', 3500); }
}

function togglePause(force?: boolean) {
  if (!(game.phase === 'build' || game.phase === 'combat' || game.phase === 'draft')) return;
  paused = force ?? !paused;
  if (paused) ui.showOverlay(ui.pauseHtml(game));
  else ui.hideOverlay();
}

window.addEventListener('keydown', (ev) => {
  if ((ev.target as HTMLElement).tagName === 'INPUT') { if (ev.key === 'Enter') (document.querySelector('[data-act="start"]') as HTMLElement | null)?.click(); return; }
  const k = ev.key;
  if (k >= '1' && k <= '4' && game.canBuild && !paused) {
    const type = BASIC_TOWERS[Number(k) - 1];
    view.armed = view.armed?.type === type ? null : { type };
    view.skillArmed = false;
  } else if (k === ' ') { ev.preventDefault(); togglePause(); }
  else if (k === 'f' || k === 'F') speed = speed === 1 ? 2 : 1;
  else if (k === 'Enter') {
    if (game.phase === 'build' && !paused) game.startWave();
    else if (game.phase === 'title') (document.querySelector('[data-act="start"]') as HTMLElement | null)?.click();
  } else if ((k === 'q' || k === 'Q') && !paused) toggleSkill();
  else if (k === 'Escape') {
    view.skillArmed = false;
    cancelInteraction();
    view.selectedTower = null; view.selectedEnemy = null;
    ui.hidePopover();
  }
});

// ---------- 主循环（固定步长 60 次/秒） ----------
const STEP = 1 / 60;
let acc = 0;
let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!paused) {
    acc += dt * speed;
    let n = 0;
    while (acc >= STEP && n < 12) { game.update(STEP); acc -= STEP; n++; }
    if (n >= 12) acc = 0;
  }
  if (renderer) {
    if (view.selectedTower != null) {
      if (!game.towers.some((t) => t.id === view.selectedTower)) { view.selectedTower = null; ui.hidePopover(); }
      else ui.towerPopover(game, view.selectedTower);
    } else if (view.selectedEnemy != null) {
      if (!ui.enemyPopover(game, view.selectedEnemy)) view.selectedEnemy = null;
    }
    renderer.draw(game, view);
    if (view.skillArmed && !game.skillReady) view.skillArmed = false;
    audio.mood = game.phase === 'combat' ? (game.enemies.some((e) => e.def.boss && game.alive(e)) ? 'boss' : 'battle') : 'calm';
    ui.update(game, paused, speed, audio.muted, view.armed?.type ?? null, view.skillArmed, audio.musicOn);
  }
  requestAnimationFrame(frame);
}

// ---------- 启动 ----------
ui.showOverlay('<div class="panel"><h1>合成塔防</h1><div class="loading">正在绘制美术素材…</div></div>');
loadSprites().then((bank) => {
  renderer = new Renderer(canvas, bank);
  fit();
  showTitle();
  requestAnimationFrame(frame);
}).catch((err) => {
  ui.showOverlay(`<div class="panel"><h2>加载失败</h2><p>${String(err)}</p></div>`);
});
