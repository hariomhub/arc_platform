/**
 * emailService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Production email service for Risk AI Council.
 *
 * Provider-agnostic SMTP via Nodemailer. Supports Gmail, SendGrid, Azure
 * Communication Services, and any standard SMTP relay.
 *
 * Required env vars:
 *  SMTP_HOST     e.g. smtp.gmail.com | smtp.sendgrid.net | smtp.azurecomm.net
 *  SMTP_PORT     e.g. 587 (STARTTLS) | 465 (TLS) — defaults to 587
 *  SMTP_SECURE    "true" for port 465, omit/false for port 587
 *  SMTP_USER     Your SMTP username / email address
 *  SMTP_PASS     App password or API key
 *  SMTP_FROM_NAME   Display name (default: "Risk AI Council")
 *  SMTP_FROM_EMAIL  Sender email (default: value of SMTP_USER)
 * EMAIL_BASE_URL  Public site URL for every link and the logo in emails. Falls back to
 *               FRONTEND_URL, then APP_URL (both ignored when localhost), then the live site.
 *  CONTACT_RECEIVER_EMAIL  Where Contact-form messages are delivered. Optional;
 *               comma-separated for several recipients
 *               (default: support@riskaicouncil.org)
 *
 * Design:
 *  • All send functions are fire-and-forget — failures are logged but never
 *   propagate to the caller, so email errors never break an API response.
 *  • Transporter is created once (connection pool) on first use.
 *  • Email is silently skipped if SMTP is not configured (safe for local dev).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import nodemailer from 'nodemailer';

// ── Transporter (lazy singleton) ──────────────────────────────────────────────
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  _transporter = nodemailer.createTransport({
    host:      SMTP_HOST,
    port:      parseInt(process.env.SMTP_PORT || '587', 10),
    secure:     process.env.SMTP_SECURE === 'true',  // true = port 465 TLS
    auth:      { user: SMTP_USER, pass: SMTP_PASS },
    pool:      true,    // reuse connections
    maxConnections: 5,
    maxMessages:  100,
    rateDelta:   1000,    // per second
    rateLimit:   10,     // max 10 msgs/s
    // Fail fast when the SMTP host is unreachable. Nodemailer's defaults are
    // 2 min (connect) / 10 min (socket), which would leave a request that
    // awaits an email — e.g. the Contact form — hanging on "Sending…".
    connectionTimeout: 10000,
    greetingTimeout:  10000,
    socketTimeout:   30000,
  });

  return _transporter;
};

// ── Shared helpers ────────────────────────────────────────────────────────────
const FROM = () =>
  `"${process.env.SMTP_FROM_NAME || 'Risk AI Council'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;

// Every link and the logo in an email must point at the PUBLIC site, on the same domain
// the mail is sent from: links to a different or random-looking host are a classic spam
// signal. Order: EMAIL_BASE_URL (always wins) -> FRONTEND_URL -> APP_URL (both ignored
// when they are localhost) -> the live site.
const PUBLIC_SITE_URL = 'https://www.riskaicouncil.org';
const APP_URL = () => {
  const explicit = process.env.EMAIL_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const isLocalhost = (u) => /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(u);
  const candidate = [process.env.FRONTEND_URL, process.env.APP_URL].find((u) => u && !isLocalhost(u));
  return (candidate || PUBLIC_SITE_URL).replace(/\/$/, '');
};

const ROLE_LABELS = {
  professional:    'Professional',
  executive:       'Chapter Lead',
  council_member:  'Chapter Lead',
  founding_member: 'Founding Member',
  admin:           'Administrator',
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return String(dateStr); }
};

const formatTime = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  } catch { return null; }
};

const buildGCalUrl = (title, dateStr, location) => {
  if (!dateStr) return null;
  try {
    const start = new Date(dateStr);
    const end  = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt  = (d) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    const p   = new URLSearchParams({
      action:  'TEMPLATE',
      text:   title,
      dates:  `${fmt(start)}/${fmt(end)}`,
      details: `Risk AI Council Event — ${APP_URL()}/events`,
      location: location || '',
    });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  } catch { return null; }
};

// ── Plain-text part ───────────────────────────────────────────────────────────
// Every message goes out as multipart/alternative (HTML + plain text). HTML-only mail
// is scored down by spam filters, and some mail clients show only the text part.
const decodeEntities = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&zwnj;/g, '').replace(/&middot;/g, '·')
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&rarr;/g, '→')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&');

const htmlToText = (html) => {
  let t = String(html || '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<div style="display:none[\s\S]*?<\/div>/gi, '');   // the hidden preview line

  // Links: "label (url)" so nothing is lost without the HTML.
  t = t.replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
    const l = label.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const url = decodeEntities(href);
    if (url.startsWith('mailto:')) {
      const addr = url.slice(7).split('?')[0];
      return !l || l === addr ? addr : `${l} (${addr})`;
    }
    return !l || l === url ? url : `${l}: ${url}`;
  });

  t = t
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|tr|table|li)>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/td>/gi, '  ')
    .replace(/<[^>]+>/g, '');

  return decodeEntities(t)
    .split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// The address people should write to; Reply-To for mail nobody should reply to the From address of.
const supportAddress = () => {
  const first = String(process.env.CONTACT_RECEIVER_EMAIL || '').split(',')[0].trim();
  return first || 'support@riskaicouncil.org';
};

// Tells auto-responders (out-of-office and the like) not to answer these messages.
const AUTOMATED_HEADERS = { 'Auto-Submitted': 'auto-generated', 'X-Auto-Response-Suppress': 'OOF, AutoReply' };

/**
 * Add what every message needs: the plain-text part, a Reply-To, and (for automated mail)
 * the auto-response headers. Pass `automated: false` for mail a person wrote.
 */
const finalize = (mailOptions) => {
  const { automated = true, ...message } = mailOptions;
  if (!message.text && message.html) message.text = htmlToText(message.html);
  if (!message.replyTo) message.replyTo = supportAddress();
  message.headers = { ...(automated ? AUTOMATED_HEADERS : {}), ...(message.headers || {}) };
  return message;
};

// ── Fire-and-forget dispatcher ────────────────────────────────────────────────
// Never throws. Resolves true when the message was accepted by the SMTP relay,
// false when it was skipped (SMTP not configured) or failed. Most callers ignore
// the result; callers that must know whether delivery happened can await it.
const send = async (mailOptions) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`[Email] SMTP not configured — skipped: "${mailOptions.subject}" → ${mailOptions.to}`);
    return false;
  }
  try {
    const info = await transporter.sendMail(finalize(mailOptions));
    console.info(`[Email] ✓ Sent "${mailOptions.subject}" → ${mailOptions.to} (${info.messageId})`);
    return true;
  } catch (err) {
    console.error(`[Email] ✗ Failed "${mailOptions.subject}" → ${mailOptions.to}:`, err.message);
    return false;
  }
};

// ── Untrusted-text helpers (for values typed by anonymous visitors) ───────────
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Collapse whitespace/newlines so a value is safe inside a subject line.
const oneLine = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

// Escape first, then turn line breaks into <br> — never the other way round.
const nl2br = (value) => escapeHtml(value).replace(/\r?\n/g, '<br>');

// ── HTML component helpers ────────────────────────────────────────────────────
const infoRow = (label, value) => {
  if (!value) return '';
  return `
  <tr>
   <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
     <tr>
      <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;width:130px;vertical-align:top;padding-top:1px;">${label}</td>
      <td style="font-size:14px;color:#1e293b;font-weight:500;line-height:1.5;">${value}</td>
     </tr>
    </table>
   </td>
  </tr>`;
};

