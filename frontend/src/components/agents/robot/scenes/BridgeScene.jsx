import React, { memo } from 'react';
import { Txt } from '../props.jsx';
import { aimBoard, goTo, present, relax, throwAt } from './helpers.js';
import { RIGHT_X, ROBOT_X } from '../layout.js';

/**
 * AI Risk Bridge Model: five stages build a bridge, one deck section at a time. When it is finished a shield (the AI
 * system, now governed) crosses it. The wording of each stage follows the Framework page.
 * It builds the first two sections from the left of the bridge and the rest from the right, then walks back and
 * strolls along beside the shield as it crosses.
 * Board coordinates are those of a screen drawn at x 292-784 (helpers.js moves them onto the real one).
 */
const STAGES = [
    { id: 's1', name: 'Exposure', sub: ['Know what', 'exists'], line: 'Exposure: know what AI exists in your organisation.' },
    { id: 's2', name: 'Obligation', sub: ['Know the', 'rules'], line: 'Obligation: know which rules and standards apply to it.' },
    { id: 's3', name: 'Integrity', sub: ['Verify it’s', 'trustworthy'], line: 'Integrity: verify that it is trustworthy.' },
    { id: 's4', name: 'Defense', sub: ['Protect', 'it'], line: 'Defense: protect it from misuse and attack.' },
    { id: 's5', name: 'Continuity', sub: ['Sustain', 'it'], line: 'Continuity: keep the controls going over time, not just at launch.' },
];
const DECK = [150, 142, 138, 142, 150];
const X0 = 336; const W = 84;
const TRAVEL = W * 5 - 32;
const PARTS = STAGES.flatMap((s) => [s.id, `${s.id}Pier`, `${s.id}Label`]);
const segX = (i) => X0 + i * W + W / 2;

const WAVES = 'q14 -6 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0';

const Backdrop = memo(({ p }) => (
    <g>
        <rect x="300" y="298" width="476" height="40" rx="6" fill="#14336B" />
        <path d={`M300 312 ${WAVES}`} fill="none" stroke="#7FB1F5" strokeOpacity="0.28" strokeWidth="2" />
        <path d={`M300 326 ${WAVES}`} fill="none" stroke="#7FB1F5" strokeOpacity="0.16" strokeWidth="2" />
        <rect x="296" y="156" width="44" height="142" rx="10" fill="#27487F" />
        <rect x="752" y="156" width="44" height="142" rx="10" fill="#27487F" />
        {STAGES.map((s, i) => {
            const cx = segX(i);
            const y = DECK[i];
            return (
                <g key={s.id}>
                    <g ref={p.ref(`${s.id}Pier`)} data-on={p.initial} className="bot-rise">
                        <rect x={cx - 6} y={y + 16} width="12" height={298 - y - 16} rx="3" fill="#35599A" />
                    </g>
                    <g ref={p.ref(s.id)} data-on={p.initial} className="bot-drop">
                        <rect x={cx - W / 2 + 1.5} y={y} width={W - 3} height="20" rx="6" fill="#A5B4FC" />
                        <rect x={cx - W / 2 + 1.5} y={y} width={W - 3} height="20" rx="6" fill="none" stroke="#fff" strokeOpacity="0.65" strokeWidth="1.6" />
                        <rect x={cx - W / 2 + 8} y={y + 6} width={W - 16} height="3.4" rx="1.7" fill="#fff" opacity="0.55" />
                    </g>
                    <g ref={p.ref(`${s.id}Label`)} data-on={p.initial} className="bot-pop">
                        <Txt x={cx} y={y - 48} size="15.5" fill="#fff">{s.name}</Txt>
                        <Txt x={cx} y={y - 30} size="12" weight="500" fill="#BFDBFE">{s.sub[0]}</Txt>
                        <Txt x={cx} y={y - 15} size="12" weight="500" fill="#BFDBFE">{s.sub[1]}</Txt>
                    </g>
                </g>
            );
        })}
        <g ref={p.ref('shield')} data-on={p.initial} className="bot-glow">
            <g ref={p.ref('crosser')} className="bot-slide" style={{ transform: p.initial === '1' ? `translateX(${TRAVEL}px)` : 'translateX(0px)' }}>
                <g transform={`translate(${X0 + 16} ${DECK[2] - 28})`}>
                    <path d="M0 -11 L10 -8 V2 C10 9 4 12 0 14 C-4 12 -10 9 -10 2 V-8 Z" fill="#FFC445" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="M-4.5 1 l3.4 3.4 l6 -7.2" fill="none" stroke="#7C4A03" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </g>
            </g>
        </g>
    </g>
));

export default {
    label: 'The agent builds a five-section bridge labelled Exposure, Obligation, Integrity, Defense and Continuity, and a shield crosses it.',
    signatureLabel: 'Build the bridge',
    Backdrop,
    heldKind: 'plank',
    reset: (p) => { p.many(PARTS, false); p.on('shield', false); p.attr('crosser', 'style', 'transform:translateX(0px)'); p.focus(null); },
    signature: async (d, p) => {
        p.many(PARTS, false); p.on('shield', false); p.attr('crosser', 'style', 'transform:translateX(0px)'); p.focus(null);
        for (let i = 0; i < STAGES.length; i += 1) {
            const s = STAGES[i];
            await goTo(d, i < 2 ? 'left' : 'right');
            await throwAt(d, { tx: segX(i), ty: DECK[i] + 8, color: '#C7D2FE' });
            p.on(`${s.id}Pier`);
            p.on(s.id);
            d.emit('ring');
            await d.wait(0.3);
            p.on(`${s.id}Label`);
            await present(d, p, { to: { x: segX(i), y: DECK[i] }, box: { x: segX(i) - W / 2, y: DECK[i] - 64, w: W, h: 90 }, step: { i, n: 5, label: s.name }, line: s.line });
            await d.wait(0.15);
            relax(d);
        }
        p.focus(null);
        d.emit('step', null);
        await goTo(d, 'left');
        p.on('shield');
        await d.wait(0.3);
        aimBoard(d, X0 + 40, DECK[2] - 28);
        await d.wait(0.5);
        p.attr('crosser', 'style', `transform:translateX(${TRAVEL}px)`);
        relax(d);
        d.look(0.9, -0.2);
        await d.walkTo(RIGHT_X - ROBOT_X, 150);                      // it strolls along while the shield crosses
        aimBoard(d, X0 + 16 + TRAVEL, DECK[4] - 28);
        await d.wait(0.6);
        relax(d);
        await d.cheer();
        await d.say('From knowing what you have to keeping it safe. That is the bridge.');
    },
};
