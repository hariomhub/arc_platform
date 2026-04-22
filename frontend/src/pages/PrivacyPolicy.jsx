import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ChevronRight, ArrowUp, Mail, MapPin, Info, AlertCircle, CheckCircle, Trash2, Calendar, Globe, Smartphone } from 'lucide-react';

const SECTIONS = [
  { id: 'introduction',   label: 'Introduction' },
  { id: 'info-collected', label: 'Information We Collect' },
  { id: 'how-we-use',     label: 'How We Use Your Information' },
  { id: 'sharing',        label: 'Data Sharing & Third Parties' },
  { id: 'your-rights',    label: 'Your Rights' },
  { id: 'retention',      label: 'Data Retention' },
  { id: 'security',       label: 'Security' },
  { id: 'children',       label: "Children's Privacy" },
  { id: 'changes',        label: 'Changes to This Policy' },
  { id: 'contact',        label: 'Contact Us' },
];

const SectionCard = ({ id, title, children }) => (
  <section id={id} style={{
    background: '#fff',
    border: '1px solid var(--border-light)',
    borderLeft: '4px solid var(--primary)',
    borderRadius: '8px',
    padding: '1.5rem 1.75rem',
    marginBottom: '1.25rem',
    scrollMarginTop: '90px',
  }}>
    <h2 style={{
      fontFamily: 'var(--font-serif)', color: 'var(--primary)',
      fontSize: '1.15rem', fontWeight: 700,
      marginBottom: '0.9rem', paddingBottom: '0.6rem',
      borderBottom: '1px solid var(--border-light)',
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

const SubHead = ({ children }) => (
  <h3 style={{ color: 'var(--primary)', fontSize: '0.92rem', fontWeight: 700, margin: '1rem 0 0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{children}</h3>
);

export default function PrivacyPolicy() {
  const [active, setActive] = useState('introduction');
  const [showTop, setShowTop] = useState(false);
  const obs = useRef(null);

  useEffect(() => {
    document.title = 'Privacy Policy — Risk AI Council';
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
        .pp-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; margin-top: 0.75rem; }
        .pp-table th { background: var(--primary); color: #fff; padding: 0.6rem 0.9rem; text-align: left; font-weight: 600; }
        .pp-table td { padding: 0.6rem 0.9rem; border-bottom: 1px solid var(--border-light); color: var(--text-secondary); }
        .pp-table tr:nth-child(even) td { background: #F8FAFC; }
      `}</style>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 60%,#005599 100%)', color: '#fff', padding: 'clamp(2.5rem,6vw,4rem) clamp(1rem,4vw,2rem)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 100, padding: '5px 14px', marginBottom: '1.25rem', color: '#93C5FD', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <Shield size={13} /> Legal &amp; Privacy
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 800, margin: '0 0 1rem', lineHeight: 1.15 }}>Privacy Policy</h1>
          <p style={{ color: '#CBD5E0', fontSize: '0.95rem', margin: '0 auto 1.1rem', maxWidth: '520px', lineHeight: 1.65 }}>
            We are committed to protecting your personal data. This policy explains what we collect, why, and how you can control it.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.8rem', color: '#94A3B8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Calendar size={13} /> Effective: April 23, 2026</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Globe size={13} /> riskaicouncil.com</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Smartphone size={13} /> Web &amp; Mobile App</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: 'var(--bg-light)', minHeight: '60vh', paddingBottom: '3rem' }}>
        <div className="pp-wrap">

          {/* TOC */}
          <aside className="pp-toc" aria-label="Table of Contents">
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-light)', marginBottom: '0.75rem' }}>Contents</p>
            {SECTIONS.map(({ id, label }) => (
              <button key={id} className={`toc-btn${active === id ? ' active' : ''}`}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>
                {label}
              </button>
            ))}
            <div style={{ marginTop: '1rem', paddingTop: '0.9rem', borderTop: '1px solid var(--border-light)' }}>
              <Link to="/delete-account" style={{ fontSize: '0.8rem', color: '#c62828', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                <Trash2 size={13} /> Delete My Account
              </Link>
            </div>
          </aside>

          {/* Sections */}
          <main>
            <SectionCard id="introduction" title="1. Introduction">
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
                Risk AI Council ("we," "us," or "our") operates <strong>riskaicouncil.com</strong> and its associated mobile application (the "Platform"). This Privacy Policy describes how we collect, use, store, share, and protect personal information for all users and visitors.
              </p>
              <Callout type="success">We do not sell your personal information to any third party, ever. Your data is used solely to operate and improve the Risk AI Council platform.</Callout>
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>By using the Platform, you agree to this policy. If you do not agree, please discontinue use.</p>
            </SectionCard>

            <SectionCard id="info-collected" title="2. Information We Collect">
              <SubHead>2.1 Provided Directly</SubHead>
              <Row label="Account Registration" value="Full name, email, password (hashed), role, organization, and LinkedIn URL." />
              <Row label="Profile" value="Bio, profile photo, professional sub-type." />
              <Row label="Community Content" value="Posts, comments, votes, reviews, event registrations, nominations." />
              <Row label="Workshop / Checkout" value="Membership plan selections and registration details." />
              <Row label="Contact Inquiries" value="Messages submitted via our Contact page or support email." />
              <SubHead>2.2 Collected Automatically</SubHead>
              <Row label="Usage Data" value="Pages visited, feed interactions (likes, saves, comments), search queries, time on Platform." />
              <Row label="Device & Browser" value="IP address, browser type, OS, device identifiers, referring URL." />
              <Row label="Auth Tokens" value="HTTP-only cookies storing encrypted JWTs for session management — inaccessible to JavaScript." />
              <SubHead>2.3 From Third Parties</SubHead>
              <Row label="LinkedIn OAuth" value="Name, email, profile photo, and LinkedIn ID only. We do not receive connections, messages, or employer history." />
              <Row label="Payment Processors" value="Payments are handled by third-party processors. We do not store card numbers on our servers." />
              <Callout type="warning">Our mobile app may request optional camera or notification permissions. These can be revoked at any time in your device settings.</Callout>
            </SectionCard>

            <SectionCard id="how-we-use" title="3. How We Use Your Information">
              <Row label="Account Management" value="Creating accounts, OTP email verification, admin approval processing." />
              <Row label="Platform Services" value="Posts, comments, events, resources, community feed, and member interactions." />
              <Row label="Communications" value="Welcome emails, OTPs, membership expiry notices, and activity notifications." />
              <Row label="Moderation" value="Reviewing community content against our standards and terms of use." />
              <Row label="Analytics" value="Understanding usage to improve features. Feed ranking uses an engagement algorithm (likes × 3, comments × 2, saves × 1)." />
              <Row label="Security" value="Detecting fraud, unauthorized access, and Platform abuse." />
              <Row label="Legal Compliance" value="Meeting applicable laws, regulations, and legal processes." />
              <Callout type="info">We do not use your data for automated decision-making or profiling with legal or significant effects.</Callout>
            </SectionCard>

            <SectionCard id="sharing" title="4. Data Sharing & Third Parties">
              <SubHead>4.1 Service Providers</SubHead>
              <Row label="Microsoft Azure" value="Blob Storage for user-uploaded media (images, PDFs, videos)." />
              <Row label="SMTP Email Provider" value="Sends transactional emails (OTPs, welcome, expiry notices) on our behalf." />
              <Row label="LinkedIn OAuth" value="Authentication via LinkedIn's OAuth 2.0 under their own privacy policy." />
              <Row label="News APIs" value="Third-party APIs surface relevant AI risk news. No personal data is shared." />
              <SubHead>4.2 Legal Requirements</SubHead>
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.5rem' }}>
                We may disclose your information if required by law, court order, or to protect the safety of any person or prevent fraud.
              </p>
              <SubHead>4.3 Business Transfers</SubHead>
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                If Risk AI Council is acquired or merges, your data may transfer as part of the transaction. You will be notified before this occurs.
              </p>
              <Callout type="success">All service providers are contractually bound to use your data only as directed by us and in compliance with applicable data protection laws.</Callout>
            </SectionCard>

            <SectionCard id="your-rights" title="5. Your Rights">
              <Row label="Access" value="Request a copy of the personal data we hold about you." />
              <Row label="Correction" value="Request correction of inaccurate data. Most profile fields are editable directly in your Profile page." />
              <Row label="Deletion" value="Request deletion of your account and personal data. See important notice below." />
              <Row label="Portability" value="Request your data in a structured, machine-readable format." />
              <Row label="Opt-out" value="Unsubscribe from non-essential communications via notification settings or email unsubscribe links." />
              <Row label="Restriction" value="Request restriction of data processing in certain circumstances." />
              <Callout type="warning">
                <strong>Post Retention Policy:</strong> If you hold or have held the role of Council Member or Founding Member, your posts are part of the Platform's knowledge base. Upon account deletion, posts are NOT removed — your name is replaced with <em>"Former Council Member"</em> to preserve community integrity.
              </Callout>
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>
                Contact us at <a href="mailto:support@riskaicouncil.com" style={{ color: 'var(--accent)', fontWeight: 600 }}>support@riskaicouncil.com</a> or visit the <Link to="/delete-account" style={{ color: 'var(--accent)', fontWeight: 600 }}>Account Deletion page</Link> to exercise these rights.
              </p>
            </SectionCard>

            <SectionCard id="retention" title="6. Data Retention">
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.75rem' }}>We retain data only as long as necessary for the purposes outlined in this policy:</p>
              <div style={{ overflowX: 'auto' }}>
                <table className="pp-table">
                  <thead><tr><th>Data Type</th><th>Retention Period</th></tr></thead>
                  <tbody>
                    {[
                      ['Active account data', 'Lifetime of your account'],
                      ['Session tokens (JWT)', '7 days (auto-expiry)'],
                      ['Email verification OTPs', '10 minutes (auto-expiry)'],
                      ['Posts — Professional users', 'Deleted upon account deletion'],
                      ['Posts — Council / Founding Members', 'Retained indefinitely in anonymized form'],
                      ['Uploaded media', 'Deleted upon post or account deletion'],
                      ['Notification records', '90 days, then auto-purged'],
                      ['Payment & workshop records', '7 years (legal / accounting compliance)'],
                      ['Server logs', '30 days (security monitoring)'],
                    ].map(([type, period], i) => (
                      <tr key={i}><td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{type}</td><td>{period}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard id="security" title="7. Security">
              <Row label="Password Hashing" value="All passwords are hashed with bcrypt (cost factor 12). Plain-text passwords are never stored." />
              <Row label="Encrypted Sessions" value="HTTP-only, secure, SameSite-strict cookies with signed JWTs — inaccessible to browser JavaScript." />
              <Row label="HTTPS" value="All data is transmitted over TLS (HTTPS)." />
              <Row label="Rate Limiting" value="Auth endpoints are rate-limited to prevent brute-force attacks." />
              <Row label="Cloud Storage" value="All media is stored in Microsoft Azure Blob Storage with account-level access controls." />
              <Row label="Input Validation" value="All user input is validated and sanitized server-side before processing or storage." />
              <Callout type="warning">No system is 100% secure. If you believe your account is compromised, contact <strong>support@riskaicouncil.com</strong> immediately.</Callout>
            </SectionCard>

            <SectionCard id="children" title="8. Children's Privacy">
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.5rem' }}>
                The Risk AI Council Platform is intended for professionals and is not directed to individuals under the age of <strong>18</strong>. We do not knowingly collect personal information from minors.
              </p>
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                If you believe a minor has provided us with their information, contact <a href="mailto:support@riskaicouncil.com" style={{ color: 'var(--accent)' }}>support@riskaicouncil.com</a> and we will delete it promptly.
              </p>
            </SectionCard>

            <SectionCard id="changes" title="9. Changes to This Policy">
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
                We may update this Privacy Policy from time to time. When we make material changes, we will:
              </p>
              <Row value="Update the 'Effective Date' at the top of this page." />
              <Row value="Send a notification to your registered email address." />
              <Row value="Display a prominent notice on the Platform for at least 30 days." />
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0.5rem 0 0' }}>
                Your continued use after the effective date constitutes acceptance of the revised policy.
              </p>
            </SectionCard>

            <SectionCard id="contact" title="10. Contact Us">
              <p style={{ fontSize: '0.91rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>For questions, concerns, or data requests regarding this Privacy Policy:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: '0.9rem' }}>
                <div style={{ background: 'var(--bg-light)', borderRadius: '7px', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Mail size={15} color="var(--primary)" /><strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>Email</strong>
                  </div>
                  <a href="mailto:support@riskaicouncil.com" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.88rem' }}>support@riskaicouncil.com</a>
                </div>
                <div style={{ background: 'var(--bg-light)', borderRadius: '7px', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <MapPin size={15} color="var(--primary)" /><strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>Offices</strong>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li><strong style={{ color: 'var(--text-main)' }}>USA:</strong> Costa Mesa, CA 92626</li>
                    <li><strong style={{ color: 'var(--text-main)' }}>UAE:</strong> Villa 43, Street 2, Springs 3, Dubai</li>
                    <li><strong style={{ color: 'var(--text-main)' }}>India:</strong> 902 Unitech Arcadia, Sector 49, Gurugram</li>
                    <li><strong style={{ color: 'var(--text-main)' }}>Canada:</strong> 50 Charles St E M4Y 0C3, Toronto</li>
                  </ul>
                </div>
              </div>
              <div style={{ marginTop: '1rem', padding: '0.9rem 1.1rem', background: '#EEF2FF', borderRadius: '7px', border: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Want to delete your account?{' '}
                  <Link to="/delete-account" style={{ color: 'var(--primary)', fontWeight: 700 }}>Visit our Account Deletion page →</Link>
                </p>
              </div>
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
