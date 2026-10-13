// ─────────────────────────────────────────────────────────────
//  Canvas effects engine: ambient particles behind the cards and
//  bursts, beams, slashes and flares on top. Themes drive it.
//
//  Built for phones: every shape is drawn once into a sprite and then
//  stamped, the loop only runs while something is on screen, ambient
//  particles redraw at 30fps, and quality drops by itself if frames
//  start taking too long.
// ─────────────────────────────────────────────────────────────

export type Shape =
  | 'leaf'
  | 'petal'
  | 'ember'
  | 'bubble'
  | 'spark'
  | 'star'
  | 'dot'
  | 'coin'
  | 'shuriken'
  | 'kunai'
  | 'smoke'
  | 'drop'
  | 'rock'
  | 'ash'
  | 'square'
  | 'orb'
  | 'feather'
  | 'cannonball'
  | 'firefly';

export interface Pt {
  x: number;
  y: number;
}

type Range = [number, number];

export interface BurstOpts {
  shapes: Shape[];
  colors: string[];
  count?: number;
  speed?: Range;
  life?: Range;
  size?: Range;
  gravity?: number;
  drag?: number;
  spin?: number;
  /** Additive glow. */
  glow?: boolean;
  /** Direction (radians) and spread; defaults to all around. */
  angle?: number;
  spread?: number;
  /** Shrink (or grow, if > 1) over the particle's life. */
  grow?: number;
  /** Paper-like flutter. */
  flutter?: boolean;
  /** Spawn radius. */
  radius?: number;
}

export interface AmbientConfig {
  shapes: Shape[];
  colors: string[];
  /** Particles on a big desktop screen (phones get fewer). */
  count: number;
  size: Range;
  /** Pixels per second: +y falls, -y rises. */
  fall: Range;
  drift: Range;
  spin?: number;
  alpha?: Range;
  glow?: boolean;
  flutter?: boolean;
  /** Sideways sway amplitude in px. */
  sway?: number;
  /** Twinkle (fireflies, sparks). */
  twinkle?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ay: number;
  drag: number;
  life: number;
  max: number;
  size: number;
  grow: number;
  rot: number;
  vr: number;
  alpha: number;
  sprite: HTMLCanvasElement;
  glow: boolean;
  flutter: boolean;
  sway: number;
  phase: number;
  twinkle: boolean;
}

interface Effect {
  t: number;
  dur: number;
  /** Return false when finished. */
  step(dt: number): boolean;
  draw(g: CanvasRenderingContext2D): void;
}

const TAU = Math.PI * 2;
const r = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

// ── sprites ─────────────────────────────────────────────────

const sprites = new Map<string, HTMLCanvasElement>();

function sprite(shape: Shape, color: string): HTMLCanvasElement {
  const key = shape + color;
  const hit = sprites.get(key);
  if (hit) return hit;
  const S = shape === 'smoke' ? 128 : 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.translate(S / 2, S / 2);
  g.scale(S / 64, S / 64);
  drawShape(g, shape, color);
  sprites.set(key, c);
  return c;
}

function radial(g: CanvasRenderingContext2D, r0: number, stops: [number, string][]) {
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r0);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

