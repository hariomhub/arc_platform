import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, MapPin, Phone } from 'lucide-react';

const Footer = () => {
    return (
        <footer style={{ backgroundColor: 'var(--primary)', color: 'white', paddingTop: '4rem', paddingBottom: '2rem' }}>
            <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>

                    {/* Brand Column */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                            <Shield size={24} color="white" fill="white" fillOpacity={0.2} />
                            <span style={{ fontSize: '1.25rem', fontWeight: '700', fontFamily: 'var(--font-serif)' }}>
                                AI RISK COUNCIL
                            </span>
                        </div>
                        <p style={{ color: '#E2E8F0', fontSize: '0.9rem', maxWidth: '300px' }}>
                            The global authority on AI risk governance, setting standards for responsible, ethical, and compliant artificial intelligence systems.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h5 style={{ color: 'white', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>Governance</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <Link to="/framework" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Risk Framework</Link>
                            <Link to="/assessment" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Assessment & Certification</Link>
                            <Link to="/standards" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Global Standards</Link>
                            <Link to="/policy" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Policy & Regulation</Link>
                        </div>
                    </div>

                    {/* Resources */}
                    <div>
                        <h5 style={{ color: 'white', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>Resources</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <Link to="/resources" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Research & Whitepapers</Link>
                            <Link to="/events" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Events & Webinars</Link>
                            <Link to="/membership" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Member Portal</Link>
                            <Link to="/careers" style={{ color: '#CBD5E0', fontSize: '0.9rem' }}>Council Careers</Link>
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h5 style={{ color: 'white', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>Contact</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: '#CBD5E0' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <MapPin size={16} />
                                <span>100 Global Risk Plaza, NY, USA</span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <Phone size={16} />
                                <span>+1 (212) 555-0199</span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <Mail size={16} />
                                <span>contact@airiskcouncil.org</span>
                            </div>
                        </div>
                    </div>

                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <p style={{ color: '#718096', fontSize: '0.85rem' }}>© 2026 AI Risk Council. All rights reserved.</p>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <Link to="/privacy" style={{ color: '#718096', fontSize: '0.85rem' }}>Privacy Policy</Link>
                        <Link to="/terms" style={{ color: '#718096', fontSize: '0.85rem' }}>Terms of Use</Link>
                        <Link to="/cookie" style={{ color: '#718096', fontSize: '0.85rem' }}>Cookie Preferences</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
