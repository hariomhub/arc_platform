-- =============================================
-- PRODUCTION SEED — safe to run on existing DB
-- Uses INSERT IGNORE for users to handle duplicates
-- =============================================

-- ── USERS ────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO users (name, email, password_hash, role, status, bio, linkedin_url, organization_name) VALUES
('ARC Administrator',   'admin@arc.com',      '$2b$12$k8yzAUy4sehSiLrME5iVGORaj5mHwH3jdYwryio0i1Pu95XjC3E6S', 'admin',           'approved', 'Platform administrator.',                                'https://www.linkedin.com/in/arc-admin',            'AI Risk Council'),
('Dr. Priya Nair',      'executive@arc.com',  '$2b$12$AdDFRUY1tzr21EbnkpZUx.XLGVh2Yje.c7vnpAIGAy0NXg4EClu0y', 'executive',       'approved', 'Senior executive with 15+ years leading AI governance.', 'https://www.linkedin.com/in/priya-nair-exec',      'TechGov Consulting Ltd.'),
('Rahul Menon',         'paid@arc.com',        '$2b$12$lYJN0Q6fcDBVznvYXoAxDODwuOgy.0Q4w9lHp1COaxnF0IpC6.me2', 'paid_member',     'approved', 'AI risk analyst and compliance professional.',            'https://www.linkedin.com/in/rahul-menon-ai',       'FinSecure Analytics'),
('Prof. Ananya Sharma', 'university@arc.com',  '$2b$12$CWQhNYYrdDTk6f/vv0HL.OVNZB05oBzxiE2rpROmmdaaU/VMDAfDG', 'university',      'approved', 'Associate Professor of AI Ethics at IIT Delhi.',          'https://www.linkedin.com/in/prof-ananya-sharma',   'IIT Delhi'),
('Kiran Desai',         'product@arc.com',     '$2b$12$adHEGu/AlE0fXfv5f9VHGOmhfQb3X2K2WQ8VXllxqbiBtSDhHDHaG', 'product_company', 'approved', 'Founder of SafeAI Solutions.',                           'https://www.linkedin.com/in/kiran-desai-safeai',   'SafeAI Solutions Pvt. Ltd.'),
('Meera Pillai',        'free@arc.com',        '$2b$12$kvxjUKPJ3n2ZB5y/F6qTI.AJU0byGtpidDSUvcYnHqDKbxHtsxS.y', 'free_member',     'approved', 'Independent researcher interested in AI policy.',        'https://www.linkedin.com/in/meera-pillai-researcher', NULL);

-- Also ensure admin has correct role/status in case it was created bare
UPDATE users SET role='admin', status='approved', name='ARC Administrator' WHERE email='admin@arc.com';

-- ── TEAM MEMBERS ─────────────────────────────────────────────────────────────
DELETE FROM team_members;
INSERT INTO team_members (name, role, bio, linkedin_url, photo_url) VALUES
('Akarsh Singh',        'Chief Executive Officer',        'Akarsh founded the AI Risk Council in 2022 after a decade leading technology policy at the World Economic Forum. He holds an MBA from IIM Ahmedabad and a Master''s in Public Policy from Oxford.',    'https://www.linkedin.com/in/akarsh-singh-ceo',          'https://randomuser.me/api/portraits/men/10.jpg'),
('Dr. Elena Rodriguez', 'Chief Research Officer',          'Dr. Rodriguez leads all research initiatives at ARC. Previously a Principal Researcher at DeepMind, she holds a PhD in Machine Learning from MIT.',                                                   'https://www.linkedin.com/in/elena-rodriguez-cro',        'https://randomuser.me/api/portraits/women/14.jpg'),
('Dr. Pawan Chawla',    'Head of AI Safety & Security',   'Dr. Chawla is a renowned cybersecurity expert specialising in adversarial AI and red-teaming LLMs.',                                                                                                   'https://www.linkedin.com/in/dr-pawan-chawla-aisec',      'https://randomuser.me/api/portraits/men/32.jpg'),
('Sarah Chen',          'Director of Ethics & Policy',    'Sarah crafts ARC''s ethical guidelines and policy recommendations. With a background in bioethics and technology law (JD, Harvard Law).',                                                              'https://www.linkedin.com/in/sarah-chen-ethics',          'https://randomuser.me/api/portraits/women/68.jpg'),
('Vikram Bose',         'VP of Enterprise Partnerships',  'Vikram builds and manages ARC''s relationships with enterprise members and product companies.',                                                                                                         'https://www.linkedin.com/in/vikram-bose-partnerships',   'https://randomuser.me/api/portraits/men/46.jpg'),
('Dr. Fatima Al-Rashid','Head of University Relations',   'Dr. Al-Rashid coordinates ARC''s academic network spanning 30+ universities globally.',                                                                                                                'https://www.linkedin.com/in/fatima-alrashid-academia',   'https://randomuser.me/api/portraits/women/59.jpg'),
('James O''Brien',      'Chief Technology Officer',       'James architects ARC''s technology infrastructure. A full-stack engineer with 18 years of experience.',                                                                                                 'https://www.linkedin.com/in/james-obrien-cto',           'https://randomuser.me/api/portraits/men/22.jpg');

