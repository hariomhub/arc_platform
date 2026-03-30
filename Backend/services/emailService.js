/**
 * emailService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Production email service for AI Risk Council.
 *
 * Provider-agnostic SMTP via Nodemailer. Supports Gmail, SendGrid, Azure
 * Communication Services, and any standard SMTP relay.
 *
 * Required env vars:
 *   SMTP_HOST          e.g. smtp.gmail.com | smtp.sendgrid.net | smtp.azurecomm.net
 *   SMTP_PORT          e.g. 587 (STARTTLS) | 465 (TLS) — defaults to 587
 *   SMTP_SECURE        "true" for port 465, omit/false for port 587
 *   SMTP_USER          Your SMTP username / email address
 *   SMTP_PASS          App password or API key
 *   SMTP_FROM_NAME     Display name  (default: "AI Risk Council")
 *   SMTP_FROM_EMAIL    Sender email  (default: value of SMTP_USER)
 *   APP_URL            Your public domain (default: Azure App Service URL)
 *
 * Design:
 *   • All send functions are fire-and-forget — failures are logged but never
 *     propagate to the caller, so email errors never break an API response.
 *   • Transporter is created once (connection pool) on first use.
 *   • Email is silently skipped if SMTP is not configured (safe for local dev).
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
        host:           SMTP_HOST,
        port:           parseInt(process.env.SMTP_PORT || '587', 10),
        secure:         process.env.SMTP_SECURE === 'true',   // true = port 465 TLS
        auth:           { user: SMTP_USER, pass: SMTP_PASS },
        pool:           true,       // reuse connections
        maxConnections: 5,
        maxMessages:    100,
        rateDelta:      1000,       // per second
        rateLimit:      10,         // max 10 msgs/s
    });

    return _transporter;
};

// ── Shared helpers ────────────────────────────────────────────────────────────
const FROM = () =>
    `"${process.env.SMTP_FROM_NAME || 'AI Risk Council'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;

// EMAIL_BASE_URL is dedicated to email links — always points to the live site.
// Falls back to APP_URL only if it looks like a public domain (not localhost).
// Hardcoded Azure URL is the final fallback so emails are never broken in dev.
const PRODUCTION_URL = 'https://riskaicouncil-fsgmh0erfjh0g6g4.eastasia-01.azurewebsites.net';
const APP_URL = () => {
    const explicit = process.env.EMAIL_BASE_URL;
    if (explicit) return explicit.replace(/\/$/, '');

    const appUrl = process.env.APP_URL || '';
    const isLocalhost = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(appUrl);
    return (appUrl && !isLocalhost ? appUrl : PRODUCTION_URL).replace(/\/$/, '');
};

const ROLE_LABELS = {
    free_member:     'Free Member',
    paid_member:     'Professional Member',
    university:      'University Researcher',
    product_company: 'Product Company',
    executive:       'Executive',
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
        const end   = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        const fmt   = (d) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
        const p     = new URLSearchParams({
            action:   'TEMPLATE',
            text:     title,
            dates:    `${fmt(start)}/${fmt(end)}`,
            details:  `AI Risk Council Event — ${APP_URL()}/events`,
            location: location || '',
        });
        return `https://calendar.google.com/calendar/render?${p.toString()}`;
    } catch { return null; }
};

// ── Fire-and-forget dispatcher ────────────────────────────────────────────────
const send = async (mailOptions) => {
    const transporter = getTransporter();
    if (!transporter) {
        console.warn(`[Email] SMTP not configured — skipped: "${mailOptions.subject}" → ${mailOptions.to}`);
        return;
    }
    try {
        const info = await transporter.sendMail(mailOptions);
        console.info(`[Email] ✓ Sent "${mailOptions.subject}" → ${mailOptions.to} (${info.messageId})`);
    } catch (err) {
        console.error(`[Email] ✗ Failed "${mailOptions.subject}" → ${mailOptions.to}:`, err.message);
    }
};

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
        <td align="center" bgcolor="#003366" style="border-radius:9px;">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.025em;border-radius:9px;background:#003366;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;

const checkListItem = (text) =>
    `<tr><td style="padding:5px 0;font-size:13px;color:#475569;line-height:1.6;">${text}</td></tr>`;

// ── Master layout ─────────────────────────────────────────────────────────────
const layout = (bodyHtml, previewText = '') => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>AI Risk Council</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width:620px) {
      .email-container { width:100% !important; }
      .email-body-pad  { padding:28px 20px !important; }
      .email-header    { padding:28px 24px !important; }
      .email-footer    { padding:20px 24px !important; }
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
            <td class="email-header" style="background:linear-gradient(135deg,#001a33 0%,#003366 55%,#005599 100%);padding:36px 40px 32px;text-align:center;">
              <!-- Shield icon -->
              <div style="display:inline-block;background:rgba(255,255,255,0.13);border-radius:50%;width:60px;height:60px;line-height:60px;text-align:center;font-size:28px;margin-bottom:14px;">🛡️</div>
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.55);">AI RISK COUNCIL</p>
              <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.03em;">AI Risk Council</h1>
              <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:0.05em;">Advancing Responsible AI Governance</p>
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
              <p style="margin:0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} AI Risk Council. All rights reserved.</p>
              <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;">You received this email because you have an account on the AI Risk Council platform.</p>
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
//  EXPORTED EMAIL SENDERS
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
    const firstName = name.split(' ')[0];

    const html = layout(`
        <h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1e293b;">Welcome, ${firstName}! 👋</h2>
        <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.65;">
            Your registration request has been received. We've summarised your details below.
        </p>

        <!-- Pending banner -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;margin-bottom:28px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#92400e;">⏳ &nbsp;Pending Admin Review</p>
              <p style="margin:0;font-size:13px;color:#b45309;line-height:1.6;">
                Your account is being reviewed by our team. You'll receive a separate email once it's approved — 
                typically within <strong>24–48 hours</strong>.
              </p>
            </td>
          </tr>
        </table>

        <!-- Account details -->
        <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Your Account Details</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          ${infoRow('Full Name',   name)}
          ${infoRow('Email',       email)}
          ${infoRow('Membership',  badge(roleLabel))}
          ${organizationName ? infoRow('Organisation', organizationName) : ''}
        </table>

        <!-- Next steps -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f8fafc;border-radius:10px;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">What happens next?</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${checkListItem('✅ &nbsp;Our team reviews your application')}
                ${checkListItem('📧 &nbsp;You receive an approval confirmation email')}
                ${checkListItem('🚀 &nbsp;Log in for full access to the ARC platform')}
              </table>
            </td>
          </tr>
        </table>

        ${ctaButton('Explore the Platform', APP_URL())}
    `,
    `Welcome to AI Risk Council, ${firstName}! Your account is pending review.`);

    send({
        from:    FROM(),
        to:      email,
        subject: `Welcome to AI Risk Council, ${firstName}! 🎉`,
        html,
    });
};


/**
 * sendAccountApprovedEmail
 * Triggered when an admin approves a user's account.
 *
 * @param {{ name: string, email: string, role: string }} opts
 */
