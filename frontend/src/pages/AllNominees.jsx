import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import {
    Trophy, Search, X, ChevronLeft, ChevronRight,
    Award, BadgeCheck, Star, Linkedin, BookOpen,
    Check, Loader2, AlertCircle, Filter, Users, Mail, LogIn,
    Building2, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getNominees, getAwards, getMyVotes, castVote } from '../api/nominations.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

// ─── Timeline meta ────────────────────────────────────────────────────────────
const TIMELINE_META = {
    quarterly: { label: 'Quarterly', color: '#7C3AED', bg: '#F5F3FF' },
    'half-yearly': { label: 'Half-Yearly', color: '#0284C7', bg: '#EFF6FF' },
    yearly: { label: 'Yearly', color: '#059669', bg: '#F0FDF4' },
};

const getPhotoUrl = (photo_url) =>
    photo_url
        ? photo_url.startsWith('http') ? photo_url : `http://localhost:5000/${photo_url}`
        : null;

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

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleLoginClick = () => navigate('/login?redirect=/nominees');

    const handleAnonymousVote = async (e) => {
        e.preventDefault(); setVoteError('');
        if (!anonymousEmail.trim()) { setVoteError('Please enter your email address'); return; }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(anonymousEmail)) { setVoteError('Please enter a valid email address'); return; }
        let token = recaptchaToken;
        if (!token && recaptchaRef.current) {
            try { token = await recaptchaRef.current.executeAsync(); setRecaptchaToken(token); }
            catch { setVoteError('reCAPTCHA verification failed. Please try again.'); return; }
        }
        if (!token && RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY !== 'your_recaptcha_site_key_here') {
            setVoteError('Please complete the reCAPTCHA verification'); return;
        }
        setVoting(true);
        try {
            await castVote(nominee.id, { isAnonymous: true, anonymousEmail: anonymousEmail.trim(), recaptchaToken: token });
            showToast('Your vote has been cast successfully!', 'success');
            onClose();
            if (onVoteSuccess) onVoteSuccess(nominee.category_id);
        } catch (err) {
            const msg = getErrorMessage(err);
            setVoteError(msg || 'Failed to cast vote. Please try again.');
            if (recaptchaRef.current) { recaptchaRef.current.reset(); setRecaptchaToken(''); }
        } finally { setVoting(false); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={onClose}>
            <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '460px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', border: '1px solid #E5E7EB', position: 'relative', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                {/* Top accent */}
                <div style={{ height: '4px', background: 'linear-gradient(90deg, #003366, #0284C7)' }} />
                <div style={{ padding: '1.5rem 1.75rem 0' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#111827'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#6B7280'; }}>
                        <X size={16} />
                    </button>
                    <h2 style={{ color: '#111827', fontSize: '1.2rem', fontWeight: '700', margin: '0 0 0.35rem 0', letterSpacing: '-0.01em' }}>Cast Your Vote</h2>
                    <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: '0 0 1.5rem', lineHeight: '1.5' }}>{nominee.name} • {nominee.category_name}</p>
                </div>
                <div style={{ padding: '0 1.75rem 1.75rem' }}>
                    {voteError && (
                        <div style={{ display: 'flex', gap: '10px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '8px', padding: '0.75rem 1rem', color: '#991B1B', fontSize: '0.82rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} /><span>{voteError}</span>
                        </div>
                    )}
                    <button onClick={handleLoginClick} type="button"
                        style={{ width: '100%', background: '#0F172A', color: 'white', border: 'none', borderRadius: '10px', padding: '0.8rem 1.25rem', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.15s', fontFamily: 'inherit', marginBottom: '0.6rem' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#1E293B'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#0F172A'; }}>
                        <LogIn size={16} strokeWidth={2} /> Login to Vote
                    </button>
                    <p style={{ margin: '0 0 1.25rem', fontSize: '0.78rem', color: '#9CA3AF', textAlign: 'center' }}>Have an account? Sign in to continue</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
                        <span style={{ color: '#9CA3AF', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Or vote anonymously</span>
                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
                    </div>
                    <form onSubmit={handleAnonymousVote}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.4rem' }}>Email Address</label>
                            <input type="email" placeholder="your.email@example.com" value={anonymousEmail} onChange={(e) => setAnonymousEmail(e.target.value)} disabled={voting}
                                style={{ width: '100%', padding: '0.7rem 0.875rem', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', transition: 'all 0.15s', fontFamily: 'inherit', background: voting ? '#F9FAFB' : 'white', color: '#111827', boxSizing: 'border-box' }}
                                onFocus={(e) => { e.target.style.borderColor = '#003366'; e.target.style.boxShadow = '0 0 0 3px rgba(0,51,102,0.08)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; }} />
                            <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#6B7280' }}>Used only to prevent duplicate votes</p>
                        </div>
                        {RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY !== 'your_recaptcha_site_key_here' && (
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                                <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} size="invisible" onChange={(token) => setRecaptchaToken(token)} />
                            </div>
                        )}
                        <button type="submit" disabled={voting}
                            style={{ width: '100%', background: voting ? '#CBD5E1' : '#003366', color: 'white', border: 'none', borderRadius: '10px', padding: '0.8rem 1.25rem', fontWeight: '600', fontSize: '0.9rem', cursor: voting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.15s', fontFamily: 'inherit' }}
                            onMouseOver={(e) => { if (!voting) e.currentTarget.style.background = '#002147'; }}
                            onMouseOut={(e) => { if (!voting) e.currentTarget.style.background = '#003366'; }}>
                            {voting ? <><Loader2 size={16} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <>Submit Anonymous Vote</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// ─── Nominee Detail Modal ─────────────────────────────────────────────────────
const NomineeModal = ({ nominee, onClose, myVotedCategoryIds, onVoteSuccess }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [voting, setVoting] = useState(false);
    const [voted, setVoted] = useState(false);
    const [voteError, setVoteError] = useState('');
    const [showVoteOptions, setShowVoteOptions] = useState(false);

    useBodyScrollLock(true);

    const tl = TIMELINE_META[nominee.category_timeline] || TIMELINE_META.yearly;
    const hasVoted = voted || (myVotedCategoryIds || []).includes(nominee.category_id);
    const achievements = nominee.achievements
        ? nominee.achievements.split(';').map((s) => s.trim()).filter(Boolean)
        : [];

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

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
            if (msg?.includes('already voted') || err?.response?.status === 409) {
                setVoted(true); setVoteError('You have already voted in this category.');
            } else { setVoteError(msg || 'Failed to cast vote. Please try again.'); }
        } finally { setVoting(false); }
    };

    const handleAnonymousVoteSuccess = (categoryId) => {
        setVoted(true); setShowVoteOptions(false);
        if (onVoteSuccess) onVoteSuccess(categoryId);
    };

    const photoUrl = getPhotoUrl(nominee.photo_url);
    const isWinner = !!nominee.is_winner;
    const accentColor = isWinner ? '#D97706' : '#0284C7';
    const accentLight = isWinner ? '#FEF3C7' : '#EFF6FF';
    const accentDark = isWinner ? '#92400E' : '#1D4ED8';

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', backdropFilter: 'blur(6px)', boxSizing: 'border-box' }} onClick={onClose}>
            <div style={{ background: 'white', borderRadius: '20px', maxWidth: '560px', width: '100%', maxHeight: '88dvh', overflowY: 'auto', overflowX: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>

                {/* ── Header banner ── */}
                <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', borderRadius: '20px 20px 0 0', padding: '1.25rem 1.25rem 1.25rem', position: 'relative', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '20px 20px 0 0', opacity: 0.05, backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
                    {/* Close btn */}
                    <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.14)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.85)', transition: 'background 0.2s', zIndex: 2, flexShrink: 0 }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}>
                        <X size={15} />
                    </button>
                    {/* Avatar + identity row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingRight: '2.5rem' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '14px', flexShrink: 0, background: photoUrl ? `url(${photoUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)', border: '3px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '800', color: 'white' }}>
                            {!photoUrl && nominee.name?.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {nominee.award_name && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '20px', padding: '2px 10px', marginBottom: '0.4rem' }}>
                                    <Trophy size={9} color={isWinner ? '#FCD34D' : '#93C5FD'} />
                                    <span style={{ color: isWinner ? '#FDE68A' : '#BFDBFE', fontSize: '0.58rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{nominee.award_name}</span>
                                </div>
                            )}
                            <h2 style={{ color: 'white', fontSize: 'clamp(1rem,3vw,1.3rem)', fontWeight: '800', margin: '0 0 0.15rem', letterSpacing: '-0.02em', lineHeight: '1.25', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nominee.name}</h2>
                            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nominee.designation}{nominee.company ? ` · ${nominee.company}` : ''}</p>
                        </div>
                    </div>
                    {/* Badges row */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.85rem' }}>
                        {isWinner && (
                            <span style={{ background: 'rgba(253,230,138,0.18)', color: '#FDE68A', border: '1px solid rgba(253,230,138,0.3)', fontSize: '0.6rem', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '3px', textTransform: 'uppercase' }}>
                                <Trophy size={8} /> Winner
                            </span>
                        )}
                        <span style={{ background: 'rgba(255,255,255,0.1)', color: tl.color === '#7C3AED' ? '#C4B5FD' : tl.color === '#0284C7' ? '#7DD3FC' : '#6EE7B7', border: '1px solid rgba(255,255,255,0.14)', fontSize: '0.6rem', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' }}>{tl.label}</span>
                        {nominee.category_name && (
                            <span style={{ background: 'rgba(255,255,255,0.1)', color: isWinner ? '#FDE68A' : '#BFDBFE', border: '1px solid rgba(255,255,255,0.14)', fontSize: '0.6rem', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '3px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <BadgeCheck size={8} /> {nominee.category_name}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Body ── */}
                <div style={{ padding: '1.25rem 1.25rem 1.5rem' }}>
                    {nominee.linkedin_url && (
                        <a href={nominee.linkedin_url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0369A1', fontSize: '0.78rem', fontWeight: '600', textDecoration: 'none', marginBottom: '1.25rem', padding: '6px 14px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                            <Linkedin size={13} /> LinkedIn Profile <ExternalLink size={11} />
                        </a>
                    )}

                    {achievements.length > 0 && (
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.65rem' }}>
                                <Star size={13} color="#F59E0B" fill="#F59E0B" />
                                <span style={{ color: '#0F172A', fontWeight: '700', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Key Achievements</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {achievements.map((a, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '0.6rem 0.85rem', background: '#F8FAFC', borderRadius: '8px', borderLeft: `3px solid ${accentColor}` }}>
                                        <span style={{ color: accentColor, fontWeight: '800', fontSize: '0.65rem', lineHeight: '1.75', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                                        <span style={{ color: '#334155', fontSize: '0.84rem', lineHeight: '1.65' }}>{a}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {nominee.description && (
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.55rem' }}>
                                <BookOpen size={13} color="#64748B" />
                                <span style={{ color: '#0F172A', fontWeight: '700', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>About</span>
                            </div>
                            <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: '1.75', margin: 0 }}>{nominee.description}</p>
                        </div>
                    )}

                    <div style={{ height: '1px', background: '#F1F5F9', margin: '1.25rem 0' }} />

                    {/* Vote / Winner area */}
                    {isWinner ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '0.9rem 1.5rem', color: '#B45309', fontWeight: '700', fontSize: '0.9rem', justifyContent: 'center' }}>
                            <Trophy size={18} color="#D97706" /> Award Winner — Congratulations!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {voteError && !hasVoted && (
                                <div style={{ display: 'flex', gap: '7px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.6rem 1rem', color: '#DC2626', fontSize: '0.82rem', alignItems: 'center' }}>
                                    <AlertCircle size={14} style={{ flexShrink: 0 }} /> {voteError}
                                </div>
                            )}
                            {hasVoted ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '0.9rem 1.5rem', color: '#16A34A', fontWeight: '700', fontSize: '0.9rem', justifyContent: 'center' }}>
                                    <Check size={18} /> Vote recorded — thank you!
                                </div>
                            ) : (
                                <button onClick={handleVote} disabled={voting}
                                    style={{ width: '100%', background: voting ? '#94A3B8' : '#003366', color: 'white', border: 'none', borderRadius: '12px', padding: '0.9rem 2rem', fontWeight: '700', fontSize: '0.9rem', cursor: voting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: voting ? 'none' : '0 4px 16px rgba(0,51,102,0.22)', transition: 'all 0.2s', fontFamily: 'inherit' }}
                                    onMouseOver={(e) => { if (!voting) { e.currentTarget.style.background = '#002147'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = voting ? '#94A3B8' : '#003366'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                    {voting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting Vote…</> : <><Trophy size={16} /> Cast Your Vote</>}
                                </button>
                            )}
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center' }}>
                                {user ? 'One vote per category. Results visible to admins only.' : 'Click to vote — login or vote anonymously.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            {showVoteOptions && <VoteOptionsModal nominee={nominee} onClose={() => setShowVoteOptions(false)} onVoteSuccess={handleAnonymousVoteSuccess} />}
        </div>
    );
};

// ─── Nominee Grid Card ────────────────────────────────────────────────────────
const NomineeGridCard = ({ nominee, onClick }) => {
    const tl = TIMELINE_META[nominee.category_timeline] || TIMELINE_META.yearly;
    const [hovered, setHovered] = useState(false);
    const photoUrl = getPhotoUrl(nominee.photo_url);
    const isWinner = !!nominee.is_winner;
    const accentColor = isWinner ? '#D97706' : '#0284C7';
    const accentBorder = isWinner ? '#FDE68A' : '#BAE6FD';
    const accentBg = isWinner ? '#FEF3C7' : '#EFF6FF';
    const cardAccent = isWinner ? '#F59E0B' : '#0284C7';
    const firstAchievement = nominee.achievements ? nominee.achievements.split(';')[0]?.trim() : null;

    return (
        <div
            onClick={() => onClick(nominee)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: 'white',
                borderRadius: '16px',
                border: `1px solid ${hovered ? accentBorder : '#E8EFF6'}`,
                cursor: 'pointer',
                boxShadow: hovered ? '0 20px 50px rgba(0,0,0,0.12)' : '0 2px 12px rgba(0,0,0,0.05)',
                transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
                transition: 'all 0.26s cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Top accent bar */}
            <div style={{ height: '3px', background: isWinner ? 'linear-gradient(90deg, #F59E0B, #FBBF24, #F59E0B)' : 'linear-gradient(90deg, #003366, #0284C7)', flexShrink: 0 }} />

            {/* Winner ribbon */}
            {isWinner && (
                <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#FEF3C7', color: '#B45309', fontSize: '0.58rem', fontWeight: '800', padding: '3px 9px', borderRadius: '20px', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: '3px', textTransform: 'uppercase' }}>
                    <Trophy size={8} /> Winner
                </div>
            )}

            <div style={{ padding: '1.1rem 1.2rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Person row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div style={{
                        width: '54px', height: '54px', borderRadius: '12px', flexShrink: 0,
                        background: photoUrl ? `url(${photoUrl}) center/cover no-repeat` : `linear-gradient(135deg, ${isWinner ? '#B45309' : '#003366'} 0%, ${isWinner ? '#F59E0B' : '#0284C7'} 100%)`,
                        border: `2px solid ${isWinner ? '#FDE68A' : '#BFDBFE'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: '800', color: 'white',
                    }}>
                        {!photoUrl && nominee.name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#0F172A', lineHeight: '1.3', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: isWinner ? '4.5rem' : '0' }}>{nominee.name}</div>
                        <div style={{ fontSize: '0.73rem', color: '#475569', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nominee.designation}</div>
                    </div>
                </div>

                {/* Company */}
                {nominee.company && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#64748B', marginBottom: '0.7rem', overflow: 'hidden' }}>
                        <Building2 size={11} color="#94A3B8" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>{nominee.company}</span>
                    </div>
                )}

                {/* First Achievement snippet */}
                {firstAchievement && (
                    <p style={{ fontSize: '0.72rem', color: '#64748B', fontStyle: 'italic', lineHeight: '1.55', margin: '0 0 0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                        "{firstAchievement}"
                    </p>
                )}

                {/* Divider */}
                <div style={{ height: '1px', background: '#F1F5F9', margin: '0.5rem 0 0.75rem' }} />

                {/* Bottom row: tags + action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                        <span style={{ background: accentBg, color: isWinner ? '#B45309' : '#1D4ED8', fontSize: '0.58rem', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', maxWidth: '115px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <BadgeCheck size={8} /> {nominee.category_name}
                        </span>
                        <span style={{ background: tl.bg, color: tl.color, fontSize: '0.58rem', fontWeight: '700', padding: '2px 7px', borderRadius: '4px' }}>{tl.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: '700', color: hovered ? cardAccent : '#94A3B8', transition: 'all 0.2s', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {isWinner ? 'View' : 'Vote'}
                        <ChevronRight size={12} style={{ transform: hovered ? 'translateX(3px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── All Nominees Page ────────────────────────────────────────────────────────
const AllNominees = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [nominees, setNominees] = useState([]);
    const [awards, setAwards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedNominee, setSelected] = useState(null);
    const [myVotedIds, setMyVotedIds] = useState([]);

    const [search, setSearch] = useState('');
    const [filterTimeline, setFTimeline] = useState('all');
    const [filterAward, setFAward] = useState('all');
    const [filterCategory, setFCategory] = useState('all');

    const searchRef = useRef(null);

    useEffect(() => { document.title = 'All Nominees | Risk AI Council (RAC)'; }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [nomRes, awardsRes, voteRes] = await Promise.allSettled([
                getNominees({ limit: 200 }),
                getAwards(),
                user ? getMyVotes() : Promise.resolve(null),
            ]);
            if (nomRes.status === 'fulfilled') setNominees(nomRes.value.data?.data || []);
            if (awardsRes.status === 'fulfilled') setAwards(awardsRes.value.data?.data || []);
            if (voteRes.status === 'fulfilled' && voteRes.value)
                setMyVotedIds((voteRes.value.data?.data || []).map((r) => r.category_id));
        } catch (err) { setError(getErrorMessage(err) || 'Failed to load nominees.'); }
        finally { setLoading(false); }
    }, [user]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleVoteSuccess = (categoryId) => setMyVotedIds((prev) => [...new Set([...prev, categoryId])]);

    const availableCategories = React.useMemo(() => {
        const relevant = filterAward === 'all'
            ? awards.flatMap((a) => a.categories || [])
            : (awards.find((a) => String(a.id) === filterAward)?.categories || []);
        return relevant;
    }, [awards, filterAward]);

    const filtered = React.useMemo(() => {
        let list = nominees;
        if (search.trim()) list = list.filter((n) => n.name.toLowerCase().includes(search.toLowerCase()));
        if (filterTimeline !== 'all') list = list.filter((n) => n.category_timeline === filterTimeline);
        if (filterAward !== 'all') list = list.filter((n) => String(n.award_id) === filterAward);
        if (filterCategory !== 'all') list = list.filter((n) => String(n.category_id) === filterCategory);
        return list;
    }, [nominees, search, filterTimeline, filterAward, filterCategory]);

    const clearFilters = () => { setSearch(''); setFTimeline('all'); setFAward('all'); setFCategory('all'); };
    const hasActive = search || filterTimeline !== 'all' || filterAward !== 'all' || filterCategory !== 'all';

    const selectStyle = { background: 'white', border: '1px solid #CBD5E1', color: '#334155', borderRadius: '8px', padding: '0.5rem 0.85rem', fontSize: '0.82rem', cursor: 'pointer', outline: 'none', fontFamily: 'inherit', flex: '1 1 140px' };
    const winnerCount = nominees.filter((n) => n.is_winner).length;
    const openCount = nominees.filter((n) => !n.is_winner).length;

    return (
        <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', padding: 'clamp(1.5rem,3vw,2.5rem) clamp(1rem,4vw,2rem) clamp(2.5rem,5vw,3.5rem)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <button onClick={() => navigate('/events')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)', padding: '0.45rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', marginBottom: '1.75rem', fontFamily: 'inherit', transition: 'background 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}>
                        <ChevronLeft size={14} /> Back to Events
                    </button>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(253,230,138,0.12)', border: '1px solid rgba(253,230,138,0.25)', borderRadius: '20px', padding: '4px 14px', marginBottom: '1rem' }}>
                        <Trophy size={12} color="#FCD34D" />
                        <span style={{ color: '#FDE68A', fontWeight: '700', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Awards & Nominations 2026</span>
                    </div>
                    <h1 style={{ color: 'white', fontSize: 'clamp(1.75rem,4vw,2.8rem)', fontWeight: '900', margin: '0 0 0.75rem', letterSpacing: '-0.025em', lineHeight: '1.15' }}>All Nominees</h1>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(0.85rem,1.5vw,0.98rem)', lineHeight: '1.7', maxWidth: '520px', margin: 0 }}>
                        Discover and vote for outstanding leaders in AI governance, cybersecurity, and risk management.
                    </p>
                    {!loading && (
                        <div style={{ display: 'flex', gap: 'clamp(1rem,3vw,2rem)', marginTop: '2.25rem', flexWrap: 'wrap' }}>
                            {[
                                { label: 'Total Nominees', value: nominees.length, color: '#BFDBFE' },
                                { label: 'Past Winners', value: winnerCount, color: '#FDE68A' },
                                { label: 'Open for Vote', value: openCount, color: '#BBF7D0' },
                                { label: 'Award Programs', value: awards.length, color: '#E9D5FF' },
                            ].map(({ label, value, color }) => (
                                <div key={label}>
                                    <div style={{ color, fontWeight: '900', fontSize: 'clamp(1.3rem,3vw,1.7rem)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Filter bar */}
            <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '0.9rem clamp(1rem,3vw,2rem)', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', minWidth: 'min-content' }}>
                    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px', maxWidth: '300px' }}>
                        <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                        <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search nominees…"
                            style={{ width: '100%', paddingLeft: '32px', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#334155', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                        {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={11} /></button>}
                    </div>
                    <Filter size={13} color="#94A3B8" style={{ flexShrink: 0 }} />
                    <select value={filterTimeline} onChange={(e) => setFTimeline(e.target.value)} style={selectStyle}>
                        <option value="all">All Timelines</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="half-yearly">Half-Yearly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                    <select value={filterAward} onChange={(e) => { setFAward(e.target.value); setFCategory('all'); }} style={selectStyle}>
                        <option value="all">All Awards</option>
                        {awards.map((a) => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                    </select>
                    <select value={filterCategory} onChange={(e) => setFCategory(e.target.value)} style={selectStyle} disabled={availableCategories.length === 0}>
                        <option value="all">All Categories</option>
                        {availableCategories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </select>
                    {hasActive && (
                        <button onClick={clearFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '8px', padding: '0.48rem 0.85rem', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                            <X size={11} /> Clear
                        </button>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#94A3B8', fontWeight: '500', whiteSpace: 'nowrap', flexShrink: 0 }}>{filtered.length} of {nominees.length} nominees</span>
                </div>
            </div>

            {/* Grid */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(1.5rem,4vw,2.5rem) clamp(1rem,3vw,2rem) 5rem' }}>
                {loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: '1.25rem' }}>
                        {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} style={{ height: '210px', borderRadius: '16px', background: '#EEF2FF', animation: 'nom-pulse 1.4s ease-in-out infinite' }} />)}
                    </div>
                )}
                {error && !loading && (
                    <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
                        <AlertCircle size={40} color="#EF4444" style={{ opacity: 0.5, marginBottom: '0.75rem' }} />
                        <p style={{ color: '#DC2626', marginBottom: '1.25rem' }}>{error}</p>
                        <button onClick={fetchAll} style={{ background: '#003366', color: 'white', border: 'none', padding: '0.7rem 1.5rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Retry</button>
                    </div>
                )}
                {!loading && !error && filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
                        <Users size={48} color="#CBD5E1" style={{ marginBottom: '1rem' }} />
                        <p style={{ fontSize: '1rem', color: '#64748B', marginBottom: '0.5rem' }}>No nominees match your filters.</p>
                        {hasActive && <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: '#003366', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}>Clear all filters →</button>}
                    </div>
                )}
                {!loading && !error && filtered.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: '1.25rem' }}>
                        {filtered.map((n) => <NomineeGridCard key={n.id} nominee={n} onClick={setSelected} />)}
                    </div>
                )}
            </div>

            {selectedNominee && <NomineeModal nominee={selectedNominee} onClose={() => setSelected(null)} myVotedCategoryIds={myVotedIds} onVoteSuccess={handleVoteSuccess} />}

            <style>{`
                @keyframes nom-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            `}</style>
        </div>
    );
};

export default AllNominees;