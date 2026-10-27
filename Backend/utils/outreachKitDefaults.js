/**
 * outreachKitDefaults.js
 * ─────────────────────────────────────────────────────────────────────────────
 * The default words of the outreach kit: the messages a Chapter Lead or Chapter Ambassador copies from
 * their dashboard to invite people they know. An administrator can change any of them (Admin → Chapter
 * Leads → Outreach kit); what they change is stored as a small set of overrides in app_settings and laid
 * over these defaults, so a template nobody edited always follows the latest default.
 *
 * How a message is built (the screen does this, see frontend/src/utils/outreachKit.js):
 *   {{name}} in a template is replaced, in two passes:
 *     1. a "shared block" (role_intro, fit, benefits ...) is replaced by the block's text for this person's
 *        role (lead / ambassador) and for the audience picked (vendor / tech enthusiast);
 *     2. a "variable" (first_name, chapter, link ...) is replaced by its value.
 *   Blocks hold the sentences that appear in many messages, so a change to, say, what a member gets is made
 *   once. A block may contain variables but not other blocks.
 *
 * Every statement here was checked against what the portal really does:
 *   - the sign-up link /register?ref=CODE already carries the referral code;
 *   - new accounts stay pending until an administrator approves them, then an email goes out;
 *   - membership is free for the first year (the sign-up page says so);
 *   - members download resources, but not the Framework playbooks (chapter teams and founding members only);
 *   - vendors post an "AI Product Showcase" and members can react "Need a POC";
 *   - there are no chats and Tech Social (the member feed) is not split by chapter.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const KIT_VERSION = 1;

export const TIERS = ['lead', 'ambassador'];
export const AUDIENCES = ['vendor', 'enthusiast'];

/** Everything a template may use between {{ }} besides the block names. `source` says where the value comes from. */
export const VARIABLES = [
    { name: 'first_name', label: "The recipient's first name", source: 'typed in by the person sending' },
    { name: 'company', label: "The recipient's company (vendors)", source: 'typed in by the person sending' },
    { name: 'topic', label: 'A topic you have been discussing', source: 'typed in by the person sending' },
    { name: 'month', label: 'A month to check back in', source: 'typed in by the person sending' },
    { name: 'free_link', label: 'A link to a free piece of content', source: 'typed in by the person sending' },
    { name: 'opener', label: '"thanks for connecting." or "hope you\'re doing well."', source: 'the "already connected" switch' },
    { name: 'your_name', label: 'Their name', source: 'their account' },
    { name: 'role', label: 'Their role: Chapter Lead or Chapter Ambassador', source: 'their account' },
    { name: 'chapter', label: 'Their chapter', source: 'their account' },
    { name: 'code', label: 'Their referral code', source: 'their account' },
    { name: 'link', label: 'Their sign-up link (it already has their code in it)', source: 'their account' },
];

/**
 * The shared blocks. `shape` says how the block is stored:
 *   tier          { lead, ambassador }          text that depends on the person's role
 *   audience      { vendor, enthusiast }        text that depends on who is being written to
 *   audienceList  { vendor: [...], enthusiast: [...] }   bullet points per audience
 *   list          [...]                         bullet points (or lines) for everyone
 *   text          "..."                         one piece of text
 */
export const BLOCK_META = [
    { name: 'role_intro', shape: 'tier', label: 'Who you are', help: 'The opening sentence of a message: who is writing, and for which chapter.' },
    { name: 'role_extra', shape: 'tier', label: 'Why you are writing (email)', help: 'The second sentence of the first email.' },
    { name: 'post_intro', shape: 'tier', label: 'Opening line of the LinkedIn post', help: 'The first line of the announcement post.' },
    { name: 'fit', shape: 'audience', label: 'Why it fits them', help: 'One sentence that says why this person would like RAC.' },
    { name: 'benefits', shape: 'audienceList', label: 'What a member gets (one person)', help: 'The bullet points in a message to one person. One per line.' },
    { name: 'broadcast_benefits', shape: 'list', label: 'What a member gets (announcements)', help: 'The bullet points in the LinkedIn post and the WhatsApp group message. One per line.' },
    { name: 'signup', shape: 'text', label: 'How to sign up', help: 'Must contain {{link}}. The link already carries the referral code, so people do not have to type it.' },
    { name: 'approval', shape: 'text', label: 'What happens after signing up', help: 'New accounts are approved by an administrator before the person can sign in.' },
    { name: 'etiquette', shape: 'text', label: 'Before you send (shown under the message)', help: 'A short reminder shown to the person sending.' },
    { name: 'rhythm', shape: 'list', label: 'When to follow up (shown under the message)', help: 'One line per step. Shown as a short list.' },
];

