/**
 * Membership.jsx - Community Membership page
 *
 * Offer: the first 12 months are complimentary (no card, no automatic paid
 * renewal), then an explicit paid-renewal choice for India / United States.
 * Every amount, currency, period and tax phrase comes from config/pricing.js -
 * never hard-code a price in this file.
 *
 * Theme: matches app light theme (#f8fafc bg, white cards, #003366 primary, gradient hero)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Check, X, Shield, Zap, ArrowRight, Loader2,
    AlertCircle, ChevronDown, Award, Globe,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { applyCouncil } from '../api/membership.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import {
    COMPLIMENTARY_MONTHS, NO_PAYMENT_LINE, MARKETS, MARKET_ORDER,
    renewalLine, complimentaryPeriodLine, renewalSummary, detectSuggestedMarket,
} from '../config/pricing.js';

// ─── Feature lists ────────────────────────────────────────────────────────────
// Only list benefits that are operational today.
const COMMUNITY_FEATURES = [
    { label: 'Access to public news and available governance resources', included: true },
    { label: 'View the AI Risk Framework and resources online',           included: true },
    { label: 'Registration for open community events',                    included: true },
    { label: 'Comment and react in community discussions',                included: true },
    { label: 'Vote in AI Risk Awards / Initiatives',                      included: true },
    { label: 'Downloads (Working Professional) / No downloads (Final Year Undergrad)', included: 'partial' },
];

const COUNCIL_FEATURES = [
    { label: 'Everything in Community Membership' },
    { label: 'Create top-level community posts (subject to moderation)' },
    { label: 'Framework & resource downloads' },
    { label: 'Upload resources (pending admin approval)' },
    { label: 'Create events (pending admin approval)' },
    { label: 'Create news articles (pending approval)' },
    { label: 'Create workshops (pending approval)' },
    { label: 'Manage automated news feed' },
];

// ─── Comparison table ─────────────────────────────────────────────────────────
const COMPARISON_ROWS = [
    { feature: 'Public news & resources',                        pro: true,      council: true  },
    { feature: 'Events calendar & registration',                 pro: true,      council: true  },
    { feature: 'Comment & react in community discussions',       pro: true,      council: true  },
    { feature: 'Create top-level posts (subject to moderation)', pro: false,     council: true  },
    { feature: 'Rate & review products (community ratings)',     pro: true,      council: true  },
    { feature: 'Vote in AI Risk Awards / Initiatives',           pro: true,      council: true  },
    { feature: 'View frameworks & resources online',             pro: true,      council: true  },
    { feature: 'Downloads',                                      pro: 'subtype', council: true  },
    { feature: 'Upload resources (pending approval)',            pro: 'subtype', council: true  },
    { feature: 'Create events (pending approval)',               pro: false,     council: true  },
    { feature: 'Create news (pending approval)',                 pro: false,     council: true  },
    { feature: 'Create workshops (pending approval)',            pro: false,     council: true  },
    { feature: 'Manage automated news feed',                     pro: false,     council: true  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ = [
    {
        q: 'Will I be charged today?',
        a: `No. Your first ${COMPLIMENTARY_MONTHS} months of Community Membership are complimentary.`,
    },
    {
        q: `What happens after ${COMPLIMENTARY_MONTHS} months?`,
        a: renewalSummary(),
    },
    {
        q: `When do my ${COMPLIMENTARY_MONTHS} months start?`,
        a: `Your ${COMPLIMENTARY_MONTHS} months start when your membership is activated, not when you visit this page. New accounts are reviewed by our admin team, usually within 24–48 hours.`,
    },
    {
        q: 'Are all events and courses included?',
        a: 'Membership includes the benefits listed on this page. Any separately priced workshop or learning programme will show its own fees before registration.',
    },
    {
        q: 'How do I become a Chapter Lead?',
        a: 'Apply to contribute resources or help facilitate the community. Selection is based on experience and the proposed contribution, not a higher subscription fee.',
    },
    {
        q: 'What does "pending admin approval" mean for Chapter Leads?',
        a: 'When a Chapter Lead creates an event, news article, or workshop, it is saved as a draft and reviewed by a Founding Member admin before going public. Uploaded resources are reviewed before they are published. This ensures content quality and governance standards.',
    },
    {
        q: 'Who are Founding Members?',
        a: 'Founding Members are senior administrators who manage the platform. They are appointed directly - there is no public application process for this role.',
    },
];

// ─── Sub-categories ───────────────────────────────────────────────────────────
const SUB_CATEGORIES = [
    {
        value: 'working_professional',
        emoji: '💼',
        label: 'Working Professional',
        tag: 'Industry & Corporate',
        desc: 'Currently employed in any sector - technology, finance, policy, or consulting - where AI governance intersects with your work.',
        traits: ['Full-time employment', 'Industry practitioners', 'Cross-sector roles'],
    },
    {
        value: 'final_year_undergrad',
        emoji: '🎓',
        label: 'Final Year Undergraduate',
        tag: 'Academic & Emerging',
        desc: 'In your final year of undergraduate studies, aspiring to build a career in AI risk, governance, or responsible AI policy.',
        traits: ['Final year students', 'AI & tech programs', 'Future practitioners'],
    },
];

// ─── Market selector ──────────────────────────────────────────────────────────
// Radio group with a roving tabindex: Tab enters/leaves the group, arrow keys
// move and select. Both markets stay fully visible below it, so no price is
// ever hidden behind the selection.
const MarketSelector = ({ value, onChange }) => {
    const handleKeyDown = (e, idx) => {
        const last = MARKET_ORDER.length - 1;
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown')     next = idx === last ? 0 : idx + 1;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')   next = idx === 0 ? last : idx - 1;
        else if (e.key === 'Home')                               next = 0;
        else if (e.key === 'End')                                next = last;
        if (next === null) return;
        e.preventDefault();
        onChange(MARKET_ORDER[next]);
        e.currentTarget.parentElement.querySelectorAll('[role="radio"]')[next]?.focus();
    };

    return (
        <div role="radiogroup" aria-label="Select your market" className="mem-market-group">
            {MARKET_ORDER.map((code, idx) => {
                const m = MARKETS[code];
                const checked = value === code;
                return (
                    <button
                        key={code}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        tabIndex={checked || (!value && idx === 0) ? 0 : -1}
                        className={`mem-market-opt${checked ? ' on' : ''}`}
                        onClick={() => onChange(code)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                    >
                        <Globe size={15} aria-hidden="true" />
                        <span>{m.label}</span>
                        <span className="mem-market-cur">{m.currency}</span>
                    </button>
                );
            })}
        </div>
    );
};

// ─── Market pricing card ──────────────────────────────────────────────────────
// `cta.action` present  -> a real button (opens the join flow).
// `cta.action` missing  -> a status chip, never a dead-looking disabled button.
const MarketCard = ({ market, selected, cta }) => {
    const positive = cta.label.startsWith('✓');
    return (
        <div className={`mem-card${selected ? ' selected' : ''}`} aria-label={`${market.label} membership pricing`}>
            <div style={{ padding: '1.25rem 1.5rem 0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Globe size={19} color="#059669" aria-hidden="true" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#1e293b' }}>{market.label}</h3>
                    <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Prices in {market.currency}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '2.7rem', fontWeight: '900', color: '#059669', lineHeight: 1.1 }}>{market.complimentaryPrice}</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: '700', color: '#475569' }}>{complimentaryPeriodLine()}</span>
                </div>
                <p style={{ margin: '0.55rem 0 0', fontSize: '0.98rem', color: '#475569', lineHeight: '1.55' }}>{renewalLine(market)}</p>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.92rem', fontWeight: '700', color: '#003366', lineHeight: '1.55' }}>{NO_PAYMENT_LINE}</p>
            </div>

            <div style={{ padding: '0.4rem 1.5rem 1.25rem', marginTop: 'auto' }}>
                {cta.action ? (
                    <button type="button" className="mem-btn mem-btn-primary" onClick={cta.action}>
                        {cta.label}<ArrowRight size={16} />
                    </button>
                ) : (
                    <div className={`mem-status ${positive ? 'ok' : 'wait'}`}>{cta.label}</div>
                )}
            </div>
        </div>
    );
};

// ─── Offer summary (shown when joining) ───────────────────────────────────────
// Shows the selected market's terms, or both if no market has been chosen yet.
const OfferSummary = ({ market }) => {
    const codes = market ? [market] : MARKET_ORDER;
    return (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.7rem 0.9rem', fontSize: '0.78rem', color: '#166534', lineHeight: '1.6' }}>
            {codes.map(code => {
                const m = MARKETS[code];
                return (
                    <p key={code} style={{ margin: 0 }}>
                        <strong>{m.label}:</strong> {m.complimentaryPrice} {complimentaryPeriodLine()}. {renewalLine(m)}
                    </p>
                );
            })}
            <p style={{ margin: '0.25rem 0 0', fontWeight: '700' }}>{NO_PAYMENT_LINE}</p>
        </div>
    );
};

// ─── Membership Page ──────────────────────────────────────────────────────────
const Membership = () => {
    const navigate = useNavigate();
    const { user, isLoggedIn, isAuthLoading, refreshUser } = useAuth();
    const { showToast } = useToast();

    // Market: the browser locale may suggest a default, but the visitor can
    // always change it. null = no clear signal (no guessing for other countries).
    const [suggestedMarket] = useState(detectSuggestedMarket);
    const [market, setMarket] = useState(suggestedMarket);

    const [showCouncilModal, setShowCouncilModal] = useState(false);
    const [councilForm, setCouncilForm] = useState({
        organization_name: '', job_title: '', linkedin_url: '',
        professional_bio: '', why_council_member: '',
    });
    const [councilSubmitting, setCouncilSubmitting] = useState(false);
    const [councilError,   setCouncilError]   = useState('');
    const [councilSuccess, setCouncilSuccess] = useState(false);

    const [showSubCatModal, setShowSubCatModal] = useState(false);
    const [selectedSubCat,  setSelectedSubCat]  = useState('working_professional');
    const [openFaq, setOpenFaq] = useState(null);

    // Upgrade handler state — must be declared BEFORE any early return (Rules of Hooks)
    const [upgrading, setUpgrading] = useState(false);
    const [upgraded,  setUpgraded]  = useState(false);

    useEffect(() => { document.title = 'Membership | Risk AI Council'; }, []);

    // Re-fetch fresh user data on mount (fixes stale status after SPA navigation post-login)
    useEffect(() => {
        if (!isAuthLoading && isLoggedIn) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Auth loading guard (placed after ALL hooks) ──────────────────────────────
    if (isAuthLoading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: '#F8FAFC', fontFamily: 'var(--font-sans)',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 44, height: 44, border: '3px solid #E2E8F0',
                        borderTopColor: '#003366', borderRadius: '50%',
                        animation: 'spin 0.9s linear infinite', margin: '0 auto 1rem',
                    }} />
                    <p style={{ color: '#94A3B8', fontSize: '0.875rem', margin: 0 }}>Loading membership…</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    // ── Access state ──────────────────────────────────────────────────────────
    const currentRole = user?.role;
    const isApproved  = user?.status === 'approved';
    const isCouncil   = ['council_member', 'executive'].includes(currentRole);
    const isFounder   = currentRole === 'founding_member';
    const isUndergrad  = currentRole === 'professional' && user?.professional_sub_type === 'final_year_undergrad';
    const isPendingUpgrade = !!user?.pending_sub_type_upgrade;

    const JOIN_LABEL = `Join free for ${COMPLIMENTARY_MONTHS} months`;

    // Opens the profile picker; an explicit market choice (from a card) sticks.
    const openJoin = (code) => {
        if (code) setMarket(code);
        setShowSubCatModal(true);
    };

    const getProfCta = () => {
        if (!isLoggedIn)                                                     return { label: JOIN_LABEL,                       action: () => openJoin() };
        if (isFounder)                                                       return { label: '✓ Founding Member',              action: null };
        if (isCouncil && isApproved)                                         return { label: '✓ You are a Chapter Lead',       action: null };
        if (isCouncil)                                                       return { label: 'Chapter Lead Application Pending', action: null };
        if (currentRole === 'professional' && isApproved && isUndergrad && (isPendingUpgrade || upgraded))
                                                                             return { label: '⏳ Upgrade Pending Review',      action: null };
        if (currentRole === 'professional' && isApproved && isUndergrad)     return { label: '↑ Request Upgrade',              action: () => handleUpgradeRequest(), isUpgrade: true };
        if (currentRole === 'professional' && isApproved)                    return { label: "✓ You're a Community Member",    action: null };
        if (currentRole === 'professional')                                  return { label: 'Application Pending',            action: null };
        return { label: JOIN_LABEL, action: () => openJoin() };
    };

    const getCouncilCta = () => {
        if (!isLoggedIn)        return { label: 'Apply to be a Chapter Lead',  action: () => navigate('/login?next=/membership') };
        if (isFounder)          return { label: '✓ Founding Member',             action: null };
        if (isCouncil && isApproved) return { label: '✓ You are a Chapter Lead', action: null };
        if (isCouncil)          return { label: 'Application Under Review',      action: null };
        return { label: 'Apply to be a Chapter Lead', action: () => setShowCouncilModal(true) };
    };

    const profCta    = getProfCta();
    const councilCta = getCouncilCta();

    // Each market card gets its own CTA. Signed-out visitors join in that market;
    // signed-in members see their status (the undergrad upgrade request already
    // has its own banner and footer button, so it isn't repeated on both cards).
    const marketCta = (code) => {
        if (!isLoggedIn) return { label: JOIN_LABEL, action: () => openJoin(code) };
        // Signed in: show a status chip, never a disabled-looking action button.
        // (An undergrad is already a Community Member; their upgrade request has
        // its own banner and footer button.)
        if (profCta.isUpgrade) return { label: "✓ You're a Community Member", action: null };
        return { label: profCta.label, action: profCta.action };
    };

    // One line under the section title: says a market was pre-selected (and can
    // be changed), otherwise explains what the selector is for.
    const marketHint = suggestedMarket && market === suggestedMarket
        ? `We've pre-selected ${MARKETS[suggestedMarket].label} based on your location - you can change it.`
        : `Select your market to see how your first ${COMPLIMENTARY_MONTHS} months and annual renewal work.`;

    // Upgrade handler for final_year_undergrad → working_professional

    const handleUpgradeRequest = async () => {
        if (upgrading || isPendingUpgrade || upgraded) return;
        setUpgrading(true);
        try {
            const { requestSubTypeUpgrade } = await import('../api/auth.js');
            await requestSubTypeUpgrade();
            setUpgraded(true);
            showToast('Upgrade request submitted! Admin will review within 24–48 hours.', 'success');
        } catch (err) {
            showToast(err?.response?.data?.message || 'Request failed. Please try again.', 'error');
        } finally {
            setUpgrading(false);
        }
    };

    // ── Council form submit ───────────────────────────────────────────────────
    const handleCouncilSubmit = async (e) => {
        e.preventDefault();
        setCouncilError('');
        if (!councilForm.why_council_member?.trim()) {
            setCouncilError('Please tell us why you want to become a Chapter Lead.');
            return;
        }
        setCouncilSubmitting(true);
        try {
            await applyCouncil(councilForm);
            setCouncilSuccess(true);
        } catch (err) {
            setCouncilError(getErrorMessage(err));
        } finally {
            setCouncilSubmitting(false);
        }
    };

    const iStyle = {
        width: '100%', padding: '0.6rem 0.85rem',
        border: '1px solid #CBD5E1', borderRadius: '8px',
        fontSize: '0.875rem', fontFamily: 'var(--font-sans)',
        color: '#1e293b', background: '#fafafa',
        boxSizing: 'border-box', outline: 'none',
        transition: 'border-color 0.15s',
    };
    const lStyle = { display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: '600', color: '#374151' };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'var(--font-sans)' }}>
            <style>{`
                @keyframes spin   { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }

                .mem-card {
                    background: white; border-radius: 14px;
                    border: 1px solid #E2E8F0;
                    box-shadow: 0 1px 8px rgba(0,0,0,0.05);
                    transition: transform 0.22s, box-shadow 0.22s;
                    display: flex; flex-direction: column;
                    overflow: hidden;
                }
                .mem-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,51,102,0.11); }
                .mem-card.featured { border: 2px solid #003366; box-shadow: 0 4px 18px rgba(0,51,102,0.13); }

                .mem-btn {
                    width: 100%; padding: 0.78rem 1rem; border-radius: 9px; border: none;
                    font-family: var(--font-sans); font-weight: 700; font-size: 0.98rem;
                    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px;
                    transition: all 0.18s;
                }
                .mem-btn-primary { background: #003366; color: white; }
                .mem-btn-primary:hover:not(:disabled) { background: #004080; transform: translateY(-1px); box-shadow: 0 5px 16px rgba(0,51,102,0.22); }
                .mem-btn-outline  { background: white; color: #003366; border: 1.5px solid #003366 !important; }
                .mem-btn-outline:hover:not(:disabled) { background: #EEF4FF; }
                .mem-btn:disabled { opacity: 0.55; cursor: default; transform: none !important; box-shadow: none !important; }

                .mem-faq { background: white; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; }
                .mem-faq-q {
                    width: 100%; background: transparent; border: none; text-align: left;
                    padding: 0.85rem 1.1rem; cursor: pointer;
                    display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;
                    font-family: var(--font-sans); font-size: 0.98rem; font-weight: 600; color: #1e293b;
                    transition: background 0.12s;
                }
                .mem-faq-q:hover { background: #F8FAFC; }
                .mem-faq-a { padding: 0 1.1rem 1rem; font-size: 0.92rem; color: #64748B; line-height: 1.65; }

                .mem-table { width: 100%; border-collapse: collapse; }
                .mem-table thead th {
                    padding: 0.7rem 1.1rem; font-size: 0.8rem; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.07em; color: #64748B;
                    border-bottom: 2px solid #E2E8F0; background: #F8FAFC;
                }
                .mem-table thead th.col-pro  { color: #059669; text-align: center; }
                .mem-table thead th.col-coun { color: #003366; text-align: center; }
                .mem-table thead th.col-feat { text-align: left; }
                .mem-table tbody tr { border-bottom: 1px solid #F1F5F9; transition: background 0.1s; }
                .mem-table tbody tr:last-child { border-bottom: none; }
                .mem-table tbody tr:hover { background: #F8FAFC; }
                .mem-table tbody td { padding: 0.55rem 1.1rem; font-size: 0.95rem; color: #374151; }
                .mem-table tbody td:not(:first-child) { text-align: center; }

                /* sub-cat columns */
                .subcol-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
                @media (max-width: 500px) { .subcol-grid { grid-template-columns: 1fr; } }

                .subcat-pick {
                    border: 2px solid #E2E8F0; border-radius: 12px; padding: 1rem 1.1rem;
                    cursor: pointer; text-align: left; width: 100%;
                    background: white; font-family: var(--font-sans); transition: all 0.18s;
                }
                .subcat-pick:hover { border-color: #003366; background: #F5F9FF; }
                .subcat-pick.sel   { border-color: #003366; background: #EEF4FF; }

                .mem-modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                    display: flex; align-items: flex-start; justify-content: center;
                    z-index: 1000; padding: 1rem; overflow-y: auto; backdrop-filter: blur(3px);
                }
                .mem-modal {
                    background: white; border-radius: 18px; width: 100%; max-width: 620px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden;
                    animation: fadeUp 0.26s ease both; margin: auto;
                }
                .mem-modal-hd {
                    background: linear-gradient(135deg, #001a33, #003366);
                    padding: 1.25rem 1.5rem;
                    display: flex; justify-content: space-between; align-items: flex-start;
                }
                .mem-modal-bd { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.9rem; }

                /* market selector (radio group) + selected market card */
                .mem-market-group {
                    display: inline-flex; gap: 0.3rem; padding: 0.25rem;
                    background: white; border: 1px solid #E2E8F0; border-radius: 12px;
                    box-shadow: 0 1px 6px rgba(0,0,0,0.05); max-width: 100%; flex-wrap: wrap; justify-content: center;
                }
                .mem-market-opt {
                    display: inline-flex; align-items: center; gap: 7px;
                    padding: 0.55rem 1.15rem; border-radius: 9px; border: 1.5px solid transparent;
                    background: transparent; color: #475569; cursor: pointer;
                    font-family: var(--font-sans); font-size: 0.95rem; font-weight: 700;
                    transition: background 0.15s, color 0.15s, border-color 0.15s;
                }
                .mem-market-opt:hover { background: #F1F5F9; }
                .mem-market-opt.on { background: #003366; color: white; border-color: #003366; }
                .mem-market-opt:focus-visible { outline: 3px solid #60A5FA; outline-offset: 2px; }
                .mem-market-cur {
                    font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em;
                    padding: 1px 7px; border-radius: 100px; background: rgba(148,163,184,0.2);
                }
                .mem-market-opt.on .mem-market-cur { background: rgba(255,255,255,0.22); }
                /* narrow screens: one full-width row, two equal halves */
                @media (max-width: 560px) {
                    .mem-market-group { display: flex; width: 100%; flex-wrap: nowrap; box-sizing: border-box; }
                    .mem-market-opt { flex: 1 1 0; justify-content: center; padding: 0.55rem 0.5rem; gap: 5px; font-size: 0.88rem; min-width: 0; }
                }
                .mem-card.selected { border: 2px solid #003366; box-shadow: 0 4px 18px rgba(0,51,102,0.13); }
                /* full-width panels: same look as .mem-card but no hover lift */
                .mem-panel { background: white; border-radius: 14px; border: 1px solid #E2E8F0; box-shadow: 0 1px 8px rgba(0,0,0,0.05); }
                .mem-panel.featured { border: 2px solid #003366; box-shadow: 0 4px 18px rgba(0,51,102,0.13); }

                /* what's-included + contributor feature lists */
                .mem-feat-list { display: flex; flex-direction: column; gap: 0.6rem; }
                .mem-feat { display: flex; align-items: center; gap: 0.7rem; font-size: 0.95rem; color: #374151; line-height: 1.4; }
                .mem-feat-dot { width: 21px; height: 21px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }

                /* status chip (replaces a disabled-looking button for signed-in members) */
                .mem-status { width: 100%; box-sizing: border-box; text-align: center; padding: 0.7rem 1rem; border-radius: 9px; font-weight: 700; font-size: 0.98rem; }
                .mem-status.ok   { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
                .mem-status.wait { background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }

                /* profile rows: plain for members, real buttons for signed-out visitors */
                .mem-chip { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; width: 100%; box-sizing: border-box; text-align: left; border: 1px solid #E2E8F0; border-radius: 10px; background: #FAFBFC; padding: 0.65rem 0.9rem; font-family: var(--font-sans); }
                .mem-chip-btn { cursor: pointer; transition: border-color 0.15s, background 0.15s; }
                .mem-chip-btn:hover { border-color: #003366; background: #F5F9FF; }
                .mem-chip-btn:focus-visible { outline: 3px solid #60A5FA; outline-offset: 2px; }

                /* FAQ: two columns on wide screens */
                .mem-faq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1rem; align-items: start; }
                @media (max-width: 760px) { .mem-faq-grid { grid-template-columns: 1fr; } }
            `}</style>

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            <div style={{
                background: 'linear-gradient(135deg, #002244 0%, #003366 55%, #005599 100%)',
                padding: 'clamp(1.5rem,3vw,2.25rem) clamp(1rem,4vw,3rem)',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
                
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: 'rgba(255,255,255,0.1)', borderRadius: '100px',
                        padding: '0.3rem 0.9rem', marginBottom: '0.8rem',
                        fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.12em',
                        color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase',
                    }}>
                        <Shield size={12} color="#60A5FA" /> Community Membership
                    </div>
                    <h1 style={{
                        color: 'white', fontSize: 'clamp(1.9rem,4vw,2.9rem)',
                        fontWeight: '800', margin: '0 0 0.7rem', lineHeight: '1.15',
                        fontFamily: 'var(--font-sans)',
                    }}>
                        Your first {COMPLIMENTARY_MONTHS} months are on us.
                    </h1>
                    <p style={{
                        color: '#CBD5E1',
                        fontSize: 'clamp(1rem,1.6vw,1.15rem)',
                        lineHeight: '1.65', margin: 0, maxWidth: '740px', marginInline: 'auto',
                    }}>
                        Join a growing community of AI risk and governance practitioners. Explore available resources, take part in community learning, and help shape what we build next.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem 1rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                        {!isLoggedIn ? (
                            <>
                                <button onClick={() => openJoin()} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'white', color: '#003366', padding: '0.7rem 1.6rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.98rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    {JOIN_LABEL} <ArrowRight size={14} />
                                </button>
                                <button onClick={() => navigate('/login')} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.7rem 1.6rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.98rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    Sign in
                                </button>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)' }}>
                                    No payment required today.
                                </p>
                            </>
                        ) : isFounder ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '8px', padding: '0.7rem 1.6rem' }}>
                                <Shield size={16} color="#f59e0b" />
                                <span style={{ fontWeight: '700', fontSize: '0.98rem', color: '#fbbf24' }}>✓ Founding Member</span>
                            </div>
                        ) : isCouncil && isApproved ? (
                            <>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', padding: '0.7rem 1.6rem' }}>
                                    <Award size={16} color="#93c5fd" />
                                    <span style={{ fontWeight: '700', fontSize: '0.98rem', color: 'white' }}>✓ Chapter Lead</span>
                                </div>
                                <button onClick={() => document.getElementById('membership-cards')?.scrollIntoView({ behavior: 'smooth' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.7rem 1.6rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.98rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    View Benefits
                                </button>
                            </>
                        ) : isCouncil ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '0.7rem 1.6rem' }}>
                                <Loader2 size={15} color="#93c5fd" style={{ animation: 'spin 1.5s linear infinite' }} />
                                <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)' }}>Chapter Lead Application Under Review</span>
                            </div>
                        ) : currentRole === 'professional' && isApproved ? (
                            <>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(5,118,66,0.2)', border: '1px solid rgba(5,118,66,0.4)', borderRadius: '8px', padding: '0.7rem 1.6rem' }}>
                                    <Shield size={16} color="#4ade80" />
                                    <span style={{ fontWeight: '700', fontSize: '0.98rem', color: '#4ade80' }}>✓ Community Member</span>
                                </div>
                                <button onClick={() => setShowCouncilModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.7rem 1.6rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.98rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    Apply to be a Chapter Lead <ArrowRight size={14} />
                                </button>
                            </>
                        ) : currentRole === 'professional' ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '0.7rem 1.6rem' }}>
                                <Loader2 size={15} color="#93c5fd" style={{ animation: 'spin 1.5s linear infinite' }} />
                                <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)' }}>Application Pending Approval</span>
                            </div>
                        ) : (
                            <button onClick={() => document.getElementById('membership-cards')?.scrollIntoView({ behavior: 'smooth' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'white', color: '#003366', padding: '0.7rem 1.6rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.98rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                View Membership <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
            <div id="membership-cards" style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(1.25rem,2.5vw,2rem) clamp(1rem,4vw,3rem)' }}>

                {/* ── UNDERGRAD UPGRADE BANNER ────────────────────────────── */}
                {isLoggedIn && isUndergrad && (
                    <div style={{
                        background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
                        border: '1.5px solid #FCD34D',
                        borderRadius: '14px',
                        padding: '1rem 1.25rem',
                        marginBottom: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.6rem 1rem',
                    }}>
                        <div>
                            <p style={{ margin: '0 0 3px', fontWeight: '800', fontSize: '0.95rem', color: '#92400E' }}>
                                🎓 You're a Final Year Undergraduate
                            </p>
                            <p style={{ margin: 0, fontSize: '0.92rem', color: '#B45309', lineHeight: '1.55' }}>
                                Upgrade to <strong>Working Professional</strong> to unlock 10 resource downloads/month — no extra cost, just admin approval (24–48 hrs).
                            </p>
                        </div>
                        {(isPendingUpgrade || upgraded) ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FEF9C3', border: '1px solid #FCD34D', borderRadius: '8px', padding: '0.6rem 1.1rem', fontSize: '0.83rem', fontWeight: '700', color: '#92400E', whiteSpace: 'nowrap' }}>
                                ⏳ Upgrade request pending admin review
                            </span>
                        ) : (
                            <button
                                onClick={handleUpgradeRequest}
                                disabled={upgrading}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', padding: '0.65rem 1.4rem', fontWeight: '700', fontSize: '0.875rem', cursor: upgrading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: upgrading ? 0.7 : 1, whiteSpace: 'nowrap' }}
                            >
                                {upgrading ? '⏳ Submitting…' : '↑ Request Upgrade to Working Professional'}
                            </button>
                        )}
                    </div>
                )}

                {/* ── COMMUNITY MEMBERSHIP: market selector + India / United States ──── */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.75rem 1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div style={{ minWidth: 0 }}>
                        <h2 style={{ margin: '0 0 0.25rem', fontSize: 'clamp(1.35rem,2.6vw,1.75rem)', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em' }}>
                            Community Membership
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748B' }}>{marketHint}</p>
                    </div>
                    <MarketSelector value={market} onChange={setMarket} />
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))',
                    gap: '1.25rem', alignItems: 'stretch',
                }}>
                    {MARKET_ORDER.map(code => (
                        <MarketCard
                            key={code}
                            market={MARKETS[code]}
                            selected={market === code}
                            cta={marketCta(code)}
                        />
                    ))}
                </div>

                {/* ── WHAT'S INCLUDED  |  CHAPTER LEAD  (side by side) ─────────── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))',
                    gap: '1.25rem', alignItems: 'stretch', marginTop: '1.25rem',
                }}>
                    {/* Community Membership: what's included + profiles */}
                    <div className="mem-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: '0 0 0.85rem', fontSize: '1.15rem', fontWeight: '800', color: '#1e293b' }}>
                            What's included in Community Membership
                        </h3>
                        <div className="mem-feat-list">
                            {COMMUNITY_FEATURES.map(({ label, included }, i) => (
                                <div key={i} className="mem-feat">
                                    <div className="mem-feat-dot" style={{ background: included === true ? '#D1FAE5' : '#FEF3C7' }}>
                                        {included === true
                                            ? <Check size={12} color="#059669" strokeWidth={3} />
                                            : <span style={{ fontSize: '11px', fontWeight: '900', color: '#D97706' }}>~</span>}
                                    </div>
                                    <span>{label}</span>
                                </div>
                            ))}
                        </div>
                        <p style={{ margin: '0.75rem 0 0', fontSize: '0.86rem', color: '#64748B', lineHeight: '1.55' }}>
                            Paid workshops and future certifications are separate unless explicitly included.
                        </p>

                        <div style={{ height: '1px', background: '#F1F5F9', margin: '1rem 0' }} />

                        <p style={{ margin: '0 0 0.55rem', fontSize: '0.72rem', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Choose your profile at sign-up
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {SUB_CATEGORIES.map(sc => {
                                const inner = (
                                    <>
                                        <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{sc.emoji}</span>
                                        <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b' }}>{sc.label}</span>
                                        <span style={{ fontSize: '0.72rem', fontWeight: '700', background: '#ECFDF5', color: '#059669', padding: '2px 9px', borderRadius: '100px' }}>{sc.tag}</span>
                                        {!isLoggedIn && <ArrowRight size={16} color="#003366" style={{ marginLeft: 'auto', flexShrink: 0 }} aria-hidden="true" />}
                                    </>
                                );
                                // Signed out: the row is a real button that starts joining with that profile.
                                return isLoggedIn ? (
                                    <div key={sc.value} className="mem-chip">{inner}</div>
                                ) : (
                                    <button
                                        key={sc.value}
                                        type="button"
                                        className="mem-chip mem-chip-btn"
                                        onClick={() => { setSelectedSubCat(sc.value); openJoin(); }}
                                    >
                                        {inner}
                                    </button>
                                );
                            })}
                        </div>
                        <p style={{ margin: '0.6rem 0 0', fontSize: '0.84rem', color: '#64748B', lineHeight: '1.55' }}>
                            Both profiles get the same free {COMPLIMENTARY_MONTHS} months. Download access depends on your profile.
                        </p>

                        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '0.7rem 0.9rem', fontSize: '0.86rem', color: '#166534', lineHeight: '1.55' }}>
                                <strong>How your {COMPLIMENTARY_MONTHS} months work:</strong> they begin when your membership is activated, not when you visit this page. Taxes are always stated separately from the price. See the <Link to="/terms" style={{ color: '#166534', fontWeight: '700' }}>Terms of Use</Link>.
                            </div>
                        </div>
                    </div>

                    {/* Chapter Lead: application-based contributor role (no price, no term) */}
                    <div className="mem-panel featured" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                            background: '#003366', padding: '0.55rem 1.5rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem',
                        }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Chapter Lead
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Application-based</span>
                        </div>

                        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.7rem' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Zap size={19} color="#003366" />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#1e293b', lineHeight: 1.2 }}>Chapter Lead</h2>
                                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#94A3B8' }}>Contributor role · layered on Community Membership</p>
                                </div>
                            </div>

                            <p style={{ margin: '0 0 0.9rem', fontSize: '0.95rem', color: '#64748B', lineHeight: '1.6' }}>
                                Apply to contribute resources or help facilitate the community. Selection is based on experience and the proposed contribution, not a higher subscription fee. Contributions are reviewed before they are published.
                            </p>

                            <div className="mem-feat-list">
                                {COUNCIL_FEATURES.map(({ label }, i) => (
                                    <div key={i} className="mem-feat">
                                        <div className="mem-feat-dot" style={{ background: '#DBEAFE' }}>
                                            <Check size={12} color="#003366" strokeWidth={3} />
                                        </div>
                                        <span>{label}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: 'auto', paddingTop: '1.1rem' }}>
                                {councilCta.action ? (
                                    <button type="button" className="mem-btn mem-btn-primary" onClick={councilCta.action}>
                                        {councilCta.label}<ArrowRight size={16} />
                                    </button>
                                ) : (
                                    <div className={`mem-status ${councilCta.label.startsWith('✓') ? 'ok' : 'wait'}`}>{councilCta.label}</div>
                                )}
                                {!isLoggedIn && (
                                    <p style={{ margin: '0.55rem 0 0', textAlign: 'center', fontSize: '0.84rem', color: '#94A3B8' }}>
                                        Already a member?{' '}
                                        <Link to="/login?next=/membership" style={{ color: '#003366', fontWeight: '700', textDecoration: 'none' }}>Sign in</Link>{' '}to apply
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── COMPARISON TABLE ──────────────────────────────────────── */}
                <div style={{ marginTop: '2rem' }}>
                    <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
                        <h2 style={{ margin: '0 0 0.25rem', fontSize: 'clamp(1.35rem,2.6vw,1.75rem)', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em' }}>
                            Full Feature Comparison
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748B' }}>See exactly what's included in Community Membership and the Chapter Lead role.</p>
                    </div>

                    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                        <table className="mem-table">
                            <thead>
                                <tr>
                                    <th className="col-feat">Feature</th>
                                    <th className="col-pro">Community Member</th>
                                    <th className="col-coun">Chapter Lead</th>
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON_ROWS.map(({ feature, pro, council }, i) => (
                                    <tr key={i}>
                                        <td>{feature}</td>
                                        <td>
                                            {pro === true && <Check size={17} color="#059669" strokeWidth={2.5} style={{ display: 'inline' }} />}
                                            {pro === false && <X size={15} color="#EF4444" strokeWidth={2.5} style={{ display: 'inline' }} />}
                                            {pro === 'partial' && <span style={{ fontSize:'0.7rem', fontWeight:'800', color:'#D97706', background:'#FEF3C7', padding:'1px 6px', borderRadius:'4px' }}>Partial</span>}
                                            {pro === 'subtype' && (
                                                <div style={{ display:'flex', flexDirection:'column', gap:'3px', alignItems:'flex-start' }}>
                                                    <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'0.85rem', color:'#374151' }}>
                                                        <Check size={12} color="#059669" strokeWidth={3}/> Working Professional
                                                    </span>
                                                    <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'0.85rem', color:'#94A3B8' }}>
                                                        <X size={11} color="#EF4444" strokeWidth={2.5}/> Final Year Undergrad
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td>{council ? <Check size={17} color="#003366" strokeWidth={2.5} style={{ display: 'inline' }} /> : <X size={15} color="#EF4444" strokeWidth={2.5} style={{ display: 'inline' }} />}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── FAQ ───────────────────────────────────────────────────── */}
                <div style={{ marginTop: '2rem' }}>
                    <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
                        <h2 style={{ margin: '0 0 0.25rem', fontSize: 'clamp(1.35rem,2.6vw,1.75rem)', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em' }}>
                            Frequently Asked Questions
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748B' }}>Everything you need to know about Community Membership.</p>
                    </div>
                    <div className="mem-faq-grid">
                    {FAQ.map((item, i) => (
                        <div key={i} className="mem-faq">
                            <button className="mem-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                                <span>{item.q}</span>
                                <ChevronDown size={16} color="#94A3B8" style={{ transition: 'transform 0.22s', transform: openFaq === i ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
                            </button>
                            {openFaq === i && <div className="mem-faq-a">{item.a}</div>}
                        </div>
                    ))}
                    </div>
                </div>

                {/* ── CTA FOOTER ────────────────────────────────────────────── */}
                <div style={{
                    marginTop: '2rem',
                    background: 'linear-gradient(135deg, #001a33, #003366)',
                    borderRadius: '16px', padding: 'clamp(1.5rem,3vw,2.25rem) clamp(1.25rem,3vw,2rem)',
                    textAlign: 'center',
                }}>
                    {/* Role-aware CTA content */}
                    {isFounder ? (
                        <>
                            <h2 style={{ margin: '0 0 0.5rem', color: 'white', fontSize: 'clamp(1.3rem,2.6vw,1.75rem)', fontWeight: '800' }}>You're a Founding Member</h2>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: '1.6' }}>You have full platform access and administrative privileges.</p>
                        </>
                    ) : isCouncil && isApproved ? (
                        <>
                            <h2 style={{ margin: '0 0 0.5rem', color: 'white', fontSize: 'clamp(1.3rem,2.6vw,1.75rem)', fontWeight: '800' }}>You're a Chapter Lead ✓</h2>
                            <p style={{ margin: '0 auto 1.25rem', color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: '1.6', maxWidth: '420px' }}>You have full access to downloads, content creation, and platform-wide privileges.</p>
                            <button onClick={() => navigate('/user/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'white', color: '#003366', padding: '0.7rem 1.6rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.98rem', border: 'none', cursor: 'pointer' }}>
                                Go to Dashboard <ArrowRight size={13} />
                            </button>
                        </>
                    ) : currentRole === 'professional' && isApproved && isUndergrad ? (
                        <>
                            <h2 style={{ margin: '0 0 0.5rem', color: 'white', fontSize: 'clamp(1.3rem,2.6vw,1.75rem)', fontWeight: '800' }}>🎓 You're a Final Year Undergraduate</h2>
                            <p style={{ margin: '0 auto 1.25rem', color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: '1.6', maxWidth: '460px' }}>
                                You have full community access. To unlock resource downloads (10/month), request an upgrade to <strong style={{color:'#FCD34D'}}>Working Professional</strong> below.
                            </p>
                            {(isPendingUpgrade || upgraded) ? (
                                <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'9px', padding:'0.65rem 1.25rem', fontSize:'0.85rem', color:'white', fontWeight:'700' }}>
                                    ✓ Upgrade request pending admin review (24–48 hrs)
                                </div>
                            ) : (
                                <div style={{ display:'flex', gap:'0.85rem', justifyContent:'center', flexWrap:'wrap' }}>
                                    <button onClick={() => navigate('/user/dashboard')} style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.12)', color:'white', border:'1px solid rgba(255,255,255,0.25)', padding:'0.7rem 1.6rem', borderRadius:'8px', fontWeight:'600', fontSize:'0.98rem', cursor:'pointer' }}>
                                        My Dashboard
                                    </button>
                                    <button onClick={handleUpgradeRequest} disabled={upgrading} style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'#FCD34D', color:'#1E293B', padding:'0.7rem 1.6rem', borderRadius:'8px', fontWeight:'700', fontSize:'0.98rem', border:'none', cursor: upgrading ? 'not-allowed' : 'pointer', opacity: upgrading ? 0.7 : 1 }}>
                                        {upgrading ? '⏳ Submitting…' : <>Request Upgrade <ArrowRight size={13}/></>}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : currentRole === 'professional' && isApproved ? (
                        <>
                            <h2 style={{ margin: '0 0 0.5rem', color: 'white', fontSize: 'clamp(1.3rem,2.6vw,1.75rem)', fontWeight: '800' }}>💼 You're a Working Professional ✓</h2>
                            <p style={{ margin: '0 auto 1.25rem', color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: '1.6', maxWidth: '420px' }}>You have download access (10 resources/month). Apply for Chapter Lead to unlock content creation and more.</p>
                            <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => navigate('/user/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', padding: '0.7rem 1.6rem', borderRadius: '8px', fontWeight: '600', fontSize: '0.98rem', cursor: 'pointer' }}>
                                    My Dashboard
                                </button>
                                <button onClick={() => setShowCouncilModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'white', color: '#003366', padding: '0.7rem 1.6rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.98rem', border: 'none', cursor: 'pointer' }}>
                                    Apply for Chapter Lead <ArrowRight size={13} />
                                </button>
                            </div>
                        </>
                    ) : currentRole === 'professional' ? (
                        <>
                            <h2 style={{ margin: '0 0 0.5rem', color: 'white', fontSize: 'clamp(1.3rem,2.6vw,1.75rem)', fontWeight: '800' }}>Application Pending</h2>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: '1.6' }}>Our team is reviewing your Community Membership application. You'll be notified within 24–48 hours.</p>
                        </>
                    ) : isCouncil ? (
                        <>
                            <h2 style={{ margin: '0 0 0.5rem', color: 'white', fontSize: 'clamp(1.3rem,2.6vw,1.75rem)', fontWeight: '800' }}>Chapter Lead Application Under Review</h2>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: '1.6' }}>Your Chapter Lead application is being reviewed. You'll hear back within 24–48 hours.</p>
                        </>
                    ) : (
                        <>
                            <h2 style={{ margin: '0 0 0.5rem', color: 'white', fontSize: 'clamp(1.3rem,2.6vw,1.75rem)', fontWeight: '800' }}>Ready to join the community?</h2>
                            <p style={{ margin: '0 auto 1.25rem', color: 'rgba(255,255,255,0.6)', fontSize: '1rem', lineHeight: '1.6', maxWidth: '420px' }}>Join free for {COMPLIMENTARY_MONTHS} months. No payment required today.</p>
                            <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => openJoin()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'white', color: '#003366', padding: '0.7rem 1.6rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.98rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    {JOIN_LABEL} <ArrowRight size={13} />
                                </button>
                                <button onClick={() => navigate('/login?next=/membership')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.7rem 1.6rem', borderRadius: '8px', fontWeight: '600', fontSize: '0.98rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    Sign In
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── PROFESSIONAL SUB-CAT MODAL ────────────────────────────────── */}
            {showSubCatModal && (
                <div className="mem-modal-overlay" onClick={() => setShowSubCatModal(false)}>
                    <div className="mem-modal" onClick={e => e.stopPropagation()}>
                        <div className="mem-modal-hd">
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <Shield size={16} color="#A78BFA" />
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: '800' }}>Community Membership</h3>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>Select the profile that best describes you.</p>
                            </div>
                            <button onClick={() => setShowSubCatModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: '6px', padding: '0.25rem', display: 'flex' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mem-modal-bd">
                            <div className="subcol-grid">
                                {SUB_CATEGORIES.map(sc => (
                                    <button
                                        key={sc.value}
                                        className={`subcat-pick${selectedSubCat === sc.value ? ' sel' : ''}`}
                                        onClick={() => setSelectedSubCat(sc.value)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                            <span style={{ fontSize: '1.5rem' }}>{sc.emoji}</span>
                                            {selectedSubCat === sc.value && (
                                                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#003366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Check size={10} color="white" strokeWidth={3} />
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.2rem' }}>{sc.label}</div>
                                        <span style={{ display: 'inline-block', fontSize: '0.63rem', fontWeight: '700', background: '#EFF6FF', color: '#003366', padding: '1px 7px', borderRadius: '100px', marginBottom: '0.45rem' }}>{sc.tag}</span>
                                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.76rem', color: '#64748B', lineHeight: '1.5' }}>{sc.desc}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            {sc.traits.map(t => (
                                                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Check size={10} color="#059669" strokeWidth={3} />
                                                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{t}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <OfferSummary market={market} />

                            <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '0.65rem 0.9rem', fontSize: '0.75rem', color: '#64748B', border: '1px solid #E2E8F0' }}>
                                Both profiles get the same complimentary {COMPLIMENTARY_MONTHS} months. Your selection is self-declared and determines resource download access - Final Year Undergraduates can request an upgrade later.
                            </div>

                            <button
                                onClick={() => {
                                    setShowSubCatModal(false);
                                    navigate(`/register?sub=${selectedSubCat}${market ? `&market=${market}` : ''}`);
                                }}
                                className="mem-btn mem-btn-primary"
                            >
                                Continue to Registration <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── COUNCIL APPLICATION MODAL ──────────────────────────────────── */}
            {showCouncilModal && (
                <div className="mem-modal-overlay" onClick={() => !councilSuccess && setShowCouncilModal(false)}>
                    <div className="mem-modal" onClick={e => e.stopPropagation()}>
                        <div className="mem-modal-hd">
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <Zap size={16} color="#60A5FA" />
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: '800' }}>Apply for Chapter Lead</h3>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                                    Reviewed by our admin team - typically within 24–48 hours.
                                </p>
                            </div>
                            <button onClick={() => setShowCouncilModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: '6px', padding: '0.25rem', display: 'flex' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {councilSuccess ? (
                            <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                                <div style={{ width: 56, height: 56, background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                    <Check size={26} color="#059669" />
                                </div>
                                <h3 style={{ margin: '0 0 0.45rem', fontWeight: '800', fontSize: '1.15rem', color: '#1e293b' }}>Application Submitted!</h3>
                                <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#64748B', lineHeight: 1.65 }}>
                                    Our admin team will review your application and get back to you within 24–48 hours. Your Community Membership remains active.
                                </p>
                                <button onClick={() => setShowCouncilModal(false)} style={{ padding: '0.65rem 2rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontFamily: 'var(--font-sans)', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer' }}>
                                    Close
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleCouncilSubmit}>
                                <div className="mem-modal-bd">
                                    {/* Unlock strip */}
                                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '9px', padding: '0.75rem 0.9rem' }}>
                                        <p style={{ margin: '0 0 0.4rem', fontSize: '0.68rem', fontWeight: '800', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.08em' }}>What you unlock</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                            {['Framework downloads', 'Create events & news', 'Resource uploads', 'Workshop creation'].map(b => (
                                                <span key={b} style={{ background: 'white', border: '1px solid #BFDBFE', borderRadius: '100px', padding: '1px 9px', fontSize: '0.7rem', color: '#1D4ED8', fontWeight: '600' }}>{b}</span>
                                            ))}
                                        </div>
                                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#1E3A8A', lineHeight: '1.5' }}>
                                            No fee. Selection is based on your experience and the proposed contribution.
                                        </p>
                                    </div>

                                    {councilError && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.65rem 0.9rem' }}>
                                            <AlertCircle size={14} color="#DC2626" />
                                            <span style={{ fontSize: '0.82rem', color: '#DC2626' }}>{councilError}</span>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(190px,100%), 1fr))', gap: '0.8rem' }}>
                                        {[
                                            { key: 'organization_name', label: 'Organisation', placeholder: 'Acme AI Corp' },
                                            { key: 'job_title',         label: 'Job Title',    placeholder: 'AI Risk Manager' },
                                        ].map(({ key, label, placeholder }) => (
                                            <div key={key}>
                                                <label style={lStyle}>{label}</label>
                                                <input style={iStyle} placeholder={placeholder} value={councilForm[key]}
                                                    onChange={e => setCouncilForm(p => ({ ...p, [key]: e.target.value }))}
                                                    onFocus={e => e.target.style.borderColor = '#003366'}
                                                    onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <label style={lStyle}>LinkedIn URL</label>
                                        <input style={iStyle} type="url" placeholder="https://linkedin.com/in/..."
                                            value={councilForm.linkedin_url}
                                            onChange={e => setCouncilForm(p => ({ ...p, linkedin_url: e.target.value }))}
                                            onFocus={e => e.target.style.borderColor = '#003366'}
                                            onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
                                    </div>

                                    <div>
                                        <label style={lStyle}>Professional Bio <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span></label>
                                        <textarea rows={2} style={{ ...iStyle, resize: 'vertical' }}
                                            placeholder="Brief background in AI risk, compliance, or governance..."
                                            value={councilForm.professional_bio}
                                            onChange={e => setCouncilForm(p => ({ ...p, professional_bio: e.target.value }))}
                                            onFocus={e => e.target.style.borderColor = '#003366'}
                                            onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
                                    </div>

                                    <div>
                                        <label style={lStyle}>Why do you want to be a Chapter Lead? <span style={{ color: '#EF4444' }}>*</span></label>
                                        <textarea rows={3} style={{ ...iStyle, resize: 'vertical' }}
                                            placeholder="Your interest in AI governance and how you plan to contribute..."
                                            value={councilForm.why_council_member}
                                            onChange={e => setCouncilForm(p => ({ ...p, why_council_member: e.target.value }))}
                                            onFocus={e => e.target.style.borderColor = '#003366'}
                                            onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.7rem' }}>
                                        <button type="button" onClick={() => setShowCouncilModal(false)}
                                            style={{ flex: 1, padding: '0.72rem', background: 'white', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '8px', fontFamily: 'var(--font-sans)', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem' }}>
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={councilSubmitting}
                                            className="mem-btn mem-btn-primary" style={{ flex: 2 }}>
                                            {councilSubmitting
                                                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                                                : <>Submit Application <ArrowRight size={14} /></>}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Membership;
