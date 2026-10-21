import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PenSquare, Search, Loader2, BookOpenText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { getBlogs } from '../api/blogs.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import Pagination from '../components/common/Pagination.jsx';
import { colors, fmtDate } from '../components/chapterLead/ui.jsx';

const PAGE_SIZE = 9;

const BlogCard = ({ blog }) => (
    <Link
        to={`/blog/${blog.slug}`}
        style={{
            textDecoration: 'none', background: 'white', border: `1px solid ${colors.border}`, borderRadius: 14, overflow: 'hidden',
            display: 'flex', flexDirection: 'column', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', transition: 'transform 0.18s, box-shadow 0.18s',
        }}
        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,51,102,0.12)'; }}
        onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)'; }}
    >
        {blog.cover_url ? (
            <img src={blog.cover_url} alt="" loading="lazy" style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} />
        ) : (
            <div style={{ height: 170, background: 'linear-gradient(135deg,#002244,#003366 60%,#005599)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpenText size={38} color="rgba(255,255,255,0.45)" />
            </div>
        )}
        <div style={{ padding: '1rem 1.1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: colors.text, lineHeight: 1.35 }}>{blog.title}</h2>
            {blog.summary && <p style={{ margin: 0, fontSize: '0.86rem', color: colors.muted, lineHeight: 1.6 }}>{blog.summary}</p>}
            <div style={{ marginTop: 'auto', paddingTop: 6, fontSize: '0.76rem', color: colors.faint, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: colors.muted }}>{blog.author_name}</span>
                <span>·</span>
                <span>{fmtDate(blog.published_at)}</span>
            </div>
        </div>
    </Link>
);

/** Public blog index: published blogs written by Chapter Leads. */
const Blogs = () => {
    const navigate = useNavigate();
    const { isCouncilMember, isAdmin } = useAuth();
    const [blogs, setBlogs] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [q, setQ] = useState('');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => { document.title = 'Blog | Risk AI Council'; }, []);

    // Debounce the search box
    useEffect(() => {
        const t = setTimeout(() => { setQuery(q.trim()); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [q]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getBlogs({ page, limit: PAGE_SIZE, q: query || undefined });
            setBlogs(res.data?.data || []);
            setTotalPages(res.data?.totalPages || 0);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [page, query]);

    useEffect(() => { load(); }, [load]);

    const canWrite = isCouncilMember?.() || isAdmin?.();

    return (
        <div style={{ background: '#F8FAFC', minHeight: '100vh', paddingBottom: '3rem' }}>
            {/* Hero: same treatment as About and the other content pages (gradient + two soft circles) */}
            <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 60%,#005599 100%)', padding: 'clamp(1.5rem,2.5vw,2rem) 0', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
                <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 clamp(0.75rem,1.6vw,1rem)', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>
                    <h1 style={{ margin: '0 0 0.6rem', fontSize: 'clamp(1.75rem,5vw,2.75rem)', fontWeight: 800, color: 'white', fontFamily: 'var(--font-serif)' }}>Insights from our Chapter Leads</h1>
                    <p style={{ margin: 0, maxWidth: 620, fontSize: '0.98rem', color: '#CBD5E1', lineHeight: 1.65 }}>
                        Practical writing on AI governance, risk and assurance from practitioners across the Risk AI Council network.
                    </p>
                </div>
            </div>

            <div style={{ maxWidth: 1320, margin: '0 auto', padding: '1.25rem clamp(0.75rem,1.6vw,1rem) 0' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 420 }}>
                        <Search size={15} color={colors.faint} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search blogs…"
                            aria-label="Search blogs"
                            style={{ width: '100%', padding: '0.62rem 0.9rem 0.62rem 2.2rem', border: `1px solid ${colors.border}`, borderRadius: 10, fontSize: '0.88rem', boxSizing: 'border-box', fontFamily: 'var(--font-sans)', background: 'white', outline: 'none' }}
                        />
                    </div>
                    {canWrite && (
                        <button
                            type="button"
                            onClick={() => navigate('/chapter-lead/blog/new')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0.6rem 1.1rem', background: colors.primary, color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                        >
                            <PenSquare size={15} /> Write a blog
                        </button>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} color={colors.faint} /></div>
                ) : error ? (
                    <p style={{ textAlign: 'center', color: colors.red, padding: '2rem' }}>{error}</p>
                ) : blogs.length === 0 ? (
                    <p style={{ textAlign: 'center', color: colors.faint, padding: '3rem 1rem' }}>
                        {query ? 'No blogs match your search.' : 'No blogs have been published yet. Check back soon.'}
                    </p>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.25rem' }}>
                            {blogs.map((b) => <BlogCard key={b.id} blog={b} />)}
                        </div>
                        <div style={{ marginTop: '1.75rem' }}>
                            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Blogs;
