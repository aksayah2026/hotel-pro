require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const roomTypeRoutes = require('./routes/roomType.routes');
const amenityRoutes = require('./routes/amenity.routes');
const bookingRoutes = require('./routes/booking.routes');
const paymentRoutes = require('./routes/payment.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const tenantRoutes = require('./routes/tenant.routes');
const auditLogRoutes = require('./routes/auditLog.routes');
const saasPaymentRoutes = require('./routes/saasPayment.routes');
const notificationRoutes = require('./routes/notification.routes');
const planRoutes = require('./routes/plan.routes');

require('./utils/cron'); // Initialize cron jobs

const { errorHandler } = require('./middleware/error.middleware');
const { authenticate, checkReadOnly } = require('./middleware/auth.middleware');
const { checkSubscription } = require('./middleware/subscription.middleware');
const { requireSuperAdmin } = require('./middleware/role.middleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Dynamic CORS handling for development, emulators, and production dashboard
const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:8081", 
  "http://192.168.0.114:8081", 
  "http://192.168.0.112:8081",
  "https://admin.hotelpro.aksayah.com"
];

const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow native mobile apps/non-browser clients (which don't send an Origin header)
    if (!origin) return callback(null, true);
    
    // 2. Allow official origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // 3. Dynamically allow any local network origin in development for physical device/emulator testing
    const isLocalNetwork = origin.startsWith('http://localhost') || 
                          origin.startsWith('http://127.0.0.1') || 
                          /^http:\/\/192\.168\.\d+\.\d+/.test(origin) ||
                          /^http:\/\/10\.0\.\d+\.\d+/.test(origin);
                          
    if (isLocalNetwork) {
      return callback(null, true);
    }
    
    // 4. Reject other origins in production for security
    if (process.env.NODE_ENV === 'production') {
      return callback(new Error('Not allowed by CORS'), false);
    }
    
    // Default to allow during development
    return callback(null, true);
  },
  credentials: true, 
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "CSRF-Token"] 
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(helmet());

// API Response Time Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} - ${duration}ms`);
  });
  next();
});

// BUG-008: CSRF Protection with Production-Ready Cookie Config
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true for HTTPS in production
    sameSite: 'none' // required for cross-domain cookies
  } 
});

app.use((req, res, next) => {
  // Skip CSRF for mobile app (token-based) or login fallback if needed
  if (req.headers.authorization || req.path === '/api/auth/login') return next();
  
  csrfProtection(req, res, next);
}); 

// BUG-013: Static files
app.use(express.static("public"));

// Static files (aadhaar uploads)
app.use('/uploads', express.static(uploadDir));

// Public Routes
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
app.use('/api/auth', authRoutes);

// Tenant Management (Super Admin) - BUG-001: Protect routes
app.use('/api/tenants', authenticate, requireSuperAdmin, tenantRoutes);
app.use('/api/plans', authenticate, requireSuperAdmin, planRoutes);
app.use('/api/audit-logs', authenticate, requireSuperAdmin, auditLogRoutes);
app.use('/api/saas-payments', authenticate, requireSuperAdmin, saasPaymentRoutes);

// Protected Routes with Subscription & Read-Only Check
app.use('/api/rooms', authenticate, checkSubscription, checkReadOnly, roomRoutes);
app.use('/api/room-types', authenticate, checkSubscription, checkReadOnly, roomTypeRoutes);
app.use('/api/amenities', authenticate, checkSubscription, checkReadOnly, amenityRoutes);
app.use('/api/bookings', authenticate, checkSubscription, checkReadOnly, bookingRoutes);
app.use('/api/payments', authenticate, checkSubscription, checkReadOnly, paymentRoutes);
app.use('/api/dashboard', authenticate, checkSubscription, dashboardRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'OK', timestamp: new Date().toISOString() });
});

// BUG-002: Global 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Hotel Management Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
  console.log(`📡 Bound to: 0.0.0.0 (Accepts external connections)`);
});

// Graceful shutdown handling
const prismaInstance = require('./lib/prisma');
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await prismaInstance.$disconnect();
      console.log('🔌 Prisma disconnected successfully.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database disconnection:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
