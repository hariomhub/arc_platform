import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import SceneShell from './SceneShell.jsx';
import RobotLayer from './RobotLayer.jsx';
import { FINISHES } from './finishes.js';
import { FEET_Y, LEFT_X, RIGHT_X, ROBOT_SIZE, ROBOT_X, SCENE_H, SCENE_W } from './layout.js';
import { useBot, useProps } from './useBot.js';
import { reducedMotion } from './engine.js';
import { webglSupported } from './webgl.js';
import { onVoiceChange, setVoiceEnabled, setVoicePick, speak, stopVoice, voiceChoices, voiceEnabled, voicePick, voiceSupported } from './voice.js';
import { agentShortName } from '../../../config/agents';
import './robot.css';

// Each agent's set is its own small module, loaded only when that agent's page is opened.
const loaders = import.meta.glob('./scenes/*.jsx');
const sceneFile = (name) => `./scenes/${name.charAt(0).toUpperCase()}${name.slice(1)}Scene.jsx`;

// what it does on its own, one after another, once nobody is using the buttons
const NEXT = ['fact', 'signature', 'dance', 'fact', 'signature', 'celebrate'];
const ROBOT_H = 273;         // the robot's height in its own units (three/model.js)

// Where the robot's reference point is on the 800 x 400 set, scaled to the stage box: the middle of the floor, about
// three quarters of the stage tall. It starts on the left pad (bot.x is an offset from here) and walks to the right
// pad and back; the board is on the screen between the pads, so at rest the two never overlap.
const sceneLayout = (host) => {
    const w = host.clientWidth; const h = host.clientHeight;
    return [{ x: (w * ROBOT_X) / SCENE_W, ground: (h * FEET_Y) / SCENE_H, scale: (h * ROBOT_SIZE) / ROBOT_H, k: w / SCENE_W }];
};

// Offsets from the middle of the stage for the two pads, the bit of floor it may wander about on at each, and which
// way it faces when it is standing still: towards the board, whichever side it is on.
const AT_LEFT = LEFT_X - ROBOT_X;
const AT_RIGHT = RIGHT_X - ROBOT_X;
const robotOptions = {
    lite: false,
    roam: true,
    x0: AT_LEFT,
    sceneW: SCENE_W,
    gazeY: 0.3,
    roamZones: [[AT_LEFT, AT_LEFT + 26], [AT_RIGHT - 26, AT_RIGHT]],
    faceBias: (x) => 0.13 - 0.83 * Math.min(1, Math.max(0, (x - AT_LEFT) / (AT_RIGHT - AT_LEFT))),
};

/**
 * The agent's page stage: its robot beside the board it explains, a status bar (who, what it is doing, how far
 * through), a subtitle for what it says (and a voice that reads it), and "Ask me" buttons.
 *
 * What runs when: the first time the stage scrolls into view the robot introduces itself and performs its set piece;
 * after that it rests (and fidgets, see engine.js) and, if nobody has touched it for a while, does the next thing on
 * its own. Pressing a button interrupts whatever it was doing. Everything stops while the stage is off screen. With
 * reduced motion the robot stands still on the finished set and the facts are listed as text instead.
 */
