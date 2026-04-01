import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Globe, ChevronLeft, ChevronRight, X, ArrowRight,
    Calendar, MapPin, CheckCircle, Lock, AlertCircle,
    RefreshCw, Users, BookOpen, Zap, Star,
    Volume2, VolumeX, Play, Pause
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { useModal } from '../hooks/useModal.js';
import { getNews } from '../api/news.js';
import { getEvents } from '../api/events.js';
import { getRecentVideos, getVideoStreamUrl } from '../api/resources.js';
import { formatDate } from '../utils/dateFormatter.js';
import UpgradeModal from '../components/modals/UpgradeModal.jsx';
import { EventRegistrationModal } from './Events.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
    webinar:  { bg: '#EFF6FF', color: '#1D4ED8' },
    seminar:  { bg: '#F0FDF4', color: '#16A34A' },
    workshop: { bg: '#FFFBEB', color: '#D97706' },
    podcast:  { bg: '#FAF5FF', color: '#7C3AED' },
};

const STAT_TARGETS = { members: 25, events: 3, papers: 7, countries: 3 };
const CARD_W   = 300;
const CARD_GAP = 16;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getCountdown = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    if (diff <= 0) return 'Now';
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day away';
    return `${days} days away`;
};

const fmtDate = (d) => {
    if (!d) return '';
    try {
        return formatDate
            ? formatDate(d)
            : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return ''; }
};

// ─── Skeleton components ──────────────────────────────────────────────────────
const SkeletonNewsCard = () => (
    <div style={{ minWidth: '280px', width: '280px', flex: '0 0 280px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {[100, 65, 80, 50].map((w, i) => (
            <div key={i} style={{ height: i === 0 ? '12px' : '10px', width: `${w}%`, background: 'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)', backgroundSize: '200% 100%', borderRadius: '4px', marginBottom: '10px', animation: 'skPulse 1.5s ease-in-out infinite' }} />
        ))}
    </div>
);

const SkeletonEventCard = () => (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {[40, 90, 60].map((w, i) => (
            <div key={i} style={{ height: i === 1 ? '18px' : '12px', width: `${w}%`, background: 'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)', backgroundSize: '200% 100%', borderRadius: '4px', marginBottom: '10px', animation: 'skPulse 1.5s ease-in-out infinite' }} />
        ))}
        <div style={{ height: '38px', width: '100%', background: 'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)', backgroundSize: '200% 100%', borderRadius: '8px', marginTop: '16px', animation: 'skPulse 1.5s ease-in-out infinite' }} />
    </div>
);

// ─── Dynamic Video Carousel ───────────────────────────────────────────────────
const GLOW_COLORS = [
    { from: '#1e40af', to: '#3b82f6' },
    { from: '#7c3aed', to: '#a78bfa' },
    { from: '#065f46', to: '#34d399' },
    { from: '#92400e', to: '#f59e0b' },
    { from: '#831843', to: '#f472b6' },
];

