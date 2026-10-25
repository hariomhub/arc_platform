import React, { useEffect, useState } from 'react';
import { Crown, Loader2 } from 'lucide-react';
import { getMyApplication, requestPromotion, withdrawApplication } from '../../api/membership.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { colors, Card, SectionTitle, Pill, Button, fieldStyle, labelStyle } from '../ui/kit.jsx';

/**
 * Shown to a Chapter Ambassador whose chapter has no Chapter Lead: a way to say "I would like to lead it".
 * It is a request, never a promotion: the administrators decide who leads each chapter.
 */
const PromotionRequest = ({ chapterName, showToast }) => {
    const [application, setApplication] = useState(undefined);   // undefined = loading, null = none
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        getMyApplication()
            .then((res) => { if (alive) setApplication(res.data?.data || null); })
            .catch(() => { if (alive) setApplication(null); });
        return () => { alive = false; };
    }, []);

    const send = async () => {
        if (text.trim().length < 10) { setError('Please tell us a little more (at least a sentence).'); return; }
        setBusy(true);
        setError('');
        try {
            await requestPromotion({ why_council_member: text.trim() });
            const res = await getMyApplication();
            setApplication(res.data?.data || null);
            showToast?.('Your request has been sent to the administrators.', 'success');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const withdraw = async () => {
        setBusy(true);
        try {
            await withdrawApplication(application.id);
            setApplication(null);
            setText('');
            showToast?.('Your request has been withdrawn.', 'success');
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setBusy(false);
        }
    };

    if (application === undefined) return null;
    const waiting = application && application.kind === 'promotion' && application.status === 'pending';

    return (
        <Card>
            <SectionTitle icon={Crown} right={waiting ? <Pill tone="amber">Under review</Pill> : null}>
                {chapterName ? `${chapterName} has no Chapter Lead` : 'Your chapter has no Chapter Lead'}
            </SectionTitle>
            {waiting ? (
                <>
                    <p style={{ margin: '0 0 0.7rem', fontSize: '0.82rem', color: colors.muted, lineHeight: 1.6 }}>
                        Your request is with the administrators, who decide who leads each chapter. You will be told either way.
                    </p>
                    <Button small tone="ghost" onClick={withdraw} disabled={busy}>Withdraw my request</Button>
                </>
            ) : (
                <>
                    <p style={{ margin: '0 0 0.7rem', fontSize: '0.82rem', color: colors.muted, lineHeight: 1.6 }}>
                        If you would like to lead the chapter, tell the administrators why. This is a request; they decide.
                    </p>
                    <label htmlFor="promo-why" style={labelStyle}>Why would you lead this chapter?</label>
                    <textarea
                        id="promo-why"
                        rows={3}
                        maxLength={3000}
                        value={text}
                        onChange={(e) => { setText(e.target.value); setError(''); }}
                        style={{ ...fieldStyle, resize: 'vertical' }}
                    />
                    {error && <p role="alert" style={{ margin: '4px 0 0', fontSize: '0.78rem', color: colors.red }}>{error}</p>}
                    <div style={{ marginTop: 10 }}>
                        <Button onClick={send} disabled={busy}>
                            {busy ? <><Loader2 size={14} className="kit-spin" /> Sending…</> : 'Ask to lead this chapter'}
                        </Button>
                    </div>
                </>
            )}
        </Card>
    );
};

export default PromotionRequest;
