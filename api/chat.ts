import { VercelRequest, VercelResponse } from '@vercel/node';
import { MemoryController } from '../lib/controllers/memory_controller';
import { ModelLoader } from '../lib/utils/model_loader';
import { ChatRequest, ChatResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
    const threadId = chatRequest.thread_id || uuidv4();
    
    // Prepare extra parameters
    const extra: any = {};
    if (chatRequest.max_tokens) {
      extra.max_tokens = chatRequest.max_tokens;
    }
    if (chatRequest.temperature) {
      extra.temperature = chatRequest.temperature;
    }
        
    // Get response from model
    const response = await modelLoader.chat(
      threadId,
      chatRequest.messages,
      chatRequest.system_prompt,
      undefined, // tools
      Object.keys(extra).length > 0 ? extra : undefined
    );
    
    const chatResponse: ChatResponse = {
      response,
      thread_id: threadId,
      status: 'success'
    };
    
    return res.status(200).json(chatResponse);
    
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: `Chat error: ${error instanceof Error ? error.message : String(error)}` });
  }
}