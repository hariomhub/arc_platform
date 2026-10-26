/**
 * engine.js - the animation brain shared by every bot on a page.
 *
 * Why it is built this way (the portal must stay smooth):
 *   - ONE requestAnimationFrame loop for all bots. It only runs while at least one bot is on screen and the tab is
 *     visible, and it stops by itself otherwise. A page with no visible bot costs nothing.
 *   - A bot is a bag of numbers ("params": head turn, wing angle, beak opening ...) each chasing a target on a spring.
 *     Poses and scripts only change targets. Nothing here touches React state per frame.
 *   - The 3D model (three/model.js) turns the numbers into joint rotations and positions, and the stage draws a frame
 *     only when something moved, so a resting bot costs next to nothing.
 *   - "Lite" bots (the small ones on the Framework page) tick at about 30 fps.
 *   - Scripts are plain async functions (`await d.walkTo(80); await d.pose('hello', 0.6)`). Their waits run on the bot's
 *     own clock, which pauses whenever the bot is off screen, and a new script cancels the old one.
 *   - prefers-reduced-motion: nothing is registered, so nothing moves.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (a, b) => a + Math.random() * (b - a);
export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const ABORT = Symbol('bot-abort');

// ── The numbers a bot is made of ────────────────────────────────────────────────────────────────────────────────
export const NEUTRAL = {
    squash: 0, lean: 0, face: 0,
    headX: 0, headY: 0, headRoll: 0, eyeX: 0, eyeY: 0,
    blink: 0, squint: 0, wide: 0, happy: 0.25, beak: 0, blush: 0.3,
    wingL: 4, wingR: 4, crest: 0, held: 0, heldY: 0, heldRot: 0, led: 1, turn: 0, tap: 0,
};
const TAU = Math.PI * 2;
const EXPRESSIVE = Object.keys(NEUTRAL).filter((k) => k !== 'held' && k !== 'heldY' && k !== 'heldRot' && k !== 'turn');

// stiffness / damping per number (default 170 / 17: lively but not wobbly)
const TUNING = {
    blink: [1400, 80], beak: [800, 44], wide: [500, 34], squint: [500, 34], happy: [260, 26],
    eyeX: [330, 28], eyeY: [330, 28], headX: [190, 20], headY: [190, 20], headRoll: [150, 15],
    wingL: [240, 16], wingR: [240, 16], squash: [420, 20], lean: [150, 15], face: [140, 17],
    crest: [90, 6], heldY: [200, 18], heldRot: [200, 18], held: [260, 24], led: [90, 14], blush: [90, 14], turn: [120, 16], tap: [420, 30],
};

// What the bot does with its body in each named pose (anything left out goes back to neutral).
export const POSES = {
    neutral: {},
    hello: { wingR: 128, happy: 0.9, beak: 0.3, headRoll: 5, blush: 0.6, headX: 0.2 },
    proud: { squash: -0.05, happy: 0.7, wingL: 22, wingR: 22, blush: 0.55, headY: -0.3 },
    point: { wingR: 74, headRoll: -4, wide: 0.2, happy: 0.5, eyeY: 0.1 },
    think: { wingR: 120, eyeY: -1, headRoll: 7, squint: 0.18, headY: -0.4, happy: 0 },
    hold: { wingL: 52, wingR: 52, happy: 0.35, headY: 0.15 },
    cheer: { wingL: 150, wingR: 150, happy: 1, beak: 0.45, blush: 0.85, squash: -0.04 },
    surprised: { wide: 1, beak: 0.55, wingL: 40, wingR: 40, happy: 0 },
    sleepy: { squint: 0.85, headY: 0.7, happy: 0.1, blush: 0.15 },
    stamp: { wingR: 96, squash: 0.1, headY: 0.7, happy: 0.1, squint: 0.15 },
    inspect: { wingR: 66, headRoll: -6, squint: 0.3, eyeY: 0.35, headY: 0.4, happy: 0 },
    bow: { squash: 0.14, headY: 1, happy: 0.9, wingL: 30, wingR: 30, blush: 0.7 },
};

// ── One shared clock ─────────────────────────────────────────────────────────────────────────────────────────────
const bots = new Set();
let raf = 0;
let last = 0;

// Run once per frame after every visible bot has moved (the 3D stage draws from here, so a frame is drawn once).
export const frameHooks = new Set();

const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000 || 1 / 60);
    last = now;
    let live = false;
    bots.forEach((d) => { if (d.visible) { d.tick(dt); live = true; } });
    if (live) frameHooks.forEach((h) => h());
    if (live && !document.hidden) raf = requestAnimationFrame(frame);
};

export const wake = () => {
    if (raf || document.hidden || reducedMotion() || !bots.size) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
};
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', wake);

export const enlist = (d) => { bots.add(d); wake(); };
export const delist = (d) => { bots.delete(d); };

// One pointer listener for every bot: each looks toward the cursor while it is moving nearby.
let pointerQueued = false;
let pointer = null;
const onPointer = (e) => {
    if (e.pointerType === 'touch') return;
    pointer = { x: e.clientX, y: e.clientY };
    if (pointerQueued) return;
    pointerQueued = true;
    requestAnimationFrame(() => {
        pointerQueued = false;
        if (!pointer) return;
        bots.forEach((d) => { if (d.visible && d.gazeEnabled) d.lookFromPointer(pointer.x, pointer.y); });
    });
};
if (typeof window !== 'undefined') window.addEventListener('pointermove', onPointer, { passive: true });

// ── The bot ─────────────────────────────────────────────────────────────────────────────────────────────────────
export class Bot {
    constructor({ lite = false, gaze = true, roam = false, roamZones = [[-250, 250]], x0 = 0, faceBias = null, sceneW = 0, gazeY = 0.4 } = {}) {
        this.lite = lite;
        this.roamZones = roamZones;           // the stretches of floor it may wander about in on its own: [[from, to], ...]
        this.faceBias = faceBias;             // x => how far it is turned at rest, so it can face the board from either side
        this.sceneW = sceneW;                 // when set, `el` is a whole set this wide and the bot's x moves it across it
        this.gazeY = gazeY;                   // how far down `el` its eyes are (0..1)
        this.roam = roam;                     // may wander along the stage on its own (the big stage bot, not the launcher row)
        this.gazeEnabled = gaze;
        this.scale = 1;                       // scene pixels per rig unit (set by the rig)
        this.p = { ...NEUTRAL };              // current values
        this.v = Object.fromEntries(Object.keys(NEUTRAL).map((k) => [k, 0]));
        this.t = { ...NEUTRAL };              // targets
        this.o = { ...NEUTRAL, x: 0, hop: 0, legL: 0, legR: 0, liftL: 0, liftR: 0, roll: 0, walk: 0, armSwing: 0 };
        this.clock = 0;
        this.acc = 0;
        this.waiters = [];
        this.visible = false;
        this.render = null;
        this.el = null;                       // the svg the bot lives in (for gaze)
        this.x = x0;                          // horizontal position in scene px
        this.move = null;
        this.vx = 0;                          // sideways speed, set units per second
        this.walkV = 0;                       // its size
        this.phase = 0;                       // where the legs are in their stride
        this.hopY = 0;
        this.hopV = 0;
        this.talk = 0;
        this.speaking = false;                // a voice is reading the current line (the mouth keeps moving until it stops)
        this.talkAmp = 0;                     // 0..1, how much of a talking gesture is showing (eases in and out)
        this.gaze = { x: 0, y: 0, until: 0 };
        this.run = null;
        this.idleIn = rand(1.2, 3);
        this.lastFidget = -1;
        this.blinkIn = rand(1, 3.5);
        this.events = {};                     // onSay, onEvent set by whoever lays the bot out
    }

    // ---- state helpers --------------------------------------------------------------------------------------------
    setTargets(partial) { Object.assign(this.t, partial); }

    /** Put the bot straight into a state (first paint, reduced motion). */
    snap(partial = {}) {
        Object.assign(this.t, partial);
        Object.keys(NEUTRAL).forEach((k) => { this.p[k] = this.t[k]; this.v[k] = 0; });
        this.compose(0);
        this.render?.(this.o);
    }

    // ---- per-frame work -------------------------------------------------------------------------------------------
    tick(dtRaw) {
        let dt = dtRaw;
        if (this.lite) {                       // small bots: about 30 updates a second
            this.acc += dtRaw;
            if (this.acc < 1 / 30) return;
            dt = this.acc;
            this.acc = 0;
        }
        this.clock += dt;
        this.resolveWaiters();
        this.think(dt);
        this.integrate(dt);
        this.compose(dt);
        this.render?.(this.o);
    }

    resolveWaiters() {
        if (!this.waiters.length) return;
        const due = this.waiters.filter((w) => w.at <= this.clock);
        if (!due.length) return;
        this.waiters = this.waiters.filter((w) => w.at > this.clock);
        due.forEach((w) => w.res());
    }

    think(dt) {
        const t = this.t;
        // blinking
        this.blinkIn -= dt;
        if (this.blinkIn <= 0) {
            t.blink = 1;
            this.after(0.11, () => { this.t.blink = 0; });
            this.blinkIn = rand(2.2, 6);
        }
        // looking at the cursor, only while it has been moving nearby and no script is acting
        if (!this.run) {
            const watching = this.clock < this.gaze.until;
            t.eyeX = watching ? this.gaze.x : 0;
            t.eyeY = watching ? this.gaze.y : 0;
            t.headX = watching ? this.gaze.x * 0.6 : 0;
            t.headY = watching ? this.gaze.y * 0.5 : 0;
            t.headRoll = watching ? this.gaze.x * 3 : 0;
            // little fidgets so it never stands like a statue
            if (!watching) {
                this.idleIn -= dt;
                if (this.idleIn <= 0) {
                    this.idleIn = rand(2.2, 5);
                    const pool = this.roam ? FIDGETS : FIDGETS.filter((f) => !f.roamOnly);
                    let pick;
                    do { pick = Math.floor(Math.random() * pool.length); } while (pool.length > 1 && pool[pick] === this.lastFidget);
                    this.lastFidget = pool[pick];
                    this.exec(pool[pick].run, { idle: true });
                }
            }
        }
        // talking: the beak flaps while there is something to say
        if (this.speaking && this.talk < 0.25) this.talk = 0.25;
        if (this.talk > 0) {
            this.talk -= dt;
            t.beak = 0.18 + 0.5 * Math.abs(Math.sin(this.clock * 13 + Math.sin(this.clock * 5)));
            if (this.talk <= 0) t.beak = 0;
        }
        // moving across the stage: speed builds up, holds, and eases off in time to stop exactly on the spot
        if (this.move) {
            const m = this.move;
            const dist = m.to - this.x;
            const dir = Math.sign(dist) || 1;
            const want = dir * Math.min(m.speed, Math.sqrt(2 * m.acc * Math.abs(dist)));
            this.vx += clamp(want - this.vx, -m.acc * dt, m.acc * dt);
            this.x += this.vx * dt;
            if (dir * (m.to - this.x) <= 0.4 || (Math.abs(m.to - this.x) < 1.5 && Math.abs(this.vx) < 8)) {
                this.x = m.to;
                this.vx = 0;
                const done = m.done;
                this.move = null;
                this.t.face = 0;
                done();
            }
        } else if (this.vx !== 0) {                       // cut short mid-stride: coast to a stop
            this.vx *= Math.exp(-dt * 9);
            this.x += this.vx * dt;
            if (Math.abs(this.vx) < 2) this.vx = 0;
        }
        this.walkV = Math.abs(this.vx);
        // hopping (a small ballistic arc)
        if (this.hopY > 0 || this.hopV !== 0) {
            this.hopV -= 2300 * dt;
            this.hopY += this.hopV * dt;
            if (this.hopY <= 0) {
                const impact = -this.hopV;
                this.hopY = 0;
                this.hopV = 0;
                this.p.squash += clamp(impact / 2600, 0, 0.16);
                if (impact > 330) this.events.onEvent?.('land', impact);
            }
        }
    }

    integrate(dt) {
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        const h = dt / steps;
        const { p, v, t } = this;
        for (let s = 0; s < steps; s += 1) {
            for (const k in NEUTRAL) {
                const [stiff, damp] = TUNING[k] || [170, 17];
                v[k] += (stiff * (t[k] - p[k]) - damp * v[k]) * h;
                p[k] += v[k] * h;
            }
        }
    }

    /** Springs plus the motion that is calculated, not sprung (walking, breathing). */
    compose(dt) {
        const o = this.o;
        const p = this.p;
        Object.keys(NEUTRAL).forEach((k) => { o[k] = p[k]; });
        // The gait. One step for every STRIDE of ground covered, and the legs swing just far enough that a planted foot
        // does not slide; the swinging leg bends at the knee in the middle of its swing to clear the floor; the arms swing
        // fore and aft against the legs; it stands taller than its resting crouch and leans a little into the way it goes.
        const v = this.walkV;
        const wk = clamp(v / 55, 0, 1);                              // 0 standing .. 1 walking
        const jog = clamp((v - 110) / 110, 0, 1);                    // 0 walking .. 1 jogging
        const stride = 46 + 16 * jog;
        if (v > 6) this.phase += (dt * Math.PI * v) / stride;
        else this.phase += (Math.round(this.phase / Math.PI) * Math.PI - this.phase) * Math.min(1, dt * 10);
        const s = Math.sin(this.phase);
        const c = Math.cos(this.phase);
        const swing = ((clamp(stride / 174, 0, 0.4) * 1.1) * 180) / Math.PI;      // hip swing in degrees
        o.legL = s * swing * wk;
        o.legR = -s * swing * wk + p.tap * 14;
        o.liftL = (13 + 5 * jog) * Math.max(0, c) ** 1.2 * wk;
        o.liftR = (13 + 5 * jog) * Math.max(0, -c) ** 1.2 * wk + p.tap * 7;
        o.roll = s * 1.6 * wk;                                       // a hint of sway
        const breathe = Math.sin(this.clock * 2.1);
        o.squash = p.squash + breathe * 0.012;
        o.hop = this.hopY + Math.abs(c) * (1.2 + 1.5 * jog) * wk;
        o.x = this.x;
        o.walk = wk;
        o.armSwing = s * (0.3 + 0.35 * jog) * wk;
        if (this.faceBias) o.face += this.faceBias(this.x);
        o.lean += clamp(this.vx / 60, -4, 4);
        o.led = p.led * (0.72 + 0.28 * Math.sin(this.clock * 3));
        o.crest = p.crest + Math.sin(this.clock * 1.7) * 0.25 + o.roll * 0.12 + this.v.headRoll * 0.01;

        // while it talks it gestures: the free hand beats time, the head nods and sways, the core light flickers
        this.talkAmp += (((this.talk > 0 || this.speaking) ? 1 : 0) - this.talkAmp) * Math.min(1, dt * 6);
        const g = this.talkAmp;
        if (g > 0.01) {
            const t = this.clock;
            const free = 1 - clamp(p.held, 0, 1);                 // hands full: only the head moves
            const beat = (w, phase, speed) => (w < 60 ? 10 * Math.max(0, Math.sin(t * speed + phase)) + 3 : 2.5 * Math.sin(t * speed + phase));
            o.wingL += g * free * beat(o.wingL, 1, 2.7);
            o.wingR += g * free * beat(o.wingR, 0, 2.2);
            o.headY += g * 0.13 * Math.sin(t * 2.4);
            o.headRoll += g * 1.5 * Math.sin(t * 1.6 + 0.5);
            o.squash += g * 0.01 * Math.sin(t * 4.6);
            o.led *= 1 + g * 0.35 * (0.5 + 0.5 * Math.sin(t * 13));
        }
    }

    // ---- looking --------------------------------------------------------------------------------------------------
    lookFromPointer(px, py) {
        if (!this.el) return;
        const r = this.el.getBoundingClientRect();
        if (!r.width) return;
        const cx = r.left + r.width / 2 + (this.sceneW ? this.x * (r.width / this.sceneW) : 0);
        const cy = r.top + r.height * this.gazeY;
        const dx = px - cx;
        const dy = py - cy;
        if (Math.hypot(dx, dy) > 520) return;               // only when the cursor is in the neighbourhood
        this.gaze.x = clamp(dx / 260, -1, 1);
        this.gaze.y = clamp(dy / 220, -1, 1);
        this.gaze.until = this.clock + 2.4;
    }

    // ---- scripts --------------------------------------------------------------------------------------------------
    after(sec, fn) { this.waiters.push({ at: this.clock + sec, res: fn, rej: () => {}, run: null }); }

    stopRun() {
        const run = this.run;
        if (!run) return;
        run.aborted = true;
        this.waiters = this.waiters.filter((w) => { if (w.run === run) { w.rej(ABORT); return false; } return true; });
        this.move = null;
        this.run = null;
    }

    /** Run an async script; it replaces whatever the bot was doing. Returns when the script ends (or is cancelled). */
    exec(fn, { idle = false } = {}) {
        this.stopRun();
        this.setTargets({ held: 0, heldY: 0, heldRot: 0, turn: 0 });      // a new script starts with empty wings
        this.p.turn = ((((this.p.turn + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
        const run = { aborted: false, idle };
        this.run = run;
        const api = this.api(run);
        return (async () => {
            try { await fn(api); } catch (e) { if (e !== ABORT) console.error('[bot]', e); }
            if (this.run === run) {
                this.run = null;
                this.setTargets({ ...NEUTRAL, face: 0 });
                this.p.turn = ((((this.p.turn + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
                this.idleIn = rand(2, 4);
            }
        })();
    }

    api(run) {
        const d = this;
        const guard = () => { if (run.aborted) throw ABORT; };
        const wait = (sec) => new Promise((res, rej) => { guard(); d.waiters.push({ at: d.clock + sec, res, rej, run }); });
        const pose = async (name, hold = 0) => {
            guard();
            const base = {};
            EXPRESSIVE.forEach((k) => { base[k] = NEUTRAL[k]; });
            d.setTargets({ ...base, ...(POSES[name] || {}) });
            if (hold > 0) await wait(hold);
        };
        const api = {
            wait, pose,
            get x() { return d.x; },
            get roam() { return d.roam; },
            get roamZones() { return d.roamZones; },
            set: (partial) => { guard(); d.setTargets(partial); },
            // onSay may return a promise for a voice reading the line; the script then waits for the voice too
            say: (text, sec = Math.max(1.4, text.length * 0.055)) => {
                guard();
                d.talk = sec;
                const spoken = d.events.onSay?.(text, sec);
                const shown = wait(sec);
                if (!spoken || typeof spoken.then !== 'function') return shown;
                d.speaking = true;
                return Promise.all([shown, spoken.finally(() => { d.speaking = false; })]).then(() => {});
            },
            quiet: () => { d.talk = 0; d.speaking = false; d.t.beak = 0; d.events.onSay?.('', 0); },
            emit: (name, payload) => d.events.onEvent?.(name, payload),
            look: (x, y = 0) => { guard(); d.setTargets({ eyeX: clamp(x, -1, 1), eyeY: clamp(y, -1, 1), headX: clamp(x, -1, 1) * 0.7, headY: clamp(y, -1, 1) * 0.5 }); },
            hold: (on, extra = {}) => { guard(); d.setTargets({ held: on ? 1 : 0, ...extra }); },
            hop: async (strength = 1, wait_ = 0.45) => {
                guard();
                d.hopV = 430 * strength;
                d.hopY = 0.01;
                d.p.squash -= 0.1;
                await wait(wait_);
            },
            walkTo: (x, speed = 95) => new Promise((res, rej) => {
                guard();
                if (Math.abs(x - d.x) < 1) { res(); return; }
                d.t.face = Math.sign(x - d.x) * 0.62;
                const holder = { at: Infinity, res: () => {}, rej, run };   // lets stopRun reject this promise
                const done = () => { d.waiters = d.waiters.filter((w) => w !== holder); res(); };
                d.move = { to: x, speed, acc: speed / 0.5, done };          // up to speed in half a second
                d.waiters.push(holder);
            }),
            hello: async () => { await pose('hello', 0.35); d.t.wingR = 95; await wait(0.22); d.t.wingR = 130; await wait(0.22); d.t.wingR = 95; await wait(0.22); d.t.wingR = 130; await wait(0.3); },
            flap: async () => { d.t.wingL = 70; d.t.wingR = 70; d.t.squash = -0.05; await wait(0.16); d.t.wingL = 8; d.t.wingR = 8; d.t.squash = 0.03; await wait(0.16); d.t.wingL = 70; d.t.wingR = 70; await wait(0.16); d.t.wingL = 4; d.t.wingR = 4; d.t.squash = 0; await wait(0.2); },
            nod: async () => { d.t.headY = 0.9; await wait(0.16); d.t.headY = -0.1; await wait(0.16); d.t.headY = 0.7; await wait(0.16); d.t.headY = 0; await wait(0.12); },
            shake: async () => { d.t.headRoll = -9; await wait(0.14); d.t.headRoll = 9; await wait(0.14); d.t.headRoll = -6; await wait(0.14); d.t.headRoll = 0; await wait(0.1); },
            wiggle: async () => {
                for (let i = 0; i < 4; i += 1) {
                    const a = i % 2 ? -1 : 1;
                    d.t.lean = 5 * a; d.t.headRoll = 8 * a; d.t.squash = 0.05; d.t.wingL = a < 0 ? 36 : 6; d.t.wingR = a < 0 ? 6 : 36; d.t.happy = 0.8;
                    await wait(0.28);
                    d.t.squash = -0.02;
                    await wait(0.12);
                }
                d.t.lean = 0; d.t.headRoll = 0; d.t.squash = 0; d.t.wingL = 4; d.t.wingR = 4; d.t.happy = 0.3;
                await wait(0.25);
            },
            tapFoot: async () => {
                d.t.headY = 0.2; d.t.happy = 0.5;
                for (let i = 0; i < 4; i += 1) { d.t.tap = 1; await wait(0.13); d.t.tap = 0; await wait(0.17); }
                d.t.headY = 0;
                await wait(0.2);
            },
            jumpJack: async () => {
                for (let i = 0; i < 2; i += 1) {
                    d.t.wingL = 150; d.t.wingR = 150; d.t.happy = 1;
                    await api.hop(0.75, 0.34);
                    d.t.wingL = 4; d.t.wingR = 4;
                    await wait(0.2);
                }
                d.t.happy = 0.3;
            },
            shrug: async () => {
                d.t.wingL = 34; d.t.wingR = 34; d.t.headRoll = 8; d.t.squash = 0.05; d.t.happy = 0; d.t.squint = 0.2;
                await wait(0.7);
                d.t.wingL = 4; d.t.wingR = 4; d.t.headRoll = 0; d.t.squash = 0; d.t.squint = 0; d.t.happy = 0.3;
                await wait(0.3);
            },
            scan: async () => { api.look(-1, 0.1); await wait(0.5); api.look(1, 0.1); await wait(0.9); api.look(-0.3, -0.2); await wait(0.5); api.look(0, 0); await wait(0.2); },
            checkWrist: async () => {
                d.t.wingR = 70; d.t.headY = 0.7; d.t.eyeY = 0.8; d.t.headX = 0.3; d.t.squint = 0.3;
                await wait(1.0);
                d.t.wingR = 4; d.t.headY = 0; d.t.eyeY = 0; d.t.headX = 0; d.t.squint = 0;
                await wait(0.3);
            },
            /** One full turn on the spot. */
            spin: async (dir = 1) => {
                guard();
                d.t.turn = d.p.turn + dir * TAU;
                await wait(0.9);
                d.p.turn = 0; d.v.turn = 0; d.t.turn = 0;
            },
            cheer: async () => {
                await pose('cheer');
                const turn = api.spin(Math.random() < 0.5 ? 1 : -1);
                await api.hop(1.1, 0.5);
                api.emit('sparkle');
                await api.hop(0.8, 0.45);
                await turn;
                await wait(0.2);
            },
            loop: async (fn) => { for (;;) { guard(); await fn(); } },
        };
        return api;
    }
}

// Things a resting bot does now and then. Each is a short script like any other; `roamOnly` ones are for the big stage
// bot (the small row bots would look frantic doing them all the time).
const FIDGETS = [
    { run: async (d) => { await d.scan(); } },
    { run: async (d) => { await d.flap(); } },
    { run: async (d) => { d.set({ beak: 0.6 }); await d.wait(0.12); d.set({ beak: 0 }); await d.wait(0.14); d.set({ beak: 0.55 }); await d.wait(0.12); d.set({ beak: 0 }); await d.wait(0.2); } },
    {
        run: async (d) => {
            if (!d.roam) { await d.hop(0.45, 0.4); return; }
            // wander a few steps about the stretch of floor it is standing on
            const zones = d.roamZones;
            const zone = zones.reduce((best, z) => (Math.abs(d.x - (z[0] + z[1]) / 2) < Math.abs(d.x - (best[0] + best[1]) / 2) ? z : best), zones[0]);
            await d.walkTo(zone[0] + Math.random() * (zone[1] - zone[0]), 55);
            d.look(Math.random() < 0.5 ? -0.8 : 0.8, -0.1);
            await d.wait(0.7);
        },
    },
    { run: async (d) => { await d.spin(); }, roamOnly: true },
    { run: async (d) => { d.set({ squash: -0.07, wingL: 40, wingR: 40, headY: -0.5 }); await d.wait(0.5); d.set({ squash: 0.03, wingL: 4, wingR: 4, headY: 0 }); await d.wait(0.3); } },
    { run: async (d) => { d.set({ headRoll: 7, happy: 0.7, blush: 0.5 }); await d.wait(0.9); d.set({ headRoll: -6 }); await d.wait(0.7); d.set({ headRoll: 0, happy: 0.25, blush: 0.3 }); await d.wait(0.2); } },
    { run: async (d) => { await d.tapFoot(); } },
    { run: async (d) => { await d.shrug(); } },
    { run: async (d) => { await d.checkWrist(); } },
    { run: async (d) => { await d.wiggle(); }, roamOnly: true },
    { run: async (d) => { await d.jumpJack(); }, roamOnly: true },
];
