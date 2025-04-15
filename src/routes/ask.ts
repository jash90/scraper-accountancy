import { RequestHandler, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import logger from '../utils/logger';
import { AskRequestBody, QdrantPointPayload, AskResponse } from '../types';
import { createEmbedding, generateAnswer } from '../services/openai';
import { searchRelevantInfo } from '../services/qdrant';
import { questionCache } from '../services/cache';

/**
 * Helper function to measure execution time of async functions
 * @param fn Async function to measure
 * @param label Label for this measurement (for logging)
 * @returns Result of the function and timing information
 */
async function measureExecutionTime<T>(fn: () => Promise<T>, label: string): Promise<{ result: T, time: number }> {
  const start = Date.now();
  try {
    const result = await fn();
    const time = Date.now() - start;
    return { result, time };
  } catch (error) {
    const time = Date.now() - start;
    logger.warn(`Error during ${label} (took ${time}ms)`, { error });
    throw error;
  }
}

/**
 * Create a clean response object without any timing information
 */
function createCleanResponse(data: AskResponse): AskResponse {
  // Create a new object with only the expected AskResponse fields
  return {
    answer: data.answer,
    source: data.source,
    timestamp: data.timestamp
  };
}

// Define the async handler function for /api/ask
export const askHandler: RequestHandler<ParamsDictionary, any, AskRequestBody> = async (req, res) => {
  const startTime = Date.now();
  const timings: Record<string, number> = {};
  
  try {
    // req.body is typed via RequestHandler generic
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      logger.warn('Invalid request to /api/ask', { body: req.body });
      res.status(400).json({
        error: 'Invalid request. Please provide a question as a string.'
      });
      return;
    }

    // Validation time
    timings.validation = Date.now() - startTime;
    logger.info(`Received question: ${question}`);

    // Measure cache lookup time
    const cacheStartTime = Date.now();
    // Note that get is now async
    const cachedResponse = await questionCache.get(question);
    timings.cacheCheck = Date.now() - cacheStartTime;
    
    if (cachedResponse) {
      const totalTime = Date.now() - startTime;
      timings.total = totalTime;
      
      logger.info(`Question answered from cache in ${totalTime}ms`, {
        question,
        timings,
        cached: true
      });
      
      // Return cached response with cache indicator but without timings
      // Use createCleanResponse to ensure no timing data is included
      res.status(200).json({
        ...createCleanResponse(cachedResponse),
        cached: true
      });
      return;
    }

    // Cache miss, process the question
    logger.debug('Cache miss, generating answer', { question });
    
    // Create embedding for the question
    const { result: questionEmbedding, time: embeddingTime } = await measureExecutionTime(
      () => createEmbedding(question),
      'embedding generation'
    );
    timings.embedding = embeddingTime;
    
    // Search for relevant information in Qdrant
    const { result: searchResults, time: searchTime } = await measureExecutionTime(
      () => searchRelevantInfo(questionEmbedding),
      'vector search'
    );
    timings.vectorSearch = searchTime;

    if (searchResults.length === 0) {
      const totalTime = Date.now() - startTime;
      timings.total = totalTime;
      
      logger.warn('No relevant information found for question', { 
        question,
        timings
      });
      
      // Remove timings from response
      res.status(404).json({
        error: 'No relevant information found to answer your question.'
      });
      return;
    }

    // Extract relevant content and source URL
    const contentExtractStartTime = Date.now();
    const relevantContent = searchResults
      .map(result => (result.payload as QdrantPointPayload | undefined)?.content ?? 'No content available')
      .join('\n\n');
    const sourceUrl = (searchResults[0]?.payload as QdrantPointPayload | undefined)?.url ?? 'Unknown source';
    timings.contentExtract = Date.now() - contentExtractStartTime;

    // Generate answer using OpenAI
    const { result: answer, time: answerTime } = await measureExecutionTime(
      () => generateAnswer(question, relevantContent),
      'answer generation'
    );
    timings.answerGeneration = answerTime;

    // Prepare response
    const responseStartTime = Date.now();
    const response: AskResponse = {
      answer,
      source: sourceUrl,
      timestamp: new Date().toISOString()
    };

    // Measure cache set time
    const cacheSetStart = Date.now();
    // Note that set is now async
    await questionCache.set(question, response);
    timings.responsePrepAndCache = Date.now() - responseStartTime;

    const totalTime = Date.now() - startTime;
    timings.total = totalTime;
    
    logger.info(`Question answered in ${totalTime}ms`, {
      question,
      timings,
      sourceUrl,
      cached: false
    });
    
    // Send the success response without timing information
    res.status(200).json(response);

  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    timings.total = totalTime;
    
    logger.error('Error processing question:', {
      error: error.message,
      stack: error.stack,
      timings
    });

    // Ensure response is sent in error case if headers not already sent
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to process your question',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}; 