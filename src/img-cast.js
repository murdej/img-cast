// img-cast – přehrávač animací podle JSON scriptu. Bez závislostí, bez frameworku.

const ALIGN_X = { left: 0, center: 50, right: 100 };
const ALIGN_Y = { top: 0, center: 50, bottom: 100 };

/** Číslo nebo řetězec bez jednotky = px, ostatní (px, %, ...) beze změny. */
function toCssLength(v) {
  if (typeof v === 'number') return v + 'px';
  const s = String(v).trim();
  return /^-?[\d.]+$/.test(s) ? s + 'px' : s;
}

function toAlignPercent(v, table, fallback) {
  if (v === undefined || v === null) return fallback;
  if (v in table) return table[v];
  const n = parseFloat(v);
  return Number.isNaN(n) ? fallback : n;
}

/** cubic-bezier(x1, y1, x2, y2) → funkce t ∈ <0,1> → pokrok (jako CSS). */
function cubicBezier(x1, y1, x2, y2) {
  const bez = (a, b, t) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (bez(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return bez(y1, y2, (lo + hi) / 2);
  };
}

const EASINGS = {
  linear: (t) => t,
  ease: cubicBezier(0.25, 0.1, 0.25, 1),
  'ease-in': cubicBezier(0.42, 0, 1, 1),
  'ease-out': cubicBezier(0, 0, 0.58, 1),
  'ease-in-out': cubicBezier(0.42, 0, 0.58, 1),
};

/** Převede CSS timing function na funkci; neznámé hodnoty = linear. */
function easing(fn) {
  const name = String(fn ?? 'linear').trim();
  if (name in EASINGS) return EASINGS[name];
  const m = /^cubic-bezier\(([^)]*)\)$/.exec(name);
  if (m) {
    const n = m[1].split(',').map(Number);
    if (n.length === 4 && n.every(Number.isFinite)) return cubicBezier(...n);
  }
  return EASINGS.linear;
}

/**
 * Rychlost z rootu scriptu (`slideSpeed`, `zoomSpeed`):
 * `(číslo)(s|ms)` = pevná doba, `(číslo)(pps|ppms)` = pixelů za sekundu / milisekundu.
 * @returns {{ms: number}|{rate: number}|null} rate je v px/ms
 */
function parseSpeed(v, name) {
  if (v === undefined || v === null) return null;
  const m = /^\s*(\d+(?:\.\d+)?|\.\d+)\s*(s|ms|pps|ppms)\s*$/.exec(String(v));
  if (!m || !(Number(m[1]) > 0)) throw new Error(`img-cast: neplatná hodnota ${name}: "${v}"`);
  const n = Number(m[1]);
  switch (m[2]) {
    case 's': return { ms: n * 1000 };
    case 'ms': return { ms: n };
    case 'pps': return { rate: n / 1000 };
    default: return { rate: n };
  }
}

/** Doba trvání podle parseSpeed výsledku a vzdálenosti v px. */
function durationFor(speed, distance) {
  if (!speed) return 0;
  return 'ms' in speed ? speed.ms : distance / speed.rate;
}

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

const MAX_DEPTH = 64; // zanoření sub-steps / call (ochrana proti nekonečné rekurzi maker)
const LEGACY_CMDS = { 'sub-steps': 'subSteps', 'zoom-to': 'zoomTo' };

function normalizeStep(step) {
  if (!step || typeof step !== 'object') return step;
  const out = {};
  for (const [k, v] of Object.entries(step)) {
    const key = camel(k);
    if (key === 'cmd') out.cmd = LEGACY_CMDS[v] ?? v;
    else if (key === 'steps') out.steps = Array.isArray(v) ? v.map(normalizeStep) : v;
    else out[key] = v; // `styles`, `args` a hodnoty se nemění
  }
  return out;
}

const mapValues = (obj, fn) =>
  obj && typeof obj === 'object'
    ? Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]))
    : obj;

/**
 * Převede script ve starším formátu `kebab-case` (`move-to`, `timing-function`, `sub-steps`, ...)
 * na primární `camelCase`. Mění jen klíče formátu – názvy animací, maker, argumentů, CSS tříd
 * a CSS vlastností zůstávají beze změny. Vrací nový objekt; camelCase script projde beze změny.
 */
