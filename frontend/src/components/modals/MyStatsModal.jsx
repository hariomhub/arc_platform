import React from 'react';
import Modal from '../common/Modal.jsx';
import { BarChart2, MessageSquare, Heart, Bookmark, FileText, CheckCircle2 } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color = '#003366', bg = '#EFF6FF' }) => (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 38, height: 38, borderRadius: '9px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={17} color={color} />
        </div>
        <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#1E293B', lineHeight: 1 }}>{value ?? '—'}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94A3B8', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
        </div>
    </div>
);

const MyStatsModal = ({ isOpen, onClose, stats, usage, user, loading }) => {
    const canPost = ['founding_member', 'council_member'].includes(user?.role);
    const isUndergrad = user?.role === 'professional' && user?.professional_sub_type === 'final_year_undergrad';
    const isPendingUpgrade = !!user?.pending_sub_type_upgrade;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="My Stats Details" size="lg">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* ── Download Usage ── */}
                <div>
                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Download Usage</p>
                    {isUndergrad ? (
                        <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '12px', padding: '1rem 1.1rem' }}>
                            <p style={{ margin: '0 0 0.4rem', fontWeight: '700', fontSize: '0.88rem', color: '#92400E' }}>🎓 Final Year Undergraduates cannot download resources.</p>
                            <p style={{ margin: '0 0 0.85rem', fontSize: '0.8rem', color: '#B45309' }}>Upgrade to Working Professional to unlock downloads.</p>
                            {isPendingUpgrade ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: '8px', padding: '0.45rem 0.9rem', fontSize: '0.8rem', color: '#065F46', fontWeight: '700' }}>
                                    <CheckCircle2 size={13} /> Upgrade request pending review
                                </div>
                            ) : null}
                        </div>
                    ) : usage ? (
                        <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1rem 1.1rem' }}>
                            {usage.unlimited ? (
                                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: '700', color: '#059669' }}>✓ Unlimited downloads (Founding Member)</p>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.84rem', fontWeight: '700', color: '#1E293B' }}>{usage.used} / {usage.limit} downloads used this month</span>
                                        <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Resets {new Date(usage.resets_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                    <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '100px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${Math.min(100, (usage.used / usage.limit) * 100)}%`, background: usage.used >= usage.limit ? '#EF4444' : usage.used >= 8 ? '#F59E0B' : '#003366', borderRadius: '100px', transition: 'width 0.4s' }} />
                                    </div>
                                    {usage.used >= usage.limit && <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#EF4444', fontWeight: '600' }}>Limit reached. Resets on the 1st of next month.</p>}
                                </>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', color: '#94A3B8', fontSize: '0.85rem' }}>
                            {loading ? 'Loading usage...' : 'No usage data available.'}
                        </div>
                    )}
                </div>

                {/* ── Post Authorship Stats (council/founding only) ── */}
                {canPost && (
                    <div>
                        <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Post Authorship</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(150px,100%),1fr))', gap: '0.75rem' }}>
                            <StatCard icon={FileText} label="Total Posts" value={stats?.total_posts} color="#003366" bg="#EFF6FF" />
                            <StatCard icon={Heart} label="Likes Received" value={stats?.total_likes_received} color="#DC2626" bg="#FEF2F2" />
                            <StatCard icon={MessageSquare} label="Comments Received" value={stats?.total_comments_received} color="#059669" bg="#ECFDF5" />
                            <StatCard icon={Bookmark} label="Saves Received" value={stats?.total_saves_received} color="#7C3AED" bg="#FAF5FF" />
                        </div>
                        {stats?.most_liked_post && (
                            <div style={{ marginTop: '0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.8rem 1rem' }}>
                                <p style={{ margin: '0 0 0.25rem', fontSize: '0.68rem', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Top Post</p>
                                <p style={{ margin: 0, fontSize: '0.83rem', color: '#1E293B', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{stats.most_liked_post.content}</p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#94A3B8' }}>{stats.most_liked_post.like_count} likes</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Community Engagement (all roles) ── */}
                <div>
                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Community Engagement</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(150px,100%),1fr))', gap: '0.75rem' }}>
                        <StatCard icon={MessageSquare} label="Comments Made" value={stats?.comments_made} color="#0369A1" bg="#EFF6FF" />
                        <StatCard icon={Heart} label="Likes Given" value={stats?.likes_given} color="#DC2626" bg="#FEF2F2" />
                        <StatCard icon={Bookmark} label="Posts Saved" value={stats?.posts_saved} color="#7C3AED" bg="#FAF5FF" />
                    </div>
                </div>

            </div>
        </Modal>
    );
};

export default MyStatsModal;
