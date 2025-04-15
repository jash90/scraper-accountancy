import { Request, Response } from 'express';
import logger from '../utils/logger';
import { HealthResponse, MetricsResponse } from '../types';
import { questionCache } from '../services/cache';

// Health check endpoint
export const healthHandler = (req: Request, res: Response) => {
  const healthData: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
  
  res.status(200).json(healthData);
};

// Metrics endpoint
export const metricsHandler = (req: Request, res: Response) => {
  try {
    const metricsData: MetricsResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
    
    res.status(200).json(metricsData);
  } catch (error: any) {
    logger.error('Error fetching metrics:', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
};

// Cache stats endpoint
export const cacheStatsHandler = async (req: Request, res: Response) => {
  try {
    const stats = await questionCache.getStats();
    res.status(200).json({
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error fetching cache stats:', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve cache statistics' });
  }
};

// Clear cache endpoint
export const cacheClearHandler = async (req: Request, res: Response) => {
  try {
    await questionCache.clear();
    logger.info('Cache cleared via API request');
    res.status(200).json({
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error clearing cache:', { error: error.message });
    res.status(500).json({ error: 'Failed to clear cache' });
  }
}; 