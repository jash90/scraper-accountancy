import { chromium, Browser, Page } from 'playwright';
import logger from '../utils/logger';
import { SITEMAP_URL } from '../config';
import { createEmbedding, generateDescription } from './openai';
import { isRecentlyProcessed, storeContent } from './qdrant';

// Scrape sitemap function
export async function scrapeSitemap(): Promise<void> {
  logger.info(`Starting sitemap scraping: ${new Date().toISOString()}`);
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page: Page = await browser.newPage();

    // Navigate to the sitemap page
    await page.goto(SITEMAP_URL, {
      timeout: 60000,
      waitUntil: 'networkidle'
    });

    // Extract all links
    const links = await page.evaluate(() => {
      const linkElements = document.querySelectorAll('a');
      return Array.from(linkElements)
        .filter(a => a.href && a.href.startsWith('https://www.podatki.gov.pl/') && !a.href.includes('#'))
        .map(a => ({ url: a.href }));
    });

    // Remove duplicate URLs
    const uniqueLinks = Array.from(new Set(links.map(link => link.url)))
      .map(url => ({ url }));

    logger.info(`Found ${links.length} total links, ${uniqueLinks.length} unique links to process`);

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each unique link
    for (const link of uniqueLinks) {
      try {
        // Check if URL was recently processed (less than 4 hours ago)
        if (await isRecentlyProcessed(link.url)) {
          logger.debug(`Skipping recently processed URL: ${link.url}`);
          skippedCount++;
          continue;
        }

        // Open the link page
        await page.goto(link.url, {
          timeout: 30000,
          waitUntil: 'networkidle'
        });

        // Extract content
        const content = await page.evaluate(() => {
          const mainContent = document.querySelector('main') || document.querySelector('article') || document.body;
          return mainContent?.textContent?.trim() || '';
        });

        if (!content) {
          logger.warn(`No content found for: ${link.url}`);
          continue;
        }

        // Generate AI description based on the content
        const description = await generateDescription(content, link.url);
        logger.debug(`Generated description for ${link.url}: ${description}`);

        // Create embedding for the AI-generated description
        const embedding = await createEmbedding(description);

        // Store in Qdrant
        await storeContent(link.url, description, content, embedding);

        logger.debug(`Processed: ${link.url}`);
        processedCount++;

        // Add a short delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        logger.error(`Error processing ${link.url}:`, { error: error.message });
        errorCount++;
      }
    }

    logger.info(`Sitemap scraping completed: ${new Date().toISOString()}`);
    logger.info(`Processed ${processedCount} links, skipped ${skippedCount} recently processed links, encountered ${errorCount} errors`);
  } catch (error: any) {
    logger.error('Error during sitemap scraping:', { error: error.message, stack: error.stack });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
} 