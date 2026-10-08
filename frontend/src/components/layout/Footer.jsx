import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { operatorLine } from '../../config/brand.js';

const Footer = () => (
    <>
        <style>{`
            .ft-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 2rem;
                margin-bottom: 3rem;
            }
            .ft-bottom {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 1rem;
            }
            .ft-links {
                display: flex;
                gap: 1.25rem;
                flex-wrap: wrap;
            }
            .ft-link {
                color: #CBD5E0;
                font-size: 0.925rem;
                text-decoration: none;
                transition: color 0.2s;
            }
            .ft-link:hover { color: white; text-decoration: none; }
            .ft-col-link {
                color: #CBD5E0;
                font-size: 0.925rem;
                text-decoration: none;
                transition: color 0.2s;
                display: block;
            }
            .ft-col-link:hover { color: white; text-decoration: none; }

            /* 4-col → 2-col → 1-col */
            @media (max-width: 900px) {
                .ft-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            @media (max-width: 520px) {
                .ft-grid {
                    grid-template-columns: 1fr;
                    gap: 1.75rem;
                }
                .ft-bottom {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .ft-links {
                    gap: 1rem;
                }
            }
        `}</style>

        <footer style={{
            backgroundColor: 'var(--primary)',
            color: 'white',
            padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2rem)',
        }}>
            <div style={{ maxWidth: 'var(--container-max, 1400px)', margin: '0 auto' }}>
                <div className="ft-grid">

                    {/* ── Brand ── */}
                    <div>
                        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', marginBottom: '1.25rem' }}>
                            <span style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '44px', height: '44px', borderRadius: '10px',
                                background: '#FFFFFF', boxShadow: '0 3px 10px rgba(0,0,0,0.18)',
                                flexShrink: 0,
                            }}>
                                <img
                                    src="/rac_u_logo.png"
                                    alt="Risk AI Council Logo"
                                    style={{ height: '38px', width: 'auto', objectFit: 'contain', display: 'block' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            </span>
                            <span style={{ fontSize: '1.45rem', fontWeight: '800', color: 'white', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                                Risk AI Council
                            </span>
                        </Link>
                        <p style={{ color: '#E2E8F0', fontSize: '0.925rem', lineHeight: '1.7', maxWidth: '280px', margin: 0 }}>
                            An emerging community for practical AI governance, risk, and responsible adoption.
                        </p>
                        {operatorLine() && (
                            <p style={{ color: '#94A3B8', fontSize: '0.82rem', lineHeight: '1.6', maxWidth: '280px', margin: '0.75rem 0 0' }}>{operatorLine()}</p>
                        )}
                    </div>

                    {/* ── Governance ── */}
                    <div>
                        <h5 style={{
                            color: 'white', marginBottom: '1.25rem',
                            fontFamily: 'var(--font-sans)', fontSize: '0.925rem',
                            fontWeight: '700', letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                        }}>
                            Governance
                        </h5>
                        <nav aria-label="Governance links" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            <Link to="/framework"     className="ft-col-link">AI Risk Framework</Link>
                            <Link to="/certification" className="ft-col-link">Learning Programmes</Link>
                            <Link to="/services"      className="ft-col-link">Services</Link>
                            <Link to="/services/product-reviews" className="ft-col-link">Product Reviews</Link>
                        </nav>
                    </div>

                    {/* ── Resources ── */}
                    <div>
                        <h5 style={{
                            color: 'white', marginBottom: '1.25rem',
                            fontFamily: 'var(--font-sans)', fontSize: '0.925rem',
                            fontWeight: '700', letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                        }}>
                            Resources
                        </h5>
                        <nav aria-label="Resources links" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            <Link to="/resources"     className="ft-col-link">Resources</Link>
                            <Link to="/events"        className="ft-col-link">Events &amp; Webinars</Link>
                            <Link to="/membership"    className="ft-col-link">Membership</Link>
                            <Link to="/community-qna" className="ft-col-link">Community Feed</Link>
                        </nav>
                    </div>

                    {/* ── Contact ── */}
                    <div>
                        <h5 style={{
                            color: 'white', marginBottom: '1.25rem',
                            fontFamily: 'var(--font-sans)', fontSize: '0.925rem',
                            fontWeight: '700', letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                        }}>
                            Contact
                        </h5>
                        <address style={{ fontStyle: 'normal', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.925rem', color: '#CBD5E0' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <MapPin size={15} style={{ marginTop: '3px', flexShrink: 0, opacity: 0.7 }} aria-hidden="true" />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', lineHeight: '1.55' }}>
                                    <span><strong style={{ color: '#e2e8f0' }}>USA:</strong> 5425 Wisconsin Ave, Suite 600, Chevy Chase, MD 20815</span>
                                    <span><strong style={{ color: '#e2e8f0' }}>UAE:</strong> Villa 43, Street 2, Springs 3, Dubai</span>
                                    <span><strong style={{ color: '#e2e8f0' }}>India:</strong> 902, Unitech Arcadia, Sector 49, Gurugram, Haryana</span>
                                    <span><strong style={{ color: '#e2e8f0' }}>Canada:</strong> 3105, 50 Charles street East M4Y 0C3, Toronto ON</span>
                                </div>
                            </div>
                            <a href="tel:+16477688767" style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#CBD5E0', textDecoration: 'none' }}>
                                <Phone size={15} aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }} />
                                <span>+1 (647) 7688767</span>
                            </a>
                            <a href="mailto:support@riskaicouncil.org" style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#CBD5E0', textDecoration: 'none' }}
                                onMouseOver={e => e.currentTarget.style.color = 'white'}
                                onMouseOut={e => e.currentTarget.style.color = '#CBD5E0'}>
                                <Mail size={15} aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }} />
                                <span>support@riskaicouncil.org</span>
                            </a>
                        </address>
                    </div>
                </div>

                {/* ── Bottom bar ── */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.75rem' }}>
                    <div className="ft-bottom">
                        <p style={{ color: '#718096', fontSize: '0.87rem', margin: 0 }}>
                            © 2026 Risk AI Council. All rights reserved.
                        </p>
                        <nav aria-label="Legal links" className="ft-links">
                            <Link to="/privacy"         className="ft-link" style={{ color: '#718096', fontSize: '0.87rem' }}>Privacy Policy</Link>
                            <Link to="/terms"           className="ft-link" style={{ color: '#718096', fontSize: '0.87rem' }}>Terms of Use</Link>
                            <Link to="/delete-account"  className="ft-link" style={{ color: '#718096', fontSize: '0.87rem' }}>Delete Account</Link>
                        </nav>
                    </div>
                </div>
            </div>
        </footer>
    </>
);

export default Footer;