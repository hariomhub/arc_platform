import React from 'react';
import Section from '../components/Section';
import { Award, Briefcase, BookOpen } from 'lucide-react';

const Certifications = () => {
    return (
        <>
            <Section background="light">
                <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
                    <h1>Certifications & Standards</h1>
                    <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                        Demonstrate your organization's commitment to responsible AI with globally recognized credentials.
                    </p>
                </div>
            </Section>

            <Section>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    <div style={{ border: '1px solid var(--border-light)', padding: '2rem', borderRadius: 'var(--radius-md)' }}>
                        <Award size={40} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                        <h3>Certified AI Governance Professional (CAIGP)</h3>
                        <p style={{ margin: '1rem 0' }}>The gold standard for individuals leading AI risk and compliance functions.</p>
                        <ul style={{ paddingLeft: '1.2rem', marginBottom: '1.5rem' }}>
                            <li>Risk Frameworks proficiency</li>
                            <li>Ethical AI design</li>
                            <li>EU AI Act & Global Regulatory landscape</li>
                        </ul>
                        <button className="btn btn-secondary" style={{ width: '100%' }}>View Syllabus</button>
                    </div>

                    <div style={{ border: '1px solid var(--border-light)', padding: '2rem', borderRadius: 'var(--radius-md)' }}>
                        <Briefcase size={40} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                        <h3>Organizational AI Readiness Certification</h3>
                        <p style={{ margin: '1rem 0' }}>For enterprises demonstrating maturity in AI governance to shareholders and regulators.</p>
                        <ul style={{ paddingLeft: '1.2rem', marginBottom: '1.5rem' }}>
                            <li>Process audit validation</li>
                            <li>Model inventory completeness</li>
                            <li>Incident response capability</li>
                        </ul>
                        <button className="btn btn-secondary" style={{ width: '100%' }}>Get Certified</button>
                    </div>
                </div>
            </Section>
        </>
    );
};

export default Certifications;
