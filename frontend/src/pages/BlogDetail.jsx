import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Linkedin, Info } from 'lucide-react';
import { getBlogBySlug } from '../api/blogs.js';
import { trackView } from '../api/views.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import BlogBody from '../components/chapterLead/BlogBody.jsx';
import { colors, Pill, fmtDate } from '../components/chapterLead/ui.jsx';

const STATUS_NOTE = {
    draft: 'This blog is a draft and is only visible to you.',
    pending: 'This blog is waiting for admin review and is not public yet.',
    rejected: 'This blog was not published. See the reviewer notes below.',
};

/** A single published blog. The author and admins can also preview unpublished ones. */
const BlogDetail = () => {
    const { slug } = useParams();
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
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

    if (loading) {
        return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} color={colors.faint} /></div>;
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

    return (
        <article style={{ background: 'white', minHeight: '100vh', paddingBottom: '4rem' }}>
            {blog.cover_url && (
                <div style={{ maxHeight: 380, overflow: 'hidden', background: '#0F172A' }}>
                    <img src={blog.cover_url} alt="" style={{ width: '100%', maxHeight: 380, objectFit: 'cover', display: 'block' }} />
                </div>
            )}

            <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.75rem 1.1rem 0' }}>
                <Link to="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: colors.muted, fontSize: '0.84rem', fontWeight: 600, textDecoration: 'none', marginBottom: '1.2rem' }}>
                    <ArrowLeft size={14} /> All blogs
                </Link>

                {!published && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.2rem', color: '#92400E', fontSize: '0.84rem', lineHeight: 1.55 }}>
                        <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                            <Pill tone="amber">Preview</Pill>{' '}
                            {STATUS_NOTE[blog.status] || 'This blog is not published.'}
                            {blog.admin_notes && <div style={{ marginTop: 6 }}><strong>Reviewer notes:</strong> {blog.admin_notes}</div>}
                        </div>
                    </div>
                )}

                <h1 style={{ margin: '0 0 0.7rem', fontSize: 'clamp(1.7rem,4.5vw,2.5rem)', fontWeight: 800, color: colors.text, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                    {blog.title}
                </h1>
                {blog.summary && <p style={{ margin: '0 0 1.1rem', fontSize: '1.12rem', color: colors.muted, lineHeight: 1.6 }}>{blog.summary}</p>}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.9rem 0', borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, marginBottom: '1.8rem' }}>
                    {blog.author_photo ? (
                        <img src={blog.author_photo} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: colors.primary, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                            {blog.author_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                    )}
                    <div style={{ lineHeight: 1.4 }}>
                        <div style={{ fontWeight: 800, color: colors.text, fontSize: '0.92rem' }}>{blog.author_name}</div>
                        <div style={{ fontSize: '0.78rem', color: colors.faint }}>
                            {[blog.author_org, published ? fmtDate(blog.published_at) : null].filter(Boolean).join(' · ')}
                        </div>
                    </div>
                </div>

                <BlogBody text={blog.body} />

                {blog.author_bio && (
                    <div style={{ marginTop: '2.5rem', padding: '1.1rem 1.25rem', background: '#F8FAFC', border: `1px solid ${colors.border}`, borderRadius: 12 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>About the author</div>
                        <div style={{ fontWeight: 800, color: colors.text }}>{blog.author_name}</div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: colors.muted, lineHeight: 1.65 }}>{blog.author_bio}</p>
                        {/^https?:\/\//i.test(blog.author_linkedin || '') && (
                            <a href={blog.author_linkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#0077B5', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}>
                                <Linkedin size={14} /> LinkedIn
                            </a>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
};

export default BlogDetail;
