import OpenAI from 'openai';
import logger from '../utils/logger';
import { OPENAI_API_KEY } from '../config';

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Create embeddings function
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error('Invalid response structure from OpenAI embeddings API');
    }
    return response.data[0].embedding;
  } catch (error: any) {
    logger.error('Error creating embedding:', { error: error.message, text: text.substring(0, 100) });
    throw error;
  }
}

// Generate description using OpenAI
export async function generateDescription(content: string, url: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates concise and accurate descriptions of web pages. Create a short description (max 150 characters) that summarizes what this page is about.'
        },
        {
          role: 'user',
          content: `Generate a concise description of what this page is about. The page URL is: ${url}\n\nPage content: ${content.substring(0, 4000)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    return completion.choices[0]?.message?.content?.trim() || `Content from ${url}`;
  } catch (error: any) {
    logger.error(`Error generating description for ${url}:`, { error: error.message });
    return `Content from ${url}`; // Fallback description
  }
}

// Generate answer using OpenAI
export async function generateAnswer(question: string, relevantContent: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // or gpt-3.5-turbo
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that answers questions about Polish taxes based on the information provided. Your answers should be concise, accurate, and based only on the information provided.'
        },
        {
          role: 'user',
          content: `Based on the following information, please answer this question: "${question}"\n\nInformation: ${relevantContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return completion.choices[0]?.message?.content || 'Sorry, I could not generate an answer.';
  } catch (error: any) {
    logger.error(`Error generating answer for question "${question}":`, { error: error.message });
    throw error;
  }
}

export async function generateAnswerWithInternet(question: string): Promise<string> {
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    tools: [{ type: "web_search_preview" }],
    input: question,
    instructions: "You are a helpful assistant who answers questions about Polish taxes based on the podatki.gov.pl website or government websites. Your answers should be concise, accurate and based solely on the podatki.gov.pl website or government websites. Return data in json format with the following structure {content: 'answer', links : ['link to source'], title: 'title based on content'}",
  });

  return response.output_text;
}