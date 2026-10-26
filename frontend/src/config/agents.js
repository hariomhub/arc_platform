// ─── Learning Agents ────────────────────────────────────────────────────────────
// Framework-scoped AI agents (quizzes, gamified learning modules) are being
// built as a separate system. Single source of truth for the Framework page's
// launcher and the "coming soon" page each agent link lands on today.
//
// Wiring up a real agent page later: add a specific <Route path="/agents/<slug>">
// above the generic "/agents/:agentSlug" coming-soon route in App.jsx — that
// agent switches over and the others keep showing "coming soon".
//
// Each agent is a robot (components/agents/robot). `finish` is its colourway
// (see bot/finishes.js), `scene` names its stage under bot/scenes, and `facts`
// are the lines it says when asked for "a quick fact" — keep them short and
// checkable against the source document. `voice` nudges the browser's speech voice
// (pitch/rate) a little so the five do not sound identical; keep it close to 1, stretching it sounds robotic.
const AGENT_DEFS = [
    {
        key: 'nist', slug: 'nist-ai-rmf', name: 'NIST AI RMF Agent', finish: 'sky', scene: 'nist', voice: { pitch: 1, rate: 0.98 },
        description: 'Quiz-based learning scoped to the NIST AI Risk Management Framework.',
        tagline: 'Four functions, one habit: Govern, Map, Measure, Manage.',
        facts: [
            'The NIST AI RMF 1.0 came out in January 2023, and using it is voluntary.',
            'Govern is the function that runs through the other three.',
            'It describes trustworthy AI as valid, safe, secure, accountable, explainable, privacy-enhanced and fair.',
        ],
    },
    {
        key: 'eu-ai-act', slug: 'eu-ai-act', name: 'EU AI Act Agent', finish: 'lavender', scene: 'euAiAct', voice: { pitch: 1.03, rate: 1 },
        description: 'Quiz-based learning scoped to the EU AI Act.',
        tagline: 'The more risk an AI system carries, the more the law asks of it.',
        facts: [
            'The Act sorts AI systems into four levels of risk.',
            'Some practices, such as social scoring, are banned outright.',
            'The Act entered into force in August 2024 and applies in phases.',
        ],
    },
    {
        key: 'iso-42001', slug: 'iso-42001', name: 'ISO/IEC 42001 Agent', finish: 'graphite', scene: 'iso42001', voice: { pitch: 0.95, rate: 0.97 },
        description: 'Quiz-based learning scoped to ISO/IEC 42001.',
        tagline: 'An AI management system you can plan, run, check and improve.',
        facts: [
            'ISO/IEC 42001 was published in December 2023 and is the first standard for an AI management system.',
            'It is certifiable, so an auditor can assess an organisation against it.',
            'It shares its management-system structure with ISO/IEC 27001, so the two fit together.',
        ],
    },
    {
        key: 'rbi-free-ai', slug: 'rbi-free-ai', name: 'RBI FREE-AI Framework Agent', finish: 'cream', scene: 'rbiFreeAi', voice: { pitch: 1, rate: 0.97 },
        description: 'Quiz-based learning scoped to the RBI FREE-AI Framework.',
        tagline: 'Responsible AI for finance, built on guiding principles and six pillars.',
        facts: [
            'FREE-AI stands for Framework for Responsible and Ethical Enablement of Artificial Intelligence.',
            'It comes from a committee set up by the Reserve Bank of India for the financial sector.',
            'It sets out seven guiding principles, called Sutras, and recommendations across six pillars.',
        ],
    },
    {
        key: 'bridge-model', slug: 'ai-risk-bridge-model', name: 'AI Risk Bridge Model Agent', finish: 'aurora', scene: 'bridge', voice: { pitch: 1.02, rate: 1 }, original: true,
        description: 'Quiz-based learning scoped to the RAC AI Risk Bridge Model.',
        tagline: 'Five stages that carry an AI system from "what is it" to "keep it safe".',
        facts: [
            'The Bridge Model is our own: Exposure, Obligation, Integrity, Defense and Continuity.',
            'It starts by knowing what AI you have, because you cannot govern what you cannot see.',
            'The last stage, Continuity, is about sustaining controls after launch, not just passing a review.',
        ],
    },
];

export const LEARNING_AGENTS = AGENT_DEFS.map(a => ({ ...a, path: `/agents/${a.slug}` }));

export const getAgentBySlug = (slug) => LEARNING_AGENTS.find(a => a.slug === slug) || null;

// "NIST AI RMF Agent" → "NIST AI RMF"
export const agentShortName = (agent) => agent.name.replace(/ Agent$/, '');
