import { VercelRequest, VercelResponse } from '@vercel/node';
import { MemoryController } from '../lib/controllers/memory_controller';
import { ModelLoader } from '../lib/utils/model_loader';
import { SimpleRequest, ChatResponse } from '../types';
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
    const simpleRequest: SimpleRequest = req.body;
    
    // Validate required fields
    if (!simpleRequest.message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate thread_id if not provided
    const threadId = simpleRequest.thread_id || uuidv4();
    
    // Convert to messages format
    const messages = [{ role: 'user', content: simpleRequest.message }];
    
    // Get response from model
    const response = await modelLoader.chat(
      threadId,
      messages,
      simpleRequest.system_prompt
    );
    
    const chatResponse: ChatResponse = {
      response,
      thread_id: threadId,
      status: 'success'
    };
    
    return res.status(200).json(chatResponse);
    
  } catch (error) {
    console.error('Simple chat error:', error);
    return res.status(500).json({ error: `Chat error: ${error instanceof Error ? error.message : String(error)}` });
  }
}