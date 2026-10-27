# AI Risk Council (ARC) Platform — Full Documentation
> Last updated: October 2026  
> Stack: React (Vite) + Node.js/Express + MySQL (Azure) + Azure Blob Storage
> **Note:** the role once called "Executive" is the **Chapter Lead**, and a **Chapter Ambassador** is a second tier on the same database role (`council_member`). Sections 4, 5, 7 and 12 describe them; older feature notes below that still say "Executive" mean "chapter team".

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
12. [Chapter teams: Chapter Lead and Chapter Ambassador](#12-chapter-teams-chapter-lead-and-chapter-ambassador)
13. [Sign-in codes, password reset and email delivery](#13-sign-in-codes-password-reset-and-email-delivery)

---

## 1. Platform Overview

**AI Risk Council (ARC)** is a professional membership platform for AI risk governance practitioners. It provides:
- A curated AI Risk Framework with downloadable playbooks
- Tech Social (the member feed) and knowledge sharing
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
  - `council_member` (Chapter Lead or Ambassador) → end of the current 18-month term, extended automatically
  - `professional` → 1 year from approval date

### Logout
Clears the `arc_token` cookie. No server-side session to invalidate.

---

## 4. User Roles & Permissions

A person is one of four things. The database stores a **role**, and for chapter teams a **tier**:

| Person | `users.role` | Tier (`chapter_lead_profiles.tier_code`) |
|---|---|---|
| Professional (Working Professional or Final-Year Undergraduate) | `professional` | none |
| **Chapter Ambassador** | `council_member` | `ambassador` |
| **Chapter Lead** | `council_member` | `lead` |
| Founding Member (admin) | `founding_member` | none |

The old name "Executive" (`executive` in very old data) is the Chapter Lead. A **Chapter Ambassador** is a volunteer who supports a chapter's Chapter Lead.

**Why the ambassador is a tier and not a new role.** Many controllers decide "team member vs admin" with `role === 'council_member'`. A new `users.role` value that missed one of those checks would fall through to admin behaviour. As a tier, an ambassador passes every existing team-member check unchanged, and only the few things that differ are checked by tier.

**Who may do what is decided in one place.** `Backend/utils/permissions.js` maps (role, tier) to a list of capabilities. `GET /api/auth/me` sends that list, and the frontend asks `useAuth().can('feed.post')` (or `userCan(user, 'feed.post')` for a user passed as a prop). Backend routes use `requireCapability(...)`. Never compare roles to decide a permission; add a capability instead.

| Capability | Professional (working) | Professional (final-year) | Chapter Ambassador | Chapter Lead | Founding Member |
|---|---|---|---|---|---|
| `resources.download`, `resources.upload` | yes | no | yes | yes | yes |
| `framework.download` | no | no | yes | yes | yes |
| `feed.post`, `blog.write`, `content.draft` | no | no | yes | yes | yes |
| `team.dashboard`, `leaderboard.view`, `admin.panel` | no | no | yes | yes | yes |
| `autonews.manage` (site-wide) | no | no | no | yes | yes |
| `team.manage` (decide ambassador applications, remove ambassadors) | no | no | no | yes | yes |
| `earnings.elect` (choose receive or waive) | no | no | no | yes | n/a |
| `team.apply` | yes | yes | no | no | n/a |
| `content.publish`, `resources.approve`, `admin.full` | no | no | no | no | yes |

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
| Tech Social | ✅ View only — ❌ Cannot post or vote |
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
| Tech Social — post, answer, vote | ✅ |
| Download resources (whitepapers, articles, tools) | ✅ |
| Upload resources | ✅ — requires admin approval before visible |
| AI Risk Framework — browse all content | ✅ |
| AI Risk Framework — download playbooks | ❌ Chapter team / Founding only |
| Certifications | ✅ Browse — completion flow not yet implemented |
| Voting (Awards/Nominations) | ✅ Can vote and gets email notification |
| User Dashboard | ✅ `/user/dashboard` |
| Profile management | ✅ `/profile` |
| Manage News / Events | ❌ |
| Admin Dashboard | ❌ |

---

### 4.3 Chapter Ambassador
Applies from `/membership` (or a chapter's page `/chapters/:slug`), choosing one chapter. The chapter's Chapter Lead decides the application; if the chapter has no lead, the administrators do (an administrator can always decide any application).

**Term:** same 18-month term mechanism as a lead, continuing automatically. No rates apply.

| Feature | Access |
|---|---|
| Everything a Professional can do | ✅ |
| Dashboard with quarterly goals (5 members, 1 podcast, 5-8 posts, 1 blog; 3 of 4 = met), referral code, team leaderboard | ✅ |
| Post on Tech Social, write blogs, request to host podcasts / workshops | ✅ |
| Draft events, news and workshops | ✅ (saved as drafts; an administrator publishes) |
| Download framework playbooks and resources, upload resources (pending approval) | ✅ |
| Admin Dashboard: Manage News, Manage Events, Manage Resources | ✅ (drafts and own items) |
| Automated News, approving ambassadors, Pending Resources, member approvals | ❌ |
| Revenue share, commission, workshop fees | ❌ (volunteer role) |
| Ask to become the Chapter Lead | ✅ (always decided by an administrator) |
| Listed on the public chapter page | ✅ (name, role, chapter; photo / organisation / LinkedIn / bio only if they opt in) |

### 4.4 Chapter Lead
One per chapter. Applies from `/membership`; approved by an administrator.

**Term:** 18 months, continues automatically. Revenue-share rates by term: 3% / 5% / 7%.

| Feature | Access |
|---|---|
| Everything a Chapter Ambassador can do | ✅ |
| Goals 20 members (the whole chapter's total), 3 podcasts, 10-15 posts, 3 blogs; 3 of 4 = met | ✅ |
| See and decide applications to join their chapter (restricted view: no email or phone) | ✅ (a decision is final unless an administrator changes it) |
| Remove an ambassador (reason recorded; the ambassador can appeal through the Contact page) | ✅ |
| Review their ambassadors' quarterly results | ✅ |
| Automated News management | ✅ |
| Choose to **receive** or **waive** earnings (revenue share 3/5/7%, 10% direct commission, workshop fees) | ✅ (their own choice; see section 12) |
| Approve members, manage users, publish content | ❌ Founding Member only |

### 4.5 Founding Member (Admin)
Manually created or promoted by another Founding Member in Admin Dashboard → Manage Users, or directly in the database. **Membership:** lifetime (`membership_expires_at = NULL`).

| Feature | Access |
|---|---|
| Everything a Chapter Lead can do | ✅ |
| Full Admin Dashboard, all tabs | ✅ |
| Approve / reject registrations and every kind of application | ✅ |
| Manage Chapter Teams: chapters, seats, leads, ambassadors, programme rules, term changes, requests, blogs, sessions | ✅ |
| Manage Users: edit anyone's profile, role, tier, chapter and term start in one atomic change, with a change history | ✅ |
| Hide a person from the public chapter pages; ask a lead to choose earnings again (never choose for them) | ✅ |
| Manage Team (About page), Awards & Nominees, Product Reviews, Framework content | ✅ |
| All site access | ✅ |

---

## 5. Membership Journey

### 5.1 Professional Registration
```
/register → fills form (name, email, password, org, country, optional referral code)
→ account created with status=pending, role=professional
→ Founding Member approves in Admin Dashboard → Member Approvals tab
→ On approval: status=approved, membership_expires_at = now + the complimentary period
→ User gets approval email
→ Can now log in
```

### 5.2 Joining a chapter team (Ambassador or Lead)
```
/membership → "Apply as Chapter Ambassador" or "Apply as Chapter Lead"
  (or a chapter page /chapters/:slug → Apply, which opens the same form with the chapter chosen)
→ 3-step form: role → about you (country, chapter, why) → confirm employer clearance + accept Privacy Policy and Terms
→ POST /api/membership/apply/council → membership_applications (requested_tier, kind='application', routed_to='lead' | 'admin')
→ Ambassador applications go to the chapter's Chapter Lead (routed_to='lead'); lead applications, and
  chapters with no lead, go to the administrators. An administrator can always decide any of them.
→ decideTeamApplication() (one code path for both deciders) → activateChapterLead() creates the profile,
  referral code and term, and the member's role becomes council_member
→ The applicant gets an email and a notification; the seat limit is enforced inside the transaction
```
An ambassador who wants to lead sends a **promotion request** (`POST /api/membership/apply/promotion`); it is always decided by an administrator, never by the lead.

### 5.3 Founding Member (No self-registration)
Founding Members are created manually by:
- An existing Founding Member via Admin Dashboard → Manage Users → Role and chapter
- Or directly in the database

---

## 6. Feature-by-Feature Documentation

---

### 6.1 Home Page (`/`)
- Hero section with CTA
- Platform stats
- Featured events preview
- Featured news preview
- Membership tier cards (Professional / Chapter Ambassador / Chapter Lead / Founding Member)
- Testimonials / highlights

---

### 6.2 Events & Workshops (`/events`)

**Public:** Everyone can view events.  
**Professional+:** Can register for events (login required).  
**Chapter team + Founding Member:** Can create, edit, publish/unpublish, and delete events.

**Event Categories:** Webinar, Seminar, Workshop, Podcast

**Features:**
- Filter by category (All / Webinar / Seminar / Workshop / Podcast)
- Filter by Upcoming / Past
- Search by title
- Event card shows: title, date, location, category badge, description
- **Register for Event:** Logged-in members fill a registration form (name, email, org, phone, notes, consent checkbox). On submit — confirmation email sent to registrant.
- **Add Event (Chapter team/Founding):** Modal form with title, date, location, category, description, link, banner image upload (Azure Blob), publish toggle
- **Edit/Delete:** Pencil and trash icons on cards (visible to Chapter team/Founding only)
- **Publish/Unpublish:** Toggle visibility on site

---

### 6.3 News (`/news`)

**Public:** Everyone can view published news.  
**Chapter team + Founding Member:** Can create, edit, publish/unpublish, and delete articles.

**Features:**
- News cards with title, summary, image, source, date, external link
- Filter: Manual news vs Automated (RSS-fetched) news
- **Add Article button** (visible to Chapter team/Founding): Opens modal with fields — title, summary, link, image URL, published toggle
- **Edit / Delete / Publish controls** on each card (Chapter team/Founding only)
- Automated news badge on RSS-fetched articles

---

### 6.4 Automated News Management (Admin Dashboard → Automated News tab)
Available to: **Chapter team + Founding Member**

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
**Chapter team + Founding Member:** Can download PDF playbooks.  
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
**Professional + Chapter team + Founding Member:** Can download resources + upload new ones.  
**Professional uploads:** Go to `status=pending` — require Founding Member or chapter team approval.  
**Chapter team + Founding Member uploads:** Auto-approved (`status=approved`), immediately visible.

**Resource Types:** Framework, Whitepaper, Product, Video, Article, Tool, News

**Features:**
- Filter by type
- Search by title/description
- Download button (authenticated members only)
- Upload form: title, description, abstract, file upload (Azure Blob), type selection, demo URL
- **Admin-only types** (framework, news, homepage_video): Only Chapter team/Founding can upload these
- Pending Resources tab in Admin Dashboard for Founding Member / chapter team to approve/reject

---

### 6.7 Tech Social (`/community-qna`; formerly the Community Feed, and before that Community Q&A)

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
   - Manage News → `/news` (Chapter team/Founding)
   - Manage Events → `/events` (Chapter team/Founding)
   - Manage Auto-News → `/admin-dashboard?tab=auto_news` (Chapter team/Founding)
   - Approve Resources → `/admin-dashboard?tab=pending_resources` (Chapter team/Founding)
   - Approve Members → `/admin-dashboard?tab=pending` (Founding only — shown as locked to the chapter team)
   - Manage Awards → `/admin-dashboard?tab=nominations` (Founding only — shown as locked to the chapter team)
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
| Chapter Ambassador / Chapter Lead | Free (application-based) | 18-month terms, continuing | Apply on `/membership` |
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
- Tech Social

---

### 6.16 Contact (`/contact`)
Static contact form (email submission).

---

## 7. Admin Dashboard

**URL:** `/admin-dashboard`  
**Access:** Chapter team (Lead or Ambassador, a limited panel) + Founding Member  
**Route guard:** `AdminRoute` component, which redirects everyone else to `/`

### Tab Visibility by Role

The tab list comes from `tabsFor(user, can)` in `AdminDashboard.jsx`: founding members see every tab; the chapter team sees only `news`, `events`, `resources`, plus `auto_news` when they hold the `autonews.manage` capability (leads). A tab named in the URL that a user may not see falls back to the first tab they may see.

| Tab | Chapter Ambassador | Chapter Lead | Founding Member |
|---|---|---|---|
| Member Approvals (registrations and all applications) | ❌ | ❌ | ✅ |
| Pending Resources | ❌ | ❌ | ✅ |
| Manage News | ✅ drafts | ✅ drafts | ✅ |
| Automated News | ❌ | ✅ | ✅ |
| Manage Events | ✅ drafts | ✅ drafts | ✅ |
| Exec Workshops | ❌ | ❌ | ✅ |
| **Chapter Teams** | ❌ | ❌ | ✅ |
| Manage Team (About page) | ❌ | ❌ | ✅ |
| Manage Resources | ✅ | ✅ | ✅ |
| Product Reviews, Nominations, Framework Content, Contact Messages | ❌ | ❌ | ✅ |
| Manage Users (`/admin-dashboard/users`) | ❌ | ❌ | ✅ |

(Before this change the chapter team's dashboard opened on Pending Resources, an admin-only list, and showed an access-denied error. It now opens on Manage News.)

### Chapter Teams tab (Founding Member)
Sections: **Chapter teams** (everyone with tier, chapter, goals, standing and earnings choice; filters for role, status and search; a banner for chapters without a lead), Host requests, Blog review, Sessions, **Chapters** (lead, ambassadors, seats, applications waiting; "Team" opens one chapter's whole team and lets you make an ambassador the lead when the seat is empty), Term changes, **Programme rules** (goals and seat limit per tier; every save is a new dated version), **Tour video** (the one video every Chapter Lead and Chapter Ambassador sees at the top of their dashboard: paste a YouTube or Vimeo link, a direct .mp4/.webm link, or upload a file up to 100 MB; a live preview shows exactly what they see; setting a new video asks everyone to watch it again), **Outreach kit** (the words of the invitation messages on their dashboard; see "The outreach kit" below).

### Manage Users (Founding Member)
List with role, tier and chapter filters. **Manage user** edits profile, role, tier, chapter and term start in one transaction (`PATCH /api/admin/users/:id`), and shows the person's change history (`GET /api/admin/users/:id/audit`). Only the fields you changed are sent. The person is told what changed; an email change signs them out everywhere and warns the old address; changes to a founding member's email, role or password alert the other founding members.

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
- Lists all pending membership upgrade applications (applications to join a chapter team (Ambassador or Lead))
- Actions: Approve / Reject with optional admin notes
- On approval: role updated, membership_expires_at set, approval email sent

#### Pending Resources (Founding Member only)
- Lists all resources with `status=pending` uploaded by Professional members
- Actions: Approve (makes visible to all) / Reject
- Shows uploader name, resource type, title, description

#### Manage News (chapter team: drafts; Founding Member: publishes)
- Full CRUD for manual news articles
- Create: title, summary, link, image URL, publish toggle
- Edit / Delete / Publish toggle on each article

#### Automated News (Chapter Lead + Founding Member)
- Manage RSS-fetched articles
- Pending / Approved / Rejected filter
- Approve / Reject / Bulk operations
- Toggle publish / trending status
- Manual fetch trigger
- Fetch statistics

#### Manage Events (chapter team: drafts; Founding Member: publishes)
- Full CRUD for events
- Create/edit: title, date, location, category, description, link, banner image, publish toggle
- View registrations per event

#### Manage Team (Founding Member)
- Add / edit / remove team members shown on `/about` page
- Fields: name, role/title, bio, photo (Azure Blob), LinkedIn URL, display order

#### Manage Resources (chapter team + Founding Member)
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
| `/chapters` | Chapters | Every active chapter, its lead and ambassadors, seats left |
| `/chapters/:slug` | Chapter page | Public team page and the Apply button |
| `/events` | Events | Role-gated UI |
| `/services` | Services | |
| `/framework` | AI Risk Framework | Download gated to Chapter team+ |
| `/resources` | Resources | Download/upload gated |
| `/certification` | Certifications | Browse only |
| `/community-qna` | Tech Social | Post/vote requires login |
| `/community-qna/:id` | Q&A Detail | |
| `/news` | News | Write access gated to Chapter team+ |
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
| `/executive-checkout` | Legacy Chapter Lead checkout page |
| `/profile` | Profile Edit |
| `/user/dashboard` | User Dashboard |

### Admin Routes (Chapter team or Founding Member only)
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
| `membership_applications` | Chapter team/Founding upgrade applications |
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

## 12. Chapter teams: Chapter Lead and Chapter Ambassador

Every chapter has one **Chapter Lead** and up to a set number of **Chapter Ambassadors** (`council_member`, tier `lead` or `ambassador`). Both have quarterly goals, a personal dashboard and a referral code. Only a Chapter Lead can have earnings. Rules live in the database (`chapter_lead_policy` + `chapter_lead_policy_targets`) and are editable by admins; the numbers below are the launch defaults.

### Rules (defaults)
| Item | Chapter Lead | Chapter Ambassador |
|---|---|---|
| Quarterly goals | 20 new members (whole chapter's total), 3 podcasts, 10-15 posts, 3 blogs | 5 members, 1 podcast, 5-8 posts, 1 blog |
| A quarter is "met" | at least 3 of the 4 goals | at least 3 of the 4 goals |
| Removal review | 3 consecutive missed quarters; an admin decides | same; reviewed by their Chapter Lead first (admins if the chapter has no lead) |
| Seats per chapter | exactly 1 | 10 (a limit per policy version; admins can override; lowering it never removes anyone) |
| Quarters | Calendar quarters (UTC). The first part-quarter is not scored. | same |
| Term | 18 months, continues automatically | same |
| Revenue share | Term 1: 3%, Term 2: 5%, Term 3+: 7% (only if they choose to receive) | none |
| Direct commission | 10% on value they bring in directly | none |

**Company rule (do not change without the company's say-so):** a Chapter Lead gets the *area share only*, not the 10% direct commission, on members brought in with an ambassador's code. Those members still count towards the chapter total and the lead's member goal.

### What counts
- **Members:** referred sign-ups once an admin approves them (`referrals.qualified_at` in the quarter). A lead's member goal counts the whole chapter; an ambassador's counts their own.
- **Podcasts:** published podcast, the person is a host, an admin marked it conducted (`events.conducted_at`).
- **Posts:** the person's visible feed posts of type general / ai_product / event / troubleshooting (memes and polls excluded; credit stops at the maximum).
- **Blogs:** `blog_posts` published in the quarter.

### Earnings: receive or waive
- The reason this exists: some people cannot take paid outside work because of an employment contract (moonlighting / outside-activity / conflict-of-interest clauses). Even an unpaid role can need the employer's approval.
- **Everyone** (ambassadors included) confirms they checked their employment terms when they apply (`membership_applications.employer_confirmed_at`, and an `earnings_elections` row). A lead then chooses **receive** or **waive**. The choice is the person's own: an admin can only *reset* it (the person must choose again), never set it.
- `earnings_elections` is append-only. "Receive" requires employer confirmation (a database CHECK enforces this). The first choice applies immediately; a later change applies from the next term boundary, going forward only. Waived amounts are not accrued.
- Nothing is payable until the payment gateway exists. The checkpoint that asks existing leads to choose is behind `EARNINGS_GATE=on` (`Backend/utils/featureFlags.js`), to be switched on only after counsel approves the wording.

### Hierarchy and approvals
- Ambassador applications are routed to their chapter's Chapter Lead (`routed_to = 'lead'`), or to the administrators when the chapter has no lead. The lead's decision stands, but an administrator can decide any application, add, move or remove anyone, and override the seat limit. The first decision wins and every decision is logged.
- A lead can remove an ambassador with a recorded reason; the ambassador is notified and can appeal through a prefilled Contact message.
- When a chapter loses its lead (role ended, account deleted, admin change), all founding members are notified (`chapterNotices.js`), and reminded every 30 days while ambassadors or applications are waiting. The told/reminded state is recorded in `audit_log`, so alerts are not repeated.
- Promotion: an ambassador may *request* to lead; an administrator decides. Promoting ends the ambassador stint and opens a lead stint with a new term clock (`predecessor_profile_id` links them). Demotion keeps tenure.

### Public pages, leaderboard and privacy
- `/chapters` and `/chapters/:slug` list each chapter's lead and ambassadors and the seats left. Name, role and chapter are always shown while active (disclosed in the Terms); photo, organisation (off by default), LinkedIn and bio are opt-in (`member_display_settings`). An administrator can hide anyone.
- Dashboard → **Leaderboard** shows a team board and a chapters board (score = average of the four goal percentages, each capped at 100% against the person's own targets) and a **contribution breakdown** (who contributed what). Visible to the team and admins only; a person can opt out and shows as "Hidden member".
- A lead sees applicants' name, job title, organisation, LinkedIn, country, member-since, their answers and whether they confirmed employer clearance, but never email or phone.
- `audit_log` records approvals, role and tier changes, removals, password resets, earnings choices and admin edits (who, what, when, before and after). Deleting an account keeps the entry but erases personal data and the IP address.

### Where things are
- Pure rules (terms, quarters, goals, tiers): `Backend/utils/chapterLeadRules.js`. Capabilities: `Backend/utils/permissions.js`.
- Core service (the one place that promotes, moves or ends a seat): `Backend/services/chapterLeadService.js`. Team workflow: `chapterTeamService.js`. Earnings choice: `earningsElectionService.js`. Board: `leaderboardService.js`. Public pages: `publicChapterService.js`. Admin edits: `adminUserService.js`. Audit: `auditService.js`. Alerts: `chapterNotices.js`.
- Member API: `/api/chapter-lead/*`; admin API: `/api/admin/chapter-leads/*`; admin users `/api/admin/users/*`; applications `/api/membership/*`; chapters (public) `/api/chapters/*`; blogs `/api/blogs`; views `/api/views`.
- Daily job: `Backend/jobs/chapterLeadJob.js` (01:00 UTC): rolls terms over, closes finished quarters, sends nudges, raises chapter-vacancy alerts, tops up referral codes. Idempotent; admins can run it from the Chapter Teams tab.
- Frontend: one member dashboard at `/user/dashboard`. The team's layout is `components/team/TeamDashboard.jsx` (see "The team dashboard" below); everyone else keeps the sidebar layout. Tabs: Overview / My team (leads) / Content performance / Referrals / Host requests / Leaderboard / Quarter history / Settings; `?tab=` deep-links. Role names and colours: `frontend/src/config/roles.js`. Shared UI: `components/ui/kit.jsx`.

### The team dashboard
Laid out top to bottom in full-width rows, so nothing sits beside a long sidebar:
1. **Referral code** (large, with Copy code, Copy link, system share, and how many joined, were counted and are waiting), with **Invite someone** directly under the code (ready-made messages, see "The outreach kit" below). Beside it, the **tour video** (set by an admin; click-to-play, so nothing is fetched from YouTube or Vimeo until pressed) and the **Your chapter** card (chapter, seats or lead, term end, links to the public page and the profile).
2. **Get started**: a strip of tiles, one per first step, with a progress bar, each ticked from something real (a referral joined, a post published, a choice saved) or from a small memory in the browser ("watched the tour", "invited someone"). Leads also see "choose receive or waive". It folds away when all are done.
3. (The chapter card is in row 1, under the video.)
4. **Current quarter** with what is left to do, then the four goals.
5. **Tabs.** Overview is "What you can do" tiles (only what the person's capabilities allow), then events, posts, messages, stats and registrations in balanced pairs. **Settings** holds the account details, the earnings choice (leads), the promotion request (ambassadors), what the public chapter page shows, the programme rules and quick links.
On a phone the order is referral and invite, video, chapter, checklist, quarter, tabs. The payload comes from `GET /api/chapter-lead/dashboard`, which now also carries `tour`, `referrals` (joined / counted / waiting) and `setup` (has posted, has chosen what shows publicly). `services/portalService.js` builds them; a failure in any of the three never takes the dashboard down.

### The outreach kit
"Invite someone" sits inside the referral card. A Chapter Lead or Ambassador picks the kind of message (first message: LinkedIn request, LinkedIn message, WhatsApp, email; announce: LinkedIn post, WhatsApp group; follow up: three reminders, email reminder, "said yes", welcome; quick answers), who it is for (a vendor or a tech enthusiast), types the recipient's first name (and company or topic where the message needs one), reads the preview (editable), and copies it or opens WhatsApp, email or LinkedIn with it. Their name, role, chapter, referral code and sign-up link (`/register?ref=CODE`, which already carries the code) are filled in. What they type never leaves the browser, and copying or opening one counts as "invited someone" for the Get started tile.
- **Where the words live.** The defaults are in `Backend/utils/outreachKitDefaults.js`. An administrator edits them under Admin > Chapter Leads > **Outreach kit**: each message, and the shared sentences that many messages use ("who you are", "what a member gets", "how to sign up" and so on), with a live preview as a Chapter Lead or an Ambassador, a vendor or an enthusiast. Only what differs from the default is stored, as JSON in `app_settings` under the key `outreach_kit` (no new table, no migration), so anything nobody edited follows the latest default. Each save is written to the audit log.
- **What is checked on save** (`Backend/utils/outreachKitRules.js`): every `{{placeholder}}` must exist; a shared sentence cannot contain another; a message that brings people to the site must keep `{{link}}` (or `{{signup}}`); lengths are capped; two administrators saving at once get a "reload" message instead of overwriting each other.
- **Endpoints.** Members: `GET /api/chapter-lead/outreach-kit`. Admins: `GET | PUT | DELETE /api/admin/chapter-leads/outreach-kit` (PUT sends only the differences; DELETE puts everything back).
- **Facts the default wording relies on** (re-check them if the product changes): the sign-up link pre-fills the referral code; new accounts wait for an administrator's approval and then get an email; membership is free for the first year (as the sign-up page says); members download resources but not the Framework playbooks; vendors post an "AI Product Showcase" and members can react "Need a POC"; there are no chats, and Tech Social is not split by chapter. No earnings or commission wording is included while the earnings gate is off; leads who choose to receive earnings may need a disclosure line once it is on (ask counsel).

### Behaviour worth knowing
- Every route to "becomes a team member" (application approval, user approval, role change, admin-created user) goes through `activateChapterLead()`, so the profile, referral code and term are always created. A person's referral code belongs to the *person* (`users.referral_code`) and survives a promotion.
- Roles are re-read from the database on every request (`middleware/auth.js`), so ending a seat (or deleting an account) takes effect immediately, not when the 7-day token expires.
- Applying requires ticking the Privacy Policy + Terms box; acceptance is stored per version in `policy_acceptances`. Bump `POLICY_VERSION` in `chapterLeadRules.js` (and the dates on /privacy and /terms) to make every active team member accept again at next login. **Do not bump it, or switch on `EARNINGS_GATE`, until counsel has approved the Ambassador, waiver and employer-clearance wording.**
- Sign-up requires a country. A referral code can be supplied by link (`/register?ref=RAC-XXXXXX`), by typing it, or through LinkedIn sign-up.
- Deleting an account stays immediate. The seat ends, the code stops working, and referral / quarter / consent records are kept in anonymised form (IP address erased; posts read "Former Chapter Lead" or "Former Chapter Ambassador").
- `DEBUG_AUTH=on` turns on verbose session logging in the auth middleware; it is off by default.
- Database session time zone is assumed to be UTC (the Azure default); quarter windows are UTC.

### Database (migrations 0019 to 0024)
`0019` and `0020` created the Chapter Lead programme. **`0022_chapter_team_foundation.sql`** is additive and safe to re-run: `team_tiers`, `tier_code` / `approved_by` / `predecessor_profile_id` on `chapter_lead_profiles`, the unique-lead-per-chapter index now lead-only (same name, `uq_clp_one_active_per_chapter`), `chapter_lead_policy_targets` (goals and seat cap per tier), `earnings_elections`, `audit_log`, application columns (tier, kind, routing, decision), `users.referral_code`, `referrals.referrer_profile_id`, `member_display_settings`, `chapters.slug`, and the view `chapter_team_summary`. **`0023_chapter_team_backfill.sql`** fills those from existing data (idempotent). **`0024_app_settings.sql`** adds `app_settings` (key, JSON value, who and when), used for the tour video (key `team_tour`) and the outreach kit wording (key `outreach_kit`); until it is applied the dashboard simply shows no video, and saving one from the admin screen would fail, so run it before using that screen (the invitation messages simply show the default wording). The old target columns on `chapter_lead_policy` are kept for now; a later "contract" migration can drop them once nothing reads them.

### Not built yet (deliberately)
Revenue ledger, earnings accrual and payouts wait for the payment gateway. Lead publishing of content (admins still publish everything), waitlists beyond routing applications to the administrators, and a different seat limit for one chapter (admins can still allow an extra ambassador case by case with the "allow this even if the chapter is at its limit" option).

### Deploying this change (order matters)
1. Run migrations **before** deploying the new backend: `npm run db:migrate` in `Backend/` applies 0022, 0023 and 0024. All are idempotent. Some queries (Manage Users list, pending resources, the feed's `author_tier`) read `tier_code`, so deploying the backend first would error.
2. Deploy backend and frontend together.
3. Admin Dashboard → Chapter Teams → Chapters: assign each existing lead (the 16 leads had no chapter) to a chapter. Where two share a chapter, one stays lead and the other is moved to Ambassador with their consent (Manage Users → Role and chapter).
4. Existing leads see the "accept updated terms" prompt only after `POLICY_VERSION` is bumped, and the earnings prompt only after `EARNINGS_GATE=on`. Both wait for counsel.
5. Known drift to check on the live database: the repo's migrations do not create `notifications.is_immediate / push_sent / push_sent_at`, `users.linkedin_access_token` or `feed_comments.is_hidden`, yet the code uses them. The live database has them; a database built only from the migrations folder does not.

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

---

## 14. AI Learning Agents (the robots)

The five Learning Agents (NIST AI RMF, EU AI Act, ISO/IEC 42001, RBI FREE-AI, AI Risk Bridge Model) are small 3D robots.
They appear in a row on the Framework page and each has its own page, `/agents/<slug>`, where the robot performs on a set
that explains its framework. The pages still say "Coming soon" for the quizzes themselves.

**Where things live** — `frontend/src/components/agents/robot/`:

| File | What it does |
|---|---|
| `../../config/agents.js` | The five agents: name, slug, colourway (`finish`), set (`scene`), tagline, facts and voice pitch |
| `engine.js` | The animation brain. One shared frame loop, springs for every joint, scripts as async functions (`walkTo`, `say`, `hello`, `spin` ...). Runs only while a robot is on screen |
| `three/model.js` | The robot itself, built from primitives (no model files to download) |
| `three/runtime.js` | One transparent WebGL canvas per row or stage; draws only when something moved. Loaded on demand with three.js |
| `layout.js` | The geometry of the stage: the board on a screen in the middle, a pad for the robot at each side. The robot explains from whichever side is nearer the point and walks across the floor between points, so at rest it is never in front of the board |
| `scenes/*.jsx` | One set per agent: the board (SVG) and the script the robot performs on it. `scenes/helpers.js` has the shared moves (walk to a side, point at something with the nearer arm, throw a block at the board, relax) |
| `AgentHeroStage.jsx` / `SceneShell.jsx` | The stage on an agent page: set, effects, status bar, subtitles, "Ask me" buttons |
| `AgentLauncher.jsx` | The row on the Framework page (and the other-agents strip). Puts on a short show by itself |
| `voice.js` | Reads the robot's lines aloud with the browser's built-in speech: ranks the voices (natural ones first), speaks phrase by phrase, on/off button and a voice picker, both remembered per browser |

**Behaviour to know about**
- Nothing runs off screen: the loop, the 3D drawing and the robot's own timers all pause when the stage or row is not visible.
- With `prefers-reduced-motion`, or a browser without WebGL, the robot is not drawn and the page shows the finished set with the
  facts as plain text.
- Voice is spoken only after the visitor has interacted with the page (a browser rule). Every spoken line is also shown as a subtitle.
  How natural it sounds depends on the voices installed on the visitor's device (Edge's "Natural" voices and Chrome's Google voices are the best); the picker next to "Voice on" lets them choose.
- The `facts` and the lines in `scenes/*.jsx` are plain-language summaries of each framework; have them reviewed against the
  source documents before the agents go live (the RBI FREE-AI lines in particular).
- Adding a sixth agent: add an entry to `config/agents.js`, a `scenes/<Name>Scene.jsx` (copy the closest one), and pick a finish
  from `finishes.js`.
