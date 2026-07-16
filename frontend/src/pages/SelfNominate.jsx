import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import {
    Trophy, Award, CheckCircle, Loader2, AlertCircle, Upload, Linkedin,
    Copy, Check, ShieldCheck, Gavel, Sparkles, ChevronRight, ChevronLeft, Mail,
    LogIn, UserPlus, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { getAwards } from '../api/nominations.js';
import { getPanelMembers } from '../api/awardPanel.js';
import { sendNominationOtp, verifyNominationOtp, submitSelfNomination } from '../api/nominations.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import BioModal from '../components/modals/BioModal.jsx';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const Field = ({ id, label, required, hint, error, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <label htmlFor={id} style={{ fontSize: '0.78rem', fontWeight: '600', color: error ? '#DC2626' : '#374151' }}>
                {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
            </label>
            {hint && <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{hint}</span>}
        </div>
        {children}
        {error && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#DC2626' }}><AlertCircle size={11} />{error}</span>}
    </div>
);

const inputStyle = (hasError, disabled) => ({
    width: '100%', padding: '0.6rem 0.8rem',
    border: `1.5px solid ${hasError ? '#FCA5A5' : '#E2E8F0'}`,
    borderRadius: '9px', fontSize: '0.85rem', boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)', outline: 'none',
    background: disabled ? '#F1F5F9' : (hasError ? '#FFF5F5' : '#FAFBFC'),
    color: '#0F172A', opacity: disabled ? 0.75 : 1,
    transition: 'border-color 0.15s, box-shadow 0.15s',
});

const gridRow = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' };

// ─── Jury & Presenters panel ───────────────────────────────────────────────────
const PanelRow = ({ title, icon: Icon, members, onSelect }) => {
    if (!members.length) return null;
    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem' }}>
                <Icon size={14} color="#0055A4" />
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '700', color: '#1E293B' }}>{title}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {members.map((m) => (
                    <button key={m.id} onClick={() => onSelect(m)} type="button"
                        style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '100px', padding: '4px 11px 4px 4px', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0055A4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,85,164,0.12)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}>
                        {m.photo_url
                            ? <img src={m.photo_url} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
                            : <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#003366', color: 'white', fontSize: '0.68rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.name?.charAt(0)}</div>}
                        <span style={{ fontSize: '0.76rem', fontWeight: '600', color: '#1E293B' }}>{m.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// Award-aware: refetches whenever the selected award changes, since a panel
// member may be scoped to specific awards (or global, if unscoped).
const JuryPanel = ({ awardId }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        if (!awardId) { setMembers([]); return; }
        setLoading(true);
        getPanelMembers({ award_id: awardId, type: 'jury,presenter' })
            .then((res) => setMembers(res.data?.data || []))
            .catch(() => setMembers([]))
            .finally(() => setLoading(false));
    }, [awardId]);

    if (!awardId) {
        return (
            <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#94A3B8' }}>
                Select an award above to see who's on the jury and presenting panel for it.
            </div>
        );
    }
    if (loading) return null;

    const jury = members.filter((m) => m.panel_type === 'jury');
    const presenters = members.filter((m) => m.panel_type === 'presenter');
    if (!jury.length && !presenters.length) return null;

    return (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.1rem 1.4rem' }}>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B' }}>Who's judging this award</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem 1.5rem' }}>
                <PanelRow title="Jury — finalizing winners" icon={Gavel} members={jury} onSelect={setSelected} />
                <PanelRow title="Presenting the awards" icon={Sparkles} members={presenters} onSelect={setSelected} />
            </div>
            <BioModal isOpen={!!selected} onClose={() => setSelected(null)} member={selected} />
        </div>
    );
};

