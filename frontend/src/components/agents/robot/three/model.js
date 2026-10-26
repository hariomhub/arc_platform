import {
    CanvasTexture, CapsuleGeometry, CatmullRomCurve3, CircleGeometry, CylinderGeometry, Euler, Group, Matrix4, Mesh,
    MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, Quaternion, SphereGeometry, SRGBColorSpace,
    TorusGeometry, TubeGeometry, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FINISHES } from '../finishes.js';

/**
 * model.js - one robot, built from primitives and driven by the engine's numbers (engine.js `o`).
 *
 * A compact humanoid: dome head with a coloured rim and a dark glass visor that shows the eyes and an LED mouth, ear
 * servo pods and a sprung antenna; a ribbed neck with cables; a chest shell with a glowing core, shoulder pauldrons
 * over servo housings, arms with elbows and gripper hands; a back pack with cooling fins and thrusters; a ribbed
 * waist; legs with knee guards, a piston and linkage rod on the shin, and flat orange feet. Glossy shell panels sit
 * over exposed dark housings with bolted metal caps, so it reads as hardware rather than a toy.
 *
 * Units are "robot units": the robot stands ROBOT_H tall with its feet on y = 0 and faces +z (towards the camera);
 * the stage scales it to the screen.
 *
 * Cheap on purpose: shared geometry, the static detail of each rigid part is merged into one mesh per material, no
 * shadow maps (the contact shadow is a flat gradient), and the eyes and mouth are one small canvas texture that is only
 * redrawn when one of their parameters actually changes. `detail: 'lo'` (the launcher row) leaves out bolts, cables,
 * fins and the other tiny parts that cannot be seen at that size.
 */
const D2R = Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const ROBOT_H = 273;

// leg geometry
const L1 = 44; const L2 = 46; const FOOT = 14; const HIP_X = 27;
const STANCE = 0.3;      // the robot stands turned a little, so the knees and the face read as 3D
const ORANGE = '#FF8A1F';

