import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal.jsx';
import { getMyPosts } from '../../api/feed.js';
import { MessageSquare, ExternalLink } from 'lucide-react';
import { useToast } from '../../hooks/useToast.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { useNavigate } from 'react-router-dom';

const timeAgo = (dateString) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return `${weeks}w ago`;
};

const MyPostsModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const loadPosts = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await getMyPosts({ page: p, limit: 8 });
            setPosts(res.data?.data || []);
            setTotalPages(res.data?.totalPages || 1);
            setPage(p);
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (isOpen) loadPosts(1);
    }, [isOpen, loadPosts]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="My Posts" size="md">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '300px' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {[1, 2, 3].map(i => <div key={i} style={{ height: '80px', background: '#F1F5F9', borderRadius: '10px', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
                    </div>
                ) : posts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#F8FAFC', borderRadius: '12px', border: '1.5px dashed #E2E8F0', marginTop: '1rem' }}>
                        <MessageSquare size={36} style={{ opacity: 0.2, marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                        <p style={{ fontSize: '0.9rem', color: '#64748B', margin: 0 }}>You haven't published any posts yet.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {posts.map(post => (
                                <div key={post.id} onClick={() => navigate(`/community-qna/${post.id}`)} style={{ cursor: 'pointer', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', transition: 'border-color 0.2s, background 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#003366'; e.currentTarget.style.background = '#EFF6FF'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: '0 0 0.35rem', fontSize: '0.84rem', color: '#1E293B', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.content}</p>
                                        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{timeAgo(post.created_at)}</span>
                                            <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>♥ {post.like_count}</span>
                                            <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>💬 {post.comment_count}</span>
                                            <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>🔖 {post.save_count}</span>
                                            {!!post.is_hidden && <span style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: '700' }}>Hidden</span>}
                                        </div>
                                    </div>
                                    <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#003366', flexShrink: 0 }}>
                                        <ExternalLink size={13} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                                <button onClick={() => loadPosts(page - 1)} disabled={page === 1 || loading}
                                    style={{ padding: '0.4rem 0.9rem', border: '1px solid #E2E8F0', borderRadius: '7px', background: 'white', color: '#003366', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}>←</button>
                                <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center' }}>Page {page} of {totalPages}</span>
                                <button onClick={() => loadPosts(page + 1)} disabled={page === totalPages || loading}
                                    style={{ padding: '0.4rem 0.9rem', border: '1px solid #E2E8F0', borderRadius: '7px', background: 'white', color: '#003366', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>→</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};

export default MyPostsModal;
