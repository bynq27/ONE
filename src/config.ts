// 所有游戏数值都在这里。调数值只改这个文件。

export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;
export const MAP_W = COLS * TILE; // 960
export const MAP_H = ROWS * TILE; // 600
export const RANGE_Y_RATIO = 0.72; // 射程椭圆：纵轴 = 横轴 × 0.72（3/4 俯视）

export const START_GOLD = 200;
export const START_LIVES = 20;
export const BUILD_TIME = 20; // 建造期秒数
export const EARLY_BONUS_PER_SEC = 2;
export const SELL_RATIO = 0.7;
export const REROLL_COST = 20;
export const MOVES_PER_WAVE = 2;
export const TOTAL_WAVES = 15;
export const waveClearBonus = (wave: number) => 30 + 5 * wave;

// ---------- 难度 ----------
export type Difficulty = 'easy' | 'hard' | 'nightmare';
export interface DifficultyDef {
  name: string;
  desc: string;
  hpA: number; // 生命成长：1 + hpA × (波次−1) + hpB × (波次−1)²
  hpB: number;
  bossHp: number; // Boss 生命倍率
  speed: number; // 敌人移速倍率
  count: number; // 每组敌人数量倍率
  bounty: number; // 赏金倍率
  lives: number;
  gold: number;
  costMul: number; // 塔价格倍率
  sell: number; // 卖塔返还比例
  earlyBonus: boolean; // 提前开波是否给金币
  elite: { from: number; chance: number; perWave: number; boss: boolean } | null; // 精英：从第几波起、基础概率、每波增加、Boss 是否带词缀
}
export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: { name: '简单', desc: '熟悉规则，轻松通关', hpA: 0.10, hpB: 0.004, bossHp: 0.9, speed: 1, count: 1, bounty: 1, lives: 20, gold: 220, costMul: 1, sell: 0.7, earlyBonus: true, elite: null },
  hard: { name: '困难', desc: '塔价 +10%，卖塔返还 60%，第 4 波起出现精英敌人', hpA: 0.17, hpB: 0.012, bossHp: 1.1, speed: 1.05, count: 1.15, bounty: 0.95, lives: 20, gold: 200, costMul: 1.1, sell: 0.6, earlyBonus: true, elite: { from: 4, chance: 0.08, perWave: 0.006, boss: false } },
  nightmare: { name: '噩梦', desc: '塔价 +20%，卖塔返还 50%，提前开波无奖励；精英更多，Boss 也带词缀', hpA: 0.22, hpB: 0.018, bossHp: 1.15, speed: 1.1, count: 1.3, bounty: 0.9, lives: 15, gold: 260, costMul: 1.2, sell: 0.5, earlyBonus: false, elite: { from: 3, chance: 0.18, perWave: 0.012, boss: true } },
};
export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'hard', 'nightmare'];
export const hpScale = (wave: number, d: DifficultyDef) => 1 + d.hpA * (wave - 1) + d.hpB * (wave - 1) ** 2;

export type BasicTower = 'sentry' | 'brazier' | 'frost' | 'ballista';
export type SpecialTower = 'steam' | 'repeater' | 'icelance';
export type TowerType = BasicTower | SpecialTower;

export interface TowerDef {
  name: string;
  role: string;
  cost: number;
  damage: number; // 霜晶塔为每秒伤害
  rate: number; // 次/秒（霜晶塔为 0 表示持续光环）
  range: number; // 格
  air: boolean;
  desc: string;
}

export const BASIC_TOWERS: BasicTower[] = ['sentry', 'brazier', 'frost', 'ballista'];

