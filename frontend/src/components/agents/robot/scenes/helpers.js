import { ARM, boardToStage, HAND_REST_DX, HAND_REST_Y, LEFT_X, RIGHT_X, ROBOT_X, SHOULDER_DX, SHOULDER_Y } from '../layout.js';

/**
 * helpers.js - the moves every set uses to explain something.
 *
 * The robot stands beside the board, on the left or the right, and walks across when the next point is on the other
 * side (`goTo`). `present` is the one to reach for: it turns the robot towards the board, raises the nearer arm, puts a
 * frame round the thing it is talking about, draws a beam from its hand to it, moves the progress dots on and then says
 * the line. While it speaks the engine adds the beats of a talking gesture by itself (engine.js).
 *
 * Positions the sets give are in the board's own coordinates (the screen is drawn at x = 292, y = 16); the helpers move
 * them onto the real screen (boardToStage), so a set never has to know where the screen is.
 */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Arms down, eyes front: between one thing and the next. */
export const relax = (d) => d.set({ wingL: 4, wingR: 4, face: 0, headX: 0, headY: 0, eyeX: 0, eyeY: 0, happy: 0.3 });

// said on the way across, so the walk is not dead air
const ON_THE_WAY = ['Over here.', 'Next one.', 'Let me show you.', 'Come this way.', 'Now this one.'];
let lastOnTheWay = -1;

/**
 * Walk to the left or right side of the board (does nothing if it is already there). It sets off briskly, says a few
 * words on the way, and slows in good time to stop on the pad.
 */
export const goTo = async (d, side) => {
    const to = (side === 'left' ? LEFT_X : RIGHT_X) - ROBOT_X;
    if (Math.abs(d.x - to) < 8) return;
    relax(d);
    const walk = d.walkTo(to, 190);
    walk.catch(() => {});                       // if the script is cancelled mid-walk, the awaits below report it
    await d.wait(0.5);
    let i;
    do { i = Math.floor(Math.random() * ON_THE_WAY.length); } while (i === lastOnTheWay);
    lastOnTheWay = i;
    await d.say(ON_THE_WAY[i]);
    await walk;
    await d.wait(0.1);
};

/** Point the nearer arm and the eyes at (tx, ty), in stage coordinates. Returns where the hand ends up, for the beam. */
const aim = (d, tx, ty) => {
    const rx = ROBOT_X + d.x;
    const right = tx >= rx;                                   // the target is on its right: use the right arm
    const sx = rx + (right ? SHOULDER_DX : -SHOULDER_DX);
    const dx = Math.abs(tx - sx);
    const dy = SHOULDER_Y - ty;                               // above the shoulder when positive
    const elevation = (Math.atan2(dy, Math.max(30, dx)) * 180) / Math.PI;      // -90 .. 90 degrees
    const raise = clamp(90 + elevation, 25, 150);
    const r = (raise * Math.PI) / 180;
    const dir = right ? 1 : -1;
    d.set({
        ...(right ? { wingR: raise, wingL: 6 } : { wingL: raise, wingR: 6 }),
        face: 0.12 * dir, happy: 0.55,
        headX: 0.45 * dir, headY: clamp(-dy / 220, -0.5, 0.4), eyeX: 0.9 * dir, eyeY: clamp(-dy / 180, -1, 1),
    });
    return { fx: sx + dir * Math.sin(r) * ARM, fy: SHOULDER_Y + Math.cos(r) * ARM };
};

/** Same, for a point given in board coordinates. */
export const aimBoard = (d, x, y) => { const t = boardToStage(x, y); return aim(d, t.x, t.y); };

/**
 * Explain one thing on the board.
 *   to    where the beam lands, in board coordinates
 *   box   the frame to put round it, in board coordinates: { x, y, w, h }
 *   step  { i, n, label } for the status bar and the progress dots
 */
export const present = async (d, p, { to, box, line, step }) => {
    const t = boardToStage(to.x, to.y);
    const from = aim(d, t.x, t.y);
    if (box) p.focus(box);
    d.emit('beam', { x: t.x, y: t.y, ...from });
    if (step) d.emit('step', step);
    await d.say(line);
    await d.nod();
};

/** Make a tool appear in its hands, wind up and throw it at (tx, ty), in board coordinates; resolves when it lands. */
export const throwAt = async (d, { tx, ty, color }) => {
    const t = boardToStage(tx, ty);
    const dir = t.x >= ROBOT_X + d.x ? 1 : -1;
    d.hold(true);
    await d.pose('hold', 0.32);
    d.set({ face: 0.15 * dir, headX: 0.4 * dir, eyeX: 0.9 * dir });
    d.set({ heldY: -34, squash: -0.05 });
    await d.wait(0.22);
    d.set({ heldY: 26, squash: 0.06 });
    await d.wait(0.1);
    d.hold(false);
    d.emit('throw', { tx: t.x, ty: t.y, color, fx: ROBOT_X + d.x + dir * HAND_REST_DX, fy: HAND_REST_Y });
    d.set({ heldY: 0, squash: 0 });
    await d.wait(0.64);
};
