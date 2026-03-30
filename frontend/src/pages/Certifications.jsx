import React, { useState, useEffect, useRef } from 'react';
import {
    Award, Briefcase, Star, CheckCircle, Download, Loader2,
    Users, Clock, BookOpen, Shield, ArrowRight,
    BarChart2, Globe, Zap, FileText, Target, TrendingUp,
} from 'lucide-react';

const TIERS = [
    { key:'associate', icon:Award, label:'Associate', tagline:'Build the foundations of AI governance', accent:'#B45309', accentLight:'#FEF3C7', badge:'ENTRY LEVEL', cpd:'20 CPD Points', studyHours:40, maxHours:120, passRate:'78%', description:'The entry-level credential for professionals beginning their AI governance journey. Validates foundational knowledge mapped directly to the ARC AI Governance Framework — covering risk taxonomy, regulatory alignment, and governance principles used by 500+ member organisations.', targetAudience:'Risk analysts, compliance officers, IT professionals, and AI product managers with no prior formal AI governance training.', duration:'40 hours · Self-paced', outcome:"ARC Associate certificate, verifiable digital badge, LinkedIn credential, and access to ARC's member resource library.", modules:['Introduction to AI Risk & the ARC Governance Framework','Regulatory Foundations: EU AI Act, NIST AI RMF & ISO 42001','AI Risk Taxonomy & Classification (ARC Standard)','Ethics, Bias & Fairness in AI Systems','Building & Maintaining an AI System Inventory','Associate Assessment (60 MCQs)'], syllabusUrl:'#' },
    { key:'professional', icon:Briefcase, label:'Professional', tagline:'Lead and implement AI governance programmes', accent:'#003366', accentLight:'#EFF6FF', badge:'PRACTITIONER', cpd:'40 CPD Points', studyHours:80, maxHours:120, passRate:'71%', description:'The practitioner credential for professionals actively designing and managing AI governance programmes. Covers the full ARC framework in applied depth — from SR 11-7 aligned model risk management to EU AI Act compliance operations and ARC Governance Maturity Assessment.', targetAudience:'Risk managers, compliance leads, AI programme owners, and legal counsels with 2+ years of professional experience.', duration:'80 hours · Self-paced + 1 practical project', outcome:'ARC Professional certificate, 40 CPD points, practitioner directory listing, and access to editable ARC audit templates (T-01 to T-06).', modules:['Advanced Model Risk Management (SR 11-7 Aligned)','EU AI Act: High-Risk System Obligations & Compliance','AI Vendor Due Diligence & Third-Party Risk Management','Model Performance Monitoring: Drift, Bias & Explainability','AI Incident Response: Detection, Containment & Recovery','ARC Governance Maturity Assessment & Roadmapping','Professional Assessment (Case study + 80 MCQs)'], syllabusUrl:'#' },
    { key:'expert', icon:Star, label:'Expert', tagline:'Architect and lead enterprise AI governance', accent:'#065F46', accentLight:'#ECFDF5', badge:'SENIOR LEVEL', cpd:'60 CPD Points', studyHours:120, maxHours:120, passRate:'62%', description:'The advanced credential for senior leaders architecting enterprise-wide AI governance. Covers board reporting, Red Team exercises, agentic AI governance, and leading ARC-aligned transparency reporting — the defining activities of an Optimized governance organisation.', targetAudience:'Chief Risk Officers, CCOs, AI governance leads, heads of model risk, and senior partners at advisory firms.', duration:'120 hours + 2 practical projects + oral examination', outcome:'ARC Expert certificate, Fellow designation, speaking opportunities at ARC events, advisory panel eligibility, and co-authorship on ARC publications.', modules:['Enterprise AI Governance Architecture & Design','Board-Level AI Risk Reporting & ESG Integration','Global AI Regulatory Strategy: EU AI Act, UK AI Safety & US Executive Order','Red Team & Adversarial AI Exercise Leadership','Agentic & Generative AI: Governance Beyond the Model Card','AI Transparency Reporting & Annual Governance Audit Leadership','Expert Assessment (Portfolio + Oral Examination)'], syllabusUrl:'#' },
];

