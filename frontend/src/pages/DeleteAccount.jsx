import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2, AlertTriangle, ChevronDown, ChevronUp,
  CheckCircle, Mail, ShieldAlert, X, Clock, LogOut,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { submitDeletionRequest, getMyDeletionRequest } from '../api/accountDeletion.js';

// ─── Static data ──────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'Can I recover my account after deletion?', a: 'No. Once you confirm, your login credentials and personal information are permanently and irreversibly erased and cannot be recovered. Contact our support team before submitting if you have concerns.' },
  { q: 'What happens to my community posts?', a: 'Posts, comments, resource uploads, reviews, and award votes are retained but anonymized — displayed as "Former Member" (or "Former Chapter Lead" for former Chapter Leads and Founding Members) — to preserve community knowledge continuity for everyone.' },
  { q: 'How long does the deletion process take?', a: 'Deletion happens immediately upon submission — there is no waiting period or administrator review.' },
  { q: 'Will I receive a confirmation?', a: 'Yes. You will receive a confirmation email once your account has been permanently deleted.' },
  { q: 'What if I signed in with LinkedIn?', a: 'Deleting your Risk AI Council account does not affect your LinkedIn account. Your OAuth connection will be removed. You can also revoke app access from LinkedIn\'s security settings.' },
  { q: 'Can I re-register after deletion?', a: 'Yes — once deleted, your email address becomes available again for a new registration. However, your previous data, membership status, and contributions will not be linked to the new account.' },
];

const DELETED_ITEMS = [
  'Account & login credentials',
  'Profile photo, bio & social links',
  'Membership & subscription history',
  'Event & workshop registrations',
  'Saved posts & bookmarks',
  'Notification history',
  'Session tokens & device tokens',
];

const RETAINED_ITEMS = [
  'Posts, comments & resource uploads (anonymized as "Former Member")',
  'Reviews & award votes you submitted (anonymized, counts unaffected)',
  'Payment records (legal requirement)',
  'Server logs (security – 30 days)',
];

// ─── Sub-components ───────────────────────────────────────────────────────────
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
  <h2 style={{ color: 'var(--primary)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', margin: '0 0 1rem' }}>{children}</h2>
);

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    Pending:   { bg: '#FEF3C7', color: '#92400E', label: 'Pending Review' },
    Approved:  { bg: '#D1FAE5', color: '#065F46', label: 'Approved' },
    Rejected:  { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
    Completed: { bg: '#D1FAE5', color: '#065F46', label: 'Completed' },
  };
  const s = map[status] || { bg: '#F1F5F9', color: '#475569', label: status };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', display: 'inline-block' }}>
      {s.label}
    </span>
  );
};

