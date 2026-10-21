import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Loader2, Eye, Heart, MessageCircle, Bookmark, Users, Plus, Play, Pencil, Trash2 } from 'lucide-react';
import { getLeadPerformance } from '../../api/chapterLead.js';
import { deleteBlog } from '../../api/blogs.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import { colors, Card, SectionTitle, Pill, Empty, Table, Td, Button, fmtDate, fmtNumber } from './ui.jsx';

const TABS = [
    { key: 'posts', label: 'Posts' },
    { key: 'podcasts', label: 'Podcasts' },
    { key: 'workshops', label: 'Workshops' },
    { key: 'blogs', label: 'Blogs' },
];

const POST_TYPE = { general: 'General', ai_product: 'AI product', event: 'Event', troubleshooting: 'Troubleshooting', poll: 'Poll', tech_meme: 'Meme' };

const Metric = ({ icon: Icon, value, title }) => (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: colors.muted }}>
        <Icon size={12} />{fmtNumber(value)}
    </span>
);

const sessionStatus = (s) => {
    if (s.conducted_at) return <Pill tone="green">Conducted</Pill>;
    if (!s.is_published) return <Pill tone="amber">Draft — awaiting publish</Pill>;
    if (new Date(s.date) > new Date()) return <Pill tone="blue">Scheduled</Pill>;
    return <Pill tone="purple" title="Held, but an admin has not marked it conducted yet">Awaiting admin to mark conducted</Pill>;
};

const BLOG_STATUS = {
    draft:     { tone: 'gray',   label: 'Draft' },
    pending:   { tone: 'amber',  label: 'Under review' },
    published: { tone: 'green',  label: 'Published' },
    rejected:  { tone: 'red',    label: 'Needs changes' },
};

