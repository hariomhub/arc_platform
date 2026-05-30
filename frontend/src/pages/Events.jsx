import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import {
    Calendar, MapPin, ArrowRight, Monitor, BookOpen, Mic, Radio, Globe,
    AlertCircle, RefreshCw, Loader2, Plus, Pencil, Trash2, X,
    UserPlus, Check, ClipboardList, Trophy, ChevronLeft, ChevronRight,
    Linkedin, Award, BadgeCheck, Star, Mail, LogIn, Users, Clock,
    Play, Download, Share2, ExternalLink, Image, Mic2, Upload,
    Tag, Wifi, Building2, Layers,
} from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import {
    getEvents, createEvent, updateEvent, deleteEvent,
    registerForEvent, cancelEventRegistration,
    uploadEventThumbnail, uploadSpeakerPhoto,
} from '../api/events.js';
import { getNominees, getMyVotes, castVote } from '../api/nominations.js';
import { getWorkshops } from '../api/workshops.js';
import { formatDate } from '../utils/dateFormatter.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import Pagination from '../components/common/Pagination.jsx';

// ─── Body scroll lock hook ────────────────────────────────────────────────────
const useBodyScrollLock = (locked) => {
    useEffect(() => {
        if (locked) {
            const scrollY = window.scrollY;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            return () => {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                window.scrollTo(0, scrollY);
            };
        }
    }, [locked]);
};

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_META = {
    webinar:    { color: '#1D4ED8', bg: '#EFF6FF',  icon: <Monitor size={13} /> },
    seminar:    { color: '#16A34A', bg: '#F0FDF4',  icon: <BookOpen size={13} /> },
    workshop:   { color: '#D97706', bg: '#FFFBEB',  icon: <Mic size={13} /> },
    podcast:    { color: '#7C3AED', bg: '#FAF5FF',  icon: <Radio size={13} /> },
    conference: { color: '#0891B2', bg: '#ECFEFF',  icon: <Layers size={13} /> },
};
const EVENT_MODE_META = {
    online:    { label: 'Online',    icon: <Wifi size={11} />,      color: '#0284C7', bg: '#F0F9FF' },
    in_person: { label: 'In-Person', icon: <Building2 size={11} />, color: '#059669', bg: '#F0FDF4' },
    hybrid:    { label: 'Hybrid',    icon: <Globe size={11} />,     color: '#7C3AED', bg: '#FAF5FF' },
};
const CATEGORIES = ['webinar', 'seminar', 'workshop', 'podcast', 'conference'];
const TABS = ['upcoming', 'past'];
const ITEMS_PER_PAGE = 9;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getImageUrl = (url) =>
    url ? (url.startsWith('http') ? url : `http://localhost:5000/${url}`) : null;

/**
 * Render a plain-text description that may contain newlines and bullet prefixes
 * (-, •, *) into React elements with proper formatting.
 */
const renderDescription = (text) => {
    if (!text) return null;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const bulletRe = /^[-•*]\s+/;
    const bulletLines = lines.filter(l => bulletRe.test(l));
    const isMostlyBullets = bulletLines.length > lines.length / 2;

    if (isMostlyBullets) {
        // Group consecutive bullets into <ul>, prose into <p>
        const elements = [];
        let bulletBuffer = [];
        const flushBullets = () => {
            if (bulletBuffer.length) {
                elements.push(
                    <ul key={elements.length} style={{ margin: '0 0 0.75rem 1.25rem', padding: 0, listStyleType: 'disc' }}>
                        {bulletBuffer.map((b, i) => (
                            <li key={i} style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.75', marginBottom: '4px' }}>
                                {b.replace(bulletRe, '')}
                            </li>
                        ))}
                    </ul>
                );
                bulletBuffer = [];
            }
        };
        lines.forEach(line => {
            if (bulletRe.test(line)) {
                bulletBuffer.push(line);
            } else {
                flushBullets();
                elements.push(
                    <p key={elements.length} style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#374151', lineHeight: '1.75' }}>
                        {line}
                    </p>
                );
            }
        });
        flushBullets();
        return <>{elements}</>;
    }

    // Prose — render each non-empty line as a paragraph
    return (
        <>
            {lines.map((line, i) => (
                <p key={i} style={{ margin: '0 0 0.65rem', fontSize: '0.875rem', color: '#374151', lineHeight: '1.75' }}>
                    {line}
                </p>
            ))}
        </>
    );
};

/**
 * Generate an .ics file download and Google Calendar link for an event.
 */
