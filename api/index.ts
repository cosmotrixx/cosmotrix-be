import { VercelRequest, VercelResponse } from '../types';

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

  return res.status(200).json({
    message: 'Cosmotrix AI Serverless Backend is running.',
    version: '1.0.0',
    endpoints: {
      chat: '/api/chat',
      simpleChat: '/api/simple-chat',
      conversation: '/api/conversation?thread_id={id}',
      summarize: '/api/summarize',
      codeExplain: '/api/code/explain',
      health: '/api/health',
      characters: {
        pilot: '/api/characters/pilot',
        powerOperator: '/api/characters/power-operator',
        astronaut: '/api/characters/astronaut',
        satelliteOperator: '/api/characters/satellite-operator',
        emergencyCoordinator: '/api/characters/emergency-coordinator',
        scientist: '/api/characters/scientist'
      },
      aurora: '/api/aurora?hemisphere={north|south}',
      auroraProcess: 'POST /api/aurora',
      auroraCron: 'POST /api/aurora-cron'

    }
  });
}