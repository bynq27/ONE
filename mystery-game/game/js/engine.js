// 剧本引擎。
//
// 脚本语法（story.js 里的 YY.SCRIPT）：
//   # 节点名            开始一个节点
//   key: 台词           角色说话（key 见 SPEAKERS）；key[state]: 台词 会先把角色切到该动作
//   （……）              旁白
//   - 选项 -> 节点      跟在 @choice 后面的选项
//   @bg 背景            @chars key@位置+修饰 ...（位置 LL L CL C CR R RR 或数字；修饰 jia kneel）
//   @enter / @exit      加入或移出单个角色
//   @state key 动作     idle talk shock sad point slam reveal nod throw throwfan
//   @kneel key on|off   @get 证物  @show 证物  @set/@unset 旗标  @if/@ifnot 旗标 节点
//   @goto 节点          @call 节点  @retry（回到上一个选择）
//   @choice [doc:标题]  @investigate 场景  @map  @trial 轮次 [第几句]
//   @stmt 轮次 旧键|+ 新键 追问节点 文本      更新或追加证词
//   @penalty  @lq reset|show|hide  @checkpoint  @gameover  @end
//   @fx slam|shake|rain on/off|dark on/off|ink off|pozhan off|reveal|reset
//   @move key x 毫秒   @wait 毫秒   @title 主|副   @hint 提示
(function () {
  const $ = s => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const SPEAKERS = { shen: '沈砚', fan: '老樊', fu: '阿福', zhou: '周四郎', sun: '孙敬', han: '韩推官', zhong: '老钟', pu: '老仆', ya: '衙役' };
  const POS = { LL: 70, L: 135, CL: 228, C: 320, CR: 412, R: 505, RR: 570 };
  const SAVE_KEY = 'yuye-ch1-save';
  const reduce = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

  // ---------- 解析 ----------
  function parse(src) {
    const nodes = {}; let cur = null;
    for (const raw of src.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('//')) continue;
      if (line.startsWith('# ')) { cur = nodes[line.slice(2).trim()] = []; continue; }
      if (!cur) continue;
      if (line.startsWith('@')) {
        const sp = line.indexOf(' ');
        cur.push({ t: 'cmd', cmd: sp < 0 ? line.slice(1) : line.slice(1, sp), arg: sp < 0 ? '' : line.slice(sp + 1).trim() });
        continue;
      }
      if (line.startsWith('- ')) {
        const i = line.lastIndexOf('->');
        const last = cur[cur.length - 1];
        (last.opts = last.opts || []).push({ text: line.slice(2, i).trim(), node: line.slice(i + 2).trim() });
        continue;
      }
      const m = line.match(/^([a-z]+)(?:\[(\w+)\])?:\s?(.*)$/);
      if (m) cur.push({ t: 'say', who: m[1], state: m[2], text: m[3] });
      else cur.push({ t: 'say', who: 'narr', text: line });
    }
    return nodes;
  }
  const NODES = parse(YY.SCRIPT);

  // ---------- 状态 ----------
  const fresh = () => ({ ev: [], flags: {}, lq: 5, lqShow: false, trials: {}, tidx: {}, visited: {}, hint: '' });
  let G = fresh();
  let stack = [], inv = null, map = null, trial = null;
  let mode = 'title', busy = false, CP = null;
  const VIS = { bg: 'black', actors: [], ink: false, pozhan: false, rain: false };
  const actors = {};

  // ---------- 舞台 ----------
  const stage = $('#stage');
  stage.innerHTML = `<defs>${YY.STAGE_DEFS}</defs><g id="bg-back"></g><g id="ink" style="opacity:0">${YY.INK_LAYER}</g><g id="actors"></g><g id="bg-front"></g>` +
    `<rect id="rain" width="640" height="360" fill="url(#rainPat)" style="opacity:0"/>` +
    `<g id="pozhan" style="opacity:0"><text x="320" y="326" text-anchor="middle" font-size="92" fill="#b3261e" stroke="#ebe8e0" stroke-width="2" paint-order="stroke" font-family="'Zhi Mang Xing','STXingkai','KaiTi',cursive" transform="rotate(-6 320 300)">破绽</text></g>` +
    `<rect id="dim" width="640" height="360" fill="#000" style="opacity:0"/><rect id="flash" width="640" height="360" fill="#fff8e0" style="opacity:0"/>` +
    `<rect x="2" y="2" width="636" height="356" fill="none" stroke="#6b3a22" stroke-width="4"/>`;
  const layer = id => stage.querySelector('#' + id);

  function setBg(id) {
    VIS.bg = id;
    const b = YY.BG[id] || YY.BG.black;
    layer('bg-back').innerHTML = b.back; layer('bg-front').innerHTML = b.front;
  }
  function clearActors() { for (const k in actors) { actors[k].destroy(); delete actors[k]; } }
  function addActor(spec) {
    const [kp, ...mods] = spec.split('+');
    const [key, pos] = kp.split('@');
    if (actors[key]) actors[key].destroy();
    const p = new YY.Puppet(key, layer('actors'));
    const x = pos in POS ? POS[pos] : (parseFloat(pos) || 320);
    p.x = x; p.dir = x > 330 ? -1 : 1;
    if (mods.includes('jia')) p.setJia(true);
    if (mods.includes('kneel')) p.kneel = true;
    actors[key] = p;
    p.spec = spec;
  }
  function snapshotVis() {
    return { bg: VIS.bg, ink: VIS.ink, pozhan: VIS.pozhan, rain: VIS.rain,
      actors: Object.values(actors).map(a => ({ key: a.key, x: a.x, dir: a.dir, state: a.state, kneel: a.kneel, jia: a.jia })) };
  }
  function restoreVis(v) {
    setBg(v.bg); clearActors();
    for (const a of v.actors) {
      const p = new YY.Puppet(a.key, layer('actors'));
      Object.assign(p, { x: a.x, dir: a.dir, kneel: a.kneel }); p.setJia(a.jia); p.setState(a.state, performance.now());
      actors[a.key] = p;
    }
    setInk(v.ink); setPozhan(v.pozhan); setRain(v.rain);
  }
  const fade = (id, v) => { layer(id).style.opacity = v ? 1 : 0; };
  function setInk(v) { VIS.ink = v; fade('ink', v); }
  function setPozhan(v) { VIS.pozhan = v; layer('pozhan').classList.toggle('pop', v); fade('pozhan', v); }
  function setRain(v) { VIS.rain = v; fade('rain', v); v ? AU.rainOn() : AU.rainOff(); }

  let t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    for (const k in actors) actors[k].update(t, now, reduce);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- 声音 ----------
  const AU = {
    ctx: null, on: true, rainNode: null, master: null,
    init() {
      if (this.ctx) return;
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination); } catch (e) { this.ctx = null; }
    },
    noise(sec) {
      const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    },
    knock() {
      if (!this.ctx || !this.on) return;
      const c = this.ctx, now = c.currentTime;
      [0, 0.11].forEach((dt, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.setValueAtTime(i ? 150 : 110, now + dt); o.frequency.exponentialRampToValueAtTime(50, now + dt + 0.2);
        g.gain.setValueAtTime(i ? 0.5 : 0.8, now + dt); g.gain.exponentialRampToValueAtTime(0.001, now + dt + 0.28);
        o.connect(g).connect(this.master); o.start(now + dt); o.stop(now + dt + 0.3);
        const n = c.createBufferSource(), f = c.createBiquadFilter(), ng = c.createGain();
        n.buffer = this.noise(0.08); f.type = 'highpass'; f.frequency.value = 900;
        ng.gain.setValueAtTime(0.5, now + dt); ng.gain.exponentialRampToValueAtTime(0.001, now + dt + 0.07);
        n.connect(f).connect(ng).connect(this.master); n.start(now + dt);
      });
    },
    tick() {
      if (!this.ctx || !this.on) return;
      const c = this.ctx, now = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = 660;
      g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      o.connect(g).connect(this.master); o.start(now); o.stop(now + 0.13);
    },
    rainOn() {
      if (!this.ctx || this.rainNode) return;
      const c = this.ctx, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      n.buffer = this.noise(2); n.loop = true; f.type = 'lowpass'; f.frequency.value = 1400;
      g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 1);
      n.connect(f).connect(g).connect(this.master); n.start();
      this.rainNode = { n, g };
    },
    rainOff() {
      if (!this.rainNode) return;
      const { n, g } = this.rainNode, c = this.ctx;
      g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(g.gain.value, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.8);
      n.stop(c.currentTime + 0.9); this.rainNode = null;
    },
    setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 1 : 0; }
  };

  // ---------- 界面元素 ----------
  const panel = $('#panel'), nameEl = $('#name'), textEl = $('#text'), choicesEl = $('#choices'), nextEl = $('#next');
  const testiEl = $('#testimony'), tctrlEl = $('#tctrl'), spotsEl = $('#spots'), cardEl = $('#card'), tcardEl = $('#tcard'), lqEl = $('#lq');
  const drawer = $('#drawer');
  const show = (el, v) => { el.hidden = !v; };

  function clearPanel() {
    nameEl.textContent = ''; nameEl.hidden = true; textEl.textContent = ''; textEl.className = '';
    choicesEl.innerHTML = ''; show(choicesEl, false); show(testiEl, false); show(tctrlEl, false); show(nextEl, false); panel.classList.remove('trial-on');
    spotsEl.innerHTML = '';
  }
  function updateHud() {
    lqEl.innerHTML = '';
    show(lqEl, G.lqShow);
    for (let i = 0; i < 5; i++) { const s = document.createElement('i'); if (i >= G.lq) s.className = 'gone'; lqEl.appendChild(s); }
    $('#b-hint').hidden = !(inv || map || trial);
  }

  // 打字效果
  let typing = null;
  function typeText(str, cls) {
    textEl.className = cls || '';
    if (reduce) { textEl.textContent = str; typing = null; show(nextEl, true); return; }
    let i = 0; textEl.textContent = '';
    typing = { str, timer: setInterval(() => {
      i += 1; textEl.textContent = str.slice(0, i);
      if (i >= str.length) finishTyping();
    }, 28) };
  }
  function finishTyping() {
    if (!typing) return;
    clearInterval(typing.timer); textEl.textContent = typing.str; typing = null; show(nextEl, true);
  }

  function setSpeaker(who) {
    for (const k in actors) actors[k].speaking = k === who;
  }

  // ---------- 解释器 ----------
  function call(node) {
    if (!NODES[node]) { console.error('缺少节点', node); return; }
    stack.push({ node, pc: 0 });
  }
  function jump(node) { stack.pop(); call(node); }

  function run() {
    while (true) {
      const f = stack[stack.length - 1];
      if (!f) return;
      const lines = NODES[f.node];
      if (f.pc >= lines.length) {
        stack.pop();
        if (resumeMode()) return;
        continue;
      }
      const it = lines[f.pc++];
      if (exec(it, f)) return;
    }
  }
  function resumeMode() {
    const d = stack.length;
    if (trial && d === trial.depth) { showTestimony(); return true; }
    if (inv && d === inv.depth) { showInvestigate(); return true; }
    if (map && d === map.depth) { showMap(); return true; }
    return false;
  }
  function later(ms) { busy = true; setTimeout(() => { busy = false; run(); }, ms); return true; }

  function exec(it, f) {
    if (it.t === 'say') return say(it);
    const a = it.arg, args = a.split(/\s+/);
    switch (it.cmd) {
      case 'bg': setBg(a); return false;
      case 'chars': clearActors(); if (a) args.forEach(addActor); return false;
      case 'enter': addActor(a); return false;
      case 'exit': if (actors[a]) { actors[a].destroy(); delete actors[a]; } return false;
      case 'state': if (actors[args[0]]) actors[args[0]].setState(args[1], performance.now()); return false;
      case 'kneel': if (actors[args[0]]) actors[args[0]].kneel = args[1] === 'on'; return false;
      case 'set': G.flags[a] = true; return false;
      case 'unset': delete G.flags[a]; return false;
      case 'if': if (G.flags[args[0]]) { jump(args[1]); } return false;
      case 'ifnot': if (!G.flags[args[0]]) { jump(args[1]); } return false;
      case 'goto': jump(a); return false;
      case 'call': call(a); return false;
      case 'retry': { const p = stack[stack.length - 2]; if (p && p.choicePc != null) p.pc = p.choicePc; return false; }
      case 'hint': G.hint = a; return false;
      case 'wait': return later(+a || 500);
      case 'move': { const p = actors[args[0]]; if (p) p.moveTo(+args[1], +args[2], performance.now()); return later(+args[2] || 500); }
      case 'title': return titleCard(a);
      case 'get': if (!G.ev.includes(a)) G.ev.push(a); return evCard(a, true);
      case 'show': return evCard(a, false);
      case 'choice': f.choicePc = f.pc - 1; return choice(it, a);
      case 'investigate': inv = { id: a, depth: stack.length, seen: {} }; showInvestigate(); return true;
      case 'map': map = { depth: stack.length }; showMap(); return true;
      case 'trial': {
        const id = args[0];
        if (!G.trials[id]) G.trials[id] = YY.TRIALS[id].st.map(s => Object.assign({}, s));
        if (args[1]) G.tidx[id] = +args[1] - 1;
        trial = { id, depth: stack.length };
        showTestimony(); return true;
      }
      case 'stmt': {
        const m = a.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/);
        const [, id, oldK, newK, press, text] = m;
        if (!G.trials[id]) G.trials[id] = YY.TRIALS[id].st.map(s => Object.assign({}, s));
        const list = G.trials[id];
        const s = { k: newK, t: text, p: press, fresh: true };
        const i = list.findIndex(x => x.k === oldK);
        if (oldK === '+' || i < 0) list.push(s); else list[i] = s;
        return false;
      }
      case 'penalty':
        G.lq = Math.max(0, G.lq - 1); updateHud(); shake();
        if (G.lq <= 0) { trial = null; stack = []; call('gameover'); }
        return false;
      case 'lq':
        if (a === 'reset') G.lq = 5;
        if (a === 'show') G.lqShow = true;
        if (a === 'hide') G.lqShow = false;
        updateHud(); return false;
      case 'checkpoint': checkpoint(f); return false;
      case 'gameover': return gameOver();
      case 'end': return theEnd();
      case 'fx': return fx(args[0], args[1]);
    }
    console.warn('未知命令', it.cmd);
    return false;
  }

  function say(it) {
    mode = 'say'; clearPanel(); updateHud();
    if (it.state && actors[it.who]) actors[it.who].setState(it.state, performance.now());
    if (it.who === 'sys') { setSpeaker(null); typeText(it.text, 'sys'); return true; }
    if (it.who === 'narr') { setSpeaker(null); typeText(it.text, 'narr'); return true; }
    setSpeaker(it.who);
    nameEl.hidden = false; nameEl.textContent = SPEAKERS[it.who] || it.who;
    typeText(it.text);
    return true;
  }

  function advance() {
    if (busy) return;
    if (mode === 'card') { cardEl.hidden = true; mode = 'say'; run(); return; }
    if (mode === 'tcard') { return; }
    if (mode !== 'say') return;
    if (typing) { finishTyping(); return; }
    run();
  }

  function titleCard(a) {
    const [main, sub] = a.split('|');
    tcardEl.innerHTML = `<div class="tc-main">${main}</div>${sub ? `<div class="tc-sub">${sub}</div>` : ''}`;
    tcardEl.hidden = false; mode = 'tcard'; clearPanel(); setSpeaker(null);
    busy = true;
    setTimeout(() => { tcardEl.hidden = true; busy = false; mode = 'say'; run(); }, reduce ? 1400 : 2200);
    return true;
  }

  function evHtml(id) {
    const e = YY.EVIDENCE[id];
    return `<svg viewBox="0 0 60 60" aria-hidden="true">${YY.ICON[e.icon]}</svg>`;
  }
  function evCard(id, got) {
    const e = YY.EVIDENCE[id];
    clearPanel(); setSpeaker(null);
    cardEl.innerHTML = `<div class="card-in"><div class="card-icon">${evHtml(id)}</div><div class="card-body">${got ? '<div class="card-tag">获得证物</div>' : ''}<div class="card-name">${e.name}</div><p>${e.desc}</p><div class="card-hint">点击继续</div></div></div>`;
    cardEl.hidden = false; mode = 'card';
    if (got) AU.tick();
    return true;
  }

  function choice(it, a) {
    mode = 'choice'; clearPanel(); setSpeaker(null);
    const doc = a.startsWith('doc:') ? a.slice(4) : '';
    show(choicesEl, true);
    choicesEl.className = doc ? 'doc' : '';
    if (doc) { const h = document.createElement('div'); h.className = 'doc-title'; h.textContent = doc + '　点出写错的一句'; choicesEl.appendChild(h); }
    it.opts.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = o.text; b.dataset.i = i;
      b.onclick = () => { if (busy) return; call(o.node); run(); };
      choicesEl.appendChild(b);
    });
    return true;
  }

  // 调查
  function spotButton(label, x, y, done, onClick, cls) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'spot' + (done ? ' done' : '') + (cls ? ' ' + cls : '');
    b.style.left = (x / 640 * 100) + '%'; b.style.top = (y / 360 * 100) + '%';
    b.textContent = label; b.onclick = onClick;
    spotsEl.appendChild(b); return b;
  }
  function showInvestigate() {
    mode = 'inv'; clearPanel(); setSpeaker(null); updateHud();
    setBg(YY.BG[inv.id] ? inv.id : VIS.bg); clearActors();
    const data = YY.INVESTIGATE[inv.id];
    data.spots.forEach(s => spotButton(s.label, s.x, s.y, inv.seen[s.id], () => { inv.seen[s.id] = true; clearPanel(); call(s.node); run(); }));
    const left = data.spots.filter(s => !inv.seen[s.id]).length;
    textEl.className = 'sys';
    textEl.textContent = left ? `点击画面上的标记调查。还剩 ${left} 处没看。` : '都看过了。';
    if (!left) {
      show(choicesEl, true);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'go'; b.textContent = '调查完毕，继续';
      b.onclick = () => { inv = null; clearPanel(); run(); };
      choicesEl.appendChild(b);
    }
  }

  // 地图
  function showMap() {
    const auto = YY.MAP.auto.find(a => a.cond(G.flags));
    if (auto) { call(auto.node); run(); return; }
    mode = 'map'; clearPanel(); setSpeaker(null); updateHud();
    setBg('map'); clearActors();
    YY.MAP.locs.forEach(l => {
      if (l.req && !l.req(G.flags)) return;
      spotButton(l.label, l.x, l.y, G.visited[l.id], () => {
        clearPanel();
        if (G.visited[l.id]) call('v_again'); else { G.visited[l.id] = true; call(l.node); }
        run();
      }, 'loc');
    });
    const missing = YY.MAP.need.filter(e => !G.ev.includes(e));
    textEl.className = 'sys';
    textEl.textContent = missing.length ? '选择要去的地方。' : '该问的都问到了。';
    if (!missing.length) {
      show(choicesEl, true);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'go'; b.textContent = '明日开堂';
      b.onclick = () => { map = null; clearPanel(); run(); };
      choicesEl.appendChild(b);
    }
  }

  // 质证
  function showTestimony() {
    mode = 'trial'; clearPanel(); updateHud();
    const T = YY.TRIALS[trial.id], list = G.trials[trial.id];
    let i = G.tidx[trial.id] || 0; if (i >= list.length) i = 0; G.tidx[trial.id] = i;
    const s = list[i];
    setSpeaker(T.who);
    nameEl.hidden = false; nameEl.textContent = SPEAKERS[T.who];
    show(testiEl, true); show(tctrlEl, true); panel.classList.add('trial-on');
    testiEl.querySelector('.t-title').textContent = '证词 · ' + T.title;
    testiEl.querySelector('.t-dots').innerHTML = list.map((x, j) => `<i class="${j === i ? 'on' : ''}${x.fresh ? ' new' : ''}"></i>`).join('');
    textEl.className = 'testi';
    textEl.textContent = `${'①②③④⑤⑥'[i]} ${s.t}`;
  }
  function tStep(d) {
    if (mode !== 'trial') return;
    const n = G.trials[trial.id].length;
    G.tidx[trial.id] = (G.tidx[trial.id] + d + n) % n; showTestimony();
  }
  function tPress() {
    if (mode !== 'trial') return;
    const s = G.trials[trial.id][G.tidx[trial.id]];
    clearPanel(); call(s.p); run();
  }
  function tPresent(ev) {
    const T = YY.TRIALS[trial.id];
    const s = G.trials[trial.id][G.tidx[trial.id]];
    const key = s.k + ':' + ev;
    clearPanel();
    if (T.present[key]) { const d = trial.depth; trial = null; stack.length = d; call(T.present[key]); run(); return; }
    call(T.side[key] || T.wrong); run();
  }

  // 卷宗
  let drawerMode = 'view', drawerSel = null;
  function openDrawer(m) {
    if (busy) return;
    drawerMode = m; drawerSel = G.ev[0] || null;
    drawer.hidden = false; renderDrawer();
    drawer.querySelector('.dr-close').focus();
  }
  function renderDrawer() {
    drawer.querySelector('.dr-title').textContent = drawerMode === 'present' ? '选择要出示的证物' : '卷宗';
    const grid = drawer.querySelector('.dr-grid'); grid.innerHTML = '';
    G.ev.forEach(id => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'dr-item' + (id === drawerSel ? ' sel' : '');
      b.innerHTML = evHtml(id) + `<span>${YY.EVIDENCE[id].name}</span>`;
      b.onclick = () => { drawerSel = id; renderDrawer(); };
      grid.appendChild(b);
    });
    const det = drawer.querySelector('.dr-detail');
    if (!drawerSel) { det.innerHTML = '<p>还没有拿到证物。</p>'; return; }
    const e = YY.EVIDENCE[drawerSel];
    det.innerHTML = `<div class="dr-name">${e.name}</div><p>${e.desc}</p>`;
    if (drawerMode === 'present') {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'go'; b.textContent = '出示「' + e.name + '」';
      b.onclick = () => { drawer.hidden = true; tPresent(drawerSel); };
      det.appendChild(b);
    }
  }

  // 提示
  function askFan() {
    if (busy || !(mode === 'inv' || mode === 'map' || mode === 'trial')) return;
    const text = map ? YY.MAP.hint(G) : (G.hint || '自己想。');
    NODES.__hint = [{ t: 'say', who: 'fan', text }];
    clearPanel(); call('__hint'); run();
  }

  // 特效
  function shake() { if (reduce) return; const w = $('#stagewrap'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); }
  function flash() { const f = layer('flash'); f.style.transition = 'none'; f.style.opacity = 0.85; requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = 0; }); }
  function fx(name, arg) {
    switch (name) {
      case 'slam': AU.knock(); flash(); shake(); return later(450);
      case 'shake': shake(); return false;
      case 'rain': setRain(arg === 'on'); return false;
      case 'dark': fade('dim', arg === 'on'); layer('dim').style.opacity = arg === 'on' ? 0.55 : 0; return later(600);
      case 'ink': setInk(arg === 'on'); return false;
      case 'pozhan': setPozhan(arg === 'on'); return false;
      case 'reset': setInk(false); setPozhan(false); setRain(false); layer('dim').style.opacity = 0; return false;
      case 'reveal': {
        clearPanel(); setSpeaker(null); busy = true;
        const z = actors.zhou; const steps = [
          [0, () => { AU.knock(); flash(); shake(); }],
          [350, () => { layer('dim').style.opacity = 0.7; }],
          [900, () => { if (z) z.setState('reveal', performance.now()); }],
          [1500, () => { setInk(true); layer('dim').style.opacity = 0; setRain(true); }],
          [2300, () => { setPozhan(true); AU.knock(); shake(); }],
          [3900, () => { busy = false; run(); }]
        ];
        steps.forEach(([ms, fn]) => setTimeout(fn, reduce ? ms / 3 : ms));
        return true;
      }
    }
    return false;
  }

  // ---------- 存档 ----------
  const clone = o => JSON.parse(JSON.stringify(o));
  function checkpoint(f) {
    CP = { node: f.node, pc: f.pc, G: clone(G), vis: snapshotVis() };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(CP)); } catch (e) { /* 存档只是方便，失败也能玩 */ }
  }
  function restore(cp, resetLq) {
    CP = cp; G = clone(cp.G); if (resetLq) G.lq = 5;
    inv = map = trial = null; busy = false;
    $('#over').hidden = true; $('#end').hidden = true; cardEl.hidden = true; tcardEl.hidden = true;
    restoreVis(cp.vis);
    stack = [{ node: cp.node, pc: cp.pc }];
    updateHud(); run();
  }
  function gameOver() {
    mode = 'over'; clearPanel(); $('#over').hidden = false; return true;
  }
  function theEnd() {
    mode = 'end'; clearPanel(); $('#end').hidden = false;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ }
    return true;
  }
  function newGame() {
    G = fresh(); stack = []; inv = map = trial = null; busy = false; CP = null;
    $('#over').hidden = true; $('#end').hidden = true; $('#titlescreen').hidden = true;
    fx('reset'); clearActors(); updateHud();
    call('start'); run();
  }
  function loadSave() {
    try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }

  // ---------- 事件 ----------
  panel.addEventListener('click', e => { if (e.target.closest('button')) return; advance(); });
  $('#stagewrap').addEventListener('click', e => { if (e.target.closest('button') || !$('#titlescreen').hidden) return; advance(); });
  document.addEventListener('keydown', e => {
    if (!drawer.hidden) { if (e.key === 'Escape') drawer.hidden = true; return; }
    if ((e.key === ' ' || e.key === 'Enter') && !e.target.closest('button')) { e.preventDefault(); advance(); }
    if (mode === 'trial') { if (e.key === 'ArrowLeft') tStep(-1); if (e.key === 'ArrowRight') tStep(1); }
  });
  $('#t-prev').onclick = () => tStep(-1);
  $('#t-next').onclick = () => tStep(1);
  $('#t-press').onclick = tPress;
  $('#t-present').onclick = () => { if (mode === 'trial') openDrawer('present'); };
  $('#b-file').onclick = () => openDrawer('view');
  $('#b-hint').onclick = askFan;
  $('#b-snd').onclick = () => { AU.setOn(!AU.on); $('#b-snd').textContent = AU.on ? '声音：开' : '声音：关'; };
  drawer.querySelector('.dr-close').onclick = () => { drawer.hidden = true; };
  drawer.addEventListener('click', e => { if (e.target === drawer) drawer.hidden = true; });
  $('#btn-start').onclick = () => { AU.init(); newGame(); };
  $('#btn-continue').onclick = () => { const s = loadSave(); if (!s) return; AU.init(); $('#titlescreen').hidden = true; restore(s, false); };
  $('#btn-retry').onclick = () => { if (CP) restore(CP, true); else newGame(); };
  $('#btn-again').onclick = () => { newGame(); };

  // 标题画面
  setBg('title');
  $('#btn-continue').hidden = !loadSave();
  updateHud();

  // 给自动化测试用的钩子
  window.__yy = {
    get mode() { return mode; }, get busy() { return busy; }, get G() { return G; }, get trial() { return trial && trial.id; },
    advance, choose(i) { choicesEl.querySelectorAll('button')[i].click(); },
    spot(label) { [...spotsEl.querySelectorAll('button')].find(b => b.textContent === label).click(); },
    go() { choicesEl.querySelector('button.go').click(); },
    press: tPress, present: tPresent, step: tStep,
    get stmt() { return trial ? G.trials[trial.id][G.tidx[trial.id]].k : null; },
    get text() { return textEl.textContent; }
  };
})();