export const DEFAULT_BLOCKS = {
    role_intro: {
        lead: "I'm the chapter lead for {{chapter}} at Risk AI Council (RAC), a community for practical AI governance, risk and responsible adoption.",
        ambassador: "I'm a chapter ambassador for {{chapter}} at Risk AI Council (RAC), a community for practical AI governance, risk and responsible adoption.",
    },
    role_extra: {
        lead: "As chapter lead I'll be starting discussions on Tech Social, so I'd love to have you in them.",
        ambassador: "As an ambassador I'm inviting a few people from my own network whose views I value, and you came to mind first.",
    },
    post_intro: {
        lead: "Happy to share that I've joined Risk AI Council (RAC) as chapter lead for {{chapter}}.",
        ambassador: "Happy to share that I've joined Risk AI Council (RAC) as chapter ambassador for {{chapter}}.",
    },
    fit: {
        vendor: "Given what you're building at {{company}}, I think it's a strong fit.",
        enthusiast: "You're always on top of what's new in AI, so I think you'd enjoy it.",
    },
    benefits: {
        vendor: [
            'A place to showcase your AI products on Tech Social, join the discussions, and hear from members who would like a POC',
            "Tech Social: what's happening in AI right now, plus council announcements",
            'The resource library, including members-only material you can download',
        ],
        enthusiast: [
            'A seat in the discussions and polls that chapter leads and ambassadors start on Tech Social, where a lot of the real learning happens',
            "Tech Social: what's happening in AI right now, plus council announcements",
            'The resource library, including members-only material you can download',
        ],
    },
    broadcast_benefits: [
        'The resource library, including members-only material you can download',
        "Tech Social: what's happening in AI right now, plus council announcements",
        'For vendors: showcase your AI products on Tech Social and hear from members who would like a POC',
        'For tech enthusiasts: join the discussions and polls our chapter leads and ambassadors start',
    ],
    signup: 'Sign up with my link, which already has my referral code ({{code}}) filled in: {{link}}',
    approval: "Signing up takes a couple of minutes. An administrator then approves new accounts, and you'll get an email when yours is ready.",
    etiquette: 'Send these to people you know, one at a time, and make each message your own before you send it. If someone says no, or has not replied after the third note, stop.',
    rhythm: [
        'Day 0: already connected, send the LinkedIn message or the WhatsApp message. Not connected yet, send the connection request, and the message once they accept.',
        'Day 1 to 2: an email, if you have their address.',
        'Day 3 to 4: Reminder 1.',
        'Day 7 to 8: Reminder 2 (the vendor or the enthusiast version).',
        'Day 14: Reminder 3, then stop.',
        'Post the LinkedIn announcement and the WhatsApp group message once, on day 0.',
        'When someone has signed up, wait for their approval email to go out, then send the welcome and ask them to invite one more person.',
    ],
};

export const GROUPS = [
    { id: 'first', label: 'First message' },
    { id: 'announce', label: 'Announce' },
    { id: 'follow', label: 'Follow up' },
    { id: 'answers', label: 'Quick answers' },
];

const LIMIT_CONNECT = 200;   // what LinkedIn lets a free account write in a connection note

/**
 * The messages. `key` is what a person picks; `tier` / `audience` (when set) say which variant it is, and the
 * screen shows the one that matches who is signed in and who they are writing to. `channel` says which buttons
 * to offer (copy always; WhatsApp, email or LinkedIn links where they can carry the text). `needs_link` marks
 * messages that must keep the sign-up link, so an edit can never remove the way people join.
 */
const connect = (tier, audience, body) => ({
    key: 'connect', group: 'first', label: 'LinkedIn request', title: 'LinkedIn connection request', channel: 'linkedin_connect',
    tier, audience, limit: LIMIT_CONNECT, body,
    hint: 'LinkedIn limits the note on a connection request (200 characters on a free account). When they accept, send the LinkedIn message.',
});

