import { AFFIXES, ENEMIES as ENEMY_DEFS, SKILL, BASIC_TOWERS, DIFFICULTIES, DIFFICULTY_ORDER, Difficulty, ENEMIES, RECIPES, RELICS, REROLL_COST, TOWERS, TowerType } from './config';
import { MAPS, MAP_ORDER, MapId } from './map';
import { Card, Game, isSpecial, towerStats } from './game';
import { towerIconUrl } from './sprites';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const icons = new Map<string, string>();
export const icon = (type: TowerType, star: number) => {
  const k = type + star;
  if (!icons.has(k)) icons.set(k, towerIconUrl(type, star));
  return icons.get(k)!;
};
const stars = (n: number) => '★'.repeat(n);
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

const SVG_PAUSE = '<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1" width="4" height="12" rx="1.5" fill="#F6EBD2"/><rect x="8" y="1" width="4" height="12" rx="1.5" fill="#F6EBD2"/></svg>';
const SVG_PLAY = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1 L12 7 L3 13 Z" fill="#F6EBD2"/></svg>';
const SVG_SOUND = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M2 7 h3 l4 -4 v12 l-4 -4 h-3 z" fill="#F6EBD2"/><path d="M12 6 q2 3 0 6 M14 4 q4 5 0 10" stroke="#F6EBD2" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
const SVG_MUTE = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M2 7 h3 l4 -4 v12 l-4 -4 h-3 z" fill="#F6EBD2"/><path d="M12 6 l5 6 M17 6 l-5 6" stroke="#F6EBD2" stroke-width="1.8" stroke-linecap="round"/></svg>';
const SVG_NOTE = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M7 13.5 V3.5 L15 2 V12" fill="none" stroke="#F6EBD2" stroke-width="1.8" stroke-linejoin="round"/><ellipse cx="5" cy="13.8" rx="2.4" ry="1.9" fill="#F6EBD2"/><ellipse cx="13" cy="12.3" rx="2.4" ry="1.9" fill="#F6EBD2"/></svg>';
const SVG_NOTE_OFF = SVG_NOTE.replace('</svg>', '<path d="M2 2 L16 16" stroke="#E8521F" stroke-width="2.2" stroke-linecap="round"/></svg>');
const RELIC_ICO = '<svg class="relic-ico" viewBox="0 0 46 54" aria-hidden="true"><path d="M23 6 L38 20 L23 48 L8 20 Z" fill="#B57BD0" stroke="#2B1E16" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 20 H38 M23 6 L17 20 L23 48 L29 20 Z" fill="none" stroke="#2B1E16" stroke-width="1.5"/><path d="M14 18 L20 10" stroke="#F4E2FF" stroke-width="2.5" stroke-linecap="round"/></svg>';

