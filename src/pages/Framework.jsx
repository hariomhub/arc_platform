import React from 'react';
import Section from '../components/Section';
import { pillars } from '../mockData';

const Framework = () => {
    return (
        <>
            <Section style={{ backgroundColor: 'white', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <h1 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>AI Risk Governance Framework</h1>
                    <p style={{ fontSize: '1.25rem', color: '#2D3748', fontWeight: '400', lineHeight: '1.6' }}>
                        A structured approach to identifying, measuring, and mitigating artificial intelligence risks across the enterprise lifecycle.
                    </p>
                </div>
            </Section>

            <Section>
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '3rem' }}>
                    {/* Sidebar Nav (Visual mainly) */}
                    <div style={{ borderRight: '1px solid var(--border-light)', paddingRight: '2rem' }}>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--text-light)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Framework Modules</h4>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <li style={{ color: 'var(--primary)', fontWeight: '600', borderLeft: '3px solid var(--primary)', paddingLeft: '1rem' }}>Core Pillars</li>
                            <li style={{ color: 'var(--text-secondary)', paddingLeft: '1rem' }}>Maturity Levels</li>
                            <li style={{ color: 'var(--text-secondary)', paddingLeft: '1rem' }}>Implementation Guide</li>
                            <li style={{ color: 'var(--text-secondary)', paddingLeft: '1rem' }}>Audit Templates</li>
                        </ul>
                    </div>

                    <div>
                        <h2 style={{ marginBottom: '2rem' }}>Core Pillars of Oversight</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                            {pillars.map((pillar, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '2rem' }}>
                                    <div style={{
                                        fontSize: '3rem',
                                        fontWeight: '700',
                                        color: 'var(--border-light)',
                                        lineHeight: '1',
                                        minWidth: '60px'
                                    }}>
                                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{pillar.title}</h3>
                                        <p style={{ fontSize: '1.05rem' }}>{pillar.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '4rem' }}>
                            <h2 style={{ marginBottom: '1.5rem' }}>Maturity Model</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                <div style={{ backgroundColor: 'var(--bg-light)', padding: '1.5rem', borderRadius: '4px' }}>
                                    <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Foundational</h4>
                                    <p style={{ fontSize: '0.9rem' }}>Ad-hoc policies, reaction-based risk management.</p>
                                </div>
                                <div style={{ backgroundColor: '#E0E7FF', padding: '1.5rem', borderRadius: '4px' }}>
                                    <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Defined</h4>
                                    <p style={{ fontSize: '0.9rem' }}>Standardized definitions and initial controls in place.</p>
                                </div>
                                <div style={{ backgroundColor: '#C7D2FE', padding: '1.5rem', borderRadius: '4px' }}>
                                    <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Managed</h4>
                                    <p style={{ fontSize: '0.9rem' }}>Quantitative metrics and continuous monitoring active.</p>
                                </div>
                                <div style={{ backgroundColor: '#818CF8', padding: '1.5rem', borderRadius: '4px', color: 'white' }}>
                                    <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'white' }}>Optimized</h4>
                                    <p style={{ fontSize: '0.9rem', color: '#F3F4F6' }}>Adaptive governance with real-time feedback loops.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>
        </>
    );
};

export default Framework;