export const DEFAULT_TEMPLATES = [
    // ── First message ──────────────────────────────────────────────────────────
    connect('lead', 'vendor', "Hi {{first_name}}, I lead the {{chapter}} chapter of Risk AI Council, a community on practical AI governance and risk. Vendors can use it to find POC partners. Would love to connect."),
    connect('lead', 'enthusiast', 'Hi {{first_name}}, I lead the {{chapter}} chapter of Risk AI Council, a community on practical AI governance and risk. Saw your interest in AI and would love to connect.'),
    connect('ambassador', 'vendor', "Hi {{first_name}}, I'm a chapter ambassador at Risk AI Council, a community on practical AI governance and risk. Vendors can use it to find POC partners. Would love to connect."),
    connect('ambassador', 'enthusiast', "Hi {{first_name}}, I'm a chapter ambassador at Risk AI Council, a community on practical AI governance and risk. Saw your interest in AI and would love to connect."),

    ...['vendor', 'enthusiast'].map((audience) => ({
        key: 'message', group: 'first', label: 'LinkedIn message', title: 'LinkedIn message', channel: 'linkedin_message', audience, needs_link: true,
        body: "Hi {{first_name}}, {{opener}}\n\n{{role_intro}} {{fit}}\n\nAs a member you get:\n{{benefits}}\n\n{{signup}}\n{{approval}} Happy to give you a 10-minute walkthrough if useful.\n\n{{your_name}}",
        hint: 'Day 0 if you are already connected, or as soon as a connection request is accepted. If they do not reply, Reminder 1 in 3 to 4 days.',
    })),

    ...['vendor', 'enthusiast'].map((audience) => ({
        key: 'whatsapp', group: 'first', label: 'WhatsApp', title: 'WhatsApp message (one to one)', channel: 'whatsapp', audience, needs_link: true,
        body: "Hi {{first_name}}! {{role_intro}}\n\n{{fit}} As a member you get:\n{{benefits}}\n\n{{signup}}\n{{approval}}\n\nShall I send you more details?",
        hint: 'For someone whose number you already have. "Open WhatsApp" lets you choose the contact there.',
    })),

    ...['vendor', 'enthusiast'].map((audience) => ({
        key: 'email', group: 'first', label: 'Email', title: 'Email', channel: 'email', audience, needs_link: true,
        subject: audience === 'vendor' ? 'An invite to Risk AI Council, and a place to show your AI products' : 'An invite to Risk AI Council',
        body: "Hi {{first_name}},\n\n{{role_intro}} {{role_extra}}\n\n{{fit}} As a member you get:\n\n{{benefits}}\n\nSome content is free for everyone. Membership, which is free for your first year, opens up all of it, plus Tech Social, the member feed and discussions.\n\n{{signup}}\n{{approval}}\n\nWould you like to join? Happy to answer any questions on a quick call.\n\nIf this isn't relevant, just tell me and I won't message you again.\n\nBest,\n{{your_name}}\n{{role}}, Risk AI Council, {{chapter}}",
        hint: 'Day 1 to 2, if you have their email address. If there is no reply, send the email reminder.',
    })),

    // ── Announce ───────────────────────────────────────────────────────────────
    {
        key: 'post', group: 'announce', label: 'LinkedIn post', title: 'LinkedIn post', channel: 'linkedin_post', needs_link: true,
        body: "{{post_intro}}\n\nRAC is a community for practical AI governance, risk and responsible adoption. Members get:\n{{broadcast_benefits}}\n\nIf you work on AI, or just love following it, join us. {{signup}}\n\nOr DM me and I'll help you get set up.\n\n#AIGovernance #ResponsibleAI #AIRisk #RiskAICouncil",
        hint: 'Post it once, on day 0. "Start a LinkedIn post" opens LinkedIn with this text in it.',
    },
    {
        key: 'group', group: 'announce', label: 'WhatsApp group', title: 'WhatsApp message (group or broadcast)', channel: 'whatsapp_group', needs_link: true,
        body: "Hi all 👋 {{role_intro}}\n\nMembers get:\n{{broadcast_benefits}}\n\n{{signup}}\n\nMessage me if you'd like help signing up.",
        hint: 'Send it once, on day 0, to a group you belong to or to your broadcast list.',
    },

    // ── Follow up ──────────────────────────────────────────────────────────────
    {
        key: 'reminder1', group: 'follow', label: 'Reminder 1', title: 'Reminder 1 (day 3 to 4)', channel: 'message', needs_link: true,
        body: "Hi {{first_name}}, just checking you saw my note about Risk AI Council. Here's the link again: {{link}} (it already has my referral code, {{code}}). Happy to help you sign up.",
        hint: 'For WhatsApp or LinkedIn, 3 to 4 days after the first message.',
    },
    {
        key: 'reminder2', group: 'follow', label: 'Reminder 2', title: 'Reminder 2, vendor (day 7 to 8)', channel: 'message', audience: 'vendor', needs_link: true,
        body: "Hi {{first_name}}, one more on RAC. Tech Social is where members share what's new in AI, and a good place to showcase your product and hear from members who would like a POC. {{link}} Want me to share a couple of recent posts first?",
        hint: 'Day 7 to 8.',
    },
    {
        key: 'reminder2', group: 'follow', label: 'Reminder 2', title: 'Reminder 2, tech enthusiast (day 7 to 8)', channel: 'message', audience: 'enthusiast', needs_link: true,
        body: "Hi {{first_name}}, one more on RAC. There are discussions and polls about {{topic}} on Tech Social, and I think you'd enjoy them. {{link}}",
        hint: 'Day 7 to 8. Add the topic you mean.',
    },
    {
        key: 'reminder3', group: 'follow', label: 'Reminder 3', title: 'Reminder 3, the last note (day 14)', channel: 'message', needs_link: true,
        body: "Hi {{first_name}}, last nudge from me on Risk AI Council, promise. If now isn't the right time, no problem at all. The invite stays open: {{link}}",
        hint: 'Day 14. After this one, stop.',
    },
    {
        key: 'email_reminder', group: 'follow', label: 'Email reminder', title: 'Email reminder', channel: 'email', needs_link: true,
        subject: 'Re: An invite to Risk AI Council',
        body: "Hi {{first_name}},\n\nBumping this up in case it got buried. The quick version: Risk AI Council is a community for practical AI governance, risk and responsible adoption. Members get the resource library (with downloads), Tech Social for what's happening in AI, and the discussions.\n\n{{signup}}\n\nBest,\n{{your_name}}",
        hint: 'Send it as a reply to your first email.',
    },
    {
        key: 'said_yes', group: 'follow', label: 'Said yes', title: "Said yes but hasn't signed up", channel: 'message', needs_link: true,
        body: "Hi {{first_name}}, great to hear you're in! Here's everything in one place: {{link}} (my referral code, {{code}}, is already in it). Signing up takes a couple of minutes, and an administrator approves new accounts, so you'll get an email when yours is ready. Ping me if anything gets stuck.",
        hint: 'For someone who said yes but has not signed up yet.',
    },
    {
        key: 'welcome', group: 'follow', label: 'Welcome', title: 'Welcome, once they have joined', channel: 'message',
        body: "Welcome to Risk AI Council, {{first_name}}! 🎉 Good places to start: Tech Social, for the latest in AI, council announcements and the discussions. Vendors: showcase your product there. If you know someone who'd enjoy it, I'm happy to invite them too.",
        hint: 'Send it once their approval email has gone out, not before.',
    },

    // ── Quick answers ──────────────────────────────────────────────────────────
    {
        key: 'faq_cost', group: 'answers', label: 'What does it cost?', title: 'Answer: "What does it cost?"', channel: 'message',
        body: 'Membership is free for your first year. Some content is open to everyone, and membership unlocks all of it, plus downloads and Tech Social, the member feed and discussions.',
        hint: 'Say nothing about what happens after the first year until the council has confirmed it.',
    },
    {
        key: 'faq_difference', group: 'answers', label: 'Free or member?', title: 'Answer: "What\'s the difference between free and member?"', channel: 'message',
        body: 'Anyone can read the free content. Members get everything, including members-only material, can download resources, and can join Tech Social, the member feed and discussions.',
    },
    {
        key: 'faq_after', group: 'answers', label: 'After I sign up?', title: 'Answer: "What happens after I sign up?"', channel: 'message',
        body: "After you sign up, an administrator approves your account and you'll get an email when it's ready. Then you can sign in and start. If you haven't heard back after a few days, let me know.",
    },
    {
        key: 'faq_not_risk', group: 'answers', label: 'Not in risk?', title: 'Answer: "I\'m not in risk or compliance"', channel: 'message',
        body: "You don't need to be. RAC is for builders and AI enthusiasts too, and Tech Social is a great way to keep up with what's happening in AI.",
    },
    {
        key: 'faq_not_now', group: 'answers', label: 'Not right now', title: 'Answer: "Not right now"', channel: 'message',
        body: "No problem at all. Can I check back in {{month}}? Meanwhile, here's a piece from our free content you might like: {{free_link}}",
        hint: 'Add the month, and a link to something on the site that anyone can read.',
    },
    {
        key: 'faq_team', group: 'answers', label: 'Share with my team?', title: 'Answer: "Can I share this with my team?"', channel: 'message', needs_link: true,
        body: 'Please do! Each person can sign up with my link: {{link}}',
    },
].map((t) => ({ tier: null, audience: null, subject: null, hint: null, limit: null, needs_link: false, ...t }))
    .map((t) => ({ ...t, id: `${t.key}.${t.tier || 'any'}.${t.audience || 'any'}` }));