const HeroVideoCarousel = ({ videos, viewAllHref }) => {
    const [activeIdx, setActiveIdx]         = useState(() => Math.floor(Math.random() * Math.max(videos.length, 1)));
    const [prevIdx,   setPrevIdx]           = useState(null);
    const [direction, setDirection]         = useState('next');   // 'next' | 'prev'
    const [transitioning, setTransitioning] = useState(false);
    const [playingUrl, setPlayingUrl]       = useState(null);
    const [playingTitle, setPlayingTitle]   = useState('');
    const [isHovered, setIsHovered]         = useState(false);
    const [isMuted, setIsMuted]             = useState(true);
    const [videoReady, setVideoReady]       = useState(false);
    const [isPlaying, setIsPlaying]         = useState(false);
    const [dragStart, setDragStart]         = useState(null);
    const [glowColor, setGlowColor]         = useState(() => GLOW_COLORS[Math.floor(Math.random() * GLOW_COLORS.length)]);
    const [windowWidth, setWindowWidth]     = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

    const mainVideoRef   = useRef(null);
    const progressRef    = useRef(null);
    const progressAnim   = useRef(null);
    const autoTimer      = useRef(null);
    const thumbsRef      = useRef(null);
    const transTimer     = useRef(null);
    const AUTOPLAY_MS    = 6000;
    const TRANSITION_MS  = 320;
    const isMobile       = windowWidth < 640;

    useEffect(() => {
        const fn = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);

    const resetAutoplay = useCallback(() => {
        clearInterval(autoTimer.current);
        cancelAnimationFrame(progressAnim.current);
        if (progressRef.current) progressRef.current.style.width = '0%';
    }, []);

    const goTo = useCallback((target) => {
        const len = videos.length;
        let nextIdx;
        let dir = 'next';
        if (target === 'next')      { nextIdx = (activeIdx + 1) % len; dir = 'next'; }
        else if (target === 'prev') { nextIdx = (activeIdx - 1 + len) % len; dir = 'prev'; }
        else { nextIdx = target; dir = target > activeIdx ? 'next' : 'prev'; }
        if (nextIdx === activeIdx) return;
        // Start transition
        setPrevIdx(activeIdx);
        setDirection(dir);
        setTransitioning(true);
        setVideoReady(false);
        setIsPlaying(false);
        setActiveIdx(nextIdx);
        setGlowColor(GLOW_COLORS[nextIdx % GLOW_COLORS.length]);
        clearTimeout(transTimer.current);
        transTimer.current = setTimeout(() => setTransitioning(false), TRANSITION_MS);
        if (thumbsRef.current) {
            const el = thumbsRef.current.children[nextIdx];
            if (el) thumbsRef.current.scrollLeft = el.offsetLeft - thumbsRef.current.offsetWidth / 2 + el.offsetWidth / 2;
        }
    }, [activeIdx, videos.length]);

    const startAutoplay = useCallback(() => {
        if (isHovered || playingUrl || videos.length <= 1) return;
        resetAutoplay();
        let start = null;
        const animate = ts => {
            if (!start) start = ts;
            const pct = Math.min(((ts - start) / AUTOPLAY_MS) * 100, 100);
            if (progressRef.current) progressRef.current.style.width = `${pct}%`;
            if (pct < 100) progressAnim.current = requestAnimationFrame(animate);
        };
        progressAnim.current = requestAnimationFrame(animate);
        autoTimer.current = setInterval(() => goTo('next'), AUTOPLAY_MS);
    }, [isHovered, playingUrl, videos.length, goTo, resetAutoplay]);

    useEffect(() => { startAutoplay(); return resetAutoplay; }, [startAutoplay, resetAutoplay, activeIdx]);

    const openModal = useCallback(async (vid) => {
        setPlayingTitle(vid.title || '');
        if (mainVideoRef.current) mainVideoRef.current.pause();
        resetAutoplay();
        try {
            const res = await getVideoStreamUrl(vid.id);
            setPlayingUrl(res.data.url);
        } catch {
            setPlayingUrl(vid.video_url);
        }
    }, [resetAutoplay]);

    const handlePointerDown = e => setDragStart(e.clientX ?? e.touches?.[0]?.clientX);
    const handlePointerUp   = e => {
        if (dragStart === null) return;
        const endX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? dragStart;
        if (Math.abs(dragStart - endX) > 40) goTo(dragStart - endX > 0 ? 'next' : 'prev');
        setDragStart(null);
    };

    useEffect(() => {
        const onKey = e => {
            if (playingUrl) { if (e.key === 'Escape') setPlayingUrl(null); return; }
            if (e.key === 'ArrowRight') goTo('next');
            if (e.key === 'ArrowLeft')  goTo('prev');
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [playingUrl, goTo]);

    if (!videos?.length) return null;
    const active = videos[activeIdx];

    return (
        <>
            <style>{`
                /* ── Slide + zoom combo ── */
                @keyframes hvc-slide-in-next  { from{transform:translateX(100%) scale(0.96);opacity:0} to{transform:translateX(0) scale(1);opacity:1} }
                @keyframes hvc-slide-out-next { from{transform:translateX(0) scale(1);opacity:1}  to{transform:translateX(-55%) scale(0.94);opacity:0} }
                @keyframes hvc-slide-in-prev  { from{transform:translateX(-100%) scale(0.96);opacity:0} to{transform:translateX(0) scale(1);opacity:1} }
                @keyframes hvc-slide-out-prev { from{transform:translateX(0) scale(1);opacity:1}  to{transform:translateX(55%) scale(0.94);opacity:0} }
                /* ── Scan-line wipe on cut ── */
                @keyframes hvc-scan  { 0%{transform:translateX(-100%) skewX(-8deg);opacity:0} 8%{opacity:1} 92%{opacity:1} 100%{transform:translateX(200%) skewX(-8deg);opacity:0} }
                @keyframes hvc-flash { 0%{opacity:0.55} 100%{opacity:0} }
                /* ── Other animations ── */
                @keyframes hvc-fadein   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
                @keyframes hvc-slidein  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                @keyframes hvc-pulsedot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.75)} }
                @keyframes hvc-ripple   { 0%{transform:scale(0.8);opacity:0.7} 100%{transform:scale(2.8);opacity:0} }
                @keyframes hvc-glow     { 0%,100%{opacity:0.5} 50%{opacity:0.9} }
                @keyframes hvc-glow2    { 0%,100%{opacity:0.2;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.08)} }
                @keyframes hvc-modal    { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
                @keyframes hvc-eq1 { 0%,100%{height:4px}  50%{height:14px} }
                @keyframes hvc-eq2 { 0%,100%{height:10px} 30%{height:4px}  70%{height:16px} }
                @keyframes hvc-eq3 { 0%,100%{height:6px}  40%{height:18px} 80%{height:4px} }
                @keyframes hvc-eq4 { 0%,100%{height:12px} 20%{height:4px}  60%{height:8px} }
                @keyframes hvc-shine  { from{transform:translateX(-120%) skewX(-15deg)} to{transform:translateX(250%) skewX(-15deg)} }
                @keyframes hvc-corner { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
                @keyframes hvc-progress-dot { 0%,100%{box-shadow:0 0 6px 2px currentColor} 50%{box-shadow:0 0 14px 5px currentColor} }
                /* ── Interactive states ── */
                .hvc-stage { transition: box-shadow 0.9s ease, transform 0.3s ease; }
                .hvc-stage:hover { transform: scale(1.005); }
                .hvc-nav   { transition: opacity 0.25s, background 0.18s, transform 0.18s !important; }
                .hvc-nav:hover   { background:rgba(255,255,255,0.22)!important; border-color:rgba(255,255,255,0.5)!important; transform:scale(1.12) translateY(-50%) !important; }
                .hvc-iconbtn:hover { background:rgba(255,255,255,0.2)!important; transform:scale(1.1); }
                .hvc-watch { transition: background 0.18s, transform 0.18s, box-shadow 0.18s !important; }
                .hvc-watch:hover { background:rgba(255,255,255,0.25)!important; transform:translateY(-1px); box-shadow:0 4px 16px rgba(0,0,0,0.35)!important; }
                .hvc-close:hover { background:rgba(255,255,255,0.18)!important; }
                .hvc-mnav:hover  { background:rgba(255,255,255,0.14)!important; }
                .hvc-thumb-wrap  { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), border-color 0.3s, box-shadow 0.3s !important; }
                .hvc-thumb-wrap:hover { transform: scale(1.1) translateY(-2px) !important; }
                .hvc-thumb-wrap:hover .hvc-tdim { opacity:0!important; }
                .hvc-play-btn { transition: background 0.2s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1) !important; }
                .hvc-play-btn:hover { background:rgba(255,255,255,0.25)!important; transform:scale(1.12); }
                .hvc-dotbtn { width:6px; height:6px; border-radius:3px; background:rgba(255,255,255,0.3); border:none; padding:0; cursor:pointer; transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1); outline:none; min-width:0; }
                .hvc-dotbtn.active { width:22px; background:white; }
                .hvc-dotbtn:hover { transform:scaleY(1.5); }
            `}</style>

            {/* Ambient glow — double layer for depth */}
            <div style={{ position:'absolute', inset:'-30px', borderRadius:'32px', zIndex:0,
                background:`radial-gradient(ellipse at 50% 90%, ${glowColor.from}66 0%, transparent 65%)`,
                transition:'background 0.9s ease', animation:'hvc-glow 2.8s ease-in-out infinite', pointerEvents:'none' }} />
            <div style={{ position:'absolute', inset:'10px', borderRadius:'24px', zIndex:0,
                background:`radial-gradient(ellipse at 50% 100%, ${glowColor.to}33 0%, transparent 70%)`,
                transition:'background 0.9s ease', animation:'hvc-glow2 4s 0.5s ease-in-out infinite', pointerEvents:'none' }} />

            <div
                style={{ position: 'relative', width: '100%', maxWidth: '100%', overflow: 'visible', zIndex: 1 }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* ── Main Stage ── */}
                <div className="hvc-stage"
                    style={{
                        position: 'relative', width: '100%', aspectRatio: '16/9',
                        borderRadius: isMobile ? '10px' : '16px', overflow: 'hidden',
                        background: '#050c1a',
                        boxShadow: `0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.09), 0 0 80px ${glowColor.from}44`,
                        cursor: dragStart !== null ? 'grabbing' : 'grab',
                        touchAction: 'pan-y',
                    }}
                    onMouseDown={handlePointerDown}   onMouseUp={handlePointerUp}
                    onTouchStart={handlePointerDown}  onTouchEnd={handlePointerUp}
                >
                    {/* Neon corner brackets — appear on hover via CSS */}
                    {[['0px','0px','borderTop','borderLeft'],['0px','0px','borderTop','borderRight'],['0px','0px','borderBottom','borderLeft'],['0px','0px','borderBottom','borderRight']].map((_,ci) => {
                        const c = [[{top:'8px',left:'8px'},{borderTop:`2px solid ${glowColor.to}`,borderLeft:`2px solid ${glowColor.to}`}],[{top:'8px',right:'8px'},{borderTop:`2px solid ${glowColor.to}`,borderRight:`2px solid ${glowColor.to}`}],[{bottom:'8px',left:'8px'},{borderBottom:`2px solid ${glowColor.to}`,borderLeft:`2px solid ${glowColor.to}`}],[{bottom:'8px',right:'8px'},{borderBottom:`2px solid ${glowColor.to}`,borderRight:`2px solid ${glowColor.to}`}]][ci];
                        return <div key={ci} style={{ position:'absolute',...c[0],...c[1], width:'18px', height:'18px', zIndex:20, opacity: isHovered ? 0.8 : 0, transition:'opacity 0.3s ease', pointerEvents:'none', borderRadius:'2px', animation: isHovered ? `hvc-corner 0.3s ${ci*0.05}s ease both` : 'none' }} />;
                    })}
                    {/* ── Slide transition layer: exiting video ── */}
                    {transitioning && prevIdx !== null && (
                        <video
                            key={`prev-${prevIdx}`}
                            src={videos[prevIdx]?.video_url}
                            autoPlay muted loop playsInline
                            style={{
                                position: 'absolute', inset: 0, width: '100%', height: '100%',
                                objectFit: 'cover', zIndex: 3,
                                animation: `hvc-slide-out-${direction} ${TRANSITION_MS}ms cubic-bezier(0.4,0,0.2,1) forwards`,
                            }}
                        />
                    )}

                    {/* ── Entering (active) video ── */}
                    <video
                        key={`active-${activeIdx}`}
                        ref={mainVideoRef}
                        src={active.video_url}
                        preload="auto"
                        autoPlay
                        muted={isMuted}
                        loop
                        playsInline
                        onCanPlay={() => {
                            setVideoReady(true);
                            const v = mainVideoRef.current;
                            if (v) {
                                v.muted = isMuted;
                                v.playbackRate = 1.25;
                                v.play()
                                    .then(() => setIsPlaying(true))
                                    .catch(() => {
                                        // Browser blocked autoplay with sound — retry muted
                                        v.muted = true;
                                        setIsMuted(true);
                                        v.play().then(() => setIsPlaying(true)).catch(() => {});
                                    });
                            }
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        style={{
                            position: 'absolute', inset: 0, width: '100%', height: '100%',
                            objectFit: 'cover', zIndex: 2,
                            animation: transitioning
                                ? `hvc-slide-in-${direction} ${TRANSITION_MS}ms cubic-bezier(0.4,0,0.2,1) forwards`
                                : 'none',
                            opacity: (!transitioning && !videoReady) ? 0 : 1,
                            transition: (!transitioning && !videoReady) ? 'none' : 'opacity 0.4s ease',
                        }}
                    />

                    {/* Flash + scan-line wipe overlay on transition */}
                    {transitioning && (
                        <>
                            <div style={{ position:'absolute', inset:0, zIndex:6, background:'rgba(255,255,255,0.05)', animation:`hvc-flash ${TRANSITION_MS}ms ease-out forwards`, pointerEvents:'none' }} />
                            <div style={{ position:'absolute', inset:0, zIndex:6, overflow:'hidden', pointerEvents:'none' }}>
                                <div style={{ position:'absolute', top:0, bottom:0, width:'60px', background:`linear-gradient(90deg,transparent,${glowColor.to}55,transparent)`, animation:`hvc-scan ${TRANSITION_MS}ms ease-in-out forwards` }} />
                            </div>
                        </>
                    )}

                    {/* Gradient overlays */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: 'linear-gradient(180deg,rgba(0,0,0,0.25) 0%,transparent 30%,rgba(0,0,0,0.85) 100%)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: 'linear-gradient(90deg,rgba(0,8,28,0.3) 0%,transparent 60%)', pointerEvents: 'none' }} />

                    {/* Progress bar with glowing trailing dot */}
                    {videos.length > 1 && (
                        <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:'rgba(255,255,255,0.08)', zIndex:20 }}>
                            <div ref={progressRef} style={{ position:'relative', height:'100%', width:'0%', background:`linear-gradient(90deg, ${glowColor.from}, ${glowColor.to})`, borderRadius:'0 2px 2px 0', transition:'background 0.8s ease' }}>
                                <div style={{ position:'absolute', right:0, top:'50%', transform:'translateY(-50%)', width:'7px', height:'7px', borderRadius:'50%', background:glowColor.to, marginRight:'-3px', animation:'hvc-progress-dot 1.4s ease-in-out infinite', color:glowColor.to }} />
                            </div>
                        </div>
                    )}

                    {/* Top bar: badge + controls */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '10px 12px' : '12px 16px', zIndex: 15 }}>
                        {/* LIVE badge */}
                        <span style={{ background: 'rgba(0,8,24,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.92)', fontSize: '0.58rem', fontWeight: '800', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'hvc-pulsedot 1.6s ease-in-out infinite', flexShrink: 0 }} />
                            Featured
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button className="hvc-iconbtn"
                                onClick={e => { e.stopPropagation(); setIsMuted(m => !m); if (mainVideoRef.current) mainVideoRef.current.muted = !isMuted; }}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,8,24,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.14)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s', outline: 'none' }}
                                aria-label={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                            </button>
                            <button className="hvc-iconbtn"
                                onClick={e => { e.stopPropagation(); openModal(active); }}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,8,24,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.14)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s', outline: 'none' }}
                                aria-label="Expand"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                            </button>
                            {videos.length > 1 && (
                                <span style={{ background: 'rgba(0,8,24,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '100px', padding: '4px 9px', fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums', fontWeight: '600' }}>
                                    <span style={{ color: 'white', fontWeight: '800' }}>{activeIdx + 1}</span>
                                    <span style={{ margin: '0 2px', opacity: 0.4 }}>/</span>{videos.length}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Arrow nav — softly visible always, brighter on hover */}
                    {videos.length > 1 && !isMobile && (<>
                        <button className="hvc-nav" onClick={e => { e.stopPropagation(); goTo('prev'); resetAutoplay(); }} aria-label="Previous"
                            style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', width:'40px', height:'40px', borderRadius:'50%', background:'rgba(0,8,24,0.5)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.2)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:12, opacity: isHovered ? 1 : 0.4, outline:'none' }}>
                            <ChevronLeft size={18} />
                        </button>
                        <button className="hvc-nav" onClick={e => { e.stopPropagation(); goTo('next'); resetAutoplay(); }} aria-label="Next"
                            style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', width:'40px', height:'40px', borderRadius:'50%', background:'rgba(0,8,24,0.5)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.2)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:12, opacity: isHovered ? 1 : 0.4, outline:'none' }}>
                            <ChevronRight size={18} />
                        </button>
                    </>)}

                    {/* Centre play/pause button — toggles the background video */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11, pointerEvents: 'none', transition: 'opacity 0.5s ease', opacity: isPlaying ? 0.25 : 1 }}>
                        <button className="hvc-play-btn"
                            onClick={e => {
                                e.stopPropagation();
                                const v = mainVideoRef.current;
                                if (!v) return;
                                if (isPlaying) { v.pause(); setIsPlaying(false); resetAutoplay(); }
                                else { v.play().then(() => setIsPlaying(true)).catch(() => {}); startAutoplay(); }
                            }}
                            style={{ position: 'relative', width: isMobile ? '52px' : '62px', height: isMobile ? '52px' : '62px', borderRadius: '50%', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(255,255,255,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.25s', outline: 'none', pointerEvents: 'all' }}>
                            {!isPlaying && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.35)', animation: 'hvc-ripple 2.2s ease-out infinite' }} />}
                            {!isPlaying && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.18)', animation: 'hvc-ripple 2.2s 0.8s ease-out infinite' }} />}
                            {isPlaying
                                ? <Pause size={isMobile ? 18 : 22} fill="white" color="white" />
                                : <Play  size={isMobile ? 20 : 24} fill="white" color="white" style={{ marginLeft: '3px' }} />}
                        </button>
                    </div>

                    {/* Bottom info — slides up fresh on each video */}
                    <div key={activeIdx} style={{ position:'absolute', bottom:0, left:0, right:0, padding: isMobile ? '10px 12px' : '14px 16px', zIndex:10, boxSizing:'border-box', animation:'hvc-slidein 0.4s cubic-bezier(0.25,1,0.5,1)' }}>
                        {active.title && (
                            <p style={{ margin:'0 0 10px', color:'white', fontSize: isMobile?'0.82rem':'0.95rem', fontWeight:'700', lineHeight:'1.4', textShadow:'0 2px 12px rgba(0,0,0,0.7)', maxWidth:'82%', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                                <span style={{ background:`linear-gradient(90deg, white 0%, ${glowColor.to} 100%)`, backgroundClip:'text', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', transition:'background 0.8s ease' }}>{active.title}</span>
                            </p>
                        )}
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                            {isPlaying && (
                                <div style={{ display:'flex', alignItems:'flex-end', gap:'2px', height:'18px', marginRight:'2px' }}>
                                    {[['hvc-eq1','0.4s'],['hvc-eq2','0.2s'],['hvc-eq3','0.5s'],['hvc-eq4','0.3s']].map(([anim,delay],i) => (
                                        <div key={i} style={{ width:'3px', borderRadius:'2px', background:glowColor.to, boxShadow:`0 0 4px ${glowColor.to}`, animation:`${anim} 0.75s ${delay} ease-in-out infinite` }} />
                                    ))}
                                </div>
                            )}
                            <button className="hvc-watch" onClick={e => { e.stopPropagation(); openModal(active); }}
                                style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'rgba(255,255,255,0.12)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.22)', color:'white', padding:'6px 14px', borderRadius:'100px', fontSize:'0.7rem', fontWeight:'700', cursor:'pointer', outline:'none', whiteSpace:'nowrap', boxShadow:'0 2px 12px rgba(0,0,0,0.3)' }}>
                                <Play size={10} fill="white" color="white" /> Watch Full Video
                            </button>
                            {videos.length > 1 && (
                                <div style={{ display:'flex', gap:'5px', alignItems:'center', marginLeft:'auto' }}>
                                    {videos.map((_,idx) => (
                                        <button key={idx} className={`hvc-dotbtn${idx===activeIdx?' active':''}`}
                                            onClick={e => { e.stopPropagation(); goTo(idx); resetAutoplay(); }}
                                            aria-label={`Go to video ${idx+1}`}
                                            style={{ background: idx===activeIdx ? glowColor.to : undefined,
                                                     boxShadow: idx===activeIdx ? `0 0 8px ${glowColor.to}` : 'none' }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Filmstrip Thumbnails ── */}
                {videos.length > 1 && (
                    <div style={{ width:'100%', overflow:'hidden', marginTop:'10px' }}>
                        <div ref={thumbsRef} style={{ display:'flex', gap:'8px', overflowX:'auto', scrollbarWidth:'none', msOverflowStyle:'none', padding:'4px 2px 8px', WebkitOverflowScrolling:'touch', alignItems:'center' }}>
                            {videos.map((vid, idx) => {
                                const isActive = idx === activeIdx;
                                const gc = GLOW_COLORS[idx % GLOW_COLORS.length];
                                return (
                                    <div key={idx} className="hvc-thumb-wrap"
                                        onClick={() => { goTo(idx); resetAutoplay(); }}
                                        role="button" tabIndex={0}
                                        onKeyDown={e => e.key === 'Enter' && goTo(idx)}
                                        style={{ position:'relative', flexShrink:0, width: isMobile?'62px':'90px', aspectRatio:'16/9', borderRadius:'8px', overflow:'hidden', cursor:'pointer',
                                            border: isActive ? `2px solid ${gc.to}` : '2px solid rgba(255,255,255,0.08)',
                                            boxShadow: isActive ? `0 0 0 2px ${gc.from}66, 0 8px 22px rgba(0,0,0,0.6)` : '0 2px 8px rgba(0,0,0,0.3)',
                                            transform: isActive ? 'scale(1.08)' : 'scale(1)',
                                            background:'#050c1a' }}>
                                        <video src={vid.video_url+'#t=0.001'} preload="metadata" muted playsInline style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',display:'block',pointerEvents:'none',zIndex:1 }} />
                                        <div className="hvc-tdim" style={{ position:'absolute',inset:0,zIndex:2,background: isActive?'rgba(0,0,0,0)':'rgba(0,0,0,0.5)',transition:'opacity 0.3s' }} />
                                        {isActive && (
                                            <div style={{ position:'absolute',inset:0,zIndex:4,overflow:'hidden',pointerEvents:'none' }}>
                                                <div style={{ position:'absolute',top:0,bottom:0,width:'40px',background:`linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)`, animation:'hvc-shine 1.4s 0.2s ease both' }} />
                                            </div>
                                        )}
                                        {isActive && <div style={{ position:'absolute',bottom:0,left:0,right:0,height:'3px',background:`linear-gradient(90deg,${gc.from},${gc.to})`,zIndex:3 }} />}
                                        {!isActive && (
                                            <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:3 }}>
                                                <div style={{ width:'22px',height:'22px',borderRadius:'50%',background:'rgba(255,255,255,0.18)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,0.28)' }}>
                                                    <Play size={9} fill="white" color="white" style={{ marginLeft:'1px' }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {/* View all — sits inline at the right end of the filmstrip row */}
                            {viewAllHref && (
                                <Link to={viewAllHref}
                                    style={{ flexShrink:0, marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:'3px', color:'#93C5FD', fontSize:'0.65rem', fontWeight:'700', textDecoration:'none', letterSpacing:'0.05em', whiteSpace:'nowrap', padding:'4px 12px', borderRadius:'100px', border:'1px solid #93C5FD88', boxShadow:'0 0 8px #3b82f644, inset 0 0 8px rgba(147,197,253,0.06)', backdropFilter:'blur(8px)', background:'rgba(147,197,253,0.06)', transition:'all 0.2s ease' }}
                                    onMouseOver={e => { e.currentTarget.style.background='rgba(147,197,253,0.14)'; e.currentTarget.style.borderColor='#93C5FD'; e.currentTarget.style.boxShadow='0 0 14px #3b82f688, inset 0 0 10px rgba(147,197,253,0.1)'; e.currentTarget.style.color='white'; }}
                                    onMouseOut={e => { e.currentTarget.style.background='rgba(147,197,253,0.06)'; e.currentTarget.style.borderColor='#93C5FD88'; e.currentTarget.style.boxShadow='0 0 8px #3b82f644, inset 0 0 8px rgba(147,197,253,0.06)'; e.currentTarget.style.color='#93C5FD'; }}>
                                    View all <ChevronRight size={11} />
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Cinematic Modal ── */}
            {playingUrl && (
                <div role="dialog" aria-modal="true" aria-label="Video player"
                    style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.97)', backdropFilter: 'blur(22px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setPlayingUrl(null)}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'clamp(0.75rem,2vw,1rem) clamp(1rem,3vw,1.5rem)', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'hvc-pulsedot 1.6s ease-in-out infinite', flexShrink: 0 }} />
                            {playingTitle && <span style={{ color: 'rgba(255,255,255,0.78)', fontSize: 'clamp(0.75rem,2vw,0.85rem)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{playingTitle}</span>}
                        </div>
                        <button className="hvc-close" onClick={() => setPlayingUrl(null)} aria-label="Close"
                            style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s', outline: 'none', flexShrink: 0 }}>
                            <X size={17} />
                        </button>
                    </div>
                    <div style={{ width: '90%', maxWidth: '1080px', aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 40px 120px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.07)', animation: 'hvc-modal 0.35s cubic-bezier(0.25,0.8,0.25,1) forwards' }}
                        onClick={e => e.stopPropagation()}>
                        <video src={playingUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block' }} />
                    </div>
                    {videos.length > 1 && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '18px', zIndex: 10 }}>
                            <button className="hvc-mnav"
                                onClick={e => { e.stopPropagation(); const p = (activeIdx - 1 + videos.length) % videos.length; goTo(p); setPlayingUrl(videos[p].video_url); setPlayingTitle(videos[p].title || ''); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', transition: 'background 0.2s', outline: 'none' }}>
                                <ChevronLeft size={14} /> Previous
                            </button>
                            <button className="hvc-mnav"
                                onClick={e => { e.stopPropagation(); const n = (activeIdx + 1) % videos.length; goTo(n); setPlayingUrl(videos[n].video_url); setPlayingTitle(videos[n].title || ''); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', transition: 'background 0.2s', outline: 'none' }}>
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                    <p style={{ marginTop: '12px', fontSize: '0.62rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>Press ESC or click outside to close</p>
                </div>
            )}
        </>
    );
};


// ─── Shared section label ─────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
    <span style={{ display: 'inline-block', background: '#EFF6FF', color: '#003366', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: '100px', marginBottom: '1rem' }}>
        {children}
    </span>
);

// ─── Home ─────────────────────────────────────────────────────────────────────
const Home = () => {
    const navigate = useNavigate();
    const { user, canDownloadFramework } = useAuth();
    const { showToast } = useToast();
    const upgradeModal = useModal();

    const featuredEventsRef = useRef(null);
    const carouselRef = useRef(null);
    const autoplayRef = useRef(null);
    const carouselPausedRef = useRef(false);
    const lastIdxRef = useRef(0);
    const touchStart = useRef(null);
    const statsRef = useRef(null);

    const [statsVisible, setStatsVisible] = useState(false);
    const [counts, setCounts] = useState({ members: 0, events: 0, papers: 0, countries: 0 });
    const [news, setNews] = useState([]);
    const [newsLoading, setNewsLoading] = useState(true);
    const [newsError, setNewsError] = useState('');
    const [activeNewsIdx, setActiveNewsIdx] = useState(0);
    const [expandedNews, setExpandedNews] = useState(null);
    const [carouselPaused, setCarouselPaused] = useState(false);
    const [events, setEvents] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [eventsError, setEventsError] = useState('');
    const [regTarget, setRegTarget] = useState(null);
    const [recentVideos, setRecentVideos] = useState([]);
    const [videosLoading, setVideosLoading] = useState(true);

    const fetchNews = useCallback(async (signal) => {
        setNewsLoading(true); setNewsError('');
        try {
            const res = await getNews({ limit: 9 });
            if (!signal?.aborted) setNews(res.data?.data || []);
        } catch { if (!signal?.aborted) setNewsError('Failed to load news.'); }
        finally { if (!signal?.aborted) setNewsLoading(false); }
    }, []);

    const fetchEvents = useCallback(async (signal) => {
        setEventsLoading(true); setEventsError('');
        try {
            const res = await getEvents({ tab: 'upcoming', limit: 3 });
            if (!signal?.aborted) setEvents(res.data?.data?.events || res.data?.data || []);
        } catch { if (!signal?.aborted) setEventsError('Failed to load events.'); }
        finally { if (!signal?.aborted) setEventsLoading(false); }
    }, []);

    const fetchVideos = useCallback(async (signal) => {
        setVideosLoading(true);
        try {
            const res = await getRecentVideos();
            if (!signal?.aborted && res.data?.success) setRecentVideos(res.data.data || []);
        } catch {}
        finally { if (!signal?.aborted) setVideosLoading(false); }
    }, []);

    useEffect(() => {
        const ctrl = new AbortController();
        fetchNews(ctrl.signal);
        fetchEvents(ctrl.signal);
        fetchVideos(ctrl.signal);
        document.title = 'Risk Council | Governing AI Risk';
        return () => ctrl.abort();
    }, [fetchNews, fetchEvents, fetchVideos]);

    useEffect(() => { carouselPausedRef.current = carouselPaused; }, [carouselPaused]);

    const measuredCardW = useRef(null);

    const getCardW = useCallback(() => {
        if (measuredCardW.current) return measuredCardW.current;
        if (!carouselRef.current) return CARD_W + CARD_GAP;
        const firstCard = carouselRef.current.firstElementChild;
        if (firstCard) {
            measuredCardW.current = firstCard.offsetWidth + CARD_GAP;
        }
        return measuredCardW.current || (CARD_W + CARD_GAP);
    }, []);

    useEffect(() => {
        if (news.length === 0) return;
        let lastTs = null;
        let scrollPos = 0;
        const SPEED = 48;

        const tick = (ts) => {
            if (!carouselRef.current) { autoplayRef.current = requestAnimationFrame(tick); return; }
            const cardW  = getCardW();
            const singleSetW = news.length * cardW;
            if (!carouselPausedRef.current) {
                if (lastTs !== null) {
                    const delta = SPEED * (ts - lastTs) / 1000;
                    scrollPos  += delta;
                    if (scrollPos >= singleSetW) scrollPos -= singleSetW;
                    carouselRef.current.scrollLeft = scrollPos;
                    const idx = Math.floor(scrollPos / cardW) % news.length;
                    if (idx !== lastIdxRef.current) {
                        lastIdxRef.current = idx;
                        setActiveNewsIdx(idx);
                    }
                }
                lastTs = ts;
            } else {
                scrollPos = carouselRef.current.scrollLeft;
                lastTs = null;
            }
            autoplayRef.current = requestAnimationFrame(tick);
        };

        autoplayRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(autoplayRef.current);
    }, [news.length, getCardW]);

    const scrollCarousel = useCallback((dir) => {
        if (!carouselRef.current) return;
        const cardW = getCardW();
        setCarouselPaused(true);
        carouselRef.current.scrollBy({ left: dir * cardW, behavior: 'smooth' });
        setTimeout(() => setCarouselPaused(false), 900);
    }, [getCardW]);

    const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
        if (touchStart.current === null) return;
        if (Math.abs(touchStart.current - e.changedTouches[0].clientX) > 50)
            scrollCarousel(touchStart.current > e.changedTouches[0].clientX ? 1 : -1);
        touchStart.current = null;
    };

    useEffect(() => {
        if (!statsRef.current) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && entry.boundingClientRect.top > 0) {
                    setStatsVisible(true);
                    obs.disconnect();
                }
            },
            { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
        );
        obs.observe(statsRef.current);
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (!statsVisible) return;
        const duration = 1800, start = performance.now();
        const animate = (now) => {
            const ease = 1 - Math.pow(1 - Math.min((now - start) / duration, 1), 3);
            setCounts({ members: Math.round(ease * STAT_TARGETS.members), events: Math.round(ease * STAT_TARGETS.events), papers: Math.round(ease * STAT_TARGETS.papers), countries: Math.round(ease * STAT_TARGETS.countries) });
            if (ease < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [statsVisible]);

    const handleFrameworkCTA = () => { if (canDownloadFramework()) navigate('/resources'); else upgradeModal.open(); };

    const SECTION_STYLE = { padding: 'clamp(1.5rem, 3vw, 2.5rem) clamp(1rem, 4vw, 3rem)' };
    const INNER = { maxWidth: '1400px', margin: '0 auto' };

    return (
        <>
            <style>{`
                html { overflow-x: hidden; }
                body { overflow-x: hidden; max-width: 100vw; }
                *, *::before, *::after { box-sizing: border-box; }

                :root { --news-card-w: 300px; }
                @media (max-width: 640px)  { :root { --news-card-w: 80vw; } }
                @media (min-width: 1400px) { :root { --news-card-w: 320px; } }

                [data-news-track]::-webkit-scrollbar { display: none; }

                @keyframes skPulse {
                    0%,100%{background-position:200% 0} 50%{background-position:-200% 0}
                }
                @keyframes heroGrad {
                    /* CHANGE 1: slowed from 20s to 30s in the section style below */
                    0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%}
                }
                @keyframes auroraA {
                    0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.06)} 66%{transform:translate(-20px,35px) scale(0.96)}
                }
                @keyframes auroraB {
                    0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-35px,20px) scale(1.09)} 75%{transform:translate(28px,-40px) scale(0.93)}
                }
                @keyframes radarPing {
                    0%{transform:scale(0.15);opacity:0.9} 100%{transform:scale(5.5);opacity:0}
                }
                @keyframes nodePulse {
                    0%,100%{box-shadow:0 0 0 0 rgba(147,197,253,0.7),0 0 8px 3px rgba(100,180,255,0.4)} 50%{box-shadow:0 0 0 16px rgba(147,197,253,0),0 0 14px 6px rgba(100,180,255,0.2)}
                }
                @keyframes scanBeam {
                    0%{transform:translateX(-120%) skewX(-15deg);opacity:0} 6%{opacity:1} 94%{opacity:1} 100%{transform:translateX(220%) skewX(-15deg);opacity:0}
                }
                @keyframes dotFade { 0%,100%{opacity:0.055} 50%{opacity:0.13} }
                @keyframes lineFade { 0%,100%{opacity:0} 15%,85%{opacity:0.28} }
                @keyframes horizonPulse { 0%,100%{opacity:0.35} 50%{opacity:0.7} }
                @keyframes nodeFloat {
                    0%,100%{transform:translate(0,0)} 40%{transform:translate(10px,-16px)} 70%{transform:translate(-8px,10px)}
                }

                .hero-grid {
                    display: grid;
                    grid-template-columns: minmax(0,5fr) minmax(0,6fr);
                    gap: 3rem;
                    align-items: center;
                }
                @media (max-width: 1100px) {
                    .hero-grid {
                        grid-template-columns: 1fr;
                        gap: 2.5rem;
                        max-width: 680px;
                        margin: 0 auto;
                    }
                    .hero-grid > div:last-child {
                        max-width: 560px;
                        margin: 0 auto;
                        width: 100%;
                    }
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                    text-align: center;
                }
                @media (max-width: 768px) {
                    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
                }
                @media (max-width: 380px) {
                    .stats-grid { grid-template-columns: 1fr; }
                }

                .mission-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.5rem;
                }
                @media (max-width: 768px) {
                    .mission-grid { grid-template-columns: 1fr; }
                }

                .why-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 1.5rem;
                }

                .events-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
                    gap: 1.5rem;
                }

                .cta-btns {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                    flex-wrap: wrap;
                }

                .news-card {
                    min-width: 300px;
                    width: 300px;
                    flex: 0 0 300px;
                    scroll-snap-align: start;
                }
                @media (max-width: 640px) {
                    .news-card {
                        min-width: calc(85vw);
                        width: calc(85vw);
                        flex: 0 0 calc(85vw);
                    }
                }
                @media (min-width: 1200px) {
                    .news-card {
                        min-width: 320px;
                        width: 320px;
                        flex: 0 0 320px;
                    }
                }

                .news-carousel {
                    display: flex;
                    overflow-x: auto;
                    gap: 16px;
                    padding: 8px 4px 24px;
                    scroll-snap-type: x mandatory;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    -webkit-overflow-scrolling: touch;
                }
                .news-carousel::-webkit-scrollbar { display: none; }

                @media (max-width: 640px) {
                    .hero-radar  { display: none; }
                    .hero-nodes  { display: none; }
                }
            `}</style>

            {/* ══════════════════════════════════════════════════════════════
                1. HERO
            ══════════════════════════════════════════════════════════════ */}
            <section style={{
                position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(135deg,#000e22 0%,#001e4a 30%,#002d66 55%,#001429 80%,#000a18 100%)',
                backgroundSize: '300% 300%',
                /* CHANGE 1: slowed to 30s, was 20s */
                animation: 'heroGrad 30s ease infinite',
                color: 'white',
                maxWidth: '100vw',
            }}>
                {/* CHANGE 1: Aurora blobs — reduced opacity (was 0.18/0.10, now 0.10/0.06) */}
                <div style={{ position: 'absolute', top: '-15%', left: '-8%', width: 'clamp(300px,50vw,600px)', height: 'clamp(300px,50vw,600px)', borderRadius: '50%', background: 'radial-gradient(circle at 40% 40%,rgba(0,140,255,0.10) 0%,rgba(0,80,200,0.06) 40%,transparent 70%)', pointerEvents: 'none', animation: 'auroraA 20s ease-in-out infinite', filter: 'blur(2px)' }} />
                <div style={{ position: 'absolute', bottom: '-20%', right: '-5%', width: 'clamp(350px,55vw,700px)', height: 'clamp(350px,55vw,700px)', borderRadius: '50%', background: 'radial-gradient(circle at 60% 60%,rgba(0,180,255,0.08) 0%,rgba(0,100,220,0.04) 40%,transparent 65%)', pointerEvents: 'none', animation: 'auroraB 26s ease-in-out infinite', filter: 'blur(3px)' }} />

                {/* Dot matrix */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.22) 1px,transparent 1px)', backgroundSize: '38px 38px', animation: 'dotFade 7s ease-in-out infinite' }} />

                {/* Radar rings */}
                <div className="hero-radar">
                    {[0, 1.6, 3.2, 4.8].map((d, i) => (
                        <div key={i} style={{ position: 'absolute', top: 'calc(14% + 28px)', right: 'calc(8% + 28px)', width: '72px', height: '72px', borderRadius: '50%', border: `${i < 2 ? '1.5px' : '1px'} solid rgba(147,197,253,${i < 2 ? 0.6 : 0.35})`, pointerEvents: 'none', animation: `radarPing 6.4s ${d}s ease-out infinite` }} />
                    ))}
                    <div style={{ position: 'absolute', top: '14%', right: '8%', width: '20px', height: '20px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(220,240,255,1) 30%,rgba(147,197,253,0.7) 100%)', boxShadow: '0 0 16px 6px rgba(147,197,253,0.55)', pointerEvents: 'none', animation: 'nodePulse 2.2s ease-in-out infinite' }} />
                </div>

                {/* Scan beam */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '90px', height: '200%', pointerEvents: 'none', background: 'linear-gradient(90deg,transparent 0%,rgba(100,190,255,0.03) 30%,rgba(140,210,255,0.10) 55%,rgba(255,255,255,0.04) 65%,transparent 100%)', animation: 'scanBeam 11s 1s ease-in-out infinite' }} />

                {/* Network SVG */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }} viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                    <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="rgba(147,197,253,0)" /><stop offset="50%" stopColor="rgba(147,197,253,0.5)" /><stop offset="100%" stopColor="rgba(147,197,253,0)" /></linearGradient></defs>
                    {[['480','112','750','217',0],['480','112','550','372',1.4],['550','372','380','446',2.8],['750','217','900','155',0.7],['750','217','550','372',2]].map(([x1,y1,x2,y2,d],i) => (
                        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#lg)" strokeWidth="0.8" style={{ animation: `lineFade 9s ${d}s ease-in-out infinite` }} />
                    ))}
                </svg>

                {/* Floating nodes */}
                <div className="hero-nodes">
                    {[{top:'18%',left:'48%',s:8},{top:'60%',left:'55%',s:6},{top:'35%',left:'75%',s:7},{top:'72%',left:'38%',s:5},{top:'25%',left:'90%',s:6}].map((n,i) => (
                        <div key={i} style={{ position: 'absolute', top: n.top, left: n.left, width: `${n.s}px`, height: `${n.s}px`, borderRadius: '50%', background: 'radial-gradient(circle,rgba(220,240,255,0.95) 20%,rgba(147,197,253,0.7) 100%)', boxShadow: `0 0 ${n.s*2}px ${n.s}px rgba(100,170,255,0.35)`, pointerEvents: 'none', animation: `nodeFloat ${8+i*2}s ease-in-out infinite` }} />
                    ))}
                </div>

                {/* Horizon line */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent 0%,rgba(100,180,255,0.5) 30%,rgba(147,197,253,0.8) 50%,rgba(100,180,255,0.5) 70%,transparent 100%)', animation: 'horizonPulse 4s ease-in-out infinite', pointerEvents: 'none' }} />

                {/* Content */}
                <div style={{
                    position: 'relative', zIndex: 2,
                    maxWidth: '1400px',
                    margin: '0 auto',
                    padding: 'clamp(2rem, 4vw, 3.5rem) clamp(1rem, 4vw, 3rem)',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    <div className="hero-grid">
                        {/* Left */}
                        <div>
                            {/* CHANGE 2: Trust badge above headline */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '100px', padding: '5px 13px', marginBottom: '1.1rem' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.72rem', fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.03em' }}>Trusted by 25+ organisations globally</span>
                            </div>

                            {/* CHANGE 2: tightened line-height and letter-spacing on h1 */}
                            <h1 style={{ color: 'white', marginBottom: '1.1rem', lineHeight: '1.08', fontSize: 'clamp(1.8rem, 3.5vw, 3.2rem)', letterSpacing: '-0.03em', fontFamily: 'var(--font-serif)', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                                AI Security Insight Reports &amp; Assessments
                            </h1>
                            <p style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)', color: '#CBD5E1', marginBottom: '1rem', lineHeight: '1.75', maxWidth: '500px' }}>
                                We provide comprehensive insight reports and security assessments to help your organisation adopt Artificial Intelligence responsibly, utilising industry-leading frameworks.
                            </p>
                            <p style={{ fontSize: 'clamp(0.8rem, 1.2vw, 0.9rem)', color: 'rgba(255,255,255,0.45)', marginBottom: '2rem', lineHeight: '1.7', maxWidth: '460px' }}>
                                Trusted by governments, enterprises, and regulators across countries to navigate the evolving landscape of AI risk, compliance, and ethics.
                            </p>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <button onClick={() => navigate('/membership')}
                                    style={{ background: 'white', color: '#003366', border: 'none', padding: 'clamp(0.65rem,2vw,0.85rem) clamp(1.25rem,3vw,1.85rem)', fontSize: 'clamp(0.83rem,1.5vw,0.92rem)', fontWeight: '800', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontFamily: 'var(--font-sans)', transition: 'transform 0.15s,box-shadow 0.15s', whiteSpace: 'nowrap' }}
                                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
                                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'; }}>
                                    Join the Council
                                </button>
                                <button onClick={() => navigate('/services')}
                                    style={{ background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.45)', padding: 'clamp(0.65rem,2vw,0.85rem) clamp(1.25rem,3vw,1.85rem)', fontSize: 'clamp(0.83rem,1.5vw,0.92rem)', fontWeight: '700', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'border-color 0.15s,background 0.15s', whiteSpace: 'nowrap' }}
                                    onMouseOver={e => { e.currentTarget.style.borderColor = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                                    onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'transparent'; }}>
                                    Explore Our Services
                                </button>
                            </div>
                        </div>

                        {/* Right: video carousel or fallback */}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0, width: '100%' }}>
                            {!videosLoading && recentVideos.length > 0 ? (
                                /* CHANGE 3: framed video panel with label strip */
                                <div style={{ width: '100%' }}>
                                    {/* <div style={{ marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Featured Media</span>
                                    </div> */}
                                    <HeroVideoCarousel videos={recentVideos} viewAllHref="/media-hub" />
                                </div>
                            ) : !videosLoading ? (
                                /* CHANGE 4: compact fallback — stacked trust rows + stat grid */
                                <div style={{ width: '100%', maxWidth: '460px' }}>
                                    <p style={{ margin: '0 0 1rem', fontSize: '0.65rem', fontWeight: '700', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Trusted globally</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)' }}>
                                        {[
                                            { icon: CheckCircle, text: 'EU AI Act · NIST AI RMF · ISO 42001', sub: 'Framework aligned' },
                                            { icon: Globe,       text: '500+ global member organisations',    sub: 'Across 40+ countries' },
                                            { icon: Lock,        text: 'Independent · Zero vendor bias',      sub: 'Cited by OECD & EU AI Office' },
                                        ].map(({ icon: Icon, text, sub }) => (
                                            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.9rem 1rem', background: 'rgba(255,255,255,0.04)' }}>
                                                <Icon size={15} color="#93C5FD" style={{ flexShrink: 0 }} />
                                                <div style={{ minWidth: 0 }}>
                                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</p>
                                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.38)', fontSize: '0.7rem' }}>{sub}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', marginTop: '1px', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                                        {[
                                            { val: '25+', label: 'Organisations' },
                                            { val: '7+',  label: 'Research papers' },
                                            { val: '3+',  label: 'Countries' },
                                        ].map(({ val, label }) => (
                                            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'white', lineHeight: 1 }}>{val}</p>
                                                <p style={{ margin: '3px 0 0', fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>{label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                2. STATS BAR
            ══════════════════════════════════════════════════════════════ */}
            <section ref={statsRef} style={{ background: 'linear-gradient(135deg,#001a33 0%,#003366 100%)', ...SECTION_STYLE }}>
                <div style={INNER}>
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '2.5rem' }}>Our global reach</p>
                    <div className="stats-grid">
                        {[
                            { icon: Users,    label: 'Member Organisations', count: counts.members,   suffix: '+', sub: 'across all industries' },
                            { icon: Calendar, label: 'Events Hosted',         count: counts.events,    suffix: '+', sub: 'annually worldwide' },
                            { icon: BookOpen, label: 'Research Papers',        count: counts.papers,    suffix: '+', sub: 'peer-reviewed' },
                            { icon: Globe,    label: 'Countries',              count: counts.countries, suffix: '+', sub: 'on six continents' },
                        ].map(({ icon: Icon, label, count, suffix, sub }) => (
                            <div key={label}>
                                <Icon size={26} color="#f9a825" style={{ margin: '0 auto 0.65rem', display: 'block' }} aria-hidden="true" />
                                <div style={{ fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', fontWeight: '900', color: 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{count}{suffix}</div>
                                <p style={{ margin: '0.35rem 0 0', fontSize: 'clamp(0.75rem, 1.2vw, 0.82rem)', color: '#93C5FD', fontWeight: '600' }}>{label}</p>
                                <p style={{ margin: '0.15rem 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>{sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                3. MISSION & VISION
            ══════════════════════════════════════════════════════════════ */}
            <section style={{ background: '#F8FAFC', ...SECTION_STYLE, borderBottom: '1px solid #E8EDF3' }}>
                <div style={{ ...INNER, padding: '0 clamp(1rem, 4vw, 3rem)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <SectionLabel>Our Purpose</SectionLabel>
                        <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2.2rem)', color: '#1E293B', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>Built to Make AI Governance Actionable</h2>
                    </div>
                    <div className="mission-grid">
                        {[
                            { accent: '#003366', label: 'Our Mission', body: 'To empower organisations and professionals to deploy AI technology safely, ethically, and responsibly - providing comprehensive insight reports and security assessments to align with global frameworks.' },
                            { accent: '#f9a825', label: 'Our Vision',  body: 'A world where artificial intelligence systems are governed with the same rigour and accountability as financial markets - transparent, auditable, and aligned with societal values.', sub: 'An ecosystem where trust in AI is earned through evidence, not asserted through marketing.' },
                        ].map(({ accent, label, body, sub }) => (
                            <div key={label} style={{ background: 'white', borderRadius: '16px', padding: 'clamp(1.5rem,3vw,2.5rem)', border: '1px solid #E2E8F0', borderTop: `4px solid ${accent}`, boxShadow: '0 2px 12px rgba(0,51,102,0.06)' }}>
                                <h3 style={{ fontSize: 'clamp(1rem,2vw,1.25rem)', color: '#003366', marginBottom: '0.85rem', fontWeight: '800' }}>{label}</h3>
                                <p style={{ color: '#4A5568', lineHeight: '1.8', fontSize: 'clamp(0.875rem,1.5vw,0.97rem)', marginBottom: '0.75rem' }}>{body}</p>
                                <p style={{ color: '#64748B', lineHeight: '1.75', fontSize: 'clamp(0.8rem,1.3vw,0.88rem)', margin: 0 }}>{sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                4. ABOUT TEASER
            ══════════════════════════════════════════════════════════════ */}
            <section style={{ background: 'white', ...SECTION_STYLE, borderBottom: '1px solid #E8EDF3' }}>
                <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center', padding: '0 clamp(1rem, 4vw, 3rem)' }}>
                    <SectionLabel>Who We Are</SectionLabel>
                    <h2 style={{ fontSize: 'clamp(1.3rem,3vw,2rem)', color: '#1E293B', fontWeight: '800', marginBottom: '1rem', lineHeight: 1.3 }}>About the Risk AI Council (RAC)</h2>
                    <p style={{ color: '#4A5568', lineHeight: '1.8', fontSize: 'clamp(0.9rem,1.5vw,1.05rem)', marginBottom: '2rem' }}>
                        An independent group of peer members, including executives, governance and risk experts, legal scholars, and AI researchers across countries, delivering unbiased and actionable guidance.
                    </p>
                    <Link to="/about"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#003366', color: 'white', padding: '0.85rem 1.75rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', textDecoration: 'none', transition: 'background 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.background = '#002244'}
                        onMouseOut={e => e.currentTarget.style.background = '#003366'}>
                        Learn More About Us <ArrowRight size={15} />
                    </Link>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                5. WHY JOIN
            ══════════════════════════════════════════════════════════════ */}
            <section style={{ background: '#F8FAFC', ...SECTION_STYLE, borderBottom: '1px solid #E8EDF3' }}>
                <div style={{ ...INNER, padding: '0 clamp(1rem, 4vw, 3rem)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <SectionLabel>Membership</SectionLabel>
                        <h2 style={{ fontSize: 'clamp(1.4rem,3vw,2.25rem)', color: '#1E293B', fontWeight: '800', margin: '0 0 0.75rem' }}>Why Join the Council?</h2>
                        <p style={{ color: '#64748B', fontSize: 'clamp(0.875rem,1.5vw,1rem)', maxWidth: '560px', margin: '0 auto' }}>A global community built for practitioners who care about getting AI governance right.</p>
                    </div>
                    <div className="why-grid">
                        {[
                            { icon: BookOpen, color: '#003366', title: 'Exclusive Research',  desc: 'Access 120+ peer-reviewed reports, audit templates, and risk frameworks. New publications added monthly.' },
                            { icon: Users,    color: '#7C3AED', title: 'Peer Network',         desc: 'Connect with 500+ risk professionals, legal experts, and AI leaders across countries via forums and roundtables.' },
                            { icon: Zap,      color: '#D97706', title: 'Stay Ahead',           desc: 'Receive early-access briefings on upcoming regulations - EU AI Act enforcement, NIST AI RMF revisions, and more.' },
                            { icon: Star,     color: '#0369A1', title: 'Priority Access',      desc: 'Skip the waitlist for workshops, advisory sessions, and annual summit seats. Members get first-look at every resource.' },
                        ].map(({ icon: Icon, color, title, desc }) => (
                            <div key={title}
                                style={{ background: 'white', borderRadius: '16px', padding: 'clamp(1.25rem,2.5vw,2rem)', border: '1px solid #E2E8F0', transition: 'transform 0.2s,box-shadow 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
                                onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                    <Icon size={20} color={color} />
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem', fontWeight: '700', color: '#1E293B', fontSize: 'clamp(0.9rem,1.5vw,1rem)' }}>{title}</h3>
                                <p style={{ margin: 0, color: '#64748B', fontSize: 'clamp(0.8rem,1.3vw,0.875rem)', lineHeight: '1.6' }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                        <Link to="/membership"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#003366', color: 'white', padding: '0.9rem 2rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.95rem', textDecoration: 'none', transition: 'background 0.15s' }}
                            onMouseOver={e => e.currentTarget.style.background = '#002244'}
                            onMouseOut={e => e.currentTarget.style.background = '#003366'}>
                            Join the Council <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                6. NEWS CAROUSEL
            ══════════════════════════════════════════════════════════════ */}
            <section style={{ background: '#F8FAFC', ...SECTION_STYLE, borderBottom: '1px solid #E8EDF3', overflow: 'hidden' }}>
                <div style={{ ...INNER, padding: '0 clamp(1rem, 4vw, 3rem)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                            <SectionLabel>News &amp; Updates</SectionLabel>
                            <h2 style={{ fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: '800', color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>
                                Latest News
                            </h2>
                            <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '4px 0 0' }}>
                                Stay informed with the latest in AI risk &amp; governance
                            </p>
                        </div>
                        {!newsLoading && !newsError && news.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <button
                                    onClick={() => scrollCarousel(-1)}
                                    aria-label="Previous"
                                    style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1.5px solid #E2E8F0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0 }}
                                    onMouseOver={e => { e.currentTarget.style.borderColor = '#003366'; e.currentTarget.style.background = '#f0f5ff'; }}
                                    onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = 'white'; }}
                                >
                                    <ChevronLeft size={16} color="#1E293B" />
                                </button>
                                <span style={{ fontSize: '0.78rem', color: '#94A3B8', minWidth: '42px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                    <span style={{ color: '#003366', fontWeight: '700' }}>{activeNewsIdx + 1}</span>
                                    <span style={{ margin: '0 2px' }}>/</span>
                                    {news.length}
                                </span>
                                <button
                                    onClick={() => scrollCarousel(1)}
                                    aria-label="Next"
                                    style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1.5px solid #E2E8F0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0 }}
                                    onMouseOver={e => { e.currentTarget.style.borderColor = '#003366'; e.currentTarget.style.background = '#f0f5ff'; }}
                                    onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = 'white'; }}
                                >
                                    <ChevronRight size={16} color="#1E293B" />
                                </button>
                            </div>
                        )}
                    </div>

                    {newsLoading && (
                        <div style={{ display: 'flex', gap: '16px', overflow: 'hidden' }}>
                            {[1,2,3,4].map(i => <SkeletonNewsCard key={i} />)}
                        </div>
                    )}

                    {newsError && !newsLoading && (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <AlertCircle size={32} color="#EF4444" style={{ marginBottom: '0.75rem', opacity: 0.6 }} aria-hidden="true" />
                            <p style={{ marginBottom: '1rem', color: '#64748B' }}>{newsError}</p>
                            <button onClick={() => fetchNews()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                                <RefreshCw size={14} /> Try Again
                            </button>
                        </div>
                    )}

                    {!newsLoading && !newsError && news.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#94A3B8', padding: '3rem 0' }}>No news available yet.</p>
                    )}

                    {!newsLoading && !newsError && news.length > 0 && (<>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 20, width: '40px', background: 'linear-gradient(to right, #F8FAFC, transparent)', zIndex: 2, pointerEvents: 'none' }} />
                            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 20, width: '40px', background: 'linear-gradient(to left, #F8FAFC, transparent)', zIndex: 2, pointerEvents: 'none' }} />
                            <div
                                ref={carouselRef}
                                onMouseEnter={() => setCarouselPaused(true)}
                                onMouseLeave={() => setCarouselPaused(false)}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                                style={{ display: 'flex', gap: '16px', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: '12px', cursor: 'grab', userSelect: 'none' }}
                            >
                                {[...news, ...news, ...news].map((item, idx) => (
                                    <div
                                        key={`${item.id}-${idx}`}
                                        style={{ flex: '0 0 var(--news-card-w, 300px)', width: 'var(--news-card-w, 300px)', background: 'white', border: '1px solid #E2E8F0', borderTop: '3px solid #003366', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 4px rgba(0,51,102,0.06)', transition: 'transform 0.2s, box-shadow 0.2s', scrollSnapAlign: 'start' }}
                                        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(0,51,102,0.12)'; }}
                                        onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,51,102,0.06)'; }}
                                    >
                                        <div style={{ padding: '1.125rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                                                <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 9px', borderRadius: '100px', fontSize: '0.62rem', fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                                                    {item.source || 'News'}
                                                </span>
                                                <span style={{ fontSize: '0.68rem', color: '#94A3B8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                    {fmtDate(item.published_at || item.created_at)}
                                                </span>
                                            </div>
                                            <h3 style={{ fontSize: '0.925rem', fontWeight: '700', color: '#1E293B', lineHeight: '1.5', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.77em' }}>
                                                {item.title}
                                            </h3>
                                            <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: '1.65', flexGrow: 1, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {(item.summary || '').slice(0, 150)}{(item.summary || '').length > 150 ? '…' : ''}
                                            </p>
                                            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', marginTop: 'auto' }}>
                                                {(item.link || item.article_url) ? (
                                                    <a href={item.article_url || item.link} target="_blank" rel="noopener noreferrer"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#003366', fontWeight: '700', fontSize: '0.8rem', textDecoration: 'none', transition: 'gap 0.15s' }}
                                                        onMouseOver={e => e.currentTarget.style.gap = '9px'}
                                                        onMouseOut={e => e.currentTarget.style.gap = '5px'}>
                                                        Read Article <ChevronRight size={13} />
                                                    </a>
                                                ) : (
                                                    <button onClick={() => setExpandedNews(item)}
                                                        style={{ background: 'none', border: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#003366', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'gap 0.15s' }}
                                                        onMouseOver={e => e.currentTarget.style.gap = '9px'}
                                                        onMouseOut={e => e.currentTarget.style.gap = '5px'}>
                                                        Read More <ChevronRight size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <a href="/news"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '0.75rem 1.875rem', background: '#003366', color: 'white', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', textDecoration: 'none', boxShadow: '0 3px 12px rgba(0,51,102,0.18)', transition: 'all 0.2s' }}
                                onMouseOver={e => { e.currentTarget.style.background = '#002244'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#003366'; e.currentTarget.style.transform = 'none'; }}>
                                View All News &amp; Updates <ChevronRight size={15} />
                            </a>
                        </div>
                    </>)}
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                7. UPCOMING EVENTS
            ══════════════════════════════════════════════════════════════ */}
            <section ref={featuredEventsRef} id="featured-events" style={{ background: '#F0F5FF', ...SECTION_STYLE, borderBottom: '1px solid #DBEAFE' }}>
                <div style={{ ...INNER, padding: '0 clamp(1rem, 4vw, 3rem)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <SectionLabel>Events</SectionLabel>
                            <h2 style={{ fontSize: 'clamp(1.3rem,2.5vw,2rem)', color: '#1A202C', margin: 0, fontWeight: '800' }}>Upcoming Events</h2>
                            <p style={{ color: '#64748B', margin: '4px 0 0', fontSize: '0.88rem' }}>Webinars, seminars &amp; workshops for risk professionals</p>
                        </div>
                        <Link to="/events"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#003366', fontWeight: '700', textDecoration: 'none', fontSize: '0.875rem', border: '1.5px solid #003366', padding: '0.55rem 1rem', borderRadius: '6px', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                            onMouseOver={e => { e.currentTarget.style.background = '#003366'; e.currentTarget.style.color = 'white'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#003366'; }}>
                            View All <ArrowRight size={14} />
                        </Link>
                    </div>

                    {eventsLoading && (
                        <div className="events-grid">
                            {[1,2,3].map(i => <SkeletonEventCard key={i} />)}
                        </div>
                    )}
                    {eventsError && !eventsLoading && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#EF4444' }}>
                            <AlertCircle size={32} style={{ marginBottom: '0.75rem', opacity: 0.6 }} aria-hidden="true" />
                            <p style={{ marginBottom: '1rem' }}>{eventsError}</p>
                            <button onClick={() => fetchEvents()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                                <RefreshCw size={14} /> Try Again
                            </button>
                        </div>
                    )}
                    {!eventsLoading && !eventsError && events.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                            <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} aria-hidden="true" />
                            <p style={{ fontSize: '1.05rem' }}>No upcoming events at this time.</p>
                            <Link to="/events" style={{ color: '#003366', fontWeight: '600', textDecoration: 'none' }}>Browse past events →</Link>
                        </div>
                    )}
                    {!eventsLoading && !eventsError && events.length > 0 && (
                        <div className="events-grid">
                            {events.map(ev => {
                                const cat = (ev.event_category || '').toLowerCase();
                                const clr = CATEGORY_COLORS[cat] || { bg: '#F1F5F9', color: '#64748B' };
                                return (
                                    <div key={ev.id}
                                        style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: 'clamp(1.25rem,2.5vw,1.5rem)', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.2s,transform 0.2s' }}
                                        onMouseOver={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,51,102,0.12)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                                        onMouseOut={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'none'; }}>
                                        <span style={{ alignSelf: 'flex-start', background: clr.bg, color: clr.color, border: `1px solid ${clr.color}22`, fontSize: '0.7rem', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', marginBottom: '0.75rem' }}>{ev.event_category}</span>
                                        <h3 style={{ fontSize: 'clamp(0.9rem,1.5vw,1rem)', fontWeight: '700', color: '#1E293B', marginBottom: '0.5rem', lineHeight: '1.4', flexGrow: 1 }}>{ev.title}</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1.25rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
                                                <Calendar size={13} color={clr.color} aria-hidden="true" />
                                                {fmtDate(ev.date)}
                                                {getCountdown(ev.date) && <span style={{ background: '#DBEAFE', color: '#1D4ED8', fontSize: '0.63rem', fontWeight: '700', padding: '2px 7px', borderRadius: '100px', flexShrink: 0 }}>{getCountdown(ev.date)}</span>}
                                            </span>
                                            {ev.location && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748B' }}><MapPin size={13} color={clr.color} aria-hidden="true" /> {ev.location}</span>}
                                        </div>
                                        {user ? (
                                            <button onClick={() => setRegTarget(ev)}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#003366', color: 'white', padding: '0.65rem 1rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.82rem', border: 'none', cursor: 'pointer', transition: 'background 0.15s', width: '100%' }}
                                                onMouseOver={e => e.currentTarget.style.background = '#00509E'}
                                                onMouseOut={e => e.currentTarget.style.background = '#003366'}>
                                                Register Now <ArrowRight size={13} />
                                            </button>
                                        ) : (
                                            <Link to="/login?redirect=/events"
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#003366', color: 'white', padding: '0.65rem 1rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.82rem', textDecoration: 'none', transition: 'background 0.15s' }}
                                                onMouseOver={e => e.currentTarget.style.background = '#00509E'}
                                                onMouseOut={e => e.currentTarget.style.background = '#003366'}>
                                                Login to Register <ArrowRight size={13} />
                                            </Link>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                8. MEMBERSHIP CTA BANNER
            ══════════════════════════════════════════════════════════════ */}
            <section style={{ background: '#F8FAFC', ...SECTION_STYLE }}>
                <div style={{ ...INNER, padding: '0 clamp(1rem, 4vw, 3rem)' }}>
                    <div style={{ background: 'linear-gradient(135deg,#002855 0%,#003d80 100%)', borderRadius: '20px', padding: 'clamp(2rem,5vw,4rem) clamp(1.5rem,4vw,3rem)', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,40,85,0.18)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} aria-hidden="true" />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: '100px', marginBottom: '1.25rem' }}>Join Today</span>
                            <h2 style={{ color: 'white', fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: '800', marginBottom: '1rem', fontFamily: 'var(--font-serif)', letterSpacing: '-0.02em' }}>Join the Global Council</h2>
                            <p style={{ color: '#CBD5E1', fontSize: 'clamp(0.875rem,1.5vw,1rem)', lineHeight: '1.75', marginBottom: '2.25rem', maxWidth: '560px', margin: '0 auto 2.25rem' }}>
                                Access exclusive risk assessment templates, peer benchmarking data, and executive briefings. Join a network of over 25 global organisations committed to responsible AI.
                            </p>
                            <div className="cta-btns">
                                <Link to="/membership"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'white', color: '#003366', padding: 'clamp(0.7rem,2vw,0.85rem) clamp(1.25rem,3vw,2rem)', borderRadius: '6px', fontWeight: '700', fontSize: 'clamp(0.85rem,1.5vw,0.95rem)', textDecoration: 'none', transition: 'box-shadow 0.15s', whiteSpace: 'nowrap' }}
                                    onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)'}
                                    onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
                                    Explore Membership
                                </Link>
                                <Link to="/contact"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.5)', padding: 'clamp(0.7rem,2vw,0.85rem) clamp(1.25rem,3vw,2rem)', borderRadius: '6px', fontWeight: '600', fontSize: 'clamp(0.85rem,1.5vw,0.95rem)', textDecoration: 'none', transition: 'border-color 0.15s,background 0.15s', whiteSpace: 'nowrap' }}
                                    onMouseOver={e => { e.currentTarget.style.borderColor = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                                    onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent'; }}>
                                    Contact Us
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* NEWS EXPAND MODAL */}
            {expandedNews && (
                <div
                    role="dialog" aria-modal="true" aria-label="News article"
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(0.75rem, 3vw, 1rem)' }}
                    onClick={() => setExpandedNews(null)}
                >
                    <div
                        style={{ background: 'white', borderRadius: '16px', padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '600px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', position: 'relative', maxHeight: '90dvh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setExpandedNews(null)}
                            aria-label="Close"
                            style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
                            <X size={22} />
                        </button>
                        <span style={{ background: '#EFF6FF', color: '#003366', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>News</span>
                        <h2 style={{ fontSize: 'clamp(1.2rem,3vw,1.5rem)', fontWeight: '800', color: '#1A202C', margin: '1rem 0 0.75rem', lineHeight: '1.3', paddingRight: '2rem' }}>{expandedNews.title}</h2>
                        <div style={{ fontSize: 'clamp(0.875rem,1.5vw,1rem)', color: '#4A5568', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{expandedNews.summary}</div>
                        {expandedNews.link && (
                            <div style={{ marginTop: '2rem' }}>
                                <a href={expandedNews.link} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#003366', color: 'white', padding: '0.65rem 1.5rem', borderRadius: '6px', textDecoration: 'none', fontWeight: '700', fontSize: '0.9rem' }}>
                                    Read Full Article <ChevronRight size={16} />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <UpgradeModal isOpen={upgradeModal.isOpen} onClose={upgradeModal.close} />
            {regTarget && <EventRegistrationModal ev={regTarget} onClose={() => setRegTarget(null)} onSuccess={() => { showToast('Successfully registered for the event!', 'success'); setRegTarget(null); }} />}
        </>
    );
};

export default Home;