-- ── EVENTS ───────────────────────────────────────────────────────────────────
DELETE FROM events;
INSERT INTO events (title, date, location, description, link, event_category, is_upcoming, is_published, recording_url) VALUES
('EU AI Act Compliance Masterclass',                   '2026-04-15 14:00:00', 'Online (Zoom)',          'A deep-dive session covering the EU AI Act enforcement timelines and what high-risk system operators must do by August 2026.',            'https://riskaicouncil-fsgmh0erfjh0g6g4.eastasia-01.azurewebsites.net/', 'webinar',  TRUE,  TRUE, NULL),
('AI Red-Teaming Workshop: LLM Adversarial Testing',   '2026-04-28 10:00:00', 'London, UK (Hybrid)',   'Hands-on workshop where participants learn to identify and document adversarial vulnerabilities in large language models.',               'https://riskaicouncil-fsgmh0erfjh0g6g4.eastasia-01.azurewebsites.net/', 'workshop', TRUE,  TRUE, NULL),
('AI Governance Podcast: Policy Special',              '2026-05-05 09:00:00', 'Online (Podcast)',       'Monthly deep-dive featuring senior policy advisors from the EU AI Office and NIST discussing the global regulatory landscape.',          'https://riskaicouncil-fsgmh0erfjh0g6g4.eastasia-01.azurewebsites.net/', 'podcast',  TRUE,  TRUE, NULL),
('NIST AI Risk Management Framework v2 Briefing',      '2026-05-20 15:00:00', 'Online (Zoom)',          'Council experts walk through the latest revisions to the NIST AI RMF with practical guidance.',                                          'https://riskaicouncil-fsgmh0erfjh0g6g4.eastasia-01.azurewebsites.net/', 'webinar',  TRUE,  TRUE, NULL),
('Privacy-Preserving AI Seminar',                      '2026-06-03 13:00:00', 'Singapore (In-Person)', 'An executive seminar exploring federated learning, differential privacy, and synthetic data for responsible AI deployment.',              'https://riskaicouncil-fsgmh0erfjh0g6g4.eastasia-01.azurewebsites.net/', 'seminar',  TRUE,  TRUE, NULL),
('AI Risk Foundations Bootcamp',                       '2026-01-20 10:00:00', 'Online (Zoom)',          'Introductory bootcamp covering AI risk fundamentals: threat modelling, harm identification, and AI governance from scratch.',             NULL, 'workshop', FALSE, TRUE, NULL),
('2025 Annual AI Security Summit',                     '2025-11-14 09:00:00', 'Washington D.C., USA',  'Our flagship annual summit bringing together 500+ risk professionals, policymakers, and AI researchers.',                              NULL, 'seminar',  FALSE, TRUE, NULL),
('Navigating the EU AI Act: Legal Obligations',        '2025-10-09 15:00:00', 'Online (Zoom)',          'Legal-focused webinar breaking down Article 6, Annex III high-risk categories, and conformity assessment obligations.',                 NULL, 'webinar',  FALSE, TRUE, NULL);

-- ── RESOURCES (frameworks & whitepapers) ─────────────────────────────────────
DELETE FROM resources WHERE type IN ('framework','whitepaper');

-- Get the admin user id into a variable for uploader_id
SET @admin_id = (SELECT id FROM users WHERE email='admin@arc.com' LIMIT 1);
SET @uni_id   = (SELECT id FROM users WHERE email='university@arc.com' LIMIT 1);
SET @prod_id  = (SELECT id FROM users WHERE email='product@arc.com' LIMIT 1);