export function normalizeScript(script) {
  const out = {};
  for (const [k, v] of Object.entries(script ?? {})) {
    const key = camel(k);
    if (key === 'steps') {
      out.steps = Array.isArray(v) ? v.map(normalizeStep) : v;
    } else if (key === 'animations') {
      out.animations = mapValues(v, (def) =>
        Object.fromEntries(Object.entries(def ?? {}).map(([n, x]) => [n.endsWith('%') ? n : camel(n), x])));
    } else if (key === 'macros') {
      out.macros = mapValues(v, (m) => ({
        ...m,
        steps: Array.isArray(m?.steps) ? m.steps.map(normalizeStep) : m?.steps,
      }));
    } else {
      out[key] = v;
    }
  }
  return out;
}

/** Pomocník pro psaní scriptu v TypeScriptu – vrací zadanou hodnotu, jen hlídá typ. */
export function defineScript(script) {
  return script;
}

/** Dosadí `$(argument)` do všech řetězcových hodnot (rekurzivně). Celý řetězec `$(x)` zachová typ hodnoty. */
function substitute(value, args, macro) {
  const lookup = (n) => {
    if (!Object.hasOwn(args, n)) throw new Error(`img-cast: makro "${macro}" nemá argument "${n}"`);
    return args[n];
  };
  if (typeof value === 'string') {
    const whole = /^\$\(([^)]+)\)$/.exec(value);
    if (whole) return lookup(whole[1]);
    return value.replace(/\$\(([^)]+)\)/g, (_, n) => String(lookup(n)));
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, args, macro));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, args, macro)]));
  }
  return value;
}

let instanceCounter = 0;

class AbortedError extends Error {
  constructor() {
    super('aborted');
    this.name = 'AbortedError';
  }
}

const ASYNC_CMDS = new Set(['slide', 'subSteps', 'zoomTo', 'call']);

export class ImgCast extends EventTarget {
  /**
   * @param {HTMLElement} container element, do kterého se scéna vykreslí
   * @param {object} script          objekt scriptu (`steps`, `animations`)
   * @param {{baseUrl?: string, speed?: number, loop?: boolean|number}} [options] baseUrl pro relativní
   *   `url` obrázků, speed = rychlost přehrávání (1 = normální, 2 = dvakrát rychleji, 0.5 = poloviční),
   *   loop = smyčka (true = donekonečna, číslo = celkový počet přehrání)
   */
  constructor(container, script, { baseUrl = document.baseURI, speed = 1, loop = false } = {}) {
    super();
    this.container = container;
    this.script = normalizeScript(script);
    this._uid = ++instanceCounter;
    this._loaded = new Map();
    this.baseUrl = new URL(baseUrl, document.baseURI).href;
    this.images = new Map();
    this._abort = null;
    this._awaits = new Map();
    this.speed = speed;
    this.loop = loop;
    container.style.position ||= 'relative';
    container.style.overflow = 'hidden';
    this._mkWorld();
  }

  /** Vrstva scény, kterou „kamera“ (zoomTo) posouvá a zvětšuje. */
  _mkWorld() {
    const world = document.createElement('div');
    world.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;transform-origin:0 0';
    this.world = world;
    this.container.appendChild(world);
    this._mkCssClasses(world);
    // kamera: střed jako odchylka od středu scény (nezávislé na velikosti kontejneru), zoom
    this._cam = { z: 1, ox: 0, oy: 0, follow: null, motion: null, raf: null };
  }

  /** Název třídy v DOM: s prefixem instance, aby se třídy scriptu nepletly s jinými. */
  _className(name) {
    return `imgcast-${this._uid}-${String(name).replace(/[^\w-]/g, '_')}`;
  }

  /** Vytvoří stylesheet z `cssClasses` (přes CSSOM, hodnoty se neparsují jako text). */
  _mkCssClasses(world) {
    const classes = this.script.cssClasses;
    if (!classes || typeof classes !== 'object') return;
    const style = document.createElement('style');
    world.appendChild(style);
    const sheet = style.sheet;
    if (!sheet) return; // kontejner ještě není v dokumentu; play() vrstvu vytvoří znovu
    for (const [name, props] of Object.entries(classes)) {
      const idx = sheet.insertRule(`.${this._className(name)} {}`, sheet.cssRules.length);
      const rule = sheet.cssRules[idx];
      for (const [prop, value] of Object.entries(props ?? {})) {
        const m = /^(.*?)\s*!important\s*$/.exec(String(value));
        rule.style.setProperty(kebab(prop), m ? m[1] : String(value), m ? 'important' : '');
      }
    }
  }

