/**
 * seed_nominations.js
 * Run with:  node seed_nominations.js
 * Clears all nominations data and inserts rich dummy data for testing.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     parseInt(process.env.DB_PORT, 10) || 3306,
});

console.log('✅ Connected to MySQL\n');

// ── 0. CREATE TABLES IF NOT EXISTS ────────────────────────────────────────────
await db.query(`
    CREATE TABLE IF NOT EXISTS awards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);
await db.query(`
    CREATE TABLE IF NOT EXISTS award_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        award_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        timeline ENUM('quarterly','half-yearly','yearly') NOT NULL DEFAULT 'yearly',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (award_id) REFERENCES awards(id) ON DELETE CASCADE
    )
`);
await db.query(`
    CREATE TABLE IF NOT EXISTS nominees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        award_id INT NOT NULL,
        category_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        designation VARCHAR(255),
        company VARCHAR(255),
        photo_url VARCHAR(500),
        linkedin_url VARCHAR(500),
        achievements TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        is_winner BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (award_id) REFERENCES awards(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES award_categories(id) ON DELETE CASCADE
    )
`);
// Add is_winner column to existing tables if it doesn't exist yet
try {
    await db.query(`ALTER TABLE nominees ADD COLUMN is_winner BOOLEAN DEFAULT FALSE AFTER is_active`);
    console.log('✔  Added is_winner column to nominees');
} catch { /* column already exists */ }
await db.query(`
    CREATE TABLE IF NOT EXISTS votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        nominee_id INT NOT NULL,
        category_id INT NOT NULL,
        award_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_vote_per_category (user_id, category_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (nominee_id) REFERENCES nominees(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES award_categories(id) ON DELETE CASCADE,
        FOREIGN KEY (award_id) REFERENCES awards(id) ON DELETE CASCADE
    )
`);

// Add indexes (IF NOT EXISTS not supported for indexes — use CREATE INDEX with try/catch)
for (const idx of [
    'CREATE INDEX idx_award_categories_award ON award_categories(award_id)',
    'CREATE INDEX idx_nominees_award ON nominees(award_id)',
    'CREATE INDEX idx_nominees_category ON nominees(category_id)',
    'CREATE INDEX idx_votes_user ON votes(user_id)',
    'CREATE INDEX idx_votes_nominee ON votes(nominee_id)',
]) {
    try { await db.query(idx); } catch { /* index already exists */ }
}
console.log('📋 Tables ready');

// ── 1. CLEAR (FK-safe order) ──────────────────────────────────────────────────
await db.query('SET FOREIGN_KEY_CHECKS = 0');
await db.query('TRUNCATE TABLE votes');
await db.query('TRUNCATE TABLE nominees');
await db.query('TRUNCATE TABLE award_categories');
await db.query('TRUNCATE TABLE awards');
await db.query('SET FOREIGN_KEY_CHECKS = 1');
console.log('🗑  Cleared nominations tables');

// ── 2. AWARDS ─────────────────────────────────────────────────────────────────
const [awardsResult] = await db.query(`
    INSERT INTO awards (name, description, is_active) VALUES
    ('Top CISO Awards 2026',
     'Recognising outstanding Chief Information Security Officers driving AI governance and risk management globally across all sectors.',
     TRUE),
    ('AI Risk Leadership Awards 2026',
     'Honouring leaders who have made significant contributions to AI risk frameworks, responsible AI deployment and ethical innovation.',
     TRUE),
    ('AI Ethics & Compliance Awards 2026',
     'Celebrating individuals and teams advancing ethical AI development, algorithmic fairness, and regulatory compliance at scale.',
     TRUE)
`);
const [a1, a2, a3] = [1, 2, 3]; // IDs after TRUNCATE reset to 1
console.log('🏆 Inserted 3 awards');