const badge = (text, color = '#003366', bg = 'rgba(0,51,102,0.1)') =>
  `<span style="display:inline-block;background:${bg};color:${color};border-radius:100px;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;">${text}</span>`;

const ctaButton = (label, url) => `
  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto 0;">
   <tr>
    <td align="center" bgcolor="#003366" style="border-radius:4px;">
     <a href="${url}" target="_blank"
       style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.025em;border-radius:4px;background:#003366;">
      ${label}
     </a>
    </td>
   </tr>
  </table>`;

const checkListItem = (text) =>
  `<tr><td style="padding:5px 0;font-size:13px;color:#475569;line-height:1.6;">${text}</td></tr>`;

const esc = escapeHtml;

// The first word of a name, for greetings. Plain text: escape it before putting it in HTML.
const firstNameOf = (name, fallback = 'there') => String(name || '').trim().split(/\s+/)[0] || fallback;

const heading = (html) => `<h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1e293b;">${html}</h2>`;

const lead = (html) => `<p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.65;">${html}</p>`;

const sectionLabel = (label) =>
  `<p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">${label}</p>`;

const TONES = {
  info:    { bg: '#eff6ff', border: '#93c5fd', title: '#1d4ed8', text: '#1e40af' },
  success: { bg: '#f0fdf4', border: '#86efac', title: '#15803d', text: '#166534' },
  warning: { bg: '#fffbeb', border: '#fcd34d', title: '#92400e', text: '#b45309' },
  danger:  { bg: '#fef2f2', border: '#fca5a5', title: '#991b1b', text: '#b91c1c' },
};

