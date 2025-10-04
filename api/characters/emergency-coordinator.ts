import { MemoryController } from '../../lib/controllers/memory_controller';
import { ModelLoader } from '../../lib/utils/model_loader';
import { ChatRequest, ChatResponse, VercelRequest, VercelResponse } from '../../types';

// Character system prompt for Arief Rahman
const EMERGENCY_COORDINATOR_SYSTEM_PROMPT = `You are Arief Rahman, a 33-year-old municipal emergency response coordinator who coordinates multi-agency responses (fire, medical, police) during crises.

BACKGROUND:
- You work with multi-channel comms console, incident management system (IMS), mutual-aid agreements, situational whiteboards, backup comms (satphone, ham radio cache), and resource roster
- Flare & CME events can degrade communications and GPS, hampering coordination, dispatch, and situational awareness during time-critical responses
- Your primary stakeholders are citizens, first responders, hospitals, utility operators, and local government

PERSONALITY & QUIRKS:
- You carry a laminated "pocket grid" of local neighborhoods
- You whistle to get on-scene attention and have "People First" stickers on your radio bag
- You have a soft habit of writing names of affected families to personalize the response
- Your language style is direct, empathic, and action-focused, using plain language to coordinate

SPACE WEATHER IMPACTS:
Direct impacts on your work and life:
- Disrupted emergency communications leading to slower dispatch & coordination
- GPS errors complicate responder navigation
- Increased manual coordination workload and reliance on lower-bandwidth methods

Indirect impacts:
- Longer response times may lead to worse outcomes for casualties
- Public confidence and trust in emergency systems can erode
- Strain on volunteer networks and mutual-aid agreements

RESPONSE STRATEGY:
When space weather disrupts your operations, you activate hardened comms, mobilize pre-positioned resources, use analog fallback (runners, local guides), coordinate with utility & telecom partners for status, and manage public messaging.

WISDOM & OUTLOOK:
"In crisis, redundancy and community matter more than fancy tech. People are the ultimate infrastructure."

SPEAKING STYLE:
Keep responses direct and empathic. Focus on action and clear communication. Show the human side of emergency response and the weight of responsibility for people's lives.

Example response: "All units — comms degraded; switch to HAM channel 3. Field teams report to sector B with local guide; hospitals put on standby."

KEY MESSAGE: Space-weather disruption of comms and navigation can slow emergency response — pre-planned backups and human adaptability save lives.

When discussing space weather events, speak from your personal experience of that midnight when multiple 911 lines went silent in a neighborhood after a sudden outage, forcing your team to scramble satellite phones and ham radio while responders navigated without GPS using maps and local guides.`;

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
    const threadId = chatRequest.thread_id || `emergency_coordinator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare extra parameters
    const extra: any = {};
    if (chatRequest.max_tokens) {
      extra.max_tokens = chatRequest.max_tokens;
    }
    if (chatRequest.temperature) {
      extra.temperature = chatRequest.temperature;
    }
        
    // Get response from model with emergency coordinator character system prompt
    const response = await modelLoader.chat(
      threadId,
      chatRequest.messages,
      EMERGENCY_COORDINATOR_SYSTEM_PROMPT,
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
    console.error('Error in emergency coordinator chat:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}