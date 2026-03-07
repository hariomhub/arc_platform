import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import {
    Trophy, Search, X, ChevronLeft, ChevronRight,
    Award, BadgeCheck, Star, Linkedin, BookOpen,
    Check, Loader2, AlertCircle, Filter, Users, Mail, LogIn,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getNominees, getAwards, getMyVotes, castVote } from '../api/nominations.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

// ─── Timeline meta ────────────────────────────────────────────────────────────
const TIMELINE_META = {
    quarterly:     { label: 'Quarterly',    color: '#7C3AED', bg: '#F5F3FF' },
    'half-yearly': { label: 'Half-Yearly',  color: '#0284C7', bg: '#EFF6FF' },
    yearly:        { label: 'Yearly',       color: '#059669', bg: '#F0FDF4' },
};

// Photo URL: handle full external URLs or local uploads
const getPhotoUrl = (photo_url) =>
    photo_url
        ? photo_url.startsWith('http') ? photo_url : `http://localhost:5000/${photo_url}`
        : null;

// ─── Vote Options Modal (Login or Anonymous) ──────────────────────────────────
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

    const handleLoginClick = () => {
        navigate('/login?redirect=/nominees');
    };

    const handleAnonymousVote = async (e) => {
        e.preventDefault();
        setVoteError('');

        // Validate email
        if (!anonymousEmail.trim()) {
            setVoteError('Please enter your email address');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(anonymousEmail)) {
            setVoteError('Please enter a valid email address');
            return;
        }

        // Get reCAPTCHA token
        let token = recaptchaToken;
        if (!token && recaptchaRef.current) {
            try {
                token = await recaptchaRef.current.executeAsync();
                setRecaptchaToken(token);
            } catch (err) {
                setVoteError('reCAPTCHA verification failed. Please try again.');
                return;
            }
        }

        if (!token) {
            setVoteError('Please complete the reCAPTCHA verification');
            return;
        }

        setVoting(true);
        try {
            await castVote(nominee.id, {
                isAnonymous: true,
                anonymousEmail: anonymousEmail.trim(),
                recaptchaToken: token
            });
            showToast('Your vote has been cast successfully!', 'success');
            onClose();
            if (onVoteSuccess) onVoteSuccess(nominee.category_id);
        } catch (err) {
            const msg = getErrorMessage(err);
            setVoteError(msg || 'Failed to cast vote. Please try again.');
            // Reset reCAPTCHA on error
            if (recaptchaRef.current) {
                recaptchaRef.current.reset();
                setRecaptchaToken('');
            }
        } finally {
            setVoting(false);
        }
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(3px)' }}
            onClick={onClose}
        >
            <div
                style={{ background: '#FFFFFF', borderRadius: '12px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #E5E7EB' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ borderBottom: '1px solid #F3F4F6', padding: '1.75rem 2rem 1.5rem' }}>
                    <button
                        onClick={onClose}
                        style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '0.25rem', transition: 'color 0.15s' }}
                        onMouseOver={(e) => { e.currentTarget.style.color = '#111827'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = '#6B7280'; }}
                    >
                        <X size={20} strokeWidth={2} />
                    </button>
                    <h2 style={{ color: '#111827', fontSize: '1.5rem', fontWeight: '600', margin: '0 0 0.5rem 0', letterSpacing: '-0.01em' }}>
                        Cast Your Vote
                    </h2>
                    <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>
                        {nominee.name} • {nominee.category_name}
                    </p>
                </div>

                {/* Body */}
                <div style={{ padding: '2rem' }}>
                    {voteError && (
                        <div style={{ display: 'flex', gap: '10px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '8px', padding: '0.875rem 1rem', color: '#991B1B', fontSize: '0.875rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} /> 
                            <span>{voteError}</span>
                        </div>
                    )}

                    {/* Option 1: Login */}
                    <button
                        onClick={handleLoginClick}
                        type="button"
                        style={{ width: '100%', background: '#111827', color: 'white', border: 'none', borderRadius: '8px', padding: '0.875rem 1.25rem', fontWeight: '600', fontSize: '0.9375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.15s', fontFamily: 'inherit', marginBottom: '0.75rem' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#1F2937'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#111827'; }}
                    >
                        <LogIn size={18} strokeWidth={2} /> 
                        Login to Vote
                    </button>
                    <p style={{ margin: '0 0 1.5rem', fontSize: '0.8125rem', color: '#9CA3AF', textAlign: 'center' }}>
                        Have an account? Sign in to continue
                    </p>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
                        <span style={{ color: '#9CA3AF', fontSize: '0.8125rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or</span>
                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
                    </div>

                    {/* Option 2: Anonymous Vote */}
                    <form onSubmit={handleAnonymousVote}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                placeholder="your.email@example.com"
                                value={anonymousEmail}
                                onChange={(e) => setAnonymousEmail(e.target.value)}
                                disabled={voting}
                                style={{ width: '100%', padding: '0.75rem 0.875rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.9375rem', outline: 'none', transition: 'all 0.15s', fontFamily: 'inherit', background: voting ? '#F9FAFB' : 'white', color: '#111827' }}
                                onFocus={(e) => { e.target.style.borderColor = '#111827'; e.target.style.boxShadow = '0 0 0 3px rgba(17,24,39,0.05)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; }}
                            />
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: '#6B7280' }}>
                                Used only to prevent duplicate votes
                            </p>
                        </div>

                        {/* reCAPTCHA */}
                        {RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY !== 'your_recaptcha_site_key_here' && (
                            <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
                                <ReCAPTCHA
                                    ref={recaptchaRef}
                                    sitekey={RECAPTCHA_SITE_KEY}
                                    size="invisible"
                                    onChange={(token) => setRecaptchaToken(token)}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={voting}
                            style={{ width: '100%', background: voting ? '#D1D5DB' : '#111827', color: 'white', border: 'none', borderRadius: '8px', padding: '0.875rem 1.25rem', fontWeight: '600', fontSize: '0.9375rem', cursor: voting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.15s', fontFamily: 'inherit' }}
                            onMouseOver={(e) => { if (!voting) { e.currentTarget.style.background = '#1F2937'; } }}
                            onMouseOut={(e) => { if (!voting) { e.currentTarget.style.background = '#111827'; } }}
                        >
                            {voting ? (
                                <><Loader2 size={18} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
                            ) : (
                                <>Submit Vote</>
                            )}
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
        if (!user) {
            // Show vote options modal instead of redirecting
            setShowVoteOptions(true);
            return;
        }
        
        // Logged-in user vote
        setVoting(true);
        setVoteError('');
        try {
            await castVote(nominee.id);
            setVoted(true);
            showToast('Your vote has been cast!', 'success');
            if (onVoteSuccess) onVoteSuccess(nominee.category_id);
        } catch (err) {
            const msg = getErrorMessage(err);
            if (msg?.includes('already voted') || err?.response?.status === 409) {
                setVoted(true);
                setVoteError('You have already voted in this category.');
            } else {
                setVoteError(msg || 'Failed to cast vote. Please try again.');
            }
        } finally {
            setVoting(false);
        }
    };

    const handleAnonymousVoteSuccess = (categoryId) => {
        setVoted(true);
        setShowVoteOptions(false);
        if (onVoteSuccess) onVoteSuccess(categoryId);
    };

    const photoUrl = getPhotoUrl(nominee.photo_url);
    const isWinnerNominee = !!nominee.is_winner;
    const accentColor = isWinnerNominee ? '#D97706' : '#0284C7';
    const accentLight = isWinnerNominee ? '#FEF3C7' : '#EFF6FF';
    const accentBorder = isWinnerNominee ? '#FDE68A' : '#BAE6FD';

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(5px)' }}
            onClick={onClose}
        >
            <div
                style={{ background: 'white', borderRadius: '20px', maxWidth: '600px', width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 40px 100px rgba(0,0,0,0.22), 0 12px 32px rgba(0,0,0,0.1)', position: 'relative' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Dark header band */}
                <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', borderRadius: '20px 20px 0 0', padding: '1.75rem 1.75rem 3.75rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />
                    <button
                        onClick={onClose}
                        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', transition: 'background 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    >
                        <X size={16} />
                    </button>
                    {nominee.award_name && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '4px 12px', marginBottom: '0.9rem' }}>
                            <Trophy size={10} color={isWinnerNominee ? '#FCD34D' : '#93C5FD'} />
                            <span style={{ color: isWinnerNominee ? '#FDE68A' : '#BFDBFE', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{nominee.award_name}</span>
                        </div>
                    )}
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '0 0 0.2rem' }}>{nominee.designation}</p>
                    <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.25' }}>{nominee.name}</h2>
                    {nominee.company && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: '0.3rem 0 0' }}>{nominee.company}</p>}
                </div>

                {/* Avatar + badges row overlapping header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 1.75rem', marginTop: '-44px', marginBottom: '1.25rem' }}>
                    <div style={{
                        width: '88px', height: '88px', borderRadius: '50%',
                        background: photoUrl
                            ? `url(${photoUrl}) center/cover no-repeat`
                            : 'linear-gradient(135deg, #003366 0%, #0284C7 100%)',
                        border: '4px solid white',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', fontWeight: '800', color: 'white', flexShrink: 0,
                    }}>
                        {!photoUrl && nominee.name?.charAt(0)}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', paddingBottom: '4px' }}>
                        {isWinnerNominee && (
                            <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', fontSize: '0.62rem', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                <Trophy size={9} /> Winner
                            </span>
                        )}
                        <span style={{ background: tl.bg, color: tl.color, fontSize: '0.62rem', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' }}>{tl.label}</span>
                        <span style={{ background: accentLight, color: accentColor, border: `1px solid ${accentBorder}`, fontSize: '0.62rem', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <BadgeCheck size={9} /> {nominee.category_name}
                        </span>
                    </div>
                </div>

                {/* White body */}
                <div style={{ padding: '0 1.75rem 1.75rem' }}>
                    {/* LinkedIn */}
                    {nominee.linkedin_url && (
                        <a href={nominee.linkedin_url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0369A1', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none', marginBottom: '1.25rem', padding: '6px 14px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                            <Linkedin size={13} /> LinkedIn Profile
                        </a>
                    )}

                    {/* Achievements */}
                    {achievements.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                                <Star size={13} color="#F59E0B" />
                                <span style={{ color: '#0F172A', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Key Achievements</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                {achievements.map((a, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '0.6rem 0.85rem', background: '#F8FAFC', borderRadius: '8px', borderLeft: `3px solid ${accentColor}` }}>
                                        <span style={{ color: accentColor, fontWeight: '800', fontSize: '0.68rem', lineHeight: '1.7', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                                        <span style={{ color: '#334155', fontSize: '0.84rem', lineHeight: '1.65' }}>{a}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* About */}
                    {nominee.description && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.6rem' }}>
                                <BookOpen size={13} color="#64748B" />
                                <span style={{ color: '#0F172A', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>About</span>
                            </div>
                            <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: '1.75', margin: 0 }}>{nominee.description}</p>
                        </div>
                    )}

                    <div style={{ height: '1px', background: '#F1F5F9', margin: '1.25rem 0' }} />

                    {/* CTA */}
                    {isWinnerNominee ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '0.9rem 1.5rem', color: '#B45309', fontWeight: '700', fontSize: '0.9rem', justifyContent: 'center' }}>
                            <Trophy size={18} /> Award Winner — Congratulations!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                                <button
                                    onClick={handleVote}
                                    disabled={voting}
                                    style={{ width: '100%', background: voting ? '#94A3B8' : '#003366', color: 'white', border: 'none', borderRadius: '12px', padding: '0.9rem 2rem', fontWeight: '800', fontSize: '0.95rem', cursor: voting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: voting ? 'none' : '0 4px 16px rgba(0,51,102,0.22)', transition: 'all 0.2s', fontFamily: 'inherit' }}
                                    onMouseOver={(e) => { if (!voting) { e.currentTarget.style.background = '#002147'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = voting ? '#94A3B8' : '#003366'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    {voting
                                        ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting Vote…</>
                                        : <><Trophy size={16} /> Cast Your Vote</>}
                                </button>
                            )}
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center' }}>
                                {user ? 'One vote per category. Results visible to admins only.' : 'Click to vote — login or vote anonymously.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Vote Options Modal for non-logged-in users */}
            {showVoteOptions && (
                <VoteOptionsModal
                    nominee={nominee}
                    onClose={() => setShowVoteOptions(false)}
                    onVoteSuccess={handleAnonymousVoteSuccess}
                />
            )}
        </div>
    );
};

// ─── Nominee Grid Card (light professional) ───────────────────────────────────
const NomineeGridCard = ({ nominee, onClick }) => {
    const tl = TIMELINE_META[nominee.category_timeline] || TIMELINE_META.yearly;
    const [hovered, setHovered] = useState(false);
    const photoUrl = getPhotoUrl(nominee.photo_url);
    const isWinner = !!nominee.is_winner;
    const accentColor = isWinner ? '#B45309' : '#0369A1';
    const accentBorder = isWinner ? '#FDE68A' : '#BAE6FD';
    const accentBg     = isWinner ? '#FEF3C7' : '#E0F2FE';
    const firstAchievement = nominee.achievements
        ? nominee.achievements.split(';')[0]?.trim()
        : null;

    return (
        <div
            onClick={() => onClick(nominee)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: 'white',
                borderRadius: '16px',
                border: `1px solid ${hovered ? accentBorder : '#E8EFF6'}`,
                borderLeft: `4px solid ${isWinner ? '#D97706' : '#0284C7'}`,
                padding: '1.35rem 1.35rem 1.1rem',
                cursor: 'pointer',
                boxShadow: hovered
                    ? `0 18px 44px rgba(0,0,0,0.11), 0 4px 14px ${isWinner ? 'rgba(217,119,6,0.14)' : 'rgba(2,132,199,0.11)'}`
                    : '0 2px 10px rgba(0,0,0,0.05)',
                transform: hovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
                transition: 'all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative', overflow: 'hidden',
            }}
        >
            {isWinner && (
                <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(253,230,138,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
            )}

            {/* Winner badge */}
            {isWinner && (
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#FEF3C7', color: '#B45309', fontSize: '0.58rem', fontWeight: '800', padding: '2px 8px', borderRadius: '20px', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: '3px', textTransform: 'uppercase' }}>
                    <Trophy size={8} /> Winner
                </div>
            )}

            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem', marginBottom: '0.9rem' }}>
                <div style={{
                    width: '58px', height: '58px', borderRadius: '50%', flexShrink: 0,
                    background: photoUrl
                        ? `url(${photoUrl}) center/cover no-repeat`
                        : `linear-gradient(135deg, ${isWinner ? '#B45309' : '#003366'} 0%, ${isWinner ? '#F59E0B' : '#0284C7'} 100%)`,
                    border: `3px solid ${isWinner ? '#FDE68A' : '#BFDBFE'}`,
                    boxShadow: `0 0 0 4px ${isWinner ? 'rgba(253,230,138,0.25)' : 'rgba(191,219,254,0.25)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', fontWeight: '800', color: 'white',
                }}>
                    {!photoUrl && nominee.name?.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingTop: '3px' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.94rem', color: '#0F172A', lineHeight: '1.3', marginBottom: '2px', wordBreak: 'break-word' }}>
                        {nominee.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: '1.4', wordBreak: 'break-word' }}>
                        {nominee.designation}
                    </div>
                </div>
            </div>

            {/* Company */}
            {nominee.company && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.71rem', color: '#64748B', marginBottom: '0.7rem' }}>
                    <div style={{ width: '15px', height: '15px', borderRadius: '3px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Award size={8} color="#94A3B8" />
                    </div>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>{nominee.company}</span>
                </div>
            )}

            {/* Achievement preview */}
            {firstAchievement && (
                <div style={{ fontSize: '0.71rem', color: '#64748B', fontStyle: 'italic', lineHeight: '1.5', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    "{firstAchievement}"
                </div>
            )}

            <div style={{ height: '1px', background: '#F1F5F9', margin: '0.7rem 0' }} />

            {/* Badges + CTA */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                    <span style={{ background: accentBg, color: accentColor, fontSize: '0.59rem', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', border: `1px solid ${accentBorder}`, display: 'inline-flex', alignItems: 'center', gap: '3px', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <BadgeCheck size={8} /> {nominee.category_name}
                    </span>
                    <span style={{ background: tl.bg, color: tl.color, fontSize: '0.59rem', fontWeight: '700', padding: '2px 7px', borderRadius: '20px' }}>{tl.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem', fontWeight: '700', color: hovered ? accentColor : '#94A3B8', transition: 'all 0.2s', flexShrink: 0 }}>
                    {isWinner ? 'View' : 'Vote'}
                    <ChevronRight size={11} style={{ transform: hovered ? 'translateX(3px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
                </div>
            </div>
        </div>
    );
};

// ─── All Nominees Page (light professional) ──────────────────────────────────
const AllNominees = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [nominees, setNominees]        = useState([]);
    const [awards, setAwards]            = useState([]);
    const [loading, setLoading]          = useState(true);
    const [error, setError]              = useState('');
    const [selectedNominee, setSelected] = useState(null);
    const [myVotedIds, setMyVotedIds]    = useState([]);

    const [search, setSearch]            = useState('');
    const [filterTimeline, setFTimeline] = useState('all');
    const [filterAward, setFAward]       = useState('all');
    const [filterCategory, setFCategory] = useState('all');

    const searchRef = useRef(null);

    useEffect(() => { document.title = 'All Nominees | AI Risk Council'; }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [nomRes, awardsRes, voteRes] = await Promise.allSettled([
                getNominees({ limit: 200 }),
                getAwards(),
                user ? getMyVotes() : Promise.resolve(null),
            ]);
            if (nomRes.status    === 'fulfilled') setNominees(nomRes.value.data?.data  || []);
            if (awardsRes.status === 'fulfilled') setAwards(awardsRes.value.data?.data || []);
            if (voteRes.status   === 'fulfilled' && voteRes.value)
                setMyVotedIds((voteRes.value.data?.data || []).map((r) => r.category_id));
        } catch (err) {
            setError(getErrorMessage(err) || 'Failed to load nominees.');
        } finally { setLoading(false); }
    }, [user]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleVoteSuccess = (categoryId) =>
        setMyVotedIds((prev) => [...new Set([...prev, categoryId])]);

    const availableCategories = React.useMemo(() => {
        const relevant = filterAward === 'all'
            ? awards.flatMap((a) => a.categories || [])
            : (awards.find((a) => String(a.id) === filterAward)?.categories || []);
        return relevant;
    }, [awards, filterAward]);

    const filtered = React.useMemo(() => {
        let list = nominees;
        if (search.trim())            list = list.filter((n) => n.name.toLowerCase().includes(search.toLowerCase()));
        if (filterTimeline !== 'all') list = list.filter((n) => n.category_timeline === filterTimeline);
        if (filterAward    !== 'all') list = list.filter((n) => String(n.award_id)    === filterAward);
        if (filterCategory !== 'all') list = list.filter((n) => String(n.category_id) === filterCategory);
        return list;
    }, [nominees, search, filterTimeline, filterAward, filterCategory]);

    const clearFilters = () => { setSearch(''); setFTimeline('all'); setFAward('all'); setFCategory('all'); };
    const hasActive = search || filterTimeline !== 'all' || filterAward !== 'all' || filterCategory !== 'all';

    const selectStyle = {
        background: 'white', border: '1px solid #CBD5E1', color: '#334155',
        borderRadius: '8px', padding: '0.5rem 0.85rem', fontSize: '0.82rem',
        cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
    };

    const winnerCount = nominees.filter((n) => n.is_winner).length;
    const openCount   = nominees.filter((n) => !n.is_winner).length;

    return (
        <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>

            {/* ── Hero ── */}
            <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', padding: '4.5rem 2rem 3.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <button
                        onClick={() => navigate('/events')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)', padding: '0.45rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', marginBottom: '1.75rem', fontFamily: 'inherit', transition: 'background 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                    >
                        <ChevronLeft size={14} /> Back to Events
                    </button>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(253,230,138,0.12)', border: '1px solid rgba(253,230,138,0.25)', borderRadius: '20px', padding: '4px 14px', marginBottom: '1rem' }}>
                        <Trophy size={12} color="#FCD34D" />
                        <span style={{ color: '#FDE68A', fontWeight: '700', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Awards & Nominations 2026</span>
                    </div>

                    <h1 style={{ color: 'white', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: '900', margin: '0 0 0.75rem', letterSpacing: '-0.025em', lineHeight: '1.15' }}>
                        All Nominees
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.98rem', lineHeight: '1.7', maxWidth: '520px', margin: 0 }}>
                        Discover and vote for outstanding leaders in AI governance, cybersecurity, and risk management.
                    </p>

                    {/* Stats */}
                    {!loading && (
                        <div style={{ display: 'flex', gap: '2rem', marginTop: '2.25rem', flexWrap: 'wrap' }}>
                            {[
                                { label: 'Total Nominees', value: nominees.length, color: '#BFDBFE' },
                                { label: 'Past Winners',   value: winnerCount,     color: '#FDE68A' },
                                { label: 'Open for Vote',  value: openCount,       color: '#BBF7D0' },
                                { label: 'Award Programs', value: awards.length,   color: '#E9D5FF' },
                            ].map(({ label, value, color }) => (
                                <div key={label}>
                                    <div style={{ color, fontWeight: '900', fontSize: '1.7rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Filter bar ── */}
            <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '0.9rem 2rem', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px', maxWidth: '300px' }}>
                        <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                        <input
                            ref={searchRef}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search nominees…"
                            style={{ width: '100%', paddingLeft: '32px', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#334155', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', padding: 0 }}>
                                <X size={11} />
                            </button>
                        )}
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
                        <button onClick={clearFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '8px', padding: '0.48rem 0.85rem', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                            <X size={11} /> Clear
                        </button>
                    )}

                    <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#94A3B8', fontWeight: '500', whiteSpace: 'nowrap' }}>
                        {filtered.length} of {nominees.length} nominees
                    </span>
                </div>
            </div>

            {/* ── Content grid ── */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>
                {loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        {[1,2,3,4,5,6].map((i) => (
                            <div key={i} style={{ height: '210px', borderRadius: '16px', background: '#EEF2FF', animation: 'nom-pulse 1.4s ease-in-out infinite' }} />
                        ))}
                    </div>
                )}

                {error && !loading && (
                    <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
                        <AlertCircle size={40} color="#EF4444" style={{ opacity: 0.5, marginBottom: '0.75rem' }} />
                        <p style={{ color: '#DC2626', marginBottom: '1.25rem' }}>{error}</p>
                        <button onClick={fetchAll} style={{ background: '#003366', color: 'white', border: 'none', padding: '0.7rem 1.5rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
                        <Users size={48} color="#CBD5E1" style={{ marginBottom: '1rem' }} />
                        <p style={{ fontSize: '1rem', color: '#64748B', marginBottom: '0.5rem' }}>No nominees match your filters.</p>
                        {hasActive && (
                            <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: '#003366', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}>
                                Clear all filters →
                            </button>
                        )}
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        {filtered.map((n) => (
                            <NomineeGridCard key={n.id} nominee={n} onClick={setSelected} />
                        ))}
                    </div>
                )}
            </div>

            {selectedNominee && (
                <NomineeModal
                    nominee={selectedNominee}
                    onClose={() => setSelected(null)}
                    myVotedCategoryIds={myVotedIds}
                    onVoteSuccess={handleVoteSuccess}
                />
            )}

            <style>{`
                @keyframes nom-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            `}</style>
        </div>
    );
};

export default AllNominees;