const AgentHeroStage = ({ agent }) => {
    const bot = useBot(robotOptions);
    const [canDraw, setCanDraw] = useState(webglSupported);         // false: no WebGL (or the 3D drawing failed)
    const p = useProps(!canDraw);
    const reduced = useMemo(() => reducedMotion(), []);
    const still = reduced || !canDraw;                              // nothing moves: show the finished set and the facts as text
    const [scene, setScene] = useState(null);
    const [caption, setCaption] = useState('');
    const [fx, setFx] = useState([]);
    const [step, setStep] = useState(null);
    const [running, setRunning] = useState(false);
    const [active, setActive] = useState(null);
    const [, setVoiceTick] = useState(0);
    const rootRef = useRef(null);
    const run = useRef({ token: 0, timer: 0, started: false, next: 0, fact: 0, fxId: 0 });
    const short = agentShortName(agent);
    const color = (FINISHES[agent.finish] || FINISHES.sky).accent;
    const voiceOn = voiceEnabled();

    useEffect(() => {
        let alive = true;
        setScene(null);
        loaders[sceneFile(agent.scene)]?.().then((m) => { if (alive) setScene(m.default); });
        return () => { alive = false; };
    }, [agent.scene]);

    useEffect(() => onVoiceChange(() => setVoiceTick((t) => t + 1)), []);

    // a short-lived mark in front of the robot; it removes itself once its animation is over
    const addFx = useCallback((e) => {
        run.current.fxId += 1;
        const id = run.current.fxId;
        setFx((list) => [...list.slice(-6), { id, ...e }]);
        setTimeout(() => setFx((list) => list.filter((x) => x.id !== id)), e.kind === 'beam' ? 2300 : 1300);
    }, []);

    useEffect(() => {
        bot.events.onSay = (text) => {
            setCaption(text);
            return text ? speak(text, agent.voice) : undefined;      // a promise while the voice is reading, so the script waits for it
        };
        bot.events.onEvent = (name, payload) => {
            const x = bot.x;
            if (name === 'sparkle') addFx({ kind: 'burst', x });
            else if (name === 'ring' || name === 'land') addFx({ kind: 'ring', x, color });
            else if (name === 'beam' && payload) addFx({ kind: 'beam', x, color, tx: payload.x, ty: payload.y, fx: payload.fx, fy: payload.fy });
            else if (name === 'throw' && payload) addFx({ kind: 'throw', x, color: payload.color || color, tx: payload.tx, ty: payload.ty, fx: payload.fx, fy: payload.fy });
            else if (name === 'step') setStep(payload);
        };
        return () => { bot.events.onSay = null; bot.events.onEvent = null; stopVoice(); };
    }, [bot, agent.voice, addFx, color]);

    const scripts = useMemo(() => ({
        intro: async (d) => {
            await d.hello();
            await d.say(`Hi, I'm the ${short} agent. Watch this.`);
            await scene.signature(d, p);
        },
        signature: (d) => scene.signature(d, p),
        fact: async (d) => {
            const text = agent.facts[run.current.fact % agent.facts.length];
            run.current.fact += 1;
            await d.pose('think', 0.7);
            await d.pose('point', 0.15);
            await d.say(text);
            await d.nod();
        },
        celebrate: async (d) => {
            await d.cheer();
            await d.say('Quizzes for this framework are coming soon. I am practising.');
        },
        // a short routine with no talking: loosen up, jump, loosen up again
        dance: async (d) => {
            await d.wiggle();
            await d.jumpJack();
            await d.tapFoot();
            await d.wiggle();
        },
    }), [scene, agent, short, p]);

    const play = useCallback((key, auto = false) => {
        if (still || !scene) return;
        const r = run.current;
        clearTimeout(r.timer);
        r.token += 1;
        const token = r.token;
        stopVoice();
        p.focus(null);
        setStep(null);
        setRunning(true);
        setActive(auto ? null : key);
        bot.exec((d) => scripts[key](d)).then(() => {
            if (run.current.token !== token) return;
            p.focus(null);
            setActive(null);
            setRunning(false);
            setStep(null);
            setCaption('');
            const wait = (key === 'intro' ? 3 : 5) * 1000 + Math.random() * 3000;
            const tick = () => {
                if (run.current.token !== token) return;
                // never act on its own while off screen or in a background tab
                if (!bot.visible || document.hidden) { run.current.timer = setTimeout(tick, 3000); return; }
                const nextKey = NEXT[run.current.next % NEXT.length];
                run.current.next += 1;
                play(nextKey, true);
            };
            run.current.timer = setTimeout(tick, wait);
        });
    }, [still, scene, bot, scripts, p]);

    // start once, the first time the stage is seen and its set has loaded
    useEffect(() => {
        if (still || !scene || !rootRef.current) return undefined;
        const io = new IntersectionObserver((entries) => {
            if (!entries.some((e) => e.isIntersecting) || run.current.started) return;
            run.current.started = true;
            play('intro', true);
        }, { threshold: 0.35 });
        io.observe(rootRef.current);
        return () => io.disconnect();
    }, [still, scene, play]);

    useEffect(() => () => { clearTimeout(run.current.timer); run.current.token += 1; bot.stopRun(); }, [bot]);

    // it notices the pointer arriving over the stage: a wave, at most once in a while and only if it is not busy
    const lastHello = useRef(0);
    const greet = () => {
        const now = performance.now();
        if (still || !scene || (bot.run && !bot.run.idle) || now - lastHello.current < 20000) return;
        lastHello.current = now;
        bot.exec(async (d) => { await d.hello(); }, { idle: true });
    };

    const items = useMemo(() => (scene ? [{ bot, finish: agent.finish, held: scene.heldKind, p, getEl: () => rootRef.current }] : null), [scene, bot, agent.finish, p]);
    const Backdrop = scene?.Backdrop;
    const label = scene?.label || `${short} agent, a friendly robot.`;
    const choices = voiceOn && voiceSupported() ? voiceChoices() : [];

    return (
        <div>
            <div className="bot-stage" ref={rootRef} onPointerEnter={greet}>
                <SceneShell
                    label={label}
                    p={p}
                    fx={fx}
                    backdrop={Backdrop ? <Backdrop p={p} /> : null}
                    layer={items && canDraw ? <RobotLayer key={agent.slug} items={items} layout={sceneLayout} onFail={() => setCanDraw(false)} /> : null}
                />
                <div className="bot-bar">
                    <div className="bot-status">
                        <span className={`bot-led${running ? ' busy' : ''}`} aria-hidden="true" />
                        <b>{short}</b>
                        <span className="what">{step ? `· ${step.label}` : running ? '· Presenting' : '· Ready'}</span>
                    </div>
                    <div className={`bot-caption${caption ? '' : ' idle'}`} aria-live="off">
                        <span key={caption || 'idle'}>{caption || agent.tagline}</span>
                    </div>
                    <div className="bot-dots" aria-hidden="true">
                        {step ? Array.from({ length: step.n }, (_, k) => <i key={k} className={k < step.i ? 'done' : k === step.i ? 'now' : ''} />) : null}
                    </div>
                </div>
            </div>

            {still ? (
                <ul style={{ margin: '0.9rem auto 0', padding: 0, listStyle: 'none', maxWidth: 560, color: '#CBD5E1', fontSize: '0.92rem', lineHeight: 1.6, display: 'grid', gap: 6 }}>
                    {agent.facts.map((f) => <li key={f}>{f}</li>)}
                </ul>
            ) : (
                <div className="bot-chips" role="group" aria-label={`Ask the ${short} agent`}>
                    <button type="button" className="bot-chip" disabled={!scene} aria-pressed={active === 'signature'} onClick={() => play('signature')}>{scene?.signatureLabel || 'Show me'}</button>
                    <button type="button" className="bot-chip" disabled={!scene} aria-pressed={active === 'fact'} onClick={() => play('fact')}>Tell me a fact</button>
                    <button type="button" className="bot-chip" disabled={!scene} aria-pressed={active === 'celebrate'} onClick={() => play('celebrate')}>Cheer</button>
                    {voiceSupported() && (
                        <button type="button" className="bot-chip bot-voice" aria-pressed={voiceOn} title="The agent reads what it says aloud" onClick={() => { if (voiceOn) stopVoice(); setVoiceEnabled(!voiceOn); }}>
                            {voiceOn ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
                            {voiceOn ? 'Voice on' : 'Voice off'}
                        </button>
                    )}
                    {choices.length > 1 && (
                        <select
                            className="bot-chip bot-voice-pick"
                            aria-label="Choose the voice"
                            title="Pick the most natural voice your browser has (starred ones usually sound best)"
                            value={voicePick()}
                            onChange={(e) => { setVoicePick(e.target.value); speak('Hi, this is how I sound.', agent.voice); }}
                        >
                            <option value="">Voice: automatic</option>
                            {choices.map((v) => <option key={v.name} value={v.name}>{v.natural ? '★ ' : ''}{v.label}</option>)}
                        </select>
                    )}
                </div>
            )}
        </div>
    );
};

export default AgentHeroStage;