export const sendAccountApprovedEmail = ({ name, email, role }) => {
    const roleLabel = ROLE_LABELS[role] || 'Member';
    const firstName = name.split(' ')[0];

    const html = layout(`
        <h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1e293b;">You're in, ${firstName}! 🎉</h2>
        <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.65;">
            Your AI Risk Council account has been reviewed and <strong style="color:#15803d;">approved</strong>. 
            You now have full access to the platform.
        </p>

        <!-- Approved banner -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;margin-bottom:28px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#15803d;">✓ &nbsp;Account Approved &amp; Active</p>
              <p style="margin:0;font-size:13px;color:#166534;line-height:1.6;">
                Your <strong>${roleLabel}</strong> membership is now fully active. Sign in to explore everything the council has to offer.
              </p>
            </td>
          </tr>
        </table>

        <!-- What you can do -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f8fafc;border-radius:10px;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">Available to you now</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${checkListItem('📚 &nbsp;Browse research papers, whitepapers &amp; resources')}
                ${checkListItem('🗓️ &nbsp;Register for upcoming AI governance events')}
                ${checkListItem('💬 &nbsp;Post and answer questions in Community Q&amp;A')}
                ${checkListItem('🏆 &nbsp;Submit nominations for the AI Risk Awards')}
                ${checkListItem('🤖 &nbsp;Explore the AI Risk Framework')}
              </table>
            </td>
          </tr>
        </table>

        ${ctaButton('Sign In to Your Account', `${APP_URL()}/login`)}
    `,
    `Your AI Risk Council account has been approved — welcome aboard!`);

    send({
        from:    FROM(),
        to:      email,
        subject: `Your AI Risk Council account is approved! ✅`,
        html,
    });
};


/**
 * sendEventRegistrationEmail
 * Triggered immediately after a user successfully registers for an event.
 *
 * @param {{ name: string, email: string, organization?: string, event: object, registrationId: number }} opts
 */
