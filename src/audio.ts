// 音效与背景音乐：全部用 ZzFX 合成器即时生成（见 zzfx.ts），不需要音频文件。
// 以后换成素材库的音频文件时，只要把 play() 里的 buffer 换成解码后的文件即可。
import { SAMPLE_RATE, buildSamples } from './zzfx';

export type Sfx =
  | 'shoot' | 'hit' | 'fire' | 'boom' | 'bolt' | 'coin' | 'kill' | 'merge' | 'build' | 'sell' | 'leak' | 'deny'
  | 'click' | 'wave' | 'boss' | 'quake' | 'win' | 'lose' | 'skill' | 'elite' | 'draft';

type P = number[];
// ZzFX 参数顺序：音量, 随机, 频率, 起音, 延音, 释放, 波形, 曲线, 滑音, 加速滑音, 跳音, 跳音时间, 重复, 噪声, 调制, 降采样, 回声, 延音音量, 衰减, 颤音, 滤波
const SFX: Partial<Record<Sfx, { p: P; gain?: number; gap?: number }>> = {
  shoot: { p: [.5, .05, 620, 0, .01, .09, 2, 1, -24, 0, 0, 0, 0, 0, 0, 0, 0, .8, .01, 0, 2400], gain: 0.35, gap: .05 },
  hit: { p: [.5, .2, 180, 0, 0, .06, 4, 1, -6, 0, 0, 0, 0, 1.5, 0, 0, 0, .6, .02, 0, 1600], gain: 0.3, gap: .04 },
  fire: { p: [.45, .1, 140, .04, .06, .22, 4, 1, 6, 0, 0, 0, 0, .8, 0, 0, 0, .7, .05, 0, 900], gain: 0.4, gap: .08 },
  boom: { p: [1, .1, 70, .005, .1, .55, 4, 1.6, -3, 0, 0, 0, 0, .7, 0, .05, 0, .5, .06, 0, 700], gain: 0.75, gap: .07 },
  bolt: { p: [.7, .05, 240, 0, .02, .16, 2, .6, -12, 0, 0, 0, 0, .2, 0, 0, 0, .7, .02, 0, 1300], gain: 0.5, gap: .06 },
  coin: { p: [.35, 0, 1250, 0, .02, .14, 1, 1.5, 0, 0, 620, .05, 0, 0, 0, 0, 0, .7, .01], gain: 0.3, gap: .06 },
  kill: { p: [.35, .15, 420, 0, 0, .07, 0, 1.4, 28, 0, 0, 0, 0, 0, 0, 0, 0, .5, .01], gain: 0.3, gap: .04 },
  build: { p: [.8, .05, 95, 0, .03, .2, 0, 1, -5, 0, 0, 0, 0, .4, 0, 0, 0, .6, .03, 0, 600], gain: 0.6 },
  sell: { p: [.4, 0, 900, 0, .02, .12, 1, 1.5, 0, 0, -300, .05, 0, 0, 0, 0, 0, .6, .01], gain: 0.5 },
  leak: { p: [.7, 0, 110, .02, .18, .35, 2, 1, -1, 0, 0, 0, .12, 0, 0, 0, 0, .7, .05, .4, 800], gain: 0.8 },
  deny: { p: [.4, 0, 170, 0, .06, .06, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, .5, 0, 0, 700], gain: 0.45 },
  click: { p: [.25, 0, 1000, 0, 0, .03, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, .5], gain: 0.35 },
  quake: { p: [1, .1, 45, .05, .4, .8, 4, 2, -1, 0, 0, 0, 0, 1, 0, .1, 0, .6, .1, .3, 300], gain: 0.9 },
  skill: { p: [.7, .05, 900, .02, .15, .35, 4, 1, -22, 0, 0, 0, 0, 1, 0, 0, 0, .6, .05, 0, 2200], gain: 0.7 },
  elite: { p: [.35, 0, 1500, 0, .03, .25, 0, 1.5, 0, 0, 400, .06, .1, 0, 0, 0, .1, .6, .01, .3], gain: 0.45, gap: .5 },
  boss: { p: [1, .05, 55, .05, .5, .8, 2, 1.5, -.6, 0, 0, 0, 0, .3, 4, .05, 0, .7, .1, .4, 500], gain: 0.9 },
};

const note = (semis: number, base = 261.63) => base * Math.pow(2, semis / 12);
const PLUCK = (f: number): P => [.3, 0, f, 0, .01, .7, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, .3, .06];
const BRASS = (f: number): P => [.45, 0, f, .03, .14, .22, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, .8, .03, 0, 1300];
const BASS = (f: number): P => [.45, 0, f, .01, .1, .45, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, .6, .05, 0, 500];
const TOM: P = [.6, 0, 95, 0, 0, .22, 0, 1, -9, 0, 0, 0, 0, 0, 0, 0, 0, .6, .02];
const HAT: P = [.12, 0, 3000, 0, 0, .04, 4, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, .5, 0, 0, -5000];

