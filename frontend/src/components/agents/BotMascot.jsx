import React from 'react';
import './BotMascot.css';

// Full-body vector mascot — head, visor eyes, ear-lights, torso, arms, legs.
// Pure inline SVG (no image/library fetch, nothing to download), so it paints
// instantly and scales to any size without a network round-trip. `accent`
// recolors the eyes/ears/chest-light per agent so five agents read as five
// distinct characters from one shared shape — add a sixth agent and it just
// cycles the palette, no new artwork needed.
const BotMascot = ({ size = 48, accent = '#003366', className = '', style }) => {
    const height = Math.round(size * 1.3);
    const uid = accent.replace('#', '');
    const visorGrad = `bot-visor-${uid}`;
    const shellGrad = `bot-shell-${uid}`;
    return (
        <span className={`bot-mascot ${className}`} style={{ width: size, height, ...style }}>
            <svg viewBox="0 0 100 130" width={size} height={height} className="bot-mascot-svg">
                <defs>
                    <linearGradient id={visorGrad} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#243244" />
                        <stop offset="100%" stopColor="#0B1220" />
                    </linearGradient>
                    <linearGradient id={shellGrad} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="100%" stopColor="#E7ECF3" />
                    </linearGradient>
                </defs>

                <circle className="bot-mascot-aura" cx="50" cy="58" r="46" style={{ '--bot-accent': accent }} />
                <ellipse className="bot-mascot-shadow" cx="50" cy="126" rx="27" ry="4" />

                <rect className="bot-mascot-limb" x="32" y="99" width="14" height="23" rx="7" style={{ fill: `url(#${shellGrad})` }} />
                <rect className="bot-mascot-limb" x="54" y="99" width="14" height="23" rx="7" style={{ fill: `url(#${shellGrad})` }} />
                <rect className="bot-mascot-foot" x="29" y="117" width="19" height="9" rx="4.5" />
                <rect className="bot-mascot-foot" x="52" y="117" width="19" height="9" rx="4.5" />

                <rect className="bot-mascot-limb" x="2" y="65" width="14" height="31" rx="7" transform="rotate(-14 9 65)" style={{ fill: `url(#${shellGrad})` }} />
                <rect className="bot-mascot-limb" x="84" y="65" width="14" height="31" rx="7" transform="rotate(14 91 65)" style={{ fill: `url(#${shellGrad})` }} />
                <circle className="bot-mascot-hand" cx="5" cy="95" r="6.5" />
                <circle className="bot-mascot-hand" cx="95" cy="95" r="6.5" />

                <rect className="bot-mascot-body" x="23" y="61" width="54" height="47" rx="19" style={{ fill: `url(#${shellGrad})` }} />
                <circle className="bot-mascot-chest" cx="50" cy="84" r="5" style={{ '--bot-accent': accent }} />

                <line className="bot-mascot-antenna-stem" x1="50" y1="3" x2="50" y2="15" />
                <circle className="bot-mascot-antenna-dot" cx="50" cy="2" r="4" />
                <circle className="bot-mascot-ear" cx="11" cy="37" r="7.5" style={{ '--bot-accent': accent }} />
                <circle className="bot-mascot-ear" cx="89" cy="37" r="7.5" style={{ '--bot-accent': accent }} />
                <rect className="bot-mascot-head" x="15" y="13" width="70" height="53" rx="25" style={{ fill: `url(#${shellGrad})` }} />
                <rect className="bot-mascot-visor" x="25" y="35" width="50" height="25" rx="12.5" style={{ fill: `url(#${visorGrad})` }} />
                <circle className="bot-mascot-eye" cx="39" cy="47.5" r="5.5" style={{ '--bot-accent': accent }} />
                <circle className="bot-mascot-eye" cx="61" cy="47.5" r="5.5" style={{ '--bot-accent': accent }} />
                <rect className="bot-mascot-mouth" x="44" y="61" width="2.4" height="4" rx="1.2" />
                <rect className="bot-mascot-mouth" x="48.8" y="59.3" width="2.4" height="5.7" rx="1.2" />
                <rect className="bot-mascot-mouth" x="53.6" y="61" width="2.4" height="4" rx="1.2" />
                <ellipse className="bot-mascot-shine" cx="33" cy="23" rx="13" ry="6.5" />
            </svg>
        </span>
    );
};

export default BotMascot;
