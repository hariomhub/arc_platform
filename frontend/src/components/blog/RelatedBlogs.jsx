import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getBlogs } from '../../api/blogs.js';
import { colors } from '../chapterLead/ui.jsx';
import { BlogGrid } from './BlogCard.jsx';

/** "Keep reading": up to three other published blogs, so the end of an article leads somewhere. */
const RelatedBlogs = ({ currentId }) => {
    const [blogs, setBlogs] = useState([]);

    useEffect(() => {
        let alive = true;
        getBlogs({ page: 1, limit: 4 })
            .then((res) => { if (alive) setBlogs((res.data?.data || []).filter((b) => b.id !== currentId).slice(0, 3)); })
            .catch(() => { if (alive) setBlogs([]); });
        return () => { alive = false; };
    }, [currentId]);

    if (!blogs.length) return null;

    return (
        <section aria-label="Keep reading" style={{ marginTop: '3.5rem', paddingTop: '2rem', borderTop: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: '1.1rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: colors.text }}>Keep reading</h2>
                <Link to="/blog" className="kit-focus" style={{ color: colors.primary, fontWeight: 800, fontSize: '0.86rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    All blogs <ArrowRight size={14} aria-hidden="true" />
                </Link>
            </div>
            <BlogGrid blogs={blogs} />
        </section>
    );
};

export default RelatedBlogs;
