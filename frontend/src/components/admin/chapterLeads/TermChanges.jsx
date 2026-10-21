import React, { useEffect, useState, useCallback } from 'react';
import { CalendarClock } from 'lucide-react';
import { getTermChanges } from '../../../api/adminChapterLeads.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Card, SectionTitle, Empty, Table, Td, Button, fieldStyle, fmtDate } from '../../chapterLead/ui.jsx';
import { ErrorNote, Spinner } from './shared.jsx';
import { countryName } from '../../../utils/countries.js';

/**
 * Leads whose current term is ending. Terms continue automatically into the next
 * term (and its revenue-share rate) unless the role is ended, so this list is a
 * heads-up, not a to-do. To stop a term from continuing, end the role from the lead's record.
 */
const TermChanges = ({ onOpenLead }) => {
    const [days, setDays] = useState(90);
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const res = await getTermChanges(days);
            setRows(res.data?.data || []);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, [days]);

    useEffect(() => { setRows(null); load(); }, [load]);

    return (
        <Card padded={false}>
            <div style={{ padding: '1rem 1.25rem 0.6rem' }}>
                <SectionTitle
                    icon={CalendarClock}
                    right={
                        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ ...fieldStyle, width: 'auto', padding: '0.35rem 0.6rem' }} aria-label="Look ahead">
                            <option value={30}>Next 30 days</option>
                            <option value={90}>Next 90 days</option>
                            <option value={180}>Next 180 days</option>
                            <option value={365}>Next 12 months</option>
                        </select>
                    }
                >
                    Upcoming term changes
                </SectionTitle>
                <p style={{ margin: 0, fontSize: '0.8rem', color: colors.muted, lineHeight: 1.6 }}>
                    These leads move into their next term automatically on the date shown, and their revenue-share rate changes with it.
                    To stop a lead continuing, open their record and end the role.
                </p>
            </div>
            {error && <div style={{ padding: '0 1.25rem 1rem' }}><ErrorNote>{error}</ErrorNote></div>}
            {!rows && !error && <Spinner />}
            {rows && rows.length === 0 && <Empty>No terms end in this period.</Empty>}
            {rows && rows.length > 0 && (
                <Table minWidth={680} columns={[{ label: 'Lead' }, { label: 'Chapter' }, { label: 'Term ends' }, { label: 'Moves to' }, { label: 'Rate change' }, { label: '' }]}>
                    {rows.map((r) => (
                        <tr key={r.id}>
                            <Td style={{ fontWeight: 700 }}>{r.name}</Td>
                            <Td muted>{r.chapter ? `${r.chapter.name} (${countryName(r.chapter.country_code)})` : '—'}</Td>
                            <Td>{fmtDate(r.term_ends)}</Td>
                            <Td>Term {r.next_term}</Td>
                            <Td>{r.current_rate}% → <strong>{r.next_rate}%</strong></Td>
                            <Td align="right"><Button small tone="ghost" onClick={() => onOpenLead(r.id)}>Open</Button></Td>
                        </tr>
                    ))}
                </Table>
            )}
        </Card>
    );
};

export default TermChanges;