function drawShape(g: CanvasRenderingContext2D, shape: Shape, color: string) {
  g.fillStyle = color;
  g.strokeStyle = color;
  switch (shape) {
    case 'leaf':
      g.beginPath();
      g.moveTo(0, -28);
      g.bezierCurveTo(19, -16, 17, 16, 0, 28);
      g.bezierCurveTo(-17, 16, -19, -16, 0, -28);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(0, -24);
      g.lineTo(0, 26);
      g.stroke();
      break;
    case 'petal': {
      g.beginPath();
      g.moveTo(-4, -26);
      g.quadraticCurveTo(0, -20, 4, -26);
      g.bezierCurveTo(18, -12, 14, 14, 0, 26);
      g.bezierCurveTo(-14, 14, -18, -12, -4, -26);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath();
      g.ellipse(-4, -2, 4, 12, 0.2, 0, TAU);
      g.fill();
      break;
    }
    case 'ember':
    case 'firefly':
      g.fillStyle = radial(g, 30, [
        [0, '#fff'],
        [0.25, color],
        [1, 'rgba(0,0,0,0)'],
      ]);
      g.beginPath();
      g.arc(0, 0, 30, 0, TAU);
      g.fill();
      break;
    case 'orb':
      g.fillStyle = radial(g, 31, [
        [0, '#fff'],
        [0.45, color],
        [0.7, color],
        [1, 'rgba(0,0,0,0)'],
      ]);
      g.beginPath();
      g.arc(0, 0, 31, 0, TAU);
      g.fill();
      break;
    case 'bubble':
      g.lineWidth = 4;
      g.globalAlpha = 0.85;
      g.beginPath();
      g.arc(0, 0, 24, 0, TAU);
      g.stroke();
      g.globalAlpha = 0.18;
      g.fill();
      g.globalAlpha = 0.9;
      g.fillStyle = '#fff';
      g.beginPath();
      g.ellipse(-9, -10, 5, 3, -0.6, 0, TAU);
      g.fill();
      break;
    case 'spark':
      g.fillStyle = radial(g, 30, [
        [0, '#fff'],
        [0.4, color],
        [1, 'rgba(0,0,0,0)'],
      ]);
      g.beginPath();
      g.moveTo(0, -30);
      g.lineTo(6, 0);
      g.lineTo(0, 30);
      g.lineTo(-6, 0);
      g.closePath();
      g.fill();
      break;
    case 'star':
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 ? 11 : 27;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 2.5;
      g.stroke();
      break;
    case 'dot':
      g.beginPath();
      g.arc(0, 0, 24, 0, TAU);
      g.fill();
      break;
    case 'ash':
      g.globalAlpha = 0.8;
      g.beginPath();
      g.moveTo(-14, -6);
      g.lineTo(6, -16);
      g.lineTo(16, 4);
      g.lineTo(-2, 16);
      g.closePath();
      g.fill();
      break;
    case 'square':
      g.fillRect(-14, -20, 28, 40);
      break;
    case 'coin': {
      g.fillStyle = '#b8860b';
      g.beginPath();
      g.ellipse(0, 0, 26, 26, 0, 0, TAU);
      g.fill();
      g.fillStyle = color;
      g.beginPath();
      g.ellipse(0, 0, 21, 21, 0, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath();
      g.ellipse(-7, -8, 6, 4, -0.6, 0, TAU);
      g.fill();
      g.strokeStyle = '#8a6200';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, 0, 13, 0, TAU);
      g.stroke();
      break;
    }
    case 'shuriken':
      g.fillStyle = '#2b2f38';
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const rad = i % 2 ? 8 : 28;
        const a = (i * Math.PI) / 4;
        g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = color;
      g.lineWidth = 2;
      g.stroke();
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      g.arc(0, 0, 5, 0, TAU);
      g.fill();
      break;
    case 'kunai':
      // Points to +x so it can be aimed.
      g.fillStyle = '#c9d1d9';
      g.beginPath();
      g.moveTo(30, 0);
      g.lineTo(4, -8);
      g.lineTo(-2, 0);
      g.lineTo(4, 8);
      g.closePath();
      g.fill();
      g.strokeStyle = '#2b2f38';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = '#2b2f38';
      g.fillRect(-20, -3, 20, 6);
      g.strokeStyle = color;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(-25, 0, 5, 0, TAU);
      g.stroke();
      break;
    case 'smoke':
      g.fillStyle = radial(g, 30, [
        [0, color],
        [0.55, color],
        [1, 'rgba(0,0,0,0)'],
      ]);
      g.globalAlpha = 0.55;
      g.beginPath();
      g.arc(0, 0, 30, 0, TAU);
      g.fill();
      break;
    case 'drop':
      g.beginPath();
      g.moveTo(0, -26);
      g.bezierCurveTo(14, -6, 16, 20, 0, 22);
      g.bezierCurveTo(-16, 20, -14, -6, 0, -26);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath();
      g.ellipse(-5, 6, 3, 7, 0.3, 0, TAU);
      g.fill();
      break;
    case 'rock':
      g.beginPath();
      g.moveTo(-20, -8);
      g.lineTo(-6, -22);
      g.lineTo(16, -16);
      g.lineTo(22, 6);
      g.lineTo(6, 20);
      g.lineTo(-18, 14);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath();
      g.moveTo(22, 6);
      g.lineTo(6, 20);
      g.lineTo(-18, 14);
      g.lineTo(0, 4);
      g.closePath();
      g.fill();
      break;
    case 'feather':
      g.beginPath();
      g.moveTo(0, -28);
      g.bezierCurveTo(12, -10, 10, 14, 0, 28);
      g.bezierCurveTo(-10, 14, -12, -10, 0, -28);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.2)';
      g.lineWidth = 1.5;
      for (let i = -20; i < 24; i += 6) {
        g.beginPath();
        g.moveTo(0, i);
        g.lineTo(8, i - 5);
        g.moveTo(0, i);
        g.lineTo(-8, i - 5);
        g.stroke();
      }
      break;
    case 'cannonball':
      g.fillStyle = radial(g, 22, [
        [0, '#6b6b6b'],
        [0.6, '#2a2a2a'],
        [1, '#111'],
      ]);
      g.beginPath();
      g.arc(0, 0, 22, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath();
      g.ellipse(-7, -8, 5, 3, -0.6, 0, TAU);
      g.fill();
      break;
  }
}