export const sendEventRegistrationEmail = ({ name, email, organization, event, registrationId }) => {
    const { title, date, location, event_category } = event;
    const firstName   = name.split(' ')[0];
    const dateLabel   = formatDate(date);
    const timeLabel   = formatTime(date);
    const gcalUrl     = buildGCalUrl(title, date, location);
    const refId       = registrationId ? `#${String(registrationId).padStart(6, '0')}` : null;

    const html = layout(`
        <h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1e293b;">You're registered! 🎟️</h2>
        <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.65;">
            Hi ${firstName}, your spot for <strong style="color:#003366;">${title}</strong> has been confirmed. 
            Keep this email — you may be asked to show it at check-in.
        </p>

        <!-- Event card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
          <!-- Accent bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#003366,#0066cc,#0099cc);"></td></tr>
          <tr>
            <td style="padding:22px 24px 8px;">
              ${event_category ? badge(event_category, '#0055aa', 'rgba(0,85,170,0.09)') : ''}
              <h3 style="margin:10px 0 0;font-size:19px;font-weight:800;color:#1e293b;line-height:1.3;">${title}</h3>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 24px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${dateLabel ? infoRow('📅 Date', dateLabel + (timeLabel ? `&nbsp; <span style="color:#94a3b8;">·</span> &nbsp;${timeLabel}` : '')) : ''}
                ${location  ? infoRow('📍 Location', location)   : ''}
                ${infoRow('👤 Registered as', name)}
                ${infoRow('📧 Email', email)}
                ${organization ? infoRow('🏢 Organisation', organization) : ''}
                ${refId ? infoRow('🎫 Ref&nbsp;ID', `<code style="background:#f1f5f9;padding:3px 8px;border-radius:5px;font-family:monospace;font-size:13px;color:#334155;">${refId}</code>`) : ''}
              </table>
            </td>
          </tr>
        </table>

        <!-- Add to calendar -->
        ${gcalUrl ? `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 24px;">
          <tr>
            <td style="border:1.5px solid #e2e8f0;border-radius:8px;background:#ffffff;">
              <a href="${gcalUrl}" target="_blank"
                 style="display:inline-block;padding:11px 22px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;">
                📆 &nbsp;Add to Google Calendar
              </a>
            </td>
          </tr>
        </table>` : ''}

        <!-- Important note -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f8fafc;border-left:3px solid #003366;border-radius:0 8px 8px 0;margin-bottom:4px;">
          <tr>
            <td style="padding:14px 18px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1e293b;">📌 Important</p>
              <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                Please save this email as your confirmation. For changes or cancellations, 
                contact us at least 24 hours before the event.
              </p>
            </td>
          </tr>
        </table>

        ${ctaButton('View All Events', `${APP_URL()}/events`)}
    `,
    `Confirmed: You're registered for ${title}${dateLabel ? ` on ${dateLabel}` : ''}`);

    send({
        from:    FROM(),
        to:      email,
        subject: `Registration Confirmed: ${title} 🗓️`,
        html,
    });
};

// ─── Membership role labels (current 3-tier system) ───────────────────────────
const MEMBERSHIP_ROLE_LABELS = {
    professional:   'Professional',
    executive:      'Executive',
    founding_member: 'Founding Member',
};

const MEMBERSHIP_DURATION = {
    professional:   '1-year membership',
    executive:      '3-year membership',
    founding_member: 'Lifetime membership',
};

/**
 * sendMembershipExpiryWarningEmail
 * Sent ~7 days before membership_expires_at.
 *
 * @param {{ name: string, email: string, role: string, expiresAt: string|Date, daysLeft: number }} opts
 */
