import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Building2, X } from 'lucide-react';

const ROLE_META = {
    founding_member: { label: 'Founding Member', color: '#7C3AED', bg: '#f5f3ff' },
    council_member:  { label: 'Council Member',  color: '#0369a1', bg: '#eff6ff' },
    professional:    { label: 'Professional',    color: '#057642', bg: '#f0fdf4' },
};

const AuthorHoverCard = ({ authorId, authorName, authorRole, authorPhoto, authorOrg, authorBio, children }) => {
    const [visible,  setVisible]  = useState(false);
    const [pos,      setPos]      = useState({ top: 0, left: 0 });
    const [pinned,   setPinned]   = useState(false); // click = pinned open
    const hideTimer  = useRef(null);
    const showTimer  = useRef(null);
    const triggerRef = useRef(null);

    const rm = ROLE_META[authorRole] || ROLE_META.professional;

    const clearTimers = () => {
        clearTimeout(hideTimer.current);
        clearTimeout(showTimer.current);
    };

    const calcPos = (el) => {
        const rect = el.getBoundingClientRect();
        const cardW = 248;
        let left = rect.left + window.scrollX;
        if (left + cardW > window.innerWidth - 12) {
            left = window.innerWidth - cardW - 12 + window.scrollX;
        }
        // Show above if not enough space below
        const spaceBelow = window.innerHeight - rect.bottom;
        const top = spaceBelow < 200
            ? rect.top + window.scrollY - 220   // approx card height
            : rect.bottom + window.scrollY + 6;
        return { top, left };
    };

    const handleMouseEnter = useCallback((e) => {
        if (pinned) return;
        clearTimers();
        const el = e.currentTarget;
        showTimer.current = setTimeout(() => {
            setPos(calcPos(el));
            setVisible(true);
        }, 200);
    }, [pinned]);

    const handleMouseLeave = useCallback(() => {
        if (pinned) return;
        clearTimers();
        hideTimer.current = setTimeout(() => setVisible(false), 150);
    }, [pinned]);

    const handleClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        clearTimers();
        if (pinned) {
            setPinned(false);
            setVisible(false);
        } else {
            const el = triggerRef.current;
            if (el) setPos(calcPos(el));
            setVisible(true);
            setPinned(true);
        }
    }, [pinned]);

    const handleCardMouseEnter = useCallback(() => {
        if (!pinned) clearTimers();
    }, [pinned]);

    const handleCardMouseLeave = useCallback(() => {
        if (!pinned) {
            clearTimers();
            hideTimer.current = setTimeout(() => setVisible(false), 150);
        }
    }, [pinned]);

    const close = useCallback(() => {
        setPinned(false);
        setVisible(false);
    }, []);

    // Close pinned card on outside click
    useEffect(() => {
        if (!pinned) return;
        const handler = (e) => {
            if (!triggerRef.current?.contains(e.target)) close();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [pinned, close]);

    // Close on scroll
    useEffect(() => {
        if (!visible) return;
        const handler = () => { if (!pinned) setVisible(false); };
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, [visible, pinned]);

    const card = visible ? (
        <div
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            style={{
                position: 'absolute',
                top: pos.top,
                left: pos.left,
                zIndex: 9999,
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)',
                width: 320,
                padding: '1.25rem',
                animation: 'ahc-in 0.15s ease both',
            }}>
            <style>{`@keyframes ahc-in { from{opacity:0;transform:translateY(-5px)scale(0.97)} to{opacity:1;transform:translateY(0)scale(1)} }`}</style>

            {/* Close button — shown when pinned */}
            {pinned && (
                <button onClick={close}
                    style={{ position:'absolute', top:8, right:8, background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:2, display:'flex', borderRadius:'50%' }}
                    onMouseOver={e => e.currentTarget.style.background='#f1f5f9'}
                    onMouseOut={e => e.currentTarget.style.background='none'}>
                    <X size={13} />
                </button>
            )}

            {/* Avatar + name */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{
                    width:42, height:42, borderRadius:'50%', flexShrink:0, overflow:'hidden',
                    background: authorPhoto ? 'transparent' : `${rm.color}22`,
                    border: `2px solid ${rm.color}33`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'1rem', fontWeight:'800', color: rm.color,
                }}>
                    {authorPhoto
                        ? <img src={authorPhoto} alt={authorName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : (authorName||'A').charAt(0).toUpperCase()
                    }
                </div>
                <div style={{ minWidth:0 }}>
                    <p style={{ margin:0, fontSize:'0.875rem', fontWeight:'700', color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {authorName}
                    </p>
                    <span style={{ display:'inline-block', fontSize:'0.6rem', fontWeight:'700', padding:'1px 7px', borderRadius:4, background:rm.bg, color:rm.color, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:2 }}>
                        {rm.label}
                    </span>
                </div>
            </div>

            {authorOrg && (
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
                    <Building2 size={11} color="#94a3b8" style={{ flexShrink:0 }} />
                    <span style={{ fontSize:'0.75rem', color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{authorOrg}</span>
                </div>
            )}

            {authorBio && (
                <p style={{ margin:0, fontSize:'0.74rem', color:'#64748b', lineHeight:'1.5', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {authorBio}
                </p>
            )}

            {!authorOrg && !authorBio && (
                <p style={{ margin:0, fontSize:'0.74rem', color:'#94a3b8', fontStyle:'italic' }}>AI Risk Council member</p>
            )}
        </div>
    ) : null;

    return (
        <>
            <span
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                style={{ display:'inline-flex', cursor:'pointer' }}>
                {children}
            </span>
            {typeof document !== 'undefined' && createPortal(card, document.body)}
        </>
    );
};

export default AuthorHoverCard;