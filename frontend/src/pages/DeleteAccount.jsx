import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, AlertTriangle, ChevronDown, ChevronUp, CheckCircle, Mail, ArrowRight, ShieldAlert, X } from 'lucide-react';

const FAQS = [
  { q: 'Can I recover my account after deletion?', a: 'No. Once permanently deleted (after the 30-day grace period), all associated data is removed and cannot be recovered. Contact our support team before submitting if you have concerns.' },
  { q: 'What happens to my community posts?', a: 'Professional member posts are deleted with your account. Council Member and Founding Member posts are retained but anonymized — displayed as "Former Council Member" — to preserve community knowledge continuity.' },
  { q: 'How long does the deletion process take?', a: 'Your account is deactivated immediately upon confirmation. Permanent deletion occurs after a 30-day grace period, during which you can cancel by contacting support.' },
  { q: 'Will I receive a confirmation?', a: 'Yes. You will receive a confirmation email when your request is received and again when permanent deletion is complete.' },
  { q: 'What if I signed in with LinkedIn?', a: 'Deleting your Risk AI Council account does not affect your LinkedIn account. Your OAuth connection will be removed. You can also revoke app access from LinkedIn\'s security settings.' },
  { q: 'Can I re-register after deletion?', a: 'Yes, with the same email after full deletion. However, all previous data, membership status, and contributions will not be restored.' },
];

const Step = ({ num, title, desc, tag }) => (
  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
    <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem' }}>{num}</div>
    <div style={{ flex: 1, paddingTop: '0.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
        <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{title}</strong>
        {tag && <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '999px' }}>{tag}</span>}
      </div>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>{desc}</p>
    </div>
  </div>
);

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border-light)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.9rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: 'var(--text-main)', fontSize: '0.92rem', fontWeight: 600 }} aria-expanded={open}>
        {q}
        {open ? <ChevronUp size={16} color="var(--primary)" style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color="var(--primary)" style={{ flexShrink: 0 }} />}
      </button>
      {open && <p style={{ margin: '0 0 0.9rem', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.65 }}>{a}</p>}
    </div>
  );
};

const Card = ({ children, style = {} }) => (
  <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1.4rem 1.6rem', ...style }}>{children}</div>
);

