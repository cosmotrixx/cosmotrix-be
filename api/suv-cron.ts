import { VercelRequest, VercelResponse } from '@vercel/node';
import { SUVService } from '../lib/services/suv_service';
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

    if (!process.env.SUV_FETCH_ENABLED || process.env.SUV_FETCH_ENABLED !== 'true') {
      return res.status(200).json({
        success: true,
        message: 'SUV fetching is disabled',
        skipped: true
      });
    }

    console.log('Starting scheduled SUV data processing...');

    // Process SUV 304 angstrom data
    try {
      const result = await SUVService.processSUVData(12);
      
      return res.status(200).json({
        success: true,
        message: 'Scheduled SUV processing completed successfully.',
        result: {
          type: result.type,
          success: true,
          video_url: result.video_url,
          image_count: result.image_count,
          date_range: {
            start: result.date_range_start,
            end: result.date_range_end
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to process SUV data:', error);
      return res.status(500).json({
        success: false,
        message: 'Scheduled SUV processing failed.',
        result: {
          type: '304',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Scheduled SUV processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Scheduled processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}