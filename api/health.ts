import { VercelRequest, VercelResponse } from '@vercel/node';
import { ModelLoader } from '../lib/utils/model_loader';
import { HealthResponse } from '../types';

// Initialize the model loader
const modelLoader = new ModelLoader();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const healthResponse: HealthResponse = {
      status: 'healthy',
      model: modelLoader.getModelName(),
      memory: 'enabled'
    };
    
    return res.status(200).json(healthResponse);
    
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({ 
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}