import { Router } from 'express';
import { askHandler } from './ask';
import { askGptHandler } from './askGpt';
import { 
  healthHandler, 
  metricsHandler, 
  cacheStatsHandler, 
  cacheClearHandler 
} from './health';

const router = Router();

// API endpoint to answer questions
router.post('/api/ask', askHandler);
router.post('/api/ask-gpt', askGptHandler);

// Health and metrics endpoints
router.get('/health', healthHandler);
router.get('/metrics', metricsHandler);

// Cache management endpoints
router.get('/api/cache/stats', cacheStatsHandler);
router.post('/api/cache/clear', cacheClearHandler);

export default router; 