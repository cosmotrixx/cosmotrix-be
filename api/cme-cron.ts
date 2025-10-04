import { VercelRequest, VercelResponse } from '@vercel/node';
import { CMEService } from '../lib/services/cme_service';
import { initializeDatabase } from '../lib/models/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify this is a valid cron request (you can add authentication here)
  const authHeader = req.headers.authorization;
  const expectedAuth = process.env.CRON_SECRET;
  
  if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Initialize database
    await initializeDatabase();

    if (!process.env.CME_FETCH_ENABLED || process.env.CME_FETCH_ENABLED !== 'true') {
      return res.status(200).json({
        success: true,
        message: 'CME fetching is disabled',
        skipped: true
      });
    }

    console.log('Starting scheduled CME data processing...');

    // Process all CME types
    const results = await Promise.allSettled([
      CMEService.processCMEData('ccor1', 12),
      CMEService.processCMEData('lasco-c2', 12),
      CMEService.processCMEData('lasco-c3', 12)
    ]);

    const processedResults = results.map((result, index) => {
      const types = ['ccor1', 'lasco-c2', 'lasco-c3'];
      const type = types[index];
      
      if (result.status === 'fulfilled') {
        return {
          type,
          success: true,
          video_url: result.value.video_url,
          image_count: result.value.image_count,
          date_range: {
            start: result.value.date_range_start,
            end: result.value.date_range_end
          }
        };
      } else {
        console.error(`Failed to process ${type} type:`, result.reason);
        return {
          type,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
        };
      }
    });

    const successCount = processedResults.filter(r => r.success).length;
    
    return res.status(200).json({
      success: true,
      message: `Scheduled CME processing completed. ${successCount}/3 types processed successfully.`,
      results: processedResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scheduled CME processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Scheduled processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}