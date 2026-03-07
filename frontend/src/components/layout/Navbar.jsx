import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, ChevronDown, Shield, BookOpen, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';

const PUBLIC_NAV = [
    { label: 'Home',              path: '/' },
    { label: 'Events',            path: '/events' },
    { label: 'Services',          path: '/services' },
    { label: 'AI Risk Framework', path: '/framework' },
    { label: 'About Us',          path: '/about' },
    { label: 'Certifications',    path: '/certification' },
    { label: 'Community Q&A',     path: '/community-qna' },
    { label: 'Contact Us',        path: '/contact' },
];

const ADMIN_NAV = { label: 'Research & Resources', path: '/resources', icon: BookOpen };

const ROLE_META = {
    admin:           { bg: '#6D28D9', text: 'Admin' },
    executive:       { bg: '#1D4ED8', text: 'Exec' },
    paid_member:     { bg: '#003366', text: 'Member' },
    product_company: { bg: '#0F766E', text: 'Product' },
    university:      { bg: '#9A3412', text: 'Uni' },
    free_member:     { bg: '#64748B', text: 'Free' },
};

const Navbar = () => {
    const location  = useLocation();
    const navigate  = useNavigate();
    const { user, isLoggedIn, isAdmin, logout } = useAuth();

    const [mobileOpen,   setMobileOpen]   = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const dropdownRef = useRef(null);

    const adminUser = isAdmin && isAdmin();
    const role      = ROLE_META[user?.role] || ROLE_META.free_member;

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target))
                setUserMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
        setUserMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = () => { logout(); setUserMenuOpen(false); setMobileOpen(false); };
    const isActive = (p) => p === '/' ? location.pathname === '/' : location.pathname.startsWith(p);

    return (
        <>
            <style>{`
                .nb-desktop   { display: flex !important; }
                .nb-hamburger { display: none !important; }
                @media (max-width: 1100px) {
                    .nb-desktop   { display: none !important; }
                    .nb-hamburger { display: flex !important; }
                }
                .nb-link {
                    position: relative; padding: 0.35rem 0.6rem;
                    font-size: 0.82rem; font-weight: 600; color: #64748b;
                    text-decoration: none; white-space: nowrap; letter-spacing: 0.01em;
                    border-radius: 6px; transition: color 0.15s, background 0.15s;
                }
                .nb-link:hover { color: #0f172a; background: #f1f5f9; }
                .nb-link.nb-active { color: #003366; background: rgba(0,51,102,0.07); font-weight: 700; }
                .nb-res-link {
                    display: inline-flex; align-items: center; gap: 5px;
                    padding: 0.35rem 0.6rem; background: transparent; color: #64748b;
                    border-radius: 6px; font-weight: 600; font-size: 0.82rem;
                    white-space: nowrap; text-decoration: none; letter-spacing: 0.01em;
                    transition: background 0.15s, color 0.15s;
                }
                .nb-res-link:hover { background: #f1f5f9; color: #0f172a; }
                .nb-res-link.nb-active { background: rgba(0,51,102,0.07); color: #003366; font-weight: 700; }
                .nb-dd-item {
                    display: flex; align-items: center; gap: 0.6rem;
                    padding: 0.6rem 1rem; font-size: 0.855rem; font-weight: 500;
                    color: #374151; text-decoration: none; border: none; background: none;
                    width: 100%; text-align: left; cursor: pointer;
                    font-family: var(--font-sans); transition: background 0.12s, color 0.12s;
                }
                .nb-dd-item:hover { background: #f8fafc; color: #003366; }
                .nb-dd-danger { color: #DC2626 !important; }
                .nb-dd-danger:hover { background: #fff1f2 !important; color: #DC2626 !important; }
                .nb-mob-link {
                    display: block; padding: 0.6rem 0.75rem;
                    font-size: 0.875rem; font-weight: 500; color: #475569;
                    text-decoration: none; border-radius: 8px;
                    transition: background 0.12s, color 0.12s;
                }
                .nb-mob-link:hover  { background: #f1f5f9; color: #0f172a; }
                .nb-mob-link.nb-active { background: rgba(0,51,102,0.08); color: #003366; font-weight: 700; }
                .nb-mob-admin { color: #6D28D9 !important; }
                .nb-mob-admin:hover { background: #f5f3ff !important; color: #5B21B6 !important; }
                .nb-mob-admin.nb-active { background: #ede9fe !important; }
                .nb-btn-ghost {
                    background: transparent; color: #003366; border: 1.5px solid #cbd5e1;
                    border-radius: 8px; padding: 0.45rem 1.1rem; font-weight: 600;
                    font-size: 0.83rem; cursor: pointer; font-family: var(--font-sans);
                    white-space: nowrap; transition: border-color 0.15s, background 0.15s;
                }
                .nb-btn-ghost:hover { border-color: #003366; background: rgba(0,51,102,0.04); }
                .nb-btn-solid {
                    background: #003366; color: white; border: none; border-radius: 8px;
                    padding: 0.45rem 1.1rem; font-weight: 700; font-size: 0.83rem;
                    cursor: pointer; font-family: var(--font-sans); white-space: nowrap;
                    transition: background 0.15s; box-shadow: 0 1px 4px rgba(0,51,102,0.2);
                }
                .nb-btn-solid:hover { background: #00264d; }
                .nb-avatar-btn {
                    display: flex; align-items: center; gap: 0.45rem;
                    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 100px;
                    padding: 0.27rem 0.6rem 0.27rem 0.27rem; cursor: pointer;
                    font-family: var(--font-sans); transition: background 0.13s, border-color 0.13s;
                }
                .nb-avatar-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
            `}</style>

            <header style={{
                background: 'white', borderBottom: '1px solid #e8edf3',
                position: 'sticky', top: 0, zIndex: 100,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', height: '66px',
                    padding: '0 1.5rem', maxWidth: '1600px', margin: '0 auto', gap: '1rem',
                }}>

                    {/* Logo */}
                    <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
                        <img src="/arc_logo.png" alt="ARC"
                            style={{ height: '32px', width: '32px', objectFit: 'contain' }}
                            onError={(e) => { e.target.style.display = 'none'; }} />
                        <span style={{ fontSize: '1rem', fontWeight: '800', color: '#001f4d', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                            AI RISK COUNCIL
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="nb-desktop" aria-label="Main navigation"
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: '2px', flexWrap: 'nowrap', overflow: 'hidden' }}>
                        {PUBLIC_NAV.map((item) => (
                            <Link key={item.path} to={item.path}
                                className={`nb-link${isActive(item.path) ? ' nb-active' : ''}`}>
                                {item.label}
                            </Link>
                        ))}
                        {adminUser && (
                            <Link to={ADMIN_NAV.path}
                                className={`nb-res-link${isActive(ADMIN_NAV.path) ? ' nb-active' : ''}`}>
                                <BookOpen size={13} strokeWidth={2.2} />
                                {ADMIN_NAV.label}
                            </Link>
                        )}
                    </nav>

                    {/* Auth section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: 'auto' }}>
                        {isLoggedIn ? (
                            <div ref={dropdownRef} style={{ position: 'relative' }}>
                                <button className="nb-avatar-btn"
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    aria-expanded={userMenuOpen} aria-haspopup="menu" aria-label="User menu">
                                    <div style={{
                                        width: '30px', height: '30px', borderRadius: '50%', background: role.bg,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontSize: '0.75rem', fontWeight: '700', flexShrink: 0,
                                    }}>
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: '0.83rem', fontWeight: '600', color: '#1e293b', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {user?.name?.split(' ')[0]}
                                    </span>
                                    <span style={{ fontSize: '0.6rem', fontWeight: '700', letterSpacing: '0.05em', background: role.bg, color: 'white', padding: '0.1rem 0.42rem', borderRadius: '100px', textTransform: 'uppercase', flexShrink: 0 }}>
                                        {role.text}
                                    </span>
                                    <ChevronDown size={13} color="#94a3b8"
                                        style={{ transition: 'transform 0.2s', transform: userMenuOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
                                </button>

                                {userMenuOpen && (
                                    <div role="menu" style={{
                                        position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                                        background: 'white', border: '1px solid #e8edf3',
                                        borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                                        minWidth: '210px', zIndex: 200, overflow: 'hidden',
                                    }}>
                                        <div style={{ padding: '0.75rem 1rem 0.65rem', borderBottom: '1px solid #f1f5f9' }}>
                                            <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>
                                                Signed in as
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {user?.email}
                                            </p>
                                        </div>

                                        {adminUser ? (
                                            <>
                                                <Link role="menuitem" to="/admin-dashboard" onClick={() => setUserMenuOpen(false)} className="nb-dd-item">
                                                    <LayoutDashboard size={15} color="#6D28D9" /> Admin Dashboard
                                                </Link>
                                                <Link role="menuitem" to="/resources" onClick={() => setUserMenuOpen(false)} className="nb-dd-item">
                                                    <BookOpen size={15} color="#6D28D9" /> Research &amp; Resources
                                                </Link>
                                                <div style={{ height: '1px', background: '#f1f5f9' }} />
                                            </>
                                        ) : (
                                            <Link role="menuitem" to="/user/dashboard" onClick={() => setUserMenuOpen(false)} className="nb-dd-item">
                                                <LayoutDashboard size={15} color="#003366" /> My Dashboard
                                            </Link>
                                        )}

                                        <Link role="menuitem" to="/profile" onClick={() => setUserMenuOpen(false)} className="nb-dd-item">
                                            <User size={15} color="#64748b" /> My Profile
                                        </Link>
                                        <div style={{ height: '1px', background: '#f1f5f9' }} />
                                        <button role="menuitem" onClick={handleLogout} className="nb-dd-item nb-dd-danger">
                                            <LogOut size={15} /> Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <button onClick={() => navigate('/login')} className="nb-btn-ghost">Sign In</button>
                                <button onClick={() => navigate('/membership')} className="nb-btn-solid">Join Council</button>
                            </>
                        )}

                        {/* Hamburger — mobile only */}
                        <button onClick={() => setMobileOpen(!mobileOpen)}
                            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={mobileOpen}
                            className="nb-hamburger"
                            style={{ alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', padding: '0.38rem', marginLeft: '0.25rem' }}>
                            {mobileOpen ? <X size={20} color="#003366" /> : <Menu size={20} color="#003366" />}
                        </button>
                    </div>
                </div>

                {/* Mobile drawer */}
                {mobileOpen && (
                    <div style={{ borderTop: '1px solid #e8edf3', background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '0.75rem 1.25rem 1.25rem' }}>
                        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
                            <nav aria-label="Mobile navigation"
                                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '2px' }}>
                                {PUBLIC_NAV.map((item) => (
                                    <Link key={item.path} to={item.path}
                                        onClick={() => { setMobileOpen(false); window.scrollTo({ top: 0 }); }}
                                        className={`nb-mob-link${isActive(item.path) ? ' nb-active' : ''}`}>
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>

                            {adminUser && (
                                <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px dashed #e2e8f0' }}>
                                    <p style={{ margin: '0 0 0.3rem 0.75rem', fontSize: '0.68rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin</p>
                                    <Link to="/admin-dashboard"
                                        onClick={() => { setMobileOpen(false); window.scrollTo({ top: 0 }); }}
                                        className={`nb-mob-link nb-mob-admin${isActive('/admin-dashboard') ? ' nb-active' : ''}`}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Shield size={14} /> Admin Dashboard
                                    </Link>
                                    <Link to={ADMIN_NAV.path}
                                        onClick={() => { setMobileOpen(false); window.scrollTo({ top: 0 }); }}
                                        className={`nb-mob-link nb-mob-admin${isActive(ADMIN_NAV.path) ? ' nb-active' : ''}`}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <BookOpen size={14} /> {ADMIN_NAV.label}
                                    </Link>
                                </div>
                            )}

                            {isLoggedIn ? (
                                <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px dashed #e2e8f0', display: 'flex', gap: '0.5rem' }}>
                                    <Link to="/profile" onClick={() => setMobileOpen(false)}
                                        style={{ flex: 1, padding: '0.55rem 0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#374151', fontSize: '0.855rem', fontWeight: '600', textDecoration: 'none', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>
                                        My Profile
                                    </Link>
                                    <button onClick={handleLogout}
                                        style={{ flex: 1, padding: '0.55rem 0.75rem', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#DC2626', fontSize: '0.855rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                                        Sign Out
                                    </button>
                                </div>
                            ) : (
                                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.6rem' }}>
                                    <button onClick={() => { navigate('/login'); setMobileOpen(false); }}
                                        style={{ flex: 1, padding: '0.6rem', background: 'transparent', border: '1.5px solid #cbd5e1', borderRadius: '8px', color: '#003366', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}>
                                        Sign In
                                    </button>
                                    <button onClick={() => { navigate('/membership'); setMobileOpen(false); }}
                                        style={{ flex: 1, padding: '0.6rem', background: '#003366', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}>
                                        Join Council
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </header>
        </>
    );
};

export default Navbar;