const PROCESS_STEPS = [
    { icon:BookOpen, title:'Enrol & Study',      desc:'Access self-paced materials, video lectures, and practice assessments on the ARC learning platform.' },
    { icon:FileText, title:'Complete Modules',   desc:'Work through structured modules at your own pace. Each module includes quizzes and case studies.' },
    { icon:Target,   title:'Take Assessment',    desc:'Sit proctored online assessments. Professional and Expert levels include practical project submissions.' },
    { icon:Award,    title:'Get Certified',      desc:'Receive your digital certificate, badge, and LinkedIn verification upon successful completion.' },
];

const COMPARE_ROWS = [
    { label:'Study Hours',       associate:'40 hrs',   professional:'80 hrs',               expert:'120 hrs' },
    { label:'Format',            associate:'Self-paced',professional:'Self-paced + project', expert:'Self-paced + 2 projects + oral' },
    { label:'Assessment',        associate:'60 MCQs',  professional:'Case study + 80 MCQs',  expert:'Portfolio + Oral exam' },
    { label:'Pass Rate',         associate:'78%',      professional:'71%',                   expert:'62%' },
    { label:'CPD Points',        associate:'20 pts',   professional:'40 pts',                expert:'60 pts' },
    { label:'Member Discount',   associate:'20%',      professional:'20%',                   expert:'20%' },
    { label:'LinkedIn Badge',    associate:'✓',        professional:'✓',                     expert:'✓' },
    { label:'Directory Listing', associate:'—',        professional:'✓',                     expert:'✓ + Fellow' },
];

