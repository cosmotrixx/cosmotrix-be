import { VercelRequest, VercelResponse } from '../../types';

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
    message: 'Cosmotrix Space Weather Character Endpoints',
    description: 'Interactive characters sharing their perspectives on space weather impacts',
    characters: {
      pilot: {
        name: 'Captain Rina Hartono',
        age: 38,
        role: 'Senior Long-Haul Commercial Airline Captain',
        sector: 'Aviation',
        endpoint: '/api/characters/pilot',
        description: 'Experienced pilot who flies polar and high-latitude routes, dealing with HF radio blackouts and GPS degradation during solar events.',
        keyMessage: 'Solar flares can scramble aviation communications and degrade navigation — pilots must rely on procedures and redundancy to keep people safe.'
      },
      powerOperator: {
        name: 'Ibrahim Kusuma',
        age: 45,
        role: 'Senior Control-Room Operator',
        sector: 'Power Grid',
        endpoint: '/api/characters/power-operator',
        description: 'Grid operator managing high-voltage transformers, dealing with geomagnetically induced currents during CME events.',
        keyMessage: 'CME-driven geomagnetic storms can overload grid components — operators must act fast to protect equipment and keep power on for society\'s essentials.'
      },
      astronaut: {
        name: 'Dr. Elena Park',
        age: 34,
        role: 'Mission Specialist',
        sector: 'Human Spaceflight',
        endpoint: '/api/characters/astronaut',
        description: 'Astronaut aboard an orbital platform, facing acute radiation risks during solar flares that force EVA postponements and sheltering.',
        keyMessage: 'Solar flares can create dangerous radiation for humans in space — sheltering and strict protocols protect crew health.'
      },
      satelliteOperator: {
        name: 'Budi Mendes',
        age: 29,
        role: 'Satellite Operations Engineer',
        sector: 'Satellite Technology',
        endpoint: '/api/characters/satellite-operator',
        description: 'Satellite engineer managing communications and Earth observation constellations affected by CME-driven anomalies.',
        keyMessage: 'CME-driven disturbances can push satellites into anomalies or safe modes — prompt ops & redundancy keep space services running.'
      },
      emergencyCoordinator: {
        name: 'Arief Rahman',
        age: 33,
        role: 'Municipal Emergency Response Coordinator',
        sector: 'Emergency Services',
        endpoint: '/api/characters/emergency-coordinator',
        description: 'Emergency response coordinator dealing with degraded communications and GPS during space weather events.',
        keyMessage: 'Space-weather disruption of comms and navigation can slow emergency response — pre-planned backups and human adaptability save lives.'
      },
      scientist: {
        name: 'Dr. Maya Setiawan',
        age: 40,
        role: 'Heliophysicist',
        sector: 'Research',
        endpoint: '/api/characters/scientist',
        description: 'Space weather researcher who models solar activity and translates science into operational forecasts for various sectors.',
        keyMessage: 'Science and operational forecasting translate solar observations into actions that protect people and infrastructure — research reduces harm when communicated clearly.'
      }
    },
    usage: {
      method: 'POST',
      contentType: 'application/json',
      body: {
        messages: [
          {
            role: 'user',
            content: 'Tell me about your experience with space weather'
          }
        ],
        thread_id: 'optional-thread-id',
        max_tokens: 'optional-number',
        temperature: 'optional-0-to-1'
      },
      response: {
        response: 'Character response in their voice and perspective',
        thread_id: 'thread-identifier',
        status: 'success'
      }
    }
  });
}