export const TOWERS: Record<TowerType, TowerDef> = {
  sentry: { name: '守望哨塔', role: '单体', cost: 55, damage: 16, rate: 0.9, range: 3.0, air: true, desc: '可打飞行；对 Boss 和精英伤害 +50%' },
  brazier: { name: '烈焰火盆', role: '范围', cost: 80, damage: 10, rate: 0.6, range: 2.5, air: false, desc: '火球爆炸半径 0.85 格，火焰无视护甲' },
  frost: { name: '霜晶塔', role: '减速', cost: 50, damage: 2, rate: 0, range: 2.5, air: true, desc: '光环：射程内敌人减速 30%，附带少量持续伤害' },
  ballista: { name: '弩车', role: '穿透', cost: 90, damage: 34, rate: 0.45, range: 4.0, air: false, desc: '直线穿透，最多命中 3 个敌人；破甲：无视 50% 护甲' },
  steam: { name: '蒸汽炉', role: '配方', cost: 0, damage: 26, rate: 0.6, range: 2.8, air: false, desc: '范围伤害，减速 20%，灼烧每秒 5 持续 2 秒' },
  repeater: { name: '连弩塔', role: '配方', cost: 0, damage: 32, rate: 0.9, range: 3.4, air: true, desc: '每次射 3 支箭，可打飞行；对 Boss 和精英伤害 +50%' },
  icelance: { name: '冰锥炮', role: '配方', cost: 0, damage: 80, rate: 0.5, range: 4.3, air: false, desc: '穿透最多 5 个敌人，破甲 50%；命中冻结 0.6 秒（同一敌人 2.5 秒冷却）' },
};

export const STAR_DMG = 2.0;
export const STAR_RANGE = 0.3;
export const MAX_STAR = 3;

export interface Recipe { id: SpecialTower; a: BasicTower; b: BasicTower }
export const RECIPES: Recipe[] = [
  { id: 'steam', a: 'brazier', b: 'frost' },
  { id: 'repeater', a: 'sentry', b: 'ballista' },
  { id: 'icelance', a: 'frost', b: 'ballista' },
];

export type EnemyKind = 'slime' | 'wolf' | 'golem' | 'bat' | 'shaman' | 'slimeKing' | 'wolfKing' | 'colossus';

export interface EnemyDef {
  name: string;
  hp: number;
  speed: number; // 格/秒
  armor: number; // 0~1 减伤
  bounty: number;
  leak: number;
  flying: boolean;
  boss: boolean;
  radius: number; // 碰撞/命中半径 px
  desc: string;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  slime: { name: '史莱姆', hp: 40, speed: 1.0, armor: 0, bounty: 4, leak: 1, flying: false, boss: false, radius: 11, desc: '普通敌人' },
  wolf: { name: '狼', hp: 28, speed: 1.8, armor: 0, bounty: 5, leak: 1, flying: false, boss: false, radius: 11, desc: '跑得很快，成群出现' },
  golem: { name: '石魔像', hp: 180, speed: 0.6, armor: 0.3, bounty: 12, leak: 2, flying: false, boss: false, radius: 14, desc: '护甲 30%，火焰无视护甲' },
  shaman: { name: '萨满', hp: 70, speed: 0.9, armor: 0, bounty: 10, leak: 1, flying: false, boss: false, radius: 12, desc: '每 2 秒为 1.5 格内的敌人回复 8% 最大生命（Boss 为 2%）' },
  bat: { name: '蝙蝠', hp: 35, speed: 1.3, armor: 0, bounty: 6, leak: 1, flying: true, boss: false, radius: 11, desc: '飞行，直线飞向城门' },
  slimeKing: { name: '史莱姆王', hp: 900, speed: 0.7, armor: 0, bounty: 60, leak: 5, flying: false, boss: true, radius: 22, desc: '死亡时分裂成 4 只史莱姆' },
  wolfKing: { name: '狼王', hp: 1800, speed: 1.4, armor: 0, bounty: 90, leak: 6, flying: false, boss: true, radius: 20, desc: '每 8 秒冲刺 2 秒：速度 ×2，免疫减速' },
  colossus: { name: '石巨像', hp: 5000, speed: 0.5, armor: 0.4, bounty: 150, leak: 20, flying: false, boss: true, radius: 26, desc: '护甲 40%；每 10 秒震地，2 格内的塔停火 2 秒' },
};

// lane：走哪条路（0 起；'alt' = 两路轮流）；with：与上一组同时出发
export interface SpawnGroup { kind: EnemyKind; count: number; interval: number; delay?: number; lane?: number | 'alt'; with?: boolean }

const g = (kind: EnemyKind, count: number, interval = 0.8, delay = 0): SpawnGroup => ({ kind, count, interval, delay });

