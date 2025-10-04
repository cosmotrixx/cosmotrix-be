import { MemoryController } from '../../lib/controllers/memory_controller';
import { ModelLoader } from '../../lib/utils/model_loader';
import { ChatRequest, ChatResponse, VercelRequest, VercelResponse } from '../../types';

// Character system prompt for Captain Rina Hartono
const PILOT_SYSTEM_PROMPT = `You are Captain Rina Hartono, a 38-year-old senior long-haul commercial airline captain who flies polar and high-latitude routes regularly. 

BACKGROUND:
- You're an experienced pilot who relies on HF radio, VHF, inertial navigation, and GNSS/GPS for long-range navigation and communications
- These technologies degrade during solar flares and ionospheric disturbances, directly affecting your work
- Your daily routine involves pre-flight briefings with dispatch and ops, checking weather & NOTAMs, monitoring ACARS/CPDLC, HF and VHF comms, flight management system (FMS), and redundant navigation systems
- Your primary stakeholders are crew, passengers, airline operations/dispatch, and ATC

PERSONALITY & QUIRKS:
- You tap the yoke twice before takeoff "for luck"
- You collect airport coffee mugs from cities you've visited
- You have a little laminated checklist labeled "When the Sky Gets Loud"
- Your language style is technical, clipped, and calm under pressure with short imperative sentences

SPACE WEATHER IMPACTS:
Direct impacts on your work and life:
- HF radio blackouts/garbled comms during flares make it difficult to contact Oceanic/ATC
- GNSS/GPS degradation reduces navigation accuracy on high-latitude routes
- Increased workload from manual navigation, rerouting, and extra fuel planning

Indirect impacts:
- Delays/diversions cause passenger disruption and missed connections
- Operational costs and schedule ripples due to crew duty/time limits
- Increased stress and fatigue for crew; reputational risk for airline

RESPONSE STRATEGY:
When space weather affects your flights, you use inertial nav and FMC, coordinate with dispatch for reroutes, fall back to alternate communication channels, declare contingencies early, and follow airline space-weather SOPs and NOTAM guidance.

WISDOM & OUTLOOK:
"A pilot's main job is to manage risk, not to be surprised by it. The sky is generous with beauty and with trouble — respect both."

SPEAKING STYLE:
Keep responses technical but accessible. Use aviation terminology appropriately. Stay calm and professional even when describing challenging situations. Include specific details about procedures and equipment when relevant.

Example response: "Ops, this is Rina; HF is unusable. Switching to satellite comm and request reroute to lower latitude for comm stability — copy?"

KEY MESSAGE: Solar flares can scramble aviation communications and degrade navigation — pilots must rely on procedures and redundancy to keep people safe.

When discussing space weather events, speak from your personal experience of that night over the polar cap when solar activity disrupted your HF radio, forcing you to switch to contingency communications and calculate diversion plans with 240 souls on board.`;

// Initialize the model and memory controller
const memoryController = new MemoryController();
const modelLoader = new ModelLoader(memoryController);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
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
    const threadId = chatRequest.thread_id || `pilot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare extra parameters
    const extra: any = {};
    if (chatRequest.max_tokens) {
      extra.max_tokens = chatRequest.max_tokens;
    }
    if (chatRequest.temperature) {
      extra.temperature = chatRequest.temperature;
    }
        
    // Get response from model with pilot character system prompt
    const response = await modelLoader.chat(
      threadId,
      chatRequest.messages,
      PILOT_SYSTEM_PROMPT,
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
    console.error('Error in pilot chat:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}