INSERT INTO resources (title, description, abstract, file_url, type, status, uploader_id) VALUES
('AI Risk Management Framework v3.0',                       'The AI Risk Council''s comprehensive framework for identifying, assessing, and mitigating AI risks across the full system lifecycle.',       'Structured four-phase methodology (GOVERN, MAP, MEASURE, MANAGE) with 200+ controls, audit templates, and maturity scoring rubrics validated across 50+ organisations.',         NULL, 'framework',  'approved', @admin_id),
('Generative AI Deployment Risk Assessment Template',       'A ready-to-use risk assessment template for organisations deploying large language models.',                                                  'Covers data provenance, bias evaluation, adversarial robustness, privacy leakage, and supply chain security for foundation model deployments.',                                 NULL, 'framework',  'approved', @admin_id),
('EU AI Act Compliance Checklist 2025',                     'A practical compliance checklist for organisations subject to the EU AI Act.',                                                               'Maps EU AI Act Articles to operational controls with guidance for Articles 6-51 covering Annex III high-risk categories and transparency obligations.',                          NULL, 'framework',  'approved', @admin_id),
('ISO 42001 Implementation Guide',                          'A practical implementation guide for organisations pursuing ISO 42001 certification.',                                                        'Clause-by-clause implementation guide with worked examples, gap assessment templates, and sample AI policy suite.',                                                              NULL, 'framework',  'approved', @admin_id),
('The State of AI Governance 2025: Global Survey Report',   'Annual survey of 1,200+ organisations across 40 countries examining AI governance maturity and regulatory readiness.',                       'Key findings: 67% of enterprises lack a formal AI incident response plan; only 23% of AI deployments undergo formal risk assessment.',                                          NULL, 'whitepaper', 'approved', @uni_id),
('Adversarial AI: Threat Taxonomy & Mitigation Guide',      'A technical whitepaper cataloguing adversarial attack vectors against modern AI systems.',                                                   'Covers prompt injection, jailbreaking, model extraction, data poisoning, and evasion attacks with practical hardening recommendations.',                                         NULL, 'whitepaper', 'approved', @uni_id),
('AI Incident Response Playbook',                           'A step-by-step incident response playbook tailored for AI system failures.',                                                                 'Includes 12 scenario-specific runbooks, stakeholder communication templates, and regulatory notification guidance for GDPR, EU AI Act, and US EO 14110.',                       NULL, 'whitepaper', 'approved', @uni_id),
('AI Supply Chain Security: Vendor Risk Assessment Guide',  'A structured guide for assessing AI vendors and open-source model providers.',                                                               'Includes a 150-question vendor questionnaire, scoring methodology, and contractual safeguard recommendations.',                                                                  NULL, 'whitepaper', 'approved', @uni_id);

-- ── NEWS ─────────────────────────────────────────────────────────────────────
DELETE FROM news;
INSERT INTO news (title, summary, link, is_published) VALUES
('EU AI Act Enters Application Phase: Key Deadlines for 2026',        'The EU AI Act''s provisions for high-risk AI systems come into full force in August 2026. Organisations have until June 2026 to register systems in the EU database.',                                          'https://arc.com/news/eu-ai-act-2026-deadlines',            TRUE),
('India''s NITI Aayog Releases Draft AI Governance Framework',        'NITI Aayog has published a draft national framework for responsible AI development in India, open for public comment until March 31, 2026.',                                                                     'https://arc.com/news/niti-aayog-ai-framework-2026',        TRUE),
('OpenAI GPT-5 Safety Card Published: What It Means for Enterprise',  'OpenAI released the safety evaluation card for GPT-5, detailing red team results, limitations, and recommended deployment guardrails.',                                                                         'https://arc.com/news/openai-gpt5-safety-analysis',         TRUE),
('ARC Welcomes 50th University Partner: University of Mumbai Joins',  'The University of Mumbai''s Centre for AI Policy and Ethics has joined ARC as the 50th university partner.',                                                                                                    'https://arc.com/news/university-mumbai-joins-arc',         TRUE),
('New ISO/IEC 42001 Certification Bodies Accredited in India',        'The Bureau of Indian Standards has accredited four new certification bodies for ISO/IEC 42001 in India.',                                                                                                        'https://arc.com/news/iso42001-certification-india',        TRUE);

-- ── AWARDS & NOMINEES ────────────────────────────────────────────────────────
DELETE FROM nominees;
DELETE FROM award_categories;
DELETE FROM awards;