export const sendMembershipExpiryWarningEmail = ({ name, email, role, expiresAt, daysLeft }) => {
    const firstName  = (name || 'Member').split(' ')[0];
    const roleLabel  = MEMBERSHIP_ROLE_LABELS[role] || role;
    const expiryDate = formatDate(expiresAt) || String(expiresAt);

    const html = layout(`
        <h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1e293b;">Your membership expires soon ⏰</h2>
        <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.65;">
            Hi ${firstName}, your <strong>${roleLabel}</strong> membership will expire in
            <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.
        </p>

        <!-- Warning banner -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;margin-bottom:28px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#92400e;">⚠️ &nbsp;Expiry Notice</p>
              <p style="margin:0;font-size:13px;color:#b45309;line-height:1.6;">
                Your membership will expire on <strong>${expiryDate}</strong>.
                After expiry, access to members-only content will be suspended until your membership is renewed.
              </p>
            </td>
          </tr>
        </table>

        <!-- Membership details -->
        <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Your Membership</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          ${infoRow('Name',         name)}
          ${infoRow('Email',        email)}
          ${infoRow('Tier',         badge(roleLabel))}
          ${infoRow('Duration',     MEMBERSHIP_DURATION[role] || '')}
          ${infoRow('Expires On',   expiryDate)}
          ${infoRow('Days Left',    `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`)}
        </table>

        <!-- What happens after expiry -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f8fafc;border-radius:10px;margin-bottom:8px;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">What happens when it expires?</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${checkListItem('🔒 &nbsp;Access to member-only content will be restricted')}
                ${checkListItem('📄 &nbsp;Framework downloads & audit templates will be unavailable')}
                ${checkListItem('📧 &nbsp;You will receive a final expiry notification')}
                ${checkListItem('🔄 &nbsp;Contact us to renew and restore full access')}
              </table>
            </td>
          </tr>
        </table>

        ${ctaButton('Contact Us to Renew', `${APP_URL()}/contact`)}
    `,
    `Your ${roleLabel} membership expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — renew now`);

    send({
        from:    FROM(),
        to:      email,
        subject: `⏰ Your ${roleLabel} membership expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        html,
    });
};

/**
 * sendMembershipExpiredEmail
 * Sent on the day membership_expires_at is reached (or the day after).
 *
 * @param {{ name: string, email: string, role: string, expiredAt: string|Date }} opts
 */
export const sendMembershipExpiredEmail = ({ name, email, role, expiredAt }) => {
    const firstName  = (name || 'Member').split(' ')[0];
    const roleLabel  = MEMBERSHIP_ROLE_LABELS[role] || role;
    const expiryDate = formatDate(expiredAt) || String(expiredAt);

    const html = layout(`
        <h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1e293b;">Your membership has expired</h2>
        <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.65;">
            Hi ${firstName}, your <strong>${roleLabel}</strong> membership expired on <strong>${expiryDate}</strong>.
        </p>

        <!-- Expired banner -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;margin-bottom:28px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#991b1b;">❌ &nbsp;Membership Expired</p>
              <p style="margin:0;font-size:13px;color:#b91c1c;line-height:1.6;">
                Your access to members-only content has been suspended. Reach out to our team to
                discuss renewal options and restore your full access.
              </p>
            </td>
          </tr>
        </table>

        <!-- Membership details -->
        <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Membership Details</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          ${infoRow('Name',       name)}
          ${infoRow('Email',      email)}
          ${infoRow('Tier',       badge(roleLabel, '#991b1b', 'rgba(153,27,27,0.1)'))}
          ${infoRow('Expired On', expiryDate)}
          ${infoRow('Status',     badge('Expired', '#991b1b', 'rgba(153,27,27,0.1)'))}
        </table>

        <!-- Options -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f8fafc;border-radius:10px;margin-bottom:8px;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">Your options</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${checkListItem('📩 &nbsp;Contact our team to discuss renewal')}
                ${checkListItem('🔄 &nbsp;Re-register for a free Professional membership')}
                ${checkListItem('⬆️ &nbsp;Upgrade to Executive or Founding Member tier')}
                ${checkListItem('🌐 &nbsp;Public content (news, events) remains accessible')}
              </table>
            </td>
          </tr>
        </table>

        ${ctaButton('Contact Us to Renew', `${APP_URL()}/contact`)}
    `,
    `Your ${roleLabel} membership has expired — contact us to renew`);

    send({
        from:    FROM(),
        to:      email,
        subject: `Your ${roleLabel} membership has expired`,
        html,
    });
};


/**
 * sendExecutiveApplicationAdminEmail
 * Sent to the admin when a user submits an Executive membership application.
 *
 * @param {{ adminEmail: string, adminName?: string, application: object }} opts
 *   application: { applicant_name, applicant_email, organization_name, job_title, linkedin_url, phone, created_at }
 */
export const sendExecutiveApplicationAdminEmail = ({ adminEmail, adminName, application }) => {
    const {
        applicant_name, applicant_email, organization_name,
        job_title, linkedin_url, phone,
        created_at,
    } = application;

    const appliedOn = formatDate(created_at) || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const adminFirst = (adminName || 'Admin').split(' ')[0];

    const html = layout(`
        <h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1e293b;">New Executive Application 🔔</h2>
        <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.65;">
            Hi ${adminFirst}, a user has submitted an <strong>Executive Membership</strong> application and is awaiting your review.
        </p>

        <!-- Alert banner -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:10px;margin-bottom:28px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1d4ed8;">📋 &nbsp;Action Required</p>
              <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6;">
                Please review this application in the admin dashboard and approve or reject it.
                The applicant will be notified of your decision automatically.
              </p>
            </td>
          </tr>
        </table>

        <!-- Applicant details -->
        <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Applicant Details</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          ${infoRow('Name',          applicant_name)}
          ${infoRow('Email',         applicant_email)}
          ${infoRow('Organisation',  organization_name || '—')}
          ${infoRow('Job Title',     job_title || '—')}
          ${infoRow('LinkedIn',      linkedin_url ? `<a href="${linkedin_url}" style="color:#0066cc;">${linkedin_url}</a>` : '—')}
          ${infoRow('Phone',         phone || '—')}
          ${infoRow('Applied On',    appliedOn)}
        </table>

        <!-- Payment info -->
        <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Payment Summary</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          ${infoRow('Original Price',  '$299 / quarter')}
          ${infoRow('Promo Applied',   badge('FOUNDING-LAUNCH  100% OFF', '#15803d', 'rgba(21,128,61,0.1)'))}
          ${infoRow('Amount Charged',  '<strong style="color:#15803d;">$0.00</strong>')}
          ${infoRow('Payment Ref',     '<code style="background:#f1f5f9;padding:3px 8px;border-radius:5px;font-family:monospace;font-size:12px;color:#334155;">PROMO-100PCT</code>')}
        </table>

        ${ctaButton('Review Application in Admin Dashboard', `${APP_URL()}/admin`)}
    `,
    `New Executive Membership application from ${applicant_name} — action required`);

    send({
        from:    FROM(),
        to:      adminEmail,
        subject: `🔔 New Executive Membership Application — ${applicant_name}`,
        html,
    });
};


/**
 * sendMembershipApplicationReceivedEmail
 * Sent to the applicant confirming their application was received.
 *
 * @param {{ name: string, email: string, requestedRole: 'executive'|'founding_member' }} opts
 */
export const sendMembershipApplicationReceivedEmail = ({ name, email, requestedRole }) => {
    const firstName  = (name || 'Member').split(' ')[0];
    const roleLabel  = requestedRole === 'founding_member' ? 'Founding Member' : 'Executive';

    const isExecutive = requestedRole === 'executive';

    const roleDetails = isExecutive
        ? `<p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6;">
             Your Executive membership application (with our <strong>FOUNDING-LAUNCH</strong> promo — $0 today) has been 
             submitted and is under admin review. You'll be notified once a decision is made.
           </p>`
        : `<p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6;">
             Your Founding Member invitation request has been received. Our team will carefully review
             your application and reach out if you're selected.
           </p>`;

    const nextStepsRows = isExecutive
        ? `${checkListItem('🔍 &nbsp;Admin team reviews your Executive application')}
           ${checkListItem('📧 &nbsp;You receive an approval or rejection email')}
           ${checkListItem('🚀 &nbsp;On approval, your role upgrades to Executive instantly')}`
        : `${checkListItem('📑 &nbsp;Your application is reviewed by the founding team')}
           ${checkListItem('📧 &nbsp;You will be contacted directly if selected')}
           ${checkListItem('🤝 &nbsp;Founding Members help shape the AI Risk Council\'s future')}`;

    const html = layout(`
        <h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1e293b;">Application Received ✅</h2>
        <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.65;">
            Hi ${firstName}, we've received your <strong>${roleLabel}</strong> membership application. Thank you for your interest!
        </p>

        <!-- Confirmation banner -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:10px;margin-bottom:28px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1d4ed8;">⏳ &nbsp;Pending Admin Review</p>
              ${roleDetails}
            </td>
          </tr>
        </table>

        <!-- Application summary -->
        <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Your Application</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          ${infoRow('Name',            name)}
          ${infoRow('Email',           email)}
          ${infoRow('Requested Tier',  badge(roleLabel))}
          ${infoRow('Status',          badge('Under Review', '#92400e', '#fffbeb'))}
        </table>

        <!-- Next steps -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f8fafc;border-radius:10px;margin-bottom:8px;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">What happens next?</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${nextStepsRows}
              </table>
            </td>
          </tr>
        </table>

        ${ctaButton('Back to the Platform', APP_URL())}
    `,
    `Your ${roleLabel} application has been received — we'll be in touch soon`);

    send({
        from:    FROM(),
        to:      email,
        subject: `Your ${roleLabel} application has been received 📬`,
        html,
    });
};


/**
 * sendMembershipApplicationStatusEmail
 * Sent to the applicant when an admin approves or rejects their application.
 *
 * @param {{ name: string, email: string, requestedRole: 'executive'|'founding_member', status: 'approved'|'rejected', adminNotes?: string }} opts
 */
export const sendMembershipApplicationStatusEmail = ({ name, email, requestedRole, status, adminNotes }) => {
    const firstName  = (name || 'Member').split(' ')[0];
    const roleLabel  = requestedRole === 'founding_member' ? 'Founding Member' : 'Executive';
    const isApproved = status === 'approved';

    const bannerHtml = isApproved
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;margin-bottom:28px;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#15803d;">✅ &nbsp;Application Approved!</p>
                <p style="margin:0;font-size:13px;color:#166534;line-height:1.6;">
                  Congratulations — your <strong>${roleLabel}</strong> membership is now active.
                  Sign in to access all your new member benefits.
                </p>
              </td>
            </tr>
          </table>`
        : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;margin-bottom:28px;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#991b1b;">❌ &nbsp;Application Not Approved</p>
                <p style="margin:0;font-size:13px;color:#b91c1c;line-height:1.6;">
                  After reviewing your application, we were unable to approve your <strong>${roleLabel}</strong>
                  membership at this time. Your existing Professional membership remains active.
                </p>
              </td>
            </tr>
          </table>`;

    const approvedBenefits = requestedRole === 'founding_member'
        ? `${checkListItem('👑 &nbsp;Lifetime Founding Member status on the AI Risk Council')}
           ${checkListItem('🤝 &nbsp;Direct input on council direction and governance')}
           ${checkListItem('📅 &nbsp;Exclusive founding member events and roundtables')}
           ${checkListItem('🏆 &nbsp;Recognition in the AI Risk Council founding members list')}`
        : `${checkListItem('⬆️ &nbsp;Executive membership role is now active on your account')}
           ${checkListItem('📄 &nbsp;Access to Executive-tier resources and frameworks')}
           ${checkListItem('📅 &nbsp;Priority access to all council events')}
           ${checkListItem('👥 &nbsp;Executive member networking and roundtables')}`;

    const adminNotesSection = adminNotes
        ? `<p style="margin:20px 0 8px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Note from Reviewer</p>
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                  style="background:#f8fafc;border-left:3px solid #94a3b8;border-radius:0 8px 8px 0;margin-bottom:8px;">
             <tr>
               <td style="padding:14px 18px;">
                 <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;font-style:italic;">"${adminNotes}"</p>
               </td>
             </tr>
           </table>`
        : '';

    const ctaSection = isApproved
        ? ctaButton('Sign In to Access Your New Benefits', `${APP_URL()}/login`)
        : ctaButton('Contact Us for More Information', `${APP_URL()}/contact`);

    const html = layout(`
        <h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1e293b;">
            ${isApproved ? `Welcome to ${roleLabel}! 🎉` : 'Application Update'}
        </h2>
        <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.65;">
            Hi ${firstName}, we have an update regarding your <strong>${roleLabel}</strong> membership application.
        </p>

        ${bannerHtml}

        <!-- Application details -->
        <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Application Details</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
          ${infoRow('Name',           name)}
          ${infoRow('Email',          email)}
          ${infoRow('Requested Tier', badge(roleLabel))}
          ${infoRow('Decision',       badge(isApproved ? 'Approved' : 'Not Approved', isApproved ? '#15803d' : '#991b1b', isApproved ? 'rgba(21,128,61,0.1)' : 'rgba(153,27,27,0.1)'))}
        </table>

        ${adminNotesSection}

        ${isApproved ? `
        <!-- Benefits unlocked -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f8fafc;border-radius:10px;margin:${adminNotes ? '20px' : '0'} 0 8px;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">Your new benefits</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${approvedBenefits}
              </table>
            </td>
          </tr>
        </table>` : ''}

        ${ctaSection}
    `,
    isApproved
        ? `Congratulations! Your ${roleLabel} application has been approved`
        : `Update on your ${roleLabel} membership application`);

    send({
        from:    FROM(),
        to:      email,
        subject: isApproved
            ? `🎉 Your ${roleLabel} membership is approved!`
            : `Update on your ${roleLabel} application`,
        html,
    });
};
