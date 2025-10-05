import { VercelRequest, VercelResponse } from '@vercel/node';
import { AuroraService } from '../lib/services/aurora_service';
import { initializeDatabase } from '../lib/models/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS (cron is server-to-server, but keep this tidy)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).json({});

  // Accept GET (from Vercel Cron) and POST (for manual triggers)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: Vercel can auto-send Authorization: Bearer <CRON_SECRET> if you set CRON_SECRET env var
  const expectedAuth = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Initialize database
    await initializeDatabase();

    if (!process.env.AURORA_FETCH_ENABLED || process.env.AURORA_FETCH_ENABLED !== 'true') {
      return res.status(200).json({
        success: true,
        message: 'Aurora fetching is disabled',
        skipped: true
      });
    }

    console.log('Starting scheduled aurora data processing...');

    // Process both hemispheres
    const results = await Promise.allSettled([
      AuroraService.processAuroraData('north', 12),
      AuroraService.processAuroraData('south', 12)
    ]);

    const processedResults = results.map((result, index) => {
      const hemisphere = index === 0 ? 'north' : 'south';
      
      if (result.status === 'fulfilled') {
        return {
          hemisphere,
          success: true,
          video_url: result.value.video_url,
          image_count: result.value.image_count,
          date_range: {
            start: result.value.date_range_start,
            end: result.value.date_range_end
          }
        };
      } else {
        console.error(`Failed to process ${hemisphere} hemisphere:`, result.reason);
        return {
          hemisphere,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
        };
      }
    });

    const successCount = processedResults.filter(r => r.success).length;
    
    return res.status(200).json({
      success: true,
      message: `Scheduled aurora processing completed. ${successCount}/2 hemispheres processed successfully.`,
      results: processedResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scheduled aurora processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Scheduled processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}