import React from 'react';

/** Scene text, kept in one place so every set reads the same. */
export const Txt = ({ x, y, size = 12, weight = 700, fill = '#E2E8F0', anchor = 'middle', children, ...rest }) => (
    <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor} fontFamily="Inter, 'Segoe UI', system-ui, sans-serif" {...rest}>{children}</text>
);

/**
 * A small check badge that pops onto a prop when the robot has dealt with it.
 * (The CSS transition owns the `transform` of a .bot-pop / .bot-drop / .bot-rise element, so the position is on a wrapper.)
 */
export const Tick = ({ x, y, p, name, initial }) => (
    <g transform={`translate(${x} ${y})`}>
        <g ref={p.ref(name)} data-on={initial} className="bot-pop">
            <circle r="11" fill="#22C55E" stroke="#fff" strokeWidth="2" />
            <path d="M-5 0.5 l3.6 3.8 l7 -8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
    </g>
);
