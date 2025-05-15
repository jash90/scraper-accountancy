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
export async function generateAnswerWithInternet(question: string): Promise<{content: string, links: string[], title: string, keywords: string[]}> {
 const response = await openai.responses.create({
  model: "gpt-4.1",
  input: [
    {
      "role": "system",
      "content": [
        {
          "type": "input_text",
          "text": "Odpowiadaj na pytania na podstawie stron rządowych typu: podatki.gov.pl, przygotuj to tak aby mogło później źródłem wiedzy na konkretny temat, przygotuj tytuł, treść i słowa kluczowe, źródło gdzie znajdę te informacje w formacie json\n"
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": question
        }
      ]
    }
  ],
  text: {
    "format": {
      "type": "json_schema",
      "name": "document",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "description": "The title of the document."
          },
          "content": {
            "type": "string",
            "description": "The main content of the document."
          },
          "keywords": {
            "type": "array",
            "description": "An array of keywords associated with the document.",
            "items": {
              "type": "string"
            }
          },
          "links": {
            "type": "array",
            "description": "An array of links related to the document.",
            "items": {
              "type": "string"
            }
          }
        },
        "required": [
          "title",
          "content",
          "keywords",
          "links"
        ],
        "additionalProperties": false
      }
    }
  },
  reasoning: {},
  tools: [
    {
      "type": "web_search_preview",
      "user_location": {
        "type": "approximate",
        "country": "PL"
      },
      "search_context_size": "high"
    }
  ],
  temperature: 1,
  max_output_tokens: 32768,
  top_p: 1,
  store: true
});


  return JSON.parse(response.output_text);
}