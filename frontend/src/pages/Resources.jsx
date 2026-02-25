import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    BookOpen, FileText, Package, Download, Lock,
    AlertCircle, Loader2, RefreshCw, Search, X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getResources, downloadResource } from '../api/resources.js';
import { getErrorMessage, downloadBlob } from '../utils/apiHelpers.js';
import { formatDate } from '../utils/dateFormatter.js';
import Pagination from '../components/common/Pagination.jsx';
import UpgradeModal from '../components/modals/UpgradeModal.jsx';

const TABS = [
    { key: 'framework', label: 'Framework Playbooks', icon: BookOpen, description: 'Exclusive frameworks and playbooks for paid Council members.' },
    { key: 'whitepaper', label: 'Whitepapers', icon: FileText, description: 'Research papers and industry analyses (login required).' },
    { key: 'product', label: 'Products & Tools', icon: Package, description: 'Publicly accessible product listings and tool overviews.' },
];

const FRAMEWORK_ALLOWED = ['admin', 'executive', 'paid_member', 'product_company'];

// ─── Skeleton card ──────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex justify-between items-start gap-4 mb-4">
            <div className="flex-grow">
                <div className="h-3.5 w-3/4 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-2.5 w-full bg-slate-200 rounded mb-1 animate-pulse" />
                <div className="h-2.5 w-4/5 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="w-20 h-8 bg-slate-200 rounded-md animate-pulse shrink-0" />
        </div>
        <div className="h-2 w-24 bg-slate-200 rounded animate-pulse" />
    </div>
);

// ─── Resource Card ──────────────────────────────────────────────────────────────
const ResourceCard = ({ resource, onDownload, downloading, locked }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
        <div className="flex justify-between items-start gap-4">
            <div className="flex-grow min-w-0">
                <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-snug">{resource.title}</h3>
                {resource.description && (
                    <p className="text-sm text-slate-500 leading-relaxed mb-2 line-clamp-2">{resource.description}</p>
                )}
                {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {resource.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                    </div>
                )}
                <span className="text-xs text-slate-400 mt-1 block">{formatDate(resource.created_at)}</span>
            </div>

            <button
                onClick={() => onDownload(resource)}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 text-white border-none px-3 py-2 rounded-lg font-bold text-sm cursor-pointer shrink-0 transition-opacity disabled:opacity-60 font-sans"
                style={{ background: locked ? '#94A3B8' : '#003366' }}
                aria-label={locked ? `Upgrade to download ${resource.title}` : `Download ${resource.title}`}
            >
                {downloading
                    ? <Loader2 size={14} className="animate-spin" />
                    : locked ? <Lock size={14} /> : <Download size={14} />
                }
                {locked ? 'Upgrade' : 'Download'}
            </button>
        </div>
    </div>
);

// ─── Login prompt ───────────────────────────────────────────────────────────────
const LoginPrompt = ({ message }) => (
    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
        <Lock size={40} className="mx-auto mb-4 text-slate-300" />
        <h3 className="text-slate-700 text-lg font-bold mb-2">{message}</h3>
        <div className="flex gap-3 justify-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 bg-[#003366] text-white px-5 py-2.5 rounded-md font-bold text-sm no-underline">
                Sign In
            </Link>
            <Link to="/membership" className="inline-flex items-center gap-1.5 bg-white text-[#003366] border border-[#003366] px-5 py-2.5 rounded-md font-bold text-sm no-underline">
                Join Council
            </Link>
        </div>
    </div>
);