const CardTitle = ({ children }) => (
  <h2 style={{ color: 'var(--primary)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>{children}</h2>
);

export default function DeleteAccount() {
  const [form, setForm] = useState({ name: '', email: '', reason: '', confirm: false });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { document.title = 'Delete Account — Risk AI Council'; }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.confirm) return;
    const subject = encodeURIComponent('Account Deletion Request — Risk AI Council');
    const body = encodeURIComponent(`Full Name: ${form.name}\nEmail: ${form.email}\nReason: ${form.reason}\n\nI confirm I want to permanently delete my Risk AI Council account.`);
    window.location.href = `mailto:support@riskaicouncil.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <>
      <style>{`
        .da-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 580px) { .da-2col { grid-template-columns: 1fr; } }
        .da-input { width: 100%; padding: 0.65rem 0.9rem; border: 1.5px solid var(--border-medium); border-radius: 6px; font-family: var(--font-sans); font-size: 0.9rem; color: var(--text-main); outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .da-input:focus { border-color: var(--primary); }
        .da-label { display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.4rem; }
      `}</style>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 60%,#005599 100%)', color: '#fff', padding: 'clamp(2.5rem,6vw,4rem) clamp(1rem,4vw,2rem)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 100, padding: '5px 14px', marginBottom: '1.25rem', color: '#93C5FD', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <Trash2 size={13} /> Account Management
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 800, margin: '0 0 1rem', lineHeight: 1.15 }}>Delete Your Account</h1>
          <p style={{ color: '#CBD5E0', fontSize: '0.93rem', lineHeight: 1.65, margin: 0 }}>
            Please read the information below carefully before submitting. This action is permanent and cannot be undone.
          </p>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: 'var(--bg-light)', padding: 'clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Warning banner */}
          <div style={{ background: '#FFF8F0', border: '1px solid #FBBF24', borderLeft: '4px solid #F59E0B', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#92400E', display: 'block', marginBottom: '0.25rem', fontSize: '0.92rem' }}>This action is permanent</strong>
              <p style={{ margin: 0, color: '#78350F', fontSize: '0.87rem', lineHeight: 1.6 }}>
                Account deletion is irreversible. After the 30-day grace period, all your data is permanently erased. Save any content you wish to keep before proceeding.
              </p>
            </div>
          </div>

          {/* What gets deleted / retained */}
          <Card>
            <CardTitle>What Happens When You Delete Your Account</CardTitle>
            <div className="da-2col">
              <div>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#c62828', marginBottom: '0.65rem' }}>What Gets Deleted</p>
                {['Account & login credentials', 'Profile photo & bio', 'Membership & subscription history', 'Event & workshop registrations', 'Saved posts & bookmarks', 'Notification history', 'Posts created as Professional member'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'flex-start' }}>
                    <X size={13} color="#c62828" style={{ flexShrink: 0, marginTop: '3px' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.87rem' }}>{item}</span>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2e7d32', marginBottom: '0.65rem' }}>What Is Retained</p>
                {['Posts by Council / Founding Members (anonymized as "Former Council Member")', 'Payment records (7 years — legal requirement)', 'Server logs (30 days — security)', 'Anonymized aggregate analytics'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'flex-start' }}>
                    <CheckCircle size={13} color="#2e7d32" style={{ flexShrink: 0, marginTop: '3px' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.87rem' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Council member notice */}
          <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderLeft: '4px solid var(--primary)', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
            <ShieldAlert size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '0.3rem', fontSize: '0.92rem' }}>Council Member & Founding Member — Post Retention Policy</strong>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.87rem', lineHeight: 1.65 }}>
                If you are (or were) a <strong>Council Member</strong> or <strong>Founding Member</strong>, your community posts form part of the permanent knowledge base of the Risk AI Council. Upon deletion, posts are <strong>not</strong> removed — your name is anonymized to <em style={{ color: 'var(--primary)', fontWeight: 600 }}>"Former Council Member"</em> to preserve community integrity.
              </p>
            </div>
          </div>

          {/* Steps */}
          <Card>
            <CardTitle>How to Request Account Deletion</CardTitle>
            <Step num="1" title="Log in to your account" desc="Visit riskaicouncil.com and sign in with your registered email and password, or via LinkedIn." />
            <Step num="2" title="Go to your Profile" desc="Click your avatar (top-right) and navigate to Profile → Settings." />
            <Step num="3" title="Submit a deletion request" desc="Click 'Delete My Account' in the Danger Zone section, or use the form below." tag="Coming Soon in App" />
            <Step num="4" title="Receive confirmation email" desc="You'll receive a confirmation email. Your account is deactivated immediately upon confirmation." />
            <Step num="5" title="30-day grace period" desc="Data is permanently erased after 30 days. You may cancel by contacting support within this window." />
          </Card>

          {/* Request form */}
          <Card style={{ borderTop: '4px solid var(--primary)' }}>
            <CardTitle>Submit a Deletion Request</CardTitle>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem', marginTop: '-0.5rem' }}>
              Fill the form below. Clicking Submit opens your email client pre-filled — just send it to complete the request.
            </p>

            {submitted ? (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', padding: '1.25rem', textAlign: 'center' }}>
                <CheckCircle size={36} color="#16a34a" style={{ margin: '0 auto 0.75rem' }} />
                <strong style={{ color: '#166534', fontSize: '1rem', display: 'block', marginBottom: '0.4rem' }}>Request Prepared!</strong>
                <p style={{ color: '#166534', fontSize: '0.88rem', margin: 0 }}>Your email client should have opened with the deletion request. Send it to complete the process. Our team responds within 2–3 business days.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="da-2col" style={{ marginBottom: '0.9rem' }}>
                  <div>
                    <label className="da-label" htmlFor="da-name">Full Name *</label>
                    <input id="da-name" className="da-input" type="text" required placeholder="Your registered name"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="da-label" htmlFor="da-email">Registered Email *</label>
                    <input id="da-email" className="da-input" type="email" required placeholder="you@example.com"
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="da-label" htmlFor="da-reason">Reason for Deletion</label>
                  <select id="da-reason" className="da-input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                    <option value="">Select a reason (optional)</option>
                    <option>I no longer use the platform</option>
                    <option>I have privacy concerns</option>
                    <option>I want to create a new account</option>
                    <option>The platform doesn't meet my needs</option>
                    <option>Other</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start', marginBottom: '1.25rem', background: '#FFF8F0', border: '1px solid #FED7AA', borderRadius: '7px', padding: '0.85rem 1rem' }}>
                  <input id="da-confirm" type="checkbox" required style={{ marginTop: '3px', flexShrink: 0, width: '16px', height: '16px', cursor: 'pointer' }}
                    checked={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.checked }))} />
                  <label htmlFor="da-confirm" style={{ fontSize: '0.87rem', color: 'var(--text-main)', cursor: 'pointer', lineHeight: 1.6 }}>
                    I understand that deleting my account is <strong>permanent and irreversible</strong> after the 30-day grace period, and that council/founding member posts will be anonymized rather than deleted.
                  </label>
                </div>
                <button type="submit" style={{ background: '#c62828', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.7rem 1.5rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', transition: 'background 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#b71c1c'}
                  onMouseOut={e => e.currentTarget.style.background = '#c62828'}>
                  <Mail size={15} /> Submit Deletion Request <ArrowRight size={14} />
                </button>
              </form>
            )}
          </Card>

          {/* FAQ */}
          <Card>
            <CardTitle>Frequently Asked Questions</CardTitle>
            {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </Card>

          {/* Footer contact */}
          <div style={{ textAlign: 'center', padding: '1.1rem', background: '#fff', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <p style={{ margin: '0 0 0.35rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Still have questions? Our support team is here to help.</p>
            <a href="mailto:support@riskaicouncil.com" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Mail size={14} /> support@riskaicouncil.com
            </a>
            <span style={{ margin: '0 0.85rem', color: 'var(--border-medium)' }}>|</span>
            <Link to="/privacy" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.88rem' }}>View Privacy Policy →</Link>
          </div>
        </div>
      </div>
    </>
  );
}
