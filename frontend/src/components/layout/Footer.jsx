import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, MapPin, Phone } from 'lucide-react';

const Footer = () => (
    <footer style={{ backgroundColor: 'var(--primary)', color: 'white', paddingTop: '4rem', paddingBottom: '2rem' }}>
        <div className="container">
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '2rem',
                    marginBottom: '3rem',
                }}
            >
                {/* Brand */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        <Shield size={24} color="white" fill="white" fillOpacity={0.2} aria-hidden="true" />
                        <span style={{ fontSize: '1.25rem', fontWeight: '700', fontFamily: 'var(--font-serif)' }}>
                            AI RISK COUNCIL
                        </span>
                    </div>
                    <p style={{ color: '#E2E8F0', fontSize: '0.9rem', maxWidth: '300px' }}>
                        The global authority on AI risk governance, setting standards for responsible,
                        ethical, and compliant artificial intelligence systems.
                    </p>
                </div>

                {/* Governance */}
                <div>
                    <h5 style={{ color: 'white', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>
                        Governance
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <Link to="/framework" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Risk Framework</Link>
                        <Link to="/assessment" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Assessment &amp; Certification</Link>
                        <Link to="/services" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Global Standards</Link>
                        <Link to="/contact" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Policy &amp; Regulation</Link>
                    </div>
                </div>

                {/* Resources */}
                <div>
                    <h5 style={{ color: 'white', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>
                        Resources
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <Link to="/resources" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Research &amp; Whitepapers</Link>
                        <Link to="/events" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Events &amp; Webinars</Link>
                        <Link to="/membership" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Member Portal</Link>
                        <Link to="/certifications" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Council Careers</Link>
                    </div>
                </div>

                {/* Contact */}
                <div>
                    <h5 style={{ color: 'white', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>
                        Contact
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: '#CBD5E0' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <MapPin size={16} style={{ marginTop: '4px', flexShrink: 0 }} aria-hidden="true" />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span><strong>USA:</strong> Kmicro — 3525 Hyland Ave Ste 265, Costa Mesa, CA 92626</span>
                                <span><strong>India:</strong> 902a Arcadia Mall, Gurugram Sector 49</span>
                                <span><strong>Dubai:</strong> Dubai Internet City, Dubai, UAE</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <Phone size={16} aria-hidden="true" />
                            <span>+1 (212) 555-0199</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <Mail size={16} aria-hidden="true" />
                            <a href="mailto:contact@airiskcouncil.org" style={{ color: '#CBD5E0' }}>contact@airiskcouncil.org</a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div
                style={{
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                }}
            >
                <p style={{ color: '#718096', fontSize: '0.85rem', margin: 0 }}>
                    © 2026 AI Risk Council. All rights reserved.
                </p>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <Link to="/privacy" style={{ color: '#718096', fontSize: '0.85rem' }}>Privacy Policy</Link>
                    <Link to="/terms" style={{ color: '#718096', fontSize: '0.85rem' }}>Terms of Use</Link>
                    <Link to="/cookie" style={{ color: '#718096', fontSize: '0.85rem' }}>Cookie Preferences</Link>
                </div>
            </div>
        </div>
    </footer>
);

export default Footer;
