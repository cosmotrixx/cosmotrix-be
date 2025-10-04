import { VercelRequest, VercelResponse } from '@vercel/node';
import { CMEService, CMEVideo } from '../lib/services/cme_service';
import { initializeDatabase } from '../lib/models/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    // Initialize database
    await initializeDatabase();

    if (req.method === 'GET') {
      return await handleGetCME(req, res);
    } else if (req.method === 'POST') {
      return await handleProcessCME(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('CME API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGetCME(req: VercelRequest, res: VercelResponse) {
  const { type } = req.query;

  // Validate type parameter
  if (!type || !['ccor1', 'lasco-c2', 'lasco-c3'].includes(type as string)) {
    return res.status(400).json({
      error: 'Invalid type parameter',
      message: 'type parameter must be one of: "ccor1", "lasco-c2", or "lasco-c3"'
    });
  }

  try {
    const latestVideo = await CMEService.getLatestVideo(type as 'ccor1' | 'lasco-c2' | 'lasco-c3');
    
    if (!latestVideo) {
      return res.status(404).json({
        error: 'No CME data found',
        message: `No CME video found for ${type} type`
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        type: latestVideo.type,
        video_url: latestVideo.video_url,
        image_count: latestVideo.image_count,
        created_at: latestVideo.created_at,
        date_range: {
          start: latestVideo.date_range_start,
          end: latestVideo.date_range_end
        }
      }
    });
  } catch (error) {
    console.error('Error fetching CME data:', error);
    return res.status(500).json({
      error: 'Failed to fetch CME data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleProcessCME(req: VercelRequest, res: VercelResponse) {
  const { type, maxImages } = req.body;

  // Validate type parameter
  if (!type || !['ccor1', 'lasco-c2', 'lasco-c3'].includes(type)) {
    return res.status(400).json({
      error: 'Invalid type parameter',
      message: 'type parameter must be one of: "ccor1", "lasco-c2", or "lasco-c3"'
    });
  }

  // Validate maxImages parameter
  const imageLimit = maxImages ? parseInt(maxImages) : 12;
  if (isNaN(imageLimit) || imageLimit < 1 || imageLimit > 1000) {
    return res.status(400).json({
      error: 'Invalid maxImages parameter',
      message: 'maxImages must be a number between 1 and 1000'
    });
  }

  try {
    console.log(`Processing CME data for ${type} type with ${imageLimit} images...`);
    
    const result = await CMEService.processCMEData(type as 'ccor1' | 'lasco-c2' | 'lasco-c3', imageLimit);
    
    return res.status(200).json({
      success: true,
      message: `CME video created successfully for ${type} type`,
      data: {
        type: result.type,
        video_url: result.video_url,
        image_count: result.image_count,
        created_at: result.created_at,
        date_range: {
          start: result.date_range_start,
          end: result.date_range_end
        }
      }
    });
  } catch (error) {
    console.error('Error processing CME data:', error);
    return res.status(500).json({
      error: 'Failed to process CME data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}