import React from 'react';
import Section from '../components/Section';
import Button from '../components/Button';
import { Mail, Phone, MapPin } from 'lucide-react';

const Contact = () => {
    return (
        <>
            <Section background="light">
                <div style={{ textAlign: 'center' }}>
                    <h1>Contact Us</h1>
                    <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                        Get in touch with our team for membership inquiries, press/media, or general information.
                    </p>
                </div>
            </Section>

            <Section>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem' }}>
                    <div>
                        <h3 style={{ marginBottom: '1.5rem' }}>Send us a message</h3>
                        <form style={{ display: 'grid', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>First Name</label>
                                    <input type="text" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: '4px', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Last Name</label>
                                    <input type="text" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: '4px', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Organization</label>
                                <input type="text" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: '4px', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Inquiry Type</label>
                                <select style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: '4px', background: 'white' }}>
                                    <option>Membership Inquiry</option>
                                    <option>Assessment Request</option>
                                    <option>Press / Media</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Message</label>
                                <textarea rows="5" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: '4px', fontFamily: 'inherit', boxSizing: 'border-box' }}></textarea>
                            </div>
                            <Button variant="primary">Send Message</Button>
                        </form>
                    </div>

                    <div>
                        <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '3rem', borderRadius: 'var(--radius-md)' }}>
                            <h3 style={{ color: 'white', marginBottom: '2rem' }}>Contact Information</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <MapPin />
                                    <div>
                                        <h5 style={{ color: 'white', marginBottom: '0.5rem' }}>Headquarters</h5>
                                        <p style={{ color: '#E2E8F0' }}>100 Global Risk Plaza<br />New York, NY 10001<br />United States</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <Phone />
                                    <div>
                                        <h5 style={{ color: 'white', marginBottom: '0.5rem' }}>Phone</h5>
                                        <p style={{ color: '#E2E8F0' }}>+1 (212) 555-0199</p>
                                        <p style={{ color: '#E2E8F0', fontSize: '0.9rem' }}>Mon-Fri, 9am - 5pm EST</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <Mail />
                                    <div>
                                        <h5 style={{ color: 'white', marginBottom: '0.5rem' }}>Email</h5>
                                        <p style={{ color: '#E2E8F0' }}>contact@airiskcouncil.org</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>
        </>
    );
};

export default Contact;