const buildCalendarLinks = (ev) => {
    const start = new Date(ev.date);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // assume 1 hour
    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Risk AI Council//Events//EN',
        'BEGIN:VEVENT',
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${ev.title}`,
        `DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n').slice(0, 500)}`,
        `LOCATION:${ev.location || 'Online'}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');

    const icsUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

    const gcUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${encodeURIComponent(ev.title)}` +
        `&dates=${fmt(start)}/${fmt(end)}` +
        `&details=${encodeURIComponent((ev.description || '').slice(0, 500))}` +
        `&location=${encodeURIComponent(ev.location || 'Online')}`;

    return { icsUrl, gcUrl };
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ height: '160px', background: '#E2E8F0', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ padding: '1.25rem' }}>
            <div style={{ height: '20px', width: '30%', background: '#E2E8F0', borderRadius: '20px', marginBottom: '0.75rem', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: '16px', width: '90%', background: '#E2E8F0', borderRadius: '4px', marginBottom: '6px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: '12px', width: '60%', background: '#E2E8F0', borderRadius: '4px', marginBottom: '1rem', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: '36px', width: '100%', background: '#E2E8F0', borderRadius: '6px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        </div>
    </div>
);

// ─── Timeline badge colours ───────────────────────────────────────────────────
const TIMELINE_META = {
    quarterly:   { label: 'Quarterly',   color: '#7C3AED', bg: '#F5F3FF' },
    'half-yearly': { label: 'Half-Yearly', color: '#0284C7', bg: '#EFF6FF' },
    yearly:      { label: 'Yearly',      color: '#059669', bg: '#F0FDF4' },
};

// ─── Vote Options Modal ───────────────────────────────────────────────────────
const VoteOptionsModal = ({ nominee, onClose, onVoteSuccess }) => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const recaptchaRef = useRef(null);
    const [anonymousEmail, setAnonymousEmail] = useState('');
    const [voting, setVoting] = useState(false);
    const [voteError, setVoteError] = useState('');
    const [recaptchaToken, setRecaptchaToken] = useState('');
    const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    useBodyScrollLock(true);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleAnonymousVote = async (e) => {
        e.preventDefault();
        setVoteError('');
        if (!anonymousEmail.trim()) { setVoteError('Please enter your email address'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(anonymousEmail)) { setVoteError('Please enter a valid email address'); return; }
        let token = recaptchaToken;
        if (!token && recaptchaRef.current) {
            try { token = await recaptchaRef.current.executeAsync(); setRecaptchaToken(token); }
            catch { setVoteError('reCAPTCHA verification failed. Please try again.'); return; }
        }
        if (!token) { setVoteError('Please complete the reCAPTCHA verification'); return; }
        setVoting(true);
        try {
            await castVote(nominee.id, { isAnonymous: true, anonymousEmail: anonymousEmail.trim(), recaptchaToken: token });
            showToast('Your vote has been cast successfully!', 'success');
            onClose();
            if (onVoteSuccess) onVoteSuccess(nominee.category_id);
        } catch (err) {
            setVoteError(getErrorMessage(err) || 'Failed to cast vote. Please try again.');
            if (recaptchaRef.current) { recaptchaRef.current.reset(); setRecaptchaToken(''); }
        } finally { setVoting(false); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(3px)' }} onClick={onClose}>
            <div style={{ background: '#FFFFFF', borderRadius: '12px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #E5E7EB', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <div style={{ borderBottom: '1px solid #F3F4F6', padding: '1.75rem 2rem 1.5rem' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '0.25rem' }} onMouseOver={e => e.currentTarget.style.color = '#111827'} onMouseOut={e => e.currentTarget.style.color = '#6B7280'}><X size={20} strokeWidth={2} /></button>
                    <h2 style={{ color: '#111827', fontSize: '1.5rem', fontWeight: '600', margin: '0 0 0.5rem', letterSpacing: '-0.01em' }}>Cast Your Vote</h2>
                    <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>{nominee.name} • {nominee.category_name}</p>
                </div>
                <div style={{ padding: '2rem' }}>
                    {voteError && (
                        <div style={{ display: 'flex', gap: '10px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '8px', padding: '0.875rem 1rem', color: '#991B1B', fontSize: '0.875rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} /><span>{voteError}</span>
                        </div>
                    )}
                    <button onClick={() => navigate('/login?redirect=/events')} type="button" style={{ width: '100%', background: '#111827', color: 'white', border: 'none', borderRadius: '8px', padding: '0.875rem 1.25rem', fontWeight: '600', fontSize: '0.9375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.15s', fontFamily: 'inherit', marginBottom: '0.75rem' }} onMouseOver={e => e.currentTarget.style.background = '#1F2937'} onMouseOut={e => e.currentTarget.style.background = '#111827'}>
                        <LogIn size={18} strokeWidth={2} /> Login to Vote
                    </button>
                    <p style={{ margin: '0 0 1.5rem', fontSize: '0.8125rem', color: '#9CA3AF', textAlign: 'center' }}>Have an account? Sign in to continue</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} /><span style={{ color: '#9CA3AF', fontSize: '0.8125rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or</span><div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
                    </div>
                    <form onSubmit={handleAnonymousVote}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Email Address</label>
                            <input type="email" placeholder="your.email@example.com" value={anonymousEmail} onChange={e => setAnonymousEmail(e.target.value)} disabled={voting}
                                style={{ width: '100%', padding: '0.75rem 0.875rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.9375rem', outline: 'none', fontFamily: 'inherit', background: voting ? '#F9FAFB' : 'white', color: '#111827', boxSizing: 'border-box' }}
                                onFocus={e => { e.target.style.borderColor = '#111827'; e.target.style.boxShadow = '0 0 0 3px rgba(17,24,39,0.05)'; }} onBlur={e => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; }} />
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: '#6B7280' }}>Used only to prevent duplicate votes</p>
                        </div>
                        {RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY !== 'your_recaptcha_site_key_here' && (
                            <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
                                <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} size="invisible" onChange={token => setRecaptchaToken(token)} />
                            </div>
                        )}
                        <button type="submit" disabled={voting} style={{ width: '100%', background: voting ? '#D1D5DB' : '#111827', color: 'white', border: 'none', borderRadius: '8px', padding: '0.875rem 1.25rem', fontWeight: '600', fontSize: '0.9375rem', cursor: voting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.15s', fontFamily: 'inherit' }} onMouseOver={e => { if (!voting) e.currentTarget.style.background = '#1F2937'; }} onMouseOut={e => { if (!voting) e.currentTarget.style.background = '#111827'; }}>
                            {voting ? <><Loader2 size={18} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <>Submit Vote</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// ─── Nominee Card ─────────────────────────────────────────────────────────────
const NomineeCard = ({ nominee, onClick, isWinner = false }) => {
    const tl = TIMELINE_META[nominee.category_timeline] || TIMELINE_META.yearly;
    const [hovered, setHovered] = useState(false);
    const photoUrl = getImageUrl(nominee.photo_url);
    const accentColor = isWinner ? '#92400E' : '#1D4ED8';
    const accentBg = isWinner ? '#FFFBEB' : '#EFF6FF';
    const firstAchievement = nominee.achievements ? nominee.achievements.split(';')[0]?.trim() : null;

    return (
        <div onClick={() => onClick(nominee)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{ background: 'white', borderRadius: '14px', border: `1px solid ${hovered ? (isWinner ? '#FCD34D' : '#93C5FD') : '#E2E8F0'}`, cursor: 'pointer', flexShrink: 0, width: 'clamp(240px,30vw,300px)', boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.06)', transform: hovered ? 'translateY(-5px)' : 'translateY(0)', transition: 'all 0.22s ease', position: 'relative', overflow: 'hidden' }}>
            <div style={{ height: '3px', background: isWinner ? 'linear-gradient(90deg,#F59E0B,#FBBF24,#F59E0B)' : 'linear-gradient(90deg,#2563EB,#3B82F6)' }} />
            <div style={{ padding: '1.2rem 1.25rem 1.05rem' }}>
                {isWinner && (
                    <div style={{ position: 'absolute', top: '14px', right: '14px', background: '#FEF3C7', color: '#92400E', fontSize: '0.58rem', fontWeight: '800', padding: '3px 9px', borderRadius: '20px', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: '3px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        <Trophy size={8} /> Winner
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0, background: photoUrl ? `url(${photoUrl}) center/cover no-repeat` : `linear-gradient(135deg,${isWinner ? '#D97706' : '#1E40AF'} 0%,${isWinner ? '#FBBF24' : '#3B82F6'} 100%)`, border: `2px solid ${isWinner ? '#FDE68A' : '#DBEAFE'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: '800', color: 'white' }}>
                        {!photoUrl && nominee.name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.93rem', color: '#111827', lineHeight: '1.3', marginBottom: '2px', paddingRight: isWinner ? '60px' : 0 }}>{nominee.name}</div>
                        <div style={{ fontSize: '0.73rem', color: '#6B7280', lineHeight: '1.4' }}>{nominee.designation}</div>
                        {nominee.company && <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nominee.company}</div>}
                    </div>
                </div>
                {firstAchievement && <p style={{ fontSize: '0.73rem', color: '#6B7280', lineHeight: '1.55', margin: '0 0 0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{firstAchievement}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '5px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                        <span style={{ background: accentBg, color: accentColor, fontSize: '0.6rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nominee.category_name}</span>
                        <span style={{ background: '#F9FAFB', color: '#6B7280', fontSize: '0.6rem', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', border: '1px solid #E5E7EB' }}>{tl.label}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: hovered ? accentColor : '#9CA3AF', transition: 'color 0.18s', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {isWinner ? 'View' : 'Vote'}<ChevronRight size={11} />
                    </span>
                </div>
            </div>
        </div>
    );
};

// ─── Nominee Detail Modal ─────────────────────────────────────────────────────
const NomineeModal = ({ nominee, onClose, myVotedCategoryIds, onVoteSuccess }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [voting, setVoting] = useState(false);
    const [voted, setVoted] = useState(false);
    const [voteError, setVoteError] = useState('');
    const [showVoteOptions, setShowVoteOptions] = useState(false);

    useBodyScrollLock(true);

    const tl = TIMELINE_META[nominee.category_timeline] || TIMELINE_META.yearly;
    const hasVoted = voted || (myVotedCategoryIds || []).includes(nominee.category_id);
    const isWinnerNominee = !!nominee.is_winner;
    const achievements = nominee.achievements ? nominee.achievements.split(';').map(s => s.trim()).filter(Boolean) : [];

    const handleVote = async () => {
        if (!user) { setShowVoteOptions(true); return; }
        setVoting(true); setVoteError('');
        try {
            await castVote(nominee.id);
            setVoted(true);
            showToast('Your vote has been cast!', 'success');
            if (onVoteSuccess) onVoteSuccess(nominee.category_id);
        } catch (err) {
            const msg = getErrorMessage(err);
            if (msg?.includes('already voted') || err?.response?.status === 409) { setVoted(true); setVoteError('You have already voted in this category.'); }
            else setVoteError(msg || 'Failed to cast vote. Please try again.');
        } finally { setVoting(false); }
    };

    const photoUrl = getImageUrl(nominee.photo_url);
    const accentColor = isWinnerNominee ? '#D97706' : '#0284C7';
    const initials = nominee.name?.split(' ').map(w => w[0]).slice(0, 2).join('') || '?';

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#FAFAFA', borderRadius: '16px', maxWidth: '580px', width: '100%', maxHeight: '90dvh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.18)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '14px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}><X size={15} /></button>
                <div style={{ background: 'white', borderRadius: '16px 16px 0 0', padding: 'clamp(1.25rem,3vw,1.75rem)', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'flex', gap: 'clamp(0.75rem,2vw,1.25rem)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '12px', flexShrink: 0, background: photoUrl ? `url(${photoUrl}) center/cover no-repeat` : `linear-gradient(145deg,${isWinnerNominee ? '#D97706' : '#1D4ED8'} 0%,${isWinnerNominee ? '#F59E0B' : '#3B82F6'} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '700', color: 'white' }}>{!photoUrl && initials}</div>
                        <div style={{ flex: 1, minWidth: '160px', paddingRight: '2rem' }}>
                            {nominee.award_name && <p style={{ margin: '0 0 5px', fontSize: '0.68rem', fontWeight: '700', color: isWinnerNominee ? '#D97706' : '#2563EB', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{nominee.award_name}</p>}
                            <h2 style={{ margin: '0 0 3px', fontSize: 'clamp(1.1rem,3vw,1.3rem)', fontWeight: '800', color: '#111827', lineHeight: '1.25', letterSpacing: '-0.01em' }}>{nominee.name}</h2>
                            {nominee.designation && <p style={{ margin: '0 0 2px', fontSize: '0.82rem', color: '#4B5563' }}>{nominee.designation}</p>}
                            {nominee.company && <p style={{ margin: 0, fontSize: '0.78rem', color: '#9CA3AF' }}>{nominee.company}</p>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {isWinnerNominee && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', fontSize: '0.63rem', fontWeight: '700', padding: '3px 10px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}><Trophy size={9} /> Winner</span>}
                        {nominee.category_name && <span style={{ fontSize: '0.7rem', fontWeight: '600', color: isWinnerNominee ? '#92400E' : '#1D4ED8', background: isWinnerNominee ? '#FFFBEB' : '#EFF6FF', padding: '3px 10px', borderRadius: '6px' }}>{nominee.category_name}</span>}
                        <span style={{ fontSize: '0.7rem', fontWeight: '600', color: tl.color, background: tl.bg, padding: '3px 10px', borderRadius: '6px' }}>{tl.label}</span>
                        {nominee.linkedin_url && <a href={nominee.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: '600', color: '#0077B5', background: '#F0F9FF', padding: '3px 10px', borderRadius: '6px', textDecoration: 'none', marginLeft: 'auto' }} onMouseOver={e => e.currentTarget.style.background = '#E0F2FE'} onMouseOut={e => e.currentTarget.style.background = '#F0F9FF'}><Linkedin size={11} /> LinkedIn</a>}
                    </div>
                </div>
                <div style={{ padding: 'clamp(1rem,3vw,1.5rem) clamp(1.25rem,3vw,1.75rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {nominee.description && <div><p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>About</p><p style={{ margin: 0, fontSize: '0.875rem', color: '#374151', lineHeight: '1.75' }}>{nominee.description}</p></div>}
                    {achievements.length > 0 && (
                        <div>
                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.7rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Key Achievements</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {achievements.map((a, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: isWinnerNominee ? '#FEF3C7' : '#EFF6FF', color: isWinnerNominee ? '#D97706' : '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
                                        <p style={{ margin: 0, fontSize: '0.845rem', color: '#374151', lineHeight: '1.65' }}>{a}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '1.25rem' }}>
                        {isWinnerNominee ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '0.85rem 1.25rem', color: '#92400E', fontWeight: '700', fontSize: '0.88rem' }}>
                                <Trophy size={17} color="#D97706" /> Award Winner — Congratulations!
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {voteError && !hasVoted && <div style={{ display: 'flex', gap: '8px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.6rem 0.9rem', color: '#B91C1C', fontSize: '0.8rem', alignItems: 'center' }}><AlertCircle size={13} style={{ flexShrink: 0 }} />{voteError}</div>}
                                {hasVoted ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '0.85rem 1.25rem', color: '#15803D', fontWeight: '700', fontSize: '0.88rem' }}><Check size={17} /> Vote recorded — thank you!</div>
                                ) : (
                                    <button onClick={handleVote} disabled={voting} style={{ background: voting ? '#9CA3AF' : '#111827', color: 'white', border: 'none', borderRadius: '10px', padding: '0.8rem 1.5rem', fontWeight: '700', fontSize: '0.9rem', cursor: voting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', transition: 'background 0.15s', fontFamily: 'inherit' }} onMouseOver={e => { if (!voting) e.currentTarget.style.background = '#1F2937'; }} onMouseOut={e => { e.currentTarget.style.background = voting ? '#9CA3AF' : '#111827'; }}>
                                        {voting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : 'Cast Your Vote'}
                                    </button>
                                )}
                                <p style={{ margin: 0, fontSize: '0.71rem', color: '#9CA3AF', textAlign: 'center' }}>{user ? 'One vote per category.' : 'Click to vote — login or vote anonymously.'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {showVoteOptions && <VoteOptionsModal nominee={nominee} onClose={() => setShowVoteOptions(false)} onVoteSuccess={categoryId => { setVoted(true); setShowVoteOptions(false); if (onVoteSuccess) onVoteSuccess(categoryId); }} />}
        </div>
    );
};

// ─── Infinite Marquee Track ───────────────────────────────────────────────────
const MarqueeTrack = ({ items, isWinner, onSelect, speed = 0.45 }) => {
    const trackRef = useRef(null);
    const rafRef = useRef(null);
    const paused = useRef(false);
    const resumeTimer = useRef(null);
    const [btnHover, setBtnHover] = useState(null);
    const loopItems = items.length < 4 ? [...items, ...items, ...items] : [...items, ...items];

    useEffect(() => {
        if (!items.length) return;
        const animate = () => {
            const el = trackRef.current;
            if (el && !paused.current) {
                el.scrollLeft += speed;
                const half = Math.floor(el.scrollWidth / 2);
                if (el.scrollLeft >= half) el.scrollLeft -= half;
            }
            rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [items, speed]);

    const scrollBy = (dir) => {
        const el = trackRef.current;
        if (!el) return;
        paused.current = true;
        clearTimeout(resumeTimer.current);
        const STEP = 320, start = el.scrollLeft, target = start + dir * STEP, duration = 380, t0 = performance.now();
        const run = (now) => {
            const p = Math.min((now - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            let next = start + (target - start) * eased;
            const half = Math.floor(el.scrollWidth / 2);
            if (next >= half) next -= half;
            else if (next < 0) next += half;
            el.scrollLeft = next;
            if (p < 1) requestAnimationFrame(run);
            else resumeTimer.current = setTimeout(() => { paused.current = false; }, 1800);
        };
        requestAnimationFrame(run);
    };

    const btnBase = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #E2E8F0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', transition: 'box-shadow 0.15s, background 0.15s', color: '#374151' };
    if (!items.length) return null;

    return (
        <div style={{ position: 'relative', padding: '10px 0', margin: '-10px 0' }}>
            <button onClick={() => scrollBy(-1)} onMouseEnter={() => setBtnHover('left')} onMouseLeave={() => setBtnHover(null)} style={{ ...btnBase, left: '4px', background: btnHover === 'left' ? '#F9FAFB' : 'white', boxShadow: btnHover === 'left' ? '0 4px 14px rgba(0,0,0,0.14)' : '0 2px 8px rgba(0,0,0,0.10)' }}><ChevronLeft size={16} /></button>
            <button onClick={() => scrollBy(1)} onMouseEnter={() => setBtnHover('right')} onMouseLeave={() => setBtnHover(null)} style={{ ...btnBase, right: '4px', background: btnHover === 'right' ? '#F9FAFB' : 'white', boxShadow: btnHover === 'right' ? '0 4px 14px rgba(0,0,0,0.14)' : '0 2px 8px rgba(0,0,0,0.10)' }}><ChevronRight size={16} /></button>
            <div style={{ overflow: 'hidden', margin: '0 38px' }} onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}>
                <div style={{ position: 'absolute', left: '38px', top: 0, bottom: 0, width: '48px', background: 'linear-gradient(90deg,#F8FAFC 0%,transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', right: '38px', top: 0, bottom: 0, width: '48px', background: 'linear-gradient(270deg,#F8FAFC 0%,transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />
                <div ref={trackRef} style={{ display: 'flex', gap: '18px', overflowX: 'hidden' }}>
                    {loopItems.map((n, i) => <NomineeCard key={`${n.id}-${i}`} nominee={n} onClick={onSelect} isWinner={isWinner} />)}
                </div>
            </div>
        </div>
    );
};

// ─── Nominations Section ──────────────────────────────────────────────────────
const NominationsSection = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [winners, setWinners] = useState([]);
    const [winnersLoading, setWL] = useState(true);
    const [openNoms, setOpenNoms] = useState([]);
    const [votingLoading, setVL] = useState(true);
    const [myVotedIds, setMyVotedIds] = useState([]);
    const [selectedNominee, setSelected] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [winRes, openRes, voteRes] = await Promise.allSettled([
                    getNominees({ is_winner: true }),
                    getNominees({ is_winner: false }),
                    user ? getMyVotes() : Promise.resolve(null),
                ]);
                if (cancelled) return;
                if (winRes.status === 'fulfilled') setWinners(winRes.value.data?.data || []);
                if (openRes.status === 'fulfilled') setOpenNoms(openRes.value.data?.data || []);
                if (voteRes.status === 'fulfilled' && voteRes.value) setMyVotedIds((voteRes.value.data?.data || []).map(r => r.category_id));
            } finally { if (!cancelled) { setWL(false); setVL(false); } }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const handleVoteSuccess = (catId) => setMyVotedIds(prev => [...new Set([...prev, catId])]);
    const SkeletonTrack = () => (
        <div style={{ display: 'flex', gap: '18px', overflow: 'hidden', padding: '4px 0' }}>
            {[1, 2, 3, 4].map(i => <div key={i} style={{ flexShrink: 0, width: 'clamp(240px,30vw,300px)', height: '200px', borderRadius: '16px', background: '#EEF2FF', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />)}
        </div>
    );
    const EmptyTrack = ({ msg }) => (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8', background: 'white', borderRadius: '12px', border: '1px dashed #E2E8F0' }}>
            <Trophy size={32} style={{ opacity: 0.18, display: 'block', margin: '0 auto 0.5rem' }} /><p style={{ margin: 0, fontSize: '0.85rem' }}>{msg}</p>
        </div>
    );

    return (
        <section style={{ background: '#F8FAFC', padding: 'clamp(1rem,2vw,1.5rem) 0 clamp(1.5rem,3vw,2.5rem)', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 clamp(1rem,4vw,2rem)' }}>
                <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '5px 16px', marginBottom: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <Trophy size={13} color="#D97706" /><span style={{ color: '#64748B', fontWeight: '700', fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Awards & Nominations</span>
                    </div>
                    <h2 style={{ color: '#0F172A', fontSize: 'clamp(1.5rem,3.5vw,2.4rem)', fontWeight: '900', margin: '0 0 0.6rem', letterSpacing: '-0.03em', lineHeight: '1.2' }}>Recognising Industry Excellence</h2>
                    <p style={{ color: '#64748B', fontSize: '0.92rem', margin: '0 auto', maxWidth: '480px', lineHeight: '1.7' }}>Celebrating outstanding leaders in AI governance, cybersecurity and risk innovation.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
                    <div>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '0.35rem' }}><Trophy size={13} color="#D97706" /><span style={{ color: '#D97706', fontWeight: '700', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Past Winners</span></div>
                            <h3 style={{ color: '#0F172A', fontSize: 'clamp(1rem,2vw,1.35rem)', fontWeight: '800', margin: '0 0 0.3rem', letterSpacing: '-0.025em' }}>Award Winners</h3>
                            <p style={{ color: '#64748B', fontSize: '0.84rem', margin: 0, maxWidth: '460px', lineHeight: '1.6' }}>Celebrating professionals who have shaped AI governance and security excellence.</p>
                        </div>
                        {winnersLoading ? <SkeletonTrack /> : winners.length === 0 ? <EmptyTrack msg="No past winners announced yet." /> : <MarqueeTrack items={winners} isWinner={true} onSelect={setSelected} speed={0.35} />}
                        {!winnersLoading && winners.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                                <button onClick={() => navigate('/winners')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,51,102,0.2)', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = '#002147'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseOut={e => { e.currentTarget.style.background = '#003366'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                    View All Winners <ArrowRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                    <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,#E2E8F0 20%,#E2E8F0 80%,transparent)' }} />
                    <div>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '0.35rem' }}><Award size={13} color="#0284C7" /><span style={{ color: '#0284C7', fontWeight: '700', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Currently Open</span></div>
                            <h3 style={{ color: '#0F172A', fontSize: 'clamp(1rem,2vw,1.35rem)', fontWeight: '800', margin: '0 0 0.3rem', letterSpacing: '-0.025em' }}>Open for Voting</h3>
                            <p style={{ color: '#64748B', fontSize: '0.84rem', margin: 0, maxWidth: '460px', lineHeight: '1.6' }}>Cast your vote for this cycle's nominees — one vote per category, per member.</p>
                        </div>
                        {votingLoading ? <SkeletonTrack /> : openNoms.length === 0 ? <EmptyTrack msg="No open nominations right now." /> : <MarqueeTrack items={openNoms} isWinner={false} onSelect={setSelected} speed={0.48} />}
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.75rem' }}>
                    <button onClick={() => navigate('/nominees')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,51,102,0.2)', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = '#002147'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseOut={e => { e.currentTarget.style.background = '#003366'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                        View All Nominees <ArrowRight size={14} />
                    </button>
                </div>
            </div>
            {selectedNominee && <NomineeModal nominee={selectedNominee} onClose={() => setSelected(null)} myVotedCategoryIds={myVotedIds} onVoteSuccess={handleVoteSuccess} />}
        </section>
    );
};

// ─── Event Card ───────────────────────────────────────────────────────────────
const EventCard = ({ ev, isAdmin, onEdit, onDelete, onViewDetail }) => {
    const cat = (ev.event_category || '').toLowerCase();
    const meta = CATEGORY_META[cat] || { color: '#64748B', bg: '#F1F5F9', icon: <Calendar size={13} /> };
    const modeMeta = EVENT_MODE_META[ev.event_mode] || EVENT_MODE_META.online;
    const isPast = !ev.is_upcoming;
    const thumbnailUrl = getImageUrl(ev.thumbnail_url || ev.banner_image);
    const speakerPhotoUrl = getImageUrl(ev.speaker_photo_url);
    const seatsLeft = ev.max_capacity ? ev.max_capacity - (ev.registered_count || 0) : null;
    const isFull = seatsLeft !== null && seatsLeft <= 0;

    return (
        <div
            onClick={() => onViewDetail(ev)}
            style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.2s,transform 0.2s,border-color 0.2s', overflow: 'hidden', cursor: 'pointer' }}
            onMouseOver={e => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,51,102,0.14)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
            onMouseOut={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>

            {/* Thumbnail */}
            <div style={{ position: 'relative', height: '168px', background: thumbnailUrl ? `url("${thumbnailUrl}") center/cover no-repeat` : `linear-gradient(135deg, ${meta.color}18 0%, ${meta.color}30 100%)`, flexShrink: 0, overflow: 'hidden' }}>
                {!thumbnailUrl && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: `${meta.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Calendar size={26} color={meta.color} />
                        </div>
                    </div>
                )}
                {/* Category badge */}
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(6px)', borderRadius: '20px', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 6px rgba(0,0,0,0.1)' }}>
                    <span style={{ color: meta.color, display: 'flex' }}>{meta.icon}</span>
                    <span style={{ color: meta.color, fontSize: '0.68rem', fontWeight: '700' }}>{ev.event_category}</span>
                </div>
                {/* Past badge */}
                {isPast && (
                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', color: 'white', fontSize: '0.62rem', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Past</div>
                )}
                {/* Full badge */}
                {!isPast && isFull && (
                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(220,38,38,0.85)', color: 'white', fontSize: '0.62rem', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>Full</div>
                )}
                {/* Gradient overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)' }} />
                {/* Mode badge bottom */}
                <div style={{ position: 'absolute', bottom: '8px', left: '10px', display: 'flex', alignItems: 'center', gap: '4px', background: modeMeta.bg, color: modeMeta.color, fontSize: '0.6rem', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', border: `1px solid ${modeMeta.color}30` }}>
                    {modeMeta.icon}{modeMeta.label}
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '1rem 1.15rem', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 0 }}>
                    <Calendar size={11} color={meta.color} />
                    {formatDate ? formatDate(ev.date) : new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {ev.time_zone && ev.time_zone !== 'UTC' && <span style={{ color: '#94A3B8' }}>· {ev.time_zone}</span>}
                </p>
                <h3 style={{ fontSize: '0.97rem', fontWeight: '700', color: '#1E293B', marginBottom: '0.4rem', lineHeight: '1.4', marginTop: 0 }}>{ev.title}</h3>
                {ev.location && <p style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem', marginTop: 0 }}><MapPin size={11} color={meta.color} /> {ev.location}</p>}

                {/* Speaker preview */}
                {ev.speaker_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '0.6rem', padding: '6px 8px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, background: speakerPhotoUrl ? `url(${speakerPhotoUrl}) center/cover no-repeat` : `linear-gradient(135deg, ${meta.color}44, ${meta.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {!speakerPhotoUrl && <Mic2 size={12} color={meta.color} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: '700', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.speaker_name}</p>
                            {ev.speaker_title && <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.speaker_title}</p>}
                        </div>
                    </div>
                )}

                {ev.description && (
                    <p style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: '1.6', flexGrow: 1, marginBottom: '0.85rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 0 }}>
                        {ev.description.replace(/^[-•*]\s+/gm, '').replace(/\r?\n/g, ' ')}
                    </p>
                )}

                {/* Capacity indicator */}
                {!isPast && seatsLeft !== null && !isFull && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '0.75rem', fontSize: '0.72rem', color: seatsLeft < 10 ? '#DC2626' : '#64748B' }}>
                        <Users size={11} />
                        <span style={{ fontWeight: seatsLeft < 10 ? '700' : '500' }}>{seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left</span>
                    </div>
                )}

                {/* Admin actions */}
                {isAdmin && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => onEdit(ev)} title="Edit" style={{ background: '#F0F4F8', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.45rem 0.65rem', cursor: 'pointer', color: '#003366', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600' }}><Pencil size={12} /> Edit</button>
                        <button onClick={() => onDelete(ev)} title="Delete" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '0.45rem 0.65rem', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600' }}><Trash2 size={12} /> Delete</button>
                    </div>
                )}

                {/* View details hint */}
                {!isAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: 'auto', paddingTop: '0.5rem', color: '#003366', fontSize: '0.75rem', fontWeight: '700' }}>
                        View Details <ArrowRight size={12} />
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Event Detail Modal ───────────────────────────────────────────────────────
const EventDetailModal = ({ ev, onClose, isAuthenticated }) => {
    const { user } = useAuth();
    const cat = (ev.event_category || '').toLowerCase();
    const meta = CATEGORY_META[cat] || { color: '#64748B', bg: '#F1F5F9', icon: <Calendar size={14} /> };
    const modeMeta = EVENT_MODE_META[ev.event_mode] || EVENT_MODE_META.online;
    const isPast = !ev.is_upcoming;
    const thumbnailUrl = getImageUrl(ev.thumbnail_url || ev.banner_image);
    const speakerPhotoUrl = getImageUrl(ev.speaker_photo_url);
    const { icsUrl, gcUrl } = buildCalendarLinks(ev);
    const seatsLeft = ev.max_capacity ? ev.max_capacity - (ev.registered_count || 0) : null;
    const isFull = seatsLeft !== null && seatsLeft <= 0;
    const [showCalMenu, setShowCalMenu] = useState(false);

    const [isRegistering, setIsRegistering] = useState(false);
    const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', organization: '', phone: '', notes: '', consent_to_share: false });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => { const { name, value, type, checked } = e.target; setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value })); };
    const handleSubmit = async (e) => {
        e.preventDefault(); setError('');
        if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
        if (!form.consent_to_share) { setError('You must agree to share your personal details to register.'); return; }
        setSubmitting(true);
        try { await registerForEvent(ev.id, form); setSubmitted(true); }
        catch (err) { setError(getErrorMessage(err) || 'Registration failed. Please try again.'); }
        finally { setSubmitting(false); }
    };
    const iStyle = { width: '100%', padding: '0.6rem 0.9rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.875rem', color: '#1E293B', background: 'white', boxSizing: 'border-box', fontFamily: 'var(--font-sans)', outline: 'none', transition: 'border-color 0.15s' };
    const lStyle = { display: 'block', fontWeight: '600', fontSize: '0.78rem', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' };

    let tags = [];
    try { tags = ev.tags ? (Array.isArray(ev.tags) ? ev.tags : JSON.parse(ev.tags)) : []; } catch { tags = []; }

    let agendaLines = [];
    if (ev.agenda) {
        agendaLines = ev.agenda.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    }

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—';
    const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

    useBodyScrollLock(true);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const speakerInitials = ev.speaker_name
        ? ev.speaker_name.split(' ').map(w => w[0]).slice(0, 2).join('')
        : '';

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(6px)' }}
            onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                style={{ background: 'white', borderRadius: '20px', maxWidth: '680px', width: '100%', maxHeight: '92dvh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>

                {/* Close */}
                <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '24px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', zIndex: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}><X size={16} /></button>

                <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', paddingBottom: '1rem' }}>
                {/* Hero thumbnail */}
                <div style={{ aspectRatio: '16/9', width: '100%', maxHeight: '380px', background: thumbnailUrl ? `url("${thumbnailUrl}") center/cover no-repeat` : `linear-gradient(135deg, ${meta.color}18 0%, ${meta.color}40 60%, ${meta.color}25 100%)`, borderRadius: '20px 20px 0 0', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                    {!thumbnailUrl && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `${meta.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Calendar size={34} color={meta.color} />
                            </div>
                        </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }} />
                    <div style={{ position: 'absolute', bottom: '16px', right: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)', color: meta.color, fontSize: '0.7rem', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {meta.icon} {ev.event_category}
                        </span>
                        <span style={{ background: modeMeta.bg, color: modeMeta.color, fontSize: '0.7rem', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: `1px solid ${modeMeta.color}30` }}>
                            {modeMeta.icon} {modeMeta.label}
                        </span>
                        {isPast && <span style={{ background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: '0.65rem', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', backdropFilter: 'blur(4px)' }}>Past Event</span>}
                        {!isPast && isFull && <span style={{ background: 'rgba(220,38,38,0.8)', color: 'white', fontSize: '0.65rem', fontWeight: '700', padding: '4px 10px', borderRadius: '20px' }}>Registration Full</span>}
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: 'clamp(1.25rem,3vw,1.75rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Title */}
                    <div>
                        <h2 style={{ margin: '0 0 0.75rem', fontSize: 'clamp(1.2rem,3vw,1.5rem)', fontWeight: '800', color: '#0F172A', lineHeight: '1.25', letterSpacing: '-0.02em' }}>{ev.title}</h2>

                        {/* Meta row */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#475569' }}>
                                <Calendar size={15} color={meta.color} />
                                <span>{fmtDate(ev.date)}</span>
                                {fmtTime(ev.date) && <span style={{ color: '#94A3B8' }}>· {fmtTime(ev.date)}</span>}
                                {ev.time_zone && ev.time_zone !== 'UTC' && <span style={{ color: '#94A3B8', fontSize: '0.78rem' }}>({ev.time_zone})</span>}
                            </div>
                            {ev.location && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#475569' }}>
                                    <MapPin size={15} color={meta.color} /> {ev.location}
                                </div>
                            )}
                            {!isPast && ev.max_capacity && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: isFull ? '#DC2626' : (seatsLeft < 10 ? '#D97706' : '#475569'), fontWeight: isFull || seatsLeft < 10 ? '600' : '400' }}>
                                    <Users size={15} color={isFull ? '#DC2626' : (seatsLeft < 10 ? '#D97706' : meta.color)} />
                                    {isFull ? 'Registration is full' : `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} remaining (${ev.registered_count || 0} registered)`}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <Tag size={12} color="#94A3B8" />
                            {tags.map((t, i) => (
                                <span key={i} style={{ background: '#F1F5F9', color: '#475569', fontSize: '0.72rem', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>{t}</span>
                            ))}
                        </div>
                    )}

                    {/* Divider */}
                    <div style={{ height: '1px', background: 'linear-gradient(90deg, #E2E8F0, transparent)' }} />

                    {/* Description */}
                    {ev.description && (
                        <div>
                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.7rem', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>About This Event</p>
                            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #E2E8F0' }}>
                                {renderDescription(ev.description)}
                            </div>
                        </div>
                    )}

                    {/* Agenda */}
                    {agendaLines.length > 0 && (
                        <div>
                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.7rem', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Agenda</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {agendaLines.map((line, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${meta.color}18`, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '800', flexShrink: 0, marginTop: '2px' }}>{i + 1}</div>
                                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151', lineHeight: '1.6' }}>{line.replace(/^[-•*\d.]+\s+/, '')}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Speaker */}
                    {ev.speaker_name && (
                        <div>
                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.7rem', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Speaker</p>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', borderRadius: '14px', padding: '1.1rem 1.25rem', border: '1px solid #E2E8F0' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', flexShrink: 0, background: speakerPhotoUrl ? `url(${speakerPhotoUrl}) center/cover no-repeat` : `linear-gradient(135deg, ${meta.color}55, ${meta.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: '700', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', border: '2px solid white' }}>
                                    {!speakerPhotoUrl && speakerInitials}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.97rem', fontWeight: '800', color: '#0F172A' }}>{ev.speaker_name}</h4>
                                        {ev.speaker_linkedin_url && (
                                            <a href={ev.speaker_linkedin_url} target="_blank" rel="noopener noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#0077B5', fontSize: '0.7rem', fontWeight: '600', textDecoration: 'none', background: '#EFF6FF', padding: '2px 8px', borderRadius: '20px' }}
                                                onClick={e => e.stopPropagation()}>
                                                <Linkedin size={11} /> LinkedIn
                                            </a>
                                        )}
                                    </div>
                                    {ev.speaker_title && <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#475569', fontWeight: '500' }}>{ev.speaker_title}</p>}
                                    {ev.speaker_bio && <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', lineHeight: '1.7' }}>{ev.speaker_bio}</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div style={{ height: '1px', background: '#E2E8F0' }} />

                    {/* Registration Flow */}
                    {submitted ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '1rem' }}>
                            <div style={{ width: '64px', height: '64px', background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}><Check size={30} color="#059669" /></div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1E293B', marginBottom: '0.5rem' }}>You're Registered!</h3>
                            <p style={{ color: '#64748B', fontSize: '0.95rem', lineHeight: '1.7', margin: 0 }}>You have successfully registered for this event. A confirmation email has been sent.</p>
                        </div>
                    ) : isRegistering ? (
                        <div style={{ background: '#F8FAFC', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1E293B', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={18} color="#003366" /> Complete Registration</h3>
                            {error && <div style={{ display: 'flex', gap: '8px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.65rem 1rem', marginBottom: '1rem', color: '#DC2626', fontSize: '0.85rem' }}><AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />{error}</div>}
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }} noValidate>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: '0.9rem' }}>
                                    <div><label style={lStyle}>Full Name *</label><input name="name" value={form.name} onChange={handleChange} disabled={submitting} required style={iStyle} placeholder="Your full name" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                                    <div><label style={lStyle}>Email Address *</label><input name="email" type="email" value={form.email} onChange={handleChange} disabled={submitting} required style={iStyle} placeholder="you@example.com" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: '0.9rem' }}>
                                    <div><label style={lStyle}>Organization</label><input name="organization" value={form.organization} onChange={handleChange} disabled={submitting} style={iStyle} placeholder="Company / institution" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                                    <div>
                                        <label style={lStyle}>Phone Number</label>
                                        <PhoneInput country={'in'} value={form.phone} onChange={phone => setForm(f => ({ ...f, phone }))} disabled={submitting} enableSearch searchPlaceholder="Search country…"
                                            inputStyle={{ width: '100%', height: '38px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.875rem', color: '#1E293B', fontFamily: 'inherit', paddingLeft: '52px', boxSizing: 'border-box' }}
                                            buttonStyle={{ border: '1px solid #CBD5E1', borderRight: 'none', borderRadius: '8px 0 0 8px', background: 'white' }}
                                            dropdownStyle={{ fontSize: '0.85rem' }} />
                                    </div>
                                </div>
                                <div><label style={lStyle}>Additional Notes</label><textarea name="notes" value={form.notes} onChange={handleChange} disabled={submitting} rows={3} style={{ ...iStyle, resize: 'vertical' }} placeholder="Anything you'd like to share…" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                    <input type="checkbox" id="consent_to_share" name="consent_to_share" checked={form.consent_to_share} onChange={handleChange} disabled={submitting} style={{ marginTop: '3px', width: '16px', height: '16px', cursor: submitting ? 'not-allowed' : 'pointer', accentColor: '#003366', flexShrink: 0 }} />
                                    <label htmlFor="consent_to_share" style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.6', cursor: submitting ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
                                        <span style={{ fontWeight: '600', color: '#1E293B' }}>I agree to share my personal details</span> with the event organizers for registration and event communication. *
                                    </label>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '0.25rem' }}>
                                    <button type="button" onClick={() => setIsRegistering(false)} disabled={submitting} style={{ flex: 1, padding: '0.75rem', background: 'white', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
                                    <button type="submit" disabled={submitting} style={{ flex: 2, padding: '0.75rem', background: submitting ? '#94A3B8' : '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontFamily: 'var(--font-sans)' }}>
                                        {submitting && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                                        {submitting ? 'Registering…' : 'Confirm Registration'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Action buttons */}
                        {isPast ? (
                            <>
                                {ev.recording_url && (
                                    <a href={ev.recording_url} target="_blank" rel="noopener noreferrer"
                                        style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: '#003366', color: 'white', padding: '0.8rem 1.25rem', borderRadius: '10px', fontWeight: '700', fontSize: '0.875rem', textDecoration: 'none', transition: 'background 0.15s' }}
                                        onMouseOver={e => e.currentTarget.style.background = '#002147'}
                                        onMouseOut={e => e.currentTarget.style.background = '#003366'}>
                                        <Play size={16} /> Watch Recording
                                    </a>
                                )}
                                {!ev.recording_url && (
                                    <div style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: '#F1F5F9', color: '#94A3B8', padding: '0.8rem 1.25rem', borderRadius: '10px', fontWeight: '600', fontSize: '0.875rem' }}>
                                        <Clock size={16} /> Recording Coming Soon
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {isFull ? (
                                    <div style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: '#FEF2F2', color: '#DC2626', padding: '0.8rem 1.25rem', borderRadius: '10px', fontWeight: '700', fontSize: '0.875rem', border: '1px solid #FECACA' }}>
                                        <Users size={16} /> Registration Full
                                    </div>
                                ) : isAuthenticated ? (
                                    <button onClick={() => setIsRegistering(true)} style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: '#003366', color: 'white', padding: '0.8rem 1.25rem', borderRadius: '10px', fontWeight: '700', fontSize: '0.875rem', border: 'none', cursor: 'pointer', transition: 'background 0.15s', fontFamily: 'inherit' }} onMouseOver={e => e.currentTarget.style.background = '#002147'} onMouseOut={e => e.currentTarget.style.background = '#003366'}>
                                        <UserPlus size={16} /> Register Now
                                    </button>
                                ) : (
                                    <a href="/login?redirect=/events" style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: '#003366', color: 'white', padding: '0.8rem 1.25rem', borderRadius: '10px', fontWeight: '700', fontSize: '0.875rem', textDecoration: 'none' }}>
                                        <LogIn size={16} /> Login to Register
                                    </a>
                                )}
                                {ev.link && !isFull && (
                                    <a href={ev.link} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: '#F1F5F9', color: '#374151', padding: '0.8rem 1.1rem', borderRadius: '10px', fontWeight: '600', fontSize: '0.875rem', textDecoration: 'none', border: '1px solid #E2E8F0' }}
                                        onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
                                        onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}>
                                        <ExternalLink size={15} /> External Link
                                    </a>
                                )}
                                {/* Add to Calendar */}
                                <div style={{ position: 'relative' }}>
                                    <button onClick={() => setShowCalMenu(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: '#F1F5F9', color: '#374151', padding: '0.8rem 1.1rem', borderRadius: '10px', fontWeight: '600', fontSize: '0.875rem', border: '1px solid #E2E8F0', cursor: 'pointer', fontFamily: 'inherit' }} onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'} onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}>
                                        <Calendar size={15} /> Add to Calendar
                                    </button>
                                    {showCalMenu && (
                                        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, background: 'white', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0', overflow: 'hidden', zIndex: 50, minWidth: '180px' }}>
                                            <a href={gcUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.7rem 1rem', fontSize: '0.85rem', color: '#374151', textDecoration: 'none', fontWeight: '600' }} onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.background = 'white'}>
                                                <Globe size={14} color="#4285F4" /> Google Calendar
                                            </a>
                                            <a href={icsUrl} download={`${ev.title?.replace(/\s+/g, '-')}.ics`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.7rem 1rem', fontSize: '0.85rem', color: '#374151', textDecoration: 'none', fontWeight: '600', borderTop: '1px solid #F3F4F6' }} onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.background = 'white'}>
                                                <Download size={14} color="#374151" /> Download .ics
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    )}
                </div>
                </div>
            </div>
        </div>
    );
};


// ─── Image Upload Button helper ───────────────────────────────────────────────
const ImageUploadButton = ({ label, onUpload, uploading, currentUrl, accept = 'image/*' }) => {
    const fileRef = useRef(null);
    const thumbUrl = getImageUrl(currentUrl);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {thumbUrl && <img src={thumbUrl} alt={label} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }} />}
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '7px', padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: '600', color: '#374151', cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {uploading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />}
                {uploading ? 'Uploading…' : (thumbUrl ? `Change ${label}` : `Upload ${label}`)}
            </button>
            <input ref={fileRef} type="file" accept={accept} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        </div>
    );
};

// ─── Event Form Modal ─────────────────────────────────────────────────────────
const EventFormModal = ({ initial, onSave, onClose }) => {
    const { showToast } = useToast();
    const isEdit = Boolean(initial?.id);

    const [form, setForm] = useState({
        title:               initial?.title || '',
        date:                initial?.date ? new Date(initial.date).toISOString().slice(0, 16) : '',
        location:            initial?.location || '',
        description:         initial?.description || '',
        event_category:      initial?.event_category || 'webinar',
        event_mode:          initial?.event_mode || 'online',
        time_zone:           initial?.time_zone || 'Asia/Kolkata',
        link:                initial?.link || '',
        is_upcoming:         initial?.is_upcoming !== false,
        recording_url:       initial?.recording_url || '',
        speaker_name:        initial?.speaker_name || '',
        speaker_title:       initial?.speaker_title || '',
        speaker_bio:         initial?.speaker_bio || '',
        speaker_linkedin_url: initial?.speaker_linkedin_url || '',
        agenda:              initial?.agenda || '',
        tags:                Array.isArray(initial?.tags)
                                ? initial.tags.join(', ')
                                : (initial?.tags ? (typeof initial.tags === 'string' ? initial.tags : JSON.stringify(initial.tags)) : ''),
        max_capacity:        initial?.max_capacity || '',
    });

    const [savedEventId, setSavedEventId] = useState(initial?.id || null);
    const [savedEvent, setSavedEvent] = useState(initial || null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploadingThumb, setUploadingThumb] = useState(false);
    const [uploadingSpkr, setUploadingSpkr] = useState(false);

    useBodyScrollLock(true);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) { setError('Title is required.'); return; }
        if (!form.date) { setError('Date is required.'); return; }
        setError(''); setSaving(true);
        try {
            const payload = {
                ...form,
                thumbnail_url: savedEvent?.thumbnail_url || initial?.thumbnail_url || '',
                speaker_photo_url: savedEvent?.speaker_photo_url || initial?.speaker_photo_url || '',
                banner_image: savedEvent?.banner_image || initial?.banner_image || '',
                tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                max_capacity: form.max_capacity ? parseInt(form.max_capacity, 10) : null,
            };
            const result = await onSave(payload);
            // capture the saved event id for image uploads
            const eid = result?.data?.data?.id || initial?.id;
            if (eid) { setSavedEventId(eid); setSavedEvent(result?.data?.data || initial); }
        } catch (err) {
            setError(getErrorMessage(err));
            setSaving(false);
        }
    };

    const handleThumbnailUpload = async (file) => {
        if (!savedEventId) { setError('Save the event first before uploading a thumbnail.'); return; }
        setUploadingThumb(true);
        try {
            const fd = new FormData();
            fd.append('thumbnail', file);
            const res = await uploadEventThumbnail(savedEventId, fd);
            setSavedEvent(res.data?.data);
            showToast('Thumbnail uploaded!', 'success');
        } catch (err) {
            showToast(getErrorMessage(err) || 'Thumbnail upload failed.', 'error');
        } finally { setUploadingThumb(false); }
    };

    const handleSpeakerPhotoUpload = async (file) => {
        if (!savedEventId) { setError('Save the event first before uploading a speaker photo.'); return; }
        setUploadingSpkr(true);
        try {
            const fd = new FormData();
            fd.append('speaker_photo', file);
            const res = await uploadSpeakerPhoto(savedEventId, fd);
            setSavedEvent(res.data?.data);
            showToast('Speaker photo uploaded!', 'success');
        } catch (err) {
            showToast(getErrorMessage(err) || 'Speaker photo upload failed.', 'error');
        } finally { setUploadingSpkr(false); }
    };

    const iS = { width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'var(--font-sans)', outline: 'none', color: '#1E293B' };
    const lS = { display: 'block', fontWeight: '700', fontSize: '0.75rem', color: '#374151', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const sectionLabel = (txt) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0.5rem 0 0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{txt}</span>
        </div>
    );

    const COMMON_TIMEZONES = [
        'UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin',
        'America/New_York', 'America/Chicago', 'America/Los_Angeles',
        'Australia/Sydney',
    ];

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
            <div style={{ background: 'white', borderRadius: '16px', maxWidth: '640px', width: '100%', maxHeight: '92dvh', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '1.5rem 1.75rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 5, borderBottom: '1px solid #F1F5F9', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1E293B', margin: 0 }}>{isEdit ? 'Edit Event' : 'Add New Event'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}><X size={20} /></button>
                </div>

                <div style={{ overflowY: 'auto', flexGrow: 1 }}>
                <form onSubmit={handleSave} style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} noValidate>
                    {error && <div style={{ display: 'flex', gap: '8px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.75rem 1rem', color: '#DC2626', fontSize: '0.875rem' }}><AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />{error}</div>}

                    {/* Core Info */}
                    {sectionLabel('Core Details')}
                    <div><label style={lS}>Title *</label><input name="title" value={form.title} onChange={handleChange} disabled={saving} style={iS} placeholder="Event title" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div><label style={lS}>Date & Time *</label><input name="date" type="datetime-local" value={form.date} onChange={handleChange} disabled={saving} style={iS} onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                        <div><label style={lS}>Time Zone</label>
                            <select name="time_zone" value={form.time_zone} onChange={handleChange} disabled={saving} style={{ ...iS, cursor: 'pointer' }}>
                                {COMMON_TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div><label style={lS}>Category</label>
                            <select name="event_category" value={form.event_category} onChange={handleChange} disabled={saving} style={{ ...iS, cursor: 'pointer' }}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                            </select>
                        </div>
                        <div><label style={lS}>Mode</label>
                            <select name="event_mode" value={form.event_mode} onChange={handleChange} disabled={saving} style={{ ...iS, cursor: 'pointer' }}>
                                <option value="online">Online</option>
                                <option value="in_person">In-Person</option>
                                <option value="hybrid">Hybrid</option>
                            </select>
                        </div>
                    </div>
                    <div><label style={lS}>Location</label><input name="location" value={form.location} onChange={handleChange} disabled={saving} style={iS} placeholder="e.g. Online (Zoom) or Mumbai, India" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div><label style={lS}>Registration Link</label><input name="link" type="url" value={form.link} onChange={handleChange} disabled={saving} style={iS} placeholder="https://…" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                        <div><label style={lS}>Max Capacity</label><input name="max_capacity" type="number" min="1" value={form.max_capacity} onChange={handleChange} disabled={saving} style={iS} placeholder="Leave blank = unlimited" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                    </div>

                    {/* Content */}
                    {sectionLabel('Content')}
                    <div><label style={lS}>Description</label><textarea name="description" value={form.description} onChange={handleChange} disabled={saving} rows={4} style={{ ...iS, resize: 'vertical' }} placeholder={"Describe the event. Use - or • at the start of a line for bullet points.\n\n- Topic 1\n- Topic 2"} onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                    <div><label style={lS}>Agenda <span style={{ fontWeight: '500', color: '#94A3B8', fontSize: '0.7rem', textTransform: 'none', letterSpacing: 0 }}>(one item per line)</span></label><textarea name="agenda" value={form.agenda} onChange={handleChange} disabled={saving} rows={3} style={{ ...iS, resize: 'vertical' }} placeholder={"Welcome & Introductions\nKeynote Address\nQ&A Session"} onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                    <div><label style={lS}>Tags <span style={{ fontWeight: '500', color: '#94A3B8', fontSize: '0.7rem', textTransform: 'none', letterSpacing: 0 }}>(comma-separated)</span></label><input name="tags" value={form.tags} onChange={handleChange} disabled={saving} style={iS} placeholder="AI Governance, Risk, Compliance" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                    <div><label style={lS}>Recording URL <span style={{ fontWeight: '500', color: '#94A3B8', fontSize: '0.7rem', textTransform: 'none', letterSpacing: 0 }}>(after event)</span></label><input name="recording_url" type="url" value={form.recording_url} onChange={handleChange} disabled={saving} style={iS} placeholder="https://…" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>

                    {/* Thumbnail upload */}
                    {sectionLabel('Thumbnail Image')}
                    <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '1rem', border: '1px solid #E2E8F0' }}>
                        <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: '#64748B', lineHeight: '1.5' }}>
                            {savedEventId ? 'Upload a 16:9 image used as the event card preview.' : 'Save the event first, then upload a thumbnail.'}
                        </p>
                        <ImageUploadButton
                            label="Thumbnail"
                            onUpload={handleThumbnailUpload}
                            uploading={uploadingThumb}
                            currentUrl={savedEvent?.thumbnail_url}
                        />
                    </div>

                    {/* Speaker */}
                    {sectionLabel('Speaker Information')}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div><label style={lS}>Speaker Name</label><input name="speaker_name" value={form.speaker_name} onChange={handleChange} disabled={saving} style={iS} placeholder="Dr. Jane Smith" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                        <div><label style={lS}>Speaker Title</label><input name="speaker_title" value={form.speaker_title} onChange={handleChange} disabled={saving} style={iS} placeholder="Chief Risk Officer, HSBC" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                    </div>
                    <div><label style={lS}>Speaker LinkedIn</label><input name="speaker_linkedin_url" type="url" value={form.speaker_linkedin_url} onChange={handleChange} disabled={saving} style={iS} placeholder="https://linkedin.com/in/…" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                    <div><label style={lS}>Speaker Background</label><textarea name="speaker_bio" value={form.speaker_bio} onChange={handleChange} disabled={saving} rows={3} style={{ ...iS, resize: 'vertical' }} placeholder="Brief bio of the speaker…" onFocus={e => e.target.style.borderColor = '#003366'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} /></div>
                    <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '1rem', border: '1px solid #E2E8F0' }}>
                        <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: '#64748B' }}>
                            {savedEventId ? 'Upload a square headshot of the speaker.' : 'Save the event first, then upload a speaker photo.'}
                        </p>
                        <ImageUploadButton
                            label="Speaker Photo"
                            onUpload={handleSpeakerPhotoUpload}
                            uploading={uploadingSpkr}
                            currentUrl={savedEvent?.speaker_photo_url}
                        />
                    </div>

                    {/* Status */}
                    {sectionLabel('Publishing')}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <input type="checkbox" id="is_upcoming" name="is_upcoming" checked={form.is_upcoming} onChange={handleChange} disabled={saving} style={{ width: '16px', height: '16px', accentColor: '#003366' }} />
                        <label htmlFor="is_upcoming" style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>Mark as Upcoming <span style={{ color: '#94A3B8', fontWeight: '400' }}>(uncheck for past events)</span></label>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
                        <button type="button" onClick={onClose} disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.75rem', background: saving ? '#94A3B8' : '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' }}>
                            {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                            {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Event')}
                        </button>
                    </div>
                </form>
                </div>
            </div>
        </div>
    );
};

// ─── Confirm Delete ───────────────────────────────────────────────────────────
const ConfirmDeleteDialog = ({ ev, onConfirm, onCancel, deleting }) => {
    useBodyScrollLock(true);
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onCancel}>
            <div style={{ background: 'white', borderRadius: '12px', padding: 'clamp(1.25rem,3vw,2rem)', maxWidth: '420px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                <Trash2 size={32} color="#DC2626" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1E293B', marginBottom: '0.5rem' }}>Delete Event?</h3>
                <p style={{ color: '#64748B', lineHeight: '1.6', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Are you sure you want to delete <strong>"{ev?.title}"</strong>? This action cannot be undone.</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={onCancel} disabled={deleting} style={{ flex: 1, padding: '0.75rem', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: '0.75rem', background: deleting ? '#94A3B8' : '#DC2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {deleting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                        {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Infinite Workshop Marquee Track ──────────────────────────────────────────
const WorkshopMarqueeTrack = ({ items, speed = 0.45 }) => {
    const trackRef = useRef(null);
    const rafRef = useRef(null);
    const paused = useRef(false);
    const resumeTimer = useRef(null);
    const [btnHover, setBtnHover] = useState(null);
    const loopItems = items.length < 4 ? [...items, ...items, ...items] : [...items, ...items];
    const navigate = useNavigate();

    useEffect(() => {
        if (!items.length) return;
        const animate = () => {
            const el = trackRef.current;
            if (el && !paused.current) {
                el.scrollLeft += speed;
                const half = Math.floor(el.scrollWidth / 2);
                if (el.scrollLeft >= half) el.scrollLeft -= half;
            }
            rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [items, speed]);

    const scrollBy = (dir) => {
        const el = trackRef.current;
        if (!el) return;
        paused.current = true;
        clearTimeout(resumeTimer.current);
        const STEP = 320, start = el.scrollLeft, target = start + dir * STEP, duration = 380, t0 = performance.now();
        const run = (now) => {
            const p = Math.min((now - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            let next = start + (target - start) * eased;
            const half = Math.floor(el.scrollWidth / 2);
            if (next >= half) next -= half;
            else if (next < 0) next += half;
            el.scrollLeft = next;
            if (p < 1) requestAnimationFrame(run);
            else resumeTimer.current = setTimeout(() => { paused.current = false; }, 1800);
        };
        requestAnimationFrame(run);
    };

    const btnBase = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #E2E8F0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', transition: 'box-shadow 0.15s, background 0.15s', color: '#374151' };
    if (!items.length) return null;

    return (
        <div style={{ position: 'relative', padding: '10px 0', margin: '-10px 0' }}>
            <button onClick={() => scrollBy(-1)} onMouseEnter={() => setBtnHover('left')} onMouseLeave={() => setBtnHover(null)} style={{ ...btnBase, left: '4px', background: btnHover === 'left' ? '#F9FAFB' : 'white', boxShadow: btnHover === 'left' ? '0 4px 14px rgba(0,0,0,0.14)' : '0 2px 8px rgba(0,0,0,0.10)' }}><ChevronLeft size={16} /></button>
            <button onClick={() => scrollBy(1)} onMouseEnter={() => setBtnHover('right')} onMouseLeave={() => setBtnHover(null)} style={{ ...btnBase, right: '4px', background: btnHover === 'right' ? '#F9FAFB' : 'white', boxShadow: btnHover === 'right' ? '0 4px 14px rgba(0,0,0,0.14)' : '0 2px 8px rgba(0,0,0,0.10)' }}><ChevronRight size={16} /></button>
            <div style={{ overflow: 'hidden', margin: '0 38px' }} onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}>
                <div style={{ position: 'absolute', left: '38px', top: 0, bottom: 0, width: '48px', background: 'linear-gradient(90deg,#F8FAFC 0%,transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', right: '38px', top: 0, bottom: 0, width: '48px', background: 'linear-gradient(270deg,#F8FAFC 0%,transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />
                <div ref={trackRef} style={{ display: 'flex', gap: '18px', overflowX: 'hidden', padding: '10px 0' }}>
                    {loopItems.map((ws, i) => (
                        <div key={`${ws.id}-${i}`} onClick={() => navigate('/executive-workshops')} style={{ flexShrink: 0, width: 'clamp(280px, 80vw, 320px)', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#CBD5E1'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
                            <div style={{ height: '3px', background: 'linear-gradient(90deg, #7C3AED, #3B82F6)', position: 'absolute', top: 0, left: 0, right: 0 }} />
                            <p style={{ fontSize: '0.7rem', color: '#1D4ED8', fontWeight: '700', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <Calendar size={12} /> {formatDate(ws.date)}
                            </p>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1E293B', margin: '0 0 0.5rem', lineHeight: '1.3' }}>{ws.title}</h3>
                            {ws.location && <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '5px' }}><MapPin size={12} color="#059669" /> {ws.location}</p>}
                            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '5px', color: '#0F172A', fontSize: '0.75rem', fontWeight: '700' }}>
                                View Details <ArrowRight size={12} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Featured Executive Workshops ─────────────────────────────────────────────
const FeaturedWorkshopsSection = () => {
    const [workshops, setWorkshops] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let isM = true;
        getWorkshops({ limit: 10, upcoming: 'true' })
            .then(res => { if (isM) setWorkshops(res.data?.data || []); })
            .catch(() => {})
            .finally(() => { if (isM) setLoading(false); });
        return () => { isM = false; };
    }, [navigate]);

    if (loading || workshops.length === 0) return null;

    return (
        <section id="featured-workshops" style={{ padding: 'clamp(2rem,4vw,3.5rem) clamp(1rem,4vw,3rem)', background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '20px', padding: '4px 12px', marginBottom: '0.75rem', color: '#7C3AED', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            <BookOpen size={10} /> Executive Programme
                        </div>
                        <h2 style={{ color: '#0F172A', fontSize: 'clamp(1.2rem,3vw,1.6rem)', fontWeight: '900', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                            Featured Executive Workshops
                        </h2>
                        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0, maxWidth: '500px', lineHeight: '1.6' }}>Exclusive sessions designed for Board Directors and C-Suite leaders to build AI risk literacy.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={() => navigate('/executive-workshops')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'white', color: '#0F172A', border: '1px solid #E2E8F0', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.background = 'white'}>
                            View All <ArrowRight size={13} />
                        </button>
                    </div>
                </div>
                <WorkshopMarqueeTrack items={workshops} speed={0.48} />
            </div>
        </section>
    );
};

// ─── Events Page ──────────────────────────────────────────────────────────────
const Events = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { isAdmin, isCouncilMember, user } = useAuth();
    const { showToast } = useToast();

    const tab      = searchParams.get('tab') || 'upcoming';
    const category = searchParams.get('category') || 'all';
    const pageParam = parseInt(searchParams.get('page') || '1', 10);

    const [events, setEvents] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editTarget, setEditTarget]   = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting]        = useState(false);
    const [detailEvent, setDetailEvent]  = useState(null);

    useEffect(() => { document.title = 'Events | Risk AI Council (RAC)'; }, []);

    const fetchData = useCallback(async (signal) => {
        setLoading(true); setError('');
        try {
            const params = { tab, page: pageParam, limit: ITEMS_PER_PAGE };
            if (category !== 'all') params.category = category;
            const res = await getEvents(params);
            if (!signal?.aborted) {
                const payload = res.data?.data;
                setEvents(Array.isArray(payload) ? payload : (payload?.events || []));
                setTotalPages(res.data?.totalPages || 1);
            }
        } catch (err) { if (!signal?.aborted) setError(getErrorMessage(err) || 'Failed to load events.'); }
        finally { if (!signal?.aborted) setLoading(false); }
    }, [tab, category, pageParam]);

    useEffect(() => { const ctrl = new AbortController(); fetchData(ctrl.signal); return () => ctrl.abort(); }, [fetchData]);

    const setFilter = useCallback((key, value) => {
        setSearchParams(prev => { const next = new URLSearchParams(prev); next.set(key, value); if (key !== 'page') next.set('page', '1'); return next; });
    }, [setSearchParams]);

    const handleSave = useCallback(async (formData) => {
        let result;
        if (editTarget?.id) { result = await updateEvent(editTarget.id, formData); showToast('Event updated.', 'success'); }
        else { result = await createEvent(formData); showToast('Event created. You can now upload images.', 'success'); }
        setEditTarget(null); fetchData();
        return result;
    }, [editTarget, showToast, fetchData]);

    const handleDelete = useCallback(async () => {
        setDeleting(true);
        try { await deleteEvent(deleteTarget.id); showToast('Event deleted.', 'success'); setDeleteTarget(null); fetchData(); }
        catch (err) { showToast(getErrorMessage(err) || 'Delete failed.', 'error'); }
        finally { setDeleting(false); }
    }, [deleteTarget, showToast, fetchData]);

    return (
        <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
            <style>{`
                @keyframes spin            { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes skeleton-pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }

                .ev-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                    margin-bottom: 2rem;
                }
                .ev-filters {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                    align-items: center;
                }
                .ev-pills {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                }
                .ev-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
                    gap: 1.5rem;
                }
                .ev-hero-btns {
                    display: flex;
                    gap: 1rem;
                    margin-top: 2.5rem;
                    flex-wrap: wrap;
                }
                .ws-carousel-hide-scroll::-webkit-scrollbar { display: none; }
                .ws-carousel-hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 55%,#005599 100%)', padding: 'clamp(1.5rem,2.5vw,2rem) clamp(1rem,4vw,3rem)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
                <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <Calendar size={22} color="#60A5FA" />
                        <span style={{ color: '#93C5FD', fontWeight: '700', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Events &amp; Learning</span>
                    </div>
                    <h1 style={{ color: 'white', fontSize: 'clamp(1.6rem,4vw,2.75rem)', fontWeight: '800', marginBottom: '1rem', lineHeight: '1.15' }}>
                        AI Governance Events<br />for Risk AI Professionals
                    </h1>
                    <p style={{ color: '#CBD5E1', fontSize: 'clamp(0.9rem,1.5vw,1.05rem)', lineHeight: '1.7', maxWidth: '600px' }}>
                        Webinars, seminars, workshops, conferences, and podcast episodes designed for compliance leaders, risk officers, and technologists navigating the AI regulatory landscape.
                    </p>
                    <div className="ev-hero-btns">
                        <button onClick={() => document.getElementById('all-events')?.scrollIntoView({ behavior: 'smooth' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'white', color: '#003366', padding: '0.7rem 1.75rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.9rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Browse Events <ArrowRight size={14} />
                        </button>
                        <Link to="/membership" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.7rem 1.75rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.9rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            Join the Council
                        </Link>
                    </div>
                </div>
            </div>

            {/* All Events */}
            <div id="all-events" style={{ padding: 'clamp(1.5rem,4vw,3rem) clamp(1rem,4vw,3rem)' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div className="ev-toolbar">
                        <div className="ev-filters">
                            {/* Tab bar */}
                            <div style={{ display: 'flex', background: '#E2E8F0', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                                {TABS.map(t => (
                                    <button key={t} onClick={() => setFilter('tab', t)} style={{ padding: '7px clamp(10px,2vw,20px)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '700', border: 'none', cursor: 'pointer', background: tab === t ? 'white' : 'transparent', color: tab === t ? '#003366' : '#64748B', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.12)' : 'none', transition: 'all 0.15s', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </button>
                                ))}
                            </div>
                            {/* Category pills */}
                            <div className="ev-pills" role="group" aria-label="Filter by category">
                                {['all', ...CATEGORIES].map(c => (
                                    <button key={c} onClick={() => setFilter('category', c)} aria-pressed={category === c}
                                        style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', border: '1px solid', borderColor: category === c ? '#003366' : '#CBD5E1', background: category === c ? '#003366' : 'white', color: category === c ? 'white' : '#475569', transition: 'all 0.15s', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                                        {c.charAt(0).toUpperCase() + c.slice(1)}
                                    </button>
                                ))}
                                <button onClick={() => document.getElementById('featured-workshops')?.scrollIntoView({ behavior: 'smooth' })}
                                    style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', border: '1px solid #CBD5E1', background: 'white', color: '#475569', transition: 'all 0.15s', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}
                                    onMouseOver={e => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.color = '#1E293B'; }}
                                    onMouseOut={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#475569'; }}>
                                    Executive Workshops
                                </button>
                            </div>
                        </div>
                        {(isAdmin?.() || isCouncilMember?.()) && (
                            <button onClick={() => setEditTarget({})} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                <Plus size={16} /> Add Event
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: 'clamp(1.1rem,2.5vw,1.35rem)', fontWeight: '800', color: '#1E293B', margin: 0 }}>
                            {tab === 'upcoming' ? 'Upcoming Events' : 'Past Events'}
                        </h2>
                        {!loading && <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: '500' }} aria-live="polite">{events.length} event{events.length !== 1 ? 's' : ''}</span>}
                    </div>

                    {loading && <div className="ev-grid" aria-busy="true">{[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}</div>}

                    {error && !loading && (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#EF4444' }}>
                            <AlertCircle size={40} style={{ marginBottom: '1rem', opacity: 0.6 }} />
                            <p style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>{error}</p>
                            <button onClick={() => fetchData()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.7rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}><RefreshCw size={15} /> Try Again</button>
                        </div>
                    )}

                    {!loading && !error && events.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: '#94A3B8' }}>
                            <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p style={{ fontSize: '1.05rem' }}>{tab === 'upcoming' ? 'No upcoming events found.' : 'No past events found.'}</p>
                            {category !== 'all' && <button onClick={() => setFilter('category', 'all')} style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#003366', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>Clear filter →</button>}
                        </div>
                    )}

                    {!loading && !error && events.length > 0 && (
                        <>
                            <div className="ev-grid" aria-live="polite">
                                {events.map(ev => (
                                    <EventCard
                                        key={ev.id}
                                        ev={ev}
                                        isAdmin={isAdmin?.()}
                                        onEdit={e => setEditTarget(e)}
                                        onDelete={e => setDeleteTarget(e)}
                                        onViewDetail={e => setDetailEvent(e)}
                                    />
                                ))}
                            </div>
                            {totalPages > 1 && (
                                <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center' }}>
                                    <Pagination page={pageParam} totalPages={totalPages} onPageChange={p => setFilter('page', String(p))} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Featured Workshops */}
            <FeaturedWorkshopsSection />

            <NominationsSection />

            {/* CTA */}
            <div style={{ background: '#1E293B', padding: 'clamp(2rem,5vw,4rem) clamp(1rem,4vw,2rem)', textAlign: 'center' }}>
                <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                    <h2 style={{ color: 'white', fontSize: 'clamp(1.3rem,3vw,1.9rem)', fontWeight: '800', marginBottom: '0.9rem' }}>Never Miss an Event</h2>
                    <p style={{ color: '#94A3B8', fontSize: 'clamp(0.875rem,1.5vw,1rem)', lineHeight: '1.7', marginBottom: '2rem' }}>
                        Council members receive priority registration, exclusive early-access invitations, and access to all session recordings in the members library.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/membership" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#003366', color: 'white', padding: '0.8rem 2rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.92rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>Join the Council <ArrowRight size={15} /></Link>
                        <Link to="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'transparent', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.2)', padding: '0.8rem 2rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.92rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>Contact Us</Link>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {detailEvent && (
                <EventDetailModal
                    ev={detailEvent}
                    onClose={() => setDetailEvent(null)}
                    isAuthenticated={!!user}
                />
            )}
            {editTarget !== null && <EventFormModal initial={editTarget} onSave={handleSave} onClose={() => { setEditTarget(null); fetchData(); }} />}
            {deleteTarget && <ConfirmDeleteDialog ev={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />}
        </div>
    );
};

export { EventDetailModal };
export default Events;