import React from 'react';
import { History } from 'lucide-react';
import { colors, Card, SectionTitle, Pill, Empty, Table, Td, quarterLabel } from './ui.jsx';

// "12 / 20" with the cell tinted when that goal was met.
const Cell = ({ actual, target }) => {
    const met = Number(actual) >= Number(target);
    return (
        <Td align="center" style={{ color: met ? colors.green : colors.text, fontWeight: met ? 700 : 500 }}>
            {actual} <span style={{ color: colors.faint, fontWeight: 400 }}>/ {target}</span>
        </Td>
    );
};

/** Past quarter results, newest first. Shared by the lead dashboard and the admin lead detail. */
const QuarterHistory = ({ quarters = [], title = 'Quarter history' }) => (
    <Card>
        <SectionTitle icon={History}>{title}</SectionTitle>
        {quarters.length === 0 ? (
            <Empty>No quarter has been scored yet. Results appear here a day after each quarter ends.</Empty>
        ) : (
            <Table
                minWidth={620}
                columns={[
                    { label: 'Quarter' }, { label: 'Result' }, { label: 'Goals met', align: 'center' },
                    { label: 'Members', align: 'center' }, { label: 'Podcasts', align: 'center' },
                    { label: 'Posts', align: 'center' }, { label: 'Blogs', align: 'center' },
                ]}
            >
                {quarters.map((q) => (
                    <tr key={q.id}>
                        <Td style={{ fontWeight: 700 }}>{quarterLabel(q.quarter_start)}</Td>
                        <Td>
                            {q.status === 'waived'
                                ? <Pill tone="gray" title={q.notes || undefined}>Not scored</Pill>
                                : q.met ? <Pill tone="green">Met</Pill> : <Pill tone="red">Not met</Pill>}
                        </Td>
                        <Td align="center">{q.status === 'waived' ? '—' : `${q.goals_met} / 4`}</Td>
                        <Cell actual={q.members_actual} target={q.members_target} />
                        <Cell actual={q.podcasts_actual} target={q.podcasts_target} />
                        <Cell actual={q.posts_actual} target={q.posts_min} />
                        <Cell actual={q.blogs_actual} target={q.blogs_target} />
                    </tr>
                ))}
            </Table>
        )}
    </Card>
);

export default QuarterHistory;
