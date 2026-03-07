import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Globe, ChevronLeft, ChevronRight, X, ArrowRight,
    Calendar, MapPin, CheckCircle, Lock, AlertCircle,
    RefreshCw, Newspaper, Users, BookOpen, Award, Shield, Zap, Star, Target, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { useModal } from '../hooks/useModal.js';
import { getNews } from '../api/news.js';
import { getEvents } from '../api/events.js';
import { formatDate } from '../utils/dateFormatter.js';
import UpgradeModal from '../components/modals/UpgradeModal.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
// ─── Countdown helper ───────────────────────────────────────────────────
const getCountdown = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    if (diff <= 0) return 'Now';
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day away';
    return `${days} days away`;
};
// ─── Skeleton card ────────────────────────────────────────────────────────────
const SkeletonNewsCard = () => (
    <div
        style={{
            minWidth: '220px',
            width: 'calc(20% - 16px)',
            flex: '0 0 auto',
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
        }}
    >
        {[100, 60, 80].map((w, i) => (
            <div
                key={i}
                style={{
                    height: i === 0 ? '14px' : '10px',
                    width: `${w}%`,
                    background: '#E2E8F0',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                }}
            />
        ))}
    </div>
);

const SkeletonEventCard = () => (
    <div
        style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '1.25rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        }}
    >
        <div style={{ height: '14px', width: '40%', background: '#E2E8F0', borderRadius: '4px', marginBottom: '10px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '20px', width: '90%', background: '#E2E8F0', borderRadius: '4px', marginBottom: '8px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '12px', width: '60%', background: '#E2E8F0', borderRadius: '4px', marginBottom: '16px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '36px', width: '100%', background: '#E2E8F0', borderRadius: '6px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
    </div>
);

// ─── Category badge colour map ────────────────────────────────────────────────
const CATEGORY_COLORS = {
    webinar: { bg: '#EFF6FF', color: '#1D4ED8' },
    seminar: { bg: '#F0FDF4', color: '#16A34A' },
    workshop: { bg: '#FFFBEB', color: '#D97706' },
    podcast: { bg: '#FAF5FF', color: '#7C3AED' },
};

// ─── Home ─────────────────────────────────────────────────────────────────────
const Home = () => {
    const navigate = useNavigate();
    const { user, canDownloadFramework } = useAuth();
    const { showToast } = useToast();
    const upgradeModal = useModal();
    const featuredEventsRef = useRef(null);
    const carouselRef = useRef(null);
    const autoplayRef = useRef(null);
    const touchStart = useRef(null);
    const statsRef = useRef(null);
    const [statsVisible, setStatsVisible] = useState(false);
    const [counts, setCounts] = useState({ members: 0, events: 0, papers: 0, countries: 0 });
    const STAT_TARGETS = { members: 500, events: 50, papers: 120, countries: 40 };

    // News state
    const [news, setNews] = useState([]);
    const [newsLoading, setNewsLoading] = useState(true);
    const [newsError, setNewsError] = useState('');
    const [activeNewsIdx, setActiveNewsIdx] = useState(0);
    const [expandedNews, setExpandedNews] = useState(null);
    const [carouselPaused, setCarouselPaused] = useState(false);

    // Featured events state
    const [events, setEvents] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [eventsError, setEventsError] = useState('');

    // ── Fetch news ───────────────────────────────────────────────────────────
    const fetchNews = useCallback(async (signal) => {
        setNewsLoading(true);
        setNewsError('');
        try {
            const res = await getNews({ limit: 9 });
            if (!signal?.aborted) {
                setNews(res.data?.data || []);
            }
        } catch (err) {
            if (!signal?.aborted) setNewsError('Failed to load news.');
        } finally {
            if (!signal?.aborted) setNewsLoading(false);
        }
    }, []);

    // ── Fetch upcoming events (limit 3) ──────────────────────────────────────
    const fetchEvents = useCallback(async (signal) => {
        setEventsLoading(true);
        setEventsError('');
        try {
            const res = await getEvents({ tab: 'upcoming', limit: 3 });
            if (!signal?.aborted) {
                setEvents(res.data?.data?.events || res.data?.data || []);
            }
        } catch (err) {
            if (!signal?.aborted) setEventsError('Failed to load events.');
        } finally {
            if (!signal?.aborted) setEventsLoading(false);
        }
    }, []);

    useEffect(() => {
        const ctrl = new AbortController();
        fetchNews(ctrl.signal);
        fetchEvents(ctrl.signal);
        document.title = 'AI Risk Council | Governing AI Risk';
        return () => ctrl.abort();
    }, [fetchNews, fetchEvents]);

    // ── Auto-advance carousel every 5s ──────────────────────────────────────
    useEffect(() => {
        if (news.length === 0 || carouselPaused) return;
        autoplayRef.current = setInterval(() => {
            setActiveNewsIdx((prev) => (prev + 1) % news.length);
        }, 5000);
        return () => clearInterval(autoplayRef.current);
    }, [news.length, carouselPaused]);

    // ── Sync carousel scroll to activeNewsIdx ────────────────────────────────
    // Use scrollLeft on the container (not scrollIntoView) so only the
    // carousel scrolls horizontally — avoids page jumping on mount.
    useEffect(() => {
        if (!carouselRef.current || news.length === 0) return;
        const cards = carouselRef.current.querySelectorAll('[data-news-card]');
        if (cards[activeNewsIdx]) {
            carouselRef.current.scrollTo({
                left: cards[activeNewsIdx].offsetLeft,
                behavior: 'smooth',
            });
        }
    }, [activeNewsIdx, news.length]);

    const scrollCarousel = useCallback((dir) => {
        setActiveNewsIdx((prev) => {
            let next = prev + dir;
            if (next < 0) next = news.length - 1;
            if (next >= news.length) next = 0;
            return next;
        });
    }, [news.length]);

    // ── Touch swipe ─────────────────────────────────────────────────────────
    const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
        if (touchStart.current === null) return;
        const diff = touchStart.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) scrollCarousel(diff > 0 ? 1 : -1);
        touchStart.current = null;
    };

    const handleFrameworkCTA = () => {
        if (canDownloadFramework()) navigate('/resources');
        else upgradeModal.open();
    };

    const scrollToEvents = () => {
        featuredEventsRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // ── Stats counter (IntersectionObserver) ─────────────────────────────────
    useEffect(() => {
        if (!statsRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); observer.disconnect(); } },
            { threshold: 0.3 }
        );
        observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!statsVisible) return;
        const duration = 1800;
        const startTime = performance.now();
        const animate = (now) => {
            const p = Math.min((now - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setCounts({
                members: Math.round(ease * STAT_TARGETS.members),
                events: Math.round(ease * STAT_TARGETS.events),
                papers: Math.round(ease * STAT_TARGETS.papers),
                countries: Math.round(ease * STAT_TARGETS.countries),
            });
            if (p < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [statsVisible]);

    return (
        <>
            <style>{`
                @keyframes heroGradientShift {
                    0%   { background-position: 0% 50%; }
                    50%  { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                /* Aurora mesh blobs */
                @keyframes auroraFloat1 {
                    0%, 100% { transform: translate(0px,   0px)   scale(1);    }
                    33%      { transform: translate(40px, -30px)  scale(1.06); }
                    66%      { transform: translate(-20px, 35px)  scale(0.96); }
                }
                @keyframes auroraFloat2 {
                    0%, 100% { transform: translate(0px,  0px)    scale(1);    }
                    40%      { transform: translate(-35px, 20px)  scale(1.09); }
                    75%      { transform: translate(28px, -40px)  scale(0.93); }
                }
                @keyframes auroraFloat3 {
                    0%, 100% { transform: translate(0px, 0px)    scale(1);    }
                    50%      { transform: translate(22px, 28px)  scale(1.05); }
                }
                /* Radar ping */
                @keyframes radarPing {
                    0%   { transform: scale(0.15); opacity: 0.9; }
                    100% { transform: scale(5.5);  opacity: 0;   }
                }
                /* Diagonal scan beam with leading glow */
                @keyframes scanBeam {
                    0%   { transform: translateX(-120%) skewX(-15deg); opacity: 0; }
                    6%   { opacity: 1; }
                    94%  { opacity: 1; }
                    100% { transform: translateX(220%)  skewX(-15deg); opacity: 0; }
                }
                /* Floating nodes */
                @keyframes nodeFloat1 {
                    0%, 100% { transform: translate(0px,   0px);  }
                    40%      { transform: translate(10px, -16px); }
                    70%      { transform: translate(-8px,  10px); }
                }
                @keyframes nodeFloat2 {
                    0%, 100% { transform: translate(0px,  0px);  }
                    30%      { transform: translate(-12px, 14px); }
                    65%      { transform: translate(9px,  -9px); }
                }
                @keyframes nodeFloat3 {
                    0%, 100% { transform: translate(0px,  0px); }
                    50%      { transform: translate(14px, 12px); }
                }
                @keyframes nodePulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(147,197,253,0.7), 0 0 8px 3px rgba(100,180,255,0.4); }
                    50%      { box-shadow: 0 0 0 16px rgba(147,197,253,0), 0 0 14px 6px rgba(100,180,255,0.2); }
                }
                /* Dot matrix breathe */
                @keyframes dotMatrixFade {
                    0%, 100% { opacity: 0.055; }
                    50%      { opacity: 0.13;  }
                }
                /* Network SVG line draw */
                @keyframes lineFade {
                    0%, 100% { opacity: 0;    }
                    15%, 85% { opacity: 0.28; }
                }
                /* Horizon glow pulse */
                @keyframes horizonPulse {
                    0%, 100% { opacity: 0.35; }
                    50%      { opacity: 0.7;  }
                }
            `}</style>

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <div
                style={{
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '620px',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #000e22 0%, #001e4a 30%, #002d66 55%, #001429 80%, #000a18 100%)',
                    backgroundSize: '300% 300%',
                    animation: 'heroGradientShift 20s ease infinite',
                }}
            >
                {/* ── Aurora blob 1 — teal-blue, top-left ── */}
                <div style={{
                    position: 'absolute', top: '-15%', left: '-8%',
                    width: '600px', height: '600px', borderRadius: '50%',
                    background: 'radial-gradient(circle at 40% 40%, rgba(0,140,255,0.18) 0%, rgba(0,80,200,0.10) 40%, transparent 70%)',
                    pointerEvents: 'none',
                    animation: 'auroraFloat1 20s ease-in-out infinite',
                    filter: 'blur(2px)',
                }} />

                {/* ── Aurora blob 2 — deep cyan, bottom-right ── */}
                <div style={{
                    position: 'absolute', bottom: '-20%', right: '-5%',
                    width: '700px', height: '700px', borderRadius: '50%',
                    background: 'radial-gradient(circle at 60% 60%, rgba(0,180,255,0.14) 0%, rgba(0,100,220,0.08) 40%, transparent 65%)',
                    pointerEvents: 'none',
                    animation: 'auroraFloat2 26s ease-in-out infinite',
                    filter: 'blur(3px)',
                }} />

                {/* ── Aurora blob 3 — indigo accent, centre ── */}
                <div style={{
                    position: 'absolute', top: '25%', left: '38%',
                    width: '380px', height: '380px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(80,120,255,0.11) 0%, transparent 68%)',
                    pointerEvents: 'none',
                    animation: 'auroraFloat3 16s ease-in-out infinite',
                    filter: 'blur(1px)',
                }} />

                {/* ── Dot-matrix layer ── */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)',
                    backgroundSize: '38px 38px',
                    animation: 'dotMatrixFade 7s ease-in-out infinite',
                }} />

                {/* ── Radar ping rings ── */}
                {[0, 1.6, 3.2, 4.8].map((delay, i) => (
                    <div key={i} style={{
                        position: 'absolute', top: 'calc(14% + 28px)', right: 'calc(8% + 28px)',
                        width: '72px', height: '72px',
                        borderRadius: '50%',
                        border: `${i < 2 ? '1.5px' : '1px'} solid rgba(147,197,253,${i < 2 ? 0.6 : 0.35})`,
                        pointerEvents: 'none',
                        animation: `radarPing 6.4s ${delay}s ease-out infinite`,
                    }} />
                ))}

                {/* ── Radar centre dot ── */}
                <div style={{
                    position: 'absolute', top: '14%', right: '8%',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(220,240,255,1) 30%, rgba(147,197,253,0.7) 100%)',
                    boxShadow: '0 0 16px 6px rgba(147,197,253,0.55), 0 0 32px 12px rgba(100,160,255,0.2)',
                    pointerEvents: 'none',
                    animation: 'nodePulse 2.2s ease-in-out infinite',
                }} />

                {/* ── Scan beam — leading-edge brighter stripe ── */}
                <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '90px', height: '200%', pointerEvents: 'none',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(100,190,255,0.03) 30%, rgba(140,210,255,0.10) 55%, rgba(255,255,255,0.04) 65%, transparent 100%)',
                    animation: 'scanBeam 11s 1s ease-in-out infinite',
                }} />

                {/* ── Network SVG — connection lines between nodes ── */}
                <svg
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
                    viewBox="0 0 1000 620"
                    preserveAspectRatio="xMidYMid slice"
                >
                    <defs>
                        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgba(147,197,253,0)" />
                            <stop offset="50%" stopColor="rgba(147,197,253,0.5)" />
                            <stop offset="100%" stopColor="rgba(147,197,253,0)" />
                        </linearGradient>
                    </defs>
                    {/* A(480,112) → C(750,217) */}
                    <line x1="480" y1="112" x2="750" y2="217" stroke="url(#lineGrad)" strokeWidth="0.8" style={{ animation: 'lineFade 9s 0s ease-in-out infinite' }} />
                    {/* A(480,112) → B(550,372) */}
                    <line x1="480" y1="112" x2="550" y2="372" stroke="url(#lineGrad)" strokeWidth="0.8" style={{ animation: 'lineFade 9s 1.4s ease-in-out infinite' }} />
                    {/* B(550,372) → D(380,446) */}
                    <line x1="550" y1="372" x2="380" y2="446" stroke="url(#lineGrad)" strokeWidth="0.8" style={{ animation: 'lineFade 9s 2.8s ease-in-out infinite' }} />
                    {/* C(750,217) → E(900,155) */}
                    <line x1="750" y1="217" x2="900" y2="155" stroke="url(#lineGrad)" strokeWidth="0.8" style={{ animation: 'lineFade 9s 0.7s ease-in-out infinite' }} />
                    {/* C(750,217) → B(550,372) */}
                    <line x1="750" y1="217" x2="550" y2="372" stroke="url(#lineGrad)" strokeWidth="0.8" style={{ animation: 'lineFade 9s 2s ease-in-out infinite' }} />
                </svg>

                {/* ── Glowing network nodes ── */}
                {[
                    { top: '18%', left: '48%', size: 8,  delay: '0s',   anim: 'nodeFloat1 9s ease-in-out infinite' },
                    { top: '60%', left: '55%', size: 6,  delay: '1.2s', anim: 'nodeFloat2 11s ease-in-out infinite' },
                    { top: '35%', left: '75%', size: 7,  delay: '2.5s', anim: 'nodeFloat3 8s ease-in-out infinite' },
                    { top: '72%', left: '38%', size: 5,  delay: '0.8s', anim: 'nodeFloat1 13s ease-in-out infinite' },
                    { top: '25%', left: '90%', size: 6,  delay: '3s',   anim: 'nodeFloat2 7s ease-in-out infinite' },
                ].map((n, i) => (
                    <div key={i} style={{
                        position: 'absolute', top: n.top, left: n.left,
                        width: `${n.size}px`, height: `${n.size}px`,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(220,240,255,0.95) 20%, rgba(147,197,253,0.7) 100%)',
                        boxShadow: `0 0 ${n.size * 2}px ${n.size}px rgba(100,170,255,0.35)`,
                        pointerEvents: 'none',
                        animation: n.anim,
                        animationDelay: n.delay,
                    }} />
                ))}

                {/* ── Bottom horizon glow line ── */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: '2px', pointerEvents: 'none',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(100,180,255,0.5) 30%, rgba(147,197,253,0.8) 50%, rgba(100,180,255,0.5) 70%, transparent 100%)',
                    animation: 'horizonPulse 4s ease-in-out infinite',
                }} />

                <div className="container" style={{ position: 'relative', zIndex: 2, padding: '5rem 2rem', width: '100%' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
                        {/* Left: text */}
                        <div>
                            <h1
                                style={{
                                    color: 'white', marginBottom: '1.25rem', lineHeight: '1.1',
                                    fontSize: 'clamp(2.4rem, 5vw, 3.5rem)',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                                    letterSpacing: '-0.02em', fontFamily: 'var(--font-serif)',
                                }}
                            >
                                AI Security Insight Reports &amp; Assessments
                            </h1>
                            <p
                                style={{
                                    fontSize: '1.15rem', color: '#CBD5E1', marginBottom: '1.25rem',
                                    lineHeight: '1.75', maxWidth: '520px',
                                }}
                            >
                                We provide comprehensive insight reports and security assessments to help your organisation adopt Artificial Intelligence responsibly, utilising industry-leading frameworks.
                            </p>
                            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.5)', marginBottom: '2.25rem', lineHeight: '1.7', maxWidth: '480px' }}>
                                Trusted by governments, enterprises, and regulators across 40+ countries to navigate the evolving landscape of AI risk, compliance, and ethics.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => navigate('/membership')}
                                    style={{
                                        background: 'white', color: '#003366', border: 'none',
                                        padding: '0.9rem 2rem', fontSize: '0.95rem', fontWeight: '800',
                                        borderRadius: '6px', cursor: 'pointer',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                                        fontFamily: 'var(--font-sans)', transition: 'transform 0.15s, box-shadow 0.15s',
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'; }}
                                >
                                    Join the Council
                                </button>
                                <button
                                    onClick={() => navigate('/services')}
                                    style={{
                                        background: 'transparent', color: 'white',
                                        border: '1.5px solid rgba(255,255,255,0.45)',
                                        padding: '0.9rem 2rem', fontSize: '0.95rem', fontWeight: '700',
                                        borderRadius: '6px', cursor: 'pointer',
                                        fontFamily: 'var(--font-sans)', transition: 'border-color 0.15s, background 0.15s',
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                    Explore Our Services
                                </button>
                            </div>
                        </div>

                        {/* Right: glass info card */}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div
                                style={{
                                    width: '100%', maxWidth: '480px',
                                    backgroundColor: 'rgba(0,0,0,0.35)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '16px',
                                    backdropFilter: 'blur(16px)',
                                    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                                    padding: '2.5rem 2rem',
                                    display: 'flex', flexDirection: 'column', gap: '0',
                                }}
                            >
                                <p style={{ margin: '0 0 1.5rem', fontSize: '0.7rem', fontWeight: '700', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                    Trusted globally
                                </p>
                                {[
                                    { icon: CheckCircle, text: 'EU AI Act · NIST AI RMF · ISO 42001', sub: 'Framework aligned assessments' },
                                    { icon: Globe, text: '500+ global member organisations', sub: 'Across 40+ countries' },
                                    { icon: Lock, text: 'Independent · Zero vendor bias', sub: 'Cited by OECD, EU AI Office, NIST' },
                                ].map(({ icon: Icon, text, sub }, i, arr) => (
                                    <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', paddingBottom: i < arr.length - 1 ? '1.25rem' : 0, marginBottom: i < arr.length - 1 ? '1.25rem' : 0, borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Icon size={18} color="#93C5FD" />
                                        </div>
                                        <div>
                                            <p style={{ margin: '0 0 2px', color: 'white', fontSize: '0.88rem', fontWeight: '700' }}>{text}</p>
                                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Mission & Vision cards ───────────────────────────────────── */}
            <div style={{ background: '#F8FAFC', padding: '5rem 2rem', borderBottom: '1px solid #E8EDF3' }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        <div
                            style={{
                                background: 'white', borderRadius: '16px', padding: '2.5rem',
                                border: '1px solid #E2E8F0', borderTop: '4px solid #003366',
                                boxShadow: '0 2px 12px rgba(0,51,102,0.07)',
                            }}
                        >
                            <h2 style={{ fontSize: '1.4rem', color: '#003366', marginBottom: '0.85rem', fontWeight: '800' }}>Our Mission</h2>
                            <p style={{ color: '#4A5568', lineHeight: '1.8', fontSize: '1rem', marginBottom: '0.75rem' }}>
                                To empower organisations to deploy AI technology safely, ethically, and responsibly — providing comprehensive insight reports and security assessments to align with global frameworks.
                            </p>
                            <p style={{ color: '#64748B', lineHeight: '1.75', fontSize: '0.9rem', margin: 0 }}>
                                We translate complex regulatory obligations into clear, auditable actions that organisations of every size can act on.
                            </p>
                        </div>
                        <div
                            style={{
                                background: 'white', borderRadius: '16px', padding: '2.5rem',
                                border: '1px solid #E2E8F0', borderTop: '4px solid #f9a825',
                                boxShadow: '0 2px 12px rgba(0,51,102,0.07)',
                            }}
                        >
                            <h2 style={{ fontSize: '1.4rem', color: '#003366', marginBottom: '0.85rem', fontWeight: '800' }}>Our Vision</h2>
                            <p style={{ color: '#4A5568', lineHeight: '1.8', fontSize: '1rem', marginBottom: '0.75rem' }}>
                                A world where artificial intelligence systems are governed with the same rigour and accountability as financial markets — transparent, auditable, and aligned with societal values.
                            </p>
                            <p style={{ color: '#64748B', lineHeight: '1.75', fontSize: '0.9rem', margin: 0 }}>
                                An ecosystem where trust in AI is earned through evidence, not asserted through marketing.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Animated Stats Counter ───────────────────────────────────── */}
            <div ref={statsRef} style={{ background: 'linear-gradient(135deg, #001a33 0%, #003366 100%)', padding: '4rem 2rem' }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '2.5rem' }}>Our global reach at a glance</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem', textAlign: 'center' }}>
                        {[
                            { icon: Users,    label: 'Member Organisations', count: counts.members,  suffix: '+', sub: 'across all industries' },
                            { icon: Calendar, label: 'Events Hosted',         count: counts.events,   suffix: '+', sub: 'annually worldwide' },
                            { icon: BookOpen, label: 'Research Papers',        count: counts.papers,   suffix: '+', sub: 'peer-reviewed publications' },
                            { icon: Globe,    label: 'Countries Represented',  count: counts.countries,suffix: '+', sub: 'on six continents' },
                        ].map(({ icon: Icon, label, count, suffix, sub }) => (
                            <div key={label}>
                                <Icon size={28} color="#f9a825" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                                <div style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                                    {count}{suffix}
                                </div>
                                <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#93C5FD', fontWeight: '600' }}>{label}</p>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── About Teaser ─────────────────────────────────────────────── */}
            <div style={{ background: '#F8FAFC', padding: '4rem 2rem', borderBottom: '1px solid #E8EDF3' }}>
                <div className="container" style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', background: '#EFF6FF', color: '#003366', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.35rem 1rem', borderRadius: '100px', marginBottom: '1.25rem' }}>Who We Are</span>
                    <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#1E293B', fontWeight: '800', marginBottom: '1rem', lineHeight: 1.3 }}>
                        About the AI Risk Council
                    </h2>
                    <p style={{ color: '#4A5568', lineHeight: '1.8', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto 2rem' }}>
                        An independent, not-for-profit authority comprising governance experts, legal scholars, and AI researchers from over 40 countries — operating without vendor affiliation to deliver unbiased, actionable guidance.
                    </p>
                    <Link to="/about" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#003366', color: 'white', padding: '0.85rem 1.75rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', textDecoration: 'none' }}>
                        Learn More About Us <ArrowRight size={15} />
                    </Link>
                </div>
            </div>

            {/* ── Why Join Us ──────────────────────────────────────────────── */}
            <div style={{ background: '#F8FAFC', padding: '5rem 2rem', borderBottom: '1px solid #E8EDF3' }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', color: '#1E293B', fontWeight: '800', margin: '0 0 0.75rem' }}>Why Join the Council?</h2>
                        <p style={{ color: '#64748B', fontSize: '1rem', maxWidth: '580px', margin: '0 auto' }}>A global community built for practitioners who care about getting AI governance right — with access to tools, intelligence, and peers that you won't find anywhere else.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                        {[
                            { icon: BookOpen, color: '#003366', title: 'Exclusive Research', desc: 'Access 120+ peer-reviewed reports, audit templates, and risk frameworks unavailable elsewhere. New publications added monthly.' },
                            { icon: Users, color: '#7C3AED', title: 'Peer Network', desc: 'Connect with 500+ risk professionals, legal experts, and AI leaders across 40 countries — through forums, roundtables, and direct introductions.' },
                            { icon: Zap, color: '#D97706', title: 'Stay Ahead', desc: 'Receive early-access briefings on upcoming regulations, including EU AI Act enforcement updates and NIST AI RMF revisions.' },
                            { icon: Star, color: '#0369A1', title: 'Priority Access', desc: 'Skip the waitlist for workshops, advisory sessions, and premier annual summit seats. Members get first-look at every new resource.' },
                        ].map(({ icon: Icon, color, title, desc }) => (
                            <div key={title}
                                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
                                onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
                                style={{ background: 'white', borderRadius: '16px', padding: '2rem', border: '1px solid #E2E8F0', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                    <Icon size={20} color={color} />
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem', fontWeight: '700', color: '#1E293B', fontSize: '1rem' }}>{title}</h3>
                                <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem', lineHeight: '1.6' }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                        <Link to="/membership" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#003366', color: 'white', padding: '0.9rem 2rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.95rem', textDecoration: 'none' }}>
                            Join the Council <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── News Carousel ────────────────────────────────────────────── */}
            <div style={{ background: 'white', padding: '4rem 2rem', borderTop: '1px solid #F1F5F9' }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', color: '#1A202C', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <Globe size={22} color="#003366" /> Latest News
                        </h2>
                        {!newsLoading && news.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    onClick={() => scrollCarousel(-1)}
                                    aria-label="Previous news"
                                    style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', transition: 'transform 0.15s' }}
                                    onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                                    onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                >
                                    <ChevronLeft size={18} color="#1A202C" />
                                </button>
                                <button
                                    onClick={() => scrollCarousel(1)}
                                    aria-label="Next news"
                                    style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', transition: 'transform 0.15s' }}
                                    onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                                    onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                >
                                    <ChevronRight size={18} color="#1A202C" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Loading */}
                    {newsLoading && (
                        <div style={{ display: 'flex', gap: '16px', overflow: 'hidden' }}>
                            {[1, 2, 3].map((i) => <SkeletonNewsCard key={i} />)}
                        </div>
                    )}

                    {/* Error */}
                    {newsError && !newsLoading && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#EF4444' }}>
                            <AlertCircle size={32} style={{ marginBottom: '0.75rem', opacity: 0.6 }} />
                            <p style={{ marginBottom: '1rem' }}>{newsError}</p>
                            <button
                                onClick={() => fetchNews()}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                            >
                                <RefreshCw size={14} /> Try Again
                            </button>
                        </div>
                    )}

                    {/* Empty */}
                    {!newsLoading && !newsError && news.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#94A3B8', padding: '3rem 0' }}>No news available yet.</p>
                    )}

                    {/* Carousel */}
                    {!newsLoading && !newsError && news.length > 0 && (
                        <>
                            <div
                                ref={carouselRef}
                                onMouseEnter={() => setCarouselPaused(true)}
                                onMouseLeave={() => setCarouselPaused(false)}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                                style={{
                                    display: 'flex',
                                    overflowX: 'auto',
                                    gap: '16px',
                                    paddingBottom: '4px',
                                    scrollSnapType: 'x mandatory',
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none',
                                }}
                                aria-live="polite"
                                aria-label="News carousel"
                            >
                                {news.map((item, idx) => (
                                    <div
                                        key={item.id}
                                        data-news-card="true"
                                        style={{
                                            minWidth: '240px',
                                            flex: '0 0 auto',
                                            scrollSnapAlign: 'start',
                                            background: 'white',
                                            border: `1px solid ${idx === activeNewsIdx ? '#003366' : '#E2E8F0'}`,
                                            borderRadius: '12px',
                                            padding: '16px',
                                            boxShadow: idx === activeNewsIdx ? '0 4px 20px rgba(0,51,102,0.1)' : '0 2px 6px rgba(0,0,0,0.04)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            transition: 'border-color 0.2s, box-shadow 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ background: '#EFF6FF', color: '#003366', padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700' }}>
                                                {item.source || 'News'}
                                            </span>
                                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                                                {formatDate ? formatDate(item.published_at || item.created_at) : new Date(item.published_at || item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <h3
                                            style={{
                                                fontSize: '0.95rem', fontWeight: '700', color: '#1A202C',
                                                marginBottom: '8px', lineHeight: '1.4',
                                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                            }}
                                        >
                                            {item.title}
                                        </h3>
                                        <p
                                            style={{
                                                fontSize: '0.82rem', color: '#4A5568', lineHeight: '1.6',
                                                flexGrow: 1, marginBottom: '12px',
                                                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                            }}
                                        >
                                            {(item.summary || '').slice(0, 100)}{(item.summary || '').length > 100 ? '…' : ''}
                                        </p>
                                        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                                            {(item.link || item.article_url) ? (
                                                <a
                                                    href={item.article_url || item.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        gap: '6px', background: '#F8FAFC', color: '#003366',
                                                        border: '1px solid #E2E8F0', padding: '6px 12px',
                                                        borderRadius: '6px', fontWeight: '600', fontSize: '0.78rem',
                                                        textDecoration: 'none', transition: 'all 0.15s',
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = '#003366'; e.currentTarget.style.color = 'white'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#003366'; }}
                                                >
                                                    Read More <ChevronRight size={13} />
                                                </a>
                                            ) : (
                                                <button
                                                    onClick={() => setExpandedNews(item)}
                                                    style={{
                                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        gap: '6px', background: '#F8FAFC', color: '#003366',
                                                        border: '1px solid #E2E8F0', padding: '6px 12px',
                                                        borderRadius: '6px', fontWeight: '600', fontSize: '0.78rem',
                                                        cursor: 'pointer', transition: 'all 0.15s',
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = '#003366'; e.currentTarget.style.color = 'white'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#003366'; }}
                                                >
                                                    Read More <ChevronRight size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Dot indicators */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '1rem' }}>
                                {news.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveNewsIdx(idx)}
                                        aria-label={`Go to news item ${idx + 1}`}
                                        style={{
                                            width: idx === activeNewsIdx ? '20px' : '8px',
                                            height: '8px',
                                            borderRadius: '4px',
                                            background: idx === activeNewsIdx ? '#003366' : '#CBD5E1',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            padding: 0,
                                        }}
                                    />
                                ))}
                            </div>

                            {/* See All News Button */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                                <a
                                    href="/news"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px 28px',
                                        background: '#003366',
                                        color: 'white',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        textDecoration: 'none',
                                        boxShadow: '0 4px 12px rgba(0, 51, 102, 0.2)',
                                        transition: 'all 0.3s ease',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = '#002244';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 51, 102, 0.3)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = '#003366';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 51, 102, 0.2)';
                                    }}
                                >
                                    <Globe size={18} />
                                    View All News & Updates
                                    <ChevronRight size={18} />
                                </a>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Featured Upcoming Events ─────────────────────────────────── */}
            <div
                id="featured-events"
                ref={featuredEventsRef}
                style={{ background: '#F0F5FF', padding: '5rem 2rem', borderTop: '1px solid #DBEAFE', borderBottom: '1px solid #DBEAFE' }}
            >
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.75rem', color: '#1A202C', margin: 0 }}>Upcoming Events</h2>
                            <p style={{ color: '#64748B', margin: '4px 0 0', fontSize: '0.9rem' }}>Webinars, seminars & workshops for risk professionals</p>
                        </div>
                        <Link
                            to="/events"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                color: '#003366', fontWeight: '700', textDecoration: 'none',
                                fontSize: '0.875rem', border: '1.5px solid #003366',
                                padding: '0.5rem 1rem', borderRadius: '6px', transition: 'all 0.15s',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#003366'; e.currentTarget.style.color = 'white'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#003366'; }}
                        >
                            View All Events <ArrowRight size={14} />
                        </Link>
                    </div>

                    {/* Loading */}
                    {eventsLoading && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {[1, 2, 3].map((i) => <SkeletonEventCard key={i} />)}
                        </div>
                    )}

                    {/* Error */}
                    {eventsError && !eventsLoading && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#EF4444' }}>
                            <AlertCircle size={32} style={{ marginBottom: '0.75rem', opacity: 0.6 }} />
                            <p style={{ marginBottom: '1rem' }}>{eventsError}</p>
                            <button
                                onClick={() => fetchEvents()}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                            >
                                <RefreshCw size={14} /> Try Again
                            </button>
                        </div>
                    )}

                    {/* Empty */}
                    {!eventsLoading && !eventsError && events.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                            <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p style={{ fontSize: '1.05rem' }}>No upcoming events at this time.</p>
                            <Link to="/events" style={{ color: '#003366', fontWeight: '600', textDecoration: 'none' }}>Browse past events →</Link>
                        </div>
                    )}

                    {/* Event cards */}
                    {!eventsLoading && !eventsError && events.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {events.map((ev) => {
                                const cat = (ev.event_category || '').toLowerCase();
                                const colors = CATEGORY_COLORS[cat] || { bg: '#F1F5F9', color: '#64748B' };
                                return (
                                    <div
                                        key={ev.id}
                                        style={{
                                            background: 'white', borderRadius: '12px',
                                            border: '1px solid #E2E8F0', padding: '1.5rem',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                                            display: 'flex', flexDirection: 'column',
                                            transition: 'box-shadow 0.2s, transform 0.2s',
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,51,102,0.12)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        <span
                                            style={{
                                                alignSelf: 'flex-start', background: colors.bg, color: colors.color,
                                                border: `1px solid ${colors.color}22`, fontSize: '0.72rem',
                                                fontWeight: '700', padding: '3px 10px', borderRadius: '20px', marginBottom: '0.75rem',
                                            }}
                                        >
                                            {ev.event_category}
                                        </span>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1E293B', marginBottom: '0.5rem', lineHeight: '1.4', flexGrow: 1 }}>
                                            {ev.title}
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748B' }}>
                                                <Calendar size={13} color={colors.color} />
                                                {formatDate ? formatDate(ev.date) : new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                {getCountdown(ev.date) && (
                                                    <span style={{ marginLeft: '4px', background: '#DBEAFE', color: '#1D4ED8', fontSize: '0.65rem', fontWeight: '700', padding: '2px 7px', borderRadius: '100px' }}>
                                                        {getCountdown(ev.date)}
                                                    </span>
                                                )}
                                            </span>
                                            {ev.location && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748B' }}>
                                                    <MapPin size={13} color={colors.color} /> {ev.location}
                                                </span>
                                            )}
                                        </div>
                                        {ev.link ? (
                                            <a
                                                href={ev.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    gap: '6px', background: '#003366', color: 'white',
                                                    padding: '0.6rem 1rem', borderRadius: '6px',
                                                    fontWeight: '700', fontSize: '0.82rem', textDecoration: 'none',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseOver={(e) => (e.currentTarget.style.background = '#00509E')}
                                                onMouseOut={(e) => (e.currentTarget.style.background = '#003366')}
                                            >
                                                Register Now <ArrowRight size={13} />
                                            </a>
                                        ) : (
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.6rem 1rem', background: '#F1F5F9', color: '#94A3B8', borderRadius: '6px', fontWeight: '600', fontSize: '0.82rem' }}>
                                                Registration TBD
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Membership CTA ───────────────────────────────────────────── */}
            <div style={{ background: 'white', padding: '4rem 2rem' }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #002855 0%, #003d80 100%)',
                        borderRadius: '16px',
                        padding: '4rem 3rem',
                        textAlign: 'center',
                        boxShadow: '0 8px 40px rgba(0,40,85,0.18)',
                    }}>
                        <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: '800', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>
                            Join the Global Council
                        </h2>
                        <p style={{ color: '#CBD5E1', fontSize: '1.05rem', lineHeight: '1.75', marginBottom: '2.25rem', maxWidth: '600px', margin: '0 auto 2.25rem' }}>
                            Access exclusive risk assessment templates, peer benchmarking data, and executive briefings. Join a network of over 500 global organisations committed to responsible AI.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link
                                to="/membership"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'white', color: '#003366', padding: '0.85rem 2rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.95rem', textDecoration: 'none', transition: 'box-shadow 0.15s' }}
                                onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)'}
                                onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                            >
                                Explore Membership
                            </Link>
                            <Link
                                to="/contact"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.5)', padding: '0.85rem 2rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.95rem', textDecoration: 'none', transition: 'border-color 0.15s, background 0.15s' }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent'; }}
                            >
                                Contact Us
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── News expand modal ────────────────────────────────────────── */}
            {expandedNews && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    onClick={() => setExpandedNews(null)}
                >
                    <div
                        style={{ background: 'white', borderRadius: '12px', padding: '2.5rem', maxWidth: '600px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', position: 'relative', maxHeight: '85vh', overflowY: 'auto' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setExpandedNews(null)}
                            style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                            aria-label="Close"
                        >
                            <X size={22} />
                        </button>
                        <span style={{ background: '#EFF6FF', color: '#003366', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700' }}>News</span>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1A202C', margin: '1rem 0 0.75rem', lineHeight: '1.3' }}>
                            {expandedNews.title}
                        </h2>
                        <div style={{ fontSize: '1rem', color: '#4A5568', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                            {expandedNews.summary}
                        </div>
                        {expandedNews.link && (
                            <div style={{ marginTop: '2rem' }}>
                                <a
                                    href={expandedNews.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#003366', color: 'white', padding: '0.65rem 1.5rem', borderRadius: '6px', textDecoration: 'none', fontWeight: '700', fontSize: '0.9rem' }}
                                >
                                    Read Full Article <ChevronRight size={16} />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Upgrade Modal ────────────────────────────────────────────── */}
            <UpgradeModal isOpen={upgradeModal.isOpen} onClose={upgradeModal.close} />
        </>
    );
};

export default Home;