// ─── Tab Content ─────────────────────────────────────────────────────────────────
const TabContent = ({ tabKey, user, showToast }) => {
    const [resources, setResources] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState({});
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [search, setSearch] = useState('');

    const canDownloadFramework = user && FRAMEWORK_ALLOWED.includes(user.role);
    const isLoggedIn = !!user;

    const fetchResources = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = { type: tabKey, page, limit: 12 };
            if (search.trim()) params.search = search.trim();
            const res = await getResources(params);
            const payload = res.data?.data;
            setResources(Array.isArray(payload) ? payload : (payload?.resources || []));
            setTotalPages(payload?.totalPages ?? 1);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, [tabKey, page, search]);

    useEffect(() => { fetchResources(); }, [fetchResources]);

    const handleDownload = async (resource) => {
        if (tabKey === 'framework' && !canDownloadFramework) {
            setUpgradeOpen(true);
            return;
        }
        if (tabKey === 'whitepaper' && !isLoggedIn) return;

        setDownloading((p) => ({ ...p, [resource.id]: true }));
        try {
            const res = await downloadResource(resource.id);
            downloadBlob(res.data, resource.title || 'download');
            showToast('Download started!', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDownloading((p) => ({ ...p, [resource.id]: false })); }
    };

    if (tabKey === 'whitepaper' && !isLoggedIn) return <LoginPrompt message="Login to access whitepapers and research papers." />;

    return (
        <>
            {/* Search */}
            <div className="relative mb-5 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder={`Search ${tabKey}s…`}
                    className="w-full pl-8 pr-8 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#003366] transition-colors font-sans"
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-slate-400 p-0">
                        <X size={13} />
                    </button>
                )}
            </div>

            {loading && (
                <div className="flex flex-col gap-4">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
            )}

            {error && !loading && (
                <div className="text-center py-12 text-red-500">
                    <AlertCircle size={36} className="mx-auto mb-3" />
                    <p className="mb-5">{error}</p>
                    <button onClick={fetchResources} className="inline-flex items-center gap-1.5 bg-[#003366] text-white border-none px-5 py-2.5 rounded-md cursor-pointer font-bold text-sm font-sans">
                        <RefreshCw size={13} /> Retry
                    </button>
                </div>
            )}

            {!loading && !error && resources.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                    <FileText size={40} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-400">{search ? 'No resources match your search.' : 'No resources available yet.'}</p>
                    {search && <button onClick={() => setSearch('')} className="mt-3 text-sm text-[#003366] underline border-none bg-transparent cursor-pointer font-sans">Clear search</button>}
                </div>
            )}

            {!loading && !error && resources.length > 0 && (
                <>
                    <div className="flex flex-col gap-4">
                        {resources.map((r) => (
                            <ResourceCard
                                key={r.id}
                                resource={r}
                                onDownload={handleDownload}
                                downloading={downloading[r.id]}
                                locked={tabKey === 'framework' && !canDownloadFramework}
                            />
                        ))}
                    </div>
                    {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
                </>
            )}

            <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
        </>
    );
};

// ─── Resources Page ──────────────────────────────────────────────────────────────
const Resources = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const { showToast } = useToast();

    const activeTab = searchParams.get('tab') || 'framework';
    const setTab = (key) => setSearchParams({ tab: key });

    useEffect(() => { document.title = 'Resources | ARC'; }, []);

    const activeTabData = TABS.find((t) => t.key === activeTab);

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Hero */}
            <div className="bg-gradient-to-br from-[#002244] to-[#003366] py-16 px-8 text-center">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-white text-4xl font-extrabold mb-3 font-serif">Resources Library</h1>
                    <p className="text-slate-300 text-lg leading-relaxed">
                        Access frameworks, whitepapers, and product resources curated for AI risk governance professionals.
                    </p>
                </div>
            </div>

            {/* Tab bar */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-8 flex overflow-x-auto">
                    {TABS.map(({ key, label, icon: Icon }) => {
                        const active = activeTab === key;
                        return (
                            <button key={key} onClick={() => setTab(key)}
                                className="flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap cursor-pointer border-none bg-transparent transition-colors font-sans"
                                style={{ color: active ? '#003366' : '#64748B', borderBottom: active ? '3px solid #003366' : '3px solid transparent' }}
                            >
                                <Icon size={15} /> {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-8 py-10 pb-20">
                {activeTabData && (
                    <p className="text-slate-500 text-sm mb-6">{activeTabData.description}</p>
                )}
                <TabContent key={activeTab} tabKey={activeTab} user={user} showToast={showToast} />
            </div>
        </div>
    );
};

export default Resources;