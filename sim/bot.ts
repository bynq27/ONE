// 自动对局脚本：用简单策略跑完整 15 波，检查报错和难度
import { BASIC_TOWERS, BasicTower, Difficulty, COLS, ROWS, TOWERS, TILE } from '../src/config';
import { Game, inRange } from '../src/game';
import { MapId, getMap, tileCenter } from '../src/map';

const spotCache = new Map<MapId, { c: number; r: number; cover: number }[]>();
function spotsFor(id: MapId) {
  if (spotCache.has(id)) return spotCache.get(id)!;
  const m = getMap(id);
  const spots: { c: number; r: number; cover: number }[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!m.buildable(c, r)) continue;
    const p = tileCenter(c, r);
    let cover = 0;
    m.lanes.forEach((L, li) => { for (let d = 0; d < L.len; d += 10) { const q = m.pointAt(li, d); if (inRange(p.x, p.y, 2.8, q.x, q.y)) cover++; } });
    spots.push({ c, r, cover });
  }
  spots.sort((a, b) => b.cover - a.cover);
  spotCache.set(id, spots);
  return spots;
}

const order: BasicTower[] = ['sentry', 'brazier', 'ballista', 'sentry', 'frost', 'brazier', 'sentry', 'ballista'];

export function play(seed: number, skill = 1, sloppy = false, diff: Difficulty = 'easy', mapId: MapId = 'valley') {
  const spots = spotsFor(mapId);
  let rs = seed * 7 + 3; const rnd = () => ((rs = (rs * 9301 + 49297) % 233280) / 233280);
  const pickSpot = () => { const free = spots.filter((s) => g.canPlace(s.c, s.r)); if (!free.length) return undefined; return sloppy ? free[Math.floor(rnd() * Math.min(free.length, 70))] : free[0]; };
  const g = new Game();
  g.newRun(seed, diff, mapId);
  let k = 0;
  const log: string[] = [];
  const mergeAll = () => {
    let again = true;
    while (again) {
      again = false;
      for (const a of g.towers) for (const b of g.towers) {
        if (a === b) continue;
        if (g.checkMerge(a, b).ok) { g.dropTower(a.id, b.c, b.r); again = true; break; }
      }
      if (again) continue;
    }
  };
  const spend = () => {
    while (g.inventory.length) {
      const it = g.inventory[0];
      const tgt = g.towers.find((t) => g.checkMerge(it, t).ok);
      if (tgt) g.placeInventory(0, tgt.c, tgt.r);
      else { const s = pickSpot(); if (!s) break; g.placeInventory(0, s.c, s.r); }
    }
    for (let guard = 0; guard < 50; guard++) {
      const type = order[k % order.length];
      if (g.gold < g.cost(type) * skill) break;
      const s = pickSpot();
      if (!s) break;
      g.buyAt(type, s.c, s.r);
      k++;
      if (!sloppy || rnd() < 0.5) mergeAll();
    }
    if (!sloppy) mergeAll();
  };
  let steps = 0;
  while (g.phase !== 'won' && g.phase !== 'lost' && steps < 60 * 60 * 60) {
    if (g.phase === 'build') { spend(); g.startWave(); }
    if (g.phase === 'draft') {
      const i = Math.max(0, g.cards.findIndex((c) => c.kind === 'recipe'), g.cards.findIndex((c) => c.kind === 'relic'));
      g.pickCard(i);
      log.push(`w${g.wave} lives=${g.lives} gold=${g.gold} towers=${g.towers.map((t) => t.type[0] + t.star).join('')}`);
    }
    g.update(1 / 60);
    steps++;
    if (g.phase === 'combat' && steps % 120 === 0) spend();
  }
  return { phase: g.phase, wave: g.wave, lives: g.lives, kills: g.stats.kills, merges: g.stats.merges, log, dmg: g.stats.dmg };
}

const seeds = [11, 22, 33, 44, 55, 66, 77, 88, 99, 111];
const only = process.argv[2] as Difficulty | undefined;
const MAP = (process.argv[3] ?? 'valley') as MapId;
for (const diff of (only ? [only] : ['easy', 'hard', 'nightmare']) as Difficulty[])
for (const [skill, sloppy] of [[1, false], [1, true]] as [number, boolean][]) {
  let wins = 0, waves = 0;
  const lines: string[] = [];
  for (const s of seeds) { const r = play(s, skill, sloppy, diff, MAP); if (r.phase === 'won') wins++; waves += r.wave; lines.push(`${r.phase[0]}${r.wave}/${r.lives}`); }
  console.log(`${MAP} ${diff} ${sloppy ? 'sloppy' : 'best  '}: wins ${wins}/${seeds.length} avgWave ${(waves / seeds.length).toFixed(1)}  ${lines.join(' ')}`);
}
void BASIC_TOWERS; void TILE;
{ const r = play(22, 1, false, (only ?? 'easy') as Difficulty, MAP); const tot = Object.values(r.dmg).reduce((a, b) => a + (b ?? 0), 0); console.log('dmg share', Object.entries(r.dmg).map(([k, v]) => `${k} ${Math.round(100 * (v ?? 0) / tot)}%`).join(' ')); }
