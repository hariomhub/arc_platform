import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, Loader2, LogOut, Wallet } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { acceptPolicy } from '../../api/chapterLead.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import PolicyAgreement from './PolicyAgreement.jsx';
import EarningsChoice from '../team/EarningsChoice.jsx';
import { labelOfUser } from '../../config/roles.js';

// Pages where the prompt never shows: people must be able to read the documents,
// and must always be able to leave (delete their account) without agreeing.
const EXEMPT_PATHS = ['/privacy', '/terms', '/delete-account', '/contact'];

/**
 * Blocks the app for an active chapter team member (Chapter Lead or Chapter Ambassador) who still owes
 * a step. The server decides which, through `gates` on /auth/me:
 *   1. gates.policy    accept the current version of the Privacy Policy and Terms
 *   2. gates.earnings  confirm employer clearance and (leads) choose to receive or waive earnings.
 *                      Only asked once the server has switched it on, after the wording is approved.
 * Existing members see this once at their next sign-in; new ones accept when they apply.
 */
const PolicyAcceptanceGate = () => {
    const { user, refreshUser, logout } = useAuth();
    const { pathname } = useLocation();
    const [checked, setChecked] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const step = user?.gates?.policy || user?.needs_policy_acceptance ? 'policy' : (user?.gates?.earnings ? 'earnings' : null);
    if (!step) return null;
    if (EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

    const role = labelOfUser(user);

    const handleAccept = async () => {
        if (!checked) { setError('Please tick the box to confirm you agree.'); return; }
        setSubmitting(true);
        setError('');
        try {
            await acceptPolicy();
            setChecked(false);
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
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto',
            }}
        >
            <div style={{ background: 'white', borderRadius: 16, maxWidth: 520, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.35)', overflow: 'hidden', margin: 'auto' }}>
                <div style={{ background: '#003366', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    {step === 'policy' ? <ShieldCheck size={22} color="#BFDBFE" aria-hidden="true" /> : <Wallet size={22} color="#BFDBFE" aria-hidden="true" />}
                    <h2 id="policy-gate-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'white' }}>
                        {step === 'policy' ? 'Please review our updated terms' : 'One more step for your chapter role'}
                    </h2>
                </div>

                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {step === 'policy' ? (
                        <>
                            <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.65 }}>
                                We have updated the Privacy Policy and the Terms for chapter teams. They now cover Chapter Leads and Chapter Ambassadors:
                                quarterly goals, your referral code and personal dashboard, the public chapter page, how ambassadors are approved,
                                revenue share and commission for Chapter Leads, and how a role can end. Please read them and confirm you agree to keep
                                using {role} features.
                            </p>
                            <PolicyAgreement
                                id="gate-accept"
                                scope="team"
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
                                    className="kit-btn"
                                    style={{
                                        flex: 1, minWidth: 160, padding: '0.75rem 1rem', border: 'none', borderRadius: 10,
                                        background: submitting ? '#94A3B8' : '#003366', color: 'white',
                                        fontWeight: 700, fontSize: '0.9rem', cursor: submitting ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-sans)',
                                    }}
                                >
                                    {submitting ? <><Loader2 size={15} className="kit-spin" /> Saving…</> : 'I agree and continue'}
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
                                    <LogOut size={14} aria-hidden="true" /> Sign out
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.65 }}>
                                {user.tier === 'ambassador'
                                    ? 'As a Chapter Ambassador you volunteer, so there is nothing to choose about earnings. We ask everyone on a chapter team to confirm one thing.'
                                    : 'As a Chapter Lead you can receive revenue share and commission, or waive them and lead as a volunteer. Some employers do not allow paid outside work, so the choice is yours. We also ask everyone on a chapter team to confirm one thing.'}
                            </p>
                            <EarningsChoice
                                tier={user.tier}
                                election={null}
                                submitLabel="Save and continue"
                                onSaved={() => refreshUser()}
                            />
                            <button
                                type="button"
                                onClick={logout}
                                style={{ alignSelf: 'flex-start', padding: '0.5rem 0.9rem', border: '1px solid #CBD5E1', borderRadius: 10, background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)' }}
                            >
                                <LogOut size={14} aria-hidden="true" /> Sign out
                            </button>
                        </>
                    )}
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748B', lineHeight: 1.55 }}>
                        If you do not agree, you can sign out, or <a href="/delete-account" style={{ color: '#003366', fontWeight: 600 }}>delete your account</a> at any time.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PolicyAcceptanceGate;
