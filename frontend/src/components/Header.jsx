import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, ChevronDown, Shield } from 'lucide-react';
import { navItems } from '../mockData';
import Button from './Button';
import { useAuth } from '../context/AuthContext';

const ROLE_STYLES = {
    admin: { bg: '#7C3AED', label: 'Admin' },
    member: { bg: '#003366', label: 'Member' },
    user: { bg: '#64748B', label: 'User' },
};

const Header = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isLoggedIn, isAdmin, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        setUserMenuOpen(false);
        navigate('/');
    };

    const roleStyle = ROLE_STYLES[user?.role] || ROLE_STYLES.user;

    return (
        <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 }}>
            {/* Grid: logo (1fr) | nav (auto, centred) | buttons (1fr, right-aligned) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                height: '70px',
                padding: '0 2rem',
                maxWidth: '1500px',
                margin: '0 auto',
                columnGap: '1.5rem',
            }}>
                {/* Left: Logo */}
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap', justifySelf: 'start' }}>
                    <img
                        src="/arc_logo.png"
                        alt="ARC Logo"
                        style={{ height: '34px', width: '34px', objectFit: 'contain', flexShrink: 0 }}
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.02em' }}>AI RISK COUNCIL</span>
                </Link>

                {/* Centre: Nav links */}
                <nav style={{ display: 'flex', gap: '28px', alignItems: 'center' }} className="desktop-nav">
                    {navItems.map((item) => (
                        <Link key={item.path} to={item.path} style={{ color: location.pathname === item.path ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: '600', fontSize: '0.83rem', whiteSpace: 'nowrap', textDecoration: 'none', position: 'relative', paddingBottom: '2px', borderBottom: location.pathname === item.path ? '2px solid var(--primary)' : '2px solid transparent' }}>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Right: Buttons / user menu */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifySelf: 'end' }}>
                    {isLoggedIn ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            {isAdmin && (
                                <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.9rem', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                                    Admin Dashboard
                                </button>
                            )}
                            <div style={{ position: 'relative' }}>
                                <button onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-light)', border: '1px solid var(--border-light)', borderRadius: '100px', padding: '0.35rem 0.6rem 0.35rem 0.4rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: roleStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: '700', flexShrink: 0 }}>
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-main)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</span>
                                    <span style={{ fontSize: '0.6rem', fontWeight: '700', letterSpacing: '0.05em', background: roleStyle.bg, color: 'white', padding: '0.12rem 0.45rem', borderRadius: '100px', textTransform: 'uppercase', flexShrink: 0 }}>{roleStyle.label}</span>
                                    <ChevronDown size={12} color="var(--text-secondary)" />
                                </button>

                                {userMenuOpen && (
                                    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '180px', zIndex: 200, overflow: 'hidden' }}>
                                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)' }}>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '2px' }}>Signed in as</p>
                                            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-main)' }}>{user?.email}</p>
                                        </div>
                                        {isAdmin && (
                                            <>
                                                <Link to="/admin-dashboard/users" onClick={() => setUserMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none' }}>
                                                    <Shield size={14} /> Manage Users
                                                </Link>
                                                <Link to="/admin-dashboard" onClick={() => setUserMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none' }}>
                                                    <Shield size={14} /> Admin Dashboard
                                                </Link>
                                            </>
                                        )}
                                        <Link to="/membership" onClick={() => setUserMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none' }}>
                                            <User size={14} /> My Account
                                        </Link>
                                        <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', background: 'none', border: 'none', color: '#DC2626', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', borderTop: '1px solid var(--border-light)', textAlign: 'left', fontFamily: 'var(--font-sans)' }}>
                                            <LogOut size={14} /> Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button
                                onClick={() => navigate('/membership', { state: { mode: 'login' } })}
                                style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 2.5rem', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => navigate('/membership')}
                                style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.6rem 2.5rem', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                            >
                                Join Council
                            </button>
                        </div>
                    )}

                    <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                        {mobileOpen ? <X size={24} color="var(--primary)" /> : <Menu size={24} color="var(--primary)" />}
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <div style={{ borderTop: '1px solid var(--border-light)', backgroundColor: 'white', padding: '1rem 1.5rem 1.5rem' }}>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {navItems.map((item) => (
                            <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} style={{ padding: '0.75rem 0.5rem', color: location.pathname === item.path ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: '600', fontSize: '1rem', borderBottom: '1px solid var(--border-light)', textDecoration: 'none' }}>
                                {item.label}
                            </Link>
                        ))}
                        {!isLoggedIn && (
                            <>
                                <button onClick={() => { navigate('/membership', { state: { mode: 'login' } }); setMobileOpen(false); }} style={{ marginTop: '1rem', padding: '0.75rem', background: 'transparent', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                                    Sign In
                                </button>
                                <button onClick={() => { navigate('/membership'); setMobileOpen(false); }} style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-sm)', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                                    Join Council
                                </button>
                            </>
                        )}
                        {isLoggedIn && (
                            <button onClick={() => { handleLogout(); setMobileOpen(false); }} style={{ marginTop: '1rem', padding: '0.75rem', background: 'none', border: '1px solid #DC2626', borderRadius: 'var(--radius-sm)', color: '#DC2626', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                                Sign Out
                            </button>
                        )}
                    </nav>
                </div>
            )}

            <style>{`
                @media (max-width: 768px) {
                    .desktop-nav { display: none !important; }
                    .mobile-menu-btn { display: block !important; }
                }
            `}</style>
        </header>
    );
};

export default Header;