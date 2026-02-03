import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Section from '../components/Section';
import Button from '../components/Button';
import { riskDomains } from '../mockData';
import { ArrowLeft, CheckCircle, Shield } from 'lucide-react';

const RiskDomain = () => {
    const { id } = useParams();
    const domain = riskDomains.find(d => d.id === id);

    if (!domain) {
        return (
            <Section>
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <h2>Domain Not Found</h2>
                    <Button to="/" variant="secondary">Return Home</Button>
                </div>
            </Section>
        );
    }

    return (
        <>
            <Section style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                <div className="container">
                    <Link to="/" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: '500' }}>
                        <ArrowLeft size={16} /> Back to Overview
                    </Link>
                    <h1 style={{ color: 'white', marginBottom: '1rem' }}>{domain.title}</h1>
                    <p style={{ fontSize: '1.25rem', color: 'white', maxWidth: '800px', opacity: 0.9 }}>
                        {domain.description}
                    </p>
                </div>
            </Section>

            <Section>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ marginBottom: '1.5rem' }}>Domain Overview</h2>
                        <p style={{ fontSize: '1.1rem', marginBottom: '2rem', lineHeight: '1.7' }}>
                            {domain.fullDescription}
                        </p>

                        <div style={{ backgroundColor: 'var(--bg-light)', padding: '2rem', borderRadius: '8px' }}>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Key Governance Controls</h3>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <li style={{ display: 'flex', gap: '1rem' }}>
                                    <CheckCircle size={20} color="var(--primary)" />
                                    <span>Detailed risk inventory and classification</span>
                                </li>
                                <li style={{ display: 'flex', gap: '1rem' }}>
                                    <CheckCircle size={20} color="var(--primary)" />
                                    <span>Regular third-party auditing and validation</span>
                                </li>
                                <li style={{ display: 'flex', gap: '1rem' }}>
                                    <CheckCircle size={20} color="var(--primary)" />
                                    <span>Incident response protocols for model failure</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div>
                        <div style={{ border: '1px solid var(--border-light)', borderRadius: '8px', padding: '1.5rem' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <Shield size={20} color="var(--primary)" />
                                Related Standards
                            </h4>
                            <ul style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                                {domain.standards && domain.standards.map((std, idx) => (
                                    <li key={idx} style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{std}</li>
                                ))}
                            </ul>
                            <Button to="/contact" style={{ width: '100%', textAlign: 'center' }}>
                                Request Audit
                            </Button>
                        </div>
                    </div>
                </div>
            </Section>
        </>
    );
};

export default RiskDomain;