// ── 3. CATEGORIES ─────────────────────────────────────────────────────────────
await db.query(`
    INSERT INTO award_categories (award_id, name, timeline) VALUES
    -- Award 1: Top CISO Awards
    (1, 'Best AI Risk Leader — Q1 2026',       'quarterly'),
    (1, 'Outstanding Security Innovation',      'half-yearly'),
    (1, 'AI Governance Champion of the Year',   'yearly'),
    -- Award 2: AI Risk Leadership
    (2, 'AI Ethics Excellence — Q1 2026',       'quarterly'),
    (2, 'Risk Framework Pioneer of the Year',   'yearly'),
    -- Award 3: AI Ethics & Compliance
    (3, 'Compliance Innovator — Q1 2026',       'quarterly'),
    (3, 'Responsible AI Champion — H1 2026',    'half-yearly'),
    (3, 'AI Policy Leader of the Year',         'yearly')
`);
console.log('📂 Inserted 8 categories');

// Category ID mapping (auto-incremented from 1)
const CAT = { bestAIRisk: 1, securityInno: 2, govChampion: 3, ethicsExc: 4, frameworkPioneer: 5, complianceInno: 6, responsibleAI: 7, policyLeader: 8 };

// ── 4. NOMINEES ───────────────────────────────────────────────────────────────
const LINKEDIN = 'https://linkedin.com/in/';
const PHOTOS = {
    f1: 'https://randomuser.me/api/portraits/women/14.jpg',
    f2: 'https://randomuser.me/api/portraits/women/28.jpg',
    f3: 'https://randomuser.me/api/portraits/women/59.jpg',
    f4: 'https://randomuser.me/api/portraits/women/44.jpg',
    f5: 'https://randomuser.me/api/portraits/women/71.jpg',
    f6: 'https://randomuser.me/api/portraits/women/33.jpg',
    m1: 'https://randomuser.me/api/portraits/men/32.jpg',
    m2: 'https://randomuser.me/api/portraits/men/46.jpg',
    m3: 'https://randomuser.me/api/portraits/men/82.jpg',
    m4: 'https://randomuser.me/api/portraits/men/22.jpg',
    m5: 'https://randomuser.me/api/portraits/men/51.jpg',
    m6: 'https://randomuser.me/api/portraits/men/62.jpg',
    m7: 'https://randomuser.me/api/portraits/men/38.jpg',
    m8: 'https://randomuser.me/api/portraits/men/15.jpg',
    m9: 'https://randomuser.me/api/portraits/men/88.jpg',
};

