// 关卡地图：道路（可多条）、障碍、可建格、每关的波次。
import { COLS, ROWS, SpawnGroup, TILE, WAVES } from './config';

export interface Pt { x: number; y: number }
export type MapId = 'valley' | 'river';
export type Cell = 'grass' | 'path' | 'water' | 'tree' | 'rock' | 'base';

export interface MapDef {
  id: MapId;
  name: string;
  stage: number; // 第几关
  desc: string;
  lanes: Pt[][]; // 每条路从出怪口到城门（像素坐标，格中心）
  laneNames: string[];
  base: Pt;
  trees: [number, number][];
  rocks: [number, number][];
  water: [number, number][];
  waterSvg: string; // 地面图里的水面装饰（SVG 片段）
  waves: SpawnGroup[][];
  hpMul: number; // 本关敌人额外生命倍率（Boss 也算）
}

const OUT = '#2B1E16';

// ---------- 第一关：绿谷 ----------
const VALLEY: MapDef = {
  id: 'valley',
  name: '绿谷',
  stage: 1,
  desc: '一条蜿蜒小路，熟悉合成与选卡',
  lanes: [[
    { x: -24, y: 140 }, { x: 260, y: 140 }, { x: 260, y: 420 }, { x: 540, y: 420 },
    { x: 540, y: 180 }, { x: 780, y: 180 }, { x: 780, y: 460 }, { x: 930, y: 460 },
  ]],
  laneNames: [''],
  base: { x: 930, y: 460 },
  trees: [[10, 1], [1, 7], [2, 8], [21, 2], [22, 8], [16, 13], [4, 13], [11, 13], [0, 12], [17, 0]],
  rocks: [[4, 11], [18, 7], [14, 2], [8, 12]],
  water: [[21, 5], [22, 5], [23, 5], [21, 6], [22, 6], [23, 6]],
  waterSvg: `<path d="M846 206 C852 192 900 190 930 200 C952 210 948 252 922 260 C892 270 852 262 846 246 Z" fill="#3E86C2" stroke="${OUT}" stroke-width="2.5"/>
<path d="M856 214 C866 204 900 200 922 208" stroke="#9FD4F2" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<path d="M872 240 q10 -4 20 0 M902 232 q8 -3 16 0" stroke="#CFEAFA" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  waves: WAVES,
  hpMul: 1,
};

// ---------- 第二关：双径河谷 ----------
const MERGE_TAIL: Pt[] = [{ x: 540, y: 300 }, { x: 820, y: 300 }, { x: 820, y: 460 }, { x: 930, y: 460 }];
const g = (kind: SpawnGroup['kind'], count: number, lane: SpawnGroup['lane'], interval = 0.8, extra: Partial<SpawnGroup> = {}): SpawnGroup =>
  ({ kind, count, interval, lane, ...extra });
const W = { with: true }; // 与上一组同时出发（两路同时进攻）

const riverWater: [number, number][] = [];
for (let c = 0; c <= 11; c++) riverWater.push([c, 7], [c, 8]);

const RIVER: MapDef = {
  id: 'river',
  name: '双径河谷',
  stage: 2,
  desc: '南北两路夹着一条河，在中部汇合；萨满会给敌人回血',
  lanes: [
    [{ x: -24, y: 100 }, { x: 340, y: 100 }, { x: 340, y: 260 }, { x: 540, y: 260 }, ...MERGE_TAIL],
    [{ x: -24, y: 500 }, { x: 220, y: 500 }, { x: 220, y: 380 }, { x: 540, y: 380 }, ...MERGE_TAIL],
  ],
  laneNames: ['北路', '南路'],
  base: { x: 930, y: 460 },
  trees: [[2, 5], [3, 4], [10, 1], [11, 4], [15, 2], [17, 4], [22, 2], [21, 5], [16, 10], [18, 13], [2, 14], [7, 14], [11, 12], [23, 13], [15, 13]],
  rocks: [[6, 4], [9, 11], [19, 5], [19, 10], [2, 10]],
  water: riverWater,
  waterSvg: `<path d="M-10 284 C120 278 260 290 380 282 C420 278 450 290 466 306 C482 324 470 352 440 358 C360 366 200 356 -10 360 Z" fill="#3E86C2" stroke="${OUT}" stroke-width="2.5"/>
<path d="M30 300 q30 -6 60 0 M160 336 q30 -6 60 0 M300 302 q24 -5 48 0 M400 340 q20 -4 40 0" stroke="#CFEAFA" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  waves: [
    [g('slime', 8, 'alt')],
    [g('slime', 6, 0), g('slime', 6, 1, 0.8, W)],
    [g('slime', 8, 0), g('wolf', 6, 1, 0.5, W), g('shaman', 1, 1, 1, { delay: 1 })],
    [g('wolf', 10, 'alt', 0.4), g('shaman', 2, 1, 1.5, { delay: 1 })],
    [g('slime', 8, 1), g('shaman', 1, 1, 1, W), g('slimeKing', 1, 0, 1, { with: true, delay: 2 })],
    [g('golem', 3, 0, 1.6), g('slime', 10, 1, 0.7, W), g('shaman', 2, 1, 2, { delay: 0.5 })],
    [g('wolf', 10, 0, 0.4), g('golem', 4, 1, 1.6, W)],
    [g('slime', 10, 'alt', 0.6), g('bat', 4, 0, 1.2, W)],
    [g('wolf', 8, 1, 0.4), g('bat', 6, 0, 1, W), g('shaman', 2, 1, 1.5, { delay: 0.5 })],
    [g('wolf', 12, 0, 0.4), g('wolfKing', 1, 1, 1, { with: true, delay: 2 })],
    [g('golem', 6, 'alt', 1.2), g('bat', 8, 'alt', 0.9, W), g('shaman', 2, 1, 2, { delay: 0.5 })],
    [g('slime', 10, 0, 0.6), g('wolf', 8, 1, 0.4, W), g('golem', 4, 'alt', 1.4), g('shaman', 3, 1, 1.5, W), g('bat', 4, 0, 1)],
    [g('bat', 12, 'alt', 0.6), g('wolf', 12, 'alt', 0.4, W)],
    [g('golem', 8, 'alt', 1.1), g('slime', 15, 'alt', 0.5, W), g('shaman', 3, 1, 1.5), g('bat', 6, 0, 0.8, W)],
    [g('golem', 6, 1, 1.4), g('shaman', 3, 1, 1.8, W), g('colossus', 1, 0, 1, { with: true, delay: 2 }), g('bat', 8, 'alt', 0.8)],
  ],
  hpMul: 1.2,
};

