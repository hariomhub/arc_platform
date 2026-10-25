import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { saveElection } from '../../api/chapterLead.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { colors, Button } from '../ui/kit.jsx';

/**
 * The earnings choice: "receive" or "waive" (leads), plus the employer confirmation everyone gives.
 * Used on the dashboard card and in the sign-in step for existing leads.
 *
 * The choice is the person's own. The wording of the confirmation is in one place (CONFIRMATION) so
 * the Terms, the application form and this form say the same thing.
 */
export const CONFIRMATION =
    'I have checked my employment terms and obtained any approval I need to take on this chapter role.';

const OPTION = (selected) => ({
    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.8rem 0.9rem', borderRadius: 12, cursor: 'pointer',
    border: `1.5px solid ${selected ? colors.primary : colors.border}`, background: selected ? '#EEF4FF' : 'white',
    transition: 'border-color .15s ease, background-color .15s ease',
});

const EarningsChoice = ({ tier, election, onSaved, submitLabel = 'Save my choice' }) => {
    const isLead = tier !== 'ambassador';
    const current = election?.choice === 'receive' || election?.choice === 'waive' ? election.choice : null;
    const [choice, setChoice] = useState(isLead ? (current || '') : 'waive');
    const [confirmed, setConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        if (isLead && !choice) { setError('Choose whether to receive or waive earnings.'); return; }
        if (!confirmed) { setError('Please tick the box to confirm you have checked your employment terms.'); return; }
        setBusy(true);
        setError('');
        try {
            const res = await saveElection({ choice, employer_confirmed: true });
            onSaved?.(res.data?.data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{ display: 'grid', gap: 12 }}>
            {isLead ? (
                <div role="radiogroup" aria-label="Earnings choice" style={{ display: 'grid', gap: 8 }}>
                    <label style={OPTION(choice === 'receive')}>
                        <input type="radio" name="earnings-choice" value="receive" checked={choice === 'receive'} onChange={() => { setChoice('receive'); setError(''); }} style={{ marginTop: 3, accentColor: colors.primary }} />
                        <span>
                            <strong style={{ display: 'block', color: colors.text, fontSize: '0.9rem' }}>Receive earnings</strong>
                            <span style={{ fontSize: '0.8rem', color: colors.muted, lineHeight: 1.55 }}>
                                Revenue share, commission and workshop fees, as set out in the Terms, once online payments are connected.
                            </span>
                        </span>
                    </label>
                    <label style={OPTION(choice === 'waive')}>
                        <input type="radio" name="earnings-choice" value="waive" checked={choice === 'waive'} onChange={() => { setChoice('waive'); setError(''); }} style={{ marginTop: 3, accentColor: colors.primary }} />
                        <span>
                            <strong style={{ display: 'block', color: colors.text, fontSize: '0.9rem' }}>Waive earnings</strong>
                            <span style={{ fontSize: '0.8rem', color: colors.muted, lineHeight: 1.55 }}>
                                Lead the chapter as a volunteer. Nothing accrues or is held back for you, and your term and seniority carry on as normal.
                            </span>
                        </span>
                    </label>
                </div>
            ) : (
                <p style={{ margin: 0, fontSize: '0.84rem', color: colors.muted, lineHeight: 1.6 }}>
                    Chapter Ambassador is a volunteer role. It does not include revenue share, commission or workshop fees, so there is nothing to choose.
                    We only ask you to confirm the point below.
                </p>
            )}

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', background: '#F8FAFC', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '0.75rem 0.9rem' }}>
                <input type="checkbox" checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); setError(''); }} style={{ marginTop: 3, width: 16, height: 16, accentColor: colors.primary, flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: colors.text, lineHeight: 1.55 }}>
                    {CONFIRMATION}
                    <span style={{ display: 'block', color: colors.muted, fontSize: '0.76rem', marginTop: 3 }}>
                        Some employers require approval even for unpaid roles. We cannot give legal advice, so please check your own contract or ask your employer.
                    </span>
                </span>
            </label>

            {isLead && (
                <p style={{ margin: 0, fontSize: '0.76rem', color: colors.muted, lineHeight: 1.55 }}>
                    Your first choice applies straight away. Changing it later takes effect from the start of your next term, never backwards.
                </p>
            )}

            {error && (
                <span role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: colors.red }}>
                    <AlertCircle size={13} />{error}
                </span>
            )}

            <div>
                <Button onClick={submit} disabled={busy}>
                    {busy ? <><Loader2 size={14} className="kit-spin" /> Saving…</> : submitLabel}
                </Button>
            </div>
        </div>
    );
};

export default EarningsChoice;