  /** Načte script z URL; relativní adresy obrázků se řeší vůči němu. */
  static async load(container, url, options = {}) {
    const abs = new URL(url, document.baseURI).href;
    const res = await fetch(abs);
    if (!res.ok) throw new Error(`Nelze načíst ${abs}: ${res.status}`);
    return new ImgCast(container, await res.json(), { baseUrl: abs, ...options });
  }

  /** Rychlost přehrávání; platí pro kroky spuštěné po změně. */
  get speed() {
    return this._speed;
  }

  set speed(v) {
    const n = Number(v);
    if (!(n > 0) || !Number.isFinite(n)) throw new RangeError('img-cast: speed musí být kladné číslo');
    this._speed = n;
  }

  /** Smyčka: `false` = jedno přehrání, `true` = donekonečna, číslo = celkový počet přehrání. */
  get loop() {
    return this._loop;
  }

  set loop(v) {
    if (v === true || v === false || v === undefined || v === null) {
      this._loop = Boolean(v);
    } else if (Number.isInteger(v) && v >= 1) {
      this._loop = v;
    } else {
      throw new RangeError('img-cast: loop musí být boolean nebo kladné celé číslo');
    }
  }

  /** Přepočítá trvání ze scriptu na skutečné trvání podle rychlosti. */
  _dur(ms) {
    return ms / this._speed;
  }

  get playing() {
    return this._abort !== null;
  }

  /**
   * Přednačte všechny obrázky scriptu (včetně vnořených `subSteps` a maker vyvolaných přes `call`).
   * Opakovaná volání a `play()` použijí už načtené obrázky. Obrázek, který se nepodaří načíst,
   * přednačtení nezastaví.
   */
  async preload() {
    const urls = new Set();
    this._collectUrls(this.script.steps, urls, 0);
    await Promise.all([...urls].map((u) => this._load(u)));
  }

  _collectUrls(steps, urls, depth) {
    if (depth > MAX_DEPTH) throw new Error('img-cast: příliš hluboké zanoření (rekurze makra?)');
    for (const s of steps ?? []) {
      if (typeof s.url === 'string') urls.add(this._url(s.url));
      if (s.cmd === 'subSteps') this._collectUrls(s.steps, urls, depth + 1);
      else if (s.cmd === 'call') this._collectUrls(this._expandCall(s), urls, depth + 1);
    }
  }

  _load(url) {
    let entry = this._loaded.get(url);
    if (!entry) {
      const img = new Image(); // reference drží načtený obrázek v paměti
      const done = new Promise((resolve) => {
        img.onload = img.onerror = () => resolve();
      });
      img.src = url;
      entry = { img, done };
      this._loaded.set(url, entry);
    }
    return entry.done;
  }

  /** Přehraje script od začátku (podle `loop` i opakovaně). Promise skončí s koncem přehrávání (nebo stop()). */
  async play() {
    this.stop();
    this._clearScene();
    const abort = new AbortController();
    this._abort = abort;
    try {
      await this.preload();
      this._check(abort.signal);
      this._slideSpeed = parseSpeed(this.script.slideSpeed, 'slideSpeed');
      this._zoomSpeed = parseSpeed(this.script.zoomSpeed, 'zoomSpeed');
      for (let iteration = 1; ; iteration++) {
        this._awaits = new Map();
        await this._runSteps(this.script.steps ?? [], abort.signal, []);
        this._camStop(); // dosledování kamery končí s přehráváním, záběr zůstane
        const loop = this._loop;
        if (!(loop === true || (typeof loop === 'number' && iteration < loop))) break;
        this.dispatchEvent(new CustomEvent('loop', { detail: { iteration } }));
        await this._sleep(0, abort.signal); // uvolní vlákno, i když je script bez čekání
        this._clearScene();
      }
      this.dispatchEvent(new Event('end'));
    } catch (e) {
      if (!(e instanceof AbortedError)) throw e;
    } finally {
      if (this._abort === abort) this._abort = null;
    }
  }