// 背景音乐：D 多利亚调式的鲁特琴式琶音，四小节循环（Dm – C – B♭ – C）
const D3 = note(-10), C3 = note(-12), Bb2 = note(-14);
const CHORDS = [
  { bass: D3, tones: [2, 5, 9, 14] },
  { bass: C3, tones: [0, 4, 7, 12] },
  { bass: Bb2, tones: [-2, 2, 5, 10] },
  { bass: C3, tones: [0, 4, 7, 12] },
];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];

export type Mood = 'calm' | 'battle' | 'boss';

export class Audio {
  private ctx: AudioContext | null = null;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private cache = new Map<string, AudioBuffer[]>();
  private last: Partial<Record<Sfx, number>> = {};
  muted = false;
  musicOn = true;
  mood: Mood = 'calm';
  private step = 0;
  private nextTime = 0;
  private timer = 0;

  private ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.ratio.value = 6;
        comp.connect(this.ctx.destination);
        const master = this.ctx.createGain();
        master.gain.value = 0.9;
        master.connect(comp);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.9;
        this.sfxGain.connect(master);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.32;
        this.musicGain.connect(master);
      } catch { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private buffers(key: string, p: P, variants = 3): AudioBuffer[] {
    let list = this.cache.get(key);
    if (!list) {
      list = [];
      for (let i = 0; i < variants; i++) {
        const data = buildSamples(...p) as number[];
        // 统一归一化到同一峰值，响度只由各音效的 gain 决定
        let peak = 0;
        for (const v of data) { const a = Math.abs(v); if (a > peak) peak = a; }
        const k = peak > 0 ? 0.8 / peak : 1;
        for (let j = 0; j < data.length; j++) data[j] *= k;
        const buf = this.ctx!.createBuffer(1, Math.max(1, data.length), SAMPLE_RATE);
        buf.getChannelData(0).set(data);
        list.push(buf);
      }
      this.cache.set(key, list);
    }
    return list;
  }

  private fire(key: string, p: P, out: GainNode, when = 0, gain = 1, rate = 1) {
    const ctx = this.ctx!;
    const list = this.buffers(key, p, key.startsWith('n:') ? 1 : 3);
    const src = ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(out);
    src.start(Math.max(ctx.currentTime, when));
  }

  unlock() {
    if (!this.ensure()) return;
    if (this.musicOn && !this.timer) this.startMusic();
  }

  play(s: Sfx) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const def = SFX[s];
    const now = ctx.currentTime;
    if ((this.last[s] ?? -1) + (def?.gap ?? 0.03) > now) return;
    this.last[s] = now;
    if (def) { this.fire(s, def.p, this.sfxGain, 0, def.gain ?? 1, 0.94 + Math.random() * 0.12); return; }
    const seq = (notes: number[], inst: (f: number) => P, step: number, base = 523.25, gain = .8) =>
      notes.forEach((n, i) => this.fire(`n:${inst === BRASS ? 'b' : 'p'}:${n}:${base}`, inst(note(n, base)), this.sfxGain, now + i * step, gain));
    switch (s) {
      case 'merge': seq([0, 4, 7, 12], PLUCK, .06, 523.25, .55); break;
      case 'draft': seq([0, 2, 4, 7, 9, 12], PLUCK, .04, 392, .4); break;
      case 'wave': seq([0, 7], BRASS, .16, 146.83, .55); break;
      case 'win': seq([0, 4, 7, 12, 16, 19], BRASS, .14, 261.63, .55); break;
      case 'lose': seq([7, 3, 0, -5], BRASS, .22, 220, .55); break;
    }
  }

  // ---------- 背景音乐 ----------
  setMusic(on: boolean) {
    this.musicOn = on;
    if (!on) this.stopMusic();
    else if (this.ctx) this.startMusic();
  }

  private startMusic() {
    if (this.timer || !this.ctx) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.musicGain.gain.setTargetAtTime(0.32, this.ctx.currentTime, 0.3);
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  private stopMusic() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = 0;
    if (this.ctx) this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }

  private schedule() {
    const ctx = this.ctx!;
    const stepDur = this.mood === 'boss' ? 0.13 : 0.15;
    while (this.nextTime < ctx.currentTime + 0.25) {
      const t = this.nextTime, st = this.step % 16, bar = Math.floor(this.step / 16) % 4;
      const ch = CHORDS[bar];
      if (this.muted) { this.nextTime += stepDur; this.step++; continue; }
      if (st === 0 || st === 8) this.fire(`n:bass:${ch.bass}`, BASS(ch.bass), this.musicGain, t, 0.5);
      if (st % 2 === 0) {
        const tone = ch.tones[ARP[(st / 2) % 8]];
        this.fire(`n:pluck:${tone}`, PLUCK(note(tone)), this.musicGain, t, 0.35);
      }
      if (this.mood !== 'calm') {
        if (st === 0 || st === 6 || st === 8 || (this.mood === 'boss' && st % 4 === 2)) this.fire('n:tom', TOM, this.musicGain, t, this.mood === 'boss' ? 0.6 : 0.45);
        if (st % 2 === 1) this.fire('n:hat', HAT, this.musicGain, t, 0.15);
      }
      this.nextTime += stepDur;
      this.step++;
    }
  }
}
