# AI Risk Council (ARC) Platform — Full Documentation
> Last updated: March 2026  
> Stack: React (Vite) + Node.js/Express + MySQL (Azure) + Azure Blob Storage
> **Note:** the role called "Executive" below is the **Chapter Lead** (`council_member` in the code). See section 12 for the Chapter Lead programme, which changes how that role works.

---

## Table of Contents
1. [Platform Overview](#1-platform-overview)
2. [Technology Stack](#2-technology-stack)
3. [Authentication & Session](#3-authentication--session)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Membership Journey](#5-membership-journey)
6. [Feature-by-Feature Documentation](#6-feature-by-feature-documentation)
7. [Admin Dashboard](#7-admin-dashboard)
8. [Route Map](#8-route-map)
9. [Email Notifications](#9-email-notifications)
10. [Database Schema Summary](#10-database-schema-summary)
11. [Ongoing DB Migration Strategy](#11-ongoing-db-migration-strategy)
12. [Chapter Lead Programme](#12-chapter-lead-programme)

---

## 1. Platform Overview

**AI Risk Council (ARC)** is a professional membership platform for AI risk governance practitioners. It provides:
- A curated AI Risk Framework with downloadable playbooks
- Community Q&A and knowledge sharing
- Events, webinars, and workshops
- Curated and automated AI news
- Research resources and whitepapers
- AI product reviews and certification tracking
- Awards and nominations system
- Tiered membership with role-based access control

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, inline CSS design system |
| Backend | Node.js + Express (ES Modules) |
| Database | MySQL 8.0 on Azure Database for MySQL Flexible Server |
| File Storage | Azure Blob Storage (images, documents, banners) |
| Auth | HttpOnly cookie (`arc_token`) — JWT, 7-day expiry |
| Email | Nodemailer (SMTP) |
| News Fetching | Automated RSS/news aggregation via cron job |
| Deployment | Azure App Service (backend serves built frontend from `/dist`) |

---

## 3. Authentication & Session

### How Login Works
1. User submits email + password to `POST /api/auth/login`
2. Backend verifies password hash (bcrypt), checks `status = approved` and membership not expired
3. Issues a **JWT** containing `{ id, name, email, role }` — stored as an **HttpOnly cookie** named `arc_token` (7-day expiry)
4. Frontend reads user info from `/api/auth/me` on page load

### Token Contents
```json
{ "id": 1, "name": "Hariom Kumar", "email": "...", "role": "founding_member" }
```

### Session Expiry
- Cookie expires in 7 days
- Membership expiry also checked at login:
  - `founding_member` → `NULL` = lifetime, never expires
  - `executive` → 3 years from approval date
  - `professional` → 1 year from approval date

### Logout
Clears the `arc_token` cookie. No server-side session to invalidate.

---

## 4. User Roles & Permissions

There are **3 member roles** plus **unauthenticated (guest)** users.

### Role Hierarchy (low → high)
```
Guest → Professional → Executive → Founding Member
```

---

### 4.1 Guest (Not Logged In)
Guests can browse most public content but cannot interact.

| Feature | Access |
|---|---|
| Home, About, Contact | ✅ Full access |
| Events listing | ✅ View only |
| News listing | ✅ View only |
| AI Risk Framework | ✅ Browse pillars/content — ❌ Cannot download playbooks |
| Research & Resources | ✅ Browse listing — ❌ Cannot download |
| Product Reviews | ✅ View only |
| Community Q&A | ✅ View only — ❌ Cannot post or vote |
| Certifications | ✅ View only |
| All Nominees | ✅ View only |
| Register / Login | ✅ |
| Membership page | ✅ |

---

### 4.2 Professional Member
Self-registers via `/register`. Account starts as `pending` until approved by a Founding Member.

**Membership:** 1 year from approval date. Must renew via `/membership`.

| Feature | Access |
|---|---|
| Everything guests can do | ✅ |
| Register for events & workshops | ✅ + Confirmation email sent |
| Community Q&A — post, answer, vote | ✅ |
| Download resources (whitepapers, articles, tools) | ✅ |
| Upload resources | ✅ — requires admin approval before visible |
| AI Risk Framework — browse all content | ✅ |
| AI Risk Framework — download playbooks | ❌ Executive/Founding only |
| Certifications | ✅ Browse — completion flow not yet implemented |
| Voting (Awards/Nominations) | ✅ Can vote and gets email notification |
| User Dashboard | ✅ `/user/dashboard` |
| Profile management | ✅ `/profile` |
| Manage News / Events | ❌ |
| Admin Dashboard | ❌ |

---

### 4.3 Executive Member
Applied for via `/membership` → `/executive-checkout`. Approved by Founding Member.

**Membership:** 3 years from approval date.

| Feature | Access |
|---|---|
| Everything Professional can do | ✅ |
| Download AI Risk Framework playbooks | ✅ |
| Create & manage News articles | ✅ (create, edit, publish/unpublish, delete) |
| Manage Automated News | ✅ (approve/reject RSS-fetched articles) |
| Create & manage Events | ✅ (create, edit, publish, upload banner, delete) |
| Upload resources | ✅ — auto-approved, no admin review needed |
| Upload admin-only resource types (framework, news, homepage_video) | ✅ |
| Approve/reject pending resources | ✅ |
| Admin Dashboard — Pending Resources tab | ✅ |
| Admin Dashboard — Automated News tab | ✅ |
| Admin Dashboard — Manage News tab | ✅ |
| Admin Dashboard — Manage Events tab | ✅ |
| Admin Dashboard — Manage Resources tab | ✅ |
| Approve members | ❌ Founding Member only |
| Manage team, awards, nominations | ❌ Founding Member only |
| Framework content management | ❌ Founding Member only |

---

### 4.4 Founding Member (Admin)
Manually created or promoted by another Founding Member via Admin Dashboard.

**Membership:** Lifetime (`membership_expires_at = NULL`).

| Feature | Access |
|---|---|
| Everything Executive can do | ✅ |
| Full Admin Dashboard | ✅ All tabs |
| Approve / reject member registrations | ✅ |
| Approve / reject membership upgrade applications | ✅ |
| Manage team members (About page team section) | ✅ |
| Manage Awards & Nominees | ✅ |
| Manage Product Reviews (add, edit, delete) | ✅ |
| Framework content management | ✅ |
| User role management | ✅ (promote/demote any user) |
| View full user list | ✅ `/admin-dashboard/users` |
| All site access | ✅ |

---

## 5. Membership Journey

### 5.1 Professional Registration
```
/register → fills form (name, email, password, org) 
→ account created with status=pending, role=professional
→ Founding Member approves in Admin Dashboard → Member Approvals tab
→ On approval: status=approved, membership_expires_at = now + 1yr
→ User gets approval email
→ Can now log in
```

### 5.2 Executive Upgrade (from Professional)
```
/membership → clicks "Executive" plan
→ /executive-checkout → fills upgrade application form
→ submitted to membership_applications table (status=pending)
→ Founding Member approves in Admin Dashboard → Member Approvals tab
→ On approval: user's role updated to 'executive', membership_expires_at = now + 3yr
→ User gets approval email
```

### 5.3 Founding Member (No self-registration)
Founding Members are created manually by:
- An existing Founding Member via Admin Dashboard → User Management → change role
- Or directly in the database

---

## 6. Feature-by-Feature Documentation

---

### 6.1 Home Page (`/`)
- Hero section with CTA
- Platform stats
- Featured events preview
- Featured news preview
- Membership tier cards (Professional / Executive / Founding Member)
- Testimonials / highlights

---

### 6.2 Events & Workshops (`/events`)

**Public:** Everyone can view events.  
**Professional+:** Can register for events (login required).  
**Executive + Founding Member:** Can create, edit, publish/unpublish, and delete events.

**Event Categories:** Webinar, Seminar, Workshop, Podcast

**Features:**
- Filter by category (All / Webinar / Seminar / Workshop / Podcast)
- Filter by Upcoming / Past
- Search by title
- Event card shows: title, date, location, category badge, description
- **Register for Event:** Logged-in members fill a registration form (name, email, org, phone, notes, consent checkbox). On submit — confirmation email sent to registrant.
- **Add Event (Executive/Founding):** Modal form with title, date, location, category, description, link, banner image upload (Azure Blob), publish toggle
- **Edit/Delete:** Pencil and trash icons on cards (visible to Executive/Founding only)
- **Publish/Unpublish:** Toggle visibility on site

---

### 6.3 News (`/news`)

**Public:** Everyone can view published news.  
**Executive + Founding Member:** Can create, edit, publish/unpublish, and delete articles.

**Features:**
- News cards with title, summary, image, source, date, external link
- Filter: Manual news vs Automated (RSS-fetched) news
- **Add Article button** (visible to Executive/Founding): Opens modal with fields — title, summary, link, image URL, published toggle
- **Edit / Delete / Publish controls** on each card (Executive/Founding only)
- Automated news badge on RSS-fetched articles

---

### 6.4 Automated News Management (Admin Dashboard → Automated News tab)
Available to: **Executive + Founding Member**

The platform has a background cron job that fetches AI risk/governance news from RSS feeds automatically.

**Features:**
- View all auto-fetched articles (Pending / Approved / Rejected)
- Approve article → appears on `/news` page
- Reject article → hidden from public
- Bulk approve / bulk reject
- Delete approved article
- Toggle publish/unpublish on approved articles
- Toggle "trending" status
- Manual trigger of news fetch
- Stats: total fetched, pending count, approved count

---

### 6.5 AI Risk Framework (`/framework`)
A structured framework for AI governance, organized into pillars, phases, maturity levels, and security tools.

**Public:** Can browse all framework content (pillars, phases, steps, maturity levels, tools).  
**Executive + Founding Member:** Can download PDF playbooks.  
**Professional:** Sees upgrade prompt when trying to download.  
**Guest:** Sees login prompt.

**Framework Structure:**
- **Pillars** — Core governance domains
- **Implementation Phases** — Stages of framework adoption
- **Implementation Steps** — Detailed steps within each phase
- **Maturity Levels** — Self-assessment maturity model
- **Audit Templates** — Downloadable checklists
- **Security Tools** — Curated tool recommendations

**Founding Member only:** Manage/edit framework content via Admin Dashboard → Framework Content tab.

---

### 6.6 Research & Resources (`/resources`)

**Public:** Browse resource listing (titles, descriptions, types).  
**Professional + Executive + Founding Member:** Can download resources + upload new ones.  
**Professional uploads:** Go to `status=pending` — require Founding Member or Executive approval.  
**Executive + Founding Member uploads:** Auto-approved (`status=approved`), immediately visible.

**Resource Types:** Framework, Whitepaper, Product, Video, Article, Tool, News

**Features:**
- Filter by type
- Search by title/description
- Download button (authenticated members only)
- Upload form: title, description, abstract, file upload (Azure Blob), type selection, demo URL
- **Admin-only types** (framework, news, homepage_video): Only Executive/Founding can upload these
- Pending Resources tab in Admin Dashboard for Founding Member / Executive to approve/reject

---

### 6.7 Community Q&A (`/community-qna`)

**Public:** Browse questions and answers (read-only).  
**All logged-in members:** Full participation.

**Features:**
- Post a new question (title, body, tags)
- Answer any question
- Upvote/downvote questions and answers
- Mark answer as accepted (question author)
- Search questions
- Filter by: Latest / Top / Unanswered
- Tag-based filtering
- **Question detail page** (`/community-qna/:id`): Full thread with all answers and votes

---

### 6.8 AI Product Reviews (`/services/product-reviews`)

**Public:** Browse all product listings.  
**All logged-in members:** Submit user reviews and ratings.  
**Founding Member:** Add new products, edit product details, manage evidence/media.

**Features:**
- Product cards with name, category, rating summary, description
- **Product detail** (`/services/product-reviews/:id`):
  - Full product profile: features, media, evidence
  - Feature test results
  - User reviews section — submit rating + written review (logged-in)
  - Overall rating aggregation
- **Add Product (Founding Member):** Full product creation with feature mapping

---

### 6.9 Certifications (`/certification`)
Displays available AI governance certification tracks.

**Current status:** Browse-only. The actual certification exam/completion flow is **not yet implemented**.

---

### 6.10 Awards & Nominations (`/nominees`)

**Public:** Browse all nominees.  
**All logged-in members:** Vote for nominees (one vote per category).  
**Email notification:** Sent to voter on successful vote submission.  
**Founding Member:** Full nominee and award management via Admin Dashboard → Nominations tab.

**Features:**
- Nominee profiles with bio, organization, category
- Voting interface
- Award categories
- **Admin (Founding Member):**
  - Create/edit award categories
  - Add/edit/delete nominees
  - View vote counts
  - Manage voting periods

---

### 6.11 User Dashboard (`/user/dashboard`)
Available to: **All logged-in approved members**

Sections:
1. **Profile Summary** — name, role badge, membership status, expiry date, edit profile button
2. **Membership Card** — current plan details with "Upgrade Membership" button (for Professional)
3. **Platform Features** — role-gated feature tiles:
   - Manage News → `/news` (Executive/Founding)
   - Manage Events → `/events` (Executive/Founding)
   - Manage Auto-News → `/admin-dashboard?tab=auto_news` (Executive/Founding)
   - Approve Resources → `/admin-dashboard?tab=pending_resources` (Executive/Founding)
   - Approve Members → `/admin-dashboard?tab=pending` (Founding only — shown as locked to Executive)
   - Manage Awards → `/admin-dashboard?tab=nominations` (Founding only — shown as locked to Executive)
4. **Upcoming Events** — next 3 events with register button
5. **Latest News** — 3 most recent articles

---

### 6.12 Profile (`/profile`)
Available to: **All logged-in members**

**Editable fields:**
- Display name
- Bio
- Profile photo (upload to Azure Blob)
- LinkedIn URL
- Organization name

---

### 6.13 Membership Page (`/membership`)

Public page explaining the three tiers:

| Plan | Price | Duration | CTA |
|---|---|---|---|
| Professional | Free | 1 year | Register → `/register` |
| Executive | Paid | 3 years | Apply → `/executive-checkout` |
| Founding Member | Invite only | Lifetime | Contact us |

---

### 6.14 About Page (`/about`)
- Organization mission and vision
- **Team section** — dynamically loaded from DB (`team_members` table)
- Managed by Founding Member via Admin Dashboard → Manage Team tab

---

### 6.15 Services (`/services`)
Overview page linking to:
- Product Reviews
- Certifications
- Framework
- Community Q&A

---

### 6.16 Contact (`/contact`)
Static contact form (email submission).

---

## 7. Admin Dashboard

**URL:** `/admin-dashboard`  
**Access:** Executive Member + Founding Member  
**Route guard:** `AdminRoute` component — redirects non-admin/non-executive users to `/`

### Tab Visibility by Role

| Tab | Executive | Founding Member |
|---|---|---|
| Member Approvals | ❌ Hidden | ✅ |
| Pending Resources | ✅ | ✅ |
| Manage News | ✅ | ✅ |
| Automated News | ✅ | ✅ |
| Manage Events | ✅ | ✅ |
| Manage Team | ❌ Hidden | ✅ |
| Manage Resources | ✅ | ✅ |
| Product Reviews | ❌ Hidden | ✅ |
| Nominations | ❌ Hidden | ✅ |
| Framework Content | ❌ Hidden | ✅ |

### Header Stats Bar
- **Pending Approvals** (Founding Member only) — click to jump to Member Approvals tab
- **Pending Resources** — click to jump to Pending Resources tab
- **Pending News** — click to jump to Automated News tab
- **Active Section** — current tab indicator

### Deep-link Navigation
Tabs can be opened directly via URL query param:
- `/admin-dashboard?tab=auto_news`
- `/admin-dashboard?tab=pending_resources`
- `/admin-dashboard?tab=pending`
- `/admin-dashboard?tab=nominations`
- etc.

### Tab Details

#### Member Approvals (Founding Member)
- Lists all pending user registrations (new sign-ups)
- Lists all pending membership upgrade applications (Professional → Executive)
- Actions: Approve / Reject with optional admin notes
- On approval: role updated, membership_expires_at set, approval email sent

#### Pending Resources (Executive + Founding)
- Lists all resources with `status=pending` uploaded by Professional members
- Actions: Approve (makes visible to all) / Reject
- Shows uploader name, resource type, title, description

#### Manage News (Executive + Founding)
- Full CRUD for manual news articles
- Create: title, summary, link, image URL, publish toggle
- Edit / Delete / Publish toggle on each article

#### Automated News (Executive + Founding)
- Manage RSS-fetched articles
- Pending / Approved / Rejected filter
- Approve / Reject / Bulk operations
- Toggle publish / trending status
- Manual fetch trigger
- Fetch statistics

#### Manage Events (Executive + Founding)
- Full CRUD for events
- Create/edit: title, date, location, category, description, link, banner image, publish toggle
- View registrations per event

#### Manage Team (Founding Member)
- Add / edit / remove team members shown on `/about` page
- Fields: name, role/title, bio, photo (Azure Blob), LinkedIn URL, display order

#### Manage Resources (Executive + Founding)
- View all approved resources
- Edit metadata / delete
- Upload new resources

#### Product Reviews (Founding Member)
- Add new products with full feature mapping
- Edit product details, features, media
- Manage user-submitted reviews

#### Nominations (Founding Member)
- Create award categories
- Add / edit / delete nominees
- View vote counts per nominee
- Manage voting periods

#### Framework Content (Founding Member)
- Edit pillars, phases, steps, maturity levels
- Add security tool recommendations
- Manage audit templates

---

## 8. Route Map

### Public Routes
| Path | Page | Notes |
|---|---|---|
| `/` | Home | |
| `/about` | About | Team loaded from DB |
| `/events` | Events | Role-gated UI |
| `/services` | Services | |
| `/framework` | AI Risk Framework | Download gated to Executive+ |
| `/resources` | Resources | Download/upload gated |
| `/certification` | Certifications | Browse only |
| `/community-qna` | Community Q&A | Post/vote requires login |
| `/community-qna/:id` | Q&A Detail | |
| `/news` | News | Write access gated to Executive+ |
| `/contact` | Contact | |
| `/services/product-reviews` | Product Reviews | |
| `/services/product-reviews/:id` | Product Detail | |
| `/nominees` | All Nominees | Voting requires login |
| `/membership` | Membership | |

### Guest-Only Routes (redirect to `/` if logged in)
| Path | Page |
|---|---|
| `/login` | Login |
| `/register` | Register |

### Protected Routes (login required)
| Path | Page |
|---|---|
| `/executive-checkout` | Executive Upgrade Application |
| `/profile` | Profile Edit |
| `/user/dashboard` | User Dashboard |

### Admin Routes (Executive or Founding Member only)
| Path | Page |
|---|---|
| `/admin-dashboard` | Admin Dashboard (all tabs) |
| `/admin-dashboard/users` | Full User Management |
| `/admin-dashboard/nominees` | Admin Nominees Management |

---

## 9. Email Notifications

All emails are built in `Backend/services/emailService.js` from one shared layout. Every message is sent as HTML **plus** a plain-text part, with a Reply-To to the support address; automated mail is marked `Auto-Submitted` so out-of-office replies are not triggered. Links and the logo use `EMAIL_BASE_URL`, then `FRONTEND_URL`, then `APP_URL` (localhost ignored), then `https://www.riskaicouncil.org`, so they match the sending domain.

| Email | Sent when | To |
|---|---|---|
| Welcome | Someone registers | The new member |
| Account approved | An admin approves a member | The member |
| Event registration confirmed | Someone registers for an event | The registrant |
| Membership expiry warning / expired | Daily job, 7 days before and on expiry | The member |
| Application received | A member applies to be a Chapter Lead | The applicant |
| New Chapter Lead application | Same moment | Founding members (or `ADMIN_EMAIL`) |
| Application approved / not approved | An admin decides | The applicant |
| Verification code (registration) | "Send code" on the register form | The new user |
| Verification code (nomination) | "Send code" on the self-nomination form | The nominee |
| Self-nomination received / awaiting review / decision | Nomination submitted, then reviewed | Nominee, then founding members, then nominee |
| Account deleted | A member deletes their own account | The former member |
| Contact: inquiry / confirmation / reply | Contact form, then admin reply | The team, the visitor, the visitor |
| Chapter Lead notices | Programme events (results, warnings, term changes) | Leads and admins |
| **Sign-in code** | "Login with code" on the sign-in page | The account owner |
| **Password reset code** | "Forgot password" | The account owner |
| **Password was changed** | A reset or a change from the profile | The account owner |
| **Security alert** | A founding member signs in with a code or has a password reset | The other founding members |

---

## 10. Database Schema Summary

| Table | Purpose |
|---|---|
| `users` | All platform members — role, status, membership_expires_at |
| `membership_applications` | Executive/Founding upgrade applications |
| `events` | Events and workshops |
| `event_registrations` | Who registered for which event |
| `news` | Manual + automated news articles |
| `resources` | Uploaded resources (files, videos, articles) |
| `team_members` | About page team section |
| `qna_posts` | Community Q&A questions |
| `qna_answers` | Answers to Q&A questions |
| `qna_votes` | Upvote/downvote records |
| `products` | AI product listings |
| `product_feature_tests` | Product feature test results |
| `product_media` | Product images/videos |
| `product_evidences` | Supporting evidence files |
| `product_user_reviews` | User-submitted ratings & reviews |
| `nominees` | Award nominees |
| `award_categories` | Award categories |
| `votes` | Voting records |
| `awards` | Award definitions |
| `framework_pillars` | Framework pillar definitions |
| `framework_implementation_phases` | Framework phases |
| `framework_implementation_steps` | Steps within phases |
| `framework_maturity_levels` | Maturity self-assessment levels |
| `framework_audit_templates` | Downloadable audit templates |
| `framework_security_tools` | Curated tool recommendations |
| `chapters` | Admin-defined geographic areas (one active lead each) |
| `chapter_lead_profiles` | One row per Chapter Lead tenure: referral code, term start, status |
| `chapter_lead_policy` | Versioned programme rules: targets, term length, revenue-share rates |
| `chapter_lead_quarters` | Per-lead quarterly result snapshots |
| `referrals` | Which Chapter Lead brought which member |
| `policy_acceptances` | Versioned consent to the Privacy Policy and Terms |
| `event_hosts` / `host_requests` | Who hosted a podcast or workshop / requests to host |
| `blog_posts` | Chapter Lead blogs (draft, pending, published, rejected) |
| `content_views` | De-duplicated view and recording-click tracking |

---

## 11. Ongoing DB Migration Strategy

### The Problem
Local MySQL (`arc_platform`) and Azure MySQL (`racdatabase`) are separate servers. Schema changes made locally must be manually applied to Azure.

### The Solution — `azure_safe_migrate.sql`
Located at: `Backend/db/azure_safe_migrate.sql`

This file uses helper procedures (`add_col`, `add_idx`) that:
- **Only add** columns/tables that don't exist yet
- **Never drop** data or existing tables
- Are safe to run multiple times (idempotent)

### Workflow for Every Future Schema Change

**Step 1 — Make the change locally** (in MySQL Workbench or via migration file)

**Step 2 — Add the change to `azure_safe_migrate.sql`:**
```sql
-- Example: adding a new column
CALL add_col('users', 'new_column_name', 'VARCHAR(255) DEFAULT NULL');

-- Example: adding a new table
CREATE TABLE IF NOT EXISTS new_table (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ...
);
```

**Step 3 — Copy and run on Azure:**
```powershell
Copy-Item "...\Backend\db\azure_safe_migrate.sql" "C:\azure_safe_migrate.sql" -Force
cmd /c "mysql -h racdatabase.mysql.database.azure.com -u racdbadmin -p --ssl-mode=REQUIRED racdatabase < C:\azure_safe_migrate.sql"
```

**Step 4 — Restart Azure App Service** (only needed if the backend was already running with old schema cached)

### One-Time Full Data Sync (when needed)
To copy all local data to Azure (e.g., after adding test data locally):
```powershell
# 1. Export data only (no schema)
mysqldump -u root -p --no-tablespaces --no-create-info --insert-ignore --complete-insert arc_platform > "C:\data_only.sql"

# 2. Import into Azure
cmd /c "mysql -h racdatabase.mysql.database.azure.com -u racdbadmin -p --ssl-mode=REQUIRED racdatabase < C:\data_only.sql"
```
`--insert-ignore` skips rows that already exist → no data loss, no duplicates.

---

## 12. Chapter Lead Programme

A Chapter Lead (`council_member`) has quarterly goals, a personal dashboard, a referral code and a revenue-share entitlement. Rules live in the database (`chapter_lead_policy`) and are editable by admins; the numbers below are the launch defaults.

### Rules (defaults)
| Item | Default |
|---|---|
| Quarterly goals | 20 new members, 3 podcasts, 10-15 posts, 3 blogs |
| A quarter is "met" | at least 3 of the 4 goals |
| Removal review | 3 consecutive missed quarters (an admin decides; never automatic) |
| Quarters | Calendar quarters (UTC). A lead's first part-quarter is not scored. |
| Term | 18 months, continues automatically into the next term unless the role is ended |
| Revenue share | Term 1: 3%, Term 2: 5%, Term 3+: 7% |
| Direct commission | 10% on value brought in directly (first payment only unless the policy flag is set) |

### What counts
- **Members:** referred sign-ups once an admin approves them (`referrals.qualified_at` in the quarter).
- **Podcasts:** published podcast, lead is a host, an admin marked it conducted (`events.conducted_at`).
- **Posts:** the lead's visible feed posts of type general / ai_product / event / troubleshooting (memes and polls excluded; credit stops at the maximum).
- **Blogs:** `blog_posts` published in the quarter.

### Where things are
- Pure rules (terms, quarters, goals): `Backend/utils/chapterLeadRules.js`
- Business logic: `Backend/services/chapterLeadService.js` (the one place that promotes / ends a lead)
- Lead API: `/api/chapter-lead/*`; admin API: `/api/admin/chapter-leads/*`; blogs `/api/blogs`; views `/api/views`; chapters `/api/chapters`
- Daily job: `Backend/jobs/chapterLeadJob.js` (01:00 UTC): rolls terms over, closes finished quarters, sends nudges. Idempotent; admins can run it from the Chapter Leads tab.
- Frontend: the Chapter Lead programme is part of the one member dashboard at `/user/dashboard` (programme block on top for leads, tabs: Overview / Content performance / Referrals / Host requests / Quarter history; `?tab=` deep-links a tab). `/chapter-lead/dashboard` redirects there. Also `/blog`, `/chapter-lead/blog/*`, and Admin Dashboard -> **Chapter Leads** tab (founding members managing all leads).

### Behaviour worth knowing
- Every route to "becomes a lead" (application approval, user approval, role change, admin-created user) goes through `activateChapterLead()`, so the profile, referral code and term are always created.
- Roles are re-read from the database on every request (`middleware/auth.js`), so ending a lead's role (or deleting an account) takes effect immediately, not when the 7-day token expires.
- Applying requires ticking the Privacy Policy + Terms box; acceptance is stored per version in `policy_acceptances`. Bump `POLICY_VERSION` in `chapterLeadRules.js` (and the dates on /privacy and /terms) to make every active lead accept again at next login.
- Sign-up now requires a country. A referral code can be supplied by link (`/register?ref=RAC-XXXXXX`), by typing it, or through LinkedIn sign-up.
- Deleting an account stays immediate. A lead's role ends, the code stops working, and referral / quarter / consent records are kept in anonymised form (IP address erased).
- Database session time zone is assumed to be UTC (the Azure default); quarter windows are UTC.

### Not built yet (deliberately)
Revenue ledger, earnings accrual and payouts wait for the payment gateway. The data needed later is already captured: chapter and country per member, referral attribution, hosts on sessions, term start dates, and workshop prices.

### Deploying this change (order matters)
1. Run migrations **before** deploying the new backend: `npm run db:migrate` in `Backend/` (applies 0019 and 0020; both are safe to re-run).
2. Backfill existing leads: `npm run db:backfill-leads` (dry run, prints the plan), then `node db/backfill_chapter_leads.js --apply`. Leads whose membership already expired are listed and left untouched.
3. In Admin Dashboard -> Chapter Leads -> Chapters, create chapters, then assign each existing lead to one.
4. Deploy backend and frontend together (sign-up now sends `country_code`).
5. Existing leads see a one-time "accept updated terms" prompt at their next login.

---

## 13. Sign-in codes, password reset and email delivery

### What members can do
- **Password**: unchanged.
- **Login with code**: on the sign-in page, enter the email, get a 6-digit code, enter it. Works for every account type, including accounts created through LinkedIn (which have no password).
- **Forgot password**: `/forgot-password`. Enter the email, then the emailed code and a new password. For a LinkedIn-only account this sets its first password; the Profile page offers the same from "Set a password".
- **Change password** (Profile, signed in) now works. It used to send the wrong field names and was always rejected.
- An admin can still reset any user's password from Manage Users.

### Endpoints (`/api/auth`)
| Endpoint | Body | Result |
|---|---|---|
| `POST /login-code/request` | `email` | Emails a code. Always answers the same, whether or not the account exists |
| `POST /login-code/verify` | `email`, `code` | Signs in (same gates and session as a password login) |
| `POST /forgot-password` | `email` | Emails a reset code. Same generic answer |
| `POST /reset-password` | `email`, `code`, `newPassword` | Sets the password (8+ characters, one uppercase, one number) |

### Security rules
- Codes come from `crypto.randomInt`, are single-use, last **10 minutes** (**5** for founding members), and lock after **5** wrong guesses. Only an HMAC of the code is stored, never the code. The key is `OTP_SECRET`, or `JWT_SECRET` if that is not set.
- Throttles: at most one code per account per **60 seconds** and **5 per hour**; per IP, 10 code requests and 30 attempts per 15 minutes.
- Deleted accounts are ignored. Pending and rejected accounts get a code but then see the same "pending" / "rejected" message as a password login.
- **A password change signs the account out everywhere.** `users.password_changed_at` is compared with each session's issue time in `middleware/auth.js` and `optionalAuth.js`. The device that made the change gets a fresh session.
- Every password change emails the owner. When a founding member signs in with a code or has a password reset, the **other** founding members are emailed.
- Codes are never in an email subject. Server logs record the event and user id only.

### Database (migration `0021_auth_otp.sql`)
`auth_otps` (one live code per email and purpose, hashed) and `users.password_changed_at`. If the code reaches production before the migration, the site keeps working (the auth middleware and password writes fall back and log a warning), but code sign-in and reset will not work until it runs. Run the migration first.

### Email deliverability (checked 21 Oct 2026)
- Mail goes through GoDaddy's relay (`smtpout.secureserver.net`) from `members@riskaicouncil.org`.
- DNS: SPF `v=spf1 include:secureserver.net -all` is valid. DMARC is `p=reject` with relaxed alignment. **No DKIM record was found** at ten common selector names. That is not proof (the selector depends on the provider), so confirm with the headers of a message that reached a spam folder (Gmail: Show original, look at `Authentication-Results`). With DMARC at `reject`, a missing or failing DKIM/SPF match is what pushes mail to spam or rejects it.
- Fixed in code: plain-text part on every email, links and logo on the public domain, colour fallbacks for Outlook, no emoji or stray text in subjects, correct role names, escaped user text.

### Deploying this change
1. Apply `0021_auth_otp.sql` **before** deploying (`npm run db:migrate`).
2. Optionally set `EMAIL_BASE_URL=https://www.riskaicouncil.org` in the Azure app settings (now the default anyway) and, if wanted, a separate `OTP_SECRET`.
3. After deploying, use the admin dashboard's test email and check the received headers.