  /** Zastaví běžící přehrávání (scéna zůstane, jak je). */
  stop() {
    this._abort?.abort();
    this._abort = null;
    this._camStop();
    for (const { el, img } of this.images.values()) {
      el.getAnimations?.().forEach((a) => a.cancel());
      img.getAnimations?.().forEach((a) => a.cancel());
    }
  }

  /** Vyprázdní scénu. */
  reset() {
    this.stop();
    this._clearScene();
  }

  _clearScene() {
    this.images.clear();
    this.container.replaceChildren();
    this._mkWorld();
  }

  // ---- interní ----

  _url(u) {
    return new URL(u, this.baseUrl).href;
  }

  _check(signal) {
    if (signal.aborted) throw new AbortedError();
  }

  _sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new AbortedError());
      const t = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(t);
        reject(new AbortedError());
      };
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  /**
   * Provede seznam kroků postupně. Kroky s `async: true` se nečekají, ale seznam
   * jako celek skončí až po dokončení všech jeho async kroků.
   */
  async _runSteps(steps, signal, path) {
    if (path.length > MAX_DEPTH) throw new Error('img-cast: příliš hluboké zanoření (rekurze makra?)');
    const pending = [];
    for (let i = 0; i < steps.length; i++) {
      this._check(signal);
      const step = steps[i];
      const stepPath = [...path, i];
      this.dispatchEvent(new CustomEvent('step', {
        detail: { index: i, step, path: stepPath },
      }));
      const promise = this._run(step, signal, stepPath);
      if (step.async && ASYNC_CMDS.has(step.cmd)) {
        promise.catch(() => {}); // chyba se projeví při `await` / na konci seznamu
        pending.push(promise);
        if (step.awid !== undefined) this._awaits.set(step.awid, promise);
      } else {
        await promise;
      }
    }
    await Promise.all(pending);
  }

  async _await(step, signal) {
    const ids = [].concat(step.awid ?? []);
    const promises = ids.map((id) => {
      const p = this._awaits.get(id);
      if (!p) throw new Error(`img-cast: neznámé awid "${id}"`);
      return p;
    });
    await Promise.all(promises);
    this._check(signal);
  }

  async _run(step, signal, path) {
    switch (step.cmd) {
      case 'image':
        return this._image(step);
      case 'set':
        return this._set(step);
      case 'slide':
        return this._slide(step, signal);
      case 'pause':
        return this._sleep(this._dur(step.duration ?? 0), signal);
      case 'animate':
        return this._animate(step, signal);
      case 'zoomTo':
        return this._zoomTo(step, signal);
      case 'call':
        return this._runSteps(this._expandCall(step), signal, path);
      case 'subSteps':
        return this._runSteps(step.steps ?? [], signal, path);
      case 'await':
        return this._await(step, signal);
      default:
        console.warn('img-cast: neznámý příkaz', step.cmd);
    }
  }

  /** Najde makro podle klíče v `macros`, případně podle jeho `name`. */
  _macro(name) {
    const macros = this.script.macros ?? {};
    const m = Object.hasOwn(macros, name) ? macros[name] : Object.values(macros).find((x) => x?.name === name);
    if (!m) throw new Error(`img-cast: neznámé makro "${name}"`);
    return m;
  }

  /** Vrátí kroky makra z kroku `call` s dosazenými argumenty (a jejich výchozími hodnotami). */
  _expandCall(step) {
    const m = this._macro(step.name);
    const defs = (m.args ?? []).map((a) => (typeof a === 'string' ? { name: a } : a));
    const given = step.args ?? {};
    for (const k of Object.keys(given)) {
      if (!defs.some((d) => d.name === k)) throw new Error(`img-cast: makro "${step.name}" nemá argument "${k}"`);
    }
    const values = {};
    for (const d of defs) {
      if (Object.hasOwn(given, d.name)) values[d.name] = given[d.name];
      else if ('default' in d) values[d.name] = d.default;
      else throw new Error(`img-cast: makru "${step.name}" chybí argument "${d.name}"`);
    }
    return substitute(m.steps ?? [], values, step.name);
  }

  _get(id) {
    const rec = this.images.get(id);
    if (!rec) throw new Error(`img-cast: neznámé id obrázku "${id}"`);
    return rec;
  }

  /** Aktuální poloha kotevního bodu image v px (za běhu přechodu živá hodnota). */
  _pos({ el }) {
    const cs = getComputedStyle(el);
    const x = parseFloat(cs.left);
    const y = parseFloat(cs.top);
    return { x: Number.isNaN(x) ? el.offsetLeft : x, y: Number.isNaN(y) ? el.offsetTop : y };
  }

  /** Velikost scény v px. */
  _size() {
    return { w: this.container.clientWidth, h: this.container.clientHeight };
  }

  /** Převede délku (číslo, `px`, `%` scény, jiná CSS délka) na px. axis: 'x' | 'y'. */
  _px(v, axis) {
    if (typeof v === 'number') return v;
    const str = String(v).trim();
    let m = /^(-?(?:\d+\.?\d*|\.\d+))(px)?$/.exec(str);
    if (m) return parseFloat(m[1]);
    m = /^(-?(?:\d+\.?\d*|\.\d+))%$/.exec(str);
    if (m) {
      const { w, h } = this._size();
      return (parseFloat(m[1]) / 100) * (axis === 'x' ? w : h);
    }
    const probe = document.createElement('div'); // ostatní jednotky (em, vw, ...) změří prohlížeč
    probe.style.position = 'absolute';
    probe.style[axis === 'x' ? 'left' : 'top'] = str;
    this.world.appendChild(probe);
    const px = parseFloat(getComputedStyle(probe)[axis === 'x' ? 'left' : 'top']);
    probe.remove();
    if (Number.isNaN(px)) throw new Error(`img-cast: neplatná délka "${v}"`);
    return px;
  }

  /** Vrátí krok s x/y doplněnými z `move-to` (explicitní x/y mají přednost). */
  _withMoveTo(step) {
    if (step.moveTo === undefined) return step;
    const { x, y } = this._pos(this._get(step.moveTo));
    return { x, y, ...step };
  }

  /**
   * Přesune image na x/y (px řetězce/čísla; nezadané osy se nemění) a stejně o stejný
   * vektor posune všechny image, které ho sledují (`follow`, i řetězově).
   * Se stejným trváním a timingFunction se pohybují synchronně.
   */
  _moveImage(id, { x, y }, duration, timing) {
    const rec = this._get(id);
    const cur = this._pos(rec);
    const dx = (x === undefined ? cur.x : this._px(x, 'x')) - cur.x;
    const dy = (y === undefined ? cur.y : this._px(y, 'y')) - cur.y;

    const moves = [{ rec, x: x === undefined ? undefined : toCssLength(x), y: y === undefined ? undefined : toCssLength(y) }];
    const seen = new Set([id]);
    for (let i = 0; i < moves.length; i++) {
      const leaderId = [...this.images].find(([, r]) => r === moves[i].rec)[0];
      for (const [fid, f] of this.images) {
        if (f.follow !== leaderId || seen.has(fid)) continue;
        seen.add(fid);
        const p = this._pos(f);
        moves.push({ rec: f, x: p.x + dx + 'px', y: p.y + dy + 'px' });
      }
    }
    const transition = duration > 0
      ? `left ${duration}ms ${timing}, top ${duration}ms ${timing}`
      : 'none';
    for (const m of moves) m.rec.el.style.transition = transition;
    this.container.getBoundingClientRect(); // vynutí reflow, aby se přechod spustil
    for (const m of moves) {
      if (m.x !== undefined) m.rec.el.style.left = m.x;
      if (m.y !== undefined) m.rec.el.style.top = m.y;
    }
    return { dx, dy, distance: Math.hypot(dx, dy) };
  }

  _image(step) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    const img = document.createElement('img');
    img.style.display = 'block';
    img.draggable = false;
    el.appendChild(img);
    const rec = { el, img, xa: 0, ya: 0 };
    this.images.set(step.id, rec);
    this.world.appendChild(el);
    this._apply(rec, { x: 0, y: 0, ...this._withMoveTo(step) });
  }

  _set(step) {
    const rec = this._get(step.id);
    const p = this._withMoveTo(step);
    if (p.x !== undefined || p.y !== undefined) this._moveImage(step.id, p, 0, 'linear');
    else rec.el.style.transition = 'none';
    this._apply(rec, p);
  }

  /** Aplikuje parametry (url, x, y, xa, ya, visible, styles, follow, cssClass) na obrázek. */
  _apply(rec, p) {
    const { el, img } = rec;
    if (p.url !== undefined) img.src = this._url(p.url);
    if (p.xa !== undefined) rec.xa = toAlignPercent(p.xa, ALIGN_X, 0);
    if (p.ya !== undefined) rec.ya = toAlignPercent(p.ya, ALIGN_Y, 0);
    if (p.x !== undefined) el.style.left = toCssLength(p.x);
    if (p.y !== undefined) el.style.top = toCssLength(p.y);
    if (p.xa !== undefined || p.ya !== undefined) {
      el.style.transform = `translate(${-rec.xa}%, ${-rec.ya}%)`;
    }
    if (p.cssClass !== undefined) {
      img.className = [].concat(p.cssClass ?? []).map((n) => this._className(n)).join(' ');
    }
    if (p.styles) {
      // styly patří vnitřnímu <img>, aby nekolidovaly s pozicováním wrapperu
      for (const [k, v] of Object.entries(p.styles)) {
        img.style.setProperty(kebab(k), String(v));
      }
    }
    if (p.follow !== undefined) rec.follow = p.follow || null;
    if (p.visible !== undefined) el.style.visibility = p.visible ? 'visible' : 'hidden';
  }

  async _slide(step, signal) {
    const rec = this._get(step.id);
    step = this._withMoveTo(step);
    const timing = step.timingFunction ?? 'linear';
    let duration = step.duration;
    if (duration === undefined) {
      // bez `duration` rozhoduje `slideSpeed` (může záviset na vzdálenosti)
      const cur = this._pos(rec);
      const dx = step.x === undefined ? 0 : this._px(step.x, 'x') - cur.x;
      const dy = step.y === undefined ? 0 : this._px(step.y, 'y') - cur.y;
      duration = durationFor(this._slideSpeed, Math.hypot(dx, dy));
    }
    duration = this._dur(duration);
    this._moveImage(step.id, step, duration, timing);
    await this._sleep(duration, signal);
  }

  // ---- kamera (zoomTo) ----

  _camStop() {
    const cam = this._cam;
    if (cam.raf !== null) cancelAnimationFrame(cam.raf);
    cam.raf = null;
    cam.follow = null;
    const m = cam.motion;
    cam.motion = null;
    m?.done(); // uvolní případný krok čekající na dokončení pohybu kamery
  }

  /** Použije stav kamery na vrstvu scény. */
  _applyCam() {
    const { z, ox, oy } = this._cam;
    if (z === 1 && ox === 0 && oy === 0) {
      this.world.style.transform = '';
      return;
    }
    const { w, h } = this._size();
    const tx = w / (2 * z) - (w / 2 + ox);
    const ty = h / (2 * z) - (h / 2 + oy);
    this.world.style.transform = `scale(${z}) translate(${tx}px, ${ty}px)`;
  }

  /**
   * Střed, na který se má kamera posunout, aby bod p ležel v mrtvé zóně (nzax/nzay)
   * kolem středu záběru. Kamera se hýbe jen tehdy, když p z mrtvé zóny vyjde.
   */
  _camTarget(p, from, zoom, nz) {
    const { w, h } = this._size();
    const hx = nz.x / (2 * zoom);
    const hy = nz.y / (2 * zoom);
    const cx = w / 2 + from.ox;
    const cy = h / 2 + from.oy;
    const shift = (v, c, half) => (v > c + half ? v - (c + half) : v < c - half ? v - (c - half) : 0);
    return { ox: from.ox + shift(p.x, cx, hx), oy: from.oy + shift(p.y, cy, hy) };
  }

  async _zoomTo(step, signal) {
    const cam = this._cam;
    const { w, h } = this._size();
    const from = { ox: cam.ox, oy: cam.oy, z: cam.z };
    const zoom = step.zoom === undefined ? cam.z : Number(step.zoom);
    if (!(zoom > 0) || !Number.isFinite(zoom)) throw new Error(`img-cast: neplatný zoom "${step.zoom}"`);
    const nz = {
      x: step.nzax === undefined ? 0 : Math.max(0, this._px(step.nzax, 'x')),
      y: step.nzay === undefined ? 0 : Math.max(0, this._px(step.nzay, 'y')),
    };

    // co kamera sleduje: `follow` (živě) > `zoomTo` (jednorázově) > x/y; jinak zůstává střed
    let followId = cam.follow?.id ?? null;
    let fixed = null;
    const retarget = step.follow !== undefined || step.zoomTo !== undefined ||
      step.x !== undefined || step.y !== undefined;
    if (retarget) {
      followId = null;
      if (step.follow) {
        this._get(step.follow);
        followId = step.follow;
      } else if (step.zoomTo !== undefined) {
        fixed = this._pos(this._get(step.zoomTo));
      } else {
        fixed = {
          x: step.x === undefined ? w / 2 + from.ox : this._px(step.x, 'x'),
          y: step.y === undefined ? h / 2 + from.oy : this._px(step.y, 'y'),
        };
      }
    }
    const point = followId
      ? () => this._pos(this._get(followId))
      : fixed ? () => fixed : null;
    const target = () => (point ? this._camTarget(point(), from, zoom, nz) : { ox: from.ox, oy: from.oy });

    let duration = step.duration;
    if (duration === undefined) {
      const t = target();
      let dist = Math.hypot(t.ox - from.ox, t.oy - from.oy);
      if (dist === 0) dist = Math.hypot(w / from.z - w / zoom, h / from.z - h / zoom); // jen zoom
      duration = durationFor(this._zoomSpeed, dist);
    }
    duration = this._dur(duration);
    const ease = easing(step.timingFunction);

    this._camStop();
    cam.follow = followId ? { id: followId, nz } : null;
    const motion = { done: null };
    const finished = new Promise((resolve) => (motion.done = resolve));
    cam.motion = motion;
    const t0 = performance.now();

    const tick = () => {
      cam.raf = null;
      if (cam.motion === motion) {
        const t = duration > 0 ? Math.min(1, (performance.now() - t0) / duration) : 1;
        const to = target();
        if (t < 1) {
          const e = ease(t);
          cam.z = from.z + (zoom - from.z) * e;
          cam.ox = from.ox + (to.ox - from.ox) * e;
          cam.oy = from.oy + (to.oy - from.oy) * e;
        } else {
          cam.z = zoom;
          cam.ox = to.ox;
          cam.oy = to.oy;
          cam.motion = null;
          motion.done();
        }
      } else if (cam.follow) {
        // po dojetí kamera sleduje dál a hýbe se jen při opuštění mrtvé zóny
        const to = this._camTarget(this._pos(this._get(cam.follow.id)), cam, cam.z, cam.follow.nz);
        cam.ox = to.ox;
        cam.oy = to.oy;
      }
      this._applyCam();
      if (cam.motion === motion || cam.follow) cam.raf = requestAnimationFrame(tick);
    };
    tick();

    const onAbort = () => this._camStop();
    signal.addEventListener('abort', onAbort, { once: true });
    try {
      await finished;
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
    this._check(signal);
  }

  async _animate(step, signal) {
    const def = this.script.animations?.[step.animation];
    if (!def) throw new Error(`img-cast: neznámá animace "${step.animation}"`);
    const { img } = this._get(step.id);

    const keyframes = [];
    for (const [key, props] of Object.entries(def)) {
      if (!key.endsWith('%') || typeof props !== 'object') continue;
      const frame = { offset: parseFloat(key) / 100 };
      for (const [k, v] of Object.entries(props)) frame[camel(k)] = v;
      keyframes.push(frame);
    }
    keyframes.sort((a, b) => a.offset - b.offset);

    const anim = img.animate(keyframes, {
      duration: this._dur(step.duration ?? def.duration ?? 1000),
      easing: step.timingFunction ?? def.timingFunction ?? 'linear',
    });
    if (!step.wait) return;
    await new Promise((resolve, reject) => {
      const onAbort = () => reject(new AbortedError());
      signal.addEventListener('abort', onAbort, { once: true });
      anim.finished.then(resolve, resolve).finally(() =>
        signal.removeEventListener('abort', onAbort));
    });
  }
}
