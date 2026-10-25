import React, { useEffect, useRef, useState } from 'react';
import { colors } from './kit.jsx';

/**
 * Motion that carries information. Progress fills in to show how far along something is, numbers
 * settle on their value, nothing loops. Everything here respects the system's "reduce motion" setting
 * and simply shows the final state.
 */

export const usePrefersReducedMotion = () => {
    const [reduced, setReduced] = useState(() =>
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false);
    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => setReduced(mq.matches);
        mq.addEventListener?.('change', onChange);
        return () => mq.removeEventListener?.('change', onChange);
    }, []);
    return reduced;
};

/** A number that counts up to `target` the first time it appears, and glides to new values after that. */
export const useCountUp = (target, { duration = 650 } = {}) => {
    const reduced = usePrefersReducedMotion();
    const end = Number.isFinite(Number(target)) ? Number(target) : 0;
    const [value, setValue] = useState(reduced ? end : 0);
    const shown = useRef(reduced ? end : 0);

    useEffect(() => {
        if (reduced) { shown.current = end; setValue(end); return undefined; }
        const from = shown.current;
        if (from === end) return undefined;
        let raf = 0;
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - (1 - t) ** 3;
            const next = Math.round(from + (end - from) * eased);
            shown.current = next;
            setValue(next);
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [end, duration, reduced]);

    return value;
};

/** `{count}` rendered as text so call sites stay one line. */
export const CountUp = ({ value, suffix = '' }) => <>{useCountUp(value)}{suffix}</>;

/** A flat progress bar that fills to `percent` (0-100). */
export const Meter = ({ percent, color = colors.primary, height = 8, label }) => {
    const reduced = usePrefersReducedMotion();
    const target = Math.max(0, Math.min(100, Number(percent) || 0));
    const [width, setWidth] = useState(reduced ? target : 0);
    useEffect(() => {
        if (reduced) { setWidth(target); return undefined; }
        const id = requestAnimationFrame(() => setWidth(target));
        return () => cancelAnimationFrame(id);
    }, [target, reduced]);
    return (
        <div
            role="progressbar"
            aria-valuenow={Math.round(target)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
            style={{ height, borderRadius: 100, background: '#EEF2F7', overflow: 'hidden' }}
        >
            <div className="kit-meter" style={{ width: `${width}%`, height: '100%', background: color, borderRadius: 100, transition: 'width .6s cubic-bezier(.22,.8,.3,1)' }} />
        </div>
    );
};

/** A circular progress mark with room for text in the middle. */
export const ProgressRing = ({ percent, size = 76, stroke = 8, color = colors.primary, children, label }) => {
    const reduced = usePrefersReducedMotion();
    const target = Math.max(0, Math.min(100, Number(percent) || 0));
    const [shown, setShown] = useState(reduced ? target : 0);
    useEffect(() => {
        if (reduced) { setShown(target); return undefined; }
        const id = requestAnimationFrame(() => setShown(target));
        return () => cancelAnimationFrame(id);
    }, [target, reduced]);
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
        <div role="img" aria-label={label || `${Math.round(target)} percent`} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2F7" strokeWidth={stroke} />
                <circle
                    className="kit-ring"
                    cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)}
                    style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.22,.8,.3,1)' }}
                />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center' }}>
                {children}
            </div>
        </div>
    );
};
