import React, { useEffect, useState, useCallback } from 'react';
import { Check, X, Eye, Loader2 } from 'lucide-react';
import { adminListBlogs, adminReviewBlog } from '../../../api/blogs.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Card, Pill, Empty, Button, fieldStyle, fmtDate, fmtNumber } from '../../chapterLead/ui.jsx';
import { ErrorNote, Spinner } from './shared.jsx';

const FILTERS = [
    { key: 'pending', label: 'To review' },
    { key: 'published', label: 'Published' },
    { key: 'rejected', label: 'Sent back' },
    { key: '', label: 'All submitted' },
];

const STATUS = {
    pending: { tone: 'amber', label: 'To review' },
    published: { tone: 'green', label: 'Published' },
    rejected: { tone: 'red', label: 'Sent back' },
    draft: { tone: 'gray', label: 'Draft' },
};

/** Review queue for Chapter Lead blogs. Only published blogs count toward goals. */
const BlogReview = ({ showToast, onChanged }) => {
    const [filter, setFilter] = useState('pending');
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [notes, setNotes] = useState({});
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await adminListBlogs(filter || undefined);
            setRows(res.data?.data || []);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, [filter]);

    useEffect(() => { setRows(null); load(); }, [load]);

    const review = async (b, status) => {
        const note = (notes[b.id] || '').trim();
        if (status === 'rejected' && !note) {
            showToast?.('Please add a note so the author knows what to change.', 'warning');
            return;
        }
        setBusyId(b.id);
        try {
            await adminReviewBlog(b.id, status, note || undefined);
            showToast?.(status === 'published' ? 'Blog published.' : 'Blog sent back to the author.', 'success');
            await load();
            onChanged?.();
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FILTERS.map((f) => (
                    <button key={f.key || 'all'} type="button" onClick={() => setFilter(f.key)}
                        style={{ padding: '0.35rem 0.9rem', borderRadius: 100, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            border: `1.5px solid ${filter === f.key ? colors.primary : colors.border}`, background: filter === f.key ? '#EEF4FF' : 'white', color: filter === f.key ? colors.primary : colors.muted }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}
            {!rows && !error && <Spinner />}
            {rows && rows.length === 0 && <Card><Empty>No blogs here.</Empty></Card>}
            {rows && rows.map((b) => {
                const st = STATUS[b.status] || STATUS.draft;
                return (
                    <Card key={b.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                                    <Pill tone={st.tone}>{st.label}</Pill>
                                    <span style={{ fontSize: '0.74rem', color: colors.faint }}>{fmtNumber(b.body_chars)} characters{b.status === 'published' ? ` · ${fmtNumber(b.views)} views` : ''}</span>
                                </div>
                                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: colors.text }}>{b.title}</div>
                                <div style={{ fontSize: '0.78rem', color: colors.muted, marginTop: 2 }}>
                                    {b.author_name} · updated {fmtDate(b.updated_at)}{b.published_at ? ` · published ${fmtDate(b.published_at)}` : ''}
                                </div>
                                {b.summary && <p style={{ margin: '0.5rem 0 0', fontSize: '0.84rem', color: '#334155', lineHeight: 1.6 }}>{b.summary}</p>}
                                {b.admin_notes && b.status !== 'pending' && <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: colors.muted }}>Reviewer note: {b.admin_notes}</p>}
                            </div>
                            <div>
                                <a href={`/blog/${b.slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                    <Button small tone="ghost"><Eye size={13} /> Read it</Button>
                                </a>
                            </div>
                        </div>

                        {b.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: '0.9rem' }}>
                                <input
                                    value={notes[b.id] || ''}
                                    onChange={(e) => setNotes((p) => ({ ...p, [b.id]: e.target.value }))}
                                    placeholder="Feedback for the author (required to send back)"
                                    maxLength={1000}
                                    style={{ ...fieldStyle, flex: '1 1 260px', width: 'auto' }}
                                    disabled={busyId === b.id}
                                />
                                <Button tone="success" disabled={busyId === b.id} onClick={() => review(b, 'published')}>
                                    {busyId === b.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />} Publish
                                </Button>
                                <Button tone="ghost" disabled={busyId === b.id} onClick={() => review(b, 'rejected')}><X size={14} /> Send back</Button>
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
};

export default BlogReview;
