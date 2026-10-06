import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Home, ListChecks, Trophy, Target } from 'lucide-react';
import BotMascot from '../components/agents/BotMascot';
import { LEARNING_AGENTS, getAgentBySlug, agentShortName } from '../config/agents';
import NotFound from './NotFound';

// "Coming soon" landing for the Learning Agents. Every agent link on the
// Framework page points at /agents/<slug>; until an agent's real page exists
// it lands here. Visual language is lifted from the Framework hero (navy
// gradient, gold accents, translucent glass tiles) so it reads as part of the
// same product rather than a stray placeholder.
const GOLD = '#f9a825';

// Fixed positions (not Math.random) so the sparkles don't jump on re-render.
const SPARKLES = [
    { x: 12, size: 4, delay: 0, dur: 7 },
    { x: 24, size: 6, delay: 2.2, dur: 8.5 },
    { x: 36, size: 3, delay: 4.1, dur: 6.5 },
    { x: 48, size: 5, delay: 1.1, dur: 9 },
    { x: 60, size: 4, delay: 3.3, dur: 7.5 },
    { x: 71, size: 6, delay: 0.6, dur: 8 },
    { x: 82, size: 3, delay: 5.2, dur: 6.8 },
    { x: 90, size: 5, delay: 2.8, dur: 9.2 },
];

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
        <div className="cs-root" style={{ '--cs-glow': agent.glow }}>
            <style>{`
                @keyframes csFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
                @keyframes csDrop { 0% { opacity: 0; transform: translateY(-46px) scale(0.88); } 100% { opacity: 1; transform: none; } }
                @keyframes csEyeOn { 0% { opacity: 0; transform: scaleY(0.1); } 60% { opacity: 1; transform: scaleY(1.25); } 100% { opacity: 1; transform: scaleY(1); } }
                @keyframes csSpin { to { transform: rotate(360deg); } }
                @keyframes csPulse { 0%,100% { opacity: 0.55; transform: scale(0.94); } 50% { opacity: 1; transform: scale(1.04); } }
                @keyframes csPing { 0% { opacity: 0.85; transform: translate(-50%, -50%) scale(0.2); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(3.2); } }
                @keyframes csChip { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-10px) rotate(3deg); } }
                @keyframes csRise { 0% { opacity: 0; transform: translateY(0) scale(0.6); } 15% { opacity: 0.95; } 100% { opacity: 0; transform: translateY(var(--cs-rise)) scale(1); } }
                @keyframes csSweep { 0% { transform: translateX(-110%); } 100% { transform: translateX(300%); } }
                @keyframes csMsg { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
                @keyframes csDot { 0%,100% { opacity: 0.45; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.15); } }

                .cs-root { font-family: var(--font-sans, 'Inter', sans-serif); background: #002244; }
                .cs-hero { position: relative; overflow: hidden; min-height: 78vh; display: flex; align-items: center; background: linear-gradient(135deg,#002244 0%,#003366 55%,#005599 100%); padding: clamp(2rem,5vw,4rem) clamp(1rem,7vw,6rem); }
                .cs-hero::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px); background-size: 28px 28px; -webkit-mask-image: radial-gradient(ellipse at 70% 40%, #000 0%, transparent 70%); mask-image: radial-gradient(ellipse at 70% 40%, #000 0%, transparent 70%); pointer-events: none; }
                .cs-orb { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.04); pointer-events: none; }
                .cs-inner { position: relative; z-index: 1; width: 100%; max-width: 1320px; margin: 0 auto; }

                .cs-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.5rem; align-items: center; }
                .cs-stage-col { order: -1; }
                @media (min-width: 900px) {
                    .cs-grid { grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr); gap: 3rem; }
                    .cs-stage-col { order: 0; }
                }

                /* ── Copy column ── */
                .cs-copy > * { animation: csFadeUp 0.6s ease both; }
                .cs-copy > *:nth-child(2) { animation-delay: 0.08s; }
                .cs-copy > *:nth-child(3) { animation-delay: 0.16s; }
                .cs-copy > *:nth-child(4) { animation-delay: 0.24s; }
                .cs-copy > *:nth-child(5) { animation-delay: 0.32s; }
                .cs-copy > *:nth-child(6) { animation-delay: 0.4s; }
                .cs-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(249,168,37,0.15); border: 1px solid rgba(249,168,37,0.35); color: ${GOLD}; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 6px 13px; border-radius: 5px; margin-bottom: 16px; }
                .cs-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: ${GOLD}; box-shadow: 0 0 8px ${GOLD}; animation: csDot 1.6s ease-in-out infinite; }
                .cs-title { color: white; font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 800; line-height: 1.1; margin: 0 0 14px; letter-spacing: -0.02em; font-family: var(--font-serif, Georgia, serif); }
                .cs-lede { color: #CBD5E1; font-size: clamp(0.95rem, 1.6vw, 1.08rem); line-height: 1.7; margin: 0 0 22px; max-width: 540px; }

                .cs-progress { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px 18px 16px; max-width: 460px; margin-bottom: 20px; }
                .cs-progress-head { display: flex; align-items: center; gap: 10px; margin-bottom: 11px; min-height: 1.4em; }
                .cs-progress-label { flex-shrink: 0; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: ${GOLD}; }
                .cs-progress-msg { min-width: 0; flex: 1; font-size: 0.85rem; color: #E2E8F0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; animation: csMsg 0.4s ease both; }
                .cs-bar { position: relative; height: 6px; border-radius: 99px; background: rgba(255,255,255,0.1); overflow: hidden; }
                .cs-bar-fill { position: absolute; top: 0; bottom: 0; left: 0; width: 34%; border-radius: 99px; background: linear-gradient(90deg, rgba(249,168,37,0), ${GOLD} 55%, #FDE68A); box-shadow: 0 0 12px rgba(249,168,37,0.6); animation: csSweep 2.2s ease-in-out infinite; }

                .cs-chips { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 26px; }
                .cs-chip-tag { display: inline-flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); color: #E2E8F0; font-size: 0.8rem; font-weight: 600; padding: 7px 13px; border-radius: 99px; transition: transform 0.18s, background 0.18s; }
                .cs-chip-tag:hover { transform: translateY(-3px); background: rgba(255,255,255,0.12); }
                .cs-chip-tag svg { color: ${GOLD}; flex-shrink: 0; }

                .cs-actions { display: flex; flex-wrap: wrap; gap: 12px; }
                .cs-btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 22px; border-radius: 8px; font-weight: 700; font-size: 0.88rem; text-decoration: none; transition: transform 0.18s, background 0.18s, border-color 0.18s, box-shadow 0.18s; }
                .cs-btn:hover { transform: translateY(-2px); }
                .cs-btn-primary { background: ${GOLD}; color: #003366; border: 1px solid ${GOLD}; }
                .cs-btn-primary:hover { box-shadow: 0 6px 18px rgba(249,168,37,0.35); }
                .cs-btn-ghost { background: rgba(255,255,255,0.06); color: white; border: 1px solid rgba(255,255,255,0.28); }
                .cs-btn-ghost:hover { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.5); }
                .cs-btn:focus-visible, .cs-other:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 3px; }

                /* ── Animated stage ── */
                .cs-stage { --cs-rise: -420px; position: relative; width: min(100%, 440px); aspect-ratio: 1; margin: 0 auto; display: flex; align-items: center; justify-content: center; }
                .cs-glow { position: absolute; inset: 14%; border-radius: 50%; background: radial-gradient(circle, rgba(147,197,253,0.32) 0%, transparent 68%); background: radial-gradient(circle, color-mix(in srgb, var(--cs-glow) 40%, transparent) 0%, transparent 68%); animation: csPulse 3.4s ease-in-out infinite; }
                .cs-ring { position: absolute; border-radius: 50%; border: 1px solid rgba(255,255,255,0.16); }
                .cs-ring::before { content: ''; position: absolute; top: -5px; left: 50%; width: 10px; height: 10px; margin-left: -5px; border-radius: 50%; background: var(--dot); box-shadow: 0 0 14px 3px var(--dot); }
                .cs-ring-1 { inset: 20%; --dot: var(--cs-glow); animation: csSpin 16s linear infinite; }
                .cs-ring-2 { inset: 9%; --dot: ${GOLD}; border-style: dashed; border-color: rgba(255,255,255,0.14); animation: csSpin 26s linear infinite reverse; }
                .cs-ring-2::before { width: 8px; height: 8px; top: -4px; margin-left: -4px; }
                .cs-ring-3 { inset: 0; --dot: rgba(255,255,255,0.9); border-color: rgba(255,255,255,0.08); animation: csSpin 44s linear infinite; }
                .cs-ring-3::before { width: 6px; height: 6px; top: -3px; margin-left: -3px; box-shadow: 0 0 10px 2px var(--dot); }
                .cs-floor { position: absolute; top: calc(50% + 96px); left: 50%; width: 190px; height: 22px; margin-left: -95px; border-radius: 50%; background: radial-gradient(ellipse, rgba(147,197,253,0.45) 0%, transparent 70%); background: radial-gradient(ellipse, color-mix(in srgb, var(--cs-glow) 55%, transparent) 0%, transparent 70%); animation: csPulse 3.4s ease-in-out infinite; }
                .cs-bot { position: relative; z-index: 2; animation: csDrop 0.9s cubic-bezier(0.2, 0.9, 0.3, 1.2) both; }
                .cs-stage .bot-mascot-eye { animation: csEyeOn 0.8s 0.7s ease-out both, botEyeBlink 3.4s 1.6s ease-in-out infinite; }
                .cs-ping { position: absolute; top: 3px; left: 50%; width: 22px; height: 22px; margin-left: -11px; pointer-events: none; }
                .cs-ping::before, .cs-ping::after { content: ''; position: absolute; top: 50%; left: 50%; width: 100%; height: 100%; border-radius: 50%; border: 2px solid var(--cs-glow); opacity: 0; animation: csPing 2.6s ease-out infinite; }
                .cs-ping::after { animation-delay: 1.3s; }
                .cs-float { position: absolute; z-index: 3; width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.22); color: ${GOLD}; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); box-shadow: 0 8px 20px rgba(0,10,30,0.3); animation: csChip 5s ease-in-out infinite; }
                .cs-sparkles { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
                .cs-sparkle { position: absolute; bottom: 0; border-radius: 50%; opacity: 0; animation: csRise linear infinite; }

                /* ── Other agents ── */
                .cs-others { margin-top: clamp(2rem, 5vw, 3.25rem); padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.12); animation: csFadeUp 0.6s 0.5s ease both; }
                .cs-others-head { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #94A3B8; margin-bottom: 14px; }
                .cs-others-row { display: flex; flex-wrap: wrap; gap: 14px 22px; }
                .cs-other { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 96px; text-decoration: none; transition: transform 0.18s; }
                .cs-other:hover { transform: translateY(-5px); }
                .cs-other .bot-mascot { transition: transform 0.2s; }
                .cs-other:hover .bot-mascot { animation-play-state: paused; transform: scale(1.1); }
                .cs-other-name { font-size: 0.74rem; font-weight: 700; color: #E2E8F0; text-align: center; line-height: 1.3; transition: color 0.18s; }
                .cs-other:hover .cs-other-name { color: ${GOLD}; }

                @media (max-width: 520px) {
                    .cs-stage { --cs-rise: -300px; }
                    .cs-float { width: 40px; height: 40px; border-radius: 12px; }
                    .cs-other { width: 78px; }
                    .cs-other-name { font-size: 0.68rem; }
                }

                @media (prefers-reduced-motion: reduce) {
                    .cs-root *, .cs-root *::before, .cs-root *::after { animation: none !important; transition: none !important; }
                    .cs-sparkles { display: none; }
                }
            `}</style>

            <section className="cs-hero">
                <div className="cs-orb" style={{ top: '-80px', right: '-80px', width: '360px', height: '360px' }} />
                <div className="cs-orb" style={{ bottom: '-60px', left: '-60px', width: '260px', height: '260px', background: 'rgba(255,255,255,0.03)' }} />

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
                            <div className="cs-stage" aria-hidden="true">
                                <div className="cs-glow" />
                                <div className="cs-ring cs-ring-3" />
                                <div className="cs-ring cs-ring-2" />
                                <div className="cs-ring cs-ring-1" />
                                <div className="cs-floor" />
                                <div className="cs-sparkles">
                                    {SPARKLES.map((s, i) => (
                                        <i key={i} className="cs-sparkle" style={{ left: `${s.x}%`, width: s.size, height: s.size, background: i % 3 === 0 ? GOLD : '#fff', boxShadow: `0 0 8px ${i % 3 === 0 ? GOLD : 'rgba(255,255,255,0.8)'}`, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />
                                    ))}
                                </div>
                                <div className="cs-bot">
                                    <span className="cs-ping" />
                                    <BotMascot size={160} accent={agent.glow} />
                                </div>
                                <span className="cs-float" style={{ top: '10%', left: '6%' }}><Trophy size={20} /></span>
                                <span className="cs-float" style={{ top: '27%', right: '3%', animationDelay: '-1.7s' }}><ListChecks size={20} /></span>
                                <span className="cs-float" style={{ bottom: '15%', left: '4%', animationDelay: '-3.2s' }}><Target size={20} /></span>
                            </div>
                        </div>
                    </div>

                    <div className="cs-others">
                        <div className="cs-others-head">Other agents on the way</div>
                        <div className="cs-others-row">
                            {others.map((a, i) => (
                                <Link key={a.key} to={a.path} className="cs-other">
                                    <BotMascot size={52} accent={a.glow} style={{ animationDelay: `${i * -0.6}s` }} />
                                    <span className="cs-other-name">{agentShortName(a)}</span>
                                </Link>
                            ))}
                        </div>
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
