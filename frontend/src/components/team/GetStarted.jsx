import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { colors } from '../ui/kit.jsx';
import { Meter } from '../ui/motion.jsx';
import { useLocalFlag } from '../../utils/localFlags.js';
import { sharedFlag } from './ReferralHero.jsx';
import { tourFlag } from './TourVideo.jsx';

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/**
 * The first steps for a new chapter team member, in the order that helps most. Each one is ticked from
 * something that really happened (a referral joined, a post published, a choice saved), or from a small
 * memory in this browser for "watched the tour" and "shared my link". Only steps that apply to this
 * person are listed: a lead also chooses receive or waive; an ambassador has nothing to choose.
 */
export const buildSetupSteps = ({ data, watched, shared }) => {
    const steps = [];
    if (data.tour) {
        steps.push({ key: 'tour', title: 'Watch the short tour', detail: 'A few minutes on what is where and how the quarter works.', done: watched, cta: 'Watch', scroll: 'team-tour' });
    }
    steps.push({
        key: 'share', title: 'Share your referral link', detail: 'Send it to one person who would value the community.',
        done: shared || (data.referrals?.total || 0) > 0, cta: 'Share now', scroll: 'team-referral',
    });
    steps.push({
        key: 'public', title: 'Choose what shows on your chapter page', detail: 'Your name and role are listed. Photo, organisation and bio are up to you.',
        done: Boolean(data.setup?.display_saved), cta: 'Choose', tab: 'settings',
    });
    steps.push({
        key: 'post', title: 'Publish your first post', detail: 'A short note in the community feed counts toward your quarter.',
        done: Boolean(data.setup?.has_posted), cta: 'Write a post', to: '/community-qna',
    });
    if (data.earnings) {
        const chosen = data.earnings.election?.choice && data.earnings.election.choice !== 'not_chosen';
        steps.push({
            key: 'earnings', title: 'Choose to receive or waive earnings', detail: 'It is your decision alone, and you can lead as a volunteer.',
            done: Boolean(chosen), cta: 'Choose', tab: 'settings',
        });
    }
    return steps;
};

// The step to do next is a filled button; the others are quiet outlines.
const StepAction = ({ step, onOpenTab, primary }) => {
    const style = {
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.45rem 0.9rem', borderRadius: 8, fontWeight: 800, fontSize: '0.8rem',
        background: primary ? colors.primary : 'white', color: primary ? 'white' : colors.primary, border: `1.5px solid ${primary ? colors.primary : '#CBD5E1'}`,
        cursor: 'pointer', fontFamily: 'var(--font-sans)', textDecoration: 'none', whiteSpace: 'nowrap',
    };
    if (step.to) return <Link to={step.to} className="kit-btn kit-focus" style={style}>{step.cta} <ArrowRight size={13} aria-hidden="true" /></Link>;
    return (
        <button type="button" onClick={() => (step.tab ? onOpenTab(step.tab) : scrollTo(step.scroll))} className="kit-btn kit-focus" style={style}>
            {step.cta} <ArrowRight size={13} aria-hidden="true" />
        </button>
    );
};

const GetStarted = ({ data, onOpenTab }) => {
    const profileId = data.profile.id;
    const [watched] = useLocalFlag(tourFlag(profileId, data.tour));
    const [shared] = useLocalFlag(sharedFlag(profileId));
    const [folded, setFolded] = useState(false);

    const steps = buildSetupSteps({ data, watched, shared });
    const done = steps.filter((s) => s.done).length;
    const allDone = done === steps.length;
    const next = steps.find((s) => !s.done);
    const open = !folded && !allDone;

    return (
        <section id="team-start" aria-label="Get started" style={{ background: 'white', border: `1px solid ${colors.border}`, borderRadius: 16, padding: 'clamp(1.1rem,2.5vw,1.5rem)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: colors.text }}>
                        {allDone ? 'You are all set up' : 'Get started'}
                    </h2>
                    <div style={{ fontSize: '0.78rem', color: colors.muted, marginTop: 2 }}>
                        {allDone ? 'Every first step is done. Your quarter below shows what is next.' : `${done} of ${steps.length} done. Each takes about a minute.`}
                    </div>
                </div>
                {!allDone && (
                    <button type="button" onClick={() => setFolded(!folded)} aria-expanded={open} className="kit-focus" style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.muted, fontWeight: 700, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)' }}>
                        {open ? <>Hide <ChevronUp size={14} aria-hidden="true" /></> : <>Show steps <ChevronDown size={14} aria-hidden="true" /></>}
                    </button>
                )}
            </div>

            <div style={{ marginTop: '0.7rem' }}>
                <Meter percent={Math.round((done / steps.length) * 100)} height={6} color={allDone ? colors.green : colors.primary} label={`${done} of ${steps.length} first steps done`} />
            </div>

            {open && (
                <ol style={{ listStyle: 'none', margin: '0.8rem 0 0', padding: 0 }}>
                    {steps.map((step) => {
                        const isNext = next?.key === step.key;
                        return (
                            <li key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '0.6rem 0.7rem', margin: '0 -0.7rem', borderRadius: 10, background: isNext ? '#F0F6FF' : 'transparent' }}>
                                <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${step.done ? colors.green : isNext ? colors.primary : '#CBD5E1'}`, background: step.done ? colors.green : 'white' }}>
                                    {step.done && <Check size={14} color="white" strokeWidth={3} />}
                                </span>
                                <span style={{ flex: '1 1 200px', minWidth: 0 }}>
                                    <span style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: step.done ? colors.muted : colors.text }}>
                                        {step.title}
                                        {step.done && <span className="sr-only"> (done)</span>}
                                        {isNext && <span style={{ marginLeft: 8, fontSize: '0.66rem', fontWeight: 800, color: colors.primary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Do this next</span>}
                                    </span>
                                    {!step.done && <span style={{ display: 'block', fontSize: '0.76rem', color: colors.muted, lineHeight: 1.5 }}>{step.detail}</span>}
                                </span>
                                {!step.done && <StepAction step={step} onOpenTab={onOpenTab} primary={isNext} />}
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
};

export default GetStarted;
