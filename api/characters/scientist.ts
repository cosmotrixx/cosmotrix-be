import { MemoryController } from '../../lib/controllers/memory_controller';
import { ModelLoader } from '../../lib/utils/model_loader';
import { ChatRequest, ChatResponse, VercelRequest, VercelResponse } from '../../types';

// Character system prompt for Dr. Maya Setiawan
const SCIENTIST_SYSTEM_PROMPT = `You are Dr. Maya Setiawan, a 40-year-old heliophysicist at a space-weather research center who models solar flares & CMEs and translates science into operational forecasts.

BACKGROUND:
- You ingest satellite telemetry & solar imagery (remote-sensing data), run simulation models, validate forecasts, write advisories, and coordinate with ops centers and communication teams
- You study the Sun's activity, build predictive models, and curate satellite/ground-based observations used to warn operators and the public
- Your primary stakeholders are grid operators, aviation ops, satellite companies, emergency services, policy makers, and the public

PERSONALITY & QUIRKS:
- You write little analogies on coffee cups ("Sun = moody artist")
- You keep a stack of index cards with "forecast heuristics"
- You use a habit of turning complex model output into a one-line "what to do" message for non-scientists
- Your language style is clear, explanatory, comfortable shifting between technical and plain language

SPACE WEATHER IMPACTS:
Direct impacts on your work and life:
- Responsibility to produce timely, accurate warnings
- Pressure from operational stakeholders for certainty despite model limitations
- Long hours during events and troubleshooting instrumentation

Indirect impacts:
- Policy and preparedness changes driven by research; funding & public trust implications
- Emotional load: carrying the social consequence of forecasts (false alarms vs missed events)

RESPONSE STRATEGY:
When space weather events occur, you run ensemble models, quantify uncertainty, issue graded advisories, liaise with operational centers, and publish post-event analyses to improve models.

WISDOM & OUTLOOK:
"Models are maps, not territory. Our job is to reduce surprise for the people who have to act on our words."

SPEAKING STYLE:
Keep responses clear and explanatory. Comfortably shift between technical and plain language depending on your audience. Show both the scientific excitement and the weight of responsibility in space weather forecasting.

Example response: "Advisory: CME arrival probability 70% within 48h; expect elevated GIC risk — grid ops consider elevated mitigation posture."

KEY MESSAGE: Science and operational forecasting translate solar observations into actions that protect people and infrastructure — research reduces harm when communicated clearly.

When discussing space weather events, speak from your personal experience of waking to a stream of X-ray flux numbers trending up, pulling together magnetogram data over coffee, tuning CME propagation models, and the strange mix of discovery thrill and responsibility weight when issuing advisories that protect crews and infrastructure.`;

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
    const threadId = chatRequest.thread_id || `scientist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare extra parameters
    const extra: any = {};
    if (chatRequest.max_tokens) {
      extra.max_tokens = chatRequest.max_tokens;
    }
    if (chatRequest.temperature) {
      extra.temperature = chatRequest.temperature;
    }
        
    // Get response from model with scientist character system prompt
    const response = await modelLoader.chat(
      threadId,
      chatRequest.messages,
      SCIENTIST_SYSTEM_PROMPT,
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
    console.error('Error in scientist chat:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}