// Define interfaces used throughout the application

// Payload structure for Qdrant
export interface QdrantPointPayload {
  url: string;
  description: string;
  content: string;
  updated_at: string;
}

// Request body for the /ask endpoint
export interface AskRequestBody {
  question: string;
}

// Response structure for the /ask endpoint
export interface AskResponse {
  answer: string;
  source: string;
  timestamp: string;
}

// Health check response
export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
}

// Metrics response
export interface MetricsResponse extends HealthResponse {
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
} 