import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ChevronRight, ArrowUp, Mail, Info, AlertCircle, CheckCircle, Calendar } from 'lucide-react';

const SECTIONS = [
  { id: 'eligibility',   label: 'Eligibility' },
  { id: 'info-collected', label: 'Information We Collect' },
  { id: 'public-display', label: 'Public Display & Consent' },
  { id: 'moderation',    label: 'Review & Moderation' },
  { id: 'voting',        label: 'Voting Is Separate' },
  { id: 'no-guarantee',  label: 'No Guarantee of Winning' },
  { id: 'withdrawal',    label: 'Withdrawing a Nomination' },
  { id: 'sharing',       label: 'Sharing on LinkedIn' },
  { id: 'contact',       label: 'Contact Us' },
];

const SectionCard = ({ id, title, children }) => (
  <section id={id} style={{
    background: '#fff', border: '1px solid var(--border-light)', borderLeft: '4px solid var(--primary)',
    borderRadius: '8px', padding: '1.5rem 1.75rem', marginBottom: '1.25rem', scrollMarginTop: '90px',
  }}>
    <h2 style={{
      fontFamily: 'var(--font-serif)', color: 'var(--primary)', fontSize: '1.15rem', fontWeight: 700,
      marginBottom: '0.9rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-light)',
    }}>{title}</h2>
    {children}
  </section>
);

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
    <ChevronRight size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '4px' }} />
    <span style={{ color: 'var(--text-secondary)', fontSize: '0.91rem', lineHeight: 1.6 }}>
      {label && <strong style={{ color: 'var(--text-main)', marginRight: '0.3rem' }}>{label}:</strong>}
      {value}
    </span>
  </div>
);

