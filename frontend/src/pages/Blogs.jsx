import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenSquare, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { getBlogs } from '../api/blogs.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import Pagination from '../components/common/Pagination.jsx';
import { colors } from '../components/chapterLead/ui.jsx';
import { BlogGrid } from '../components/blog/BlogCard.jsx';

const PAGE_SIZE = 9;

/** Public blog index: published blogs written by Chapter Leads and Ambassadors. */
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

    // On the first page of an unfiltered list with at least three blogs, the newest one is featured (two columns wide).
    const feature = page === 1 && !query && blogs.length >= 3;

    return (
        <div style={{ background: '#F8FAFC', minHeight: '100vh', paddingBottom: '3rem' }}>
            {/* Hero: same treatment as About and the other content pages (gradient + two soft circles) */}
            <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 60%,#005599 100%)', padding: 'clamp(1.5rem,2.5vw,2rem) 0', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
                <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 clamp(0.75rem,1.6vw,1rem)', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>
                    <h1 style={{ margin: '0 0 0.6rem', fontSize: 'clamp(1.75rem,5vw,2.75rem)', fontWeight: 800, color: 'white', fontFamily: 'var(--font-serif)' }}>Insights from our chapter teams</h1>
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
                        <BlogGrid blogs={blogs} feature={feature} />
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