// ─── Access gate — asked only for logged-out visitors ────────────────────────
const AccessGate = ({ onContinueAsGuest }) => {
    const navigate = useNavigate();
    return (
        <div style={{ maxWidth: '640px', margin: '0 auto', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: 'clamp(1.5rem,4vw,2rem)' }}>
            <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', textAlign: 'center' }}>How would you like to continue?</h2>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.84rem', color: '#64748B', textAlign: 'center' }}>You can sign in as a member for a faster, pre-filled form — or continue without an account.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <button type="button" onClick={() => navigate('/login?redirect=/self-nominate')}
                    style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '1.25rem', borderRadius: '12px', border: '1.5px solid #003366', background: '#EEF4FF', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: '#003366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogIn size={17} color="white" /></div>
                    <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#003366' }}>Login / Become a Member</p>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>We'll pre-fill your name, organisation and LinkedIn from your profile — no email verification needed.</p>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: '#003366', marginTop: 'auto' }}>Continue <ArrowRight size={13} /></span>
                </button>
                <button type="button" onClick={onContinueAsGuest}
                    style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '1.25rem', borderRadius: '12px', border: '1.5px solid #E2E8F0', background: '#FAFBFC', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserPlus size={17} color="#475569" /></div>
                    <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#1E293B' }}>Continue Without Logging In</p>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>Fill in your details yourself. You'll verify your email with a one-time code before submitting.</p>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginTop: 'auto' }}>Continue as guest <ArrowRight size={13} /></span>
                </button>
            </div>
        </div>
    );
};

