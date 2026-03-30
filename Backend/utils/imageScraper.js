import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Extract Open Graph image from a URL
 * Attempts to fetch og:image meta tag from the article page
 */
export async function extractImageFromUrl(url, timeout = 10000) {
  try {
    // Fetch the HTML content
    const response = await axios.get(url, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    });

    // Parse HTML with cheerio
    const $ = cheerio.load(response.data);

    // Try to find og:image meta tag
    let imageUrl = null;

    // Method 1: Open Graph image (most reliable)
    imageUrl = $('meta[property="og:image"]').attr('content') ||
               $('meta[property="og:image:secure_url"]').attr('content');

    // Method 2: Twitter card image
    if (!imageUrl) {
      imageUrl = $('meta[name="twitter:image"]').attr('content') ||
                 $('meta[name="twitter:image:src"]').attr('content');
    }

    // Method 3: Generic meta image tags
    if (!imageUrl) {
      imageUrl = $('meta[name="image"]').attr('content') ||
                 $('meta[itemprop="image"]').attr('content');
    }

    // Method 4: Link tag with image
    if (!imageUrl) {
      imageUrl = $('link[rel="image_src"]').attr('href');
    }

    // Method 5: First image in article (fallback)
    if (!imageUrl) {
      const firstImg = $('article img, .article img, .post img, main img').first().attr('src');
      if (firstImg) {
        imageUrl = firstImg;
      }
    }

    // Validate and return the image URL
    if (imageUrl) {
      // Handle relative URLs
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        const urlObj = new URL(url);
        imageUrl = urlObj.origin + imageUrl;
      } else if (!imageUrl.startsWith('http')) {
        const urlObj = new URL(url);
        imageUrl = urlObj.origin + '/' + imageUrl;
      }

      // Validate it's a proper image URL
      if (imageUrl.length > 2000) return null;

      return imageUrl;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract multiple images in batch with concurrent requests
 */
export async function extractImagesInBatch(urls, maxConcurrent = 3) {
  const results = [];
  
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    const promises = batch.map(url => 
      extractImageFromUrl(url).catch(() => null)
    );
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    // Small delay between batches to be respectful
    if (i + maxConcurrent < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * Test the image scraper with a URL
 */
export async function testImageScraper(testUrl) {
  const imageUrl = await extractImageFromUrl(testUrl);
  return imageUrl;
}
