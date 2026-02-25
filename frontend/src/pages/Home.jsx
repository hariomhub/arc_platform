import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Globe, ChevronLeft, ChevronRight, X, ArrowRight,
    Calendar, MapPin, CheckCircle, Lock, AlertCircle,
    RefreshCw, Newspaper,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { useModal } from '../hooks/useModal.js';
import { getNews } from '../api/news.js';
import { getEvents } from '../api/events.js';
import { formatDate } from '../utils/dateFormatter.js';
import UpgradeModal from '../components/modals/UpgradeModal.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

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
    useEffect(() => {
        if (!carouselRef.current || news.length === 0) return;
        const cards = carouselRef.current.querySelectorAll('[data-news-card]');
        if (cards[activeNewsIdx]) {
            cards[activeNewsIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
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

    return (
        <>
            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <div
                style={{
                    backgroundColor: '#002244',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '600px',
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                {/* Video background */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                    >
                        <source src="https://videos.pexels.com/video-files/3129671/3129671-hd_1920_1080_30fps.mp4" type="video/mp4" />
                    </video>
                    <div
                        style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                            background: 'linear-gradient(rgba(0,51,102,0.7), rgba(0,34,68,0.8))',
                        }}
                    />
                </div>

                <div className="container" style={{ position: 'relative', zIndex: 2, padding: '4rem 2rem', width: '100%' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
                        <div>
                            <h1
                                style={{
                                    color: 'white', marginBottom: '1.5rem', lineHeight: '1.1',
                                    fontSize: '3.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                    letterSpacing: '-0.02em', fontFamily: 'var(--font-serif)',
                                }}
                            >
                                Governing AI Risk, Together
                            </h1>
                            <p
                                style={{
                                    fontSize: '1.25rem', color: '#CBD5E1', marginBottom: '3rem',
                                    lineHeight: '1.7', textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                                }}
                            >
                                The world&apos;s leading independent authority on artificial intelligence risk governance — setting standards for responsible, compliant, and ethical AI systems.
                            </p>
                            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handleFrameworkCTA}
                                    style={{
                                        background: '#f9a825', color: '#002244', border: 'none',
                                        padding: '1rem 2rem', fontSize: '1rem', fontWeight: '800',
                                        borderRadius: '6px', cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                        fontFamily: 'var(--font-sans)', transition: 'transform 0.15s',
                                    }}
                                    onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                                    onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                                >
                                    Explore Framework Playbooks
                                </button>
                                <button
                                    onClick={scrollToEvents}
                                    style={{
                                        background: 'transparent', color: 'white',
                                        border: '1.5px solid rgba(255,255,255,0.5)',
                                        padding: '1rem 2rem', fontSize: '1rem', fontWeight: '700',
                                        borderRadius: '6px', cursor: 'pointer',
                                        fontFamily: 'var(--font-sans)', transition: 'border-color 0.15s',
                                    }}
                                    onMouseOver={(e) => (e.currentTarget.style.borderColor = 'white')}
                                    onMouseOut={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)')}
                                >
                                    View Upcoming Events
                                </button>
                            </div>
                        </div>

                        {/* Right: decorative card */}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div
                                style={{
                                    width: '100%', maxWidth: '520px', aspectRatio: '16/9',
                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(12px)',
                                    display: 'flex', flexDirection: 'column',
                                    justifyContent: 'center', alignItems: 'center',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                    gap: '1.5rem', padding: '2rem',
                                }}
                            >
                                {[
                                    { icon: CheckCircle, text: 'EU AI Act · NIST AI RMF · ISO 42001' },
                                    { icon: Globe, text: '500+ global member organisations' },
                                    { icon: Lock, text: 'Independent · Zero vendor bias' },
                                ].map(({ icon: Icon, text }) => (
                                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Icon size={20} color="#f9a825" />
                                        <span style={{ color: '#E2E8F0', fontSize: '0.9rem', fontWeight: '500' }}>{text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Mission & Vision cards ───────────────────────────────────── */}
            <div style={{ background: 'white', padding: '5rem 2rem', borderBottom: '1px solid #E2E8F0' }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                        <div
                            style={{
                                background: '#F0F4F8', borderRadius: '16px', padding: '2.5rem',
                                borderTop: '4px solid #003366',
                            }}
                        >
                            <h2 style={{ fontSize: '1.5rem', color: '#003366', marginBottom: '1rem' }}>Our Mission</h2>
                            <p style={{ color: '#4A5568', lineHeight: '1.8', fontSize: '1.05rem' }}>
                                To empower organisations to deploy AI technology safely, ethically, and responsibly — providing comprehensive insight reports and security assessments to align with global frameworks.
                            </p>
                        </div>
                        <div
                            style={{
                                background: '#F0F4F8', borderRadius: '16px', padding: '2.5rem',
                                borderTop: '4px solid #f9a825',
                            }}
                        >
                            <h2 style={{ fontSize: '1.5rem', color: '#003366', marginBottom: '1rem' }}>Our Vision</h2>
                            <p style={{ color: '#4A5568', lineHeight: '1.8', fontSize: '1.05rem' }}>
                                A world where artificial intelligence systems are governed with the same rigour and accountability as financial markets — transparent, auditable, and aligned with societal values.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── News Carousel ────────────────────────────────────────────── */}
            <div style={{ background: '#F8FAFC', padding: '4rem 2rem' }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.75rem', color: '#1A202C', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                            <Newspaper size={24} color="#003366" /> Latest News
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
                                            border: `1.5px solid ${idx === activeNewsIdx ? '#003366' : '#E2E8F0'}`,
                                            borderRadius: '12px',
                                            padding: '16px',
                                            boxShadow: idx === activeNewsIdx ? '0 4px 16px rgba(0,51,102,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            transition: 'border-color 0.2s, box-shadow 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ background: '#EFF6FF', color: '#003366', padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700' }}>
                                                News
                                            </span>
                                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                                                {formatDate ? formatDate(item.created_at) : new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                                            {item.link ? (
                                                <a
                                                    href={item.link}
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
                        </>
                    )}
                </div>
            </div>

            {/* ── Featured Upcoming Events ─────────────────────────────────── */}
            <div
                id="featured-events"
                ref={featuredEventsRef}
                style={{ background: 'white', padding: '5rem 2rem', borderTop: '1px solid #E2E8F0' }}
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
            <div style={{ background: '#003366', padding: '5rem 2rem', textAlign: 'center' }}>
                <div className="container" style={{ maxWidth: '720px', margin: '0 auto' }}>
                    <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: '800', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>
                        Join the Global Council
                    </h2>
                    <p style={{ color: '#CBD5E1', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '2.5rem' }}>
                        Access exclusive risk assessment templates, peer benchmarking data, and executive briefings. Join a network of over 500 global organisations committed to responsible AI.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link
                            to="/membership"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'white', color: '#003366', padding: '0.9rem 2rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.95rem', textDecoration: 'none' }}
                        >
                            Explore Membership <ArrowRight size={15} />
                        </Link>
                        <Link
                            to="/contact"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.3)', padding: '0.9rem 2rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.95rem', textDecoration: 'none' }}
                        >
                            Contact Us
                        </Link>
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