const nominees = [
    // ── Award 1, Cat 1: Best AI Risk Leader (quarterly)
    { award_id: 1, category_id: CAT.bestAIRisk, name: 'Sarah Chen', designation: 'Chief Information Security Officer', company: 'GlobalTech Corp', photo_url: PHOTOS.f1, linkedin_url: LINKEDIN + 'sarah-chen-ciso', achievements: 'Led EU AI Act compliance framework for 14 countries; Reduced AI security incidents by 60% in 18 months; Authored 3 published AI risk frameworks; Winner of ISACA AI Security Award 2025', description: 'Sarah Chen has been at the forefront of AI security governance for over a decade. Her pioneering work at GlobalTech Corp established one of the industry\'s most comprehensive AI risk management programs, earning recognition from regulatory bodies across 14 countries. Sarah is widely regarded as a thought leader in translating regulatory requirements into actionable technical controls.', is_active: true },
    { award_id: 1, category_id: CAT.bestAIRisk, name: 'Marcus Williams', designation: 'VP of Cybersecurity & AI Risk', company: 'FinSecure International', photo_url: PHOTOS.m1, linkedin_url: LINKEDIN + 'marcus-williams-vp', achievements: 'Developed proprietary AI threat modelling methodology adopted by 200+ financial institutions; Secured ISO 42001 certification across 8 subsidiaries; Speaker at 12 international conferences; Led $50M AI security transformation programme', description: 'Marcus Williams brings a unique blend of financial-sector expertise and AI security knowledge. His development of the FinSecure AI Threat Model has been adopted by over 200 financial institutions worldwide. His background spanning both quantitative finance and cybersecurity enables him to articulate AI risk in business-value terms that resonate with boards and regulators alike.', is_active: true },
    { award_id: 1, category_id: CAT.bestAIRisk, name: 'Dr. Fatima Al-Hassan', designation: 'Director of AI Risk & Resilience', company: 'Meridian Insurance Group', photo_url: PHOTOS.f2, linkedin_url: LINKEDIN + 'fatima-alhassan', achievements: 'Built AI risk resilience framework covering 30+ AI models; Secured FCA AI sandbox accreditation; Co-authored NAIC AI model governance guidelines; Named Insurance CIO of the Year 2025', description: 'Dr. Al-Hassan has transformed how the insurance industry approaches AI governance, creating frameworks that are now referenced in three separate national regulatory guidelines. Her work on AI model failure mode analysis has become curriculum at two leading business schools.', is_active: true },

    // ── Award 1, Cat 2: Outstanding Security Innovation (half-yearly)
    { award_id: 1, category_id: CAT.securityInno, name: 'Dr. Priya Nair', designation: 'Director of AI Governance & Innovation', company: 'TechAssure Ltd', photo_url: PHOTOS.f3, linkedin_url: LINKEDIN + 'priya-nair-phd', achievements: 'Published 8 peer-reviewed papers on AI security; Advised EU AI Act technical committee; Built AI governance team from 0 to 45 members in 2 years; Created open-source AI audit toolkit with 12,000+ GitHub stars', description: 'Dr. Priya Nair\'s academic rigour combined with practical industry experience makes her a singular voice in AI governance. Her advisory role in shaping the EU AI Act has had global implications for how high-risk AI systems are regulated. She is also the creator of the widely-used AuditAI open-source toolkit.', is_active: true, is_winner: true },
    { award_id: 1, category_id: CAT.securityInno, name: 'Kwame Asante', designation: 'Head of AI Security Engineering', company: 'CyberNova Solutions', photo_url: PHOTOS.m2, linkedin_url: LINKEDIN + 'kwame-asante', achievements: 'Developed adversarial ML detection system with 99.2% accuracy; Holds 4 AI security patents; Led red-team exercises against 15 Fortune 500 AI deployments; Keynote speaker at Black Hat 2025', description: 'Kwame Asante is one of the foremost practitioners in adversarial machine learning defence. His patented detection system is deployed at scale across critical infrastructure in five countries, preventing millions of adversarial attack attempts monthly.', is_active: true },
    { award_id: 1, category_id: CAT.securityInno, name: 'Yuki Tanaka', designation: 'Principal AI Risk Architect', company: 'Nippon AI Security Corp', photo_url: PHOTOS.f4, linkedin_url: LINKEDIN + 'yuki-tanaka-ai', achievements: 'Designed Zero-Trust AI pipeline architecture adopted across Japanese financial sector; Led ISO 27001 + AI extension certification for 6 major banks; Presented at G7 AI Security Forum 2025', description: 'Yuki Tanaka is renowned for bridging eastern and western AI security practices, creating frameworks that harmonise differing regulatory philosophies without sacrificing rigour. Her Zero-Trust AI architecture is now part of Japan\'s national AI security standard.', is_active: true },

    // ── Award 1, Cat 3: AI Governance Champion of the Year (yearly)
    { award_id: 1, category_id: CAT.govChampion, name: 'James Okafor', designation: 'CISO & AI Risk Officer', company: 'DataShield Africa', photo_url: PHOTOS.m3, linkedin_url: LINKEDIN + 'james-okafor-ciso', achievements: 'Launched first pan-African AI risk certification program; Protected critical systems serving 50M+ users; Keynote at Davos AI Forum 2025; Trained 5,000+ AI security professionals across 32 countries', description: 'James Okafor has transformed AI security across the African continent, building robust governance structures that protect critical digital infrastructure. His certification program is now endorsed by the African Union\'s Digital Transformation Strategy as the continent\'s gold standard for AI risk professionals.', is_active: true, is_winner: true },
    { award_id: 1, category_id: CAT.govChampion, name: 'Ingrid Bergström', designation: 'Chief AI Governance Officer', company: 'NordicAI Assurance', photo_url: PHOTOS.f5, linkedin_url: LINKEDIN + 'ingrid-bergstrom', achievements: 'Established Nordic AI governance coalition across 5 countries; Advised European Parliament on AI liability directive; Published AI Governance Playbook downloaded 200,000+ times; Named Most Influential Woman in AI 2025', description: 'Ingrid Bergström has positioned the Nordic region as a global leader in responsible AI development. Her cross-border coalition enables smaller nations to collectively punch above their weight in international AI standard-setting bodies. Her governance playbook is used by organisations in 40 countries.', is_active: true },

    // ── Award 2, Cat 4: AI Ethics Excellence (quarterly)
    { award_id: 2, category_id: CAT.ethicsExc, name: 'Dr. Anika Sharma', designation: 'Head of AI Ethics & Algorithmic Fairness', company: 'EthicsFirst AI', photo_url: PHOTOS.f6, linkedin_url: LINKEDIN + 'anika-sharma-ethics', achievements: 'Ethical AI audit framework adopted by 80+ organisations worldwide; Received UN Innovation Award for AI ethics; TEDx speaker with 1.2M+ views; Reduced algorithmic bias by 73% in healthcare AI deployments', description: 'Dr. Anika Sharma\'s work sits at the intersection of ethics, technology, and policy. Her ethical AI audit framework has become the de facto standard for assessing AI system fairness and accountability in regulated industries. Her TEDx talk on algorithmic bias in healthcare has sparked policy reform in three countries.', is_active: true },
    { award_id: 2, category_id: CAT.ethicsExc, name: 'Alejandro Reyes', designation: 'Director of Responsible AI', company: 'LatAm AI Institute', photo_url: PHOTOS.m4, linkedin_url: LINKEDIN + 'alejandro-reyes-rai', achievements: 'Built responsible AI centre serving 18 Latin American countries; Co-authored OAS AI Ethics Guidelines; Launched free AI ethics certification in Spanish and Portuguese with 50,000+ graduates; Consulted for UNESCO AI Recommendation implementation', description: 'Alejandro Reyes has democratised access to AI ethics education across Latin America, building infrastructure that ensures communities historically excluded from technology design now have meaningful input into AI governance. His bilingual certification programme has produced the region\'s largest cohort of certified AI ethics practitioners.', is_active: true },
    { award_id: 2, category_id: CAT.ethicsExc, name: 'Prof. Amara Diallo', designation: 'Professor of AI Law & Ethics', company: 'Pan-African University', photo_url: null, linkedin_url: LINKEDIN + 'amara-diallo-prof', achievements: 'Published 20+ academic papers on AI and human rights; Advised 4 African governments on AI legislation; Created Africa AI Rights Framework endorsed by 28 member states; Named Top 100 Global Thinkers by Foreign Policy Magazine', description: 'Prof. Diallo has established herself as the leading academic voice on AI rights and human dignity in the Global South. Her framework providing a human-rights-centred approach to AI governance has been formally adopted by 28 African states and is informing work at the International Law Commission.', is_active: true },

    // ── Award 2, Cat 5: Risk Framework Pioneer (yearly)
    { award_id: 2, category_id: CAT.frameworkPioneer, name: 'Robert Zhang', designation: 'Chief Risk & Compliance Officer', company: 'AsiaPac Technologies', photo_url: PHOTOS.m5, linkedin_url: LINKEDIN + 'robert-zhang-cro', achievements: 'Pioneered cross-jurisdictional AI risk harmonisation across 18 APAC jurisdictions; Led APAC AI regulatory task force; Managed $2.3B+ AI risk portfolio; NIST AI RMF external reviewer', description: 'Robert Zhang has been instrumental in harmonising divergent AI regulatory requirements across 18 Asia-Pacific jurisdictions. His practical risk frameworks enable organisations to navigate complex multi-regulatory environments while accelerating responsible AI adoption.', is_active: true, is_winner: true },
    { award_id: 2, category_id: CAT.frameworkPioneer, name: 'Dr. Charlotte Müller', designation: 'AI Risk Research Director', company: 'European AI Safety Institute', photo_url: null, linkedin_url: LINKEDIN + 'charlotte-muller-dr', achievements: 'Developed quantitative AI risk scoring model deployed by ECB; Co-authored ISO/IEC 42001 AI management standard; Peer-reviewed contributor to NIST AI RMF; Appointed to EU AI Office advisory board', description: 'Dr. Müller has brought scientific rigour to AI risk quantification, developing models that allow organisations to express AI risk in the same probabilistic terms used for established financial and operational risks. Her work on the ISO/IEC 42001 standard has created a global language for AI management.', is_active: true },

    // ── Award 3, Cat 6: Compliance Innovator (quarterly)
    { award_id: 3, category_id: CAT.complianceInno, name: 'Tariq Al-Rashidi', designation: 'VP AI Compliance & Regulatory Affairs', company: 'Gulf FinTech Holdings', photo_url: PHOTOS.m6, linkedin_url: LINKEDIN + 'tariq-alrashidi', achievements: 'Achieved full EU AI Act compliance 18 months ahead of deadline; Developed GCC AI compliance framework adopted by 6 Gulf states; Reduced compliance costs by 40% through automated monitoring; Guest lecturer at Harvard Kennedy School', description: 'Tariq Al-Rashidi has shown that proactive compliance is a competitive advantage rather than a burden. His team\'s early, systematic approach to EU AI Act compliance not only avoided regulatory risk but freed innovation capacity that rivals were burning on last-minute remediation.', is_active: true },
    { award_id: 3, category_id: CAT.complianceInno, name: 'Mei Lin', designation: 'Director of AI Policy & Compliance', company: 'Pacific Rim Digital', photo_url: PHOTOS.f4, linkedin_url: LINKEDIN + 'mei-lin-compliance', achievements: 'Navigated simultaneous compliance in 7 APAC regulatory regimes; Built AI compliance team of 35 across 6 jurisdictions; Designed AI regulatory change management system used by 40+ organisations; Finalist for Asia Compliance Officer of the Year 2025', description: 'Mei Lin thrives in regulatory complexity, having built a compliance function capable of simultaneously tracking and responding to requirements across seven distinct APAC regulatory frameworks. Her change management system gives organisations early warning of regulatory shifts and clear remediation pathways.', is_active: true },

    // ── Award 3, Cat 7: Responsible AI Champion H1 (half-yearly)
    { award_id: 3, category_id: CAT.responsibleAI, name: 'Dr. Elena Vasquez', designation: 'Chief Responsible AI Officer', company: 'Global Data Corp', photo_url: PHOTOS.f6, linkedin_url: LINKEDIN + 'elena-vasquez-rai', achievements: 'Launched company-wide responsible AI programme across 90,000 employees; Reduced model bias incidents by 85%; Co-founded Responsible AI Alliance with 150 member organisations; Named Forbes Technology Council member', description: 'Dr. Vasquez has embedded responsible AI not as a compliance function but as a core business value, reshaping how a 90,000-person organisation thinks about and builds AI. Her groundwork for the Responsible AI Alliance has created a pre-competitive space for sharing safety and ethics learnings.', is_active: true, is_winner: true },
    { award_id: 3, category_id: CAT.responsibleAI, name: 'Ben Adeyemi', designation: 'Head of AI Safety & Social Impact', company: 'TrustTech Africa', photo_url: PHOTOS.m7, linkedin_url: LINKEDIN + 'ben-adeyemi-safety', achievements: 'Deployed responsible AI toolkit to 500+ African startups; Developed AI impact assessment methodology for developing economies; Partnered with 12 universities to embed AI ethics in computer science curricula; Appointed to UN Secretary General\'s AI Advisory Board', description: 'Ben Adeyemi is redefining what responsible AI means in contexts where resources are constrained but stakes are equally high. His lightweight, accessible toolkit has enabled hundreds of African startups to build safety practices from day one, preventing harms before they scale.', is_active: true },

    // ── Award 3, Cat 8: AI Policy Leader of Year (yearly)
    { award_id: 3, category_id: CAT.policyLeader, name: 'Yvonne Sinclair', designation: 'Director of AI Policy & Government Affairs', company: 'National AI Authority', photo_url: PHOTOS.f2, linkedin_url: LINKEDIN + 'yvonne-sinclair', achievements: 'Drafted national AI strategy implemented across 12 government departments; Secured £2B government AI safety fund; Aligned UK AI framework with EU and US approaches; Named Civil Service AI Leader of the Year 2025', description: 'Yvonne Sinclair has translated political commitment to AI safety into concrete policy architecture, securing unprecedented investment and creating frameworks that balance innovation with protection. Her cross-Atlantic alignment work has established the UK as a bridge between the EU and US AI governance approaches.', is_active: true, is_winner: true },
    { award_id: 3, category_id: CAT.policyLeader, name: 'Prof. Hiroshi Yamamoto', designation: 'Senior AI Policy Advisor', company: 'Ministry of Digital Affairs Japan', photo_url: PHOTOS.m8, linkedin_url: LINKEDIN + 'hiroshi-yamamoto-prof', achievements: 'Architected Japan\'s Hiroshima AI Process framework; Led G7 AI governance working group; Advised on 8 national AI strategies across Asia; Published 3 books on AI governance translated into 12 languages', description: 'Prof. Yamamoto has operated at the highest levels of international AI governance, shaping the frameworks that G7 nations use to coordinate their AI policies. His Hiroshima AI Process has created a durable multilateral mechanism for ongoing AI governance dialogue that outlasted the 2023 presidency that launched it.', is_active: true },
];

