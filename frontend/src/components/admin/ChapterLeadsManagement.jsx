import React, { useEffect, useState, useCallback } from 'react';
import { Users, Inbox, FileText, Mic, MapPin, SlidersHorizontal, CalendarClock } from 'lucide-react';
import { getChapterLeadSummary } from '../../api/adminChapterLeads.js';
import LeadsOverview from './chapterLeads/LeadsOverview.jsx';
import LeadDetailModal from './chapterLeads/LeadDetailModal.jsx';
import RequestsQueue from './chapterLeads/RequestsQueue.jsx';
import BlogReview from './chapterLeads/BlogReview.jsx';
import SessionsManager from './chapterLeads/SessionsManager.jsx';
import ChaptersManager from './chapterLeads/ChaptersManager.jsx';
import PolicyManager from './chapterLeads/PolicyManager.jsx';
import TermChanges from './chapterLeads/TermChanges.jsx';

const VIEWS = [
    { key: 'leads',    label: 'Chapter Leads',  icon: Users },
    { key: 'requests', label: 'Host requests',  icon: Inbox,   badge: 'pending_requests' },
    { key: 'blogs',    label: 'Blog review',    icon: FileText, badge: 'pending_blogs' },
    { key: 'sessions', label: 'Sessions',       icon: Mic },
    { key: 'chapters', label: 'Chapters',       icon: MapPin },
    { key: 'terms',    label: 'Term changes',   icon: CalendarClock },
    { key: 'policy',   label: 'Programme rules', icon: SlidersHorizontal },
];

/**
 * Admin → "Chapter Leads" tab (founding members only).
 * One place to run the programme: see every lead's progress and standing, review
 * host requests and blogs, mark sessions as conducted, manage chapters and the
 * rules, and end a lead's role when needed.
 */
const ChapterLeadsManagement = ({ showToast }) => {
    const [view, setView] = useState('leads');
    const [openLeadId, setOpenLeadId] = useState(null);
    const [summary, setSummary] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const loadSummary = useCallback(async () => {
        try {
            const res = await getChapterLeadSummary();
            setSummary(res.data?.data || null);
        } catch {
            /* badges are a convenience — the views report their own errors */
        }
    }, []);

    useEffect(() => { loadSummary(); }, [loadSummary, refreshKey]);

    // Anything that changes the programme data refreshes the counts and the overview.
    const changed = useCallback(() => setRefreshKey((k) => k + 1), []);

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            <div role="tablist" aria-label="Chapter Leads sections" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {VIEWS.map(({ key, label, icon: Icon, badge }) => {
                    const active = view === key;
                    const count = badge && summary ? summary[badge] : 0;
                    return (
                        <button
                            key={key}
                            role="tab"
                            aria-selected={active}
                            type="button"
                            onClick={() => setView(key)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0.5rem 0.95rem', borderRadius: 10,
                                fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                border: `1.5px solid ${active ? '#003366' : '#E2E8F0'}`,
                                background: active ? '#003366' : 'white', color: active ? 'white' : '#475569',
                            }}
                        >
                            <Icon size={14} />
                            {label}
                            {count > 0 && (
                                <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 100, background: active ? 'white' : '#DC2626', color: active ? '#003366' : 'white', fontSize: '0.68rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {view === 'leads' && <LeadsOverview showToast={showToast} onOpenLead={setOpenLeadId} onJump={setView} refreshKey={refreshKey} />}
            {view === 'requests' && <RequestsQueue showToast={showToast} onChanged={changed} />}
            {view === 'blogs' && <BlogReview showToast={showToast} onChanged={changed} />}
            {view === 'sessions' && <SessionsManager showToast={showToast} onChanged={changed} />}
            {view === 'chapters' && <ChaptersManager showToast={showToast} onChanged={changed} />}
            {view === 'terms' && <TermChanges onOpenLead={setOpenLeadId} />}
            {view === 'policy' && <PolicyManager showToast={showToast} />}

            {openLeadId && (
                <LeadDetailModal
                    leadId={openLeadId}
                    onClose={() => setOpenLeadId(null)}
                    onChanged={changed}
                    showToast={showToast}
                />
            )}
        </div>
    );
};

export default ChapterLeadsManagement;