const CALLOUT_STYLES = {
  info:    { bg: '#EFF6FF', border: '#3B82F6', iconColor: '#3B82F6', Icon: Info },
  warning: { bg: '#FFFBEB', border: '#F59E0B', iconColor: '#D97706', Icon: AlertCircle },
  success: { bg: '#F0FDF4', border: '#22C55E', iconColor: '#16A34A', Icon: CheckCircle },
};
const Callout = ({ children, type = 'info' }) => {
  const { bg, border, iconColor, Icon } = CALLOUT_STYLES[type];
  return (
    <div style={{ background: bg, borderLeft: `4px solid ${border}`, borderRadius: '6px', padding: '0.85rem 1.1rem', margin: '0.85rem 0', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
      <Icon size={15} color={iconColor} style={{ flexShrink: 0, marginTop: '2px' }} />
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>{children}</p>
    </div>
  );
};

export default function NominationTerms() {
  const [active, setActive] = useState('eligibility');
  const [showTop, setShowTop] = useState(false);
  const obs = useRef(null);

  useEffect(() => {
    document.title = 'Nomination Terms & Conditions — Risk AI Council';
    const onScroll = () => setShowTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll);
    obs.current = new IntersectionObserver(
      entries => { for (const e of entries) { if (e.isIntersecting) setActive(e.target.id); } },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    SECTIONS.forEach(({ id }) => { const el = document.getElementById(id); if (el) obs.current.observe(el); });
    return () => { window.removeEventListener('scroll', onScroll); obs.current?.disconnect(); };
  }, []);

  return (
    <>
      <style>{`
        .pp-wrap { display: grid; grid-template-columns: 240px 1fr; gap: 1.75rem; max-width: 1140px; margin: 0 auto; padding: 2rem clamp(1rem,3vw,2rem); }
        .pp-toc  { position: sticky; top: 76px; height: fit-content; background: #fff; border: 1px solid var(--border-light); border-radius: 8px; padding: 1.1rem; }
        .toc-btn { display: block; width: 100%; text-align: left; background: none; border: none; border-left: 3px solid transparent; padding: 0.4rem 0.65rem; border-radius: 0 4px 4px 0; font-size: 0.82rem; color: var(--text-secondary); cursor: pointer; font-family: var(--font-sans); transition: all 0.18s; margin-bottom: 0.2rem; }
        .toc-btn:hover { background: var(--bg-light); color: var(--primary); }
        .toc-btn.active { background: #EEF2FF; color: var(--primary); border-left-color: var(--primary); font-weight: 600; }
        @media (max-width: 740px) { .pp-wrap { grid-template-columns: 1fr; } .pp-toc { position: static; } }
      `}</style>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 60%,#005599 100%)', color: '#fff', padding: 'clamp(2.5rem,6vw,4rem) clamp(1rem,4vw,2rem)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 100, padding: '5px 14px', marginBottom: '1.25rem', color: '#93C5FD', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <Trophy size={13} /> Awards & Nominations
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 800, margin: '0 0 1rem', lineHeight: 1.15 }}>Nomination Terms &amp; Conditions</h1>
          <p style={{ color: '#CBD5E0', fontSize: '0.95rem', margin: '0 auto 1.1rem', maxWidth: '520px', lineHeight: 1.65 }}>
            What to know before you nominate yourself for a Risk AI Council award.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.8rem', color: '#94A3B8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Calendar size={13} /> Effective: July 16, 2026</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: 'var(--bg-light)', minHeight: '60vh', paddingBottom: '3rem' }}>
        <div className="pp-wrap">
          <aside className="pp-toc" aria-label="Table of Contents">
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-light)', marginBottom: '0.75rem' }}>Contents</p>
            {SECTIONS.map(({ id, label }) => (
              <button key={id} className={`toc-btn${active === id ? ' active' : ''}`}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>
                {label}
              </button>
            ))}
            <div style={{ marginTop: '1rem', paddingTop: '0.9rem', borderTop: '1px solid var(--border-light)' }}>
              <Link to="/self-nominate" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                <Trophy size={13} /> Back to Nomination Form
              </Link>
            </div>
          </aside>

          <main>
            <SectionCard id="eligibility" title="1. Eligibility">
              <Row value="Any individual may nominate themselves for any active award category currently open on the Platform." />
              <Row value="Registered members can self-nominate directly from their account. Non-members may also self-nominate after verifying their email address." />
              <Row value="Nominations must relate to genuine professional achievements. Fraudulent, defamatory, or spam nominations will be rejected." />
            </SectionCard>

            <SectionCard id="info-collected" title="2. Information We Collect">
              <Row label="From members" value="Name, email, organisation, LinkedIn URL are drawn from your existing profile; you provide the rest (designation, achievements, category)." />
              <Row label="From non-members" value="Name, email, phone (optional), and the nomination details you provide directly. Your email is verified via a one-time code before submission." />
              <Row label="Photo" value="An optional profile photo you upload, displayed publicly if your nomination is approved." />
              <Callout type="info">We use reCAPTCHA to prevent automated/bot submissions from non-members. This does not affect your privacy beyond standard bot-detection.</Callout>
            </SectionCard>

            <SectionCard id="public-display" title="3. Public Display &amp; Consent">
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.5rem' }}>
                By submitting a self-nomination and checking the consent box, you agree that — if approved — your name, designation, company, photo, LinkedIn link, achievements, and description may be displayed publicly on the Platform's nominees and voting pages, where other visitors can view and vote on your nomination.
              </p>
              <Callout type="warning">Do not include information you are not comfortable making public. You can request removal at any time — see "Withdrawing a Nomination" below.</Callout>
            </SectionCard>

            <SectionCard id="moderation" title="4. Review &amp; Moderation">
              <Row value="Every self-nomination is reviewed by our team before it becomes visible to the public or eligible for voting." />
              <Row value="We may edit minor formatting issues, or reject nominations that are incomplete, inappropriate, or do not meet the award category's intent." />
              <Row value="You will receive an email once a decision has been made, typically within a few business days." />
            </SectionCard>

            <SectionCard id="voting" title="5. Voting Is Separate From Nomination">
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                Submitting or approving a nomination does not cast any votes on your behalf. Voting is a separate, public action taken by other Platform visitors and members once your nomination is live.
              </p>
            </SectionCard>

            <SectionCard id="no-guarantee" title="6. No Guarantee of Winning">
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                Approval of a self-nomination means it is eligible for public voting and jury consideration — it is not a guarantee of shortlisting, recognition, or winning an award. Final award decisions rest with the jury panel shown on the nomination page.
              </p>
            </SectionCard>

            <SectionCard id="withdrawal" title="7. Withdrawing a Nomination">
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                You may request that your self-nomination be withdrawn or removed at any time, whether pending or already live, by contacting us at{' '}
                <a href="mailto:support@riskaicouncil.com" style={{ color: 'var(--accent)', fontWeight: 600 }}>support@riskaicouncil.com</a>.
              </p>
            </SectionCard>

            <SectionCard id="sharing" title="8. Sharing on LinkedIn">
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                After submitting, you may optionally share your nomination on LinkedIn using a share button we provide. This is entirely user-initiated — we never post to your LinkedIn account on your behalf, and sharing has no bearing on your nomination's review or outcome.
              </p>
            </SectionCard>

            <SectionCard id="contact" title="9. Contact Us">
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>Questions about a nomination or this policy:</p>
              <div style={{ background: 'var(--bg-light)', borderRadius: '7px', padding: '1rem', maxWidth: '320px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Mail size={15} color="var(--primary)" /><strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>Email</strong>
                </div>
                <a href="mailto:support@riskaicouncil.com" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.88rem' }}>support@riskaicouncil.com</a>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '1rem 0 0' }}>
                This policy supplements our general <Link to="/privacy" style={{ color: 'var(--primary)', fontWeight: 600 }}>Privacy Policy</Link>.
              </p>
            </SectionCard>
          </main>
        </div>
      </div>

      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll to top"
          style={{ position: 'fixed', bottom: '1.75rem', right: '1.75rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,51,102,.35)', zIndex: 50 }}>
          <ArrowUp size={18} />
        </button>
      )}
    </>
  );
}
