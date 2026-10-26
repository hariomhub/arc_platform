import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot as BotIcon } from 'lucide-react';
import RobotLayer from './RobotLayer.jsx';
import { Bot, reducedMotion } from './engine.js';
import { FINISHES } from './finishes.js';
import { webglSupported } from './webgl.js';
import { LEARNING_AGENTS, agentShortName } from '../../../config/agents';
import './robot.css';

// What the row does on its own, one move at a time, each passed along the row from the first robot to the last.
// `stagger` is the pause between one robot starting and the next; `length` is roughly how long one robot's move takes.
const MOVES = {
    wave: { stagger: 0.55, length: 1.9, run: async (d) => { await d.hello(); } },
    hop: { stagger: 0.22, length: 0.9, run: async (d) => { await d.hop(1.0, 0.5); } },
    cheer: { stagger: 0.3, length: 1.4, run: async (d) => { await d.pose('cheer', 0.9); } },
    nod: { stagger: 0.3, length: 1.4, run: async (d) => { await d.nod(); await d.nod(); } },
    spin: { stagger: 0.35, length: 1.5, run: async (d) => { await d.spin(); } },
};
const SHOW = ['wave', 'hop', 'cheer', 'wave', 'spin', 'nod'];

/**
 * A row of agents: one robot each, standing on the page, fidgeting on its own. Hovering (or focusing) one makes it
 * wave; opening it makes it hop first, then the page changes. Left alone, the row puts on a little show by itself
 * while it is on screen: a wave that runs along the row from the first robot to the last, then a hop, a cheer, a nod,
 * a spin. All the robots in a row share one WebGL canvas, run at about 30 frames a second and only while the row is
 * on screen (engine.js, three/runtime.js). Without WebGL each one is a plain robot icon instead.
 */
export const AgentRow = ({ agents }) => {
    const navigate = useNavigate();
    const still = useMemo(() => reducedMotion(), []);
    const [mode, setMode] = useState(() => (webglSupported() ? '3d' : 'off'));
    const ids = agents.map((a) => a.key).join(',');
    const bots = useMemo(() => agents.map(() => new Bot({ lite: true })), [ids]); // eslint-disable-line react-hooks/exhaustive-deps
    const slots = useRef([]);
    const timer = useRef(0);
    const lastTouch = useRef(0);
    useEffect(() => () => clearTimeout(timer.current), []);

    // the show: one move after another, passed along the row, only while the row is on screen and nobody is using it
    useEffect(() => {
        if (still || mode !== '3d') return undefined;
        let alive = true;
        let pending = 0;
        const sleep = (ms) => new Promise((resolve) => { pending = setTimeout(resolve, ms); });
        (async () => {
            let turn = 0;
            await sleep(1200);
            while (alive) {
                if (!bots[0]?.visible || document.hidden || performance.now() - lastTouch.current < 2500) { await sleep(600); continue; }
                const move = MOVES[SHOW[turn % SHOW.length]];
                turn += 1;
                for (let k = 0; k < bots.length && alive; k += 1) {
                    bots[k].exec(move.run);
                    await sleep(move.stagger * 1000);
                }
                await sleep(move.length * 1000 + 1100);
            }
        })();
        return () => { alive = false; clearTimeout(pending); };
    }, [bots, still, mode]);

    const items = useMemo(() => agents.map((a, i) => ({ bot: bots[i], finish: a.finish, held: null, p: null, detail: 'lo', getEl: () => slots.current[i] })), [bots]); // eslint-disable-line react-hooks/exhaustive-deps
    const layout = useMemo(() => (host) => {
        const hr = host.getBoundingClientRect();
        return slots.current.map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.left - hr.left + r.width / 2, ground: r.bottom - hr.top - 3, scale: (r.height * 0.95) / 273, k: 1 };
        });
    }, []);

    const wave = (i) => {
        lastTouch.current = performance.now();
        const d = bots[i];
        if (still || (d.run && !d.run.idle)) return;
        d.exec(async (x) => { await x.hello(); });
    };
    const open = (e, i, path) => {
        lastTouch.current = performance.now();
        if (still || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        bots[i].exec(async (x) => { await x.hop(1.15, 0.3); });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => navigate(path), 260);
    };

    return (
        <div className="bot-launch-row">
            {agents.map((a, i) => (
                <Link key={a.key} to={a.path} className="bot-launch-item" onMouseEnter={() => wave(i)} onFocus={() => wave(i)} onClick={(e) => open(e, i, a.path)}>
                    <span className="bot-launch-slot" ref={(el) => { slots.current[i] = el; }}>
                        {mode === 'off' && <BotIcon size={44} color={FINISHES[a.finish]?.accent} aria-hidden="true" />}
                    </span>
                    <span className="bot-launch-name">{agentShortName(a)}</span>
                </Link>
            ))}
            {mode === '3d' && <RobotLayer key={ids} items={items} layout={layout} pixelRatioCap={1.75} onFail={() => setMode('off')} />}
        </div>
    );
};

const AgentLauncher = () => (
    <div className="bot-launch">
        <div className="bot-launch-head">
            <div className="bot-launch-title-row">
                <span className="bot-launch-title">AI Learning Agents</span>
                <span className="bot-launch-new">NEW</span>
            </div>
            <span className="bot-launch-sub">{LEARNING_AGENTS.length} frameworks · Quiz-based learning for each</span>
        </div>
        <AgentRow agents={LEARNING_AGENTS} />
    </div>
);

export default AgentLauncher;
