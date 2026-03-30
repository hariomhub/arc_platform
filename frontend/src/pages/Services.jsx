import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, ArrowRight, CheckCircle, Award, BookOpen, Globe } from 'lucide-react';

const WHY_ITEMS = [
    { icon: Award,       title: 'Independent Reviews',   desc: 'Our product assessments are unbiased and written by vetted industry practitioners, not vendors.' },
    { icon: BookOpen,    title: 'Self-Service Playbooks', desc: 'We provide ready-to-use governance templates and guides. No expensive consultants needed.' },
    { icon: Users,       title: 'Expert Network',        desc: 'Access to a global council of 500+ AI risk professionals across 40 countries.' },
    { icon: ShieldCheck, title: 'Framework Aligned',     desc: 'All our resources are mapped to EU AI Act, NIST AI RMF, ISO 42001, and sector-specific requirements.' },
];

const Services = () => {
    const navigate = useNavigate();
    useEffect(() => { document.title = 'Services | AI Risk Council'; }, []);

    return (
        <>
            <style>{`
                /* ── Hero ── */
                .svc-hero {
                    background: linear-gradient(135deg,#002244 0%,#003366 60%,#005599 100%);
                    padding: clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,2rem);
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }

                /* ── Service cards grid ── */
                .svc-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(min(440px,100%), 1fr));
                    gap: 2rem;
                }

                /* ── Why grid ── */
                .svc-why-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(min(230px,100%), 1fr));
                    gap: 1.75rem;
                }

                /* ── CTA buttons row ── */
                .svc-cta-btns {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    flex-wrap: wrap;
                }

                /* Service card hover */
                .svc-card {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #E2E8F0;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
                    overflow: hidden;
                    transition: box-shadow 0.2s, transform 0.2s;
                    display: flex;
                    flex-direction: column;
                }
                .svc-card:hover {
                    transform: translateY(-4px);
                }
                .svc-card-blue:hover  { box-shadow: 0 12px 32px rgba(0,51,102,0.12); }
                .svc-card-purple:hover { box-shadow: 0 12px 32px rgba(124,58,237,0.12); }

                /* Why card hover */
                .svc-why-card {
                    background: #F8FAFC;
                    border-radius: 12px;
                    padding: 2rem;
                    border: 1px solid #E2E8F0;
                    transition: box-shadow 0.2s, transform 0.2s;
                }
                .svc-why-card:hover {
                    box-shadow: 0 8px 24px rgba(0,51,102,0.08);
                    transform: translateY(-3px);
                }

                /* Responsive: stack hero text on mobile */
                @media (max-width: 600px) {
                    .svc-hero h1 { font-size: clamp(1.5rem,6vw,2.75rem) !important; }
                    .svc-hero p  { font-size: 0.95rem !important; }
                }
            `}</style>

            {/* ── Hero ── */}
            <div className="svc-hero">
                <div style={{ position:'absolute', top:'-100px', right:'-100px', width:'400px', height:'400px', borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' }}/>
                <div style={{ position:'absolute', bottom:'-80px', left:'-80px', width:'320px', height:'320px', borderRadius:'50%', background:'rgba(255,255,255,0.02)', pointerEvents:'none' }}/>
                <div style={{ maxWidth:'750px', margin:'0 auto', position:'relative', zIndex:1 }}>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.1)', borderRadius:'999px', padding:'0.4rem 1rem', marginBottom:'1.5rem', color:'#93C5FD', fontSize:'0.85rem', fontWeight:'600' }}>
                        <Globe size={14}/> Professional Services
                    </div>
                    <h1 className="svc-hero h1" style={{ color:'white', fontSize:'clamp(1.75rem,4vw,2.75rem)', fontWeight:'800', marginBottom:'1.25rem', lineHeight:'1.15', fontFamily:'var(--font-serif)' }}>
                        AI Governance, Tested &amp; Trusted
                    </h1>
                    <p style={{ fontSize:'clamp(0.95rem,1.5vw,1.15rem)', color:'#CBD5E1', lineHeight:'1.7', margin:0 }}>
                        Independent AI product reviews and expert-led workshops designed to accelerate your governance programme — trusted by 500+ organisations globally.
                    </p>
                </div>
            </div>

            {/* ── Two Service Cards ── */}
            <div style={{ background:'#F8FAFC', padding:'clamp(1.5rem,2.5vw,2rem) clamp(1rem,4vw,2rem)' }}>
                <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
                    <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
                        <h2 style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:'800', color:'#1A202C', marginBottom:'0.5rem' }}>What We Offer</h2>
                        <p style={{ color:'#64748B', fontSize:'clamp(0.9rem,1.5vw,1.05rem)', maxWidth:'560px', margin:'0 auto' }}>
                            Two flagship service lines built for modern AI risk teams.
                        </p>
                    </div>

                    <div className="svc-cards-grid">
                        {/* Card 1 */}
                        <div className="svc-card svc-card-blue">
                            <div style={{ height:'5px', background:'#003366' }}/>
                            <div style={{ padding:'clamp(1.5rem,3vw,2.25rem)', flex:1, display:'flex', flexDirection:'column' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.25rem' }}>
                                    <div style={{ width:'52px', height:'52px', borderRadius:'12px', background:'#EBF0F7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                        <ShieldCheck size={26} color="#003366"/>
                                    </div>
                                    <h2 style={{ fontSize:'clamp(1.1rem,2vw,1.3rem)', fontWeight:'800', color:'#1A202C', margin:0 }}>AI Product Reviews</h2>
                                </div>
                                <p style={{ color:'#4A5568', lineHeight:'1.8', fontSize:'0.95rem', marginBottom:'1.5rem' }}>
                                    Independent, practitioner-written reviews of AI governance, risk, and compliance tools.
                                    Each product is tested against real-world use cases and scored across key capability dimensions.
                                </p>
                                <ul style={{ listStyle:'none', padding:0, margin:'0 0 2rem', display:'flex', flexDirection:'column', gap:'0.6rem', flex:1 }}>
                                    {['Hands-on feature testing with scored results','Evidence-backed capability assessments','Vendor-neutral, unbiased analysis','User community ratings and feedback'].map(f => (
                                        <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'0.875rem', color:'#475569' }}>
                                            <CheckCircle size={15} color="#003366" style={{ flexShrink:0, marginTop:'2px' }}/>{f}
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => navigate('/services/product-reviews')}
                                    style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'#003366', color:'white', border:'none', padding:'0.8rem 1.5rem', borderRadius:'8px', fontWeight:'700', fontSize:'0.9rem', cursor:'pointer', fontFamily:'var(--font-sans)', transition:'background 0.15s', alignSelf:'flex-start' }}
                                    onMouseOver={e => e.currentTarget.style.background='#002244'}
                                    onMouseOut={e => e.currentTarget.style.background='#003366'}>
                                    Browse Reviews <ArrowRight size={16}/>
                                </button>
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="svc-card svc-card-purple">
                            <div style={{ height:'5px', background:'#7C3AED' }}/>
                            <div style={{ padding:'clamp(1.5rem,3vw,2.25rem)', flex:1, display:'flex', flexDirection:'column' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.25rem' }}>
                                    <div style={{ width:'52px', height:'52px', borderRadius:'12px', background:'#F3F0FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                        <Users size={26} color="#7C3AED"/>
                                    </div>
                                    <h2 style={{ fontSize:'clamp(1.1rem,2vw,1.3rem)', fontWeight:'800', color:'#1A202C', margin:0 }}>Executive Workshops</h2>
                                </div>
                                <p style={{ color:'#4A5568', lineHeight:'1.8', fontSize:'0.95rem', marginBottom:'1.5rem' }}>
                                    Half-day and full-day immersive sessions for Board Directors and C-Suite leaders to build AI risk literacy and fulfil their fiduciary oversight responsibilities.
                                </p>
                                <ul style={{ listStyle:'none', padding:0, margin:'0 0 2rem', display:'flex', flexDirection:'column', gap:'0.6rem', flex:1 }}>
                                    {['Governance fundamentals and risk appetite design','AI crisis tabletop simulation exercises','RAI controls, testing and validation deep dive','Regulatory horizon scanning and briefings'].map(f => (
                                        <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'0.875rem', color:'#475569' }}>
                                            <CheckCircle size={15} color="#7C3AED" style={{ flexShrink:0, marginTop:'2px' }}/>{f}
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => navigate('/contact')}
                                    style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'#7C3AED', color:'white', border:'none', padding:'0.8rem 1.5rem', borderRadius:'8px', fontWeight:'700', fontSize:'0.9rem', cursor:'pointer', fontFamily:'var(--font-sans)', transition:'background 0.15s', alignSelf:'flex-start' }}
                                    onMouseOver={e => e.currentTarget.style.background='#6D28D9'}
                                    onMouseOut={e => e.currentTarget.style.background='#7C3AED'}>
                                    Enquire Now <ArrowRight size={16}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Why Choose ARC ── */}
            <div style={{ background:'white', padding:'clamp(1.5rem,3vw,2.5rem) clamp(1rem,4vw,2rem)', borderTop:'1px solid #E2E8F0' }}>
                <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
                    <div style={{ textAlign:'center', marginBottom:'2rem' }}>
                        <h2 style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:'800', color:'#1A202C', marginBottom:'0.5rem' }}>Why Choose AI Risk Council?</h2>
                        <p style={{ color:'#64748B', fontSize:'clamp(0.9rem,1.5vw,1.05rem)', maxWidth:'560px', margin:'0 auto' }}>
                            Built by practitioners, for practitioners — with no vendor conflicts of interest.
                        </p>
                    </div>
                    <div className="svc-why-grid">
                        {WHY_ITEMS.map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="svc-why-card">
                                <div style={{ width:'44px', height:'44px', borderRadius:'10px', background:'#EBF0F7', marginBottom:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    <Icon size={22} color="#003366"/>
                                </div>
                                <h3 style={{ fontSize:'1rem', fontWeight:'700', color:'#1A202C', marginBottom:'0.5rem' }}>{title}</h3>
                                <p style={{ fontSize:'0.875rem', color:'#64748B', lineHeight:'1.7', margin:0 }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── CTA Banner ── */}
            <div style={{ background:'linear-gradient(135deg,#003366 0%,#005599 100%)', padding:'clamp(1.5rem,3vw,2.5rem) clamp(1rem,4vw,2rem)', textAlign:'center' }}>
                <div style={{ maxWidth:'680px', margin:'0 auto' }}>
                    <h2 style={{ color:'white', fontSize:'clamp(1.4rem,3vw,2rem)', fontWeight:'800', marginBottom:'1rem', fontFamily:'var(--font-serif)' }}>
                        Ready to Strengthen Your AI Governance?
                    </h2>
                    <p style={{ color:'#CBD5E1', fontSize:'clamp(0.9rem,1.5vw,1.05rem)', lineHeight:'1.7', marginBottom:'2.5rem' }}>
                        Explore our independent product reviews or get in touch about tailored workshop programmes for your leadership team.
                    </p>
                    <div className="svc-cta-btns">
                        <button onClick={() => navigate('/services/product-reviews')}
                            style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'#f9a825', color:'#002244', border:'none', padding:'0.9rem 2rem', borderRadius:'6px', fontWeight:'800', fontSize:'0.95rem', cursor:'pointer', fontFamily:'var(--font-sans)', transition:'transform 0.15s', boxShadow:'0 4px 12px rgba(0,0,0,0.2)', whiteSpace:'nowrap' }}
                            onMouseOver={e => e.currentTarget.style.transform='translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform='translateY(0)'}>
                            Browse Product Reviews <ArrowRight size={16}/>
                        </button>
                        <button onClick={() => navigate('/contact')}
                            style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'transparent', color:'white', border:'2px solid rgba(255,255,255,0.5)', padding:'0.9rem 2rem', borderRadius:'6px', fontWeight:'700', fontSize:'0.95rem', cursor:'pointer', fontFamily:'var(--font-sans)', transition:'border-color 0.15s', whiteSpace:'nowrap' }}
                            onMouseOver={e => e.currentTarget.style.borderColor='white'}
                            onMouseOut={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.5)'}>
                            Contact Us <ArrowRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Services;