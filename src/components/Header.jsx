import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { navItems } from '../mockData';
import Button from './Button';

const Header = () => {
    const location = useLocation();

    return (
        <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 }}>
            <div className="container" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', height: '80px' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                    <Shield size={32} color="var(--primary)" />
                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)', letterSpacing: '-0.5px' }}>AI RISK COUNCIL</span>
                </Link>

                {/* Desktop Nav - Centered */}
                <nav style={{ display: 'flex', gap: '30px', alignItems: 'center', justifySelf: 'center' }} className="desktop-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            style={{
                                color: location.pathname === item.path ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <Button to="/membership" variant="primary">Join Council</Button>
            </div>
        </header>
    );
};

export default Header;