// ─── Pending Request Banner ───────────────────────────────────────────────────
const PendingRequestCard = ({ request }) => (
  <Card style={{ borderTop: '4px solid #F59E0B' }}>
    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
      <Clock size={22} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
      <div>
        <strong style={{ color: '#92400E', display: 'block', marginBottom: '0.3rem', fontSize: '1rem' }}>
          Deletion Request Pending
        </strong>
        <p style={{ margin: '0 0 1rem', color: '#78350F', fontSize: '0.88rem', lineHeight: 1.65 }}>
          Your account deletion request has been submitted and is currently awaiting administrator review.
          Your account is temporarily deactivated. You will receive an email once a decision is made.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>Status: </span>
            <StatusBadge status={request.status} />
          </div>
          {request.requested_at && (
            <span style={{ fontSize: '0.8rem', color: '#78350F' }}>
              Submitted: {new Date(request.requested_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  </Card>
);

// ─── Success State ────────────────────────────────────────────────────────────
const SuccessState = () => (
  <Card style={{ borderTop: '4px solid #10B981', textAlign: 'center' }}>
    <CheckCircle size={44} color="#10B981" style={{ margin: '0 auto 1rem', display: 'block' }} />
    <strong style={{ color: '#065F46', fontSize: '1.1rem', display: 'block', marginBottom: '0.5rem' }}>
      Account Deleted Successfully
    </strong>
    <p style={{ color: '#047857', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>
      Your account and all associated personal data have been permanently deleted.
      You will receive a confirmation email shortly. You have been logged out automatically.
    </p>
  </Card>
);

// ─── Deletion Request Form ────────────────────────────────────────────────────
const DeletionForm = ({ user, onSuccess }) => {
  const [form, setForm] = useState({
    full_name: user?.name || '',
    email:     user?.email || '',
    reason:    '',
    confirmed: false,
  });
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]     = useState('');

  const handleChange = (field) => (e) =>
    setForm(f => ({ ...f, [field]: field === 'confirmed' ? e.target.checked : e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.confirmed) {
      setError('You must check the confirmation checkbox to proceed.');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      await submitDeletionRequest({
        full_name: form.full_name.trim(),
        email:     form.email.trim(),
        reason:    form.reason.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ borderTop: '4px solid var(--primary)' }}>
      <CardTitle>Delete Account</CardTitle>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
        Deleting your account is permanent and cannot be undone. Once you confirm, your account and all associated personal data will be permanently deleted immediately.
      </p>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '7px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
          <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span style={{ color: '#DC2626', fontSize: '0.87rem' }}>{error}</span>
        </div>
      )}

      {showConfirm && (
        <div className="da-modal-overlay">
          <div className="da-modal">
            <h3 style={{ margin: '0 0 0.75rem', color: '#c62828', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={22} />
              Confirm Account Deletion
            </h3>
            <p style={{ margin: '0 0 1.75rem', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Are you absolutely sure you want to delete your account? This action is <strong>permanent</strong> and cannot be undone. All your personal data, membership status, and records will be deleted immediately.
            </p>
            <div className="da-modal-buttons">
              <button
                type="button"
                className="da-btn-cancel"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="da-btn-confirm"
                onClick={handleConfirmDelete}
              >
                Permanently Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Two-column: name + email */}
        <div className="da-2col" style={{ marginBottom: '0.9rem' }}>
          <div>
            <label className="da-label" htmlFor="da-name">Full Name *</label>
            <input
              id="da-name"
              className="da-input"
              type="text"
              required
              placeholder="Your full name"
              value={form.full_name}
              onChange={handleChange('full_name')}
            />
          </div>
          <div>
            <label className="da-label" htmlFor="da-email">Registered Email *</label>
            <input
              id="da-email"
              className="da-input"
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange('email')}
            />
          </div>
        </div>

        {/* Reason */}
        <div style={{ marginBottom: '1rem' }}>
          <label className="da-label" htmlFor="da-reason">Reason for Deletion (Optional)</label>
          <select
            id="da-reason"
            className="da-input"
            value={form.reason}
            onChange={handleChange('reason')}
          >
            <option value="">Select a reason (optional)</option>
            <option value="I no longer use the platform">I no longer use the platform</option>
            <option value="I have privacy concerns">I have privacy concerns</option>
            <option value="I want to create a new account">I want to create a new account</option>
            <option value="The platform doesn't meet my needs">The platform doesn't meet my needs</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Confirmation checkbox */}
        <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start', marginBottom: '1.25rem', background: '#FFF8F0', border: '1px solid #FED7AA', borderRadius: '7px', padding: '0.85rem 1rem' }}>
          <input
            id="da-confirm"
            type="checkbox"
            required
            style={{ marginTop: '3px', flexShrink: 0, width: '16px', height: '16px', cursor: 'pointer' }}
            checked={form.confirmed}
            onChange={handleChange('confirmed')}
          />
          <label htmlFor="da-confirm" style={{ fontSize: '0.87rem', color: 'var(--text-main)', cursor: 'pointer', lineHeight: 1.6 }}>
            I understand that deleting my account is <strong>permanent</strong> and cannot be undone. My login credentials and personal information will be permanently removed immediately. My community posts, resources, reviews, and votes will be anonymized as "Former Member" rather than deleted.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          id="da-submit-btn"
          style={{ background: loading ? '#94A3B8' : '#c62828', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.7rem 1.5rem', fontWeight: 700, fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', transition: 'background 0.2s' }}
          onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#b71c1c'; }}
          onMouseOut={e => { if (!loading) e.currentTarget.style.background = '#c62828'; }}
        >
          {loading ? <RefreshCw size={15} style={{ animation: 'da-spin 1s linear infinite' }} /> : <Trash2 size={15} />}
          {loading ? 'Deleting…' : 'Delete Account'}
        </button>
      </form>
    </Card>
  );
};

// ─── Login prompt for unauthenticated visitors ────────────────────────────────
const LoginPrompt = () => (
  <Card style={{ borderTop: '4px solid var(--primary)', textAlign: 'center' }}>
    <Mail size={36} color="var(--primary)" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
    <strong style={{ color: 'var(--text-main)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>
      Sign In to Submit a Request
    </strong>
    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
      You must be logged in to submit an account deletion request.
    </p>
    <Link
      to="/login"
      style={{ background: 'var(--primary)', color: '#fff', textDecoration: 'none', borderRadius: '6px', padding: '0.65rem 1.4rem', fontWeight: 700, fontSize: '0.9rem', display: 'inline-block' }}
    >
      Log In
    </Link>
  </Card>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DeleteAccount() {
  const { user, logout, isAuthLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [submitted, setSubmitted]           = useState(false);
  const [pendingRequest, setPendingRequest]  = useState(null);
  const [checkingRequest, setCheckingRequest] = useState(false);

  useEffect(() => { document.title = 'Delete Account — Risk AI Council'; }, []);

  // Redirect admin users away
  useEffect(() => {
    if (isAuthLoading) return;
    if (user && isAdmin && isAdmin()) {
      navigate('/profile');
    }
  }, [user, isAuthLoading, isAdmin, navigate]);

  // When logged in, check for an existing pending request
  useEffect(() => {
    if (!user || isAuthLoading || (isAdmin && isAdmin())) return;
    setCheckingRequest(true);
    getMyDeletionRequest()
      .then(res => {
        if (res.data?.data) setPendingRequest(res.data.data);
      })
      .catch(() => {})
      .finally(() => setCheckingRequest(false));
  }, [user, isAuthLoading, isAdmin]);

  // After successful submission: log user out, then show success state
  const handleSuccess = useCallback(async () => {
    setSubmitted(true);
    try { await logout(); } catch (_) {}
    // Redirect to login after 2 seconds
    setTimeout(() => navigate('/login'), 2000);
  }, [logout, navigate]);

  // Decide which right-column content to show
  const renderFormArea = () => {
    if (isAuthLoading || checkingRequest) {
      return (
        <Card style={{ textAlign: 'center', padding: '2rem' }}>
          <RefreshCw size={28} color="var(--primary)" style={{ animation: 'da-spin 1s linear infinite', display: 'block', margin: '0 auto 0.75rem' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Loading…</span>
        </Card>
      );
    }
    if (submitted) return <SuccessState />;
    if (!user) return <LoginPrompt />;
    if (pendingRequest) return <PendingRequestCard request={pendingRequest} />;
    return <DeletionForm user={user} onSuccess={handleSuccess} />;
  };

  return (
    <>
      <style>{`
        .da-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 580px) { .da-2col { grid-template-columns: 1fr; } }
        .da-input { width: 100%; padding: 0.65rem 0.9rem; border: 1.5px solid var(--border-medium); border-radius: 6px; font-family: var(--font-sans); font-size: 0.9rem; color: var(--text-main); outline: none; transition: border-color 0.2s; box-sizing: border-box; background: #fff; }
        .da-input:focus { border-color: var(--primary); }
        .da-label { display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.4rem; }
        .da-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: da-fadeIn 0.2s ease-out; }
        .da-modal { background: #fff; border-radius: 12px; max-width: 480px; width: 100%; padding: 2rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border: 1px solid var(--border-light); animation: da-slideUp 0.2s ease-out; }
        .da-modal-buttons { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.75rem; }
        .da-btn-cancel { background: #f1f5f9; color: var(--text-main); border: 1px solid var(--border-medium); border-radius: 6px; padding: 0.6rem 1.25rem; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: background 0.2s; }
        .da-btn-cancel:hover { background: #e2e8f0; }
        .da-btn-confirm { background: #c62828; color: #fff; border: none; border-radius: 6px; padding: 0.6rem 1.25rem; font-weight: 700; font-size: 0.88rem; cursor: pointer; transition: background 0.2s; }
        .da-btn-confirm:hover { background: #b71c1c; }
        @keyframes da-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes da-slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes da-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 60%,#005599 100%)', color: '#fff', padding: 'clamp(2.5rem,6vw,4rem) clamp(1rem,4vw,2rem)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 100, padding: '5px 14px', marginBottom: '1.25rem', color: '#93C5FD', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <Trash2 size={13} /> Account Management
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 800, margin: '0 0 1rem', lineHeight: 1.15 }}>Delete Account</h1>
          <p style={{ color: '#CBD5E0', fontSize: '0.93rem', lineHeight: 1.65, margin: 0 }}>
            Deleting your account is permanent and cannot be undone. Once you confirm, your account and all associated personal data will be permanently deleted immediately.
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ background: 'var(--bg-light)', padding: 'clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Warning banner */}
          <div style={{ background: '#FFF8F0', border: '1px solid #FBBF24', borderLeft: '4px solid #F59E0B', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#92400E', display: 'block', marginBottom: '0.25rem', fontSize: '0.92rem' }}>This action is permanent</strong>
              <p style={{ margin: 0, color: '#78350F', fontSize: '0.87rem', lineHeight: 1.6 }}>
                Account deletion is irreversible. Once you confirm, all your personal data is permanently erased immediately. Save any content you wish to keep before proceeding.
              </p>
            </div>
          </div>

          {/* What gets deleted / retained */}
          <Card>
            <CardTitle>What Happens When You Delete Your Account</CardTitle>
            <div className="da-2col">
              <div>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#c62828', marginBottom: '0.65rem', marginTop: 0 }}>What Gets Deleted</p>
                {DELETED_ITEMS.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'flex-start' }}>
                    <X size={13} color="#c62828" style={{ flexShrink: 0, marginTop: '3px' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.87rem' }}>{item}</span>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2e7d32', marginBottom: '0.65rem', marginTop: 0 }}>What Is Retained</p>
                {RETAINED_ITEMS.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'flex-start' }}>
                    <CheckCircle size={13} color="#2e7d32" style={{ flexShrink: 0, marginTop: '3px' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.87rem' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Content retention notice */}
          <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderLeft: '4px solid var(--primary)', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
            <ShieldAlert size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '0.3rem', fontSize: '0.92rem' }}>Community Content Retention Policy</strong>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.87rem', lineHeight: 1.65 }}>
                Your posts, comments, resource uploads, reviews, and award votes form part of the
                permanent knowledge base of the Risk AI Council. Upon deletion, this content is{' '}
                <strong>not</strong> removed — your name is anonymized to{' '}
                <em style={{ color: 'var(--primary)', fontWeight: 600 }}>"Former Member"</em>{' '}
                (or <em style={{ color: 'var(--primary)', fontWeight: 600 }}>"Former Chapter Lead"</em>{' '}
                if you were a Chapter Lead or Founding Member) to preserve community integrity and
                keep review ratings and vote tallies accurate for everyone else.
              </p>
            </div>
          </div>

          {/* Form / Status area */}
          {renderFormArea()}

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
