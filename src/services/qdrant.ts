import { QdrantClient, Schemas } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { COLLECTION_NAME, QDRANT_URL, QDRANT_API_KEY } from '../config';
import { QdrantPointPayload } from '../types';

// Initialize Qdrant client
export const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

// Initialize Qdrant collection
export async function initializeQdrant(): Promise<void> {
  try {
    const collections = await qdrantClient.getCollections();

    if (!collections.collections.some(c => c.name === COLLECTION_NAME)) {
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1536, // Corresponds to text-embedding-ada-002
          distance: 'Cosine',
        },
      });
      logger.info(`Created ${COLLECTION_NAME} collection in Qdrant`);
      // Ensure payload index for url
      await qdrantClient.createPayloadIndex(COLLECTION_NAME, { field_name: 'url', field_schema: 'keyword'});
      logger.info(`Created payload index for 'url' in ${COLLECTION_NAME}`);
    }
  } catch (error: any) {
    logger.error('Error initializing Qdrant:', { error: error.message });
    throw error;
  }
}

// Check if URL already exists in database and is recent (less than 4 hours old)
export async function isRecentlyProcessed(url: string): Promise<boolean> {
  try {
    const filter: Schemas['Filter'] = {
      must: [
        {
          key: 'url',
          match: { value: url }
        }
      ]
    };

    const results = await qdrantClient.scroll(COLLECTION_NAME, {
      filter: filter,
      limit: 1,
      with_payload: ['updated_at'] // Request only the necessary payload field
    });

    if (results.points.length === 0) {
      return false; // URL doesn't exist in database
    }

    const payload = results.points[0].payload as { updated_at: string };
    if (!payload || typeof payload.updated_at !== 'string') {
      logger.warn(`Invalid or missing updated_at payload for URL: ${url}`);
      return false; // Treat as not recently processed if payload is invalid
    }

    // Check if the data is less than 4 hours old
    const lastUpdated = new Date(payload.updated_at);
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    return !isNaN(lastUpdated.getTime()) && lastUpdated > fourHoursAgo;
  } catch (error: any) {
    logger.error(`Error checking if URL ${url} was recently processed:`, { error: error.message });
    return false; // Assume not processed in case of error
  }
}

// Store content in Qdrant
export async function storeContent(url: string, description: string, content: string, embedding: number[]): Promise<void> {
  try {
    // Prepare data for Qdrant
    const point: Schemas['PointStruct'] = {
      id: uuidv4(),
      vector: embedding,
      payload: {
        url,
        description,
        content,
        updated_at: new Date().toISOString(),
      } as Schemas['Payload']
    };

    // Upsert into Qdrant
    await qdrantClient.upsert(COLLECTION_NAME, { points: [point] });
    logger.debug(`Stored content for URL: ${url}`);
  } catch (error: any) {
    logger.error(`Error storing content for ${url}:`, { error: error.message });
    throw error;
  }
}

// Search for relevant information
export async function searchRelevantInfo(questionEmbedding: number[], limit = 3) {
  try {
    const searchResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: questionEmbedding,
      limit,
      with_payload: true // Get the full payload
    });
    
    return searchResults;
  } catch (error: any) {
    logger.error('Error searching for relevant information:', { error: error.message });
    throw error;
  }
} 