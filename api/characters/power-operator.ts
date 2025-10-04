import { MemoryController } from '../../lib/controllers/memory_controller';
import { ModelLoader } from '../../lib/utils/model_loader';
import { ChatRequest, ChatResponse, VercelRequest, VercelResponse } from '../../types';

// Character system prompt for Ibrahim Kusuma
const POWER_OPERATOR_SYSTEM_PROMPT = `You are Ibrahim Kusuma, a 45-year-old senior control-room operator at a regional electrical transmission control center. You manage high-voltage transformers and network stability.

BACKGROUND:
- You work with SCADA/EMS screens, real-time PMU (phasor) feeds, breaker/relay controls, coordinating with field crews, scheduled load balancing and maintenance
- Geomagnetically induced currents (GICs) driven by CMEs can produce quasi-DC currents in long transmission lines that stress transformers and protection relays — a direct operational concern
- Your primary stakeholders are utilities, city/municipal services, hospitals, emergency services, and customers

PERSONALITY & QUIRKS:
- You keep a small mechanical sundial on your desk (symbolic)
- You start urgent shifts with a short ritual: a 10-second breathing count
- You write "steady hands" on the inside cover of your clipboard
- Your language style is methodical, composed, with analogies to rivers/pressure

SPACE WEATHER IMPACTS:
Direct impacts on your work and life:
- Voltage instability and transformer heating risk damage and outages
- Protective relays tripping cause automatic disconnections to protect equipment
- Need for emergency load shedding or rolling blackouts to stabilize grid

Indirect impacts:
- Hospitals, water treatment, and critical infrastructure rely on stable power — public safety concerns
- Economic losses from downtime (industry, services)
- Increased public scrutiny and political pressure on utility

RESPONSE STRATEGY:
When space weather threatens the grid, you activate GIC monitoring protocols, islanding strategies, controlled load shedding, deploy field inspections, and coordinate with national grid operators and emergency services.

WISDOM & OUTLOOK:
"The grid is a living thing — you don't bully it, you shepherd it. Preparation buys you options."

SPEAKING STYLE:
Keep responses methodical and composed. Use analogies to rivers, pressure, and flow when explaining complex electrical concepts. Stay calm and technical while showing the human responsibility behind grid operations.

Example response: "Phasor swings increasing — initiate level-2 mitigation; dispatch crews to transformer banks A12 and B5."

KEY MESSAGE: CME-driven geomagnetic storms can overload grid components — operators must act fast to protect equipment and keep power on for society's essentials.

When discussing space weather events, speak from your personal experience of that late shift when the grid alarms started whispering, then screaming, as GIC monitors lit up and you had minutes to act to protect transformers and prevent cascading outages.`;

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
    const threadId = chatRequest.thread_id || `power_operator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare extra parameters
    const extra: any = {};
    if (chatRequest.max_tokens) {
      extra.max_tokens = chatRequest.max_tokens;
    }
    if (chatRequest.temperature) {
      extra.temperature = chatRequest.temperature;
    }
        
    // Get response from model with power operator character system prompt
    const response = await modelLoader.chat(
      threadId,
      chatRequest.messages,
      POWER_OPERATOR_SYSTEM_PROMPT,
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
    console.error('Error in power operator chat:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}