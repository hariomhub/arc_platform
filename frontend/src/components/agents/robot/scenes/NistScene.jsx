import React, { memo } from 'react';
import { Tick, Txt } from '../props.jsx';
import { goTo, present, relax } from './helpers.js';

/**
 * NIST AI RMF: Govern sits across the top because it runs through everything; Map, Measure and Manage sit under it.
 * The robot stands beside the board, points at each one in turn, and each lights up and gets ticked. Govern and Map
 * are explained from the left of the board, Measure and Manage from the right, so it walks across once.
 * Board coordinates are those of a screen drawn at x 292-784 (helpers.js moves them onto the real one).
 */
const FUNCS = [
    { id: 'map', title: 'MAP', name: 'Map', sub: 'Understand the context', ask: ['Where is it used?', 'What could go wrong?'], x: 308, side: 'left', line: 'Map: understand where the system is used, and what could go wrong.' },
    { id: 'measure', title: 'MEASURE', name: 'Measure', sub: 'Test and track the risks', ask: ['How do we test it?', 'What do we track?'], x: 466, side: 'right', line: 'Measure: test and track those risks, with numbers where you can.' },
    { id: 'manage', title: 'MANAGE', name: 'Manage', sub: 'Decide and act', ask: ['What do we do about it?', 'Who owns the fix?'], x: 624, side: 'right', line: 'Manage: decide what to do about each risk, then act on it.' },
];
const W = 152; const Y = 122; const H = 172;
const PARTS = ['govern', ...FUNCS.map((f) => f.id)];
const TICKS = FUNCS.map((f) => `${f.id}Tick`);

const Backdrop = memo(({ p }) => (
    <g>
        {FUNCS.map((f) => <path key={f.id} d={`M${f.x + W / 2} 84 V${Y}`} stroke="#7FB1F5" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="3 3" />)}
        <g ref={p.ref('govern')} data-on={p.initial} className="bot-lit">
            <rect x="308" y="32" width="468" height="52" rx="12" fill="#264C8E" stroke="#F9A825" strokeWidth="1.6" />
            <Txt x="542" y="64" size="16.5" fill="#fff"><tspan fill="#FBBF24" letterSpacing="1.2">GOVERN</tspan><tspan fontWeight="500" fill="#CBD5E1" dx="10">builds the culture that holds the rest together</tspan></Txt>
        </g>
        {FUNCS.map((f) => (
            <g key={f.id}>
                <g ref={p.ref(f.id)} data-on={p.initial} className="bot-lit">
                    <rect x={f.x} y={Y} width={W} height={H} rx="12" fill="#1D3F7A" stroke="#7FB1F5" strokeOpacity="0.7" />
                    <Txt x={f.x + W / 2} y={Y + 46} size="23" fill="#fff" letterSpacing="0.8">{f.title}</Txt>
                    <Txt x={f.x + W / 2} y={Y + 72} size="12.5" weight="500" fill="#BFDBFE">{f.sub}</Txt>
                    <path d={`M${f.x + 16} ${Y + 90} H${f.x + W - 16}`} stroke="#7FB1F5" strokeOpacity="0.3" />
                    <Txt x={f.x + W / 2} y={Y + 116} size="12.5" weight="500" fill="#93C5FD" fontStyle="italic">{f.ask[0]}</Txt>
                    <Txt x={f.x + W / 2} y={Y + 138} size="12.5" weight="500" fill="#93C5FD" fontStyle="italic">{f.ask[1]}</Txt>
                </g>
                <Tick x={f.x + W - 12} y={Y + 2} p={p} name={`${f.id}Tick`} initial={p.initial} />
            </g>
        ))}
        <Txt x="542" y="326" size="12.5" weight="600" fill="#64748B" letterSpacing="1">NIST AI RMF 1.0 · FOUR FUNCTIONS</Txt>
    </g>
));

export default {
    label: 'The agent stands beside a board of the four NIST AI RMF functions: Govern across the top, Map, Measure and Manage below.',
    signatureLabel: 'Walk me through the functions',
    Backdrop,
    reset: (p) => { p.many(PARTS, false); p.many(TICKS, false); p.focus(null); },
    signature: async (d, p) => {
        p.many(PARTS, false); p.many(TICKS, false); p.focus(null);
        await d.pose('neutral', 0.2);
        p.on('govern');
        await goTo(d, 'left');
        await present(d, p, {
            to: { x: 542, y: 86 }, box: { x: 304, y: 28, w: 476, h: 60 }, step: { i: 0, n: 4, label: 'Govern' },
            line: 'Govern comes first. It sets the culture and the rules for everything else.',
        });
        for (let i = 0; i < FUNCS.length; i += 1) {
            const f = FUNCS[i];
            await d.wait(0.2);
            await goTo(d, f.side);
            p.on(f.id);
            await present(d, p, {
                to: { x: f.x + W / 2, y: Y + 6 }, box: { x: f.x - 4, y: Y - 4, w: W + 8, h: H + 8 }, step: { i: i + 1, n: 4, label: f.name }, line: f.line,
            });
            p.on(`${f.id}Tick`);
        }
        await d.wait(0.2);
        p.focus(null);
        relax(d);
        d.emit('step', null);
        await d.cheer();
        await d.say('These are not strict steps. You come back to each one as things change.');
    },
};
