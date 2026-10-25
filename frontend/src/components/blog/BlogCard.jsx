import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpenText, ArrowRight, Clock } from 'lucide-react';
import { colors, fmtDate } from '../chapterLead/ui.jsx';

/**
 * Blog cards that stay the same size however many blogs there are:
 *   - every card has the same picture shape and the same amount of text (title 3 lines, summary 2),
 *   - three to a row on a wide screen, two on a tablet, one on a phone,
 *   - with three or more blogs the newest one ("featured") takes two columns, picture beside the words,
 *     and still matches the height of the cards next to it.
 * The grid has a fixed number of columns (not "as many as fit"), so one or two blogs never stretch to the full width.
 */
const CSS = `
    .bl-grid { display: grid; gap: 1.4rem; grid-template-columns: minmax(0, 1fr); }
    @media (min-width: 640px)  { .bl-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .bl-grid .span-2 { grid-column: 1 / -1; } }
    @media (min-width: 1000px) { .bl-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .bl-grid .span-2 { grid-column: span 2; } }

    .bc, .bc:hover, .bc:focus { text-decoration: none !important; }
    .bc { background: white; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; min-width: 0;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04); transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; color: inherit; }
    .bc:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,51,102,0.12); border-color: #BFDBFE; }
    .bc:focus-visible { outline: 2px solid #1D4ED8; outline-offset: 2px; }
    .bc-cover { overflow: hidden; background: #0F172A; aspect-ratio: 16 / 9; flex-shrink: 0; position: relative; }
    .bc-cover img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .35s ease; }
    .bc:hover .bc-cover img { transform: scale(1.04); }
    .bc-title { transition: color .15s ease; }
    .bc:hover .bc-title { color: #003366; }
    .bc-more { color: #003366; font-weight: 800; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
    .bc-more svg { transition: transform .15s ease; }
    .bc:hover .bc-more svg { transform: translateX(3px); }
    @media (min-width: 640px) {
        .bc.featured { flex-direction: row; }
        .bc.featured .bc-cover { flex: 0 0 46%; aspect-ratio: auto; min-height: 240px; }
    }
    @media (prefers-reduced-motion: reduce) {
        .bc, .bc-cover img, .bc-more svg, .bc-title { transition: none !important; }
        .bc:hover, .bc:hover .bc-cover img, .bc:hover .bc-more svg { transform: none; }
    }
`;

export const BlogCardStyles = () => <style>{CSS}</style>;

const Author = ({ blog }) => (blog.author_photo ? (
    <img src={blog.author_photo} alt="" loading="lazy" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
) : (
    <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: '50%', background: colors.primary, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', flexShrink: 0 }}>
        {blog.author_name?.charAt(0).toUpperCase() || '?'}
    </span>
));

const clamp = (lines) => ({ display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' });

/** One published blog as a card. `featured` puts the picture beside the words (used for the newest, spanning two columns). */
export const BlogCard = ({ blog, featured = false }) => (
    <Link to={`/blog/${blog.slug}`} className={`bc${featured ? ' featured span-2' : ''}`}>
        <div className="bc-cover">
            {blog.cover_url ? (
                <img src={blog.cover_url} alt="" loading="lazy" />
            ) : (
                <div style={{ width: '100%', height: '100%', background: '#003366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpenText size={featured ? 48 : 36} color="rgba(255,255,255,0.4)" aria-hidden="true" />
                </div>
            )}
            {featured && (
                <span style={{ position: 'absolute', top: 12, left: 12, background: 'white', color: colors.primary, fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px', borderRadius: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                    Latest
                </span>
            )}
        </div>
        <div style={{ padding: featured ? 'clamp(1.1rem,2vw,1.5rem)' : '1rem 1.1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
            <h2 className="bc-title" style={{ margin: 0, fontSize: featured ? 'clamp(1.3rem,2vw,1.7rem)' : '1.06rem', fontWeight: 800, color: colors.text, lineHeight: 1.3, letterSpacing: '-0.01em', ...clamp(3) }}>
                {blog.title}
            </h2>
            {blog.summary && <p style={{ margin: 0, fontSize: featured ? '0.95rem' : '0.88rem', color: colors.muted, lineHeight: 1.65, ...clamp(featured ? 5 : 2) }}>{blog.summary}</p>}
            <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <Author blog={blog} />
                    <span style={{ minWidth: 0, lineHeight: 1.35 }}>
                        <span style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{blog.author_name}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: colors.faint, whiteSpace: 'nowrap' }}>
                            {fmtDate(blog.published_at)}
                            {blog.read_minutes > 0 && <><span aria-hidden="true">·</span><Clock size={11} aria-hidden="true" /> {blog.read_minutes} min</>}
                        </span>
                    </span>
                </span>
                <span className="bc-more">Read <ArrowRight size={14} aria-hidden="true" /></span>
            </div>
        </div>
    </Link>
);

/** The blogs in the grid above. With three or more, the first is featured. */
export const BlogGrid = ({ blogs, feature = false }) => (
    <>
        <BlogCardStyles />
        <div className="bl-grid">
            {blogs.map((b, i) => <BlogCard key={b.id} blog={b} featured={feature && i === 0} />)}
        </div>
    </>
);

export default BlogCard;
