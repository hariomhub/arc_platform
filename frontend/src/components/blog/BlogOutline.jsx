import React, { useEffect, useState } from 'react';
import { colors } from '../chapterLead/ui.jsx';

const smooth = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

/** "On this page": the article's section headings, with the one being read highlighted. */
const BlogOutline = ({ items }) => {
    const [active, setActive] = useState(items[0]?.id || '');

    useEffect(() => {
        if (!items.length) return undefined;
        const seen = new Map();
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
            const current = items.find((it) => seen.get(it.id));
            if (current) setActive(current.id);
        }, { rootMargin: '-15% 0px -70% 0px' });
        items.forEach((it) => { const el = document.getElementById(it.id); if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, [items]);

    if (items.length < 2) return null;

    return (
        <nav aria-label="On this page">
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>On this page</div>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, borderLeft: `2px solid ${colors.border}` }}>
                {items.map((it) => {
                    const on = it.id === active;
                    return (
                        <li key={it.id}>
                            <a
                                href={`#${it.id}`}
                                onClick={(e) => { e.preventDefault(); document.getElementById(it.id)?.scrollIntoView({ behavior: smooth(), block: 'start' }); setActive(it.id); }}
                                aria-current={on ? 'location' : undefined}
                                className="kit-focus"
                                style={{ display: 'block', padding: '0.38rem 0 0.38rem 0.9rem', marginLeft: -2, borderLeft: `2px solid ${on ? colors.primary : 'transparent'}`, color: on ? colors.primary : colors.muted, fontWeight: on ? 800 : 600, fontSize: '0.84rem', lineHeight: 1.4, textDecoration: 'none', transition: 'color .15s ease' }}
                            >
                                {it.title}
                            </a>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default BlogOutline;
