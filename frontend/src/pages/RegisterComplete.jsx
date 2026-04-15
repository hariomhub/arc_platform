import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Check, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import axios from '../api/axios.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

const SUB_CATEGORIES = [
    {
        value: 'working_professional',
        emoji: '💼',
        label: 'Working Professional',
        tag: 'Industry & Corporate',
        desc: 'Currently employed in any sector where AI governance intersects with your work.',
    },
    {
        value: 'final_year_undergrad',
        emoji: '🎓',
        label: 'Final Year Undergraduate',
        tag: 'Academic & Emerging',
        desc: 'In your final year of undergraduate studies, aspiring to build a career in AI risk or governance.',
    },
];

const RegisterComplete = () => {
    const navigate   = useNavigate();
    const { user, isAuthLoading } = useAuth();

    const [selectedSubCat,  setSelectedSubCat]  = useState('working_professional');
    const [linkedinUrl,     setLinkedinUrl]     = useState('');
    const [submitting,      setSubmitting]       = useState(false);
    const [error,           setError]           = useState('');
    const [success,         setSuccess]         = useState(false);

    useEffect(() => { document.title = 'Complete Your Profile | AI Risk Council'; }, []);

    // Guard: if user is fully logged in and NOT a newly pending linkedin user, redirect away
    useEffect(() => {
        if (isAuthLoading) return;
        // If no user at all — they shouldn't be here
        if (!user) { navigate('/register', { replace: true }); return; }
        // If already approved and not pending, send to dashboard
        if (user.status === 'approved') {
            navigate(user.role === 'founding_member' ? '/admin-dashboard' : '/user/dashboard', { replace: true });
        }
    }, [user, isAuthLoading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await axios.patch('/auth/complete-profile', {
                professional_sub_type: selectedSubCat,
                linkedin_url: linkedinUrl.trim() || undefined,
            });
            setSuccess(true);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    if (isAuthLoading) return null;

    return (
        <>
            <style>{`
                @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                @keyframes spin   { from{transform:rotate(0)} to{transform:rotate(360deg)} }

                .rc-subcat {
                    border: 2px solid #E2E8F0; border-radius: 14px;
                    padding: 1.1rem 1.2rem; cursor: pointer; text-align: left;
                    width: 100%; background: white; font-family: var(--font-sans);
                    transition: all 0.17s;
                }
                .rc-subcat:hover { border-color: #003366; background: #F5F9FF; }
                .rc-subcat.sel   { border-color: #003366; background: #EEF4FF; }
            `}</style>

            <div style={{
                minHeight: 'calc(100vh - 66px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #E8EEF7 0%, #DDE6F2 100%)',
                padding: 'clamp(1rem,3vw,2rem)',
                boxSizing: 'border-box',
            }}>
                <div style={{
                    width: '100%', maxWidth: '520px',
                    background: 'white', borderRadius: '20px',
                    boxShadow: '0 24px 64px rgba(0,30,70,0.14)',
                    overflow: 'hidden',
                    animation: 'fadeUp 0.4s ease both',
                }}>

                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #001529 0%, #003366 55%, #004d99 100%)',
                        padding: '1.75rem 2rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                            <Shield size={18} color="#93c5fd" />
                            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                Almost there
                            </span>
                        </div>
                        <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.4rem', fontWeight: '800', color: 'white', lineHeight: 1.2 }}>
                            Complete Your Profile
                        </h1>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                            {user?.name ? `Hi ${user.name.split(' ')[0]}! ` : ''}
                            One quick step — tell us which category fits you best so we can tailor your experience.
                        </p>
                    </div>

                    {success ? (
                        <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%',
                                background: '#F0FDF4', border: '2.5px solid #86EFAC',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.25rem',
                            }}>
                                <Check size={34} color="#16A34A" strokeWidth={2.5} />
                            </div>
                            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', fontWeight: '800', color: '#0F172A' }}>
                                You're registered!
                            </h2>
                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#475569', lineHeight: 1.65 }}>
                                Your account is <strong style={{ color: '#0F172A' }}>pending admin approval</strong>.
                            </p>
                            <p style={{ margin: '0 0 1.75rem', fontSize: '0.84rem', color: '#64748B', lineHeight: 1.65 }}>
                                Our team will review your application and email you once approved — typically within 24–48 hours.
                            </p>
                            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.75rem', textAlign: 'left' }}>
                                <p style={{ margin: '0 0 0.6rem', fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>What happens next?</p>
                                {['Our team reviews your application', 'You receive an approval email', 'Log in for full platform access'].map((s, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.3rem 0', fontSize: '0.82rem', color: '#475569' }}>
                                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#003366', color: 'white', fontSize: '0.62rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                                        {s}
                                    </div>
                                ))}
                            </div>
                            <a href="/login" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#003366,#005099)', color: 'white', padding: '0.82rem 2.25rem', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(0,51,102,0.28)' }}>
                                Back to Sign In →
                            </a>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

                            {error && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '0.75rem 1rem' }}>
                                    <AlertCircle size={15} color="#DC2626" style={{ flexShrink: 0 }} />
                                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#DC2626' }}>{error}</p>
                                </div>
                            )}

                            {/* Sub-category picker */}
                            <div>
                                <p style={{ margin: '0 0 0.65rem', fontSize: '0.82rem', fontWeight: '700', color: '#374151' }}>
                                    I am a <span style={{ color: '#EF4444' }}>*</span>
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                                    {SUB_CATEGORIES.map(sc => (
                                        <button
                                            key={sc.value}
                                            type="button"
                                            className={`rc-subcat${selectedSubCat === sc.value ? ' sel' : ''}`}
                                            onClick={() => setSelectedSubCat(sc.value)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                                <span style={{ fontSize: '1.4rem' }}>{sc.emoji}</span>
                                                {selectedSubCat === sc.value && (
                                                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#003366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Check size={10} color="white" strokeWidth={3} />
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontWeight: '700', fontSize: '0.82rem', color: '#1e293b', marginBottom: '0.2rem' }}>{sc.label}</div>
                                            <span style={{ display: 'inline-block', fontSize: '0.62rem', fontWeight: '700', background: '#EFF6FF', color: '#003366', padding: '1px 7px', borderRadius: '100px', marginBottom: '0.4rem' }}>{sc.tag}</span>
                                            <p style={{ margin: 0, fontSize: '0.73rem', color: '#64748B', lineHeight: '1.5' }}>{sc.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* LinkedIn URL */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                    <label htmlFor="rc-linkedin" style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>
                                        LinkedIn Profile URL
                                    </label>
                                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Helps admin verify your background</span>
                                </div>
                                <input
                                    id="rc-linkedin"
                                    type="url"
                                    value={linkedinUrl}
                                    onChange={e => setLinkedinUrl(e.target.value)}
                                    placeholder="https://linkedin.com/in/your-name"
                                    disabled={submitting}
                                    style={{
                                        width: '100%', padding: '0.7rem 0.9rem',
                                        border: '1.5px solid #E2E8F0', borderRadius: '10px',
                                        fontSize: '0.875rem', boxSizing: 'border-box',
                                        fontFamily: 'var(--font-sans)', outline: 'none',
                                        background: '#FAFBFC', color: '#0F172A',
                                        transition: 'border-color 0.15s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#003366'}
                                    onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                                />
                                <p style={{ margin: 0, fontSize: '0.7rem', color: '#94A3B8', lineHeight: 1.5 }}>
                                    Since you signed up via LinkedIn, this may already be known — you can still provide it for admin convenience.
                                </p>
                            </div>

                            <div style={{ background: '#F8FAFC', borderRadius: '9px', padding: '0.65rem 0.9rem', fontSize: '0.75rem', color: '#64748B', border: '1px solid #E2E8F0' }}>
                                Both categories have identical platform access. Your selection is used for community analytics only.
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    width: '100%', padding: '0.88rem',
                                    background: submitting ? '#94A3B8' : 'linear-gradient(135deg,#003366,#005099)',
                                    color: 'white', border: 'none', borderRadius: 10,
                                    fontWeight: 700, fontSize: '0.92rem',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    fontFamily: 'var(--font-sans)', transition: 'all 0.18s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    boxShadow: submitting ? 'none' : '0 4px 14px rgba(0,51,102,0.28)',
                                }}
                            >
                                {submitting
                                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                                    : <>Complete Registration <ArrowRight size={15} /></>
                                }
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
};

export default RegisterComplete;