export const MAPS: Record<MapId, MapDef> = { valley: VALLEY, river: RIVER };
export const MAP_ORDER: MapId[] = ['valley', 'river'];

// ---------- 运行时 ----------
interface Lane { pts: Pt[]; segs: number[]; len: number; spawn: Pt; flyLen: number }

export class GameMap {
  lanes: Lane[];
  grid: Cell[][] = [];
  constructor(public def: MapDef) {
    this.lanes = def.lanes.map((pts) => {
      const segs: number[] = [];
      let len = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
        segs.push(l);
        len += l;
      }
      const spawn = { x: 6, y: pts[0].y };
      return { pts, segs, len, spawn, flyLen: Math.hypot(def.base.x - spawn.x, def.base.y - spawn.y) };
    });
    for (let r = 0; r < ROWS; r++) this.grid.push(new Array<Cell>(COLS).fill('grass'));
    for (const lane of this.lanes) {
      for (let i = 0; i < lane.pts.length - 1; i++) {
        const a = lane.pts[i], b = lane.pts[i + 1];
        const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 10);
        for (let s = 0; s <= steps; s++) {
          const c = Math.floor((a.x + ((b.x - a.x) * s) / steps) / TILE), r = Math.floor((a.y + ((b.y - a.y) * s) / steps) / TILE);
          if (c >= 0 && c < COLS && r >= 0 && r < ROWS) this.grid[r][c] = 'path';
        }
      }
    }
    const mark = (list: [number, number][], cell: Cell) => { for (const [c, r] of list) if (this.grid[r]?.[c] === 'grass') this.grid[r][c] = cell; };
    mark(def.water, 'water');
    mark(def.trees, 'tree');
    mark(def.rocks, 'rock');
    const bc = Math.floor(def.base.x / TILE), br = Math.floor(def.base.y / TILE);
    this.grid[br][bc] = 'base';
  }

  /** 实际落在草地上的树（与道路重叠的不画） */
  get trees() { return this.def.trees.filter(([c, r]) => this.grid[r][c] === 'tree'); }
  get rocks() { return this.def.rocks.filter(([c, r]) => this.grid[r][c] === 'rock'); }

  pointAt(lane: number, dist: number): Pt {
    const L = this.lanes[lane];
    let d = Math.max(0, dist);
    for (let i = 0; i < L.segs.length; i++) {
      if (d <= L.segs[i] || i === L.segs.length - 1) {
        const a = L.pts[i], b = L.pts[i + 1];
        const t = Math.min(1, d / L.segs[i]);
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      d -= L.segs[i];
    }
    return { ...L.pts[L.pts.length - 1] };
  }

  flyPointAt(lane: number, dist: number): Pt {
    const L = this.lanes[lane];
    const t = Math.min(1, Math.max(0, dist / L.flyLen));
    return { x: L.spawn.x + (this.def.base.x - L.spawn.x) * t, y: L.spawn.y + (this.def.base.y - L.spawn.y) * t };
  }

  buildable(c: number, r: number) { return c >= 0 && c < COLS && r >= 0 && r < ROWS && this.grid[r][c] === 'grass'; }
}

const cache = new Map<MapId, GameMap>();
export function getMap(id: MapId) {
  if (!cache.has(id)) cache.set(id, new GameMap(MAPS[id]));
  return cache.get(id)!;
}

export const tileCenter = (c: number, r: number): Pt => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });
