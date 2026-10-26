import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Home, ListChecks, Trophy, Target } from 'lucide-react';
import AgentHeroStage from '../components/agents/robot/AgentHeroStage';
import { AgentRow } from '../components/agents/robot/AgentLauncher';
import { LEARNING_AGENTS, getAgentBySlug, agentShortName } from '../config/agents';
import NotFound from './NotFound';

// "Coming soon" landing for the Learning Agents. Every agent link on the
// Framework page points at /agents/<slug>; until an agent's real page exists
// it lands here. Visual language is lifted from the Framework hero (navy
// gradient, gold accents, translucent glass tiles) so it reads as part of the
// same product rather than a stray placeholder. The agent itself is a robot
// that performs on a small set of its own (components/agents/robot).
const GOLD = '#f9a825';

const EXPECT = (short) => [
    { icon: ListChecks, label: 'Quiz-based learning' },
    { icon: Trophy, label: 'Gamified modules' },
    { icon: Target, label: `Scoped to ${short}` },
];

const AgentComingSoonView = ({ agent }) => {
    const short = agentShortName(agent);
    const others = LEARNING_AGENTS.filter(a => a.slug !== agent.slug);
    const statusLines = useMemo(() => [
        `Booting up the ${short} agent…`,
        `Preparing ${short} quizzes…`,
        'Building gamified learning modules…',
        'Running final checks…',
    ], [short]);
    const [lineIdx, setLineIdx] = useState(0);

    useEffect(() => { document.title = `${agent.name} — Coming Soon | Risk AI Council`; }, [agent.name]);

    useEffect(() => {
        const id = setInterval(() => setLineIdx(i => (i + 1) % statusLines.length), 2600);
        return () => clearInterval(id);
    }, [statusLines.length]);

    return (
        <div className="cs-root">
            <style>{`
                @keyframes csFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
                @keyframes csSweep { 0% { transform: translateX(-110%); } 100% { transform: translateX(300%); } }
                @keyframes csMsg { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
                @keyframes csDot { 0%,100% { opacity: 0.45; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.15); } }

                .cs-root { font-family: var(--font-sans, 'Inter', sans-serif); background: #002244; }
                .cs-hero { position: relative; overflow: hidden; display: flex; align-items: center; background: linear-gradient(135deg,#002244 0%,#003366 55%,#005599 100%); padding: clamp(1rem,2.2vw,1.6rem) clamp(1rem,4vw,3.5rem) clamp(1rem,2vw,1.4rem); }
                .cs-hero::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px); background-size: 28px 28px; -webkit-mask-image: radial-gradient(ellipse at 70% 40%, #000 0%, transparent 70%); mask-image: radial-gradient(ellipse at 70% 40%, #000 0%, transparent 70%); pointer-events: none; }
                .cs-inner { position: relative; z-index: 1; width: 100%; max-width: 1320px; margin: 0 auto; }

                .cs-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; align-items: center; }
                .cs-stage-col { order: -1; }
                @media (min-width: 900px) {
                    .cs-grid { grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr); gap: 1.75rem; }
                    .cs-stage-col { order: 0; }
                }

                /* ── Copy column ── */
                .cs-copy > * { animation: csFadeUp 0.6s ease both; }
                .cs-copy > *:nth-child(2) { animation-delay: 0.08s; }
                .cs-copy > *:nth-child(3) { animation-delay: 0.16s; }
                .cs-copy > *:nth-child(4) { animation-delay: 0.24s; }
                .cs-copy > *:nth-child(5) { animation-delay: 0.32s; }
                .cs-copy > *:nth-child(6) { animation-delay: 0.4s; }
                .cs-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(249,168,37,0.15); border: 1px solid rgba(249,168,37,0.35); color: ${GOLD}; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 5px 11px; border-radius: 5px; margin-bottom: 10px; }
                .cs-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: ${GOLD}; box-shadow: 0 0 8px ${GOLD}; animation: csDot 1.6s ease-in-out infinite; }
                .cs-title { color: white; font-size: clamp(1.6rem, 3.3vw, 2.45rem); font-weight: 800; line-height: 1.1; margin: 0 0 8px; letter-spacing: -0.02em; font-family: var(--font-serif, Georgia, serif); }
                .cs-lede { color: #CBD5E1; font-size: clamp(0.88rem, 1.3vw, 0.97rem); line-height: 1.55; margin: 0 0 12px; max-width: 470px; }

                .cs-progress { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 10px 14px 12px; max-width: 420px; margin-bottom: 12px; }
                .cs-progress-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; min-height: 1.3em; }
                .cs-progress-label { flex-shrink: 0; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: ${GOLD}; }
                .cs-progress-msg { min-width: 0; flex: 1; font-size: 0.85rem; color: #E2E8F0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; animation: csMsg 0.4s ease both; }
                .cs-bar { position: relative; height: 6px; border-radius: 99px; background: rgba(255,255,255,0.1); overflow: hidden; }
                .cs-bar-fill { position: absolute; top: 0; bottom: 0; left: 0; width: 34%; border-radius: 99px; background: linear-gradient(90deg, rgba(249,168,37,0), ${GOLD} 55%, #FDE68A); box-shadow: 0 0 12px rgba(249,168,37,0.6); animation: csSweep 2.2s ease-in-out infinite; }

                .cs-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
                .cs-chip-tag { display: inline-flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); color: #E2E8F0; font-size: 0.76rem; font-weight: 600; padding: 5px 11px; border-radius: 99px; transition: transform 0.18s, background 0.18s; }
                .cs-chip-tag:hover { transform: translateY(-3px); background: rgba(255,255,255,0.12); }
                .cs-chip-tag svg { color: ${GOLD}; flex-shrink: 0; }

                .cs-actions { display: flex; flex-wrap: wrap; gap: 10px; }
                .cs-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; text-decoration: none; transition: transform 0.18s, background 0.18s, border-color 0.18s, box-shadow 0.18s; }
                .cs-btn:hover { transform: translateY(-2px); }
                .cs-btn-primary { background: ${GOLD}; color: #003366; border: 1px solid ${GOLD}; }
                .cs-btn-primary:hover { box-shadow: 0 6px 18px rgba(249,168,37,0.35); }
                .cs-btn-ghost { background: rgba(255,255,255,0.06); color: white; border: 1px solid rgba(255,255,255,0.28); }
                .cs-btn-ghost:hover { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.5); }
                .cs-btn:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 3px; }

                /* ── Other agents ── */
                .cs-others { margin-top: clamp(0.9rem, 2vw, 1.3rem); padding-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.12); animation: csFadeUp 0.6s 0.5s ease both; }
                .cs-others-head { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #94A3B8; margin-bottom: 0; }
                .cs-others .bot-launch-row { max-width: 560px; }
                .cs-others .bot-launch-row { padding-top: 14px; gap: 2px 8px; }
                .cs-others .bot-launch-slot { width: 64px; }
                .cs-others .bot-launch-name { min-height: 0; font-size: 0.72rem; }
                .cs-others .bot-launch-item { padding-bottom: 2px; }

                .cs-others .bot-launch-item:focus-visible { outline-offset: 3px; }

                @media (max-width: 520px) {
                    .cs-others .bot-launch-slot { width: 62px; }
                    .cs-others .bot-launch-name { font-size: 0.68rem; }
                }

                @media (prefers-reduced-motion: reduce) {
                    .cs-root *, .cs-root *::before, .cs-root *::after { animation: none !important; transition: none !important; }
                }
            `}</style>

            <section className="cs-hero">
                <div className="cs-inner">
                    <div className="cs-grid">
                        <div className="cs-copy">
                            <span className="cs-badge"><span className="cs-badge-dot" />Coming Soon</span>
                            <h1 className="cs-title">{agent.name}</h1>
                            <p className="cs-lede">{agent.description} We&rsquo;re still building this agent &mdash; it will be live here soon.</p>

                            <div className="cs-progress" role="group" aria-label="Development status">
                                <div className="cs-progress-head">
                                    <span className="cs-progress-label">In development</span>
                                    <span className="cs-progress-msg" key={lineIdx} aria-hidden="true">{statusLines[lineIdx]}</span>
                                </div>
                                <div className="cs-bar" role="progressbar" aria-label="In development"><span className="cs-bar-fill" /></div>
                            </div>

                            <div className="cs-chips">
                                {EXPECT(short).map(({ icon: Icon, label }) => (
                                    <span key={label} className="cs-chip-tag"><Icon size={14} />{label}</span>
                                ))}
                            </div>

                            <div className="cs-actions">
                                <Link to="/framework" className="cs-btn cs-btn-primary"><ArrowLeft size={16} />Back to Framework</Link>
                                <Link to="/" className="cs-btn cs-btn-ghost"><Home size={16} />Go Home</Link>
                            </div>
                        </div>

                        <div className="cs-stage-col">
                            <AgentHeroStage agent={agent} />
                        </div>
                    </div>

                    <div className="cs-others">
                        <div className="cs-others-head">Other agents on the way</div>
                        <AgentRow agents={others} />
                    </div>
                </div>
            </section>
        </div>
    );
};

const AgentComingSoon = () => {
    const { agentSlug } = useParams();
    const agent = getAgentBySlug(agentSlug);
    // Unknown slug (typo, stale link) keeps the normal 404 instead of a
    // misleading "coming soon" for something that will never exist.
    if (!agent) return <NotFound />;
    // key: switching agents via the strip below remounts, so the status
    // message cycle and entrance animations restart for the new agent.
    return <AgentComingSoonView key={agent.slug} agent={agent} />;
};

export default AgentComingSoon;
