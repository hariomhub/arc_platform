import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ChevronRight, Info, CheckCircle, Calendar, Globe, Smartphone } from 'lucide-react';
import { COMPLIMENTARY_MONTHS, MARKETS } from '../config/pricing.js';
import { OPERATOR_LEGAL_NAME, operatorLine } from '../config/brand.js';

const SECTIONS = [
  { id: 'about',        label: 'About These Terms' },
  { id: 'membership',   label: 'Community Membership' },
  { id: 'accounts',     label: 'Accounts & Approval' },
  { id: 'chapter-lead', label: 'Chapter Lead Role' },
  { id: 'conduct',      label: 'Community Conduct & Content' },
  { id: 'programmes',   label: 'Events, Workshops & Learning' },
  { id: 'resources',    label: 'Resources, Reviews & Standards' },
  { id: 'awards',       label: 'Awards & Nominations' },
  { id: 'deletion',     label: 'Account Deletion' },
  { id: 'changes',      label: 'Changes to These Terms' },
  { id: 'contact',      label: 'Contact Us' },
];

const SectionCard = ({ id, title, children }) => (
  <section id={id} style={{
    background: '#fff',
    border: '1px solid var(--border-light)',
    borderLeft: '4px solid var(--primary)',
    borderRadius: '8px',
    padding: '1.15rem 1.35rem',
    marginBottom: '1rem',
    scrollMarginTop: '90px',
  }}>
    <h2 style={{
      fontFamily: 'var(--font-serif)', color: 'var(--primary)',
      fontSize: '1.05rem', fontWeight: 700,
      marginBottom: '0.7rem', paddingBottom: '0.5rem',
      borderBottom: '1px solid var(--border-light)',
    }}>{title}</h2>
    {children}
  </section>
);

const Row = ({ label, children }) => (
  <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.4rem', alignItems: 'flex-start' }}>
    <ChevronRight size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '4px' }} />
    <span style={{ color: 'var(--text-secondary)', fontSize: '0.91rem', lineHeight: 1.65 }}>
      {label && <strong style={{ color: 'var(--text-main)', marginRight: '0.3rem' }}>{label}:</strong>}
      {children}
    </span>
  </div>
);

const CALLOUT_STYLES = {
  info:    { bg: '#EFF6FF', border: '#3B82F6', iconColor: '#3B82F6', Icon: Info },
  success: { bg: '#F0FDF4', border: '#22C55E', iconColor: '#16A34A', Icon: CheckCircle },
};
const Callout = ({ children, type = 'info' }) => {
  const { bg, border, iconColor, Icon } = CALLOUT_STYLES[type];
  return (
    <div style={{ background: bg, borderLeft: `4px solid ${border}`, borderRadius: '6px', padding: '0.7rem 1rem', margin: '0.65rem 0', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
      <Icon size={15} color={iconColor} style={{ flexShrink: 0, marginTop: '2px' }} />
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>{children}</p>
    </div>
  );
};

const P = ({ children, last }) => (
  <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: last ? 0 : '0 0 0.75rem' }}>{children}</p>
);

const linkStyle = { color: 'var(--accent)', fontWeight: 600 };

