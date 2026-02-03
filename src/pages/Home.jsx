import React from 'react';
import { Link } from 'react-router-dom';
import Section from '../components/Section';
import Button from '../components/Button';
import Card from '../components/Card';
import { heroContent, riskDomains } from '../mockData';
import { ArrowRight, Globe, Lock, CheckCircle } from 'lucide-react';

const Home = () => {
    return (
        <>
            {/* Hero Section */}
            <div style={{ backgroundColor: 'var(--primary-dark)', color: 'white', position: 'relative', overflow: 'hidden', minHeight: '600px', display: 'flex', alignItems: 'center' }}>
                {/* Video Background */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: '0.6' }}
                    >
                        <source src="https://videos.pexels.com/video-files/3129671/3129671-hd_1920_1080_30fps.mp4" type="video/mp4" />
                        {/* Fallback for video */}
                    </video>
                    {/* Reduced opacity from 0.8/0.9 to 0.7/0.8 for better video visibility */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(rgba(0,51,102,0.7), rgba(0,34,68,0.8))' }}></div>
                </div>

                <div className="container" style={{ position: 'relative', zIndex: 2, padding: '4rem 2rem', width: '100%' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
                        {/* Left Column: Content */}
                        <div>
                            <h1 style={{ color: 'white', marginBottom: '1.5rem', lineHeight: '1.1', fontSize: '3.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)', letterSpacing: '-0.02em' }}>{heroContent.title}</h1>
                            <p style={{ fontSize: '1.4rem', color: '#F7FAFC', marginBottom: '3rem', lineHeight: '1.6', fontWeight: '400', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                                {heroContent.subtitle}
                            </p>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <Button to="/membership" className="btn-primary" style={{ backgroundColor: '#003366', color: 'white', border: 'none', padding: '1.25rem 2.5rem', fontSize: '1.15rem', fontWeight: '800', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                    Join the Council
                                </Button>
                                <Button to="/framework" className="btn-primary" style={{ backgroundColor: '#003366', color: 'white', border: 'none', padding: '1.25rem 2.5rem', fontSize: '1.15rem', fontWeight: '800', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                    {heroContent.ctaPrimary}
                                </Button>
                            </div>
                        </div>

                        {/* Right Column: Video Playback Element */}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{
                                width: '100%',
                                maxWidth: '600px',
                                aspectRatio: '16/9',
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                backdropFilter: 'blur(10px)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Placeholder for actual video playback or image */}
                                <div style={{ textAlign: 'center', color: 'white' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', cursor: 'pointer', border: '2px solid white' }}>
                                        <div style={{ width: '0', height: '0', borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '18px solid white', marginLeft: '4px' }}></div>
                                    </div>
                                    <p style={{ fontWeight: '600', letterSpacing: '0.05em', fontSize: '0.9rem' }}>WATCH SHOWREEL</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Featured Services (Flashcards) */}
            <Section style={{ padding: '4rem 0' }}>
                {/* Removed inner .container as Section already provides one */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ color: 'var(--primary)', textShadow: '0 2px 4px rgba(255,255,255,0.5)', fontSize: '2.5rem' }}>Our Services</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                    <Card className="service-flashcard" title="AI Risk Advisory" style={{ backgroundColor: 'white', paddingTop: '2.5rem', borderTop: '5px solid var(--accent)' }}>
                        <p style={{ marginBottom: '1.5rem' }}>Strategic guidance for Boards and C-Suite on AI governance structures and policy formulation.</p>
                        <Link to="/services" style={{ textDecoration: 'none', color: 'var(--accent)', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase', display: 'inline-block' }}>Learn More &rarr;</Link>
                    </Card>
                    <Card className="service-flashcard" title="Independent Reviews" style={{ backgroundColor: 'white', paddingTop: '2.5rem', borderTop: '5px solid var(--primary)' }}>
                        <p style={{ marginBottom: '1.5rem' }}>Third-party audit and validation of high-impact AI models against global regulatory standards.</p>
                        <Link to="/services" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase', display: 'inline-block' }}>Request Review &rarr;</Link>
                    </Card>
                    <Card className="service-flashcard" title="Executive Workshops" style={{ backgroundColor: 'white', paddingTop: '2.5rem', borderTop: '5px solid var(--text-secondary)' }}>
                        <p style={{ marginBottom: '1.5rem' }}>Targeted training for leadership teams on understanding and mitigating AI-specific systemic risks.</p>
                        <Link to="/services" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase', display: 'inline-block' }}>View Schedule &rarr;</Link>
                    </Card>
                </div>
            </Section>

            {/* Intro Section - Adjusted */}
            <Section>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ marginBottom: '1.5rem' }}>Independent Oversight in the Age of Artificial Intelligence</h2>
                        <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                            The AI Risk Council serves as the definitive independent body for AI governance, bridging the gap between rapid technological advancement and regulatory compliance.
                        </p>
                        <p>
                            We provide board-level frameworks, standardized risk assessments, and certification pathways designed to mitigate systemic risks associated with large-scale model deployment.
                        </p>
                        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <CheckCircle size={20} color="var(--primary)" style={{ marginTop: '4px' }} />
                                <span><strong>Policy-Grade Frameworks:</strong> Aligned with EU AI Act, NIST AI RMF, and ISO 42001.</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <CheckCircle size={20} color="var(--primary)" style={{ marginTop: '4px' }} />
                                <span><strong>Executive Certification:</strong> Training for Risk Officers, Auditors, and Board Members.</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-light)', padding: '3rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Why Governance Matters</h3>
                        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
                            <Globe size={40} color="var(--primary)" />
                            <div>
                                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Global Compliance</h4>
                                <p style={{ fontSize: '0.95rem' }}>Navigate the complex web of international AI regulations with confidence.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            <Lock size={40} color="var(--primary)" />
                            <div>
                                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Brand Integrity</h4>
                                <p style={{ fontSize: '0.95rem' }}>Protect reputation by preventing bias, hallucinations, and privacy breaches.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Risk Domains */}
            <Section background="light">
                <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 3rem auto' }}>
                    <h2>AI Risk Domains</h2>
                    <p style={{ fontSize: '1.1rem' }}>
                        Our comprehensive oversight model addresses the six critical dimensions of Artificial Intelligence risk.
                    </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    {riskDomains.map((domain, index) => (
                        <div key={index}>
                            <Card title={domain.title} className="hover:shadow-lg">
                                <p style={{ fontSize: '0.95rem' }}>{domain.description}</p>
                                <Link to={`/risk-domains/${domain.id}`} style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: '500', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'none' }}>
                                    <span>View Standards</span>
                                    <ArrowRight size={16} />
                                </Link>
                            </Card>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Membership CTA */}
            <Section>
                <div style={{ backgroundColor: 'var(--primary)', borderRadius: 'var(--radius-lg)', padding: '4rem', color: 'white', textAlign: 'center' }}>
                    <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>Join the Global Council</h2>
                    <p style={{ maxWidth: '700px', margin: '0 auto 2.5rem auto', fontSize: '1.15rem', color: '#E2E8F0' }}>
                        Access exclusive risk assessment templates, peer benchmarking data, and executive briefings. Join a network of over 500 global organizations committed to responsible AI.
                    </p>
                    <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                        <Button to="/membership" variant="primary" style={{ backgroundColor: 'white', color: 'var(--primary)' }}>
                            Explore Membership
                        </Button>
                        <Button to="/contact" style={{ border: '1px solid white', color: 'white' }}>
                            Contact Us
                        </Button>
                    </div>
                </div>
            </Section>
        </>
    );
};

export default Home;
