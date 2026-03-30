import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle, Loader2, Globe, Building } from 'lucide-react';

const INQUIRY_TYPES = ['Membership Inquiry', 'Assessment Request', 'Press / Media', 'Workshop Enquiry', 'Other'];

const OFFICES = [
    {
        region: 'USA',
        address: 'Kmicro — 3525 Hyland Ave Ste 265,\nCosta Mesa, CA 92626, United States',
    },
    {
        region: 'India',
        address: '902a Arcadia Mall, Gurugram Sector 49',
    },
    {
        region: 'Dubai',
        address: 'Dubai Internet City, Dubai, UAE',
    },
];

const inputBase = {
    width: '100%',
    padding: '0.72rem 1rem',
    border: '1.5px solid #E2E8F0',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-sans)',
    color: '#1E293B',
    background: '#FAFBFC',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
};

const FieldLabel = ({ children, required }) => (
    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>
        {children}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
    </label>
);

const Contact = () => {
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', organization: '', inquiry: 'Membership Inquiry', message: '' });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(p => ({ ...p, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.firstName.trim() || !form.email.trim() || !form.message.trim()) {
            setError('Please fill in all required fields.');
            return;
        }
        setSubmitting(true);
        try {
            // Simulate submission — replace with actual API call
            await new Promise(r => setTimeout(r, 1000));
            setSubmitted(true);
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const focusStyle = (e) => {
        e.target.style.borderColor = '#003366';
        e.target.style.boxShadow = '0 0 0 3px rgba(0,51,102,0.08)';
        e.target.style.background = '#fff';
    };
    const blurStyle = (e) => {
        e.target.style.borderColor = '#E2E8F0';
        e.target.style.boxShadow = 'none';
        e.target.style.background = '#FAFBFC';
    };

    return (
        <>
            <style>{`
                @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

                /* ── Hero ── */
                .ct-hero {
                    background: linear-gradient(135deg,#002244 0%,#003366 60%,#005599 100%);
                    padding: clamp(2.5rem,6vw,4rem) clamp(1rem,4vw,2rem);
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }

                /* ── Content grid ── */
                .ct-grid {
                    display: grid;
                    grid-template-columns: 1fr 420px;
                    gap: clamp(2rem,5vw,4rem);
                    max-width: 1100px;
                    margin: 0 auto;
                    padding: clamp(2.5rem,5vw,4rem) clamp(1rem,4vw,2rem);
                    align-items: start;
                }
                @media (max-width: 900px) {
                    .ct-grid { grid-template-columns: 1fr; }
                    .ct-info-panel { order: -1; }
                }

                /* ── Name row ── */
                .ct-name-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }
                @media (max-width: 480px) {
                    .ct-name-row { grid-template-columns: 1fr; }
                }

                /* ── Offices grid ── */
                .ct-offices {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }
            `}</style>

            {/* ── Hero ── */}
            <div className="ct-hero">
                <div style={{ position:'absolute', top:'-80px', right:'-80px', width:'300px', height:'300px', borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>
                <div style={{ position:'absolute', bottom:'-60px', left:'-60px', width:'240px', height:'240px', borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' }}/>
                <div style={{ maxWidth:'680px', margin:'0 auto', position:'relative', zIndex:1 }}>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.1)', borderRadius:100, padding:'5px 14px', marginBottom:'1.25rem', color:'#93C5FD', fontSize:'0.78rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                        <Globe size={13}/> Get in Touch
                    </div>
                    <h1 style={{ color:'white', fontSize:'clamp(1.75rem,4vw,2.75rem)', fontWeight:800, margin:'0 0 1rem', lineHeight:1.15 }}>Contact Us</h1>
                    <p style={{ color:'#CBD5E1', fontSize:'clamp(0.9rem,1.5vw,1.1rem)', lineHeight:1.7, margin:0 }}>
                        Get in touch with our team for membership inquiries, press/media, or general information.
                    </p>
                </div>
            </div>

            {/* ── Main content ── */}
            <div style={{ background:'#F8FAFC', minHeight:'60vh' }}>
                <div className="ct-grid">

                    {/* ── Left: Form ── */}
                    <div style={{ background:'white', borderRadius:20, border:'1px solid #E2E8F0', padding:'clamp(1.75rem,4vw,2.5rem)', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', animation:'fadeUp 0.4s ease both' }}>

                        {submitted ? (
                            /* Success state */
                            <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
                                <div style={{ width:72, height:72, borderRadius:'50%', background:'#F0FDF4', border:'2px solid #86EFAC', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}>
                                    <CheckCircle size={36} color="#16A34A"/>
                                </div>
                                <h2 style={{ margin:'0 0 0.75rem', fontSize:'clamp(1.25rem,3vw,1.6rem)', fontWeight:800, color:'#1E293B' }}>Message Sent!</h2>
                                <p style={{ color:'#64748B', fontSize:'0.95rem', lineHeight:1.7, margin:'0 0 2rem', maxWidth:'400px', marginLeft:'auto', marginRight:'auto' }}>
                                    Thank you for reaching out. Our team will get back to you within 1–2 business days.
                                </p>
                                <button onClick={() => { setSubmitted(false); setForm({ firstName:'', lastName:'', email:'', organization:'', inquiry:'Membership Inquiry', message:'' }); }}
                                    style={{ background:'#003366', color:'white', border:'none', padding:'0.75rem 2rem', borderRadius:10, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', fontFamily:'var(--font-sans)' }}>
                                    Send Another Message
                                </button>
                            </div>
                        ) : (
                            <>
                                <h2 style={{ margin:'0 0 0.35rem', fontSize:'clamp(1.1rem,2.5vw,1.4rem)', fontWeight:800, color:'#1E293B' }}>Send us a message</h2>
                                <p style={{ margin:'0 0 1.75rem', fontSize:'0.85rem', color:'#64748B' }}>We typically respond within 1–2 business days.</p>

                                {error && (
                                    <div style={{ display:'flex', alignItems:'center', gap:10, background:'#FEF2F2', border:'1.5px solid #FECACA', borderRadius:10, padding:'0.85rem 1rem', marginBottom:'1.25rem', color:'#DC2626', fontSize:'0.85rem' }}>
                                        <AlertCircle size={15} style={{ flexShrink:0 }}/>{error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} noValidate style={{ display:'flex', flexDirection:'column', gap:'1.1rem' }}>
                                    {/* Name row */}
                                    <div className="ct-name-row">
                                        <div>
                                            <FieldLabel required>First Name</FieldLabel>
                                            <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="Jane" disabled={submitting}
                                                style={inputBase} onFocus={focusStyle} onBlur={blurStyle}/>
                                        </div>
                                        <div>
                                            <FieldLabel>Last Name</FieldLabel>
                                            <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Smith" disabled={submitting}
                                                style={inputBase} onFocus={focusStyle} onBlur={blurStyle}/>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <FieldLabel required>Email Address</FieldLabel>
                                        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="name@company.com" disabled={submitting}
                                            style={inputBase} onFocus={focusStyle} onBlur={blurStyle}/>
                                    </div>

                                    {/* Organisation */}
                                    <div>
                                        <FieldLabel>Organisation</FieldLabel>
                                        <input name="organization" value={form.organization} onChange={handleChange} placeholder="Your company or institution" disabled={submitting}
                                            style={inputBase} onFocus={focusStyle} onBlur={blurStyle}/>
                                    </div>

                                    {/* Inquiry type */}
                                    <div>
                                        <FieldLabel>Inquiry Type</FieldLabel>
                                        <select name="inquiry" value={form.inquiry} onChange={handleChange} disabled={submitting}
                                            style={{ ...inputBase, cursor:'pointer' }} onFocus={focusStyle} onBlur={blurStyle}>
                                            {INQUIRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    {/* Message */}
                                    <div>
                                        <FieldLabel required>Message</FieldLabel>
                                        <textarea name="message" value={form.message} onChange={handleChange} rows={5} placeholder="Tell us how we can help you…" disabled={submitting}
                                            style={{ ...inputBase, resize:'vertical', minHeight:'120px' }} onFocus={focusStyle} onBlur={blurStyle}/>
                                    </div>

                                    <button type="submit" disabled={submitting}
                                        style={{ width:'100%', padding:'0.88rem', background:submitting?'#94A3B8':'linear-gradient(135deg,#003366,#005099)', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:'0.93rem', cursor:submitting?'not-allowed':'pointer', fontFamily:'var(--font-sans)', transition:'all 0.18s', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:submitting?'none':'0 4px 14px rgba(0,51,102,0.28)' }}
                                        onMouseOver={e => { if(!submitting) { e.currentTarget.style.background='linear-gradient(135deg,#00264d,#004080)'; e.currentTarget.style.transform='translateY(-1px)'; }}}
                                        onMouseOut={e => { if(!submitting) { e.currentTarget.style.background='linear-gradient(135deg,#003366,#005099)'; e.currentTarget.style.transform='translateY(0)'; }}}>
                                        {submitting
                                            ? <><Loader2 size={16} style={{ animation:'spin 1s linear infinite' }}/> Sending…</>
                                            : <><Send size={15}/> Send Message</>}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>

                    {/* ── Right: Contact info ── */}
                    <div className="ct-info-panel" style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

                        {/* Info card */}
                        <div style={{ background:'linear-gradient(160deg,#001529 0%,#003366 55%,#004d99 100%)', borderRadius:20, padding:'clamp(1.75rem,4vw,2.25rem)', position:'relative', overflow:'hidden', animation:'fadeUp 0.45s ease both' }}>
                            {/* Decorative circles */}
                            <div style={{ position:'absolute', top:'-40px', right:'-40px', width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }}/>
                            <div style={{ position:'absolute', bottom:'-30px', left:'-30px', width:140, height:140, borderRadius:'50%', background:'rgba(0,153,255,0.06)', pointerEvents:'none' }}/>

                            <div style={{ position:'relative', zIndex:1 }}>
                                <h3 style={{ color:'white', fontSize:'clamp(1rem,2vw,1.2rem)', fontWeight:800, margin:'0 0 0.4rem' }}>Contact Information</h3>
                                <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.82rem', margin:'0 0 1.75rem', lineHeight:1.6 }}>Reach us through any of the channels below.</p>

                                <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
                                    {/* Phone */}
                                    <div style={{ display:'flex', gap:'1rem', alignItems:'flex-start' }}>
                                        <div style={{ width:36, height:36, borderRadius:9, background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                            <Phone size={16} color="rgba(255,255,255,0.8)"/>
                                        </div>
                                        <div>
                                            <p style={{ margin:'0 0 3px', fontSize:'0.72rem', fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Phone</p>
                                            <a href="tel:+12125550199" style={{ color:'white', textDecoration:'none', fontSize:'0.9rem', fontWeight:600 }}>+1 (212) 555-0199</a>
                                            <p style={{ margin:'2px 0 0', color:'rgba(255,255,255,0.45)', fontSize:'0.78rem' }}>Mon–Fri, 9am–5pm EST</p>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div style={{ display:'flex', gap:'1rem', alignItems:'flex-start' }}>
                                        <div style={{ width:36, height:36, borderRadius:9, background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                            <Mail size={16} color="rgba(255,255,255,0.8)"/>
                                        </div>
                                        <div>
                                            <p style={{ margin:'0 0 3px', fontSize:'0.72rem', fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Email</p>
                                            <a href="mailto:contact@airiskcouncil.org" style={{ color:'white', textDecoration:'none', fontSize:'0.9rem', fontWeight:600, wordBreak:'break-all' }}>contact@airiskcouncil.org</a>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div style={{ height:1, background:'rgba(255,255,255,0.1)', margin:'1.75rem 0' }}/>

                                {/* Trust note */}
                                <p style={{ margin:0, fontSize:'0.72rem', color:'rgba(255,255,255,0.35)', lineHeight:1.7 }}>
                                    🔒&nbsp; Your message is private and never shared with third parties.
                                </p>
                            </div>
                        </div>

                        {/* Offices card */}
                        <div style={{ background:'white', borderRadius:20, border:'1px solid #E2E8F0', padding:'clamp(1.5rem,4vw,2rem)', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.25rem' }}>
                                <div style={{ width:36, height:36, borderRadius:9, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    <MapPin size={16} color="#003366"/>
                                </div>
                                <div>
                                    <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:800, color:'#1E293B' }}>Global Offices</h3>
                                    <p style={{ margin:0, fontSize:'0.75rem', color:'#94A3B8' }}>3 locations worldwide</p>
                                </div>
                            </div>

                            <div className="ct-offices">
                                {OFFICES.map(({ region, address }) => (
                                    <div key={region} style={{ display:'flex', gap:'0.875rem', alignItems:'flex-start', paddingBottom:'1.1rem', borderBottom:'1px solid #F1F5F9' }}
                                        onMouseOver={e => e.currentTarget.style.borderBottomColor='#BFDBFE'}
                                        onMouseOut={e => e.currentTarget.style.borderBottomColor='#F1F5F9'}>
                                        <div style={{ width:28, height:28, borderRadius:7, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                                            <Building size={13} color="#003366"/>
                                        </div>
                                        <div>
                                            <p style={{ margin:'0 0 3px', fontSize:'0.78rem', fontWeight:800, color:'#003366' }}>{region}</p>
                                            <p style={{ margin:0, fontSize:'0.8rem', color:'#64748B', lineHeight:1.6, whiteSpace:'pre-line' }}>{address}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};

export default Contact;