// A coloured callout with a bold title. `bodyHtml` may contain markup: escape user text first.
const banner = (tone, title, bodyHtml) => {
  const t = TONES[tone] || TONES.info;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="background:${t.bg};border:1.5px solid ${t.border};border-radius:10px;margin-bottom:28px;">
     <tr>
      <td style="padding:16px 20px;">
       <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${t.title};">${title}</p>
       <div style="margin:0;font-size:13px;color:${t.text};line-height:1.6;">${bodyHtml}</div>
      </td>
     </tr>
    </table>`;
};

// Label/value rows. Pass already-escaped values (use infoRow() for each row).
const detailsTable = (rowsHtml, marginBottom = 28) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:${marginBottom}px;">
     ${rowsHtml}
    </table>`;

// A grey box with a small title and a bulleted list. Items are HTML (escape user text first).
const listBox = (title, items) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="background:#f8fafc;border-radius:10px;margin-bottom:8px;">
     <tr>
      <td style="padding:20px 22px;">
       <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">${title}</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${items.map((item) => checkListItem(`• &nbsp;${item}`)).join('\n        ')}
       </table>
      </td>
     </tr>
    </table>`;

// A note with a coloured left edge.
const callout = (title, bodyHtml, edge = '#003366') => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="background:#f8fafc;border-left:3px solid ${edge};border-radius:0 8px 8px 0;margin-bottom:4px;">
     <tr>
      <td style="padding:14px 18px;">
       <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1e293b;">${title}</p>
       <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">${bodyHtml}</p>
      </td>
     </tr>
    </table>`;

// The big one-time code.
const codeBox = (label, code) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;margin-bottom:28px;text-align:center;">
     <tr>
      <td style="padding:24px 20px;">
       <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">${label}</p>
       <div style="font-size:36px;font-weight:800;letter-spacing:0.25em;color:#003366;font-family:'Courier New',Courier,monospace;">${esc(code)}</div>
      </td>
     </tr>
    </table>`;

// The time-limit note under a code.
const expiryNote = (minutes, ignoreText) => banner(
  'warning',
  `Valid for ${minutes} minutes`,
  `This code expires in ${minutes} minutes and works only once. ${ignoreText}`,
);


// ── Master layout ─────────────────────────────────────────────────────────────
const DEFAULT_FOOTER_NOTE = 'You received this email because you have an account on the Risk AI Council platform.';

const layout = (bodyHtml, previewText = '', footerNote = DEFAULT_FOOTER_NOTE) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
 <meta charset="UTF-8" />
 <meta name="viewport" content="width=device-width,initial-scale=1" />
 <meta http-equiv="X-UA-Compatible" content="IE=edge" />
 <meta name="x-apple-disable-message-reformatting" />
 <title>Risk AI Council</title>
 <!--[if mso]>
 <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
 <![endif]-->
 <style>
  @media only screen and (max-width:620px) {
   .email-container { width:100%!important; }
   .email-body-pad { padding:28px 20px!important; }
   .email-header  { padding:28px 24px!important; }
   .email-footer  { padding:20px 24px!important; }
  }
 </style>
</head>
<body style="margin:0;padding:0;background-color:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

 ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef2f7">
  <tr>
   <td align="center" style="padding:40px 16px;">

    <!-- Outer card -->
    <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0"
        style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">

     <!-- ═══ HEADER ═══ -->
     <tr>
      <td class="email-header" align="center" bgcolor="#003366" style="background-color:#003366;background:linear-gradient(135deg,#001a33 0%,#003366 55%,#005599 100%);padding:36px 40px 32px;text-align:center;">
       <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px auto;">
        <tr>
         <td valign="middle" style="padding-right:10px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:10px;">
           <tr>
            <td align="center" valign="middle" width="40" height="40" style="width:40px;height:40px;border-radius:10px;">
             <img src="${APP_URL()}/rac_u_logo.png" alt="Risk AI Council" width="30" height="30" style="display:block;width:30px;height:30px;object-fit:contain;" />
            </td>
           </tr>
          </table>
         </td>
         <td valign="middle">
          <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;display:block;padding-top:2px;">Risk AI Council</span>
         </td>
        </tr>
       </table>
       <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.65);letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">Advancing Responsible AI Governance</p>
      </td>
     </tr>

     <!-- ═══ BODY ═══ -->
     <tr>
      <td class="email-body-pad" style="padding:40px 40px 36px;">
       ${bodyHtml}
      </td>
     </tr>

     <!-- ═══ FOOTER ═══ -->
     <tr>
      <td class="email-footer" style="background:#f8fafc;border-top:1px solid #e8edf3;padding:24px 40px;text-align:center;">
       <p style="margin:0 0 8px;font-size:12px;color:#64748b;">
        <a href="${APP_URL()}" style="color:#003366;text-decoration:none;font-weight:600;">Visit Website</a>
        &nbsp;&middot;&nbsp;
        <a href="${APP_URL()}/events" style="color:#003366;text-decoration:none;font-weight:600;">Events</a>
        &nbsp;&middot;&nbsp;
        <a href="${APP_URL()}/contact" style="color:#003366;text-decoration:none;font-weight:600;">Contact Us</a>
       </p>
       <p style="margin:0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} Risk AI Council. All rights reserved.</p>
       <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">Questions? Write to <a href="mailto:support@riskaicouncil.org" style="color:#64748b;">support@riskaicouncil.org</a></p>
       <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">${footerNote}</p>
      </td>
     </tr>

    </table>
    <!-- / Outer card -->

   </td>
  </tr>
 </table>
</body>
</html>`;


// ════════════════════════════════════════════════════════════════════════════════
// EXPORTED EMAIL SENDERS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * sendWelcomeEmail
 * Triggered immediately after a user completes registration.
 * Confirms receipt and explains the pending-approval workflow.
 *
 * @param {{ name: string, email: string, role: string, organizationName?: string }} opts
 */
export const sendWelcomeEmail = ({ name, email, role, organizationName }) => {
  const roleLabel = ROLE_LABELS[role] || 'Member';
  const first = firstNameOf(name);

  const html = layout(`
    ${heading(`Welcome, ${esc(first)}!`)}
    ${lead('Thank you for registering with Risk AI Council. We have received your request and summarised your details below.')}
    ${banner('warning', 'Your account is pending review', 'Our team is reviewing your account. You will receive a separate email as soon as it is approved, typically within <strong>24–48 hours</strong>.')}

    ${sectionLabel('Your account details')}
    ${detailsTable(`
     ${infoRow('Full name', esc(name))}
     ${infoRow('Email', esc(email))}
     ${infoRow('Membership', badge(esc(roleLabel)))}
     ${organizationName ? infoRow('Organisation', esc(organizationName)) : ''}
    `)}

    ${listBox('What happens next?', [
      'Our team reviews your registration',
      'You receive an approval confirmation email',
      'You sign in and get full access to the Risk AI Council platform',
    ])}

    ${ctaButton('Explore the platform', APP_URL())}
  `,
  `Welcome to Risk AI Council, ${esc(first)}. Your account is pending review.`);

  send({ from: FROM(), to: email, subject: `Welcome to Risk AI Council, ${oneLine(first)}`, html });
};


/**
 * sendAccountApprovedEmail
 * Triggered when an admin approves a user's account.
 *
 * @param {{ name: string, email: string, role: string }} opts
 */
export const sendAccountApprovedEmail = ({ name, email, role, profile_badge }) => {
  const roleLabel = ROLE_LABELS[role] || 'Member';
  const first = firstNameOf(name);
  const tag = profile_badge
    ? `<br><br><strong>Assigned tag:</strong> ${badge(esc(profile_badge), '#15803d', 'rgba(21,128,61,0.1)')}`
    : '';

  const html = layout(`
    ${heading(`You're in, ${esc(first)}!`)}
    ${lead('Your Risk AI Council account has been reviewed and <strong style="color:#15803d;">approved</strong>. You now have full access to the platform.')}
    ${banner('success', 'Account approved', `Your <strong>${esc(roleLabel)}</strong> membership is now active. Sign in to explore everything the council has to offer.${tag}`)}

    ${listBox('Available to you now', [
      'Browse research papers, whitepapers &amp; resources',
      'Register for upcoming AI governance events',
      'Join the discussion on Tech Social',
      'Submit nominations for the awards',
      'Explore the AI Risk Framework',
    ])}

    ${ctaButton('Sign in to your account', `${APP_URL()}/login`)}
  `,
  'Your Risk AI Council account has been approved. Welcome aboard.');

  send({ from: FROM(), to: email, subject: 'Your Risk AI Council account is approved', html });
};


/**
 * sendEventRegistrationEmail
 * Triggered immediately after a user successfully registers for an event.
 *
 * @param {{ name: string, email: string, organization?: string, event: object, registrationId: number }} opts
 */
export const sendEventRegistrationEmail = ({ name, email, organization, event, registrationId }) => {
  const { title, date, location, event_category } = event;
  const first = firstNameOf(name);
  const dateLabel = formatDate(date);
  const timeLabel = formatTime(date);
  const gcalUrl = buildGCalUrl(title, date, location);
  const refId = registrationId ? `#${String(registrationId).padStart(6, '0')}` : null;

  const html = layout(`
    ${heading("You're registered!")}
    ${lead(`Hi ${esc(first)}, your spot for <strong style="color:#003366;">${esc(title)}</strong> has been confirmed. Keep this email, as you may be asked to show it at check-in.`)}

    <!-- Event card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
     <tr><td bgcolor="#0066cc" style="height:4px;background-color:#0066cc;background:linear-gradient(90deg,#003366,#0066cc,#0099cc);"></td></tr>
     <tr>
      <td style="padding:22px 24px 8px;">
       ${event_category ? badge(esc(event_category), '#0055aa', 'rgba(0,85,170,0.09)') : ''}
       <h3 style="margin:10px 0 0;font-size:19px;font-weight:800;color:#1e293b;line-height:1.3;">${esc(title)}</h3>
      </td>
     </tr>
     <tr>
      <td style="padding:6px 24px 24px;">
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${dateLabel ? infoRow('Date', esc(dateLabel) + (timeLabel ? `&nbsp; <span style="color:#94a3b8;">·</span> &nbsp;${esc(timeLabel)}` : '')) : ''}
        ${location ? infoRow('Location', esc(location)) : ''}
        ${infoRow('Registered as', esc(name))}
        ${infoRow('Email', esc(email))}
        ${organization ? infoRow('Organisation', esc(organization)) : ''}
        ${refId ? infoRow('Ref&nbsp;ID', `<code style="background:#f1f5f9;padding:3px 8px;border-radius:5px;font-family:monospace;font-size:13px;color:#334155;">${refId}</code>`) : ''}
       </table>
      </td>
     </tr>
    </table>

    ${gcalUrl ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 24px;">
     <tr>
      <td style="border:1.5px solid #e2e8f0;border-radius:8px;background:#ffffff;">
       <a href="${esc(gcalUrl)}" target="_blank"
         style="display:inline-block;padding:11px 22px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;">
         Add to Google Calendar
       </a>
      </td>
     </tr>
    </table>` : ''}

    ${callout('Please keep this email', 'Save it as your confirmation. For changes or cancellations, contact us at least 24 hours before the event.')}

    ${ctaButton('View all events', `${APP_URL()}/events`)}
  `,
  `Confirmed: you're registered for ${esc(title)}${dateLabel ? ` on ${esc(dateLabel)}` : ''}`);

  send({ from: FROM(), to: email, subject: `Registration confirmed: ${oneLine(title)}`, html });
};

// ─── Membership role labels (current 3-tier system) ───────────────────────────
const MEMBERSHIP_ROLE_LABELS = {
  professional:  'Professional',
  executive:   'Chapter Lead',
  council_member: 'Chapter Lead',
  founding_member: 'Founding Member',
};

const MEMBERSHIP_DURATION = {
  professional:  '1-year membership',
  executive:   '3-year membership',
  founding_member: 'Lifetime membership',
};

/**
 * sendMembershipExpiryWarningEmail
 * Sent ~7 days before membership_expires_at.
 *
 * @param {{ name: string, email: string, role: string, expiresAt: string|Date, daysLeft: number }} opts
 */
export const sendMembershipExpiryWarningEmail = ({ name, email, role, expiresAt, daysLeft }) => {
  const first = firstNameOf(name, 'Member');
  const roleLabel = MEMBERSHIP_ROLE_LABELS[role] || role;
  const expiryDate = formatDate(expiresAt) || String(expiresAt);
  const days = `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;

  const html = layout(`
    ${heading('Your membership expires soon')}
    ${lead(`Hi ${esc(first)}, your <strong>${esc(roleLabel)}</strong> membership will expire in <strong>${days}</strong>.`)}
    ${banner('warning', 'Your membership is about to expire', `Your membership will expire on <strong>${esc(expiryDate)}</strong>. After that, access to members-only content is suspended until your membership is renewed.`)}

    ${sectionLabel('Your membership')}
    ${detailsTable(`
     ${infoRow('Name', esc(name))}
     ${infoRow('Email', esc(email))}
     ${infoRow('Tier', badge(esc(roleLabel)))}
     ${infoRow('Duration', esc(MEMBERSHIP_DURATION[role] || ''))}
     ${infoRow('Expires on', esc(expiryDate))}
     ${infoRow('Days left', days)}
    `)}

    ${listBox('What happens when it expires?', [
      'Access to member-only content is restricted',
      'Framework downloads &amp; audit templates become unavailable',
      'You receive a final expiry notification',
      'Contact us to renew and restore full access',
    ])}

    ${ctaButton('Contact us to renew', `${APP_URL()}/contact`)}
  `,
  `Your ${esc(roleLabel)} membership expires in ${days}. Renew to keep your access.`);

  send({ from: FROM(), to: email, subject: `Your ${oneLine(roleLabel)} membership expires in ${days}`, html });
};

/**
 * sendMembershipExpiredEmail
 * Sent on the day membership_expires_at is reached (or the day after).
 *
 * @param {{ name: string, email: string, role: string, expiredAt: string|Date }} opts
 */
export const sendMembershipExpiredEmail = ({ name, email, role, expiredAt }) => {
  const first = firstNameOf(name, 'Member');
  const roleLabel = MEMBERSHIP_ROLE_LABELS[role] || role;
  const expiryDate = formatDate(expiredAt) || String(expiredAt);

  const html = layout(`
    ${heading('Your membership has expired')}
    ${lead(`Hi ${esc(first)}, your <strong>${esc(roleLabel)}</strong> membership expired on <strong>${esc(expiryDate)}</strong>.`)}
    ${banner('danger', 'Membership expired', 'Your access to members-only content has been suspended. Reach out to our team to discuss renewal options and restore your full access.')}

    ${sectionLabel('Membership details')}
    ${detailsTable(`
     ${infoRow('Name', esc(name))}
     ${infoRow('Email', esc(email))}
     ${infoRow('Tier', badge(esc(roleLabel), '#991b1b', 'rgba(153,27,27,0.1)'))}
     ${infoRow('Expired on', esc(expiryDate))}
     ${infoRow('Status', badge('Expired', '#991b1b', 'rgba(153,27,27,0.1)'))}
    `)}

    ${listBox('Your options', [
      'Contact our team to discuss renewal',
      'Visit the Membership page to see your options',
      'Public content (news and events) stays accessible',
    ])}

    ${ctaButton('Contact us to renew', `${APP_URL()}/contact`)}
  `,
  `Your ${esc(roleLabel)} membership has expired. Contact us to renew.`);

  send({ from: FROM(), to: email, subject: `Your ${oneLine(roleLabel)} membership has expired`, html });
};


/**
 * sendExecutiveApplicationAdminEmail
 * Sent to the admin when a member submits a Chapter Lead application.
 *
 * @param {{ adminEmail: string, adminName?: string, application: object }} opts
 *  application: { applicant_name, applicant_email, organization_name, job_title, linkedin_url, phone, created_at }
 */
export const sendExecutiveApplicationAdminEmail = ({ adminEmail, adminName, application }) => {
  const a = application || {};
  const applicantName = a.applicant_name ?? a.full_name ?? '';
  const applicantEmail = a.applicant_email ?? a.email ?? '';
  const { organization_name, job_title, linkedin_url, phone, created_at } = a;
  const appliedOn = formatDate(created_at) || formatDate(new Date());
  const adminFirst = firstNameOf(adminName, 'Admin');

  const html = layout(`
    ${heading('New Chapter Lead application')}
    ${lead(`Hi ${esc(adminFirst)}, a member has applied to become a <strong>Chapter Lead</strong> and is waiting for your review.`)}
    ${banner('info', 'Action required', 'Please review this application in the admin dashboard and approve or reject it. The applicant is notified of your decision automatically.')}

    ${sectionLabel('Applicant details')}
    ${detailsTable(`
     ${infoRow('Name', esc(applicantName))}
     ${infoRow('Email', applicantEmail ? `<a href="mailto:${esc(applicantEmail)}" style="color:#0066cc;">${esc(applicantEmail)}</a>` : '')}
     ${infoRow('Organisation', esc(organization_name || '—'))}
     ${infoRow('Job title', esc(job_title || '—'))}
     ${infoRow('LinkedIn', linkedin_url ? `<a href="${esc(linkedin_url)}" style="color:#0066cc;">${esc(linkedin_url)}</a>` : '—')}
     ${infoRow('Phone', esc(phone || '—'))}
     ${infoRow('Applied on', esc(appliedOn))}
    `)}

    ${ctaButton('Review in the admin dashboard', `${APP_URL()}/admin-dashboard?tab=pending`)}
  `,
  `New Chapter Lead application from ${esc(applicantName || 'a member')}. Action required.`);

  send({ from: FROM(), to: adminEmail, subject: `New Chapter Lead application: ${oneLine(applicantName) || 'a member'}`, html });
};


/**
 * sendMembershipApplicationReceivedEmail
 * Sent to the applicant confirming their application was received.
 *
 * @param {{ name: string, email: string, requestedRole: 'council_member'|'founding_member' }} opts
 */
export const sendMembershipApplicationReceivedEmail = ({ name, email, requestedRole, tier, reviewer }) => {
  const first = firstNameOf(name);
  const isFounding = requestedRole === 'founding_member';
  const isAmbassador = !isFounding && tier === 'ambassador';
  const roleLabel = isFounding ? 'Founding Member' : (isAmbassador ? 'Chapter Ambassador' : 'Chapter Lead');
  const byLead = isAmbassador && reviewer === 'lead';

  const summary = isFounding
    ? 'Your Founding Member invitation request has been received. Our team will carefully review your application and reach out if you are selected.'
    : isAmbassador
      ? `Your Chapter Ambassador application has been submitted and is under review by ${byLead ? "your chapter's Chapter Lead" : 'our admin team'}. You will be notified once a decision is made.`
      : 'Your Chapter Lead application has been submitted and is under admin review. You will be notified once a decision is made.';

  const steps = isFounding
    ? [
      'Your application is reviewed by the founding team',
      'You will be contacted directly if selected',
      "Founding Members help shape the Risk AI Council's future",
    ]
    : isAmbassador
      ? [
        byLead ? "Your chapter's Chapter Lead reviews your application" : 'Our admin team reviews your application',
        'You receive an email with the decision',
        'If approved, your account becomes a Chapter Ambassador account and your dashboard opens up',
      ]
      : [
        'Our admin team reviews your Chapter Lead application',
        'You receive an email with the decision',
        'If approved, your account becomes a Chapter Lead account and your dashboard opens up',
      ];

  const html = layout(`
    ${heading('Application received')}
    ${lead(`Hi ${esc(first)}, we have received your <strong>${roleLabel}</strong> application. Thank you for your interest.`)}
    ${banner('info', 'Your application is under review', summary)}

    ${sectionLabel('Your application')}
    ${detailsTable(`
     ${infoRow('Name', esc(name))}
     ${infoRow('Email', esc(email))}
     ${infoRow('Requested role', badge(roleLabel))}
     ${infoRow('Status', badge('Under review', '#92400e', '#fffbeb'))}
    `)}

    ${listBox('What happens next?', steps)}

    ${ctaButton('Back to the platform', APP_URL())}
  `,
  `Your ${roleLabel} application has been received. We will be in touch soon.`);

  send({ from: FROM(), to: email, subject: `We've received your ${roleLabel} application`, html });
};


/**
 * sendMembershipApplicationStatusEmail
 * Sent to the applicant when an admin approves or rejects their application.
 *
 * @param {{ name: string, email: string, requestedRole: 'council_member'|'founding_member', status: 'approved'|'rejected', adminNotes?: string }} opts
 */
export const sendMembershipApplicationStatusEmail = ({ name, email, requestedRole, status, adminNotes, profile_badge, tier }) => {
  const first = firstNameOf(name, 'there');
  const isFounding = requestedRole === 'founding_member';
  const isAmbassador = !isFounding && tier === 'ambassador';
  const roleLabel = isFounding ? 'Founding Member' : (isAmbassador ? 'Chapter Ambassador' : 'Chapter Lead');
  const isApproved = status === 'approved';

  const tag = profile_badge
    ? `<br><br><strong>Assigned tag:</strong> ${badge(esc(profile_badge), '#15803d', 'rgba(21,128,61,0.1)')}`
    : '';
  const bannerHtml = isApproved
    ? banner('success', 'Application approved', `Congratulations. Your <strong>${roleLabel}</strong> membership is now active. Sign in to access your new member benefits.${tag}`)
    : banner('danger', 'Application not approved', `After reviewing your application, we were unable to approve your <strong>${roleLabel}</strong> membership at this time. Your existing Professional membership remains active.`);

  const benefits = isFounding
    ? [
      'Lifetime Founding Member status on Risk AI Council',
      'Direct input on council direction and governance',
      'Exclusive founding member events and roundtables',
      'Recognition in the Risk AI Council founding members list',
    ]
    : isAmbassador
      ? [
        'Your Chapter Ambassador dashboard, with quarterly goals and tracking',
        'Your personal referral code and link for inviting new members',
        'Write blogs and request to host podcasts or workshops',
        'Share posts on Tech Social',
        'A volunteer role: it does not include revenue share or commission',
      ]
      : [
        'Your Chapter Lead dashboard, with quarterly goals and tracking',
        'Your personal referral code and link for inviting new members',
        'Write blogs and request to host podcasts or workshops',
        'Share posts on Tech Social',
      ];

  const notes = adminNotes
    ? `${sectionLabel('Note from the reviewer')}
       ${callout('', `<em>"${esc(adminNotes)}"</em>`, '#94a3b8')}
       <div style="height:20px;"></div>`
    : '';

  const html = layout(`
    ${heading(isApproved ? `Welcome to ${roleLabel}` : 'Application update')}
    ${lead(`Hi ${esc(first)}, we have an update on your <strong>${roleLabel}</strong> membership application.`)}
    ${bannerHtml}

    ${sectionLabel('Application details')}
    ${detailsTable(`
     ${infoRow('Name', esc(name))}
     ${infoRow('Email', esc(email))}
     ${infoRow('Requested role', badge(roleLabel))}
     ${infoRow('Decision', badge(isApproved ? 'Approved' : 'Not approved', isApproved ? '#15803d' : '#991b1b', isApproved ? 'rgba(21,128,61,0.1)' : 'rgba(153,27,27,0.1)'))}
    `, 24)}

    ${notes}
    ${isApproved ? listBox('Your new benefits', benefits) : ''}

    ${isApproved
      ? ctaButton('Sign in to access your new benefits', `${APP_URL()}/login`)
      : ctaButton('Contact us for more information', `${APP_URL()}/contact`)}
  `,
  isApproved ? `Congratulations. Your ${roleLabel} application has been approved.` : `Update on your ${roleLabel} membership application`);

  send({
    from: FROM(),
    to: email,
    subject: isApproved ? `Your ${roleLabel} application is approved` : `Update on your ${roleLabel} application`,
    html,
  });
};


/**
 * sendVerificationEmail
 * Sent during registration to verify an email address via OTP.
 *
 * @param {string} email
 * @param {string} otp
 */
// ── Council Member alias (mirrors sendExecutiveApplicationAdminEmail) ─────────
// membershipController imports this name; the email content is identical.
export const sendCouncilApplicationAdminEmail = sendExecutiveApplicationAdminEmail;

export const sendVerificationEmail = (email, otp) => {
  const html = layout(`
    ${heading('Verify your email')}
    ${lead('Thank you for starting your registration with Risk AI Council. Use the code below to confirm this email address.')}
    ${codeBox('Your verification code', otp)}
    ${expiryNote(10, 'If you did not request this, you can safely ignore this email.')}
  `,
  'Use this code to confirm your email address. It expires in 10 minutes.');

  send({ from: FROM(), to: email, subject: 'Your Risk AI Council verification code', html });
};

/**
 * sendNominationOtpEmail
 * Sent during the self-nomination flow to verify a non-member's email address.
 * Decoupled from sendVerificationEmail (registration) so the copy stays accurate.
 */
export const sendNominationOtpEmail = (email, otp) => {
  const html = layout(`
    ${heading('Verify your email')}
    ${lead('Thanks for submitting your self-nomination to the Risk AI Council Awards. Use the code below to confirm this email address and finish your submission.')}
    ${codeBox('Your verification code', otp)}
    ${expiryNote(10, 'If you did not request this, you can safely ignore this email. Your nomination will not be submitted without it.')}
  `,
  'Use this code to confirm your email address and finish your nomination. It expires in 10 minutes.');

  send({ from: FROM(), to: email, subject: 'Your nomination verification code', html });
};

/**
 * sendSelfNominationAdminEmail
 * Sent to founding_member admins when a new self-nomination is awaiting review.
 *
 * @param {{ adminEmail: string, adminName?: string, nomination: object }} opts
 *  nomination: { name, designation, company, award_name, category_name, is_self_nominated_by_member, submitter_email, created_at }
 */
export const sendSelfNominationAdminEmail = ({ adminEmail, adminName, nomination }) => {
  const { name, designation, company, award_name, category_name, submitter_email, created_at } = nomination;
  const adminFirst = firstNameOf(adminName, 'Admin');
  const submittedOn = formatDate(created_at) || formatDate(new Date());

  const html = layout(`
    ${heading('New self-nomination')}
    ${lead(`Hi ${esc(adminFirst)}, someone has submitted a self-nomination and it is waiting for your review before it appears publicly.`)}
    ${banner('info', 'Action required', 'Review this nomination in the admin dashboard\'s "Pending Self-Nominations" queue and approve or reject it.')}

    ${sectionLabel('Nomination details')}
    ${detailsTable(`
     ${infoRow('Name', esc(name))}
     ${infoRow('Designation', esc(designation || '—'))}
     ${infoRow('Company', esc(company || '—'))}
     ${infoRow('Award', esc(award_name))}
     ${infoRow('Category', esc(category_name))}
     ${infoRow('Contact email', esc(submitter_email || '—'))}
     ${infoRow('Submitted on', esc(submittedOn))}
    `)}

    ${ctaButton('Review in the admin dashboard', `${APP_URL()}/admin-dashboard?tab=nominations`)}
  `,
  `New self-nomination from ${esc(name)}. Awaiting review.`);

  send({ from: FROM(), to: adminEmail, subject: `New self-nomination awaiting review: ${oneLine(name)}`, html });
};

/**
 * sendSelfNominationReceivedEmail
 * Confirmation sent to the nominee after a self-nomination is submitted.
 */
export const sendSelfNominationReceivedEmail = ({ name, email, awardName, categoryName }) => {
  const first = firstNameOf(name);

  const html = layout(`
    ${heading(`Nomination received, ${esc(first)}!`)}
    ${lead('Thanks for nominating yourself for the Risk AI Council Awards. Here is a summary of what you submitted.')}
    ${banner('warning', 'Pending review', 'Our team reviews every self-nomination before it goes live for public voting. We will let you know once a decision is made.')}

    ${detailsTable(`
     ${infoRow('Award', esc(awardName))}
     ${infoRow('Category', esc(categoryName))}
    `)}
  `,
  `Your self-nomination for ${esc(awardName)} has been received.`);

  send({ from: FROM(), to: email, subject: "We've received your self-nomination", html });
};

/**
 * sendSelfNominationDecisionEmail
 * Sent to the nominee once an admin approves or rejects their self-nomination.
 */
export const sendSelfNominationDecisionEmail = ({ name, email, awardName, categoryName, approved, adminNotes }) => {
  const first = firstNameOf(name);

  const html = layout(`
    ${heading(approved ? `Great news, ${esc(first)}!` : 'Update on your nomination')}
    ${lead(approved
      ? `Your self-nomination for <strong>${esc(categoryName)}</strong> (${esc(awardName)}) has been approved and is now live for public voting.`
      : `Thanks for submitting your self-nomination for <strong>${esc(categoryName)}</strong> (${esc(awardName)}). After review, our team has decided not to move forward with it at this time.`)}
    ${approved
      ? banner('success', 'Approved and live', 'Share your nomination with your network and encourage votes before the category closes.')
      : banner('danger', 'Not approved', adminNotes ? esc(adminNotes) : 'If you have questions about this decision, feel free to reach out to us.')}

    ${approved ? ctaButton('View nominees', `${APP_URL()}/nominees`) : ''}
  `,
  approved ? `Your self-nomination for ${esc(categoryName)} has been approved.` : `Update on your self-nomination for ${esc(categoryName)}`);

  send({ from: FROM(), to: email, subject: approved ? 'Your self-nomination has been approved' : 'Update on your self-nomination', html });
};


// ════════════════════════════════════════════════════════════════════════════════
// ACCOUNT DELETION EMAILS
// ════════════════════════════════════════════════════════════════════════════════



/**
 * sendAccountDeletedEmail
 * Sent right after a member deletes their own account (deletion is immediate: there is no review step).
 *
 * @param {{ name: string, email: string }} opts
 */
export const sendAccountDeletedEmail = ({ name, email }) => {
  const first = firstNameOf(name, 'there');

  const html = layout(`
    ${heading('Your account has been deleted')}
    ${lead(`Hi ${esc(first)}, as you requested, your Risk AI Council account has been deleted.`)}
    ${banner('success', 'Account deleted', 'Your sign-in details and personal information have been permanently removed. This cannot be undone.')}

    ${listBox('What was removed', [
      'Your account and sign-in credentials',
      'Your profile photo, bio and social links',
      'Your membership applications and history',
      'Your event and workshop registrations',
      'Your saved posts, notification history and device tokens',
    ])}
    <div style="height:14px;"></div>
    ${listBox('What stays, anonymised', [
      'Posts, comments and resource uploads stay, shown as &quot;Former Member&quot;',
      'Reviews and award votes you submitted stay, and totals are not changed',
      'If you were a Chapter Lead: referral records, quarter results and your agreement record are kept as history',
    ])}

    <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
      <strong>Did not request this?</strong> Contact us straight away at
      <a href="mailto:support@riskaicouncil.org" style="color:#003366;">support@riskaicouncil.org</a>.
    </p>
    <p style="margin:12px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
      Thank you for being part of the Risk AI Council community. You are welcome to
      <a href="${APP_URL()}/register" style="color:#003366;">register again</a> at any time.
    </p>
  `,
  'Your Risk AI Council account has been deleted.');

  send({ from: FROM(), to: email, subject: 'Your Risk AI Council account has been deleted', html });
};




// ════════════════════════════════════════════════════════════════════════════════
// CONTACT FORM
// Unlike the senders above, these RETURN the delivery result (Promise<boolean>)
// so the Contact endpoint can tell the visitor honestly whether it worked.
// All visitor-supplied text is HTML-escaped before it reaches a template.
// ════════════════════════════════════════════════════════════════════════════════

const CONTACT_RECEIVER = () =>
  (process.env.CONTACT_RECEIVER_EMAIL || '').trim() || 'support@riskaicouncil.org';

const messageBox = (label, message) => `
    <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">${label}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;">
     <tr>
      <td style="padding:18px 20px;font-size:14px;color:#334155;line-height:1.7;word-break:break-word;">${nl2br(message)}</td>
     </tr>
    </table>`;

/**
 * sendContactInquiryAdminEmail
 * Delivers a Contact-form message to the team. Reply-To is the visitor, so
 * hitting "Reply" in the mailbox answers them directly.
 *
 * @param {{ id?: number, firstName: string, lastName?: string, email: string,
 *           organization?: string, inquiry: string, message: string, receivedAt?: Date }} opts
 * @returns {Promise<boolean>} true if the SMTP relay accepted the message
 */
export const sendContactInquiryAdminEmail = ({
  id, firstName, lastName, email, organization, inquiry, message, receivedAt = new Date(),
}) => {
  const fullName = oneLine(`${firstName} ${lastName || ''}`);
  const receivedOn = [formatDate(receivedAt), formatTime(receivedAt)].filter(Boolean).join(' · ');
  const replySubject = encodeURIComponent(`Re: ${oneLine(inquiry)}`);

  const html = layout(`
    <h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1e293b;">New Contact Inquiry</h2>
    <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.65;">
      Someone submitted the Contact form on the website. Reply to this email to respond to
      <strong>${escapeHtml(firstName)}</strong> directly.
    </p>

    <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Sender Details</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
     ${infoRow('Reference',    id ? `#${id}` : '')}
     ${infoRow('Name',         escapeHtml(fullName))}
     ${infoRow('Email',        `<a href="mailto:${escapeHtml(email)}" style="color:#0066cc;">${escapeHtml(email)}</a>`)}
     ${infoRow('Organisation', organization ? escapeHtml(organization) : '—')}
     ${infoRow('Inquiry Type', badge(escapeHtml(inquiry)))}
     ${infoRow('Received',     receivedOn)}
    </table>

    ${messageBox('Message', message)}

    ${ctaButton(`Reply to ${escapeHtml(firstName)}`, `mailto:${escapeHtml(email)}?subject=${replySubject}`)}
  `,
  escapeHtml(`${fullName} — ${inquiry}: ${oneLine(message).slice(0, 90)}`),
  'Internal notification — sent because Contact-form messages are routed to this address.');

  return send({
    from:    FROM(),
    to:      CONTACT_RECEIVER(),
    replyTo: { name: fullName, address: email },
    subject: `New contact inquiry: ${oneLine(inquiry)} — ${fullName}`,
    html,
  });
};

/**
 * sendContactReplyEmail
 * Delivers an admin's dashboard reply to the person who wrote in, quoting their
 * original message. Replies to this email go to the shared support inbox.
 *
 * @param {{ firstName: string, email: string, inquiry: string, originalMessage: string,
 *           replyBody: string, hasAccount?: boolean }} opts
 * @returns {Promise<boolean>} true if the SMTP relay accepted the message
 */
export const sendContactReplyEmail = ({ firstName, email, inquiry, originalMessage, replyBody, hasAccount = false }) => {
  const html = layout(`
    <h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1e293b;">Reply to Your Message</h2>
    <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.65;">
      Hi ${escapeHtml(firstName)}, our team has replied to your <strong>${escapeHtml(inquiry)}</strong> message.
    </p>

    ${messageBox('Our Reply', replyBody)}

    <div style="height:20px;"></div>
    ${messageBox('Your Original Message', originalMessage)}

    ${hasAccount
      ? ctaButton('View in Your Dashboard', `${APP_URL()}/user/dashboard#messages`)
      : ctaButton('Visit Risk AI Council', APP_URL())}

    <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
      Want to follow up? Just reply to this email or write to
      <a href="mailto:support@riskaicouncil.org" style="color:#003366;">support@riskaicouncil.org</a>.
    </p>
  `,
  escapeHtml(`Our team replied to your ${oneLine(inquiry)} message: ${oneLine(replyBody).slice(0, 90)}`),
  'You received this email because this address was used to contact the Risk AI Council team through our website.');

  return send({
    from:    FROM(),
    to:      email,
    replyTo: CONTACT_RECEIVER(),
    subject: `Re: ${oneLine(inquiry)} — Risk AI Council`,
    html,
    automated: false, // a person wrote this reply, so do not mark it as auto-generated
  });
};

/**
 * sendContactConfirmationEmail
 * Tells the visitor their message arrived and repeats it back for their records.
 *
 * @param {{ id?: number, firstName: string, email: string, inquiry: string, message: string }} opts
 * @returns {Promise<boolean>} true if the SMTP relay accepted the message
 */
export const sendContactConfirmationEmail = ({ id, firstName, email, inquiry, message }) => {
  const html = layout(`
    <h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1e293b;">Message Received</h2>
    <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.65;">
      Hi ${escapeHtml(firstName)}, thank you for contacting Risk AI Council. We've received your message.
    </p>

    <!-- Confirmation banner -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:10px;margin-bottom:28px;">
     <tr>
      <td style="padding:16px 20px;">
       <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1d4ed8;">We'll be in touch</p>
       <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6;">
        A member of our team will get back to you within 1–2 business days.
       </p>
      </td>
     </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
     ${infoRow('Reference',    id ? `#${id}` : '')}
     ${infoRow('Inquiry Type', badge(escapeHtml(inquiry)))}
    </table>

    ${messageBox('Your Message', message)}

    ${ctaButton('Back to the Platform', APP_URL())}

    <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
      Need to add something? Just reply to this email or write to
      <a href="mailto:support@riskaicouncil.org" style="color:#003366;">support@riskaicouncil.org</a>.
    </p>
  `,
  'We\'ve received your message — our team will reply within 1–2 business days.',
  'You received this email because this address was used to submit the Contact form on the Risk AI Council website. If that wasn\'t you, you can safely ignore it.');

  return send({
    from:    FROM(),
    to:      email,
    replyTo: CONTACT_RECEIVER(),
    subject: 'We\'ve received your message — Risk AI Council',
    html,
  });
};


// ════════════════════════════════════════════════════════════════════════════════
// EMAIL DIAGNOSTICS (admin dashboard)
// Production secrets live in Azure App Settings and cannot be inspected from the
// repo, so the admin dashboard calls these to find out — from the live server —
// whether email can actually be sent, and why not. Never returns SMTP_PASS.
// ════════════════════════════════════════════════════════════════════════════════

const describeSmtpError = (err) => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || '587';
  if (err.code === 'EAUTH' || err.responseCode === 535) {
    return 'The mail server rejected the login. Check SMTP_USER and SMTP_PASS (for GoDaddy / Microsoft 365, SMTP authentication must be enabled for the mailbox).';
  }
  if (['ETIMEDOUT', 'ECONNECTION', 'ECONNREFUSED', 'ESOCKET', 'ENOTFOUND', 'EDNS'].includes(err.code)) {
    return `Cannot reach the mail server at ${host}:${port} (${err.code}). Check SMTP_HOST / SMTP_PORT / SMTP_SECURE, and that this server is allowed to make outbound connections on that port.`;
  }
  return `${err.code ? `${err.code}: ` : ''}${err.message}`;
};

/**
 * getEmailHealth
 * Connects and authenticates to the SMTP server WITHOUT sending anything.
 * @returns {Promise<{ configured: boolean, ok: boolean, error: string|null,
 *                     host: string|null, port: number, secure: boolean,
 *                     user: string|null, from: string, receiver: string }>}
 */
export const getEmailHealth = async () => {
  const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !process.env[k]);
  const info = {
    host:     process.env.SMTP_HOST || null,
    port:     parseInt(process.env.SMTP_PORT || '587', 10),
    secure:   process.env.SMTP_SECURE === 'true',
    user:     process.env.SMTP_USER || null,
    from:     process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || null,
    receiver: CONTACT_RECEIVER(),
  };

  if (missing.length) {
    return { ...info, configured: false, ok: false, error: `Email is not configured on this server. Missing setting(s): ${missing.join(', ')}.` };
  }
  try {
    await getTransporter().verify();
    return { ...info, configured: true, ok: true, error: null };
  } catch (err) {
    console.error('[Email] Health check failed:', err.message);
    return { ...info, configured: true, ok: false, error: describeSmtpError(err) };
  }
};

/**
 * sendTestEmail
 * Sends one real test message so an admin can confirm delivery end-to-end
 * (including that it does not land in spam).
 * @param {string} to
 * @returns {Promise<{ ok: boolean, error: string|null }>}
 */
export const sendTestEmail = async (to) => {
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, error: 'Email is not configured on this server (SMTP_HOST / SMTP_USER / SMTP_PASS).' };
  }
  const html = layout(`
    <h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1e293b;">Email is working</h2>
    <p style="margin:0;font-size:15px;color:#64748b;line-height:1.65;">
      This is a test message sent from the admin dashboard to confirm that Risk AI Council can deliver email.
      If you can read this, outgoing email is set up correctly.
    </p>
  `,
  'Test email from the Risk AI Council admin dashboard',
  'Test message requested from the admin dashboard.');

  try {
    const info = await transporter.sendMail(finalize({ from: FROM(), to, subject: 'Test email — Risk AI Council', html }));
    console.info(`[Email] ✓ Sent test email → ${to} (${info.messageId})`);
    return { ok: true, error: null };
  } catch (err) {
    console.error(`[Email] ✗ Test email failed → ${to}:`, err.message);
    return { ok: false, error: describeSmtpError(err) };
  }
};


// ════════════════════════════════════════════════════════════════════════════════
// CHAPTER LEAD PROGRAMME
// ════════════════════════════════════════════════════════════════════════════════

/**
 * sendChapterLeadNoticeEmail
 * One generic, branded notice used by the Chapter Lead programme for quarter
 * results, warnings, term changes, role endings and admin alerts.
 *
 * @param {{ name?: string, email: string, subject: string, heading: string,
 *           paragraphs?: string[], details?: Array<[string, string]>,
 *           tone?: 'info'|'warning'|'danger'|'success', ctaLabel?: string, ctaPath?: string }} opts
 * All text is escaped here — callers pass plain strings.
 */
export const sendChapterLeadNoticeEmail = ({
  name, email, subject, heading, paragraphs = [], details = [],
  tone = 'info', ctaLabel, ctaPath,
}) => {
  if (!email) return;
  const firstName = escapeHtml((name || '').split(' ')[0]);
  const tones = {
    info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    danger:  { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
  };
  const c = tones[tone] || tones.info;

  const detailsHtml = details.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px;">
        ${details.map(([label, value]) => infoRow(escapeHtml(label), escapeHtml(value))).join('')}
       </table>`
    : '';

  const html = layout(`
    <h2 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#1e293b;">${escapeHtml(heading)}</h2>
    ${firstName ? `<p style="margin:0 0 20px;font-size:15px;color:#64748b;">Hi ${firstName},</p>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="background:${c.bg};border:1.5px solid ${c.border};border-radius:10px;margin-bottom:22px;">
     <tr><td style="padding:16px 20px;color:${c.text};font-size:14px;line-height:1.65;">
      ${paragraphs.length ? nl2br(paragraphs[0]) : ''}
     </td></tr>
    </table>
    ${paragraphs.slice(1).map((p) => `<p style="margin:0 0 14px;font-size:15px;color:#475569;line-height:1.65;">${nl2br(p)}</p>`).join('')}
    ${detailsHtml}
    ${ctaLabel && ctaPath ? ctaButton(escapeHtml(ctaLabel), `${APP_URL()}${ctaPath}`) : ''}
  `,
  oneLine(heading),
  'You received this email because you are part of the Chapter programme on the Risk AI Council platform.');

  send({ from: FROM(), to: email, subject: oneLine(subject), html });
};


// ════════════════════════════════════════════════════════════════════════════════
// SIGN-IN CODES, PASSWORD RESET AND SECURITY ALERTS
// These return Promise<boolean> (like the Contact emails) so a caller that cares
// can find out whether the relay accepted the message.
// ════════════════════════════════════════════════════════════════════════════════

const utcStamp = (date) => `${new Date(date).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' })} UTC`;

/**
 * sendLoginCodeEmail
 * The one-time code for "Sign in with an email code".
 *
 * @param {{ name?: string, email: string, code: string, ttlMinutes?: number }} opts
 */
export const sendLoginCodeEmail = ({ name, email, code, ttlMinutes = 10 }) => {
  const html = layout(`
    ${heading('Your sign-in code')}
    ${lead(`Hi ${esc(firstNameOf(name))}, use this code to sign in to Risk AI Council.`)}
    ${codeBox('Your sign-in code', code)}
    ${expiryNote(ttlMinutes, 'If you did not try to sign in, you can ignore this email: nobody can sign in without the code.')}
    <div style="height:16px;"></div>
    ${callout('Keep this code private', 'Risk AI Council will never ask you for it, by email, phone or chat.')}
  `,
  `Use this code to sign in. It expires in ${ttlMinutes} minutes.`);

  return send({ from: FROM(), to: email, subject: 'Your Risk AI Council sign-in code', html });
};

/**
 * sendPasswordResetCodeEmail
 * The one-time code for "Forgot password".
 *
 * @param {{ name?: string, email: string, code: string, ttlMinutes?: number }} opts
 */
export const sendPasswordResetCodeEmail = ({ name, email, code, ttlMinutes = 10 }) => {
  const html = layout(`
    ${heading('Reset your password')}
    ${lead(`Hi ${esc(firstNameOf(name))}, we received a request to reset the password for your Risk AI Council account. Use this code to choose a new one.`)}
    ${codeBox('Your password reset code', code)}
    ${expiryNote(ttlMinutes, 'If you did not ask to reset your password, you can ignore this email and your password will stay the same.')}
    <div style="height:16px;"></div>
    ${callout('Keep this code private', 'Risk AI Council will never ask you for it, by email, phone or chat.')}
  `,
  `Use this code to reset your password. It expires in ${ttlMinutes} minutes.`);

  return send({ from: FROM(), to: email, subject: 'Reset your Risk AI Council password', html });
};

/**
 * sendPasswordChangedEmail
 * Tells the account owner that the password just changed (by a reset or from their profile),
 * so a change they did not make is noticed quickly.
 *
 * @param {{ name?: string, email: string, changedAt?: Date }} opts
 */
export const sendPasswordChangedEmail = ({ name, email, changedAt = new Date() }) => {
  const html = layout(`
    ${heading('Your password was changed')}
    ${lead(`Hi ${esc(firstNameOf(name))}, the password for your Risk AI Council account was changed on <strong>${esc(utcStamp(changedAt))}</strong>.`)}
    ${banner('success', 'Password updated', 'If this was you, there is nothing more to do. Anywhere else you were signed in, you have been signed out.')}
    ${banner('danger', 'Was this not you?', 'Reset your password straight away, then contact us at <a href="mailto:support@riskaicouncil.org" style="color:#991b1b;">support@riskaicouncil.org</a> so we can secure your account.')}
    ${ctaButton('Reset my password', `${APP_URL()}/forgot-password`)}
  `,
  'Your Risk AI Council password was changed. If this was not you, reset it now.');

  return send({ from: FROM(), to: email, subject: 'Your Risk AI Council password was changed', html });
};

/**
 * sendAccountChangedEmail
 * Tells a person that an administrator changed details on their account, naming WHAT changed
 * (not the new values), so a change they did not expect is noticed. For an email change this
 * goes to the OLD address.
 *
 * @param {{ name?: string, email: string, changes: string[], when?: Date }} opts
 */
export const sendAccountChangedEmail = ({ name, email, changes = [], when = new Date() }) => {
  const list = changes.length ? changes : ['your account details'];
  const html = layout(`
    ${heading('Your account was updated')}
    ${lead(`Hi ${esc(firstNameOf(name))}, an administrator updated your Risk AI Council account on <strong>${esc(utcStamp(when))}</strong>.`)}
    ${listBox('What changed', list.map((c) => esc(c)))}
    ${banner('warning', 'Was this unexpected?', 'Contact us at <a href="mailto:support@riskaicouncil.org" style="color:#92400e;">support@riskaicouncil.org</a> and we will look into it straight away.')}
    ${ctaButton('Open my dashboard', `${APP_URL()}/user/dashboard`)}
  `,
  'An administrator updated your Risk AI Council account.');

  return send({ from: FROM(), to: email, subject: 'Your Risk AI Council account was updated', html });
};

/**
 * sendSecurityAlertAdminEmail
 * Sent to the OTHER founding members when a founding member account signs in with an
 * emailed code, has its password reset, or is changed by an administrator, so a takeover
 * cannot go unnoticed.
 *
 * @param {{ adminEmail: string, adminName?: string, accountName: string, accountEmail: string,
 *           event: 'otp_login'|'password_reset'|'email_changed'|'role_changed', when?: Date }} opts
 */
const SECURITY_EVENTS = {
  otp_login: 'signed in with an emailed code',
  password_reset: 'had its password reset',
  email_changed: 'had its email address changed by an administrator',
  role_changed: 'had its role changed by an administrator',
};

export const sendSecurityAlertAdminEmail = ({ adminEmail, adminName, accountName, accountEmail, event, when = new Date() }) => {
  const what = SECURITY_EVENTS[event] || SECURITY_EVENTS.otp_login;
  const html = layout(`
    ${heading('Security alert')}
    ${lead(`Hi ${esc(firstNameOf(adminName, 'Admin'))}, the founding member account <strong>${esc(accountName)}</strong> (${esc(accountEmail)}) ${what} on <strong>${esc(utcStamp(when))}</strong>.`)}
    ${banner('warning', 'Please check this was expected', 'If you do not recognise this activity, contact the account owner. You can reset their password from Manage Users in the admin dashboard.')}
    ${ctaButton('Open Manage Users', `${APP_URL()}/admin-dashboard/users`)}
  `,
  `Security alert: ${esc(accountName)} ${what}.`,
  'You received this email because you are a founding member of Risk AI Council.');

  return send({ from: FROM(), to: adminEmail, subject: `Security alert: ${oneLine(accountName)} ${what}`, html });
};