// ── shared geometry ──────────────────────────────────────────────────────────────────────────────────────────────
const geoms = new Map();
const memo = (key, make) => { let g = geoms.get(key); if (!g) { g = make(); geoms.set(key, g); } return g; };
const rb = (w, h, d, r, seg = 4) => memo(`rb${w},${h},${d},${r},${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, r));
const cylX = (r, len, seg = 28) => memo(`cx${r},${len},${seg}`, () => new CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2));
const cylY = (r, len, seg = 24) => memo(`cy${r},${len},${seg}`, () => new CylinderGeometry(r, r, len, seg));
const cylZ = (r, len, seg = 24) => memo(`cz${r},${len},${seg}`, () => new CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2));
const capsule = (r, len) => memo(`cp${r},${len}`, () => new CapsuleGeometry(r, len, 8, 20));
const sphere = (seg = 32) => memo(`sp${seg}`, () => new SphereGeometry(1, seg, Math.round(seg / 2)));
const dome = (seg) => memo(`dm${seg}`, () => new SphereGeometry(1, seg, Math.round(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2));
const underDome = (seg) => memo(`ud${seg}`, () => new SphereGeometry(1, seg, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));
// the window on the front of the head: 109 degrees wide, 45 degrees tall
const visorGeo = (seg) => memo(`vz${seg}`, () => new SphereGeometry(1, seg, 14, Math.PI / 2 - 0.95, 1.9, 0.6, 0.78));
const ring = () => memo('ring', () => new TorusGeometry(1, 0.075, 12, 72));
const disc = () => memo('disc', () => new CircleGeometry(1, 28));
const bolt = () => cylX(1.4, 1.8, 8);

// ── materials (shared by every robot of the same finish) ────────────────────────────────────────────────────────
const matCache = new Map();
const materials = (finish) => {
    let m = matCache.get(finish);
    if (m) return m;
    const f = FINISHES[finish] || FINISHES.sky;
    const dark = finish === 'graphite';
    const shell = (c, extra = {}) => new MeshPhysicalMaterial({ color: c, roughness: 0.3, metalness: 0.0, clearcoat: 0.85, clearcoatRoughness: 0.18, envMapIntensity: 1, ...extra });
    m = {
        f,
        shell: shell(dark ? '#59657A' : f.shell[1]),
        shell2: shell(dark ? '#3F495B' : f.shell[2]),
        belly: shell(dark ? '#8793A7' : f.belly),
        jointDark: new MeshStandardMaterial({ color: '#171d2b', roughness: 0.42, metalness: 0.55 }),
        metal: new MeshStandardMaterial({ color: '#b4bcc9', roughness: 0.3, metalness: 0.95 }),
        rubber: new MeshStandardMaterial({ color: '#0e121b', roughness: 0.85, metalness: 0.0 }),
        accent: shell(f.accent, { roughness: 0.28, clearcoat: 0.6 }),
        trim: shell(ORANGE, { roughness: 0.3, clearcoat: 0.6 }),
        glass: new MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6, depthWrite: false }),
        led: new MeshBasicMaterial({ color: f.accent, toneMapped: false }),
    };
    matCache.set(finish, m);
    return m;
};

// ── merging the static detail of one rigid part ─────────────────────────────────────────────────────────────────
const _m = new Matrix4(); const _q = new Quaternion(); const _e = new Euler(); const _p = new Vector3(); const _s = new Vector3();

/** Collects pieces (each with its own position / rotation / scale), then adds one mesh per material to `parent`. */
class Part {
    constructor(parent, owned) { this.parent = parent; this.owned = owned; this.by = new Map(); }

    add(geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
        // some of three's geometries are indexed and some are not, and a merge needs them all alike
        const g = geo.index ? geo.toNonIndexed() : geo.clone();
        g.applyMatrix4(_m.compose(_p.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(r[0], r[1], r[2])), _s.set(s[0], s[1], s[2])));
        const list = this.by.get(mat);
        if (list) list.push(g); else this.by.set(mat, [g]);
        return this;
    }

    done() {
        this.by.forEach((geos, mat) => {
            const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
            if (merged) {
                if (geos.length > 1) geos.forEach((g) => g.dispose());
                this.owned.push(merged);
                this.parent.add(new Mesh(merged, mat));
            } else {
                geos.forEach((g) => { this.owned.push(g); this.parent.add(new Mesh(g, mat)); });   // attributes did not match: keep them apart
            }
        });
        this.by.clear();
        return this.parent;
    }
}

/** A circle of small bolts on a round face at x (an axle along x). */
const bolts = (part, mat, xs, radius, n, cy = 0, cz = 0) => xs.forEach((x) => {
    for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2;
        part.add(bolt(), mat, [x, cy + Math.sin(a) * radius, cz + Math.cos(a) * radius]);
    }
});

// ── the face: eyes and an LED mouth on one small canvas on the visor ────────────────────────────────────────────
const makeFace = (f) => {
    const W = 512; const H = 200;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    let last = '';
    const draw = (o) => {
        const key = [o.blink, o.squint, o.wide, o.happy, o.eyeX, o.eyeY, o.blush, o.beak].map((v) => Math.round(v * 30)).join('|');
        if (key === last) return;
        last = key;
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#1d2b47'); g.addColorStop(1, '#070b16');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        const lid = Math.max(0.06, (1 + o.wide * 0.22 - o.squint * 0.55) * (1 - o.blink * 0.94));
        const open = clamp(1 - o.happy * 1.15, 0, 1);
        const arc = clamp(o.happy * 1.15, 0, 1);
        const ex = o.eyeX * 26; const ey = o.eyeY * 11;
        [-1, 1].forEach((side) => {
            const cx = W / 2 + side * 112 + ex; const cy = 80 + ey;
            ctx.save();
            ctx.globalAlpha = clamp(o.blush * 0.7, 0, 0.5);
            ctx.fillStyle = f.accent;
            ctx.beginPath(); ctx.ellipse(cx + side * 6, cy + 48, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.shadowColor = f.accent; ctx.shadowBlur = 30;
            if (open > 0.02) {
                ctx.globalAlpha = open;
                ctx.translate(cx, cy); ctx.scale(1, lid);
                const rg = ctx.createRadialGradient(0, -8, 4, 0, 0, 52);
                rg.addColorStop(0, f.accent2); rg.addColorStop(0.55, f.accent); rg.addColorStop(1, f.accent);
                ctx.fillStyle = rg;
                ctx.beginPath(); ctx.ellipse(0, 0, 33, 44, 0, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0; ctx.globalAlpha = open * 0.95; ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.ellipse(-10, -16, 8, 11, -0.3, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
            if (arc > 0.02) {
                ctx.save();
                ctx.globalAlpha = arc; ctx.shadowColor = f.accent; ctx.shadowBlur = 26;
                ctx.strokeStyle = f.accent2; ctx.lineWidth = 16; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(cx - 33, cy + 14); ctx.quadraticCurveTo(cx, cy - 34, cx + 33, cy + 14); ctx.stroke();
                ctx.restore();
            }
        });
        // LED mouth: a thin bar at rest, opening while it talks
        const b = clamp(o.beak, 0, 1);
        const mh = 5 + b * 26; const mw = 48 + b * 12;
        const mx = W / 2 + ex * 0.35; const my = 162 + ey * 0.3;
        ctx.save();
        ctx.shadowColor = f.accent; ctx.shadowBlur = 18;
        ctx.globalAlpha = 0.55 + b * 0.4;
        ctx.fillStyle = f.accent2;
        ctx.beginPath(); ctx.roundRect(mx - mw / 2, my - mh / 2, mw, mh, Math.min(mh / 2, 14)); ctx.fill();
        ctx.restore();
        // a soft reflection across the top of the glass
        const sh = ctx.createLinearGradient(0, 0, W, H);
        sh.addColorStop(0, 'rgba(255,255,255,0.14)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)');
        ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
        tex.needsUpdate = true;
    };
    return { tex, draw };
};

// ── what it can hold ────────────────────────────────────────────────────────────────────────────────────────────
const paperTexture = () => {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 160;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#F8FAFC'; ctx.fillRect(0, 0, 128, 160);
    [34, 74, 114].forEach((y) => {
        ctx.strokeStyle = '#16A34A'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(26, y + 10); ctx.lineTo(44, y - 10); ctx.stroke();
        ctx.fillStyle = '#CBD5E1'; ctx.beginPath(); ctx.roundRect(58, y - 6, 54, 12, 6); ctx.fill();
    });
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
};

const buildHeld = (kind, M) => {
    const g = new Group();
    const disposables = [];
    const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
    let blockMat = null;
    if (kind === 'clipboard') {
        const paper = paperTexture();
        const paperMat = new MeshStandardMaterial({ map: paper, roughness: 0.7 });
        disposables.push(paper, paperMat);
        add(rb(38, 48, 4, 1.6), M.jointDark);
        add(rb(31, 40, 1, 0.4), paperMat, 0, -1, 2.3);
        add(rb(15, 7, 4, 1.6), M.trim, 0, 24, 2.4);
        g.rotation.x = -0.12;
    } else if (kind === 'block') {
        blockMat = new MeshPhysicalMaterial({ color: '#94A3B8', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
        disposables.push(blockMat);
        add(rb(32, 32, 32, 7), blockMat);
        add(rb(14, 14, 2, 0.9), M.jointDark, 0, 0, 16.4);
        add(rb(20, 3, 2, 1), M.shell, 0, 10, 16.6);
    } else if (kind === 'stamp') {
        const pad = new MeshStandardMaterial({ color: '#EF4444', roughness: 0.5 });
        disposables.push(pad);
        add(cylY(5, 22), M.trim, 0, 14, 0);
        add(rb(34, 8, 22, 3), M.jointDark, 0, 0, 0);
        add(rb(30, 3, 18, 1), pad, 0, -5, 0);
    } else if (kind === 'mallet') {
        const wood = new MeshStandardMaterial({ color: '#B45309', roughness: 0.6 });
        disposables.push(wood);
        add(cylY(2.8, 42), wood, 0, 0, 0);
        add(rb(34, 16, 16, 4), M.trim, 0, 22, 0);
    } else if (kind === 'plank') {
        const plank = new MeshPhysicalMaterial({ color: '#C7D2FE', roughness: 0.35, clearcoat: 0.6 });
        disposables.push(plank);
        add(rb(56, 11, 17, 4), plank);
        add(sphere(12), M.accent, -23, 6, 0).scale.setScalar(2.2);
        add(sphere(12), M.accent, 23, 6, 0).scale.setScalar(2.2);
    }
    return { group: g, blockMat, disposables };
};

// ── the robot ───────────────────────────────────────────────────────────────────────────────────────────────────
let shadowTex = null;
const contactShadow = () => {
    if (!shadowTex) {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
        g.addColorStop(0, 'rgba(2,6,23,0.62)'); g.addColorStop(0.6, 'rgba(2,6,23,0.22)'); g.addColorStop(1, 'rgba(2,6,23,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
        shadowTex = new CanvasTexture(c);
    }
    return shadowTex;
};

export const buildRobot = ({ finish = 'sky', held = null, detail = 'hi' }) => {
    const M = materials(finish);
    const f = M.f;
    const hi = detail !== 'lo';
    const seg = hi ? 56 : 28;
    const face = makeFace(f);
    const owned = [];                        // merged geometry that belongs to this robot
    const own = [face.tex];                  // textures / materials that belong to this robot
    const part = (parent) => new Part(parent, owned);

    const ledMat = M.led.clone();
    const coreHi = new MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    own.push(ledMat, coreHi);

    const root = new Group();
    const body = new Group();
    root.add(body);

    // contact shadow
    const shadowMat = new MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false, toneMapped: false });
    own.push(shadowMat);
    const shadow = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), shadowMat);
    shadow.scale.set(190, 1, 120);
    shadow.position.y = 0.4;
    shadow.renderOrder = -1;
    root.add(shadow);

    // hips carry everything above the legs
    const hips = new Group();
    body.add(hips);

    // ── legs ──
    const legs = [-1, 1].map((s) => {
        const hip = new Group();
        hip.position.set(s * HIP_X, 0, 0);
        hips.add(hip);
        const hp = part(hip);
        hp.add(cylX(11, 30), M.jointDark).add(cylX(6, 35), M.metal).add(cylX(3, 39), M.accent);
        if (hi) bolts(hp, M.metal, [15.6, -15.6], 8.6, 5);
        hp.done();

        const thigh = new Group();
        hip.add(thigh);
        const tp = part(thigh);
        tp.add(rb(30, 40, 34, 11), M.shell, [0, -21, 3]);
        tp.add(rb(1.4, 20, 10, 0.5, 2), M.accent, [-15.2, -22, 3]).add(rb(1.4, 20, 10, 0.5, 2), M.accent, [15.2, -22, 3]);
        if (hi) tp.add(cylY(1.5, 38, 8), M.metal, [0, -20, -16]).add(cylX(2.6, 6, 10), M.metal, [0, 0, -16]).add(cylX(2.6, 6, 10), M.metal, [0, -40, -16]);
        tp.done();

        const shin = new Group();
        shin.position.y = -L1;
        thigh.add(shin);
        const sp = part(shin);
        sp.add(cylX(10.5, 34), M.jointDark).add(cylX(6, 38), M.metal).add(cylX(3, 42), M.accent);
        sp.add(rb(24, 18, 10, 6), M.trim, [0, 1, 13]);                                          // knee guard
        sp.add(capsule(5.5, 26), M.jointDark, [0, -22, 0]);
        sp.add(rb(18, 26, 13, 6), M.shell, [0, -22, 7]);                                        // calf guard
        if (hi) {
            bolts(sp, M.metal, [17.7, -17.7], 8, 5);
            sp.add(cylY(2.4, 30, 10), M.metal, [0, -22, -9]).add(cylY(3.8, 14, 14), M.jointDark, [0, -12, -9]);
        }
        sp.done();

        const foot = new Group();
        foot.position.y = -L2;
        shin.add(foot);
        const fp = part(foot);
        fp.add(cylX(8, 25), M.jointDark).add(cylX(4.5, 29), M.metal);
        fp.add(rb(34, 9, 50, 5), M.trim, [0, -9.5, 10]);                                        // sole
        fp.add(rb(30, 7, 16, 4), M.shell, [0, -7.5, 28]);                                       // toe cap
        fp.add(rb(28, 6, 14, 3), M.jointDark, [0, -6, -11]);                                    // heel
        if (hi) fp.add(cylY(1.5, 1, 8), M.metal, [-9, -4.6, 4]).add(cylY(1.5, 1, 8), M.metal, [9, -4.6, 4]);
        fp.done();
        return { hip, thigh, shin, foot };
    });

    // ── pelvis, waist, chest, back pack, neck ──
    const bp = part(hips);
    bp.add(rb(70, 20, 36, 8), M.jointDark, [0, 2, 0]);
    bp.add(cylY(23, 12, 28), M.jointDark, [0, 16, 0]);
    [12, 16, 20].forEach((y) => bp.add(cylY(24.2, 1.6, 28), M.rubber, [0, y, 0]));
    bp.add(rb(68, 16, 46, 7), M.shell2, [0, 30, 0]);                                             // abdomen
    bp.add(rb(88, 56, 60, 22, 5), M.shell, [0, 66, 0]);                                          // chest
    // chest core: dark glass, a coloured ring and a light that pulses
    bp.add(disc(), M.jointDark, [0, 68, 30.6], [0, 0, 0], [15, 15, 1]);
    bp.add(ring(), M.accent, [0, 68, 31.1], [0, 0, 0], [15.5, 15.5, 15.5]);
    if (hi) [-1, 1].forEach((sx) => [0, 1, 2].forEach((i) => bp.add(rb(1.6, 3, 14, 0.6, 2), M.jointDark, [sx * 44.2, 76 - i * 6, 0])));
    // back pack with cooling fins and two thrusters
    bp.add(rb(54, 52, 18, 7), M.jointDark, [0, 66, -38]);
    if (hi) [-15, -5, 5, 15].forEach((x) => bp.add(rb(1.6, 38, 8, 0.6, 2), M.metal, [x, 68, -47.5]));
    [-1, 1].forEach((sx) => {
        bp.add(cylZ(7.5, 12, 20), M.jointDark, [sx * 17, 48, -53]).add(cylZ(5, 13, 16), M.metal, [sx * 17, 48, -53.5]);
        bp.add(ring(), M.accent, [sx * 17, 48, -59.2], [0, 0, 0], [7.4, 7.4, 7.4]);
    });
    // neck: metal core, rubber ribs, coloured rings, two cables
    bp.add(cylY(6.5, 26, 16), M.metal, [0, 103, 0]);
    [96, 100, 104, 108].forEach((y) => bp.add(cylY(8.4, 2, 20), M.rubber, [0, y, 0]));
    [98, 106].forEach((y) => bp.add(ring(), M.accent, [0, y, 0], [Math.PI / 2, 0, 0], [9.2, 9.2, 9.2]));
    if (hi) {
        [-1, 1].forEach((sx) => {
            const pts = [[-5, 94, -7], [-12, 101, -13], [-10, 109, -9], [-4, 115, -4]].map(([x, y, z]) => new Vector3(sx * -x, y, z));
            const tube = new TubeGeometry(new CatmullRomCurve3(pts), 14, 1.3, 6, false);
            bp.add(tube, M.rubber);
            tube.dispose();
        });
    }
    bp.done();

    const lp = part(hips);                      // the lights on the body share one colour that pulses
    lp.add(disc(), ledMat, [0, 68, 31.4], [0, 0, 0], [5.6, 5.6, 1]);
    lp.add(disc(), coreHi, [0, 68, 31.7], [0, 0, 0], [2.2, 2.2, 1]);
    lp.add(rb(36, 3.4, 2, 1, 2), ledMat, [0, 86, -47.2]);
    lp.done();

    // ── arms: shoulder servo under a pauldron, upper arm, elbow, forearm, wrist and a two-finger gripper ──
    const arms = [-1, 1].map((s) => {
        const pivot = new Group();
        pivot.position.set(s * 52, 82, 0);
        hips.add(pivot);
        const pp = part(pivot);
        pp.add(cylX(10.5, 16, 24), M.jointDark).add(cylX(5.5, 20, 16), M.metal);
        pp.add(dome(20), M.shell2, [s * 3, 4, 0], [0, 0, 0], [16, 12, 15]);                     // pauldron
        pp.add(cylY(6.5, 10, 16), M.jointDark, [s * 1, -8, 0]);
        pp.add(capsule(6.6, 12), M.shell2, [s * 1, -21, 0]);
        if (hi) bolts(pp, M.metal, [s * 8.6], 7.6, 5);
        pp.done();

        const fore = new Group();
        fore.position.set(s * 1, -35, 0);
        fore.rotation.order = 'YXZ';             // flex forward first, then swing in towards the middle
        pivot.add(fore);
        const fp2 = part(fore);
        fp2.add(cylX(8, 15, 20), M.jointDark).add(cylX(4.2, 18, 14), M.metal);
        fp2.add(rb(15, 24, 14, 5), M.shell, [0, -15, 0]);
        fp2.add(rb(2, 16, 8, 0.8, 2), M.accent, [s * 7.6, -15, 0]);
        fp2.add(cylY(5.2, 5, 16), M.metal, [0, -28.5, 0]);
        fp2.add(rb(13, 9, 8, 3), M.jointDark, [0, -34, 0]);
        fp2.done();

        const fingers = [-1, 1].map((fs) => {
            const finger = new Group();
            finger.position.set(fs * 4.5, -38, 0);
            fore.add(finger);
            part(finger).add(rb(4, 13, 5, 2, 2), M.trim, [0, -6.5, 0]).done();
            return finger;
        });
        return { pivot, fore, fingers, s };
    });

    // ── head ──
    const head = new Group();
    head.position.set(0, 112, 0);
    hips.add(head);
    const skull = new Group();
    skull.position.y = 8;
    head.add(skull);
    const sk = part(skull);
    sk.add(dome(seg), M.shell, [0, 0, 0], [0, 0, 0], [62, 60, 56]);
    sk.add(underDome(Math.round(seg * 0.7)), M.jointDark, [0, 0, 0], [0, 0, 0], [59, 13, 52]);
    sk.add(ring(), M.accent, [0, 0, 0], [Math.PI / 2, 0, 0], [62, 56, 56]);
    sk.add(ring(), M.jointDark, [0, 52.6, 0], [Math.PI / 2, 0, 0], [30.2, 27.2, 27.2]);          // a seam round the crown
    [-1, 1].forEach((s) => {
        sk.add(cylX(13, 14), M.jointDark, [s * 63, 5, 2]).add(cylX(8.5, 17, 20), M.metal, [s * 63, 5, 2]);
        sk.add(ring(), M.accent, [s * 72, 5, 2], [0, Math.PI / 2, 0], [10.5, 10.5, 10.5]);
        sk.add(cylX(4.5, 3, 16), ledMat, [s * 72.4, 5, 2]);
    });
    sk.done();

    const visorMat = new MeshBasicMaterial({ map: face.tex, toneMapped: false });
    own.push(visorMat);
    const visor = new Mesh(visorGeo(seg), visorMat);
    visor.scale.set(62.7, 60.7, 56.7);
    skull.add(visor);
    const glass = new Mesh(visorGeo(seg), M.glass);
    glass.scale.set(63.4, 61.4, 57.4);
    skull.add(glass);

    const antenna = new Group();                // sprung: it lags behind the head
    antenna.position.set(-20, 55, -14);
    skull.add(antenna);
    part(antenna).add(cylY(3.4, 4, 14), M.jointDark).add(cylY(1.2, 20, 8), M.metal, [0, 11, 0]).add(sphere(12), ledMat, [0, 22, 0], [0, 0, 0], [3, 3, 3]).done();

    // ── what it holds ──
    const heldObj = held ? buildHeld(held, M) : null;
    const heldGroup = new Group();
    heldGroup.position.set(0, 58, 44);
    if (heldObj) heldGroup.add(heldObj.group);
    heldGroup.visible = false;
    hips.add(heldGroup);

    // placement on the stage (set by runtime.js)
    const place = { x: 0, y: 0, scale: 1, k: 1 };
    let dirty = false;

    const apply = (o) => {
        const s = place.scale;
        root.scale.setScalar(s);
        root.position.set(place.x + o.x * place.k, place.y + o.hop * s, 0);
        root.rotation.z = -(o.lean + o.roll) * D2R;
        body.rotation.y = STANCE + o.face * 1.15 + o.turn;
        hips.scale.set(1 + o.squash * 0.35, 1 - o.squash * 0.22, 1 + o.squash * 0.35);

        // legs: knee forward, shin back, flat feet, hips as high as the planted leg needs
        const crouch = clamp(o.squash * 3.2, -0.3, 0.9) + clamp(o.hop / 40, 0, 1) * 0.35;
        let top = 0;
        const sides = [
            { swing: o.legL * D2R, lift: o.liftL },
            { swing: o.legR * D2R, lift: o.liftR },
        ];
        const up = clamp(o.walk, 0, 1);                       // walking, it stands taller than its resting crouch
        const angles = sides.map(({ swing, lift }) => {
            const a1 = 0.5 - 0.2 * up + crouch * 0.8 + swing;
            const a2 = -1.0 + 0.4 * up - crouch * 1.6 - lift * 0.07;
            top = Math.max(top, L1 * Math.cos(a1) + L2 * Math.cos(a1 + a2) + FOOT);
            return [a1, a2];
        });
        hips.position.y = top;
        legs.forEach((leg, i) => {
            const [a1, a2] = angles[i];
            leg.thigh.rotation.x = -a1;
            leg.shin.rotation.x = -a2;
            leg.foot.rotation.x = a1 + a2;
        });

        // head
        head.rotation.set(o.headY * 0.35, o.headX * 0.6, -o.headRoll * D2R);
        face.draw(o);
        antenna.rotation.set(-0.35 + o.headY * 0.08, 0, o.crest * 0.6 + o.headRoll * 0.015);

        // arms: raised sideways by wingL / wingR; to hold something they come forward and in, and the grippers close
        const h = clamp(o.held, 0, 1);
        arms.forEach((a) => {
            const raise = a.s < 0 ? o.wingL : o.wingR;
            const spread = raise * (1 - h) - h * 10;
            const fore = (a.s > 0 ? -1 : 1) * o.armSwing * (1 - h);      // the right arm goes forward as the left leg does
            a.pivot.rotation.set(-h * 0.75 + fore, 0, a.s * spread * D2R);
            a.fore.rotation.set(-(0.1 + h * 0.95 + Math.abs(o.armSwing) * 0.6), -a.s * h * 0.95, a.s * clamp((raise - 40) / 100, 0, 1) * 0.5 * (1 - h));
            const openAngle = 0.12 + (1 - h) * 0.4;
            a.fingers[0].rotation.z = -openAngle;
            a.fingers[1].rotation.z = openAngle;
        });

        // lights
        const lv = 0.3 + 0.7 * clamp(o.led, 0, 1);
        ledMat.color.set(f.accent).multiplyScalar(lv);

        // held object
        heldGroup.visible = o.held > 0.03;
        heldGroup.scale.setScalar(Math.max(0.001, o.held));
        heldGroup.position.y = 58 - o.heldY * 0.6;
        heldGroup.rotation.z = -o.heldRot * D2R;

        // shadow stays on the floor while the robot is in the air
        shadow.position.y = 0.4 - o.hop;
        const sh = clamp(1 - o.hop / 190, 0.5, 1);
        shadow.scale.set(190 * sh, 1, 120 * sh);
        shadowMat.opacity = clamp(1 - o.hop / 90, 0.35, 1);
        dirty = true;
    };

    // the scene's scripts recolour a held block by name; hand them a stand-in "element" for it
    const bindProps = (p) => {
        if (!p || !heldObj?.blockMat) return () => {};
        const shim = { setAttribute: (k, v) => { if (k === 'fill') heldObj.blockMat.color.set(v); } };
        p.ref('heldBlock')(shim);
        return () => p.ref('heldBlock')(null);
    };

    const dispose = () => {
        own.forEach((o) => o.dispose?.());
        owned.forEach((g) => g.dispose());
        heldObj?.disposables.forEach((o) => o.dispose?.());
        shadow.geometry.dispose();
    };

    return { root, apply, place, bindProps, dispose, get dirty() { return dirty; }, clean() { dirty = false; } };
};
