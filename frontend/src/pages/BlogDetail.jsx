import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUp, Clock, Loader2, Linkedin, Info } from 'lucide-react';
import { getBlogBySlug } from '../api/blogs.js';
import { trackView } from '../api/views.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import BlogBody from '../components/chapterLead/BlogBody.jsx';
import { outlineOf, countWords, readingMinutes } from '../components/chapterLead/blogText.js';
import ReadingProgress from '../components/blog/ReadingProgress.jsx';
import BlogOutline from '../components/blog/BlogOutline.jsx';
import ShareBar from '../components/blog/ShareBar.jsx';
import RelatedBlogs from '../components/blog/RelatedBlogs.jsx';
import { colors, Pill, fmtDate } from '../components/chapterLead/ui.jsx';

const STATUS_NOTE = {
    draft: 'This blog is a draft and is only visible to you.',
    pending: 'This blog is waiting for admin review and is not public yet.',
    rejected: 'This blog was not published. See the reviewer notes below.',
};

// The cover sits beside the title instead of above it, so the first screen already has the title, the author
// and the start of the picture. The text column is wider than before, with the outline and sharing in a rail.
const CSS = `
    .bd-wrap { max-width: 1260px; margin: 0 auto; padding: 0 clamp(1rem, 3vw, 2rem); box-sizing: border-box; }
    .bd-header { background: #F8FAFC; border-bottom: 1px solid #E2E8F0; padding: 1.2rem 0 2.1rem; }
    .bd-head-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap: clamp(1.25rem, 3vw, 2.5rem); align-items: center; }
    .bd-head-grid.plain { grid-template-columns: minmax(0, 860px); }
    .bd-cover { border-radius: 16px; overflow: hidden; aspect-ratio: 16 / 10; background: #0F172A; box-shadow: 0 10px 30px rgba(0, 51, 102, 0.14); }
    .bd-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .bd-body-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2.5rem; padding-top: 2.25rem; }
    .bd-rail { display: none; }
    .bd-share-inline { display: block; margin-top: 2rem; }
    @media (min-width: 1080px) {
        .bd-body-grid { grid-template-columns: minmax(0, 820px) 290px; justify-content: center; }
        .bd-rail { display: block; position: sticky; top: 92px; align-self: start; max-height: calc(100vh - 110px); overflow-y: auto; }
        .bd-share-inline { display: none; }
    }
    @media (max-width: 860px) {
        .bd-head-grid { grid-template-columns: minmax(0, 1fr); }
        .bd-cover { order: -1; aspect-ratio: 16 / 9; }
    }
`;

