import React, { memo } from 'react';
import { Txt } from '../props.jsx';
import { goTo, present, relax, throwAt } from './helpers.js';

/**
 * EU AI Act: four levels of risk as a pyramid. The robot makes an AI system in its hands, throws it onto its level,
 * and says what the Act asks of that level.
 * It works from the left of the board for one level and the right for the next, so it keeps crossing the floor.
 * Board coordinates are those of a screen drawn at x 292-784 (helpers.js moves them onto the real one).
 */
const TIERS = [
    { id: 'tier1', name: 'Unacceptable', rule: 'Banned', color: '#EF4444', line: 'Unacceptable risk: these uses are banned. Social scoring is one example.' },
    { id: 'tier2', name: 'High', rule: 'Strict duties', color: '#F97316', line: 'High risk: allowed, but with strict duties like risk management, good data and human oversight.' },
    { id: 'tier3', name: 'Limited', rule: 'Be transparent', color: '#EAB308', line: 'Limited risk: mostly about transparency. People should know they are dealing with an AI.' },
    { id: 'tier4', name: 'Minimal', rule: 'Free to use', color: '#22C55E', line: 'Minimal risk: most AI sits here, with no new obligations from the Act.' },
];
const IDS = TIERS.map((t) => t.id);

const CX = 516; const TOP = 38; const BASE = 314; const HALF = 142; const H = (BASE - TOP) / 4;
const half = (y) => ((y - TOP) / (BASE - TOP)) * HALF;
const midY = (i) => TOP + i * H + H / 2;
const labelX = (i) => CX + half(midY(i)) + 14;
const shape = (i) => {
    const y0 = TOP + i * H; const y1 = y0 + H;
    const h0 = half(y0); const h1 = half(y1);
    return i === 0 ? `${CX},${y0} ${CX - h1},${y1} ${CX + h1},${y1}` : `${CX - h0},${y0} ${CX + h0},${y0} ${CX + h1},${y1} ${CX - h1},${y1}`;
};
const boxOf = (i) => {
    const y0 = TOP + i * H;
    const x0 = CX - half(y0 + H) - 8;
    return { x: x0, y: y0 - 2, w: labelX(i) + 112 - x0, h: H + 4 };
};

const Backdrop = memo(({ p }) => (
    <g>
        {TIERS.map((t, i) => {
            const mid = midY(i);
            const lx = labelX(i);
            return (
                <g key={t.id} ref={p.ref(t.id)} data-on={p.initial} className="bot-lit">
                    <polygon points={shape(i)} fill={t.color} stroke="#0B1D3F" strokeWidth="3" strokeLinejoin="round" />
                    <Txt x={lx} y={mid - 1} size="16" anchor="start" fill={t.color}>{t.name}</Txt>
                    <Txt x={lx} y={mid + 17} size="12.5" weight="500" anchor="start" fill="#CBD5E1">{t.rule}</Txt>
                </g>
            );
        })}
        <Txt x="542" y="334" size="12.5" weight="600" fill="#64748B" letterSpacing="1">EU AI ACT · FOUR LEVELS OF RISK</Txt>
    </g>
));

export default {
    label: 'The agent stands beside a pyramid of the four EU AI Act risk levels: unacceptable, high, limited and minimal.',
    signatureLabel: 'Sort the risk levels',
    Backdrop,
    heldKind: 'block',
    reset: (p) => { p.many(IDS, false); p.focus(null); },
    signature: async (d, p) => {
        p.many(IDS, false); p.focus(null);
        for (let i = 0; i < TIERS.length; i += 1) {
            const t = TIERS[i];
            const mid = midY(i);
            p.attr('heldBlock', 'fill', t.color);
            await goTo(d, i % 2 === 0 ? 'left' : 'right');
            await throwAt(d, { tx: CX, ty: mid, color: t.color });
            p.on(t.id);
            d.emit('ring');
            await present(d, p, { to: { x: CX, y: mid }, box: boxOf(i), step: { i, n: 4, label: `${t.name} risk` }, line: t.line });
            await d.wait(0.2);
            relax(d);
        }
        p.focus(null);
        d.emit('step', null);
        await d.cheer();
        await d.say('Four levels. The higher the risk, the heavier the rules.');
    },
};
