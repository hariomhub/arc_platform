import React from 'react';
import Section from '../components/Section';
import Card from '../components/Card';
import { services } from '../mockData';

const Services = () => {
    return (
        <>
            <Section style={{ backgroundColor: 'var(--bg-dark)', color: 'white' }}>
                <div className="container">
                    <h1 style={{ color: 'white' }}>Professional Services</h1>
                    <p style={{ fontSize: '1.25rem', color: '#CBD5E0', maxWidth: '700px' }}>
                        Leverage the expertise of the Council to accelerate your AI governance maturity. We offer tailored advisory and independent review services.
                    </p>
                </div>
            </Section>

            <Section>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                    {services.map((service, idx) => (
                        <Card key={idx} title={service.title} className="hover:shadow-md" footer={
                            <span style={{ color: 'var(--accent)', fontWeight: '500', cursor: 'pointer' }}>Request Proposal &rarr;</span>
                        }>
                            <p>{service.description}</p>
                        </Card>
                    ))}
                </div>
            </Section>

            <Section background="light">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Executive Workshops</h2>
                    <p style={{ maxWidth: '600px', marginBottom: '2rem' }}>
                        Half-day and full-day sessions designed for Board Directors and C-Suite leaders to understand their fiduciary duties regarding AI oversight.
                    </p>
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <div style={{ background: 'white', padding: '2rem', width: '300px', borderRadius: '4px' }}>
                            <h4 style={{ marginBottom: '1rem' }}>Governance Fundamentals</h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Building the board's AI fluency and risk appetite statement.</p>
                        </div>
                        <div style={{ background: 'white', padding: '2rem', width: '300px', borderRadius: '4px' }}>
                            <h4 style={{ marginBottom: '1rem' }}>Crisis Simulation</h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Tabletop exercises simulating a major AI failure or bias incident.</p>
                        </div>
                        <div style={{ background: 'white', padding: '2rem', width: '300px', borderRadius: '4px' }}>
                            <h4 style={{ marginBottom: '1rem' }}>RAI Controls & Testing</h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Deep dive into model testing, validation, and control design.</p>
                        </div>
                    </div>
                </div>
            </Section>
        </>
    );
};

export default Services;
