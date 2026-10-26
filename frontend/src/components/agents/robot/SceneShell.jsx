import React from 'react';
import { TRIM } from './finishes.js';
import { BOARD_TRANSFORM, HAND_REST_DX, HAND_REST_Y, HEAD_Y, LEFT_X, RIGHT_X, ROBOT_X, SCENE_H, SCENE_W, SCREEN } from './layout.js';
import './robot.css';

/**
 * SceneShell - what every agent stands in: a screen in the middle for the board, a pad on each side for the robot to
 * stand on, and the layer the robot is drawn in between them and the effects.
 *
 * Effects (`fx`) are short-lived marks drawn in front of everything: sparks when the robot cheers, a ring on the floor
 * when it lands, a beam from its hand to what it is explaining, a block it throws at the board. Each plays once by CSS
 * (robot.css) and the stage removes it again, so nothing here animates frame by frame.
 */
const SPARK = 'M0 -5 L1.6 -1.6 L5 0 L1.6 1.6 L0 5 L-1.6 1.6 L-5 0 L-1.6 -1.6 Z';

const Burst = ({ x }) => (
    <g className="bot-burst" transform={`translate(${ROBOT_X + x} ${HEAD_Y + 8})`}>
        {Array.from({ length: 10 }, (_, i) => (
            <path key={i} className="bot-spark" d={SPARK} fill={i % 2 ? TRIM[0] : '#fff'} style={{ '--a': `${i * 36}deg`, animationDelay: `${(i % 3) * 30}ms` }} />
        ))}
    </g>
);

const Ring = ({ x, color }) => (
    <ellipse className="bot-ring" cx={ROBOT_X + x} cy="368" rx="46" ry="11" style={{ '--fx': color }} />
);

const Beam = ({ e }) => {
    const x1 = e.fx ?? ROBOT_X + e.x;
    const y1 = e.fy ?? HEAD_Y;
    return (
        <g className="bot-beam" style={{ '--fx': e.color }}>
            <path className="halo" d={`M${x1} ${y1} L${e.tx} ${e.ty}`} pathLength="1" />
            <path d={`M${x1} ${y1} L${e.tx} ${e.ty}`} pathLength="1" />
            <circle className="bot-beam-ping" cx={e.tx} cy={e.ty} r="7" />
            <circle cx={e.tx} cy={e.ty} r="3.2" />
        </g>
    );
};

// something the robot throws at the board: it travels sideways steadily and goes up and down in an arc
const Throw = ({ e }) => {
    const x0 = e.fx ?? ROBOT_X + e.x + HAND_REST_DX;
    const y0 = e.fy ?? HAND_REST_Y;
    const dx = e.tx - x0;
    const dy = e.ty - y0;
    const lift = Math.min(120, 40 + Math.abs(dx) * 0.12);
    return (
        <g transform={`translate(${x0} ${y0})`}>
            <g className="bot-throw-x" style={{ '--dx': `${dx}px` }}>
                <g className="bot-throw-y" style={{ '--dy': `${dy}px`, '--lift': `${lift}px` }}>
                    <rect x="-10" y="-10" width="20" height="20" rx="5" fill={e.color} stroke="#fff" strokeWidth="2" />
                </g>
            </g>
        </g>
    );
};

const Fx = ({ e }) => {
    if (e.kind === 'burst') return <Burst x={e.x} />;
    if (e.kind === 'ring') return <Ring x={e.x} color={e.color} />;
    if (e.kind === 'beam') return <Beam e={e} />;
    if (e.kind === 'throw') return <Throw e={e} />;
    return null;
};

const Pad = ({ x }) => (
    <g>
        <ellipse cx={x} cy="372" rx="70" ry="16" fill="#1f4380" fillOpacity="0.55" />
        <ellipse cx={x} cy="372" rx="70" ry="16" fill="none" stroke="#7FB1F5" strokeOpacity="0.4" strokeWidth="1.4" />
        <ellipse className="bot-pulse" cx={x} cy="372" rx="70" ry="16" />
    </g>
);

/** `layer` is the 3D robot (RobotLayer); without WebGL it is left out and the set stands on its own. */
const SceneShell = ({ label, p, backdrop, fx, layer }) => (
    <div className="bot-scene-wrap">
        <svg className="bot-scene" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} role="img" aria-label={label}>
            <defs>
                <radialGradient id="botFloor" cx="0.5" cy="0.3" r="0.75">
                    <stop offset="0%" stopColor="#35568f" /><stop offset="70%" stopColor="#1a3566" /><stop offset="100%" stopColor="#122650" />
                </radialGradient>
                <radialGradient id="botSpot" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="#9CC6FF" stopOpacity="0.26" /><stop offset="100%" stopColor="#9CC6FF" stopOpacity="0" />
                </radialGradient>
                <pattern id="botDots" width="22" height="22" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="#7FB1F5" fillOpacity="0.14" />
                </pattern>
            </defs>
            <ellipse cx={LEFT_X} cy="210" rx="130" ry="190" fill="url(#botSpot)" />
            <ellipse cx={RIGHT_X} cy="210" rx="130" ry="190" fill="url(#botSpot)" />
            <ellipse cx="400" cy="372" rx="394" ry="28" fill="url(#botFloor)" />
            <ellipse cx="400" cy="372" rx="394" ry="28" fill="none" stroke="#7FB1F5" strokeOpacity="0.26" strokeWidth="1.4" />
            <Pad x={LEFT_X} />
            <Pad x={RIGHT_X} />
            <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} rx="16" fill="#07142e" fillOpacity="0.62" />
            <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} rx="16" fill="url(#botDots)" />
            <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} rx="16" fill="none" stroke="#7FB1F5" strokeOpacity="0.22" strokeWidth="1.2" />
            <g transform={BOARD_TRANSFORM}>
                {backdrop}
                <rect ref={p.ref('focus')} className="bot-focus" x="0" y="0" width="0" height="0" rx="10" />
            </g>
        </svg>
        {layer}
        <svg className="bot-scene bot-front" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} aria-hidden="true">
            {fx.map((e) => <Fx key={e.id} e={e} />)}
        </svg>
    </div>
);

export default SceneShell;