INSERT INTO awards (name, description, is_active) VALUES
('AI Safety Excellence Award 2025',        'Recognising outstanding contributions to AI safety research and deployment practices.', TRUE),
('AI Governance Leadership Award 2025',    'Honouring leaders who have shaped responsible AI governance frameworks globally.',     TRUE),
('Responsible AI Innovation Award 2025',   'Awarded to organisations demonstrating exemplary responsible AI product development.',  TRUE);

SET @award1 = (SELECT id FROM awards WHERE name='AI Safety Excellence Award 2025' LIMIT 1);
SET @award2 = (SELECT id FROM awards WHERE name='AI Governance Leadership Award 2025' LIMIT 1);
SET @award3 = (SELECT id FROM awards WHERE name='Responsible AI Innovation Award 2025' LIMIT 1);

INSERT INTO award_categories (award_id, name, timeline) VALUES
(@award1, 'Academic Research',          'yearly'),
(@award1, 'Industry Application',       'yearly'),
(@award2, 'Policy & Regulation',        'yearly'),
(@award2, 'Corporate Governance',       'yearly'),
(@award3, 'Startup Innovation',         'yearly'),
(@award3, 'Enterprise Implementation',  'yearly');

SET @cat1 = (SELECT id FROM award_categories WHERE name='Academic Research'         LIMIT 1);
SET @cat2 = (SELECT id FROM award_categories WHERE name='Industry Application'      LIMIT 1);
SET @cat3 = (SELECT id FROM award_categories WHERE name='Policy & Regulation'       LIMIT 1);
SET @cat4 = (SELECT id FROM award_categories WHERE name='Corporate Governance'      LIMIT 1);
SET @cat5 = (SELECT id FROM award_categories WHERE name='Startup Innovation'        LIMIT 1);
SET @cat6 = (SELECT id FROM award_categories WHERE name='Enterprise Implementation' LIMIT 1);

INSERT INTO nominees (name, award_id, category_id, designation, company, photo_url, achievements, description, is_active) VALUES
('Dr. Anita Mehta',    @award1, @cat1, 'Senior Research Scientist',    'IISc Bangalore',            'https://randomuser.me/api/portraits/women/44.jpg', 'Pioneered interpretable ML frameworks; 20+ published papers; National AI Safety Award 2024',      'Lead researcher at IISc Bangalore pioneering interpretable ML frameworks for critical infrastructure.',           TRUE),
('Prof. Raj Krishnan', @award1, @cat1, 'Professor of Computer Science', 'IIT Bombay',                'https://randomuser.me/api/portraits/men/54.jpg',   'Author of 30+ papers on adversarial robustness; Founded AI Security Lab; Google Research Award',  'Author of 30+ papers on adversarial robustness and AI red-teaming techniques.',                                   TRUE),
('Sunita Rao',         @award1, @cat2, 'Chief AI Risk Officer',        'HDFC Bank',                 'https://randomuser.me/api/portraits/women/62.jpg', 'Reduced model risk incidents by 80%; Built 15-person AI governance team; RBI recognition',       'Led deployment of safety-first ML systems at a major Indian bank, reducing model risk incidents by 80%.',         TRUE),
('Arjun Kapoor',       @award2, @cat3, 'Principal Advisor',            'IRDAI',                     'https://randomuser.me/api/portraits/men/36.jpg',   'Drafted India insurance AI guidelines; Advised 40+ insurers; Featured in ET 40 Under 40',        'Drafted India''s first sector-specific AI governance guidelines for the insurance industry.',                     TRUE),
('Dr. Leena Thomas',   @award2, @cat3, 'Senior Policy Advisor',        'NITI Aayog',                'https://randomuser.me/api/portraits/women/71.jpg', 'Co-authored NITI Aayog AI framework; 15 years in tech policy; Oxford AI Ethics Fellow',          'Key contributor to the NITI Aayog Responsible AI Policy framework.',                                              TRUE),
('Rahul Verma',        @award2, @cat4, 'VP AI Governance',             'Infosys',                   'https://randomuser.me/api/portraits/men/48.jpg',   'Governed 200+ AI models; ISO 42001 certified organisation; Saved $50M in compliance costs',      'Built enterprise AI governance programme from scratch at Infosys, covering 200+ AI models in production.',       TRUE),
('Priya Nambiar',      @award3, @cat5, 'Co-Founder & CEO',             'FairAI',                    'https://randomuser.me/api/portraits/women/33.jpg', 'Tools adopted by 50+ startups; $5M seed raised; NASSCOM Emerge 50 award winner',                 'Co-founder of FairAI, building automated bias detection tools adopted by 50+ Indian startups.',                   TRUE),
('Vikash Singh',       @award3, @cat5, 'Independent AI Safety Engineer','Open Source',               'https://randomuser.me/api/portraits/men/29.jpg',   'LLM guardrail library: 2000+ GitHub stars; Used by 300+ enterprises; Microsoft OpenSource Award','Created an open-source LLM guardrail library with 2000+ GitHub stars used by enterprises globally.',              TRUE),
('Dr. Meena Iyer',     @award3, @cat6, 'Chief AI Transformation Officer','Reliance Jio',             'https://randomuser.me/api/portraits/women/55.jpg', 'Deployed XAI across 200M+ customer touchpoints; Reduced churn 25%; Gartner Cool Vendor 2025',    'Led responsible AI transformation at Reliance Jio, implementing explainable AI across all customer touchpoints.', TRUE);