const nomineeIds = [];
for (const n of nominees) {
    const [r] = await db.query(
        `INSERT INTO nominees (award_id, category_id, name, designation, company, photo_url, linkedin_url, achievements, description, is_active, is_winner)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [n.award_id, n.category_id, n.name, n.designation, n.company, n.photo_url, n.linkedin_url, n.achievements, n.description, n.is_active, n.is_winner ?? false]
    );
    nomineeIds.push({ id: r.insertId, ...n });
}
console.log(`👤 Inserted ${nominees.length} nominees`);

// ── 5. VOTES ──────────────────────────────────────────────────────────────────
// Fetch existing approved users from the DB
const [users] = await db.query(
    `SELECT id FROM users WHERE status = 'approved' LIMIT 50`
);

if (users.length === 0) {
    console.log('⚠️  No approved users found — skipping vote seeding.');
    console.log('   Approve some users first, then re-run to seed votes.\n');
} else {
    console.log(`📊 Found ${users.length} approved users — seeding votes...`);

    // Build a distribution: give nominees different vote counts to make leaderboard interesting
    // Map category_id -> list of nominee IDs in that category
    const catNominees = {};
    for (const n of nomineeIds) {
        if (!catNominees[n.category_id]) catNominees[n.category_id] = [];
        catNominees[n.category_id].push(n.id);
    }

    // Assign each user a random vote per category (one vote per user per category)
    let voteCount = 0;
    for (const user of users) {
        for (const [catId, nmIds] of Object.entries(catNominees)) {
            // 80% chance this user votes in this category
            if (Math.random() > 0.2) {
                // Weight distribution: first nominee gets ~50% of votes, rest share remainder
                let chosen;
                const r = Math.random();
                if (r < 0.5)        chosen = nmIds[0];
                else if (r < 0.75 && nmIds[1]) chosen = nmIds[1];
                else if (r < 0.90 && nmIds[2]) chosen = nmIds[2];
                else                chosen = nmIds[Math.floor(Math.random() * nmIds.length)];

                try {
                    await db.query(
                        `INSERT IGNORE INTO votes (user_id, nominee_id, category_id, award_id)
                         VALUES (?, ?, ?, ?)`,
                        [user.id, chosen, parseInt(catId), nomineeIds.find(n => n.id === chosen)?.award_id]
                    );
                    voteCount++;
                } catch { /* skip duplicate */ }
            }
        }
    }
    console.log(`🗳  Inserted ${voteCount} votes across all categories`);
}

await db.end();
console.log('\n✅ Nominations seed complete!\n');
console.log('Awards : 3');
console.log('Categories : 8');
console.log(`Nominees   : ${nominees.length}`);
console.log('Routes:');
console.log('  Public:  /nominees (AllNominees page)');
console.log('  Events:  /events   (NominationsSection carousel)');
console.log('  Admin:   /admin-dashboard → Nominations tab');
