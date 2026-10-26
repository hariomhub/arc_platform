import React, { memo } from 'react';
import { Txt } from '../props.jsx';
import { goTo, present, relax, throwAt } from './helpers.js';

/**
 * ISO/IEC 42001: an AI management system run as a cycle. The robot stamps each quarter of the ring in turn
 * (plan, do, check, act) and the badge in the middle lights once the cycle has gone round.
 * It stands on whichever side of the ring the quarter it is stamping is nearest.
 * Board coordinates are those of a screen drawn at x 292-784 (helpers.js moves them onto the real one).
 */
const CX = 538; const CY = 172; const R_OUT = 132; const R_IN = 76;
const STEPS = [
    { id: 'plan', name: 'PLAN', label: 'Plan', a0: 180, side: 'left', color: '#60A5FA', line: 'Plan: set the scope, the AI policy and the risks you need to manage.' },
    { id: 'do', name: 'DO', label: 'Do', a0: 270, side: 'right', color: '#34D399', line: 'Do: put the controls in place and run your AI systems under them.' },
    { id: 'check', name: 'CHECK', label: 'Check', a0: 0, side: 'right', color: '#FBBF24', line: 'Check: monitor, audit and review whether it is working.' },
    { id: 'act', name: 'ACT', label: 'Act', a0: 90, side: 'left', color: '#A78BFA', line: 'Act: fix what the checks found, and keep improving.' },
];
const IDS = [...STEPS.map((s) => s.id), 'badge'];

const pt = (r, a) => [CX + r * Math.cos((a * Math.PI) / 180), CY + r * Math.sin((a * Math.PI) / 180)];
const sector = (a0) => {
    const g = 2.2;
    const [x0, y0] = pt(R_OUT, a0 + g); const [x1, y1] = pt(R_OUT, a0 + 90 - g);
    const [x2, y2] = pt(R_IN, a0 + 90 - g); const [x3, y3] = pt(R_IN, a0 + g);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${R_OUT} ${R_OUT} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} A${R_IN} ${R_IN} 0 0 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z`;
};
const centreOf = (s) => pt((R_OUT + R_IN) / 2, s.a0 + 45);

const Backdrop = memo(({ p }) => (
    <g>
        <circle cx={CX} cy={CY} r={R_OUT + 14} fill="none" stroke="#7FB1F5" strokeOpacity="0.18" strokeDasharray="2 6" strokeWidth="2" />
        {STEPS.map((s) => {
            const [tx, ty] = centreOf(s);
            return (
                <g key={s.id} ref={p.ref(s.id)} data-on={p.initial} className="bot-lit">
                    <path d={sector(s.a0)} fill={s.color} />
                    <Txt x={tx} y={ty + 6} size="17" fill="#0B1D3F" letterSpacing="0.6">{s.name}</Txt>
                </g>
            );
        })}
        <circle cx={CX} cy={CY} r="62" fill="#0F2A57" stroke="#7FB1F5" strokeOpacity="0.5" strokeWidth="1.5" />
        <Txt x={CX} y={CY - 2} size="23" fill="#CBD5E1" letterSpacing="1">AIMS</Txt>
        <Txt x={CX} y={CY + 19} size="12.5" weight="500" fill="#94A3B8">ISO/IEC 42001</Txt>
        <g transform={`translate(${CX + 50} ${CY - 50})`}>
            <g ref={p.ref('badge')} data-on={p.initial} className="bot-pop">
                <circle r="18" fill="#22C55E" stroke="#fff" strokeWidth="2.4" />
                <path d="M-8 0.5 l5.6 5.8 l10.6 -11.8" fill="none" stroke="#fff" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
            </g>
        </g>
        <Txt x="542" y="336" size="12.5" weight="600" fill="#64748B" letterSpacing="1">AN AI MANAGEMENT SYSTEM · PLAN · DO · CHECK · ACT</Txt>
    </g>
));

export default {
    label: 'The agent stands beside a four-part cycle: plan, do, check, act, around a badge for the AI management system.',
    signatureLabel: 'Run the cycle',
    Backdrop,
    heldKind: 'stamp',
    reset: (p) => { p.many(IDS, false); p.focus(null); },
    signature: async (d, p) => {
        p.many(IDS, false); p.focus(null);
        for (let i = 0; i < STEPS.length; i += 1) {
            const s = STEPS[i];
            const [bx, by] = centreOf(s);
            await goTo(d, s.side);
            await throwAt(d, { tx: bx, ty: by, color: s.color });
            p.on(s.id);
            d.emit('ring');
            await present(d, p, { to: { x: bx, y: by }, box: { x: bx - 58, y: by - 42, w: 116, h: 84 }, step: { i, n: 4, label: s.label }, line: s.line });
            await d.wait(0.2);
            relax(d);
        }
        p.focus(null);
        p.on('badge');
        d.emit('ring');
        d.emit('step', null);
        await d.cheer();
        await d.say('Then you go round again. That is how a management system keeps getting better.');
    },
};
