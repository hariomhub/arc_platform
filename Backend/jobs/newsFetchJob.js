import cron from 'node-cron';
import { fetchAINews } from '../services/newsFetcher.js';

// Initialize cron job to fetch AI news every 6 hours
// Schedule: 0 */6 * * * (At minute 0 past every 6th hour)
// - Runs at: 00:00, 06:00, 12:00, 18:00 daily
export function initNewsFetchCron() {
  console.log('🤖 Initializing automated news fetch cron job...');
  console.log('📅 Schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00)');

  // Run every 6 hours
  const cronJob = cron.schedule('0 */6 * * *', async () => {
    try {
      console.log('\n⏰ Cron job triggered - Starting news fetch...');
      await fetchAINews();
    } catch (error) {
      console.error('❌ Cron job error:', error.message);
    }
  }, {
    scheduled: true,
    timezone: 'UTC' // Use UTC to avoid timezone issues
  });

  console.log('✅ Cron job initialized successfully');
  
  // Optional: Run immediately on startup (comment out if not desired)
  console.log('\\n🚀 Running initial news fetch on startup...');
  setTimeout(async () => {
    try {
      await fetchAINews();
    } catch (error) {
      console.error('❌ Initial fetch error:', error.message);
    }
  }, 5000); // Wait 5 seconds after server starts

  return cronJob;
}

/**
 * For testing: Run fetch immediately
 */
export async function runFetchNow() {
  console.log('🔄 Manual fetch triggered...');
  return await fetchAINews();
}
