import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import morgan from 'morgan';
import passport from './middleware/passport.js';
import session from 'express-session'; 

// ─── Env Validation ───────────────────────────────────────────────────────────
const required = [
    'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET',
    'AZURE_STORAGE_ACCOUNT_NAME', 'AZURE_STORAGE_ACCOUNT_KEY', 'AZURE_STORAGE_CONTAINER_NAME',
];
required.forEach((key) => {
    if (!process.env[key]) {
        console.warn(`⚠️  Missing environment variable: ${key}`);
    }
});

// Email service — optional but recommended for production
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.info('📧  Email service: SMTP configured —', process.env.SMTP_HOST);
} else {
    console.warn('⚠️  Email service: SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS to enable emails)');
}

// Files are now stored in Azure Blob Storage — no local uploads/ directory needed.

// ─── Route Imports ────────────────────────────────────────────────────────────
import authRoutes from './routes/auth.js';
import eventsRoutes from './routes/events.js';
import resourcesRoutes from './routes/resources.js';
import teamRoutes from './routes/team.js';
import qnaRoutes from './routes/qna.js';
import newsRoutes from './routes/news.js';
import adminRoutes from './routes/Admin.js';
import profileRoutes from './routes/profile.js';
import productReviewsRoutes from './routes/productReviews.js';
import nominationsRoutes from './routes/nominations.js';
import frameworkRoutes from './routes/framework.js';
import autoNewsRoutes from './routes/autoNews.js';
import membershipRoutes from './routes/membership.js';

// ─── Automated News Cron Job ──────────────────────────────────────────────────
import { initNewsFetchCron } from './jobs/newsFetchJob.js';
// ─── Membership Expiry Cron Job ───────────────────────────────────────────────
import { initMembershipExpiryCron } from './jobs/membershipExpiryJob.js';

// ─── Serve React Frontend in Production ──────────────────────────────────────
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// ─── Trust Azure App Service Proxy ───────────────────────────────────────────
// Without this, express-rate-limit sees the load balancer IP for ALL users
// instead of the real client IP from X-Forwarded-For header.
app.set('trust proxy', 1);

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc:     ["'self'"],
            scriptSrc:      ["'self'", "'unsafe-inline'", "'unsafe-eval'",
                             "https://www.google.com", "https://www.gstatic.com"],
            styleSrc:       ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc:        ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc:         ["'self'", "data:", "blob:", "https:", "http:"],
            // Allow media (video/audio) from Azure Blob, YouTube, Vimeo and self
            mediaSrc:       ["'self'", "blob:", "https:", "http:",
                             "https://*.blob.core.windows.net",
                             "https://www.youtube.com", "https://player.vimeo.com"],
            frameSrc:       ["'self'", "https://www.google.com",
                             "https://www.youtube.com", "https://player.vimeo.com",
                             "https://www.recaptcha.net"],
            connectSrc:     ["'self'", "https:", "wss:"],
            objectSrc:      ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false, // required for Azure Blob media cross-origin
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigin = (origin, callback) => {
    // In development allow any localhost port; in production use FRONTEND_URL only
    if (!origin) return callback(null, true); // same-origin / curl / Postman
    const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin);
    if (isLocalhost && process.env.NODE_ENV !== 'production') return callback(null, true);
    if (origin === process.env.FRONTEND_URL) return callback(null, true);
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
};

app.use(cors({
    origin: allowedOrigin,
    credentials: true,
}));

// ─── Request Logger (dev only) ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

app.use(session({
    secret: process.env.JWT_SECRET,   // reuse your existing secret
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 5 * 60 * 1000,   // 5 minutes — only needed during OAuth handshake
    },
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

// NOTE: uploads/ is NOT served as static.
// All file downloads go through /api/resources/:id/download with RBAC.

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,                  // 300 requests per IP per 15 min — enough for normal usage
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                   // strict: 20 login attempts per IP per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

app.use(generalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/qna', qnaRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/admin/auto-news', autoNewsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/product-reviews', productReviewsRoutes);
app.use('/api/nominations', nominationsRoutes);
app.use('/api/framework', frameworkRoutes);
app.use('/api/membership', membershipRoutes);

// All file assets are now served directly from Azure Blob Storage URLs stored in the DB.
// No static /uploads/* routes needed.

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});


if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'An unexpected internal server error occurred.',
    });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 ARC Backend running on http://localhost:${PORT}`);

    // Initialize automated news fetching cron job
    initNewsFetchCron();
    console.log('📰 Automated news fetching initialized');

    // Initialize membership expiry email notifications
    initMembershipExpiryCron();
    console.log('📅 Membership expiry check initialized');
});