// ─── Success screen ─────────────────────────────────────────────────────────────
const SuccessScreen = ({ nominee }) => {
    const [copied, setCopied] = useState(false);
    const shareUrl = `${window.location.origin}/nominees`;
    const caption = `I've just nominated myself for the "${nominee.category_name}" category at the ${nominee.award_name} — Risk AI Council! 🏆 Check it out and support the nomination: ${shareUrl}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(caption);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ minHeight: 'calc(100vh - 66px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#E8EEF7 0%,#DDE6F2 100%)', padding: '2rem 1rem', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', maxWidth: '520px', background: 'white', borderRadius: '20px', boxShadow: '0 24px 64px rgba(0,30,70,0.14)', padding: 'clamp(2rem,5vw,3rem) clamp(1.25rem,4vw,2.5rem)', textAlign: 'center' }}>
                <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#F0FDF4', border: '2.5px solid #86EFAC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <CheckCircle size={38} color="#16A34A" strokeWidth={2} />
                </div>
                <h2 style={{ margin: '0 0 0.5rem', fontSize: 'clamp(1.25rem,4vw,1.5rem)', fontWeight: 800, color: '#0F172A' }}>Nomination submitted!</h2>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.9rem', color: '#475569' }}>{nominee.category_name} · {nominee.award_name}</p>
                <p style={{ margin: '0 0 1.75rem', fontSize: '0.85rem', color: '#64748B', lineHeight: 1.65 }}>
                    Our team reviews every self-nomination before it goes live for public voting. You'll get an email once a decision is made.
                </p>

                <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '1.1rem 1.25rem', textAlign: 'left' }}>
                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>Share that you've nominated yourself</p>
                    <a href={linkedInUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '0.7rem', background: '#0A66C2', color: 'white', borderRadius: 10, fontWeight: 700, fontSize: '0.84rem', textDecoration: 'none', marginBottom: '0.75rem', boxSizing: 'border-box' }}>
                        <Linkedin size={16} /> Share on LinkedIn
                    </a>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', color: '#94A3B8' }}>LinkedIn only pulls in the link — paste this suggested caption into your post:</p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <textarea readOnly value={caption} rows={3}
                            style={{ flex: 1, resize: 'none', padding: '0.6rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.78rem', color: '#475569', fontFamily: 'inherit', background: 'white' }} />
                        <button onClick={handleCopy} type="button"
                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '0.5rem 0.75rem', background: copied ? '#F0FDF4' : '#F1F5F9', border: `1px solid ${copied ? '#86EFAC' : '#E2E8F0'}`, borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: copied ? '#16A34A' : '#475569', fontFamily: 'inherit' }}>
                            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>

                <Link to="/nominees" style={{ display: 'inline-block', marginTop: '1.75rem', color: '#003366', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
                    ← Back to Nominees
                </Link>
            </div>
        </div>
    );
};

// ─── Shared detail fields (award/category + profile-ish fields) ──────────────
const DetailFields = ({ form, handleChange, fieldErrors, awards, awardsLoading, categories, submitting, photoFile, setPhotoFile, showName }) => (
    <>
        <div style={gridRow}>
            <Field id="sn-award" label="Award" required error={fieldErrors.award_id}>
                <select id="sn-award" name="award_id" value={form.award_id} onChange={handleChange} disabled={awardsLoading}
                    style={inputStyle(fieldErrors.award_id, awardsLoading)}>
                    <option value="">Select an award…</option>
                    {awards.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </Field>
            <Field id="sn-category" label="Category" required error={fieldErrors.category_id}>
                <select id="sn-category" name="category_id" value={form.category_id} onChange={handleChange} disabled={!form.award_id}
                    style={inputStyle(fieldErrors.category_id, !form.award_id)}>
                    <option value="">Select a category…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </Field>
            {showName && (
                <Field id="sn-name" label="Full Name" required error={fieldErrors.name}>
                    <input id="sn-name" name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" disabled={submitting} style={inputStyle(fieldErrors.name, submitting)} />
                </Field>
            )}
        </div>

        <JuryPanel awardId={form.award_id} />

        <div style={gridRow}>
            <Field id="sn-designation" label="Designation" hint="e.g. Chief AI Risk Officer">
                <input id="sn-designation" name="designation" value={form.designation} onChange={handleChange} placeholder="Your title" disabled={submitting} style={inputStyle(false, submitting)} />
            </Field>
            <Field id="sn-company" label="Company / Organisation">
                <input id="sn-company" name="company" value={form.company} onChange={handleChange} placeholder="Acme Corp" disabled={submitting} style={inputStyle(false, submitting)} />
            </Field>
            <Field id="sn-linkedin" label="LinkedIn URL" error={fieldErrors.linkedin_url}>
                <input id="sn-linkedin" type="url" name="linkedin_url" value={form.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/in/…" disabled={submitting} style={inputStyle(fieldErrors.linkedin_url, submitting)} />
            </Field>
            <Field id="sn-phone" label="Phone" hint="Optional">
                <input id="sn-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 555 000 0000" disabled={submitting} style={inputStyle(false, submitting)} />
            </Field>
        </div>

        <div style={gridRow}>
            <Field id="sn-achievements" label="Key Achievements" hint="Separate with semicolons">
                <textarea id="sn-achievements" name="achievements" value={form.achievements} onChange={handleChange} rows={2} placeholder="Led AI governance rollout across 12 markets; Published 3 papers…" disabled={submitting} style={{ ...inputStyle(false, submitting), resize: 'vertical', fontFamily: 'inherit' }} />
            </Field>
            <Field id="sn-description" label="Why should you win?" hint="Bio / Description">
                <textarea id="sn-description" name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Tell us why you deserve this recognition…" disabled={submitting} style={{ ...inputStyle(false, submitting), resize: 'vertical', fontFamily: 'inherit' }} />
            </Field>
        </div>

        <Field id="sn-photo" label="Profile Photo" hint="Optional">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 0.9rem', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '9px', cursor: 'pointer', color: '#475569', fontSize: '0.82rem', fontWeight: '500', width: 'fit-content' }}>
                <Upload size={15} color="#64748B" />
                {photoFile ? <span style={{ color: '#0F172A', fontWeight: '600' }}>{photoFile.name}</span> : <span>Click to browse an image</span>}
                <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} style={{ display: 'none' }} disabled={submitting} />
            </label>
        </Field>
    </>
);

const ConsentBox = ({ checked, onChange, error, submitting }) => (
    <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#F8FAFC', padding: '0.85rem 1rem', borderRadius: '8px', border: `1px solid ${error ? '#FCA5A5' : '#E2E8F0'}` }}>
            <input type="checkbox" id="consent_to_terms" checked={checked} onChange={onChange} disabled={submitting}
                style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#003366', flexShrink: 0 }} />
            <label htmlFor="consent_to_terms" style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.55' }}>
                <span style={{ fontWeight: '600', color: '#1E293B' }}>I agree to the Nomination Terms & Conditions</span> and consent to my details being displayed publicly if approved. Read the{' '}
                <Link to="/nomination-terms" target="_blank" style={{ color: '#003366', fontWeight: 700 }}>full terms <ChevronRight size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /></Link>
            </label>
        </div>
        {error && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#DC2626', marginTop: '0.4rem' }}><AlertCircle size={11} />{error}</span>}
    </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
const SelfNominate = () => {
    const { user } = useAuth();
    const isMember = Boolean(user);

    const [accessChoice, setAccessChoice] = useState(null); // null | 'guest' — irrelevant once isMember
    const [formStep, setFormStep] = useState(1); // guest flow only: 1 = details, 2 = verify & submit

    const [awards, setAwards] = useState([]);
    const [awardsLoading, setAwardsLoading] = useState(true);

    const [form, setForm] = useState({
        award_id: '', category_id: '', name: '', designation: '', company: '',
        linkedin_url: '', achievements: '', description: '', consent_to_terms: false,
        phone: '', submitter_email: '',
    });
    const [photoFile, setPhotoFile] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submittedNominee, setSubmittedNominee] = useState(null);

    // Guest-only email OTP state
    const [otpPhase, setOtpPhase] = useState('idle'); // idle | sent | verified
    const [otp, setOtp] = useState('');
    const [otpBusy, setOtpBusy] = useState(false);
    const [recaptchaToken, setRecaptchaToken] = useState('');
    const recaptchaRef = useRef(null);

    useEffect(() => { document.title = 'Nominate Yourself | AI Risk Council'; }, []);

    useEffect(() => {
        if (isMember && user) {
            setForm((p) => ({
                ...p,
                name: user.name || '',
                company: user.organization_name || '',
                linkedin_url: user.linkedin_url || '',
            }));
        }
    }, [isMember, user]);

    useEffect(() => {
        getAwards().then((res) => setAwards(res.data?.data || [])).catch(() => {}).finally(() => setAwardsLoading(false));
    }, []);

    const selectedAward = useMemo(() => awards.find((a) => String(a.id) === String(form.award_id)), [awards, form.award_id]);
    const categories = selectedAward?.categories || [];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value, ...(name === 'award_id' ? { category_id: '' } : {}) }));
        setFieldErrors((p) => ({ ...p, [name]: '' }));
        setServerError('');
    };

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    const handleSendOtp = async () => {
        if (!validateEmail(form.submitter_email)) { setFieldErrors((p) => ({ ...p, submitter_email: 'Enter a valid email address.' })); return; }
        setOtpBusy(true); setServerError('');
        try {
            await sendNominationOtp(form.submitter_email.trim().toLowerCase());
            setOtpPhase('sent');
        } catch (err) { setServerError(getErrorMessage(err)); }
        finally { setOtpBusy(false); }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) { setFieldErrors((p) => ({ ...p, otp: 'Enter the 6-digit code.' })); return; }
        setOtpBusy(true); setServerError('');
        try {
            await verifyNominationOtp(form.submitter_email.trim().toLowerCase(), otp);
            setOtpPhase('verified');
            setFieldErrors((p) => ({ ...p, otp: '' }));
        } catch (err) { setServerError(getErrorMessage(err)); }
        finally { setOtpBusy(false); }
    };

    // Step 1 (guest) / only step (member): the nomination details themselves
    const validateDetails = () => {
        const e = {};
        if (!form.award_id) e.award_id = 'Please select an award.';
        if (!form.category_id) e.category_id = 'Please select a category.';
        if (!isMember && !form.name.trim()) e.name = 'Name is required.';
        return e;
    };

    const handleContinue = (e) => {
        e.preventDefault();
        const errors = validateDetails();
        if (Object.keys(errors).length) { setFieldErrors(errors); return; }
        setFieldErrors({}); setServerError(''); setFormStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Step 2 (guest) / member's single step: verification + consent
    const validateFinal = () => {
        const e = {};
        if (!isMember) {
            if (!validateEmail(form.submitter_email)) e.submitter_email = 'A valid email is required.';
            else if (otpPhase !== 'verified') e.submitter_email = 'Please verify your email address.';
            if (RECAPTCHA_SITE_KEY && !recaptchaToken) e.recaptcha = 'Please complete the reCAPTCHA verification.';
        }
        if (!form.consent_to_terms) e.consent_to_terms = 'You must agree to the Terms & Conditions.';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setServerError('');
        const errors = isMember ? { ...validateDetails(), ...validateFinal() } : validateFinal();
        if (Object.keys(errors).length) { setFieldErrors(errors); return; }
        setFieldErrors({}); setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('award_id', form.award_id);
            fd.append('category_id', form.category_id);
            fd.append('designation', form.designation);
            fd.append('company', form.company);
            fd.append('linkedin_url', form.linkedin_url);
            fd.append('achievements', form.achievements);
            fd.append('description', form.description);
            fd.append('consent_to_terms', 'true');
            if (!isMember) {
                fd.append('name', form.name);
                fd.append('submitter_email', form.submitter_email.trim().toLowerCase());
                fd.append('submitter_phone', form.phone);
                fd.append('recaptchaToken', recaptchaToken);
            } else if (form.phone) {
                fd.append('phone', form.phone);
            }
            if (photoFile) fd.append('photo', photoFile);

            const res = await submitSelfNomination(fd);
            setSubmittedNominee(res.data?.data);
        } catch (err) {
            setServerError(getErrorMessage(err));
            recaptchaRef.current?.reset();
            setRecaptchaToken('');
        } finally { setSubmitting(false); }
    };

    if (submittedNominee) return <SuccessScreen nominee={submittedNominee} />;

    const CONTAINER_WIDTH = '980px';
    const showGate = !isMember && accessChoice === null;

    return (
        <div style={{ background: '#F8FAFC', minHeight: 'calc(100vh - 66px)', padding: 'clamp(1.25rem,3vw,2rem) 1rem 3rem' }}>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
            <div style={{ maxWidth: CONTAINER_WIDTH, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#EFF6FF', borderRadius: 100, padding: '5px 14px', marginBottom: '0.85rem', color: '#0055A4', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        <Trophy size={13} /> Self-Nomination
                    </div>
                    <h1 style={{ margin: '0 0 0.5rem', fontSize: 'clamp(1.5rem,4vw,2rem)', fontWeight: 800, color: '#0F172A' }}>Nominate Yourself</h1>
                    <p style={{ margin: '0 auto', maxWidth: '560px', fontSize: '0.9rem', color: '#64748B', lineHeight: 1.6 }}>
                        {isMember
                            ? "We've pre-filled what we already know about you — just fill in the rest."
                            : showGate
                                ? 'Choose how you’d like to submit your nomination.'
                                : 'Fill in your details, then verify your email to submit.'}
                    </p>
                </div>

                {showGate ? (
                    <AccessGate onContinueAsGuest={() => setAccessChoice('guest')} />
                ) : (
                    <>
                        {serverError && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '1rem' }} role="alert">
                                <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                                <p style={{ margin: 0, fontSize: '0.84rem', color: '#DC2626', lineHeight: 1.5 }}>{serverError}</p>
                            </div>
                        )}

                        {/* ── Member: single-step form ── */}
                        {isMember && (
                            <form onSubmit={handleSubmit} noValidate style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: 'clamp(1.25rem,3vw,1.75rem)', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '0.7rem 1rem' }}>
                                    <ShieldCheck size={16} color="#16A34A" style={{ flexShrink: 0 }} />
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#166534' }}>Submitting as <strong>{user.name}</strong> ({user.email})</p>
                                </div>

                                <DetailFields form={form} handleChange={handleChange} fieldErrors={fieldErrors} awards={awards} awardsLoading={awardsLoading} categories={categories} submitting={submitting} photoFile={photoFile} setPhotoFile={setPhotoFile} showName={false} />

                                <ConsentBox checked={form.consent_to_terms} error={fieldErrors.consent_to_terms} submitting={submitting}
                                    onChange={(e) => { setForm((p) => ({ ...p, consent_to_terms: e.target.checked })); setFieldErrors((p) => ({ ...p, consent_to_terms: '' })); }} />

                                <button type="submit" disabled={submitting}
                                    style={{ width: '100%', padding: '0.85rem', background: submitting ? '#94A3B8' : 'linear-gradient(135deg,#003366,#005099)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : <><Award size={16} /> Submit Nomination</>}
                                </button>
                            </form>
                        )}

                        {/* ── Guest step 1: details ── */}
                        {!isMember && formStep === 1 && (
                            <form onSubmit={handleContinue} noValidate style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: 'clamp(1.25rem,3vw,1.75rem)', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#003366', color: 'white', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>Nomination Details</p>
                                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#94A3B8' }}>Step 1 of 2</span>
                                </div>

                                <DetailFields form={form} handleChange={handleChange} fieldErrors={fieldErrors} awards={awards} awardsLoading={awardsLoading} categories={categories} submitting={submitting} photoFile={photoFile} setPhotoFile={setPhotoFile} showName={true} />

                                <button type="submit"
                                    style={{ width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg,#003366,#005099)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    Continue to Verification <ArrowRight size={15} />
                                </button>
                            </form>
                        )}

                        {/* ── Guest step 2: terms + email verification + captcha ── */}
                        {!isMember && formStep === 2 && (
                            <form onSubmit={handleSubmit} noValidate style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: 'clamp(1.25rem,3vw,1.75rem)', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <button type="button" onClick={() => setFormStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '0.78rem', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
                                        <ChevronLeft size={14} /> Back
                                    </button>
                                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#003366', color: 'white', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}>2</span>
                                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>Verify &amp; Agree</p>
                                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#94A3B8' }}>Step 2 of 2</span>
                                </div>

                                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                                    <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={13} /> Verify Your Email</p>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <input type="email" name="submitter_email" value={form.submitter_email}
                                                onChange={(e) => { handleChange(e); if (otpPhase !== 'idle') setOtpPhase('idle'); }}
                                                placeholder="your.email@example.com" disabled={submitting || otpPhase === 'verified'}
                                                style={inputStyle(fieldErrors.submitter_email, submitting || otpPhase === 'verified')} />
                                        </div>
                                        {otpPhase === 'idle' && (
                                            <button type="button" onClick={handleSendOtp} disabled={otpBusy || !form.submitter_email}
                                                style={{ padding: '0.6rem 1rem', background: (otpBusy || !form.submitter_email) ? '#94A3B8' : '#003366', color: 'white', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: '0.8rem', cursor: (otpBusy || !form.submitter_email) ? 'not-allowed' : 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                                                {otpBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Send Code'}
                                            </button>
                                        )}
                                        {otpPhase === 'verified' && (
                                            <div style={{ height: '38px', display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}><CheckCircle size={22} color="#10B981" /></div>
                                        )}
                                    </div>
                                    {fieldErrors.submitter_email && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#DC2626' }}><AlertCircle size={11} />{fieldErrors.submitter_email}</span>}
                                    {otpPhase === 'sent' && (
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <input type="text" value={otp} onChange={(e) => { setOtp(e.target.value); setFieldErrors((p) => ({ ...p, otp: '' })); }} placeholder="6-digit code" maxLength={6} disabled={otpBusy} style={inputStyle(fieldErrors.otp, otpBusy)} />
                                                {fieldErrors.otp && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#DC2626', marginTop: '0.3rem' }}><AlertCircle size={11} />{fieldErrors.otp}</span>}
                                            </div>
                                            <button type="button" onClick={handleVerifyOtp} disabled={otpBusy || otp.length !== 6}
                                                style={{ padding: '0.6rem 1rem', background: (otpBusy || otp.length !== 6) ? '#94A3B8' : '#10B981', color: 'white', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: '0.8rem', cursor: (otpBusy || otp.length !== 6) ? 'not-allowed' : 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                                                Verify
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {RECAPTCHA_SITE_KEY && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY}
                                                onChange={(token) => { setRecaptchaToken(token || ''); setFieldErrors((p) => ({ ...p, recaptcha: '' })); }}
                                                onExpired={() => setRecaptchaToken('')} />
                                        </div>
                                        {fieldErrors.recaptcha && <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#DC2626', marginTop: '0.4rem' }}><AlertCircle size={11} />{fieldErrors.recaptcha}</span>}
                                    </div>
                                )}

                                <ConsentBox checked={form.consent_to_terms} error={fieldErrors.consent_to_terms} submitting={submitting}
                                    onChange={(e) => { setForm((p) => ({ ...p, consent_to_terms: e.target.checked })); setFieldErrors((p) => ({ ...p, consent_to_terms: '' })); }} />

                                <button type="submit" disabled={submitting}
                                    style={{ width: '100%', padding: '0.85rem', background: submitting ? '#94A3B8' : 'linear-gradient(135deg,#003366,#005099)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : <><Award size={16} /> Submit Nomination</>}
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SelfNominate;
