import { useState, useEffect } from 'react';
import { Rss, RefreshCw, CheckCircle, XCircle, Eye, EyeOff, TrendingUp, Trash2 } from 'lucide-react';
import {
  getPendingNews,
  getApprovedNews,
  approveArticle,
  rejectArticle,
  bulkApproveArticles,
  bulkRejectArticles,
  deleteApprovedArticle,
  togglePublishStatus,
  toggleTrendingStatus,
  triggerNewsFetch,
  getFetchStats
} from '../api/autoNews';
import { useToast } from '../hooks/useToast';

export default function AutomatedNewsManagement() {
  const [activeView, setActiveView] = useState('pending'); // 'pending' or 'approved'
  const [pendingArticles, setPendingArticles] = useState([]);
  const [approvedArticles, setApprovedArticles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState(null);
  const { showToast } = useToast();

  // Fetch statistics
  const loadStats = async () => {
    try {
      const response = await getFetchStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load stats';
      console.error('Stats error details:', errorMsg);
    }
  };

  // Fetch pending articles
  const loadPendingNews = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getPendingNews(page, pagination.limit, searchQuery);
      setPendingArticles(response.data.articles);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Load pending news error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load pending news';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch approved articles
  const loadApprovedNews = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getApprovedNews(page, pagination.limit, searchQuery);
      setApprovedArticles(response.data.articles);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Load approved news error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load approved news';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load data based on active view
  useEffect(() => {
    if (activeView === 'pending') {
      loadPendingNews(pagination.page);
    } else {
      loadApprovedNews(pagination.page);
    }
    loadStats();
  }, [activeView, searchQuery]);

  // Handle approve single article
  const handleApprove = async (id) => {
    try {
      await approveArticle(id);
      showToast('Article approved successfully', 'success');
      loadPendingNews(pagination.page);
      loadStats();
    } catch (error) {
      showToast('Failed to approve article', 'error');
    }
  };

  // Handle reject single article
  const handleReject = async (id) => {
    try {
      await rejectArticle(id);
      showToast('Article rejected', 'success');
      loadPendingNews(pagination.page);
      loadStats();
    } catch (error) {
      showToast('Failed to reject article', 'error');
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      showToast('No articles selected', 'warning');
      return;
    }
    try {
      await bulkApproveArticles(selectedIds);
      showToast(`${selectedIds.length} articles approved`, 'success');
      setSelectedIds([]);
      loadPendingNews(pagination.page);
      loadStats();
    } catch (error) {
      showToast('Failed to approve articles', 'error');
    }
  };

  // Handle bulk reject
  const handleBulkReject = async () => {
    if (selectedIds.length === 0) {
      showToast('No articles selected', 'warning');
      return;
    }
    try {
      await bulkRejectArticles(selectedIds);
      showToast(`${selectedIds.length} articles rejected`, 'success');
      setSelectedIds([]);
      loadPendingNews(pagination.page);
      loadStats();
    } catch (error) {
      showToast('Failed to reject articles', 'error');
    }
  };

  // Handle delete approved article
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      await deleteApprovedArticle(id);
      showToast('Article deleted', 'success');
      loadApprovedNews(pagination.page);
      loadStats();
    } catch (error) {
      showToast('Failed to delete article', 'error');
    }
  };

  // Handle toggle publish status
  const handleTogglePublish = async (id) => {
    try {
      const response = await togglePublishStatus(id);
      showToast(response.message, 'success');
      loadApprovedNews(pagination.page);
    } catch (error) {
      showToast('Failed to toggle publish status', 'error');
    }
  };

  // Handle toggle trending status
  const handleToggleTrending = async (id) => {
    try {
      const response = await toggleTrendingStatus(id);
      showToast(response.message, 'success');
      loadApprovedNews(pagination.page);
    } catch (error) {
      showToast('Failed to toggle trending status', 'error');
    }
  };

  // Handle manual fetch trigger
  const handleManualFetch = async () => {
    try {
      const response = await triggerNewsFetch();
      showToast(response.message || 'News fetch triggered successfully', 'success');
      setTimeout(() => {
        loadPendingNews(1);
        loadStats();
      }, 10000); // Refresh after 10 seconds
    } catch (error) {
      console.error('Trigger fetch error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to trigger news fetch';
      showToast(errorMsg, 'error');
    }
  };

  // Toggle article selection
  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Select all visible articles
  const selectAll = () => {
    const articles = activeView === 'pending' ? pendingArticles : approvedArticles;
    const allIds = articles.map(a => a.id);
    setSelectedIds(allIds);
  };

  // Clear selection
  const clearSelection = () => setSelectedIds([]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Truncate text
  const truncate = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Shared style tokens
  const BTN = (bg, color, border) => ({
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    background: bg, color, border: `1px solid ${border}`,
    padding: '7px 14px', borderRadius: '6px', fontWeight: '600',
    fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap'
  });
  const STAT_COLORS = [
    { label: 'Total',     value: stats?.total,     color: '#003366', border: '#BFDBFE', bg: '#EFF6FF' },
    { label: 'Pending',   value: stats?.pending,   color: '#B45309', border: '#FDE68A', bg: '#FFFBEB' },
    { label: 'Approved',  value: stats?.approved,  color: '#15803D', border: '#BBF7D0', bg: '#F0FDF4' },
    { label: 'Rejected',  value: stats?.rejected,  color: '#DC2626', border: '#FECACA', bg: '#FEF2F2' },
    { label: 'Published', value: stats?.published, color: '#0369A1', border: '#BAE6FD', bg: '#F0F9FF' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '2px solid #F1F5F9' }}>
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', background: '#001f3f', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,31,63,0.18)', flexShrink: 0 }}>
            <Rss size={18} color="#60A5FA" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0F172A' }}>Automated News</h2>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>Review and approve AI-fetched news articles</p>
          </div>
        </div>
        <button onClick={handleManualFetch} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#001f3f', color: 'white', border: '1px solid #003060', padding: '8px 16px', borderRadius: '7px', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
          <RefreshCw size={14} /> Fetch Now
        </button>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          {STAT_COLORS.map(({ label, value, color, border, bg }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.9rem 1rem', borderLeft: `4px solid ${color}` }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color, opacity: 0.85 }}>{label}</div>
              <div style={{ fontSize: '1.65rem', fontWeight: '800', color, lineHeight: 1.2, marginTop: '3px' }}>{value ?? '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid #F1F5F9', gap: 0 }}>
        {[
          { key: 'pending',  label: `Pending Review (${stats?.pending ?? 0})` },
          { key: 'approved', label: `Approved (${stats?.approved ?? 0})` },
        ].map(({ key, label }) => {
          const active = activeView === key;
          return (
            <button key={key} onClick={() => setActiveView(key)}
              style={{ padding: '0.7rem 1.2rem', background: 'none', border: 'none', borderBottom: active ? '2px solid #003366' : '2px solid transparent', marginBottom: '-2px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: active ? '700' : '500', color: active ? '#003366' : '#64748B', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Search + Bulk ── */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search articles…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', color: '#1E293B', background: 'white', transition: 'border-color 0.15s' }} />
        {activeView === 'pending' && selectedIds.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#475569', background: '#F1F5F9', padding: '5px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>{selectedIds.length} selected</span>
            <button onClick={handleBulkApprove} style={BTN('#F0FDF4', '#15803D', '#BBF7D0')}><CheckCircle size={13} /> Approve All</button>
            <button onClick={handleBulkReject}  style={BTN('#FEF2F2', '#DC2626', '#FECACA')}><XCircle size={13} /> Reject All</button>
            <button onClick={clearSelection}    style={BTN('#F8FAFC', '#475569', '#E2E8F0')}>Clear</button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTopColor: '#003366', borderRadius: '50%', animation: 'an-spin 0.8s linear infinite', margin: '0 auto' }} />
          <p style={{ marginTop: '12px', color: '#64748B', fontSize: '0.875rem' }}>Loading articles…</p>
        </div>
      ) : (
        <>
          {/* Pending View */}
          {activeView === 'pending' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingArticles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
                  <p style={{ color: '#64748B', fontWeight: '600', fontSize: '0.9rem', margin: '0 0 4px' }}>No pending articles</p>
                  <p style={{ color: '#94A3B8', fontSize: '0.78rem', margin: 0 }}>New articles appear here after automated fetching</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={selectAll} style={{ fontSize: '0.78rem', color: '#003366', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Select All</button>
                  </div>
                  {pendingArticles.map((article) => (
                    <div key={article.id} style={{ background: 'white', border: `1px solid ${selectedIds.includes(article.id) ? '#003366' : '#E2E8F0'}`, borderRadius: '10px', padding: '1rem 1.2rem', boxShadow: selectedIds.includes(article.id) ? '0 0 0 3px rgba(0,51,102,0.08)' : '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.15s', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <input type="checkbox" checked={selectedIds.includes(article.id)} onChange={() => toggleSelection(article.id)}
                        style={{ width: '16px', height: '16px', marginTop: '3px', flexShrink: 0, cursor: 'pointer', accentColor: '#003366' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: '0 0 5px', fontSize: '0.9rem', fontWeight: '700', color: '#0F172A', lineHeight: 1.4 }}>{article.title}</h3>
                        <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#64748B', lineHeight: 1.6 }}>{truncate(article.summary, 200)}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '10px' }}>
                          <span>📰 {article.source}</span>
                          <span>🕐 {formatDate(article.published_at)}</span>
                          <span>📥 {formatDate(article.fetched_at)}</span>
                        </div>
                        <a href={article.article_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: '#003366', fontWeight: '600', textDecoration: 'none' }}>View Article →</a>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flexShrink: 0 }}>
                        <button onClick={() => handleApprove(article.id)} style={BTN('#F0FDF4', '#15803D', '#BBF7D0')}><CheckCircle size={12} /> Approve</button>
                        <button onClick={() => handleReject(article.id)}  style={BTN('#FEF2F2', '#DC2626', '#FECACA')}><XCircle size={12} /> Reject</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Approved View */}
          {activeView === 'approved' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {approvedArticles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
                  <p style={{ color: '#64748B', fontWeight: '600', fontSize: '0.9rem', margin: 0 }}>No approved articles yet</p>
                </div>
              ) : (
                approvedArticles.map((article) => (
                  <div key={article.id} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem 1.2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', gap: '14px', alignItems: 'flex-start', transition: 'box-shadow 0.15s' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '5px' }}>
                        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#0F172A' }}>{article.title}</h3>
                        <span style={{ padding: '2px 9px', background: article.is_published ? '#F0FDF4' : '#F8FAFC', color: article.is_published ? '#15803D' : '#64748B', border: `1px solid ${article.is_published ? '#BBF7D0' : '#E2E8F0'}`, borderRadius: '100px', fontSize: '0.68rem', fontWeight: '700', whiteSpace: 'nowrap' }}>
                          {article.is_published ? 'Published' : 'Unpublished'}
                        </span>
                        {article.is_trending && (
                          <span style={{ padding: '2px 9px', background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', borderRadius: '100px', fontSize: '0.68rem', fontWeight: '700' }}>★ Trending</span>
                        )}
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#64748B', lineHeight: 1.6 }}>{truncate(article.summary, 200)}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '8px' }}>
                        <span>📰 {article.source}</span>
                        <span>🕐 {formatDate(article.published_at)}</span>
                      </div>
                      <a href={article.article_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: '#003366', fontWeight: '600', textDecoration: 'none' }}>View Article →</a>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flexShrink: 0 }}>
                      <button onClick={() => handleTogglePublish(article.id)} style={BTN(article.is_published ? '#F8FAFC' : '#EFF6FF', article.is_published ? '#475569' : '#003366', article.is_published ? '#E2E8F0' : '#BFDBFE')}>
                        {article.is_published ? <><EyeOff size={12} /> Unpublish</> : <><Eye size={12} /> Publish</>}
                      </button>
                      <button onClick={() => handleToggleTrending(article.id)} style={BTN(article.is_trending ? '#FFFBEB' : '#F8FAFC', article.is_trending ? '#B45309' : '#64748B', article.is_trending ? '#FDE68A' : '#E2E8F0')}>
                        <TrendingUp size={12} /> {article.is_trending ? 'Untrend' : 'Trending'}
                      </button>
                      <button onClick={() => handleDelete(article.id)} style={BTN('#FEF2F2', '#DC2626', '#FECACA')}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <button onClick={() => activeView === 'pending' ? loadPendingNews(pagination.page - 1) : loadApprovedNews(pagination.page - 1)}
                disabled={pagination.page === 1}
                style={{ padding: '6px 16px', border: '1px solid #E2E8F0', borderRadius: '6px', background: 'white', color: '#475569', fontSize: '0.8rem', fontWeight: '600', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer', opacity: pagination.page === 1 ? 0.45 : 1, fontFamily: 'inherit' }}>
                ← Prev
              </button>
              <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '600' }}>Page {pagination.page} of {pagination.totalPages}</span>
              <button onClick={() => activeView === 'pending' ? loadPendingNews(pagination.page + 1) : loadApprovedNews(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                style={{ padding: '6px 16px', border: '1px solid #E2E8F0', borderRadius: '6px', background: 'white', color: '#475569', fontSize: '0.8rem', fontWeight: '600', cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer', opacity: pagination.page === pagination.totalPages ? 0.45 : 1, fontFamily: 'inherit' }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes an-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .an-article-card:hover { box-shadow: 0 3px 10px rgba(0,51,102,0.08) !important; border-color: #CBD5E1 !important; }
      `}</style>
    </div>
  );
}
