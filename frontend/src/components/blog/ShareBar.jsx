import React, { useState } from 'react';
import { Link2, Check, Linkedin, Mail, Share2 } from 'lucide-react';
import { colors } from '../chapterLead/ui.jsx';

const button = (on) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.45rem 0.85rem', borderRadius: 9, fontWeight: 700, fontSize: '0.8rem',
    cursor: 'pointer', fontFamily: 'var(--font-sans)', textDecoration: 'none', whiteSpace: 'nowrap',
    border: `1.5px solid ${on ? colors.green : '#CBD5E1'}`, background: on ? '#ECFDF5' : 'white', color: on ? '#047857' : colors.text,
});

/** Copy link, LinkedIn, email and (on phones) the system share sheet, for the page it sits on. */
const ShareBar = ({ title, label = 'Share' }) => {
    const [copied, setCopied] = useState(false);
    const url = typeof window !== 'undefined' ? window.location.href : '';

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* the link is also in the address bar */ }
    };

    return (
        <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{label}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={copy} className="kit-btn kit-focus" style={button(copied)} aria-live="polite">
                    {copied ? <><Check size={14} aria-hidden="true" /> Link copied</> : <><Link2 size={14} aria-hidden="true" /> Copy link</>}
                </button>
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="kit-btn kit-focus" style={button(false)}>
                    <Linkedin size={14} aria-hidden="true" /> LinkedIn
                </a>
                <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n\n${url}`)}`} className="kit-btn kit-focus" style={button(false)}>
                    <Mail size={14} aria-hidden="true" /> Email
                </a>
                {typeof navigator !== 'undefined' && navigator.share && (
                    <button type="button" onClick={() => navigator.share({ title, url }).catch(() => {})} className="kit-btn kit-focus" style={button(false)}>
                        <Share2 size={14} aria-hidden="true" /> More
                    </button>
                )}
            </div>
        </div>
    );
};

export default ShareBar;
