import { useMemo, useRef } from 'react';
import { Bot, reducedMotion } from './engine.js';

/** One stable Bot for the lifetime of the component that owns it. */
export const useBot = (opts) => {
    const ref = useRef(null);
    if (!ref.current) ref.current = new Bot(opts);
    return ref.current;
};

/**
 * The handle a scene's script uses to change its props without React: each prop is an SVG element registered by name,
 * and `on` flips its `data-on` (robot.css turns that flip into a short transition).
 *   p.initial   what a prop shows before its script reaches it: "0" normally, "1" when nothing will animate (the visitor
 *               prefers reduced motion, or the browser cannot draw the 3D robot), so the finished picture is what they see
 */
export const useProps = (showFinished = false) => useMemo(() => {
    const els = {};
    const refs = {};
    const p = {
        initial: showFinished || reducedMotion() ? '1' : '0',
        ref: (name) => refs[name] || (refs[name] = (el) => { if (el) els[name] = el; else delete els[name]; }),
        on: (name, v = true) => { els[name]?.setAttribute('data-on', v ? '1' : '0'); },
        many: (names, v = true) => names.forEach((n) => p.on(n, v)),
        attr: (name, key, value) => { els[name]?.setAttribute(key, value); },
        text: (name, value) => { if (els[name]) els[name].textContent = value; },
        reset: (names, v = false) => names.forEach((n) => p.on(n, v)),
        // the frame round whatever the robot is talking about: slides to the box (set units), or hides when given null
        focus: (box) => {
            const el = els.focus;
            if (!el) return;
            if (!box) { el.style.opacity = '0'; return; }
            el.style.transform = `translate(${box.x}px, ${box.y}px)`;
            el.style.width = `${box.w}px`;
            el.style.height = `${box.h}px`;
            el.style.opacity = '1';
        },
    };
    return p;
}, []);