-- ── QNA POSTS ────────────────────────────────────────────────────────────────
DELETE FROM qna_answers;
DELETE FROM qna_posts;

INSERT INTO qna_posts (title, body, tags, author_id, vote_count, answer_count) VALUES
('What is the most practical starting point for EU AI Act compliance for a mid-size startup?',
 'Our startup has about 80 employees and we deploy an AI-powered credit scoring model. Where should we begin with EU AI Act compliance?',
 'eu-ai-act,compliance,startup,credit-scoring', @prod_id, 12, 2),

('How do we handle data subject rights (right to explanation) for ML model decisions?',
 'Under GDPR Article 22 individuals have the right to an explanation for automated decisions. Our model makes loan approvals. What technical approaches satisfy this requirement?',
 'gdpr,explainability,xai,shap,loan-decisions', @uni_id, 18, 2),

('Best open-source tools for red-teaming LLM-powered applications?',
 'We are building an LLM-powered HR assistant and our security team needs to red-team it before production launch. Any recommendations?',
 'llm-security,red-teaming,prompt-injection,open-source', @prod_id, 25, 2);

SET @q1 = (SELECT id FROM qna_posts ORDER BY id ASC LIMIT 1);
SET @q2 = (SELECT id FROM qna_posts ORDER BY id ASC LIMIT 1 OFFSET 1);
SET @q3 = (SELECT id FROM qna_posts ORDER BY id ASC LIMIT 1 OFFSET 2);

INSERT INTO qna_answers (post_id, author_id, body) VALUES
(@q1, @admin_id, 'Since your credit scoring model falls under Annex III of the EU AI Act (high-risk AI in credit assessment), start with a gap analysis. Prioritise your data governance documentation first as that is typically the largest gap. The EU database registration becomes mandatory by August 2026.'),
(@q1, @uni_id,   'For credit scoring, also be mindful of GDPR Article 22 running in parallel with the AI Act. Your conformity assessment should integrate both frameworks. Our ARC whitepapers in the Resources section cover this in detail.'),
(@q2, @admin_id, 'SHAP values alone are generally not legally sufficient for GDPR Article 22. The regulation requires a meaningful explanation understandable to a layperson. Contrastive explanations ("you were declined because X; if it were Y you would be approved") tend to satisfy regulatory requirements best.'),
(@q2, @uni_id,   'The Wachter et al. counterfactual explanations paper is the key academic reference here. No single technical standard has been codified yet — the standard will be set by early enforcement cases. Involve legal counsel alongside your technical decisions.'),
(@q3, @admin_id, 'The two most mature open-source tools are Garak (automated LLM vulnerability scanning) and Microsoft PyRIT. Garak is better for systematic automated scanning; PyRIT is better for multi-turn adversarial scenarios which match real attacker behaviour more closely.'),
(@q3, @prod_id,  'We built our internal red-teaming on top of Garak and found it very effective. One thing to note: open-source tools cover known patterns but you also need human red-teamers for creative adversarial testing, especially domain-specific abuse cases in HR.');

SELECT CONCAT('Seed complete. Users: ', (SELECT COUNT(*) FROM users), 
              ', Team: ', (SELECT COUNT(*) FROM team_members),
              ', Events: ', (SELECT COUNT(*) FROM events),
              ', Resources: ', (SELECT COUNT(*) FROM resources),
              ', News: ', (SELECT COUNT(*) FROM news),
              ', Awards: ', (SELECT COUNT(*) FROM awards),
              ', Nominees: ', (SELECT COUNT(*) FROM nominees),
              ', QnA posts: ', (SELECT COUNT(*) FROM qna_posts)) AS status;
