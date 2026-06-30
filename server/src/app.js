import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import expenseRoutes from './routes/expenses.js';
import investmentRoutes from './routes/investments.js';
import dashboardRoutes from './routes/dashboard.js';
import graphqlRoutes from './routes/graphql.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import corsMiddleware from './middleware/cors.js';

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);

// CORS middleware
app.use(corsMiddleware);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(requestLogger);

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/graphql', graphqlRoutes);

// Serve React static files
app.use(express.static('public'));

// Serve React app for all unmatched routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(process.cwd() + '/public/index.html');
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