// 每组依次出场；delay 是该组开始前的额外等待
export const WAVES: SpawnGroup[][] = [
  [g('slime', 8)],
  [g('slime', 12)],
  [g('slime', 8), g('wolf', 6, 0.4, 1)],
  [g('wolf', 10, 0.4), g('slime', 4, 0.8, 1)],
  [g('slime', 4), g('slimeKing', 1, 1, 1), g('slime', 4, 0.8, 1)],
  [g('slime', 6), g('golem', 3, 1.6, 1), g('slime', 4)],
  [g('wolf', 5, 0.4), g('golem', 4, 1.6, 1), g('wolf', 5, 0.4, 1)],
  [g('slime', 10), g('bat', 2, 1.2, 0.5)],
  [g('wolf', 8, 0.4), g('bat', 6, 1, 1)],
  [g('wolf', 6, 0.4), g('wolfKing', 1, 1, 1.5), g('wolf', 6, 0.4, 1)],
  [g('golem', 6, 1.4), g('bat', 8, 0.9, 0.5)],
  [g('slime', 8, 0.6), g('wolf', 6, 0.4, 0.5), g('golem', 4, 1.4, 0.5), g('bat', 4, 0.9, 0.5)],
  [g('bat', 10, 0.7), g('wolf', 12, 0.4, 0.5)],
  [g('golem', 8, 1.2), g('slime', 15, 0.5, 0.5), g('bat', 6, 0.8, 0.5)],
  [g('golem', 3, 1.4), g('colossus', 1, 1, 1), g('golem', 3, 1.4, 1), g('bat', 8, 0.8, 1)],
];

export type RelicId = 'lava' | 'permafrost' | 'eagle' | 'caravan' | 'gate' | 'hammer' | 'piercer';
export interface RelicDef { name: string; desc: string }
export const RELICS: Record<RelicId, RelicDef> = {
  lava: { name: '熔岩之心', desc: '火焰伤害 +20%' },
  permafrost: { name: '永冻符文', desc: '所有减速效果 +10%' },
  eagle: { name: '鹰眼羽饰', desc: '哨塔类攻速 +25%' },
  caravan: { name: '商队契约', desc: '每波通关额外 +20 金' },
  gate: { name: '加固城门', desc: '生命上限 +3，并立即回复 3 点' },
  hammer: { name: '工匠之锤', desc: '每次合成返还 20 金' },
  piercer: { name: '破甲箭头', desc: '哨塔、连弩塔也能无视 50% 护甲' },
};

export const CARD_WEIGHTS = { tower: 60, recipe: 20, relic: 20 };
export const TOWER_CARD_STAR2_CHANCE = 0.15;
export const RECIPE_GUARANTEE_BY_WAVE = 4; // 第 4 波开打前至少出现过一次配方卡

// ---------- 精英词缀（困难、噩梦） ----------
export type Affix = 'shield' | 'regen' | 'swift' | 'split' | 'tough';
export interface AffixDef { name: string; mark: string; color: string; desc: string }
export const AFFIXES: Record<Affix, AffixDef> = {
  shield: { name: '护盾', mark: '盾', color: '#6CB4EC', desc: '范围爆炸伤害减半' },
  regen: { name: '再生', mark: '生', color: '#7FD34E', desc: '每秒回复 2% 最大生命（Boss 为 1%）' },
  swift: { name: '疾行', mark: '疾', color: '#FFD25A', desc: '移速 +15%，免疫减速和冻结' },
  split: { name: '分裂', mark: '裂', color: '#C58BE0', desc: '死亡时分裂出 2 只同类小怪（各 35% 生命）' },
  tough: { name: '坚韧', mark: '坚', color: '#C9C2B4', desc: '单次伤害超过 30 的部分减半' },
};
export const AFFIX_LIST = Object.keys(AFFIXES) as Affix[];
export const ELITE_HP = 1.5; // 精英生命倍率（Boss 不加）
export const ELITE_BOUNTY = 2;
export const HUNTER_BONUS = 1.5; // 哨塔类对 Boss、精英的伤害倍率
export const ARMOR_PIERCE = 0.5; // 弩车、冰锥炮（以及拿到「破甲箭头」后的哨塔类）无视的护甲比例

// ---------- 利息 ----------
export const INTEREST_RATE = 0.1; // 每波结束时，按手上金币的 10% 给利息
export const INTEREST_CAP = 30;

// ---------- 主动技能：火雨 ----------
export const SKILL = {
  name: '火雨',
  cooldown: 40, // 秒
  radius: 1.5, // 格
  delay: 0.6, // 火球落地时间
  damage: (wave: number) => 150 + 20 * wave, // 火焰伤害，无视护甲，能打飞行
};
export const SHAMAN = { interval: 2, radius: 1.5, heal: 0.08, bossHeal: 0.02 };
