import { VercelRequest, VercelResponse } from '@vercel/node';
import { AuroraService, AuroraVideo } from '../lib/services/aurora_service';
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
      return await handleGetAurora(req, res);
    } else if (req.method === 'POST') {
      return await handleProcessAurora(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Aurora API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGetAurora(req: VercelRequest, res: VercelResponse) {
  const { hemisphere } = req.query;

  // Validate hemisphere parameter
  if (!hemisphere || (hemisphere !== 'north' && hemisphere !== 'south')) {
    return res.status(400).json({
      error: 'Invalid hemisphere parameter',
      message: 'hemisphere parameter must be either "north" or "south"'
    });
  }

  try {
    const latestVideo = await AuroraService.getLatestVideo(hemisphere as 'north' | 'south');
    
    if (!latestVideo) {
      return res.status(404).json({
        error: 'No aurora data found',
        message: `No aurora video found for ${hemisphere} hemisphere`
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        hemisphere: latestVideo.hemisphere,
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
    console.error('Error fetching aurora data:', error);
    return res.status(500).json({
      error: 'Failed to fetch aurora data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleProcessAurora(req: VercelRequest, res: VercelResponse) {
  const { hemisphere, maxImages } = req.body;

  // Validate hemisphere parameter
  if (!hemisphere || (hemisphere !== 'north' && hemisphere !== 'south')) {
    return res.status(400).json({
      error: 'Invalid hemisphere parameter',
      message: 'hemisphere parameter must be either "north" or "south"'
    });
  }

  // Validate maxImages parameter
  const imageLimit = maxImages ? parseInt(maxImages) : 12;
  if (isNaN(imageLimit) || imageLimit < 1 || imageLimit > 1000) {
    return res.status(400).json({
      error: 'Invalid maxImages parameter',
      message: 'maxImages must be a number between 1 and 24'
    });
  }

  try {
    console.log(`Processing aurora data for ${hemisphere} hemisphere with ${imageLimit} images...`);
    
    const result = await AuroraService.processAuroraData(hemisphere as 'north' | 'south', imageLimit);
    
    return res.status(200).json({
      success: true,
      message: `Aurora video created successfully for ${hemisphere} hemisphere`,
      data: {
        hemisphere: result.hemisphere,
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
    console.error('Error processing aurora data:', error);
    return res.status(500).json({
      error: 'Failed to process aurora data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}