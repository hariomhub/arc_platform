import React, { useState } from 'react';
import Section from '../components/Section';
import Card from '../components/Card';
import { resources } from '../mockData';
import { Lock, Download, Filter } from 'lucide-react';

const Resources = () => {
    const [filter, setFilter] = useState('All');

    const filteredResources = filter === 'All' ? resources : resources.filter(r => r.type === filter || r.access === filter);

    return (
        <>
            <Section background="light">
                <h1>Think Tank & Resources</h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                    Latest research, standards documentation, and field guides from the Council.
                </p>
            </Section>

            <Section>
                <div style={{ display: 'flex', gap: '2rem' }}>
                    {/* Sidebar Filter */}
                    <div style={{ width: '250px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <Filter size={20} />
                            <span style={{ fontWeight: '600' }}>Filters</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {['All', 'Public', 'Members Only', 'White Paper', 'Framework', 'Guide'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    style={{
                                        textAlign: 'left',
                                        padding: '0.5rem',
                                        backgroundColor: filter === f ? 'var(--primary)' : 'transparent',
                                        color: filter === f ? 'white' : 'var(--text-main)',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: filter === f ? '600' : '400'
                                    }}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grid */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {filteredResources.map((res, idx) => (
                            <Card key={idx} className="resource-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600', color: 'var(--text-light)' }}>{res.type}</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{res.date}</span>
                                </div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', lineHeight: '1.4' }}>{res.title}</h3>

                                <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    {res.access === 'Members Only' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontSize: '0.9rem', fontWeight: '500' }}>
                                            <Lock size={16} />
                                            <span>Member Access</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '500' }}>
                                            <Download size={16} />
                                            <span>Download PDF</span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </Section>
        </>
    );
};

export default Resources;
