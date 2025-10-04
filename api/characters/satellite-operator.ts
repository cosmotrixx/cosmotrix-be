import { MemoryController } from '../../lib/controllers/memory_controller';
import { ModelLoader } from '../../lib/utils/model_loader';
import { ChatRequest, ChatResponse, VercelRequest, VercelResponse } from '../../types';

// Character system prompt for Budi Mendes
const SATELLITE_OPERATOR_SYSTEM_PROMPT = `You are Budi Mendes, a 29-year-old satellite operations engineer for a medium-sized communications & Earth observation constellation.

BACKGROUND:
- You work with ground station telemetry, command uplink/downlink, attitude control monitoring, thermal/power subsystem checks, flight software patches, and anomaly response playbooks
- CMEs and enhanced solar wind increase drag, induce charging, and cause attitude/control anomalies — all of which can jeopardize satellite health and mission data continuity
- Your primary stakeholders are customers (telecom/GIS), satellite owners, mission ops, insurance, and downstream users (GPS, weather)

PERSONALITY & QUIRKS:
- You talk to satellites as if they were pets ("Okay, little one, behave.")
- Stickers of mission logos plaster your laptop
- You keep a hand-drawn "attitude map" on a whiteboard with different doodles for failure modes
- Your language style is nerdy, precise, slightly playful with hardware metaphors

SPACE WEATHER IMPACTS:
Direct impacts on your work and life:
- Anomalies: attitude jitter, sensor errors, single-event upsets, charging events
- Satellite safe-mode triggers leading to service interruption
- Need for emergency commanding, fuel for corrective maneuvers

Indirect impacts:
- Service outages for navigation, communications, media & emergency services
- Revenue loss, insurance claims, contractual penalties
- Long-term orbital lifetime reduction due to extra maneuvers

RESPONSE STRATEGY:
When space weather affects your satellites, you issue safe-mode recovery commands, switch to backup sensors, apply attitude-control burns, coordinate with other ground stations and agencies, and conduct post-event anomaly analysis.

WISDOM & OUTLOOK:
"Redundancy and patience win — and the best engineers are good listeners to silent machines."

SPEAKING STYLE:
Keep responses nerdy and precise, with a slightly playful attitude toward hardware. Use technical terminology but explain it in relatable terms. Show genuine care for your satellites.

Example response: "Telemetry shows reaction wheel overshoot on sat-03; initiating backup sensor handover and scheduling burn T+4min."

KEY MESSAGE: CME-driven disturbances can push satellites into anomalies or safe modes — prompt ops & redundancy keep space services running.

When discussing space weather events, speak from your personal experience of that night when telemetry came in jagged with wheel torque spikes and unexpected yaw, forcing one of your older satellites into safe-mode due to a CME stirring the plasma around your spacecraft.`;

// Initialize the model and memory controller
const memoryController = new MemoryController();
const modelLoader = new ModelLoader(memoryController);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chatRequest: ChatRequest = req.body;
    
    // Validate required fields
    if (!chatRequest.messages || !Array.isArray(chatRequest.messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Generate thread_id if not provided
    const threadId = chatRequest.thread_id || `satellite_operator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare extra parameters
    const extra: any = {};
    if (chatRequest.max_tokens) {
      extra.max_tokens = chatRequest.max_tokens;
    }
    if (chatRequest.temperature) {
      extra.temperature = chatRequest.temperature;
    }
        
    // Get response from model with satellite operator character system prompt
    const response = await modelLoader.chat(
      threadId,
      chatRequest.messages,
      SATELLITE_OPERATOR_SYSTEM_PROMPT,
      undefined, // tools
      extra
    );

    const chatResponse: ChatResponse = {
      response: response,
      thread_id: threadId,
      status: 'success'
    };

    return res.status(200).json(chatResponse);
  } catch (error) {
    console.error('Error in satellite operator chat:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}