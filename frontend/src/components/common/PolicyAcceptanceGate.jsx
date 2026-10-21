import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { acceptPolicy } from '../../api/chapterLead.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import PolicyAgreement from './PolicyAgreement.jsx';

// Pages where the prompt never shows: people must be able to read the documents,
// and must always be able to leave (delete their account) without agreeing.
const EXEMPT_PATHS = ['/privacy', '/terms', '/delete-account', '/contact'];

/**
 * Blocks the app for an active Chapter Lead who has not yet accepted the current
 * version of the Privacy Policy and Terms (the server decides via
 * `needs_policy_acceptance` on /auth/me). Existing leads see it once at their next
 * login after the programme goes live; new leads accept when they apply.
 */
const PolicyAcceptanceGate = () => {
    const { user, refreshUser, logout } = useAuth();
    const { pathname } = useLocation();
    const [checked, setChecked] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!user?.needs_policy_acceptance) return null;
    if (EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

    const handleAccept = async () => {
        if (!checked) { setError('Please tick the box to confirm you agree.'); return; }
        setSubmitting(true);
        setError('');
        try {
            await acceptPolicy();
            await refreshUser();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-gate-title"
            style={{
                position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(8,20,40,0.72)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}
        >
            <div style={{ background: 'white', borderRadius: 16, maxWidth: 480, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg,#002244,#003366)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <ShieldCheck size={22} color="#93c5fd" />
                    <h2 id="policy-gate-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'white' }}>
                        Please review our updated terms
                    </h2>
                </div>
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.65 }}>
                        We have updated the Privacy Policy and the Terms for Chapter Leads. The Chapter Lead section now covers
                        quarterly goals, your referral code and personal dashboard, revenue share and commission, and how the
                        role can end. Please read them and confirm you agree to keep using Chapter Lead features.
                    </p>

                    <PolicyAgreement
                        id="gate-accept"
                        checked={checked}
                        disabled={submitting}
                        error={error}
                        onChange={(v) => { setChecked(v); setError(''); }}
                    />

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={handleAccept}
                            disabled={submitting}
                            style={{
                                flex: 1, minWidth: 160, padding: '0.75rem 1rem', border: 'none', borderRadius: 10,
                                background: submitting ? '#94A3B8' : 'linear-gradient(135deg,#003366,#005099)', color: 'white',
                                fontWeight: 700, fontSize: '0.9rem', cursor: submitting ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-sans)',
                            }}
                        >
                            {submitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'I agree and continue'}
                        </button>
                        <button
                            type="button"
                            onClick={logout}
                            disabled={submitting}
                            style={{
                                padding: '0.75rem 1rem', border: '1px solid #CBD5E1', borderRadius: 10, background: 'white',
                                color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)',
                            }}
                        >
                            <LogOut size={14} /> Sign out
                        </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#94A3B8', lineHeight: 1.55 }}>
                        If you do not agree, you can sign out, or <a href="/delete-account" style={{ color: '#003366', fontWeight: 600 }}>delete your account</a> at any time.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PolicyAcceptanceGate;