const Avatar = ({ blog, size = 44 }) => (blog.author_photo ? (
    <img src={blog.author_photo} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
) : (
    <div aria-hidden="true" style={{ width: size, height: size, borderRadius: '50%', background: colors.primary, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
        {blog.author_name?.charAt(0).toUpperCase() || '?'}
    </div>
));

/** A single published blog. The author and admins can also preview unpublished ones. */
const BlogDetail = () => {
    const { slug } = useParams();
    const articleRef = useRef(null);
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        window.scrollTo(0, 0);
        getBlogBySlug(slug)
            .then((res) => {
                if (cancelled) return;
                const b = res.data?.data;
                setBlog(b);
                setError('');
                document.title = `${b.title} | Risk AI Council`;
                // Only public reads count as views.
                if (b.status === 'published') trackView('blog', b.id);
            })
            .catch((err) => { if (!cancelled) setError(err?.response?.status === 404 ? 'This blog could not be found.' : getErrorMessage(err)); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [slug]);

    // The site sets overflow-x: hidden on <body>, which turns the body into a scroll container and stops anything
    // from sticking (this page's outline, and the navbar's own "sticky"). `clip` hides sideways overflow just the
    // same without being a scroll container. Only this page opts in; the previous value comes back on leaving.
    useEffect(() => {
        const previous = document.body.style.overflowX;
        document.body.style.overflowX = 'clip';
        return () => { document.body.style.overflowX = previous; };
    }, []);

    const outline = useMemo(() => outlineOf(blog?.body), [blog?.body]);
    const minutes = useMemo(() => readingMinutes(countWords(blog?.body)), [blog?.body]);

    if (loading) {
        return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={28} className="kit-spin" color={colors.faint} /></div>;
    }
    if (error || !blog) {
        return (
            <div style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '2rem', textAlign: 'center' }}>
                <p style={{ margin: 0, color: colors.muted, fontSize: '1rem' }}>{error || 'This blog could not be found.'}</p>
                <Link to="/blog" style={{ color: colors.primary, fontWeight: 700 }}>Back to all blogs</Link>
            </div>
        );
    }

    const published = blog.status === 'published';
    const toTop = () => window.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const byline = [blog.author_org, published ? fmtDate(blog.published_at) : null].filter(Boolean).join(' · ');

    return (
        <article ref={articleRef} style={{ background: 'white', minHeight: '100vh', paddingBottom: '4rem' }}>
            <style>{CSS}</style>
            <ReadingProgress targetRef={articleRef} />

            <header className="bd-header">
                <div className="bd-wrap">
                    <Link to="/blog" className="kit-focus" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: colors.muted, fontSize: '0.84rem', fontWeight: 700, textDecoration: 'none', marginBottom: '1.1rem' }}>
                        <ArrowLeft size={14} aria-hidden="true" /> All blogs
                    </Link>

                    {!published && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.2rem', color: '#92400E', fontSize: '0.84rem', lineHeight: 1.55 }}>
                            <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                            <div>
                                <Pill tone="amber">Preview</Pill>{' '}
                                {STATUS_NOTE[blog.status] || 'This blog is not published.'}
                                {blog.admin_notes && <div style={{ marginTop: 6 }}><strong>Reviewer notes:</strong> {blog.admin_notes}</div>}
                            </div>
                        </div>
                    )}

                    <div className={`bd-head-grid${blog.cover_url ? '' : ' plain'}`}>
                        <div style={{ minWidth: 0 }}>
                            <h1 style={{ margin: '0 0 0.8rem', fontSize: 'clamp(1.8rem, 3.6vw, 2.7rem)', fontWeight: 800, color: colors.text, lineHeight: 1.18, letterSpacing: '-0.02em' }}>
                                {blog.title}
                            </h1>
                            {blog.summary && <p style={{ margin: '0 0 1.3rem', fontSize: '1.12rem', color: colors.muted, lineHeight: 1.6 }}>{blog.summary}</p>}

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Avatar blog={blog} />
                                <div style={{ lineHeight: 1.4, minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, color: colors.text, fontSize: '0.94rem' }}>{blog.author_name}</div>
                                    <div style={{ fontSize: '0.8rem', color: colors.muted, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                        {byline && <span>{byline}</span>}
                                        {minutes > 0 && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: colors.primary }}>
                                                <Clock size={13} aria-hidden="true" /> {minutes} min read
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {blog.cover_url && <div className="bd-cover"><img src={blog.cover_url} alt="" /></div>}
                    </div>
                </div>
            </header>

            <div className="bd-wrap bd-body-grid">
                <div style={{ minWidth: 0 }}>
                    <BlogBody text={blog.body} />

                    <div className="bd-share-inline"><ShareBar title={blog.title} label="Share this blog" /></div>

                    {blog.author_bio && (
                        <aside aria-label="About the author" style={{ marginTop: '2.5rem', padding: '1.25rem 1.4rem', background: '#F8FAFC', border: `1px solid ${colors.border}`, borderRadius: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                            <Avatar blog={blog} size={56} />
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>About the author</div>
                                <div style={{ fontWeight: 800, color: colors.text, fontSize: '1.02rem' }}>{blog.author_name}</div>
                                {blog.author_org && <div style={{ fontSize: '0.8rem', color: colors.muted }}>{blog.author_org}</div>}
                                <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: colors.muted, lineHeight: 1.65 }}>{blog.author_bio}</p>
                                {/^https?:\/\//i.test(blog.author_linkedin || '') && (
                                    <a href={blog.author_linkedin} target="_blank" rel="noopener noreferrer" className="kit-focus" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#0077B5', fontWeight: 700, fontSize: '0.84rem', textDecoration: 'none' }}>
                                        <Linkedin size={14} aria-hidden="true" /> LinkedIn
                                    </a>
                                )}
                            </div>
                        </aside>
                    )}
                </div>

                <aside className="bd-rail" aria-label="Reading tools">
                    <div style={{ display: 'grid', gap: '1.6rem' }}>
                        <BlogOutline items={outline} />
                        <ShareBar title={blog.title} />
                        <button type="button" onClick={toTop} className="kit-focus" style={{ justifySelf: 'start', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: colors.muted, fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)' }}>
                            <ArrowUp size={14} aria-hidden="true" /> Back to top
                        </button>
                    </div>
                </aside>
            </div>

            {published && <div className="bd-wrap"><RelatedBlogs currentId={blog.id} /></div>}
        </article>
    );
};

export default BlogDetail;