export class UI {
  diff = $('diff'); perks = $('perks');
  gold = $('gold'); interest = $('interest'); skill = $<HTMLButtonElement>('btn-skill'); skillCd = $('skill-cd'); lives = $('lives'); wave = $('wave'); preview = $('preview');
  tip = $('tip'); popover = $('popover'); overlay = $('overlay');
  shop = $('shop'); inv = $('inv'); shopArea = $('shop-area'); draft = $('draft'); cards = $('cards');
  draftWave = $('draft-wave');
  reroll = $<HTMLButtonElement>('btn-reroll');
  start = $<HTMLButtonElement>('btn-start');
  pause = $<HTMLButtonElement>('btn-pause');
  mute = $<HTMLButtonElement>('btn-mute');
  music = $<HTMLButtonElement>('btn-music');
  speedBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('#speed button'));
  private cache: Record<string, string> = {};
  private tipTimer = 0;
  private invSig = '';
  private cardSig = '';
  private perkSig = '';

  constructor() {
    this.shop.innerHTML = BASIC_TOWERS.map((t, i) => `
      <button class="shop-item" data-type="${t}" aria-label="${TOWERS[t].name}，${TOWERS[t].cost} 金">
        <img src="${icon(t, 1)}" alt="">
        <span class="meta"><span class="name">${TOWERS[t].name}</span><span class="cost"><span class="ico coin"></span><span class="cost-n">${TOWERS[t].cost}</span></span></span>
        <span class="key">${i + 1}</span>
      </button>`).join('');
  }

  private set(el: HTMLElement, key: string, html: string) {
    if (this.cache[key] === html) return;
    this.cache[key] = html;
    el.innerHTML = html;
  }

  showTip(text: string, ms = 5000) {
    this.tip.textContent = text;
    this.tip.classList.remove('hidden');
    clearTimeout(this.tipTimer);
    this.tipTimer = window.setTimeout(() => this.tip.classList.add('hidden'), ms);
  }

  flashLives() {
    const chip = this.lives.parentElement!;
    chip.classList.remove('flash');
    void chip.offsetWidth;
    chip.classList.add('flash');
  }

  update(g: Game, paused: boolean, speed: number, muted: boolean, armed: TowerType | null, skillArmed = false, musicOn = true) {
    this.set(this.music, 'music', musicOn ? SVG_NOTE : SVG_NOTE_OFF);
    this.music.setAttribute('aria-label', musicOn ? '关闭背景音乐' : '打开背景音乐');
    const it = g.interestPreview();
    this.set(this.interest, 'int', it > 0 && g.phase !== 'won' && g.phase !== 'lost' ? `利息 +${it}` : '');
    const cd = Math.ceil(g.skillCd);
    this.set(this.skillCd, 'scd', cd > 0 ? String(cd) : '');
    this.skillCd.style.setProperty('--p', `${(100 * g.skillCd / SKILL.cooldown).toFixed(1)}%`);
    this.skill.classList.toggle('off', !g.skillReady);
    this.skill.classList.toggle('armed', skillArmed);
    this.set(this.diff, 'diff', `${g.map.def.name} · ${DIFFICULTIES[g.difficulty].name}`);
    this.diff.className = `chip diff ${g.difficulty}`;
    const perkSig = [...g.recipes].join(',') + '|' + [...g.relics].join(',');
    if (perkSig !== this.perkSig) {
      this.perkSig = perkSig;
      const recipes = RECIPES.filter((r) => g.recipes.has(r.id)).map((r) => `<button class="perk recipe" data-perk="recipe:${r.id}" aria-label="配方 ${TOWERS[r.id].name}"><img src="${icon(r.id, 2)}" alt=""><span class="tag">配方</span>${TOWERS[r.id].name}</button>`);
      const relics = [...g.relics].map((id) => `<button class="perk relic" data-perk="relic:${id}" aria-label="遗物 ${RELICS[id].name}">${RELIC_ICO.replace('class="relic-ico" ', '')}<span class="tag">遗物</span>${RELICS[id].name}</button>`);
      this.perks.innerHTML = recipes.concat(relics).join('');
    }
    this.set(this.gold, 'gold', String(g.gold));
    this.set(this.lives, 'lives', `${g.lives} / ${g.maxLives}`);
    this.set(this.wave, 'wave', `${Math.max(1, g.phase === 'build' || g.phase === 'draft' ? g.nextWave : g.wave)} / ${g.totalWaves}`);
    const pv = g.phase === 'combat' ? g.wavePreview(g.wave) : g.wavePreview();
    const label = g.phase === 'combat' ? '本波' : '下一波';
    this.set(this.preview, 'pv', pv ? `${label}：${pv.lanes.length > 1 ? g.map.def.laneNames.map((n, i) => `${n} ${pv.lanes[i]}`).join(' · ') : `${pv.total} 只`}${pv.bats ? ` · 含 ${pv.bats} 只蝙蝠` : ''}${pv.boss ? ` · <span class="boss">Boss ${pv.boss}</span>` : ''}` : '');
    this.set(this.pause, 'pause', paused ? SVG_PLAY : SVG_PAUSE);
    this.pause.setAttribute('aria-label', paused ? '继续' : '暂停');
    this.set(this.mute, 'mute', muted ? SVG_MUTE : SVG_SOUND);
    this.mute.setAttribute('aria-label', muted ? '打开声音' : '静音');
    for (const b of this.speedBtns) b.classList.toggle('on', Number(b.dataset.speed) === speed);

    for (const b of Array.from(this.shop.children) as HTMLElement[]) {
      const t = b.dataset.type as TowerType;
      const cost = g.cost(t);
      b.classList.toggle('poor', g.gold < cost);
      const n = b.querySelector('.cost-n')!;
      if (n.textContent !== String(cost)) { n.textContent = String(cost); b.setAttribute('aria-label', `${TOWERS[t].name}，${cost} 金`); }
      b.classList.toggle('armed', armed === t);
    }

    const invSig = g.inventory.map((i) => i.type + i.star).join(',');
    if (invSig !== this.invSig) {
      this.invSig = invSig;
      this.inv.innerHTML = g.inventory.length
        ? `<span class="inv-label">备用</span>` + g.inventory.map((it, i) => `
          <button class="inv-item" data-index="${i}" aria-label="备用 ${TOWERS[it.type].name} ${stars(it.star)}"><img src="${icon(it.type, it.star)}" alt=""><span>${stars(it.star)}</span></button>`).join('')
        : '';
    }

    const drafting = g.phase === 'draft';
    this.draft.classList.toggle('hidden', !drafting);
    this.draft.parentElement!.classList.toggle('drafting', drafting);
    this.shopArea.classList.toggle('hidden', drafting);
    if (drafting) {
      this.set(this.draftWave, 'dw', String(g.wave));
      const sig = JSON.stringify(g.cards);
      if (sig !== this.cardSig) {
        this.cardSig = sig;
        this.cards.innerHTML = g.cards.map((c, i) => this.cardHtml(c, i)).join('');
      }
      this.reroll.disabled = g.rerolled || g.gold < REROLL_COST;
      this.reroll.textContent = g.rerolled ? '已刷新' : `刷新 ${REROLL_COST} 金`;
    } else this.cardSig = '';

    let startHtml: string;
    if (g.phase === 'build') {
      const t = isFinite(g.buildTimer) ? Math.ceil(g.buildTimer) : 0;
      startHtml = `开始第 ${g.nextWave} 波${t ? `<small>${t} 秒后自动开始${g.diff.earlyBonus ? ` · 提前 +${t * 2} 金` : ''}</small>` : ''}`;
      this.start.disabled = false;
    } else if (g.phase === 'combat') {
      startHtml = `第 ${g.wave} 波进行中<small>可以继续建塔、合成</small>`;
      this.start.disabled = true;
    } else if (drafting) {
      startHtml = `先选一张卡<small>之后开始第 ${g.nextWave} 波</small>`;
      this.start.disabled = true;
    } else { startHtml = '—'; this.start.disabled = true; }
    this.set(this.start, 'start', startHtml);
  }

  private cardHtml(c: Card, i: number) {
    if (c.kind === 'tower') {
      return `<button class="card" data-card="${i}"><img src="${icon(c.type, c.star)}" alt=""><span class="meta"><span class="kind tower">塔卡</span><span class="name">${TOWERS[c.type].name} ${stars(c.star)}</span><span class="desc">免费 · 放入备用栏</span></span></button>`;
    }
    if (c.kind === 'recipe') {
      const r = RECIPES.find((x) => x.id === c.id)!;
      return `<button class="card" data-card="${i}"><img src="${icon(c.id, 2)}" alt=""><span class="meta"><span class="kind recipe">配方</span><span class="name">${TOWERS[c.id].name}</span><span class="desc">${TOWERS[r.a].name}★★ + ${TOWERS[r.b].name}★★</span></span></button>`;
    }
    return `<button class="card" data-card="${i}">${RELIC_ICO}<span class="meta"><span class="kind relic">遗物</span><span class="name">${RELICS[c.id].name}</span><span class="desc">${RELICS[c.id].desc}</span></span></button>`;
  }

  // ---------- 信息框 ----------
  hidePopover() { this.popover.classList.add('hidden'); this.cache.pop = ''; }

  towerPopover(g: Game, id: number) {
    const t = g.towers.find((x) => x.id === id);
    if (!t) { this.hidePopover(); return; }
    const d = TOWERS[t.type];
    const s = towerStats(t.type, t.star, g.relics);
    const star = isSpecial(t.type) ? '★★' : stars(t.star);
    const attack = t.type === 'frost'
      ? `每秒伤害 ${fmt(s.damage)} · 减速 ${Math.round(s.slow * 100)}%`
      : `伤害 ${fmt(s.damage)} · 攻速 ${fmt(s.rate)} 次/秒`;
    let hint = '';
    if (!isSpecial(t.type)) {
      if (t.star < 3) hint = `再合 1 座同类 ${stars(t.star)} → ${stars(t.star + 1)}`;
      else hint = '已满星';
      if (t.star === 2) {
        const rs = RECIPES.filter((r) => r.a === t.type || r.b === t.type);
        const lines = rs.map((r) => {
          const other = r.a === t.type ? r.b : r.a;
          return `+ ${TOWERS[other].name}★★ → ${TOWERS[r.id].name}${g.recipes.has(r.id) ? '' : '（未解锁）'}`;
        });
        if (lines.length) hint += '<br>' + lines.join('<br>');
      }
    } else hint = '配方塔，不能再合成';
    const stun = t.stunned > 0 ? `<div class="row" style="color:#A3401A">被震晕，停火中</div>` : '';
    const html = `<h3>${d.name} ${star}</h3>
      <div class="row">${attack}</div>
      <div class="row">射程 ${fmt(s.range)} 格${s.air ? ' · 可对空' : ' · 不能对空'}</div>
      <div class="row">累计伤害 ${Math.round(t.dealt).toLocaleString()}</div>
      <div class="sub">${d.desc}</div>${stun}
      <div class="hint">${hint}</div>
      <div class="actions"><button class="sell" data-sell="${t.id}">卖出 +${g.sellValue(t)}</button><button class="close" data-close="1">关闭</button></div>`;
    this.place(t.x, t.y, html);
  }

  enemyPopover(g: Game, id: number) {
    const e = g.enemies.find((x) => x.id === id);
    if (!e || !g.alive(e)) { this.hidePopover(); return false; }
    const d = ENEMIES[e.kind];
    const af = e.affix ? AFFIXES[e.affix] : null;
    const html = `<h3>${af ? `精英 · ${af.name} ` : ''}${d.name}${d.boss ? ' · Boss' : ''}</h3>
      <div class="row">生命 ${Math.ceil(e.hp)} / ${e.maxHp}</div>
      <div class="row">速度 ${d.speed} 格/秒${d.armor ? ` · 护甲 ${Math.round(d.armor * 100)}%` : ''}</div>
      <div class="sub">${d.desc}</div>${af ? `<div class="hint">词缀「${af.name}」：${af.desc}</div>` : ''}
      <div class="actions"><button class="close" data-close="1">关闭</button></div>`;
    this.place(e.x, e.y, html);
    return true;
  }

  private place(x: number, y: number, html: string) {
    this.set(this.popover, 'pop', html);
    this.popover.classList.remove('hidden');
    const w = 214, h = this.popover.offsetHeight || 170;
    let left = x + 34, top = y - h / 2 - 20;
    if (left + w > 948) left = x - w - 34;
    top = Math.max(56, Math.min(600 - h - 8, top));
    this.popover.style.left = `${left}px`;
    this.popover.style.top = `${top}px`;
  }

  // ---------- 全屏面板 ----------
  showOverlay(html: string) { this.overlay.innerHTML = html; this.tip.classList.add('hidden'); }
  hideOverlay() { this.overlay.innerHTML = ''; }

  perkText(key: string) {
    const [kind, id] = key.split(':');
    if (kind === 'recipe') {
      const r = RECIPES.find((x) => x.id === id)!;
      return `配方 · ${TOWERS[r.id].name}：${TOWERS[r.a].name}★★ + ${TOWERS[r.b].name}★★ 拖到一起合成。${TOWERS[r.id].desc}`;
    }
    const relic = RELICS[id as keyof typeof RELICS];
    return `遗物 · ${relic.name}：${relic.desc}`;
  }

  private dmgHtml(g: Game) {
    const rows = (Object.entries(g.stats.dmg) as [TowerType | 'skill', number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const total = rows.reduce((s, [, v]) => s + v, 0);
    if (!total) return '';
    return `<div class="dmg-table"><div class="dmg-title">伤害来源</div>${rows.map(([k, v]) => `<div class="dmg-row"><span class="dmg-name">${k === 'skill' ? '火雨' : TOWERS[k].name}</span><span class="dmg-bar"><i style="width:${(100 * v / rows[0][1]).toFixed(1)}%"></i></span><b>${Math.round(100 * v / total)}%</b></div>`).join('')}</div>`;
  }

  private leakHtml(g: Game) {
    const rows = Object.entries(g.stats.leaked).sort((a, b) => b[1].lives - a[1].lives);
    const body = rows.length
      ? rows.map(([k, r]) => `<div class="leak-row"><span>${ENEMY_DEFS[k as keyof typeof ENEMY_DEFS].name} × ${r.count}${r.elite ? `（精英 ${r.elite}）` : ''}</span><b>−${r.lives} 生命</b></div>`).join('')
      : '<div class="none">一只都没漏</div>';
    return `<div class="leak-table"><div class="dmg-title">漏怪</div>${body}</div>`;
  }

  private perkChipsHtml(g: Game) {
    const chips = [
      ...RECIPES.filter((r) => g.recipes.has(r.id)).map((r) => `<span class="perk recipe" title="${TOWERS[r.id].desc}"><span class="tag">配方</span>${TOWERS[r.id].name}</span>`),
      ...[...g.relics].map((id) => `<span class="perk relic" title="${RELICS[id].desc}"><span class="tag">遗物</span>${RELICS[id].name}</span>`),
    ];
    return chips.length ? `<div class="perk-chips">${chips.join('')}</div>` : '';
  }

  private perkListHtml(g: Game) {
    const rows = [
      ...RECIPES.filter((r) => g.recipes.has(r.id)).map((r) => `<div><b>配方 · ${TOWERS[r.id].name}</b><span>${TOWERS[r.a].name}★★ + ${TOWERS[r.b].name}★★：${TOWERS[r.id].desc}</span></div>`),
      ...[...g.relics].map((id) => `<div><b>遗物 · ${RELICS[id].name}</b><span>${RELICS[id].desc}</span></div>`),
    ];
    return `<div class="perk-list">${rows.length ? rows.join('') : '<div class="none">还没有获得配方或遗物</div>'}</div>`;
  }

  titleHtml(best: Record<MapId, Record<Difficulty, number>>, wins: Record<MapId, Record<Difficulty, number>>, diff: Difficulty, map: MapId, open: MapId[], seed = '') {
    const d = DIFFICULTIES[diff], m = MAPS[map];
    const record = best[map][diff] ? `${m.name} · ${d.name}：最佳第 ${best[map][diff]} 波 · 胜利 ${wins[map][diff]} 次` : `${m.name} · ${d.name}：还没有纪录`;
    const levels = MAP_ORDER.map((id) => {
      const L = MAPS[id], ok = open.includes(id);
      return `<button class="level ${id === map ? 'on' : ''} ${ok ? '' : 'locked'}" data-map="${id}" role="radio" aria-checked="${id === map}" ${ok ? '' : 'aria-disabled="true"'}><span class="lv">第 ${L.stage} 关</span><b>${L.name}</b><small>${ok ? L.desc : `通关第 ${L.stage - 1} 关后解锁`}</small></button>`;
    }).join('');
    return `<div class="panel">
      <h1>合成塔防</h1>
      <ul>
        <li><b>建塔 · 合成</b>：把塔拖到草地上；两座同类同星的塔拖到一起升一星</li>
        <li><b>配方 · 三选一</b>：每波结束选一张卡，解锁的配方能把两座 ★★ 塔合成特殊塔</li>
        <li><b>利息 · 火雨</b>：每波按手上金币给 10% 利息；战斗中按 Q 放火雨救急</li>
      </ul>
      <div class="levels" role="radiogroup" aria-label="关卡">${levels}</div>
      <div class="diffs" role="radiogroup" aria-label="难度">${DIFFICULTY_ORDER.map((k) => `<button role="radio" aria-checked="${k === diff}" class="${k === diff ? 'on' : ''}" data-diff="${k}">${DIFFICULTIES[k].name}<small>${DIFFICULTIES[k].lives} 生命 · ${DIFFICULTIES[k].gold} 金${DIFFICULTIES[k].elite ? ' · 精英' : ''}</small></button>`).join('')}</div>
      <div class="diff-desc">${d.desc}</div>
      <div class="btns"><button class="primary" data-act="start">开始游戏</button></div>
      <div class="seed">种子 <input id="seed-input" inputmode="numeric" maxlength="9" placeholder="随机" aria-label="种子" value="${seed}"> 相同种子，卡牌顺序相同</div>
      <p>${record}</p>
      <p style="font-size:12px">快捷键：1–4 选塔 · 空格 暂停 · F 倍速 · Enter 开波 · Esc 取消</p>
    </div>`;
  }

  endHtml(g: Game, won: boolean, newly: MapId | null = null) {
    const secs = Math.round((Date.now() - g.stats.startedAt) / 1000);
    const time = `${Math.floor(secs / 60)} 分 ${secs % 60} 秒`;
    return `<div class="panel">
      <h2>${won ? '胜利！城门守住了' : '城门失守'}</h2>${newly ? `<p style="color:#A3401A;font-weight:900">第 ${MAPS[newly].stage} 关「${MAPS[newly].name}」已解锁！</p>` : ''}
      <p>${g.map.def.name} · ${DIFFICULTIES[g.difficulty].name} · ${won ? `${g.totalWaves} 波敌人全部击退，剩余生命 ${g.lives}。` : `倒在了第 ${g.wave} 波。`}</p>
      <div class="stats">
        <div><span>到达波次</span><b>${g.wave}</b></div>
        <div><span>击杀</span><b>${g.stats.kills}</b></div>
        <div><span>合成次数</span><b>${g.stats.merges}</b></div>
        <div><span>获得金币</span><b>${g.stats.goldEarned}</b></div>
        <div><span>用时</span><b style="font-family:var(--font)">${time}</b></div>
        <div><span>利息收入</span><b>${g.stats.interest}</b></div>
        <div><span>漏怪扣血</span><b>${g.stats.leaks}</b></div>
        <div><span>种子</span><b>${g.seed}</b></div>
      </div>
      <div class="end-cols">${this.dmgHtml(g) || '<div></div>'}${this.leakHtml(g)}</div>
      ${this.perkChipsHtml(g)}
      <div class="btns">${newly ? `<button class="primary" data-act="next">进入第 ${MAPS[newly].stage} 关「${MAPS[newly].name}」</button>` : ''}<button class="${newly ? 'ghost' : 'primary'}" data-act="again">再来一局</button><button class="ghost" data-act="same">同种子重玩</button><button class="ghost" data-act="quit">换关卡 / 难度</button></div>
    </div>`;
  }

  pauseHtml(g: Game) {
    return `<div class="panel"><h2>已暂停</h2><p>难度：${DIFFICULTIES[g.difficulty].name} · 第 ${Math.max(1, g.wave)} 波</p>${this.perkListHtml(g)}<div class="btns"><button class="primary" data-act="resume">继续</button><button class="ghost" data-act="quit">回到标题</button></div></div>`;
  }
}
