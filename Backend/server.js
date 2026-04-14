import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import morgan from 'morgan';
import passport from './middleware/passport.js';
import session from 'express-session';
import notificationsRoutes from './routes/notifications-route.js';
import { initNotificationDigestCron } from './jobs/notificationDigestJob.js';
import { initFeedScoreCron }       from './jobs/feedScoreJob.js';
import { initFeedLikeDigestCron }  from './jobs/feedLikeDigestJob.js';

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

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.info('📧  Email service: SMTP configured —', process.env.SMTP_HOST);
} else {
    console.warn('⚠️  Email service: SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS to enable emails)');
}

// ─── Route Imports ────────────────────────────────────────────────────────────
import authRoutes         from './routes/auth.js';
import eventsRoutes       from './routes/events.js';
import resourcesRoutes    from './routes/resources.js';
import teamRoutes         from './routes/team.js';
import qnaRoutes          from './routes/qna.js';
import newsRoutes         from './routes/news.js';
import adminRoutes        from './routes/Admin.js';
import profileRoutes      from './routes/profile.js';
import productReviewsRoutes from './routes/productReviews.js';
import nominationsRoutes  from './routes/nominations.js';
import frameworkRoutes    from './routes/framework.js';
import autoNewsRoutes     from './routes/autoNews.js';
import membershipRoutes   from './routes/membership.js';
import workshopsRoutes    from './routes/workshops.js';

// ─── Cron Job Imports ─────────────────────────────────────────────────────────
import { initNewsFetchCron }        from './jobs/newsFetchJob.js';
import { initMembershipExpiryCron } from './jobs/membershipExpiryJob.js';

// ─── Serve React Frontend in Production ──────────────────────────────────────
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

app.set('trust proxy', 1);

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'",
                         "https://www.google.com", "https://www.gstatic.com"],
            styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc:    ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc:     ["'self'", "data:", "blob:", "https:", "http:"],
            mediaSrc:   ["'self'", "blob:", "https:", "http:",
                         "https://*.blob.core.windows.net",
                         "https://www.youtube.com", "https://player.vimeo.com"],
            frameSrc:   ["'self'", "https://www.google.com",
                         "https://www.youtube.com", "https://player.vimeo.com",
                         "https://www.recaptcha.net"],
            connectSrc: ["'self'", "https:", "wss:"],
            objectSrc:  ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigin = (origin, callback) => {
    if (!origin) return callback(null, true);
    const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin);
    if (isLocalhost && process.env.NODE_ENV !== 'production') return callback(null, true);
    if (origin === process.env.FRONTEND_URL) return callback(null, true);
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
};

app.use(cors({ origin: allowedOrigin, credentials: true }));

if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

app.use(session({
    secret:            process.env.JWT_SECRET,
    resave:            false,
    saveUninitialized: false,
    cookie: {
        secure:   process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge:   5 * 60 * 1000,
    },
}));

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
    windowMs:       15 * 60 * 1000,
    max:            300,
    standardHeaders: true,
    legacyHeaders:  false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
    windowMs:       15 * 60 * 1000,
    max:            20,
    standardHeaders: true,
    legacyHeaders:  false,
    message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

app.use(generalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',            authLimiter, authRoutes);
app.use('/api/events',          eventsRoutes);
app.use('/api/resources',       resourcesRoutes);
app.use('/api/team',            teamRoutes);
app.use('/api/qna',             qnaRoutes);          // ← feed routes (repurposed)
app.use('/api/news',            newsRoutes);
app.use('/api/admin/auto-news', autoNewsRoutes);
app.use('/api/admin',           adminRoutes);
app.use('/api/profile',         profileRoutes);
app.use('/api/product-reviews', productReviewsRoutes);
app.use('/api/nominations',     nominationsRoutes);
app.use('/api/framework',       frameworkRoutes);
app.use('/api/membership',      membershipRoutes);
app.use('/api/workshops',       workshopsRoutes);
app.use('/api/notifications',   notificationsRoutes);

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

    initNewsFetchCron();
    console.log('📰 Automated news fetching initialized');

    initMembershipExpiryCron();
    console.log('📅 Membership expiry check initialized');

    initNotificationDigestCron();
    console.log('🔔 Notification digest cron initialized');

    initFeedScoreCron();
    console.log('📊 Feed score recalculation cron initialized');

    initFeedLikeDigestCron();
    console.log('❤️  Feed like digest cron initialized');
});