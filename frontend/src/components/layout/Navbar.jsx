import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Menu, X, LogOut, User, ChevronDown, Shield,
    BookOpen, LayoutDashboard, Home, Calendar,
    Settings, FileText, HelpCircle, Info, Phone, Award,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';

const PUBLIC_NAV = [
    { label: 'Home',                 path: '/',              icon: Home },
    { label: 'Events',               path: '/events',        icon: Calendar },
    { label: 'Services',             path: '/services',      icon: Settings },
    { label: 'AI Risk Framework',    path: '/framework',     icon: FileText },
    { label: 'Research & Resources', path: '/resources',     icon: BookOpen },
    { label: 'Certifications',       path: '/certification', icon: Award },
    { label: 'Community Q&A',        path: '/community-qna', icon: HelpCircle },
    { label: 'About Us',             path: '/about',         icon: Info },
    { label: 'Contact Us',           path: '/contact',       icon: Phone },
];

const ROLE_META = {
    founding_member: { bg: '#6D28D9', text: 'Founder' },
    executive:       { bg: '#1D4ED8', text: 'Executive' },
    professional:    { bg: '#059669', text: 'Pro' },
};

const Navbar = () => {
    const location  = useLocation();
    const navigate  = useNavigate();
    const { user, isLoggedIn, isAdmin, logout } = useAuth();

    const [mobileOpen,   setMobileOpen]   = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const dropdownRef       = useRef(null);
    const mobileDropdownRef = useRef(null);

    const adminUser = isAdmin && isAdmin();
    const role      = ROLE_META[user?.role] || ROLE_META.professional;

    useEffect(() => {
        const handler = (e) => {
            const inDesktop = dropdownRef.current && dropdownRef.current.contains(e.target);
            const inMobile  = mobileDropdownRef.current && mobileDropdownRef.current.contains(e.target);
            if (!inDesktop && !inMobile) setUserMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
        setUserMenuOpen(false);
    }, [location.pathname]);

    /* ── Scroll lock — works on iOS Safari too ── */
    useEffect(() => {
        if (mobileOpen) {
            const scrollY = window.scrollY;
            document.body.style.position   = 'fixed';
            document.body.style.top        = `-${scrollY}px`;
            document.body.style.left       = '0';
            document.body.style.right      = '0';
            document.body.style.overflowY  = 'scroll'; /* keep scrollbar width so layout doesn't jump */
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position  = '';
            document.body.style.top       = '';
            document.body.style.left      = '';
            document.body.style.right     = '';
            document.body.style.overflowY = '';
            if (scrollY) window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
        }
        return () => {
            document.body.style.position  = '';
            document.body.style.top       = '';
            document.body.style.left      = '';
            document.body.style.right     = '';
            document.body.style.overflowY = '';
        };
    }, [mobileOpen]);

    const handleLogout = () => { logout(); setUserMenuOpen(false); setMobileOpen(false); };
    const isActive = (p) => p === '/' ? location.pathname === '/' : location.pathname.startsWith(p);
    const handleNavClick = () => { setMobileOpen(false); window.scrollTo({ top: 0 }); };

    return (
        <>
            <style>{`
                .nb-desktop   { display: flex !important; }
                .nb-hamburger { display: none !important; }
                @media (max-width: 1100px) {
                    .nb-desktop   { display: none !important; }
                    .nb-hamburger { display: flex  !important; }
                }

                .nb-link {
                    padding: 0.35rem 0.55rem;
                    font-size: 0.8rem; font-weight: 600; color: #64748b;
                    text-decoration: none; white-space: nowrap;
                    border-radius: 6px;
                    transition: color 0.15s, background 0.15s;
                }
                .nb-link:hover     { color: #0f172a; background: #f1f5f9; text-decoration: none; }
                .nb-link.nb-active { color: #003366; background: rgba(0,51,102,0.07); font-weight: 700; }

                .nb-dd-item {
                    display: flex; align-items: center; gap: 0.6rem;
                    padding: 0.65rem 1rem; font-size: 0.855rem; font-weight: 500;
                    color: #374151; text-decoration: none;
                    border: none; background: none; width: 100%;
                    text-align: left; cursor: pointer;
                    font-family: var(--font-sans);
                    transition: background 0.12s, color 0.12s; min-height: 44px;
                }
                .nb-dd-item:hover       { background: #f8fafc; color: #003366; text-decoration: none; }
                .nb-dd-danger           { color: #DC2626 !important; }
                .nb-dd-danger:hover     { background: #fff1f2 !important; }

                .nb-btn-ghost {
                    background: transparent; color: #003366;
                    border: 1.5px solid #cbd5e1; border-radius: 8px;
                    padding: 0 1rem; height: 38px; font-weight: 600; font-size: 0.83rem;
                    cursor: pointer; font-family: var(--font-sans); white-space: nowrap;
                    transition: border-color 0.15s, background 0.15s;
                    display: inline-flex; align-items: center;
                }
                .nb-btn-ghost:hover { border-color: #003366; background: rgba(0,51,102,0.04); }

                .nb-btn-solid {
                    background: #003366; color: white;
                    border: none; border-radius: 8px;
                    padding: 0 1.1rem; height: 38px; font-weight: 700; font-size: 0.83rem;
                    cursor: pointer; font-family: var(--font-sans); white-space: nowrap;
                    transition: background 0.15s;
                    box-shadow: 0 1px 4px rgba(0,51,102,0.2);
                    display: inline-flex; align-items: center;
                }
                .nb-btn-solid:hover { background: #00264d; }

                .nb-avatar-btn {
                    display: flex; align-items: center; gap: 0.45rem;
                    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 100px;
                    padding: 0.27rem 0.6rem 0.27rem 0.27rem;
                    cursor: pointer; font-family: var(--font-sans);
                    transition: background 0.13s, border-color 0.13s; height: 44px;
                }
                .nb-avatar-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }

                /* ── Mobile nav link ── */
                .nb-mob-link {
                    display: flex; align-items: center; gap: 0.75rem;
                    padding: 0.7rem 0.875rem;
                    font-size: 0.9rem; font-weight: 500; color: #374151;
                    text-decoration: none; border-radius: 10px;
                    transition: background 0.12s, color 0.12s;
                    min-height: 48px; width: 100%;
                }
                .nb-mob-link:hover     { background: #f1f5f9; color: #1e293b; text-decoration: none; }
                .nb-mob-link.nb-active { background: rgba(0,51,102,0.07); color: #003366; font-weight: 700; }
                .nb-mob-link.nb-active .nb-mob-icon { color: #003366; }
                .nb-mob-icon { color: #94a3b8; flex-shrink: 0; transition: color 0.12s; }
                .nb-mob-link:hover .nb-mob-icon { color: #64748b; }

                .nb-mob-admin           { color: #6D28D9 !important; }
                .nb-mob-admin:hover     { background: #f5f3ff !important; }
                .nb-mob-admin.nb-active { background: #ede9fe !important; }

                /* ── Overlay ── */
                .nb-overlay {
                    position: fixed; top: 66px; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.25);
                    z-index: 998;
                    animation: nbFadeIn 0.2s ease;
                }
                @keyframes nbFadeIn { from { opacity: 0 } to { opacity: 1 } }

                /* ── Right side drawer ── */
                .nb-drawer {
                    position: fixed; top: 66px; right: 0; bottom: 0;
                    width: 280px;
                    max-width: 80vw;
                    z-index: 999;
                    background: white;
                    box-shadow: -4px 0 32px rgba(0,0,0,0.12);
                    display: flex; flex-direction: column;
                    overflow: hidden;
                    animation: nbSlideIn 0.26s cubic-bezier(0.25,0.8,0.25,1);
                }
                @keyframes nbSlideIn {
                    from { transform: translateX(100%); }
                    to   { transform: translateX(0); }
                }

                @media (max-width: 360px) {
                    .nb-role-badge { display: none !important; }
                    .nb-user-name  { display: none !important; }
                }
            `}</style>

            {/* Overlay — closes drawer on tap */}
            {mobileOpen && (
                <div className="nb-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            )}

            {/* ══════════════ HEADER ══════════════ */}
            <header style={{
                background: 'white', borderBottom: '1px solid #e8edf3',
                position: 'sticky', top: 0,
                /* z-index must be ABOVE the overlay (998) so hamburger stays clickable */
                zIndex: 1000,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', height: '66px',
                    padding: '0 clamp(1rem, 3vw, 1.5rem)',
                    maxWidth: '1600px', margin: '0 auto',
                    width: '100%',
                }}>

                    {/* Logo */}
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                            <img src="/ai_logo.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', transform: 'scale(1.4)' }} />
                            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#003366', letterSpacing: '-0.02em', transform: 'translate(6px, 3px)' }}>Risk AI Council</span>
                        </Link>

                    {/* Desktop nav — takes remaining space, hidden on mobile */}
                    <nav className="nb-desktop" aria-label="Main navigation"
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: '1px', flexWrap: 'nowrap', overflow: 'hidden' }}>
                        {PUBLIC_NAV.map((item) => (
                            <Link key={item.path} to={item.path}
                                className={`nb-link${isActive(item.path) ? ' nb-active' : ''}`}>
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* ── Right side: desktop auth | mobile avatar + hamburger ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: 'auto' }}>

                        {/* Desktop auth controls — hidden on mobile */}
                        <div className="nb-desktop" style={{ alignItems: 'center', gap: '0.5rem' }}>
                            {isLoggedIn ? (
                                <div ref={dropdownRef} style={{ position: 'relative' }}>
                                    <button className="nb-avatar-btn"
                                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                                        aria-expanded={userMenuOpen} aria-haspopup="menu" aria-label="User menu">
                                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: role.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: '700' }}>
                                            {user?.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="nb-user-name" style={{ fontSize: '0.83rem', fontWeight: '600', color: '#1e293b', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {user?.name?.split(' ')[0]}
                                        </span>
                                        <span className="nb-role-badge" style={{ fontSize: '0.6rem', fontWeight: '700', letterSpacing: '0.05em', background: role.bg, color: 'white', padding: '0.1rem 0.42rem', borderRadius: '100px', textTransform: 'uppercase', flexShrink: 0 }}>
                                            {role.text}
                                        </span>
                                        <ChevronDown size={13} color="#94a3b8"
                                            style={{ transition: 'transform 0.2s', transform: userMenuOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
                                    </button>
                                    {userMenuOpen && (
                                        <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'white', border: '1px solid #e8edf3', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', minWidth: '210px', zIndex: 200, overflow: 'hidden' }}>
                                            <div style={{ padding: '0.75rem 1rem 0.65rem', borderBottom: '1px solid #f1f5f9' }}>
                                                <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>Signed in as</p>
                                                <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                                            </div>
                                            {adminUser ? (<>
                                                <Link role="menuitem" to="/admin-dashboard" onClick={() => setUserMenuOpen(false)} className="nb-dd-item"><LayoutDashboard size={15} color="#6D28D9" /> Admin Dashboard</Link>
                                                <Link role="menuitem" to="/resources" onClick={() => setUserMenuOpen(false)} className="nb-dd-item"><BookOpen size={15} color="#6D28D9" /> Research &amp; Resources</Link>
                                                <div style={{ height: '1px', background: '#f1f5f9' }} />
                                            </>) : (<>
                                                <Link role="menuitem" to="/user/dashboard" onClick={() => setUserMenuOpen(false)} className="nb-dd-item"><LayoutDashboard size={15} color="#003366" /> My Dashboard</Link>
                                                <Link role="menuitem" to="/resources" onClick={() => setUserMenuOpen(false)} className="nb-dd-item"><BookOpen size={15} color="#003366" /> Research &amp; Resources</Link>
                                                <div style={{ height: '1px', background: '#f1f5f9' }} />
                                            </>)}
                                            <Link role="menuitem" to="/profile" onClick={() => setUserMenuOpen(false)} className="nb-dd-item"><User size={15} color="#64748b" /> My Profile</Link>
                                            <div style={{ height: '1px', background: '#f1f5f9' }} />
                                            <button role="menuitem" onClick={handleLogout} className="nb-dd-item nb-dd-danger"><LogOut size={15} /> Sign Out</button>
                                        </div>
                                    )}
                                </div>
                            ) : (<>
                                <button onClick={() => navigate('/login')} className="nb-btn-ghost">Sign In</button>
                                <button onClick={() => navigate('/membership')} className="nb-btn-solid">Join Council</button>
                            </>)}
                        </div>

                        {/* ── Mobile: avatar circle (logged in) or Sign In — visible only on mobile ── */}
                        {isLoggedIn ? (
                            <div
                                className="nb-hamburger"
                                ref={mobileDropdownRef}
                                style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                            >
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    aria-expanded={userMenuOpen}
                                    aria-haspopup="menu"
                                    aria-label="User menu"
                                    style={{
                                        width: '36px', height: '36px',
                                        borderRadius: '50%',
                                        background: role.bg,
                                        border: '2px solid white',
                                        boxShadow: '0 0 0 1.5px ' + role.bg,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontSize: '0.8rem', fontWeight: '700',
                                        cursor: 'pointer', flexShrink: 0,
                                    }}
                                >
                                    {user?.name?.charAt(0).toUpperCase()}
                                </button>
                                {userMenuOpen && (
                                    <div role="menu" style={{
                                        position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                                        background: 'white', border: '1px solid #e8edf3',
                                        borderRadius: '14px',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                                        minWidth: '220px', zIndex: 1002, overflow: 'hidden',
                                    }}>
                                        {/* Header */}
                                        <div style={{ padding: '0.875rem 1rem 0.75rem', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: role.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem', fontWeight: '700', flexShrink: 0 }}>
                                                    {user?.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                                                    <span style={{ fontSize: '0.58rem', fontWeight: '700', background: role.bg, color: 'white', padding: '1px 7px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{role.text}</span>
                                                </div>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                                        </div>
                                        {/* Menu items */}
                                        {adminUser ? (<>
                                            <Link role="menuitem" to="/admin-dashboard" onClick={() => setUserMenuOpen(false)} className="nb-dd-item"><LayoutDashboard size={15} color="#6D28D9" /> Admin Dashboard</Link>
                                            <Link role="menuitem" to="/resources" onClick={() => setUserMenuOpen(false)} className="nb-dd-item"><BookOpen size={15} color="#6D28D9" /> Research &amp; Resources</Link>
                                            <div style={{ height: '1px', background: '#f1f5f9' }} />
                                        </>) : (<>
                                            <Link role="menuitem" to="/user/dashboard" onClick={() => setUserMenuOpen(false)} className="nb-dd-item"><LayoutDashboard size={15} color="#003366" /> My Dashboard</Link>
                                            <Link role="menuitem" to="/resources" onClick={() => setUserMenuOpen(false)} className="nb-dd-item"><BookOpen size={15} color="#003366" /> Research &amp; Resources</Link>
                                            <div style={{ height: '1px', background: '#f1f5f9' }} />
                                        </>)}
                                        <Link role="menuitem" to="/profile" onClick={() => setUserMenuOpen(false)} className="nb-dd-item"><User size={15} color="#64748b" /> My Profile</Link>
                                        <div style={{ height: '1px', background: '#f1f5f9' }} />
                                        <button role="menuitem" onClick={handleLogout} className="nb-dd-item nb-dd-danger"><LogOut size={15} /> Sign Out</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="nb-hamburger"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'transparent', border: '1.5px solid #cbd5e1',
                                    borderRadius: '8px', cursor: 'pointer',
                                    padding: '0 0.875rem', height: '38px',
                                    color: '#003366', fontWeight: '600', fontSize: '0.83rem',
                                    fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
                                    width: 'auto',
                                }}
                            >
                                Sign In
                            </button>
                        )}

                        {/* ── Hamburger toggle ── */}
                        <button
                            onClick={() => setMobileOpen(o => !o)}
                            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={mobileOpen}
                            aria-controls="mobile-nav"
                            className="nb-hamburger"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: mobileOpen ? '#f1f5f9' : 'white',
                                border: '1px solid #e2e8f0', borderRadius: '8px',
                                cursor: 'pointer', width: '42px', height: '42px', flexShrink: 0,
                                position: 'relative', zIndex: 1001,
                                transition: 'background 0.15s',
                            }}
                        >
                            {mobileOpen ? <X size={20} color="#003366" /> : <Menu size={20} color="#003366" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* ══════════════ SIDE DRAWER ══════════════ */}
            {mobileOpen && (
                <div id="mobile-nav" className="nb-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">

                    {/* Scrollable body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.75rem 1rem' }}>

                        {/* User card if logged in */}
                        {isLoggedIn && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', background: '#f8fafc', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: role.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.875rem', fontWeight: '700' }}>
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                                    <span style={{ fontSize: '0.6rem', fontWeight: '700', background: role.bg, color: 'white', padding: '1px 7px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {role.text}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Section label */}
                        <p style={{ margin: '0 0 0.25rem 0.25rem', fontSize: '0.62rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pages</p>

                        {/* Nav links */}
                        <nav aria-label="Mobile navigation">
                            {PUBLIC_NAV.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link key={item.path} to={item.path} onClick={handleNavClick}
                                        className={`nb-mob-link${isActive(item.path) ? ' nb-active' : ''}`}>
                                        <span className="nb-mob-icon"><Icon size={16} strokeWidth={1.9} /></span>
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Admin section */}
                        {adminUser && (
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                                <p style={{ margin: '0 0 0.25rem 0.25rem', fontSize: '0.62rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Admin</p>
                                <Link to="/admin-dashboard" onClick={handleNavClick}
                                    className={`nb-mob-link nb-mob-admin${isActive('/admin-dashboard') ? ' nb-active' : ''}`}>
                                    <span className="nb-mob-icon" style={{ color: '#6D28D9' }}><Shield size={16} strokeWidth={1.9} /></span>
                                    Admin Dashboard
                                </Link>
                                <Link to="/user/dashboard" onClick={handleNavClick}
                                    className={`nb-mob-link nb-mob-admin${isActive('/user/dashboard') ? ' nb-active' : ''}`}>
                                    <span className="nb-mob-icon" style={{ color: '#6D28D9' }}><LayoutDashboard size={16} strokeWidth={1.9} /></span>
                                    Dashboard
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Footer auth actions */}
                    <div style={{ padding: '0.875rem 0.75rem calc(0.875rem + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
                        {isLoggedIn ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <Link to="/profile" onClick={handleNavClick}
                                    style={{ flex: 1, padding: '0.7rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#374151', fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontFamily: 'var(--font-sans)' }}>
                                    <User size={14} /> Profile
                                </Link>
                                <button onClick={handleLogout}
                                    style={{ flex: 1, padding: '0.7rem', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#DC2626', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                    <LogOut size={14} /> Sign Out
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => { navigate('/login'); setMobileOpen(false); }}
                                    style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1.5px solid #cbd5e1', borderRadius: '10px', color: '#003366', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}>
                                    Sign In
                                </button>
                                <button onClick={() => { navigate('/membership'); setMobileOpen(false); }}
                                    style={{ flex: 1, padding: '0.75rem', background: '#003366', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(0,51,102,0.22)' }}>
                                    Join Council
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;