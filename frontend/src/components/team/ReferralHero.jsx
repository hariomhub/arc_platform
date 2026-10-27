import React, { useState } from 'react';
import { Copy, Check, Link2, Share2, ArrowRight } from 'lucide-react';
import { colors } from '../ui/kit.jsx';
import InvitePanel from './InvitePanel.jsx';
import { metaOfUser } from '../../config/roles.js';
import { useAuth } from '../../hooks/useAuth.js';
import { setLocalFlag } from '../../utils/localFlags.js';

/** The flag the "Get started" checklist reads: this person has copied or shared their link at least once. */
export const sharedFlag = (profileId) => `shared:${profileId}`;

const shareText = 'Join me on Risk AI Council, a community for practical AI governance and risk.';

/**
 * The referral code, front and centre, with the way to use it: "Invite someone" (ready-made messages with the
 * sender's name, chapter, code and link already in them) sits right under the code. A member counts toward the
 * goal once an administrator approves them, so the three numbers at the bottom say how many have joined, how
 * many are counted, and how many are waiting.
 */
const ReferralHero = ({ code, counts, tier, goal, profileId, chapterName, onOpenReferrals, showToast }) => {
    const { user } = useAuth();
    const accent = metaOfUser(user).color;
    const [copied, setCopied] = useState('');
    const link = `${window.location.origin}/register?ref=${encodeURIComponent(code || '')}`;
    const mark = () => setLocalFlag(sharedFlag(profileId));

    const copy = async (text, which) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(which);
            mark();
            showToast?.(which === 'code' ? 'Referral code copied.' : 'Referral link copied.', 'success');
            setTimeout(() => setCopied(''), 1800);
        } catch {
            showToast?.('Could not copy automatically. Please select it and copy.', 'error');
        }
    };

    const nativeShare = async () => {
        try {
            await navigator.share({ title: 'Risk AI Council', text: shareText, url: link });
            mark();
        } catch { /* closed without sharing */ }
    };

    const stat = (value, label) => (
        <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: colors.text, lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: '0.72rem', color: colors.muted, fontWeight: 600 }}>{label}</div>
        </div>
    );

    const button = (active) => ({
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.55rem 1rem', borderRadius: 9, fontWeight: 700, fontSize: '0.84rem',
        cursor: 'pointer', fontFamily: 'var(--font-sans)', textDecoration: 'none', whiteSpace: 'nowrap',
        border: `1.5px solid ${active ? accent : '#CBD5E1'}`, background: active ? accent : 'white', color: active ? 'white' : colors.text,
    });

    return (
        <section id="team-referral" aria-label="Your referral code" style={{ background: 'white', border: `1px solid ${colors.border}`, borderRadius: 16, padding: 'clamp(1.1rem,2.5vw,1.5rem)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Link2 size={14} aria-hidden="true" /> Your referral code
            </div>
            <p style={{ margin: '0.35rem 0 0.9rem', fontSize: '0.86rem', color: colors.muted, lineHeight: 1.6, maxWidth: 560 }}>
                {tier === 'lead'
                    ? 'Share this with people who should be in the community. Everyone who joins with it, or with an ambassador\'s code, counts toward your chapter.'
                    : 'Share this with people who should be in the community. Everyone who joins with it counts toward your goal and your chapter.'}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 'clamp(1.5rem,4vw,2rem)', fontWeight: 800, letterSpacing: '0.1em', color: colors.primary, background: '#F0F6FF', border: '1.5px dashed #93C5FD', borderRadius: 12, padding: '0.45rem 1rem', userSelect: 'all' }}>
                    {code || '—'}
                </div>
                <button type="button" onClick={() => copy(code, 'code')} className="kit-btn kit-focus" style={button(copied === 'code')} aria-live="polite">
                    {copied === 'code' ? <><Check size={15} aria-hidden="true" /> Copied</> : <><Copy size={15} aria-hidden="true" /> Copy code</>}
                </button>
                <button type="button" onClick={() => copy(link, 'link')} className="kit-btn kit-focus" style={button(copied === 'link')} aria-live="polite">
                    {copied === 'link' ? <><Check size={15} aria-hidden="true" /> Copied</> : <><Link2 size={15} aria-hidden="true" /> Copy link</>}
                </button>
                {typeof navigator !== 'undefined' && navigator.share && (
                    <button type="button" onClick={nativeShare} className="kit-btn kit-focus" style={button(false)}>
                        <Share2 size={15} aria-hidden="true" /> Share
                    </button>
                )}
            </div>

            <InvitePanel tier={tier} chapterName={chapterName} userName={user?.name || ''} code={code} link={link} accent={accent} onShared={mark} showToast={showToast} />

            <div style={{ display: 'flex', gap: 'clamp(1rem,3vw,2rem)', flexWrap: 'wrap', alignItems: 'flex-end', borderTop: `1px solid ${colors.border}`, marginTop: '1.1rem', paddingTop: '0.95rem' }}>
                {stat(counts.total, 'joined with your code')}
                {stat(counts.qualified, 'approved and counted')}
                {stat(counts.pending, 'waiting for approval')}
                {goal && stat(`${goal.counted} of ${goal.target}`, 'members this quarter')}
                <button type="button" onClick={onOpenReferrals} className="kit-focus" style={{ marginLeft: 'auto', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: colors.primary, fontWeight: 800, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)' }}>
                    See who joined <ArrowRight size={13} aria-hidden="true" />
                </button>
            </div>
        </section>
    );
};

export default ReferralHero;
