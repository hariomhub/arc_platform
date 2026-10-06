// ─── Learning Agents ────────────────────────────────────────────────────────────
// Framework-scoped AI agents (quizzes, gamified learning modules) are being
// built as a separate system. Single source of truth for the Framework page's
// launcher and the "coming soon" page each agent link lands on today.
//
// Wiring up a real agent page later: add a specific <Route path="/agents/<slug>">
// above the generic "/agents/:agentSlug" coming-soon route in App.jsx — that
// agent switches over and the others keep showing "coming soon".
//
// `glow` is the bot's eye/ear/chest colour on the coming-soon page, which sits
// on a dark navy backdrop — so it's a brighter tone than the Framework
// launcher's BOT_PALETTE, staying inside the site's blue/gold range.
const AGENT_DEFS = [
    { key: 'nist', slug: 'nist-ai-rmf', name: 'NIST AI RMF Agent', description: 'Quiz-based learning scoped to the NIST AI Risk Management Framework.', glow: '#60A5FA' },
    { key: 'eu-ai-act', slug: 'eu-ai-act', name: 'EU AI Act Agent', description: 'Quiz-based learning scoped to the EU AI Act.', glow: '#38BDF8' },
    { key: 'iso-42001', slug: 'iso-42001', name: 'ISO/IEC 42001 Agent', description: 'Quiz-based learning scoped to ISO/IEC 42001.', glow: '#93C5FD' },
    { key: 'rbi-free-ai', slug: 'rbi-free-ai', name: 'RBI FREE-AI Framework Agent', description: 'Quiz-based learning scoped to the RBI FREE-AI Framework.', glow: '#f9a825' },
    { key: 'bridge-model', slug: 'ai-risk-bridge-model', name: 'AI Risk Bridge Model Agent', description: 'Quiz-based learning scoped to the RAC AI Risk Bridge Model.', glow: '#BAE6FD', original: true },
];

export const LEARNING_AGENTS = AGENT_DEFS.map(a => ({ ...a, path: `/agents/${a.slug}` }));

export const getAgentBySlug = (slug) => LEARNING_AGENTS.find(a => a.slug === slug) || null;

// "NIST AI RMF Agent" → "NIST AI RMF"
export const agentShortName = (agent) => agent.name.replace(/ Agent$/, '');

// Cycled per agent card so agents read as distinct bots without leaving the
// site's navy/gold accent system — add a sixth LEARNING_AGENTS entry and it
// picks up automatically (wraps back to the first tone).
export const BOT_PALETTE = ['#002244', '#003366', '#005599', '#f9a825'];
