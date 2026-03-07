import 'dotenv/config';
import fs from 'fs';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import morgan from 'morgan';

// ─── Env Validation ───────────────────────────────────────────────────────────
const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
required.forEach((key) => {
    if (!process.env[key]) {
        console.error(`❌ Missing required environment variable: ${key}`);
        process.exit(1);
    }
});

// ─── Auto-create uploads directory ───────────────────────────────────────────
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads', { recursive: true });
    console.log('📁 Created uploads/ directory');
}

// ─── Route Imports ────────────────────────────────────────────────────────────
import authRoutes from './routes/auth.js';
import eventsRoutes from './routes/events.js';
import resourcesRoutes from './routes/resources.js';
import teamRoutes from './routes/team.js';
import qnaRoutes from './routes/qna.js';
import newsRoutes from './routes/news.js';
import adminRoutes from './routes/Admin.js';
import profileRoutes from './routes/profile.js';
import waitlistRoutes from './routes/waitlist.js';
import productReviewsRoutes from './routes/productReviews.js';
import nominationsRoutes from './routes/nominations.js';
import frameworkRoutes from './routes/framework.js';
import autoNewsRoutes from './routes/autoNews.js';

// ─── Automated News Cron Job ──────────────────────────────────────────────────
import { initNewsFetchCron } from './jobs/newsFetchJob.js';

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());

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

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// NOTE: uploads/ is NOT served as static.
// All file downloads go through /api/resources/:id/download with RBAC.

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 attempts per window (was 10)
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
app.use('/api/admin', adminRoutes);
app.use('/api/admin/auto-news', autoNewsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/product-reviews', productReviewsRoutes);
app.use('/api/nominations', nominationsRoutes);
app.use('/api/framework', frameworkRoutes);

// Serve event banner images publicly (safe — only images, no sensitive files)
app.use('/uploads/events', express.static('./uploads/events'));
// Serve product media and evidence files publicly
app.use('/uploads/products', express.static('./uploads/products'));
// Serve nominee photos publicly
app.use('/uploads/nominees', express.static('./uploads/nominees'));
// Serve framework template files publicly
app.use('/uploads/framework', express.static('./uploads/framework'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

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
});