// ── the engine ──────────────────────────────────────────────

class FxEngine {
  private back: HTMLCanvasElement | null = null;
  private front: HTMLCanvasElement | null = null;
  private bg: CanvasRenderingContext2D | null = null;
  private fg: CanvasRenderingContext2D | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private parts: Particle[] = [];
  private amb: Particle[] = [];
  private effects: Effect[] = [];
  private ambient: AmbientConfig | null = null;
  private raf = 0;
  private last = 0;
  private ambAcc = 0;
  private frameAvg = 16;
  private slowFor = 0;
  private quality = 1;
  private mode: 'auto' | 'full' | 'lite' = 'auto';
  private frontDirty = false;
  private flashEl: HTMLDivElement | null = null;
  private shakeEl: HTMLElement | null = null;
  private readonly touch = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none)').matches;

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.kick()));
    if (this.touch) this.quality = 0.75;
  }

  setQuality(mode: 'auto' | 'full' | 'lite') {
    this.mode = mode;
    this.quality = mode === 'lite' ? 0.45 : mode === 'full' ? 1 : this.touch ? 0.75 : 1;
    this.resize();
    this.refillAmbient();
  }

  /** Canvases come and go with the screens; the engine draws on whichever is mounted. */
  attach(layer: 'back' | 'front', el: HTMLCanvasElement | null) {
    if (layer === 'back') {
      this.back = el;
      this.bg = el?.getContext('2d') ?? null;
    } else {
      this.front = el;
      this.fg = el?.getContext('2d') ?? null;
      if (!el) {
        this.parts = [];
        this.effects = [];
      }
    }
    this.resize();
    this.kick();
  }

  /** The element that shakes on big hits. */
  setShakeTarget(el: HTMLElement | null) {
    this.shakeEl = el;
  }

  setAmbient(cfg: AmbientConfig | null) {
    this.ambient = cfg;
    this.amb = [];
    this.refillAmbient(true);
    this.kick();
  }

  private ambientTarget(): number {
    if (!this.ambient) return 0;
    const area = Math.min(1, (this.w * this.h) / (1440 * 900));
    return Math.round(this.ambient.count * Math.max(0.45, area) * this.quality);
  }

  private refillAmbient(scatter = false) {
    const target = this.ambientTarget();
    if (this.amb.length > target) this.amb.length = target;
    while (this.amb.length < target) this.amb.push(this.spawnAmbient(scatter));
  }

  private spawnAmbient(scatter: boolean): Particle {
    const c = this.ambient!;
    const fall = r(...c.fall);
    const p: Particle = {
      x: r(-20, this.w + 20),
      y: scatter ? r(0, this.h) : fall >= 0 ? r(-60, -10) : this.h + r(10, 60),
      vx: r(...c.drift),
      vy: fall,
      ay: 0,
      drag: 0,
      life: 0,
      max: Infinity,
      size: r(...c.size),
      grow: 1,
      rot: r(0, TAU),
      vr: r(-1, 1) * (c.spin ?? 1),
      alpha: r(...(c.alpha ?? [0.55, 0.95])),
      sprite: sprite(pick(c.shapes), pick(c.colors)),
      glow: !!c.glow,
      flutter: !!c.flutter,
      sway: c.sway ?? 0,
      phase: r(0, TAU),
      twinkle: !!c.twinkle,
    };
    return p;
  }

  private resize() {
    if (typeof window === 'undefined') return;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    const cap = this.touch ? 1.5 : 2;
    this.dpr = Math.min(window.devicePixelRatio || 1, cap) * (this.quality < 0.6 ? 0.75 : 1);
    for (const c of [this.back, this.front]) {
      if (!c) continue;
      c.width = Math.round(this.w * this.dpr);
      c.height = Math.round(this.h * this.dpr);
      c.style.width = `${this.w}px`;
      c.style.height = `${this.h}px`;
    }
    this.frontDirty = !!this.front;
  }

  private kick() {
    if (this.raf || document.hidden) return;
    if (!this.busy()) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private busy() {
    return (this.ambient && this.bg && this.amb.length > 0) || this.parts.length > 0 || this.effects.length > 0 || this.frontDirty;
  }

  private frame(now: number) {
    this.raf = 0;
    const dtMs = Math.min(64, now - this.last);
    this.last = now;
    const dt = dtMs / 1000;
    this.adapt(dtMs);

    // Ambient layer: 30 frames a second is plenty for drifting leaves.
    if (this.ambient && this.bg) {
      this.ambAcc += dtMs;
      if (this.ambAcc >= 32) {
        this.stepAmbient(this.ambAcc / 1000);
        this.drawAmbient();
        this.ambAcc = 0;
      }
    }

    // Front layer: bursts and effects.
    if (this.fg && (this.parts.length || this.effects.length || this.frontDirty)) {
      this.stepParts(dt);
      this.effects = this.effects.filter((e) => {
        e.t += dt;
        return e.step(dt);
      });
      this.drawFront();
      this.frontDirty = this.parts.length > 0 || this.effects.length > 0;
    } else if (!this.fg) {
      this.frontDirty = false;
    }

    if (this.busy()) this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  /** Drops the particle budget if the device is struggling. */
  private adapt(dtMs: number) {
    if (this.mode !== 'auto') return;
    this.frameAvg = this.frameAvg * 0.95 + dtMs * 0.05;
    if (this.frameAvg > 25) this.slowFor += dtMs;
    else this.slowFor = Math.max(0, this.slowFor - dtMs);
    if (this.slowFor > 1500 && this.quality > 0.4) {
      this.quality = Math.max(0.4, this.quality * 0.7);
      this.slowFor = 0;
      this.frameAvg = 16;
      this.refillAmbient();
    }
  }

  private stepAmbient(dt: number) {
    for (let i = 0; i < this.amb.length; i++) {
      const p = this.amb[i];
      p.phase += dt * 1.6;
      p.x += (p.vx + Math.sin(p.phase) * p.sway) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const out = p.vy >= 0 ? p.y > this.h + 40 : p.y < -40;
      if (out || p.x < -80 || p.x > this.w + 80) this.amb[i] = this.spawnAmbient(false);
    }
    if (this.amb.length !== this.ambientTarget()) this.refillAmbient();
  }

  private drawAmbient() {
    const g = this.bg!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.back!.width, this.back!.height);
    for (const p of this.amb) this.drawParticle(g, p, p.twinkle ? p.alpha * (0.55 + 0.45 * Math.sin(p.phase * 2.3)) : p.alpha);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }

  private stepParts(dt: number) {
    const ps = this.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += dt;
      if (p.life >= p.max) {
        ps[i] = ps[ps.length - 1];
        ps.pop();
        continue;
      }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k;
      p.vy = p.vy * k + p.ay * dt;
      p.phase += dt * 5;
      p.x += (p.vx + (p.sway ? Math.sin(p.phase) * p.sway : 0)) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
  }

  private drawFront() {
    const g = this.fg!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.front!.width, this.front!.height);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const e of this.effects) e.draw(g);
    for (const p of this.parts) {
      const u = p.life / p.max;
      const a = p.alpha * (u < 0.1 ? u / 0.1 : 1 - Math.max(0, (u - 0.55) / 0.45));
      this.drawParticle(g, p, a, 1 + (p.grow - 1) * u);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }

  private drawParticle(g: CanvasRenderingContext2D, p: Particle, alpha: number, scale = 1) {
    if (alpha <= 0.01) return;
    const s = p.size * scale;
    const d = this.dpr;
    const cos = Math.cos(p.rot);
    const sin = Math.sin(p.rot);
    const fx = p.flutter ? Math.cos(p.phase * 1.7) : 1;
    g.globalCompositeOperation = p.glow ? 'lighter' : 'source-over';
    g.globalAlpha = Math.min(1, alpha);
    g.setTransform(cos * d * fx, sin * d * fx, -sin * d, cos * d, p.x * d, p.y * d);
    g.drawImage(p.sprite, -s / 2, -s / 2, s, s);
  }

  private add(p: Partial<Particle> & Pick<Particle, 'x' | 'y' | 'sprite'>) {
    const cap = Math.round(500 * this.quality);
    if (this.parts.length >= cap) return;
    this.parts.push({
      vx: 0,
      vy: 0,
      ay: 0,
      drag: 0,
      life: 0,
      max: 1,
      size: 12,
      grow: 1,
      rot: 0,
      vr: 0,
      alpha: 1,
      glow: false,
      flutter: false,
      sway: 0,
      phase: Math.random() * TAU,
      twinkle: false,
      ...p,
    });
  }

  private live(): boolean {
    return !!this.fg && !document.hidden;
  }

  // ── public effects ────────────────────────────────────────

  burst(x: number, y: number, o: BurstOpts) {
    if (!this.live()) return;
    const n = Math.max(1, Math.round((o.count ?? 24) * this.quality));
    const [s0, s1] = o.speed ?? [120, 420];
    for (let i = 0; i < n; i++) {
      const a = (o.angle ?? 0) + (o.spread === undefined ? r(0, TAU) : r(-o.spread / 2, o.spread / 2));
      const v = r(s0, s1);
      const rad = o.radius ? r(0, o.radius) : 0;
      this.add({
        x: x + Math.cos(a) * rad,
        y: y + Math.sin(a) * rad,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        ay: o.gravity ?? 260,
        drag: o.drag ?? 1.4,
        max: r(...(o.life ?? [0.55, 1.1])),
        size: r(...(o.size ?? [8, 18])),
        grow: o.grow ?? 0.6,
        rot: r(0, TAU),
        vr: r(-1, 1) * (o.spin ?? 6),
        sprite: sprite(pick(o.shapes), pick(o.colors)),
        glow: !!o.glow,
        flutter: !!o.flutter,
        sway: o.flutter ? 40 : 0,
      });
    }
    this.kick();
  }

  smoke(x: number, y: number, o: { color?: string; colors?: string[]; count?: number; size?: Range; life?: Range; speed?: Range; rise?: number } = {}) {
    this.burst(x, y, {
      shapes: ['smoke'],
      colors: o.colors ?? [o.color ?? '#e8e8ee'],
      count: o.count ?? 10,
      size: o.size ?? [50, 100],
      life: o.life ?? [0.6, 1.2],
      speed: o.speed ?? [30, 160],
      gravity: -(o.rise ?? 40),
      drag: 2.5,
      grow: 1.8,
      spin: 1,
    });
  }

  /** Something flying from A to B (kunai, cannonball, ki blast…). */
  projectile(
    from: Pt,
    to: Pt,
    o: {
      shape: Shape;
      color: string;
      size?: number;
      dur?: number;
      arc?: number;
      spin?: number;
      /** Point the sprite along its path (kunai). */
      aim?: boolean;
      glow?: boolean;
      trail?: { shape: Shape; colors: string[]; size?: Range; life?: Range; every?: number; glow?: boolean };
      onHit?: () => void;
      delay?: number;
    },
  ) {
    if (!this.live()) {
      o.onHit?.();
      return;
    }
    const dur = o.dur ?? 0.45;
    const sp = sprite(o.shape, o.color);
    const size = o.size ?? 30;
    const ctrl = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - (o.arc ?? 60) };
    const pos = (u: number) => ({
      x: (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * ctrl.x + u * u * to.x,
      y: (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * ctrl.y + u * u * to.y,
    });
    let acc = 0;
    let rot = 0;
    let hit = false;
    const delay = o.delay ?? 0;
    const self = this;
    this.effects.push({
      t: -delay,
      dur,
      step(dt) {
        if (this.t < 0) return true;
        const u = Math.min(1, this.t / dur);
        rot += (o.spin ?? 0) * dt;
        if (o.trail) {
          acc += dt;
          const every = (o.trail.every ?? 0.016) / self.quality;
          while (acc > every) {
            acc -= every;
            const p = pos(u);
            self.add({
              x: p.x + r(-4, 4),
              y: p.y + r(-4, 4),
              vx: r(-20, 20),
              vy: r(-20, 20),
              max: r(...(o.trail.life ?? [0.25, 0.5])),
              size: r(...(o.trail.size ?? [10, 20])),
              grow: 0.4,
              sprite: sprite(pick([o.trail.shape]), pick(o.trail.colors)),
              glow: !!o.trail.glow,
              drag: 2,
            });
          }
        }
        if (u >= 1 && !hit) {
          hit = true;
          o.onHit?.();
          return false;
        }
        return true;
      },
      draw(g) {
        if (this.t < 0) return;
        const u = ease(Math.min(1, this.t / dur));
        const p = pos(u);
        let a = rot;
        if (o.aim) {
          const q = pos(Math.min(1, u + 0.02));
          a = Math.atan2(q.y - p.y, q.x - p.x);
        }
        const d = self.dpr;
        g.globalCompositeOperation = o.glow ? 'lighter' : 'source-over';
        g.globalAlpha = 1;
        g.setTransform(Math.cos(a) * d, Math.sin(a) * d, -Math.sin(a) * d, Math.cos(a) * d, p.x * d, p.y * d);
        g.drawImage(sp, -size / 2, -size / 2, size, size);
        g.setTransform(d, 0, 0, d, 0, 0);
        g.globalCompositeOperation = 'source-over';
      },
    });
    this.kick();
  }

  /** A thick glowing beam (energy blasts). */
  beam(from: Pt, to: Pt, o: { color: string; width?: number; dur?: number; core?: string }) {
    if (!this.live()) return;
    const dur = o.dur ?? 0.9;
    const w = o.width ?? 26;
    this.effects.push({
      t: 0,
      dur,
      step() {
        return this.t < dur;
      },
      draw(g) {
        const u = this.t / dur;
        const grow = ease(u / 0.25);
        const fade = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
        const x = from.x + (to.x - from.x) * grow;
        const y = from.y + (to.y - from.y) * grow;
        const wob = 1 + Math.sin(this.t * 60) * 0.12;
        g.globalCompositeOperation = 'lighter';
        g.lineCap = 'round';
        for (const [k, a, c] of [
          [2.6, 0.18, o.color],
          [1.5, 0.4, o.color],
          [0.55, 0.95, o.core ?? '#ffffff'],
        ] as const) {
          g.globalAlpha = a * fade;
          g.strokeStyle = c;
          g.lineWidth = w * k * wob;
          g.beginPath();
          g.moveTo(from.x, from.y);
          g.lineTo(x, y);
          g.stroke();
        }
        g.globalAlpha = fade;
        g.globalCompositeOperation = 'source-over';
      },
    });
    this.kick();
  }

  /** A sword stroke: a curved, tapered arc that sweeps across. */
  slash(from: Pt, to: Pt, o: { color: string; width?: number; bend?: number; dur?: number; glow?: string }) {
    if (!this.live()) return;
    const dur = o.dur ?? 0.55;
    const w = o.width ?? 14;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const bend = o.bend ?? 0.25;
    const ctrl = { x: (from.x + to.x) / 2 - dy * bend, y: (from.y + to.y) / 2 + dx * bend };
    const pt = (u: number) => ({
      x: (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * ctrl.x + u * u * to.x,
      y: (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * ctrl.y + u * u * to.y,
    });
    this.effects.push({
      t: 0,
      dur,
      step() {
        return this.t < dur;
      },
      draw(g) {
        const u = this.t / dur;
        const head = ease(u / 0.35);
        const tail = Math.max(0, ease((u - 0.25) / 0.6));
        const N = 18;
        g.lineCap = 'round';
        for (const [k, a, c, mode] of [
          [2.4, 0.35, o.glow ?? o.color, 'lighter'],
          [1, 1, o.color, 'source-over'],
          [0.35, 0.9, '#ffffff', 'lighter'],
        ] as const) {
          g.globalCompositeOperation = mode;
          g.strokeStyle = c;
          for (let i = 0; i < N; i++) {
            const u0 = tail + ((head - tail) * i) / N;
            const u1 = tail + ((head - tail) * (i + 1)) / N;
            const taper = Math.sin((Math.PI * (i + 0.5)) / N);
            g.globalAlpha = a * (1 - tail * 0.6);
            g.lineWidth = Math.max(0.5, w * k * taper);
            const p0 = pt(u0);
            const p1 = pt(u1);
            g.beginPath();
            g.moveTo(p0.x, p0.y);
            g.lineTo(p1.x, p1.y);
            g.stroke();
          }
        }
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
      },
    });
    this.kick();
  }

  /** A crackling lightning bolt. */
  bolt(from: Pt, to: Pt, o: { color: string; dur?: number; width?: number }) {
    if (!this.live()) return;
    const dur = o.dur ?? 0.4;
    let pts: Pt[] = [];
    let since = 1;
    const make = () => {
      const n = 10;
      pts = [from];
      const nx = -(to.y - from.y);
      const ny = to.x - from.x;
      const len = Math.hypot(nx, ny) || 1;
      for (let i = 1; i < n; i++) {
        const u = i / n;
        const off = r(-1, 1) * 0.09 * len;
        pts.push({ x: from.x + (to.x - from.x) * u + (nx / len) * off, y: from.y + (to.y - from.y) * u + (ny / len) * off });
      }
      pts.push(to);
    };
    this.effects.push({
      t: 0,
      dur,
      step(dt) {
        since += dt;
        if (since > 0.05) {
          make();
          since = 0;
        }
        return this.t < dur;
      },
      draw(g) {
        const fade = 1 - this.t / dur;
        g.globalCompositeOperation = 'lighter';
        g.lineJoin = 'round';
        for (const [wd, a, c] of [
          [(o.width ?? 5) * 3, 0.3, o.color],
          [o.width ?? 5, 1, '#ffffff'],
        ] as const) {
          g.strokeStyle = c;
          g.globalAlpha = a * fade;
          g.lineWidth = wd;
          g.beginPath();
          pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
          g.stroke();
        }
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
      },
    });
    this.kick();
  }

  /** An expanding shockwave ring. */
  ring(x: number, y: number, o: { color: string; r0?: number; r1?: number; width?: number; dur?: number; squash?: number; glow?: boolean }) {
    if (!this.live()) return;
    const dur = o.dur ?? 0.6;
    this.effects.push({
      t: 0,
      dur,
      step() {
        return this.t < dur;
      },
      draw(g) {
        const u = ease(this.t / dur);
        const rad = (o.r0 ?? 10) + ((o.r1 ?? 160) - (o.r0 ?? 10)) * u;
        g.globalCompositeOperation = o.glow ? 'lighter' : 'source-over';
        g.globalAlpha = 1 - this.t / dur;
        g.strokeStyle = o.color;
        g.lineWidth = (o.width ?? 8) * (1 - u * 0.7);
        g.beginPath();
        g.ellipse(x, y, rad, rad * (o.squash ?? 1), 0, 0, TAU);
        g.stroke();
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
      },
    });
    this.kick();
  }

  /** Comic speed lines bursting out from a point. */
  lines(x: number, y: number, o: { color: string; count?: number; dur?: number; inner?: number }) {
    if (!this.live()) return;
    const dur = o.dur ?? 0.5;
    const n = Math.round((o.count ?? 36) * Math.max(0.6, this.quality));
    const rays = Array.from({ length: n }, () => ({ a: r(0, TAU), w: r(2, 7), l: r(0.5, 1) }));
    const far = Math.hypot(this.w, this.h);
    this.effects.push({
      t: 0,
      dur,
      step() {
        return this.t < dur;
      },
      draw(g) {
        const u = this.t / dur;
        g.globalAlpha = (1 - u) * 0.85;
        g.fillStyle = o.color;
        for (const ray of rays) {
          const r0 = (o.inner ?? 90) + u * 120;
          const r1 = r0 + far * ray.l;
          const c = Math.cos(ray.a);
          const s = Math.sin(ray.a);
          g.beginPath();
          g.moveTo(x + c * r0, y + s * r0);
          g.lineTo(x + c * r1 - s * ray.w * 2, y + s * r1 + c * ray.w * 2);
          g.lineTo(x + c * r1 + s * ray.w * 2, y + s * r1 - c * ray.w * 2);
          g.closePath();
          g.fill();
        }
        g.globalAlpha = 1;
      },
    });
    this.kick();
  }

  /** A signal flare: shoots up trailing thick coloured smoke, then pops. */
  flare(x: number, y: number, o: { color: string; height?: number; dur?: number }) {
    const top = { x: x + r(-30, 30), y: Math.max(30, y - (o.height ?? this.h * 0.55)) };
    this.projectile(
      { x, y },
      top,
      {
        shape: 'ember',
        color: o.color,
        size: 26,
        dur: o.dur ?? 0.9,
        arc: 20,
        glow: true,
        trail: { shape: 'smoke', colors: [o.color], size: [36, 70], life: [1.4, 2.4], every: 0.02 },
        onHit: () => {
          this.burst(top.x, top.y, { shapes: ['spark', 'ember'], colors: [o.color, '#fff'], count: 26, glow: true, gravity: 120 });
          this.smoke(top.x, top.y, { color: o.color, count: 8, life: [1.6, 2.6], rise: 10 });
        },
      },
    );
  }

  /** Things raining down from the top of the screen (coins, petals…). */
  rain(o: { shapes: Shape[]; colors: string[]; count?: number; size?: Range; flutter?: boolean; glow?: boolean }) {
    if (!this.live()) return;
    const n = Math.round((o.count ?? 60) * this.quality);
    for (let i = 0; i < n; i++) {
      this.add({
        x: r(0, this.w),
        y: r(-this.h * 0.4, -10),
        vx: r(-60, 60),
        vy: r(120, 340),
        ay: 160,
        drag: 0.4,
        max: r(2.2, 3.6),
        size: r(...(o.size ?? [12, 24])),
        grow: 1,
        rot: r(0, TAU),
        vr: r(-5, 5),
        sprite: sprite(pick(o.shapes), pick(o.colors)),
        glow: !!o.glow,
        flutter: !!o.flutter,
        sway: o.flutter ? 50 : 0,
      });
    }
    this.kick();
  }

  /** A quick full-screen flash. */
  flash(color = '#fff', alpha = 0.6, ms = 260) {
    if (typeof document === 'undefined' || document.hidden) return;
    if (!this.flashEl) {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:65;opacity:0;';
      document.body.appendChild(el);
      this.flashEl = el;
    }
    this.flashEl.style.background = color;
    this.flashEl.animate([{ opacity: alpha }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
  }

  /** Shakes the table (transform only, so it stays smooth). */
  shake(power = 10, ms = 420) {
    const el = this.shakeEl;
    if (!el || document.hidden) return;
    const p = power * (this.quality < 0.6 ? 0.7 : 1);
    const frames: Keyframe[] = [];
    for (let i = 0; i <= 8; i++) {
      const k = 1 - i / 8;
      frames.push({ transform: i === 8 ? 'none' : `translate(${r(-p, p) * k}px, ${r(-p, p) * k}px)` });
    }
    el.animate(frames, { duration: ms, easing: 'linear' });
  }
}

export const fx = new FxEngine();
