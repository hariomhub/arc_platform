import pool from '../db/connection.js';
import { extractImageFromUrl } from '../utils/imageScraper.js';

async function backfillImages() {
  try {
    console.log('🖼️  Starting image backfill for existing articles...\n');

    // Get all automated articles without images
    const [articles] = await pool.query(
      `SELECT id, title, article_url 
       FROM news 
       WHERE is_automated = TRUE 
       AND status = 'APPROVED' 
       AND (image_url IS NULL OR image_url = '')
       ORDER BY published_at DESC
       LIMIT 20`
    );

    console.log(`Found ${articles.length} articles without images\n`);

    let successCount = 0;
    let failCount = 0;

    for (const article of articles) {
      console.log(`\n📰 Processing: ${article.title.substring(0, 60)}...`);
      console.log(`   URL: ${article.article_url.substring(0, 80)}...`);

      try {
        const imageUrl = await extractImageFromUrl(article.article_url, 10000);
        
        if (imageUrl) {
          await pool.query(
            'UPDATE news SET image_url = ? WHERE id = ?',
            [imageUrl, article.id]
          );
          console.log(`   ✅ Image found and saved!`);
          console.log(`   🖼️  ${imageUrl.substring(0, 80)}...`);
          successCount++;
        } else {
          console.log(`   ⚠️  No image found`);
          failCount++;
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        failCount++;
      }

      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Backfill Summary:');
    console.log(`   ✅ Images found: ${successCount}`);
    console.log(`   ⚠️  No images: ${failCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Backfill error:', error.message);
    process.exit(1);
  }
}

backfillImages();