export default function Terms() {
  const [active, setActive] = useState('about');
  const obs = useRef(null);

  useEffect(() => {
    document.title = 'Terms of Use — Risk AI Council';
    obs.current = new IntersectionObserver(
      entries => { for (const e of entries) { if (e.isIntersecting) setActive(e.target.id); } },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    SECTIONS.forEach(({ id }) => { const el = document.getElementById(id); if (el) obs.current.observe(el); });
    return () => obs.current?.disconnect();
  }, []);

  const inr = MARKETS.IN;
  const usd = MARKETS.US;

  return (
    <>
      <style>{`
        .tu-wrap { display: grid; grid-template-columns: 220px 1fr; gap: 1.5rem; max-width: 1400px; margin: 0 auto; padding: 1.5rem clamp(1rem,3vw,2.5rem); }
        .tu-toc  { position: sticky; top: 76px; height: fit-content; background: #fff; border: 1px solid var(--border-light); border-radius: 8px; padding: 0.9rem; }
        /* sections flow in two columns on wide screens (newspaper style), one column below 1100px */
        .tu-cols { column-count: 2; column-gap: 1.25rem; }
        .tu-cols > section { break-inside: avoid; page-break-inside: avoid; -webkit-column-break-inside: avoid; }
        @media (max-width: 1100px) { .tu-cols { column-count: 1; } }
        .tu-btn { display: block; width: 100%; text-align: left; background: none; border: none; border-left: 3px solid transparent; padding: 0.4rem 0.65rem; border-radius: 0 4px 4px 0; font-size: 0.82rem; color: var(--text-secondary); cursor: pointer; font-family: var(--font-sans); transition: all 0.18s; margin-bottom: 0.2rem; }
        .tu-btn:hover { background: var(--bg-light); color: var(--primary); }
        .tu-btn.active { background: #EEF2FF; color: var(--primary); border-left-color: var(--primary); font-weight: 600; }
        @media (max-width: 740px) { .tu-wrap { grid-template-columns: 1fr; } .tu-toc { position: static; } }
      `}</style>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 60%,#005599 100%)', color: '#fff', padding: 'clamp(1.5rem,3vw,2.25rem) clamp(1rem,4vw,2rem)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 100, padding: '5px 14px', marginBottom: '0.8rem', color: '#93C5FD', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <FileText size={13} /> Legal
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 800, margin: '0 0 0.6rem', lineHeight: 1.15 }}>Terms of Use</h1>
          <p style={{ color: '#CBD5E0', fontSize: '0.95rem', margin: '0 auto 0.8rem', maxWidth: '640px', lineHeight: 1.6 }}>
            The rules for using Risk AI Council, including how your complimentary membership and renewal work.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.8rem', color: '#94A3B8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Calendar size={13} /> Last updated: September 29, 2026</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Globe size={13} /> riskaicouncil.org</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Smartphone size={13} /> Web &amp; Mobile App</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: 'var(--bg-light)', minHeight: '60vh', paddingBottom: '3rem' }}>
        <div className="tu-wrap">

          {/* TOC */}
          <aside className="tu-toc" aria-label="Table of Contents">
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-light)', marginBottom: '0.75rem' }}>Contents</p>
            {SECTIONS.map(({ id, label }) => (
              <button key={id} className={`tu-btn${active === id ? ' active' : ''}`}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>
                {label}
              </button>
            ))}
          </aside>

          {/* Sections */}
          <main className="tu-cols">
            <SectionCard id="about" title="1. About These Terms">
              <P>These Terms of Use ("Terms") apply to your use of the Risk AI Council website and mobile app (the "Platform").</P>
              <P>
                {operatorLine()
                  ? <>Risk AI Council ("we," "us," or "our") is operated by <strong>{OPERATOR_LEGAL_NAME}</strong>.</>
                  : <>Risk AI Council ("we," "us," or "our") operates the Platform.</>}
              </P>
              <P>By creating an account or using the Platform, you agree to these Terms and to our <Link to="/privacy" style={linkStyle}>Privacy Policy</Link>. If you do not agree, please do not use the Platform.</P>
              <Callout type="info">Risk AI Council is an emerging practitioner community. Nothing on the Platform is legal, regulatory, compliance, or professional advice.</Callout>
            </SectionCard>

            <SectionCard id="membership" title="2. Community Membership">
              <Callout type="success">
                Your first {COMPLIMENTARY_MONTHS} months of Community Membership are complimentary. No payment is required to join, and no card is collected. There is no automatic paid renewal.
              </Callout>
              <Row label="When it starts">Your {COMPLIMENTARY_MONTHS} months begin when your membership is activated after admin approval - not when you visit the site or apply.</Row>
              <Row label="Renewal">Before your complimentary period ends, we will invite you to renew. A paid membership starts only if you explicitly choose to renew and complete payment. We will not charge you automatically.</Row>
              <Row label="Renewal pricing">India: {inr.renewalPrice} per {inr.renewalPeriod}, {inr.taxNote}. United States: {usd.renewalPrice} per {usd.renewalPeriod}, {usd.taxNote}.</Row>
              <Row label="Payments and refunds">No payment is currently collected. Before any paid renewal is offered, we will publish the applicable payment and refund terms, and show the base price, applicable tax, and total before you pay.</Row>
              <Row label="If your membership ends">If your membership expires without being renewed, sign-in is paused until it is renewed. Your data is handled as described in the Privacy Policy.</Row>
              <Row label="Your profile">Working Professional or Final Year Undergraduate is self-declared at sign-up and determines resource download access. Final Year Undergraduates can request an upgrade, which our admin team reviews.</Row>
            </SectionCard>

            <SectionCard id="accounts" title="3. Accounts & Approval">
              <Row label="Accurate information">Provide accurate details when you register, including your name, email, organisation, and LinkedIn profile.</Row>
              <Row label="Approval">New accounts are reviewed by our admin team, usually within 24-48 hours. We may decline an application, or remove an account, that contains inaccurate information or breaks these Terms.</Row>
              <Row label="Your credentials">Keep your password secure. You are responsible for activity under your account.</Row>
            </SectionCard>

            <SectionCard id="chapter-lead" title="4. Chapter Lead Role">
              <Row label="Application-based">Apply to contribute resources or help facilitate the community. Selection is based on experience and the proposed contribution.</Row>
              <Row label="No fee">There is no separate subscription fee for the Chapter Lead role.</Row>
              <Row label="Moderation">Events, news, and workshops created by Chapter Leads are saved as drafts and reviewed by a Founding Member admin before they go public. Uploaded resources are reviewed before publication, and top-level community posts are subject to moderation.</Row>
              <Row label="Ending the role">We may end the role if contributions break these Terms.</Row>
            </SectionCard>

            <SectionCard id="conduct" title="5. Community Conduct & Content">
              <Row label="Be professional">Be respectful. Do not post unlawful, misleading, infringing, or confidential material.</Row>
              <Row label="No false affiliation">Do not imply that you, your employer, or any organisation is a Risk AI Council member, client, or partner unless that is true and the organisation has given permission.</Row>
              <Row label="Your content">You keep ownership of what you post. By posting or uploading, you allow us to host and display it on the Platform so the service can work.</Row>
              <Row label="Moderation">We may review content, and reduce its visibility or remove it, if it breaks these Terms.</Row>
              <Row label="Downloads">Resource downloads are subject to the limits shown in your account. Do not bulk-copy or redistribute resources beyond what the Platform allows.</Row>
            </SectionCard>

            <SectionCard id="programmes" title="6. Events, Workshops & Learning Programmes">
              <Row label="What membership includes">Membership includes the benefits listed on the <Link to="/membership" style={linkStyle}>Membership page</Link>.</Row>
              <Row label="Separately priced offerings">Any separately priced workshop or learning programme shows its own fees before you register.</Row>
              <Row label="Certificates">Learning programmes and any RAC certificate of completion are RAC's own. They are not accredited or endorsed by any external body unless we say so explicitly for a specific programme.</Row>
            </SectionCard>

            <SectionCard id="resources" title="7. Resources, Reviews & Standards">
              <Row label="Information only">Our framework, resources, templates, and reviews are for information and practical guidance. They are not legal, regulatory, compliance, or professional advice.</Row>
              <Row label="Standards and bodies">References to NIST, ISO, the OECD, the EU, or other bodies are for context. They do not imply endorsement or affiliation.</Row>
              <Row label="Product reviews">Reviews reflect the reviewer's assessment of the version tested at the time. Community ratings are separate from test scores.</Row>
              <Row label="Editorial approach">Our editorial approach prioritises evidence, transparent methods, and disclosure of relevant commercial relationships.</Row>
            </SectionCard>

            <SectionCard id="awards" title="8. Awards & Nominations">
              <P last>Awards, nominations, and voting are also governed by the <Link to="/nomination-terms" style={linkStyle}>Nomination Terms &amp; Conditions</Link>.</P>
            </SectionCard>

            <SectionCard id="deletion" title="9. Account Deletion">
              <P last>You can delete your account yourself at any time from the <Link to="/delete-account" style={linkStyle}>Delete Account page</Link>; deletion is immediate. Posts made while you held the Chapter Lead or Founding Member role may remain, attributed to "Former Chapter Lead," as described in the <Link to="/privacy" style={linkStyle}>Privacy Policy</Link>.</P>
            </SectionCard>

            <SectionCard id="changes" title="10. Changes to These Terms">
              <P last>We may update these Terms. The date at the top shows when they were last changed. If a change materially affects you, we will tell you through the Platform or by email.</P>
            </SectionCard>

            <SectionCard id="contact" title="11. Contact Us">
              <P>
                Questions about these Terms? Email <a href="mailto:support@riskaicouncil.org" style={linkStyle}>support@riskaicouncil.org</a> or use the <Link to="/contact" style={linkStyle}>Contact page</Link>.
              </P>
              {operatorLine() && <P last>{operatorLine()}</P>}
            </SectionCard>
          </main>
        </div>
      </div>
    </>
  );
}
