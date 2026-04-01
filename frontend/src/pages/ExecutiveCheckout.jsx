import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { applyExecutive } from '../api/membership.js';

const INPUT_CLS =
    'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ' +
    'placeholder-gray-400 bg-white';

const LABEL_CLS = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1';

export default function ExecutiveCheckout() {
    const { user } = useAuth();
    const navigate  = useNavigate();

    const [form, setForm] = useState({
        organization_name: user?.organization_name || '',
        job_title:         '',
        linkedin_url:      user?.linkedin_url || '',
        phone:             '',
    });
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState('');
    const [success,  setSuccess]  = useState(false);

    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await applyExecutive({
                organization_name: form.organization_name,
                job_title:         form.job_title,
                linkedin_url:      form.linkedin_url,
                phone:             form.phone,
            });
            setSuccess(true);
        } catch (err) {
            const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // ── Success screen ────────────────────────────────────────────────────────
    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
                <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 sm:p-10 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Application Submitted!</h2>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                        Your Executive Membership application is now under review.
                        You will receive an email once an admin approves or rejects your application.
                        Your Professional membership remains fully active in the meantime.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-left">
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">What's next?</p>
                        <ul className="text-sm text-amber-800 space-y-1">
                            <li>• Admin reviews your application (usually within 24–48 h)</li>
                            <li>• You'll get an email notification with the decision</li>
                            <li>• Once approved, your role upgrades instantly</li>
                        </ul>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-arc-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-arc-primary-dark transition"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // ── Checkout screen ───────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">

                {/* Page header */}
                <div className="mb-8 text-center">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Upgrade Your Membership</p>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Executive Membership</h1>
                    <p className="text-gray-500 text-sm mt-2">3-year membership · Pending admin approval</p>
                </div>

                {/* Responsive layout: stacks on mobile, side-by-side on lg */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                    {/* ── Left: form ── */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                            <h2 className="text-base font-bold text-gray-800 mb-6">Confirm Your Details</h2>

                            {/* Read-only account info — 2-col on sm+, 1-col on xs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className={LABEL_CLS}>Full Name</label>
                                    <input className={`${INPUT_CLS} bg-gray-50 cursor-not-allowed`} value={user?.name || ''} readOnly tabIndex={-1} />
                                </div>
                                <div>
                                    <label className={LABEL_CLS}>Email Address</label>
                                    <input className={`${INPUT_CLS} bg-gray-50 cursor-not-allowed`} value={user?.email || ''} readOnly tabIndex={-1} />
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} noValidate>
                                {/* Editable fields — 2-col on sm+, 1-col on xs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className={LABEL_CLS} htmlFor="organization_name">Organisation</label>
                                        <input id="organization_name" name="organization_name" className={INPUT_CLS} placeholder="Acme Corp" value={form.organization_name} onChange={handleChange} />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLS} htmlFor="job_title">Job Title</label>
                                        <input id="job_title" name="job_title" className={INPUT_CLS} placeholder="Chief AI Officer" value={form.job_title} onChange={handleChange} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className={LABEL_CLS} htmlFor="linkedin_url">LinkedIn URL</label>
                                        <input id="linkedin_url" name="linkedin_url" type="url" className={INPUT_CLS} placeholder="https://linkedin.com/in/..." value={form.linkedin_url} onChange={handleChange} />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLS} htmlFor="phone">Phone Number</label>
                                        <input id="phone" name="phone" type="tel" className={INPUT_CLS} placeholder="+1 (555) 000-0000" value={form.phone} onChange={handleChange} />
                                    </div>
                                </div>

                                {error && (
                                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-arc-primary text-white py-3.5 rounded-xl font-bold text-sm
                                               hover:bg-arc-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Submitting Application…' : 'Submit Application — $0.00'}
                                </button>
                                <p className="text-xs text-center text-gray-400 mt-3">
                                    No payment required today. Your application goes to admin review.
                                </p>
                            </form>
                        </div>
                    </div>

                    {/* ── Right: order summary ── */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 lg:sticky lg:top-6">
                            <h2 className="text-base font-bold text-gray-800 mb-5">Order Summary</h2>

                            <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-gray-100">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Executive Membership</p>
                                    <p className="text-xs text-gray-500 mt-0.5">3-year term · Risk AI Council (RAC)</p>
                                </div>
                                <p className="text-sm font-semibold text-gray-500 line-through whitespace-nowrap">$299 / qtr</p>
                            </div>

                            <div className="flex items-center justify-between gap-2 mb-1 text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="text-gray-500 line-through">$299.00</span>
                            </div>

                            <div className="flex items-center justify-between gap-2 mb-4 text-sm">
                                <span className="flex items-center gap-1.5 text-green-700 font-medium">
                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">FOUNDING-LAUNCH</span>
                                    100% off
                                </span>
                                <span className="text-green-700 font-semibold">− $299.00</span>
                            </div>

                            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 mb-6">
                                <span className="text-sm font-bold text-gray-900">Total Today</span>
                                <span className="text-2xl font-extrabold text-green-600">$0.00</span>
                            </div>

                            <div className="space-y-2 text-xs text-gray-500">
                                {[
                                    'No credit card required',
                                    '3-year Executive access on approval',
                                    'Professional membership stays active during review',
                                ].map((txt) => (
                                    <div key={txt} className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>{txt}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}