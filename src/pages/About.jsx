import React from 'react';
import Section from '../components/Section';
import { Shield, Award, Users } from 'lucide-react';

const About = () => {
    return (
        <>
            <Section background="light">
                <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
                    <h1 style={{ marginBottom: '1.5rem' }}>About the Council</h1>
                    <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                        Advancing the global standard for Artificial Intelligence governance through independent research, rigorous assessment frameworks, and expert collaboration.
                    </p>
                </div>
            </Section>

            <Section>
                <div className="container">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem' }}>
                        <div>
                            <h2 style={{ fontSize: '2rem' }}>Our Mission</h2>
                            <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                                To empower organizations to deploy Artificial Intelligence technology safely, ethically, and responsibly. We provide the structural scaffolding—frameworks, policies, and standards—that allows innovation to flourish within secure boundaries.
                            </p>
                            <p style={{ fontSize: '1.1rem' }}>
                                As an independent body, we operate free from vendor influence, focusing strictly on the public interest and the long-term stability of the global AI ecosystem.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gap: '2rem' }}>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <div style={{ backgroundColor: 'var(--bg-light)', padding: '1rem', borderRadius: '50%', height: 'fit-content' }}>
                                    <Shield size={32} color="var(--primary)" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem' }}>Independence</h3>
                                    <p>Unbiased research and standards not tied to any specific tech platform or lobby.</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <div style={{ backgroundColor: 'var(--bg-light)', padding: '1rem', borderRadius: '50%', height: 'fit-content' }}>
                                    <Award size={32} color="var(--primary)" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem' }}>Excellence</h3>
                                    <p>Rigorous, peer-reviewed methodologies developed by world-class risk professionals.</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <div style={{ backgroundColor: 'var(--bg-light)', padding: '1rem', borderRadius: '50%', height: 'fit-content' }}>
                                    <Users size={32} color="var(--primary)" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem' }}>Collaboration</h3>
                                    <p>A global network of regulators, academics, and industry leaders.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            <Section background="light">
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h2>Council Components</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-md)', borderTop: '4px solid var(--primary)' }}>
                        <h3 style={{ fontSize: '1.5rem' }}>Advisory Board</h3>
                        <p>Composed of former regulators, Chief Risk Officers, and AI Ethicists who set the strategic direction.</p>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-md)', borderTop: '4px solid var(--accent)' }}>
                        <h3 style={{ fontSize: '1.5rem' }}>Research Institute</h3>
                        <p>Dedicated team publishing quarterly risk assessments and emerging threat analyses.</p>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-md)', borderTop: '4px solid var(--text-secondary)' }}>
                        <h3 style={{ fontSize: '1.5rem' }}>Assessment Committee</h3>
                        <p>Oversees the certification of external auditors and validates compliance reports.</p>
                    </div>
                </div>
            </Section>
        </>
    );
};

export default About;
