import Parser from 'rss-parser';
import pool from '../db/connection.js';
import { extractImageFromUrl } from '../utils/imageScraper.js';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'content:encoded']
  }
});

// Google News RSS feed queries for AI-related news
const NEWS_SOURCES = [
  {
    name: 'Google News - Artificial Intelligence',
    url: 'https://news.google.com/rss/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en'
  },
  {
    name: 'Google News - AI Governance',
    url: 'https://news.google.com/rss/search?q=AI+governance&hl=en-US&gl=US&ceid=US:en'
  },
  {
    name: 'Google News - AI Regulation',
    url: 'https://news.google.com/rss/search?q=AI+regulation&hl=en-US&gl=US&ceid=US:en'
  },
  {
    name: 'Google News - EU AI Act',
    url: 'https://news.google.com/rss/search?q=EU+AI+Act&hl=en-US&gl=US&ceid=US:en'
  },
  {
    name: 'Google News - NIST AI RMF',
    url: 'https://news.google.com/rss/search?q=NIST+AI+RMF&hl=en-US&gl=US&ceid=US:en'
  },
  {
    name: 'Google News - AI Policy',
    url: 'https://news.google.com/rss/search?q=AI+policy&hl=en-US&gl=US&ceid=US:en'
  },
  {
    name: 'Google News - AI Risk Management',
    url: 'https://news.google.com/rss/search?q=AI+risk+management&hl=en-US&gl=US&ceid=US:en'
  }
];

/**
 * Extract source name from RSS link
 */
function extractSource(link) {
  try {
    const url = new URL(link);
    const hostname = url.hostname;
    
    // Clean up common patterns
    const cleanSource = hostname
      .replace('www.', '')
      .replace('.com', '')
      .replace('.org', '')
      .replace('.net', '')
      .replace('.co.uk', '')
      .split('.')[0];
    
    // Capitalize first letter
    return cleanSource.charAt(0).toUpperCase() + cleanSource.slice(1);
  } catch (error) {
    return 'Unknown Source';
  }
}

/**
 * Extract text from HTML
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Check if article already exists in database
 */
async function articleExists(articleUrl) {
  const [rows] = await pool.query(
    'SELECT id FROM news WHERE article_url = ? AND is_automated = TRUE',
    [articleUrl]
  );
  return rows.length > 0;
}

/**
 * Insert new article into database
 */
async function saveArticle(article) {
  try {
    const [result] = await pool.query(
      `INSERT INTO news 
      (title, summary, source, image_url, article_url, link, published_at, status, is_published, is_automated, fetched_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', FALSE, TRUE, NOW())`,
      [
        article.title.substring(0, 255), // Limit to VARCHAR length
        article.summary,
        article.source,
        article.imageUrl,
        article.articleUrl,
        article.articleUrl, // Keep link same as article_url for consistency
        article.publishedAt
      ]
    );
    return result.insertId;
  } catch (error) {
    console.error('Error saving article:', error.message);
    throw error;
  }
}

/**
 * Fetch and parse RSS feed from a single source
 */
async function fetchFromSource(sourceConfig) {
  try {
    console.log(`Fetching from: ${sourceConfig.name}...`);
    const feed = await parser.parseURL(sourceConfig.url);
    
    let newArticlesCount = 0;
    let skippedCount = 0;
    let imagesFound = 0;

    for (const item of feed.items) {
      // Skip if article already exists
      if (await articleExists(item.link)) {
        skippedCount++;
        continue;
      }

      // Extract article data
      const article = {
        title: item.title || 'Untitled',
        summary: stripHtml(item.contentSnippet || item.content || item.description || ''),
        source: item.creator || extractSource(item.link),
        imageUrl: null,
        articleUrl: item.link,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date()
      };

      // Truncate summary if too long
      if (article.summary.length > 500) {
        article.summary = article.summary.substring(0, 497) + '...';
      }

      // Try to extract image from the article URL (with timeout)
      try {
        console.log(`  → Fetching image for: ${article.title.substring(0, 50)}...`);
        article.imageUrl = await extractImageFromUrl(article.articleUrl, 8000);
        if (article.imageUrl) {
          imagesFound++;
          console.log(`  ✓ Image found`);
        } else {
          console.log(`  ⊗ No image found`);
        }
      } catch (error) {
        // Continue without image if extraction fails
        console.log(`  ⊗ Image extraction failed`);
      }

      // Save to database
      await saveArticle(article);
      newArticlesCount++;
      
      // Small delay between articles to avoid overwhelming servers
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`  ✓ ${newArticlesCount} new articles, ${imagesFound} images found, ${skippedCount} duplicates skipped`);
    return { newArticlesCount, skippedCount, imagesFound };
  } catch (error) {
    console.error(`  ✗ Error fetching from ${sourceConfig.name}:`, error.message);
    return { newArticlesCount: 0, skippedCount: 0, imagesFound: 0, error: error.message };
  }
}

/**
 * Main function to fetch news from all sources
 */
export async function fetchAINews() {
  console.log('\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 Starting automated AI news fetch...');
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n');

  let totalNew = 0;
  let totalSkipped = 0;
  let totalImages = 0;
  const errors = [];

  for (const source of NEWS_SOURCES) {
    const result = await fetchFromSource(source);
    totalNew += result.newArticlesCount;
    totalSkipped += result.skippedCount;
    totalImages += result.imagesFound || 0;
    
    if (result.error) {
      errors.push({ source: source.name, error: result.error });
    }

    // Add delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Fetch Summary:');
  console.log(`  ✓ New articles: ${totalNew}`);
  console.log(`  🖼  Images found: ${totalImages}`);
  console.log(`  ⊘ Duplicates skipped: ${totalSkipped}`);
  console.log(`  ✗ Errors: ${errors.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n');

  return {
    success: true,
    totalNew,
    totalSkipped,
    totalImages,
    errors,
    timestamp: new Date().toISOString()
  };
}

/**
 * Manually trigger fetch (useful for testing)
 */
export async function triggerManualFetch() {
  try {
    const result = await fetchAINews();
    return result;
  } catch (error) {
    console.error('Manual fetch error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
