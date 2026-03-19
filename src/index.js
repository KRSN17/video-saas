require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/video');
const mergeRoutes = require('./routes/merge');
const creditRoutes = require('./routes/credits');
const adminRoutes = require('./routes/admin');
const pageRoutes = require('./routes/pages');

const app = express();
const PORT = process.env.PORT || 3001;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/merge', mergeRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/admin', adminRoutes);

// Page Routes
app.use('/', pageRoutes);

app.listen(PORT, () => {
  console.log(`Video SaaS running at http://localhost:${PORT}`);
});
