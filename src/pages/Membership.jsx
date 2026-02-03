import React from 'react';
import Section from '../components/Section';
import Button from '../components/Button';
import { Check } from 'lucide-react';

const Membership = () => {
    return (
        <>
            <Section style={{ background: 'var(--primary)', color: 'white', textAlign: 'center' }}>
                <h1 style={{ color: 'white' }}>Council Membership</h1>
                <p style={{ fontSize: '1.25rem', color: '#E2E8F0', maxWidth: '600px', margin: '0 auto' }}>
                    Join the leading community of AI risk professionals. Gain access to tools, research, and a global network.
                </p>
            </Section>

            <Section>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
                    {/* Free Tier */}
                    <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>Associate</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '700', margin: '1rem 0' }}>Free</div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>For individuals interested in staying updated.</p>

                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: 'auto' }}>
                            <li style={{ display: 'flex', gap: '0.5rem' }}><Check size={20} color="var(--primary)" /> Public Research Access</li>
                            <li style={{ display: 'flex', gap: '0.5rem' }}><Check size={20} color="var(--primary)" /> Monthly Newsletter</li>
                            <li style={{ display: 'flex', gap: '0.5rem' }}><Check size={20} color="var(--primary)" /> Webinar Invites</li>
                        </ul>

                        <Button variant="secondary" style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }}>Join for Free</Button>
                    </div>

                    {/* Corporate Tier */}
                    <div style={{ border: '2px solid var(--primary)', borderRadius: 'var(--radius-md)', padding: '2.5rem', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '0', right: '0', background: 'var(--primary)', color: 'white', padding: '0.25rem 1rem', fontSize: '0.8rem', fontWeight: '600', borderBottomLeftRadius: '8px' }}>RECOMMENDED</div>
                        <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>Executive Council</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '700', margin: '1rem 0' }}>$2,500<span style={{ fontSize: '1rem', fontWeight: '400', color: 'var(--text-secondary)' }}>/yr</span></div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Full access for organizations and risk leaders.</p>

                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: 'auto' }}>
                            <li style={{ display: 'flex', gap: '0.5rem' }}><Check size={20} color="var(--primary)" /> <strong>All Audit Templates</strong> (XLS/Word)</li>
                            <li style={{ display: 'flex', gap: '0.5rem' }}><Check size={20} color="var(--primary)" /> Policy Generator Tools</li>
                            <li style={{ display: 'flex', gap: '0.5rem' }}><Check size={20} color="var(--primary)" /> Peer Benchmarking Data</li>
                            <li style={{ display: 'flex', gap: '0.5rem' }}><Check size={20} color="var(--primary)" /> Priority Certification Support</li>
                        </ul>

                        <Button variant="primary" style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }}>Apply for Membership</Button>
                    </div>
                </div>
            </Section>

            <Section background="light">
                <div style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
                    <h3>Already a member?</h3>
                    <p style={{ margin: '1rem 0' }}>Sign in to access your dashboard and resources.</p>
                    <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Email Address</label>
                            <input type="email" placeholder="name@company.com" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-medium)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Password</label>
                            <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-medium)' }} />
                        </div>
                        <Button variant="primary" style={{ justifyContent: 'center' }}>Sign In</Button>
                    </form>
                </div>
            </Section>
        </>
    );
};

export default Membership;
