import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Configure Express middlewares
export function configureMiddleware(app: express.Application): void {
  // Security and optimization middleware
  app.use(helmet()); // Set security HTTP headers
  app.use(compression()); // Compress responses
  app.use(cors()); // Enable CORS

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  });

  // Apply rate limiting to API routes
  app.use('/api/', apiLimiter);
} 