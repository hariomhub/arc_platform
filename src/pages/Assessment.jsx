import React from 'react';
import Section from '../components/Section';
import Card from '../components/Card';
import Button from '../components/Button';
import { FileText, Activity, ShieldCheck } from 'lucide-react';

const Assessment = () => {
    return (
        <>
            <Section background="light">
                <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
                    <h1>AI Risk Assessment</h1>
                    <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                        Measure your AI systems against globally recognized safety and compliance benchmarks.
                    </p>
                </div>
            </Section>

            <Section>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ marginBottom: '1.5rem' }}>Assessment Methodology</h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            Our assessment works on a multi-tier logic, analyzing both the governance structures surrounding your AI initiatives and the technical specifications of individual models.
                        </p>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <li style={{ display: 'flex', gap: '1rem' }}>
                                <FileText color="var(--primary)" />
                                <div>
                                    <strong>1. Documentation Review:</strong> Analysis of system cards, model datasheets, and impact assessments.
                                </div>
                            </li>
                            <li style={{ display: 'flex', gap: '1rem' }}>
                                <Activity color="var(--primary)" />
                                <div>
                                    <strong>2. Technical Stress Testing:</strong> Adversarial attacks and boundary testing on live endpoints.
                                </div>
                            </li>
                            <li style={{ display: 'flex', gap: '1rem' }}>
                                <ShieldCheck color="var(--primary)" />
                                <div>
                                    <strong>3. Control Verification:</strong> Auditing user access, logging, and human-in-the-loop protocols.
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div style={{ padding: '3rem', backgroundColor: 'var(--bg-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Download Assessment Templates</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'white', borderRadius: '4px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Pre-Deployment Checklist (PDF)</span>
                                <span style={{ fontSize: '0.8rem', background: 'var(--bg-light)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Free</span>
                            </div>
                            <div style={{ padding: '1rem', background: 'white', borderRadius: '4px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Algorithmic Impact Assessment (XLS)</span>
                                <span style={{ fontSize: '0.8rem', background: 'var(--primary)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Member</span>
                            </div>
                            <div style={{ padding: '1rem', background: 'white', borderRadius: '4px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>EU AI Act Gap Analysis</span>
                                <span style={{ fontSize: '0.8rem', background: 'var(--primary)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Member</span>
                            </div>
                            <Button variant="primary" to="/membership" style={{ marginTop: '1rem', width: '100%' }}>
                                Unlock All Templates
                            </Button>
                        </div>
                    </div>
                </div>
            </Section>
        </>
    );
};

export default Assessment;