/** What the lead has produced, with the numbers that show how it performed. */
const PerformancePanel = ({ showToast, onChanged }) => {
    const navigate = useNavigate();
    const [tab, setTab] = useState('posts');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await getLeadPerformance();
            setData(res.data?.data);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteBlog(toDelete.id);
            showToast?.('Blog deleted.', 'success');
            setToDelete(null);
            await load();
            onChanged?.();
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Card>
            <SectionTitle
                icon={BarChart3}
                right={data && <span style={{ fontSize: '0.74rem', color: colors.faint }}>Counted items are for {data.quarter}</span>}
            >
                Content performance
            </SectionTitle>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        style={{
                            padding: '0.4rem 0.95rem', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                            border: `1.5px solid ${tab === t.key ? colors.primary : colors.border}`,
                            background: tab === t.key ? '#EEF4FF' : 'white', color: tab === t.key ? colors.primary : colors.muted,
                            fontFamily: 'var(--font-sans)',
                        }}
                    >
                        {t.label}{data ? ` (${data[t.key].length})` : ''}
                    </button>
                ))}
            </div>

            {!data && !error && <div style={{ padding: '1.2rem', textAlign: 'center' }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} color={colors.faint} /></div>}
            {error && <Empty>{error}</Empty>}

            {data && tab === 'posts' && (
                data.posts.length === 0 ? <Empty>You have not posted yet. Share an update in the Community Feed.</Empty> : (
                    <Table minWidth={680} columns={[{ label: 'Posted' }, { label: 'Type' }, { label: 'Post' }, { label: 'Status' }, { label: 'Engagement' }]}>
                        {data.posts.map((p) => (
                            <tr key={p.id}>
                                <Td muted>{fmtDate(p.created_at)}</Td>
                                <Td muted>{POST_TYPE[p.post_type] || p.post_type}</Td>
                                <Td style={{ maxWidth: 280 }}>
                                    <Link to={`/community-qna/${p.id}`} style={{ color: colors.primary, fontWeight: 600, textDecoration: 'none' }}>
                                        {p.snippet ? `${p.snippet}${p.snippet.length >= 160 ? '…' : ''}` : '(image post)'}
                                    </Link>
                                </Td>
                                <Td>
                                    {p.is_hidden ? <Pill tone="red" title="Hidden posts do not count">Hidden</Pill>
                                        : p.counted ? <Pill tone="green">Counted</Pill>
                                        : <Pill tone="gray" title="Outside this quarter, or a post type that does not count">Not counted</Pill>}
                                </Td>
                                <Td>
                                    <span style={{ display: 'inline-flex', gap: 12, fontSize: '0.78rem' }}>
                                        <Metric icon={Eye} value={p.views} title="Views" />
                                        <Metric icon={Heart} value={p.like_count} title="Likes" />
                                        <Metric icon={MessageCircle} value={p.comment_count} title="Comments" />
                                        <Metric icon={Bookmark} value={p.save_count} title="Saves" />
                                    </span>
                                </Td>
                            </tr>
                        ))}
                    </Table>
                )
            )}

            {data && (tab === 'podcasts' || tab === 'workshops') && (
                data[tab].length === 0
                    ? <Empty>No {tab} yet. Use the Requests tab to ask to host one.</Empty>
                    : (
                        <Table minWidth={680} columns={[{ label: 'Title' }, { label: 'Date' }, { label: 'Status' }, { label: 'Role' }, { label: 'Reach' }]}>
                            {data[tab].map((s) => (
                                <tr key={`${s.source || 'event'}-${s.id}`}>
                                    <Td style={{ maxWidth: 260, fontWeight: 600 }}>{s.title}</Td>
                                    <Td muted>{fmtDate(s.date)}</Td>
                                    <Td>
                                        <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                                            {sessionStatus(s)}
                                            {tab === 'podcasts' && s.counted && <Pill tone="green">Counted</Pill>}
                                        </span>
                                    </Td>
                                    <Td muted>{({ host: 'Host', co_host: 'Co-host', speaker: 'Speaker' })[s.role] || s.role}</Td>
                                    <Td>
                                        <span style={{ display: 'inline-flex', gap: 12, fontSize: '0.78rem' }}>
                                            <Metric icon={Users} value={s.registrations} title="Registrations" />
                                            <Metric icon={Eye} value={s.views} title="Page views" />
                                            {s.recording_url && <Metric icon={Play} value={s.recording_clicks} title="Recording clicks" />}
                                        </span>
                                    </Td>
                                </tr>
                            ))}
                        </Table>
                    )
            )}

            {data && tab === 'blogs' && (
                <>
                    <div style={{ marginBottom: '0.8rem' }}>
                        <Button small onClick={() => navigate('/chapter-lead/blog/new')}><Plus size={14} /> Write a blog</Button>
                    </div>
                    {data.blogs.length === 0 ? <Empty>You have not written a blog yet.</Empty> : (
                        <Table minWidth={640} columns={[{ label: 'Title' }, { label: 'Status' }, { label: 'Published' }, { label: 'Views', align: 'right' }, { label: '' }]}>
                            {data.blogs.map((b) => {
                                const st = BLOG_STATUS[b.status] || BLOG_STATUS.draft;
                                return (
                                    <tr key={b.id}>
                                        <Td style={{ maxWidth: 280 }}>
                                            {b.status === 'published'
                                                ? <Link to={`/blog/${b.slug}`} style={{ color: colors.primary, fontWeight: 600, textDecoration: 'none' }}>{b.title}</Link>
                                                : <span style={{ fontWeight: 600 }}>{b.title}</span>}
                                            {b.status === 'rejected' && b.admin_notes && (
                                                <div style={{ fontSize: '0.74rem', color: colors.red, marginTop: 2 }}>Reviewer: {b.admin_notes}</div>
                                            )}
                                        </Td>
                                        <Td>
                                            <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                                                <Pill tone={st.tone}>{st.label}</Pill>
                                                {b.counted && <Pill tone="green">Counted</Pill>}
                                            </span>
                                        </Td>
                                        <Td muted>{fmtDate(b.published_at)}</Td>
                                        <Td align="right">{fmtNumber(b.views)}</Td>
                                        <Td align="right">
                                            {b.status !== 'published' && (
                                                <span style={{ display: 'inline-flex', gap: 6 }}>
                                                    <Button small tone="ghost" onClick={() => navigate(`/chapter-lead/blog/${b.id}/edit`)}><Pencil size={12} /> Edit</Button>
                                                    <Button small tone="ghost" onClick={() => setToDelete(b)} aria-label="Delete blog"><Trash2 size={12} /></Button>
                                                </span>
                                            )}
                                        </Td>
                                    </tr>
                                );
                            })}
                        </Table>
                    )}
                </>
            )}

            <ConfirmDialog
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={confirmDelete}
                loading={deleting}
                title="Delete this blog?"
                message={toDelete ? `"${toDelete.title}" will be permanently deleted.` : ''}
                confirmLabel="Delete"
            />
        </Card>
    );
};

export default PerformancePanel;