const StatBadge = ({ icon: Icon, value, label }) => (
    <div style={{ textAlign:'center' }}>
        <Icon size={20} color="rgba(255,255,255,0.6)" style={{ margin:'0 auto 4px', display:'block' }}/>
        <div style={{ fontSize:'clamp(1.1rem,2.5vw,1.5rem)', fontWeight:'900', color:'white', lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.45)', marginTop:'2px', letterSpacing:'0.04em' }}>{label}</div>
    </div>
);

const ProgressBar = ({ value, max, accent }) => {
    const pct = Math.round((value/max)*100);
    const [width, setWidth] = useState(0);
    useEffect(() => { const t=setTimeout(() => setWidth(pct),250); return () => clearTimeout(t); }, [pct]);
    return (
        <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                <span style={{ fontSize:'0.7rem', color:'#64748B', fontWeight:'600' }}>Study Load</span>
                <span style={{ fontSize:'0.7rem', fontWeight:'800', color:accent }}>{value}h / {max}h max</span>
            </div>
            <div style={{ height:'5px', background:'#E2E8F0', borderRadius:'3px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${width}%`, background:accent, borderRadius:'3px', transition:'width 0.9s cubic-bezier(0.34,1.1,0.64,1)' }}/>
            </div>
        </div>
    );
};

const TierCard = ({ tier, isActive, onClick }) => {
    const [downloading, setDownloading] = useState(false);
    const { icon: Icon } = tier;

    const handleDownload = async (e) => {
        e.stopPropagation();
        setDownloading(true);
        await new Promise(r => setTimeout(r,800));
        window.open(tier.syllabusUrl,'_blank','noopener,noreferrer');
        setDownloading(false);
    };

    return (
        <div onClick={onClick} style={{ background:'white', borderRadius:'20px', border:`2px solid ${isActive?tier.accent:'#E2E8F0'}`, boxShadow:isActive?`0 16px 48px ${tier.accent}1f`:'0 2px 10px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column', transition:'all 0.3s ease', cursor:'pointer', transform:isActive?'translateY(-8px)':'translateY(0)', overflow:'hidden', position:'relative' }}
            onMouseOver={e => { if(!isActive){e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,0.1)';e.currentTarget.style.transform='translateY(-3px)';}}}
            onMouseOut={e => { if(!isActive){e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.05)';e.currentTarget.style.transform='translateY(0)';}}}
        >
            {tier.key==='professional' && <div style={{ position:'absolute', top:'18px', right:'18px', background:'#003366', color:'white', fontSize:'0.6rem', fontWeight:'800', padding:'3px 10px', borderRadius:'100px', letterSpacing:'0.08em' }}>MOST POPULAR</div>}
            <div style={{ padding:'clamp(1.25rem,2.5vw,28px) clamp(1.25rem,2.5vw,28px) 20px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'14px', marginBottom:'18px' }}>
                    <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:tier.accentLight, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon size={26} color={tier.accent}/></div>
                    <div>
                        <div style={{ fontSize:'0.62rem', fontWeight:'800', color:tier.accent, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'3px' }}>{tier.badge}</div>
                        <h3 style={{ fontSize:'clamp(1rem,2vw,1.2rem)', fontWeight:'800', color:'#1E293B', margin:0 }}>{tier.label}</h3>
                        <p style={{ fontSize:'0.76rem', color:'#64748B', margin:'3px 0 0' }}>{tier.tagline}</p>
                    </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'8px' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:tier.accentLight, color:tier.accent, fontSize:'0.72rem', fontWeight:'800', padding:'5px 12px', borderRadius:'100px', letterSpacing:'0.04em' }}>
                        <Shield size={11}/>{tier.cpd} · CPD Accredited
                    </span>
                    <a href="/membership" style={{ fontSize:'0.75rem', fontWeight:'700', color:tier.accent, textDecoration:'none', borderBottom:`1px dashed ${tier.accent}` }}>View Pricing →</a>
                </div>
                <div style={{ marginBottom:'20px' }}><ProgressBar value={tier.studyHours} max={tier.maxHours} accent={tier.accent}/></div>
                <p style={{ fontSize:'0.82rem', color:'#4A5568', lineHeight:'1.65', marginBottom:'18px' }}>{tier.description}</p>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'20px' }}>
                    {[{icon:Clock,text:tier.duration},{icon:TrendingUp,text:`${tier.passRate} pass rate`}].map(({icon:MIcon,text}) => (
                        <span key={text} style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:tier.accentLight, color:tier.accent, fontSize:'0.68rem', fontWeight:'700', padding:'4px 10px', borderRadius:'100px' }}><MIcon size={11}/>{text}</span>
                    ))}
                </div>
                <div style={{ marginBottom:'8px' }}>
                    <p style={{ fontSize:'0.62rem', fontWeight:'800', color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'10px' }}>Programme Modules</p>
                    <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:'8px' }}>
                        {tier.modules.map(mod => (
                            <li key={mod} style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'0.81rem', color:'#374151', lineHeight:1.45 }}>
                                <CheckCircle size={13} color={tier.accent} style={{ flexShrink:0, marginTop:'2px' }}/>{mod}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div style={{ padding:`0 clamp(1.25rem,2.5vw,28px) clamp(1.25rem,2.5vw,28px)`, marginTop:'auto' }}>
                <div style={{ borderTop:'1px solid #F1F5F9', paddingTop:'20px' }}>
                    <p style={{ fontSize:'0.73rem', color:'#64748B', marginBottom:'12px', lineHeight:1.5 }}><strong style={{ color:'#1E293B' }}>Outcome: </strong>{tier.outcome}</p>
                    <a href="/membership" style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'7px', background:tier.accent, color:'white', border:`2px solid ${tier.accent}`, padding:'11px 16px', borderRadius:'10px', fontWeight:'700', fontSize:'0.82rem', textDecoration:'none', transition:'all 0.2s', marginBottom:'8px', boxSizing:'border-box' }}
                        onMouseOver={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=tier.accent; }}
                        onMouseOut={e => { e.currentTarget.style.background=tier.accent; e.currentTarget.style.color='white'; }}>
                        <ArrowRight size={14}/>Get Certified
                    </a>
                    <button onClick={handleDownload} disabled={downloading} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'7px', background:'white', color:tier.accent, border:`2px solid ${tier.accent}`, padding:'11px 16px', borderRadius:'10px', fontWeight:'700', fontSize:'0.82rem', cursor:downloading?'not-allowed':'pointer', opacity:downloading?0.7:1, transition:'all 0.2s', fontFamily:'inherit' }}
                        onMouseOver={e => { if(!downloading){e.currentTarget.style.background=tier.accent;e.currentTarget.style.color='white';}}}
                        onMouseOut={e => { if(!downloading){e.currentTarget.style.background='white';e.currentTarget.style.color=tier.accent;}}}>
                        {downloading?<><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/>Opening Syllabus…</>:<><Download size={14}/>Download Syllabus</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Certifications = () => {
    const [activeIdx, setActiveIdx] = useState(1);
    useEffect(() => { document.title = 'Certifications | AI Risk Council'; }, []);

    return (
        <>
            <style>{`
                @keyframes spin { to{transform:rotate(360deg)} }

                /* ── Tier tabs ── */
                .cert-tabs {
                    display: flex;
                    justify-content: center;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                }
                .cert-tabs::-webkit-scrollbar { display: none; }

                /* ── Cards grid ── */
                .cert-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(min(300px,100%), 1fr));
                    gap: 24px;
                    align-items: start;
                }

                /* ── Process steps ── */
                .cert-process-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(min(200px,100%), 1fr));
                    gap: 2px;
                }

                /* ── Comparison table ── */
                .cert-compare-table { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                .cert-compare-inner { min-width: 480px; }

                /* ── Stats row ── */
                .cert-stats {
                    display: flex;
                    justify-content: center;
                    gap: clamp(1.5rem,4vw,3rem);
                    flex-wrap: wrap;
                }

                /* ── CTA buttons ── */
                .cert-cta-btns {
                    display: flex;
                    justify-content: center;
                    gap: 12px;
                    flex-wrap: wrap;
                }
            `}</style>

            {/* ── Hero ── */}
            <div style={{ background:'linear-gradient(135deg,#000e22 0%,#001e4a 40%,#002d66 70%,#001429 100%)', padding:'clamp(2rem,5vw,2.5rem) clamp(1rem,4vw,2rem)', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.08) 1px,transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }}/>
                <div style={{ position:'absolute', top:'-80px', right:'-60px', width:'420px', height:'420px', borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 65%)', pointerEvents:'none' }}/>
                <div style={{ maxWidth:'860px', margin:'0 auto', textAlign:'center', position:'relative', zIndex:1 }}>
                    <span style={{ display:'inline-block', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.85)', fontSize:'0.68rem', fontWeight:'700', letterSpacing:'0.12em', textTransform:'uppercase', padding:'5px 16px', borderRadius:'100px', marginBottom:'1.25rem' }}>
                        Globally Recognised
                    </span>
                    <h1 style={{ fontSize:'clamp(1.75rem,5vw,3rem)', fontWeight:'900', color:'white', margin:'0 0 1rem', lineHeight:1.15, letterSpacing:'-0.03em' }}>AI Governance Certifications</h1>
                    <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'clamp(0.875rem,1.5vw,1rem)', lineHeight:'1.8', maxWidth:'580px', margin:'0 auto 3rem' }}>
                        Demonstrate your commitment to responsible AI with internationally recognised credentials — from foundational awareness to expert-level governance architecture.
                    </p>
                    <div className="cert-stats">
                        {[{icon:Users,value:'250+',label:'Certified professionals'},{icon:Globe,value:'3+',label:'Countries represented'},{icon:Shield,value:'3',label:'Certification levels'},{icon:BarChart2,value:'100%',label:'Average pass rate'}].map(s => <StatBadge key={s.label} {...s}/>)}
                    </div>
                </div>
            </div>

            {/* ── Tier tabs ── */}
            <div style={{ background:'white', borderBottom:'1px solid #E8EDF3', padding:'0 clamp(1rem,3vw,2rem)', position:'sticky', top:0, zIndex:10, boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ maxWidth:'900px', margin:'0 auto' }}>
                    <div className="cert-tabs">
                        {TIERS.map((tier,i) => {
                            const Icon = tier.icon;
                            const active = i === activeIdx;
                            return (
                                <button key={tier.key} onClick={() => setActiveIdx(i)}
                                    style={{ display:'flex', alignItems:'center', gap:'8px', padding:'clamp(12px,2vw,18px) clamp(16px,2.5vw,28px)', background:'transparent', border:'none', borderBottom:`3px solid ${active?tier.accent:'transparent'}`, color:active?tier.accent:'#64748B', fontWeight:active?'800':'600', fontSize:'clamp(0.78rem,1.5vw,0.88rem)', cursor:'pointer', transition:'all 0.2s', fontFamily:'inherit', whiteSpace:'nowrap' }}
                                    onMouseOver={e => { if(!active) e.currentTarget.style.color='#1E293B'; }}
                                    onMouseOut={e => { if(!active) e.currentTarget.style.color='#64748B'; }}>
                                    <Icon size={15}/>{tier.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Cards ── */}
            <div style={{ background:'#F8FAFC', padding:'clamp(1.5rem,4vw,2rem) clamp(1rem,4vw,2rem)', borderBottom:'1px solid #E8EDF3' }}>
                <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
                    <div style={{ textAlign:'center', marginBottom:'3.5rem' }}>
                        <span style={{ display:'inline-block', background:'#EFF6FF', color:'#003366', fontSize:'0.68rem', fontWeight:'700', letterSpacing:'0.1em', textTransform:'uppercase', padding:'4px 14px', borderRadius:'100px', marginBottom:'0.75rem' }}>Three Levels</span>
                        <h2 style={{ fontSize:'clamp(1.4rem,3vw,2.2rem)', fontWeight:'800', color:'#1E293B', margin:'0 0 1rem', letterSpacing:'-0.02em' }}>Choose Your Certification Path</h2>
                        <div style={{
                            width: '100%',
                            background: '#003366',
                            color: 'white',
                            fontSize: 'clamp(0.85rem,2vw,1rem)',
                            fontWeight: '800',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            padding: 'clamp(10px,2vw,14px)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 16px rgba(0,51,102,0.25), 0 2px 4px rgba(0,51,102,0.15)',
                            border: '2px solid #004080',
                            marginTop: '1.5rem',
                            textAlign: 'center'
                        }}>
                             LAUNCHING SHORTLY
                        </div>
                    </div>
                    <div className="cert-cards-grid">
                        {TIERS.map((tier,i) => <TierCard key={tier.key} tier={tier} isActive={i===activeIdx} onClick={() => setActiveIdx(i)}/>)}
                    </div>
                </div>
            </div>

            {/* ── How it works ── */}
            <div style={{ background:'white', padding:'clamp(1.5rem,3vw,2.5rem) clamp(1rem,4vw,2rem)', borderBottom:'1px solid #E8EDF3' }}>
                <div style={{ maxWidth:'960px', margin:'0 auto' }}>
                    <div style={{ textAlign:'center', marginBottom:'3.5rem' }}>
                        <span style={{ display:'inline-block', background:'#EFF6FF', color:'#003366', fontSize:'0.68rem', fontWeight:'700', letterSpacing:'0.1em', textTransform:'uppercase', padding:'4px 14px', borderRadius:'100px', marginBottom:'0.75rem' }}>Process</span>
                        <h2 style={{ fontSize:'clamp(1.3rem,3vw,2rem)', fontWeight:'800', color:'#1E293B', margin:0, letterSpacing:'-0.02em' }}>How to Get Certified</h2>
                    </div>
                    <div className="cert-process-grid">
                        {PROCESS_STEPS.map((step,i) => {
                            const Icon = step.icon;
                            return (
                                <div key={step.title} style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'clamp(1.5rem,3vw,2.5rem) clamp(1rem,2vw,1.5rem)' }}>
                                    <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'#EFF6FF', border:'2px solid #BFDBFE', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1.25rem', position:'relative' }}>
                                        <Icon size={26} color="#003366"/>
                                        <span style={{ position:'absolute', top:'-6px', right:'-6px', width:'22px', height:'22px', borderRadius:'50%', background:'#003366', color:'white', fontSize:'0.68rem', fontWeight:'900', display:'flex', alignItems:'center', justifyContent:'center' }}>{i+1}</span>
                                    </div>
                                    <h3 style={{ fontSize:'0.95rem', fontWeight:'800', color:'#1E293B', marginBottom:'6px' }}>{step.title}</h3>
                                    <p style={{ fontSize:'0.81rem', color:'#64748B', lineHeight:'1.6', margin:0 }}>{step.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Comparison table ── */}
            <div style={{ background:'#F8FAFC', padding:'clamp(1.5rem,3vw,2.5rem) clamp(1rem,4vw,2rem)', borderBottom:'1px solid #E8EDF3' }}>
                <div style={{ maxWidth:'860px', margin:'0 auto' }}>
                    <div style={{ textAlign:'center', marginBottom:'3rem' }}>
                        <span style={{ display:'inline-block', background:'#EFF6FF', color:'#003366', fontSize:'0.68rem', fontWeight:'700', letterSpacing:'0.1em', textTransform:'uppercase', padding:'4px 14px', borderRadius:'100px', marginBottom:'0.75rem' }}>Compare</span>
                        <h2 style={{ fontSize:'clamp(1.3rem,3vw,2rem)', fontWeight:'800', color:'#1E293B', margin:0, letterSpacing:'-0.02em' }}>Level Comparison</h2>
                    </div>
                    <div className="cert-compare-table">
                        <div className="cert-compare-inner" style={{ background:'white', borderRadius:'20px', border:'1px solid #E2E8F0', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,51,102,0.07)' }}>
                            <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 1fr', background:'#003366' }}>
                                {['','Associate','Professional','Expert'].map((h,i) => <div key={`h-${i}`} style={{ padding:'14px 20px', fontSize:'0.76rem', fontWeight:'800', color:i===0?'rgba(255,255,255,0.4)':'white', letterSpacing:'0.05em', textTransform:i===0?'none':'uppercase', textAlign:i===0?'left':'center' }}>{h}</div>)}
                            </div>
                            {COMPARE_ROWS.map((row,ri) => (
                                <div key={row.label} style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 1fr', background:ri%2===0?'white':'#F8FAFC', borderBottom:ri<COMPARE_ROWS.length-1?'1px solid #F1F5F9':'none' }}>
                                    <div style={{ padding:'13px 20px', fontSize:'0.81rem', fontWeight:'600', color:'#374151' }}>{row.label}</div>
                                    {[row.associate,row.professional,row.expert].map((val,ci) => <div key={`r${ri}c${ci}`} style={{ padding:'13px 20px', fontSize:'0.81rem', color:val==='✓'?'#16A34A':val==='—'?'#CBD5E1':'#4A5568', textAlign:'center', fontWeight:val==='✓'||val==='—'?'800':'500' }}>{val}</div>)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── CTA ── */}
            <div style={{ background:'linear-gradient(135deg,#001a33 0%,#003366 100%)', padding:'clamp(2.5rem,5vw,3rem) clamp(1rem,4vw,2rem)', textAlign:'center', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.05) 1px,transparent 1px)', backgroundSize:'28px 28px', pointerEvents:'none' }}/>
                <div style={{ maxWidth:'580px', margin:'0 auto', position:'relative', zIndex:1 }}>
                    <div style={{ width:'60px', height:'60px', borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}><Zap size={26} color="#FCD34D"/></div>
                    <h2 style={{ fontSize:'clamp(1.4rem,3vw,2.2rem)', fontWeight:'900', color:'white', margin:'0 0 1rem', letterSpacing:'-0.02em' }}>Ready to Get Certified?</h2>
                    <p style={{ color:'rgba(255,255,255,0.55)', lineHeight:'1.8', marginBottom:'2.5rem', fontSize:'clamp(0.875rem,1.5vw,0.97rem)' }}>
                        Council members receive 20% off certification fees, priority exam cohort access, and dedicated study resources. Join over 2,400 certified AI governance professionals worldwide.
                    </p>
                    <div className="cert-cta-btns">
                        <a href="/membership" style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'white', color:'#003366', padding:'13px 28px', borderRadius:'8px', fontWeight:'800', fontSize:'0.9rem', textDecoration:'none', boxShadow:'0 4px 16px rgba(0,0,0,0.2)', transition:'all 0.2s', whiteSpace:'nowrap' }}
                            onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.background='#F8FAFC'; }}
                            onMouseOut={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.background='white'; }}>
                            Join the Council <ArrowRight size={15}/>
                        </a>
                        <a href="#" style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'transparent', color:'white', padding:'13px 28px', borderRadius:'8px', fontWeight:'700', fontSize:'0.9rem', textDecoration:'none', border:'1px solid rgba(255,255,255,0.3)', transition:'all 0.2s', whiteSpace:'nowrap' }}
                            onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
                            onMouseOut={e => e.currentTarget.style.background='transparent'}>
                            <BookOpen size={15}/>View all syllabuses
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Certifications;