import { VercelRequest, VercelResponse } from '@vercel/node';
import { SUVService, SUVVideo } from '../lib/services/suv_service';
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
      return await handleGetSUV(req, res);
    } else if (req.method === 'POST') {
      return await handleProcessSUV(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('SUV API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGetSUV(req: VercelRequest, res: VercelResponse) {
  try {
    const latestVideo = await SUVService.getLatestVideo();
    
    if (!latestVideo) {
      return res.status(404).json({
        error: 'No SUV data found',
        message: 'No SUV video found for 304 angstrom'
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
    console.error('Error fetching SUV data:', error);
    return res.status(500).json({
      error: 'Failed to fetch SUV data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleProcessSUV(req: VercelRequest, res: VercelResponse) {
  const { maxImages } = req.body;

  // Validate maxImages parameter
  const imageLimit = maxImages ? parseInt(maxImages) : 12;
  if (isNaN(imageLimit) || imageLimit < 1 || imageLimit > 1000) {
    return res.status(400).json({
      error: 'Invalid maxImages parameter',
      message: 'maxImages must be a number between 1 and 1000'
    });
  }

  try {
    console.log(`Processing SUV data for 304 angstrom with ${imageLimit} images...`);
    
    const result = await SUVService.processSUVData(imageLimit);
    
    return res.status(200).json({
      success: true,
      message: 'SUV video created successfully for 304 angstrom',
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
    console.error('Error processing SUV data:', error);
    return res.status(500).json({
      error: 'Failed to process SUV data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}