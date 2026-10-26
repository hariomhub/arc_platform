import React, { memo } from 'react';
import { Txt } from '../props.jsx';
import { boardToStage, HAND_REST_DX, HAND_REST_Y, ROBOT_X } from '../layout.js';
import { goTo, present, relax } from './helpers.js';

/**
 * RBI FREE-AI: six pillars. The robot raises each one with a mallet and explains it, then the roof goes on.
 * Lines are deliberately plain: they say what each pillar's name means, nothing more specific than that.
 * It works the first three pillars from the left of the board and the last three from the right.
 * Board coordinates are those of a screen drawn at x 292-784 (helpers.js moves them onto the real one).
 */
const PILLARS = [
    { id: 'p1', name: 'Infrastructure', line: 'Infrastructure: the data and tools institutions need to build AI.' },
    { id: 'p2', name: 'Policy', line: 'Policy: clear rules for adopting AI responsibly.' },
    { id: 'p3', name: 'Capacity', line: 'Capacity: the people and skills to use and oversee AI.' },
    { id: 'p4', name: 'Governance', line: 'Governance: who is accountable for AI decisions.' },
    { id: 'p5', name: 'Protection', line: 'Protection: keeping customers and their data safe.' },
    { id: 'p6', name: 'Assurance', line: 'Assurance: checking that AI does what it should.' },
];
const SLOT = 78; const FIRST = 339;
const cx = (i) => FIRST + i * SLOT;
const PARTS = PILLARS.flatMap((p) => [p.id, `${p.id}Label`]);

const Backdrop = memo(({ p }) => (
    <g>
        <defs>
            <linearGradient id="rbiCol" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#B79F63" /><stop offset="30%" stopColor="#F4E8C6" /><stop offset="62%" stopColor="#F4E8C6" /><stop offset="100%" stopColor="#A98F52" />
            </linearGradient>
            <linearGradient id="rbiGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFE79A" /><stop offset="60%" stopColor="#FFC445" /><stop offset="100%" stopColor="#E58E12" />
            </linearGradient>
        </defs>
        {PILLARS.map((pl, i) => (
            <g key={pl.id}>
                <g ref={p.ref(pl.id)} data-on={p.initial} className="bot-rise">
                    <rect x={cx(i) - 34} y="72" width="68" height="15" rx="4" fill="url(#rbiCol)" />
                    <rect x={cx(i) - 29} y="87" width="58" height="219" fill="url(#rbiCol)" />
                    {[-14, 0, 14].map((o) => <path key={o} d={`M${cx(i) + o} 93 V300`} stroke="#8A7440" strokeOpacity="0.2" strokeWidth="1.4" />)}
                    <rect x={cx(i) - 34} y="306" width="68" height="14" rx="4" fill="url(#rbiCol)" />
                </g>
                <g ref={p.ref(`${pl.id}Label`)} data-on={p.initial} className="bot-pop">
                    <text transform={`translate(${cx(i) + 5} 197) rotate(-90)`} textAnchor="middle" fontSize="15" fontWeight="700" fill="#5B4519" fontFamily="Inter, 'Segoe UI', system-ui, sans-serif" letterSpacing="0.6">{pl.name}</text>
                </g>
            </g>
        ))}
        <g ref={p.ref('lintel')} data-on={p.initial} className="bot-drop">
            <rect x="302" y="30" width="472" height="34" rx="9" fill="url(#rbiGold)" />
            <Txt x="538" y="53" size="16" fill="#5B3A06" letterSpacing="2.8">FREE-AI</Txt>
        </g>
        <Txt x="538" y="338" size="12.5" weight="600" fill="#64748B" letterSpacing="1">SIX PILLARS</Txt>
    </g>
));

export default {
    label: 'The agent stands beside six pillars named Infrastructure, Policy, Capacity, Governance, Protection and Assurance, under a roof marked FREE-AI.',
    signatureLabel: 'Build the pillars',
    Backdrop,
    heldKind: 'mallet',
    reset: (p) => { p.many(PARTS, false); p.on('lintel', false); p.focus(null); },
    signature: async (d, p) => {
        p.many(PARTS, false); p.on('lintel', false); p.focus(null);
        for (let i = 0; i < PILLARS.length; i += 1) {
            const pl = PILLARS[i];
            await goTo(d, i < 3 ? 'left' : 'right');
            d.hold(true, { heldRot: -30 });                    // the mallet appears in its hands
            await d.pose('hold', 0.3);
            const hit = boardToStage(cx(i), 87);
            const dir = hit.x >= ROBOT_X + d.x ? 1 : -1;
            d.set({ face: 0.15 * dir, headX: 0.4 * dir, eyeX: 0.9 * dir });
            d.hold(true, { heldRot: -58 });                    // wind up
            d.set({ squash: -0.05 });
            await d.wait(0.22);
            d.hold(true, { heldRot: 42 });                     // strike
            d.set({ squash: 0.06 });
            await d.wait(0.1);
            d.emit('beam', { x: hit.x, y: hit.y, fx: ROBOT_X + d.x + dir * HAND_REST_DX, fy: HAND_REST_Y - 6 });
            p.on(pl.id);
            d.emit('ring');
            d.set({ squash: 0 });
            await d.wait(0.32);
            d.hold(false);
            p.on(`${pl.id}Label`);
            await present(d, p, { to: { x: cx(i), y: 84 }, box: { x: cx(i) - 40, y: 66, w: 80, h: 260 }, step: { i, n: 6, label: pl.name }, line: pl.line });
            await d.wait(0.15);
            relax(d);
        }
        p.focus(null);
        p.on('lintel');
        d.emit('ring');
        d.emit('step', null);
        await d.wait(0.5);
        await d.cheer();
        await d.say('Six pillars, one framework for using AI responsibly in finance.');
    },
};
