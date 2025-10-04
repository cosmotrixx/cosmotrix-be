import { VercelRequest, VercelResponse } from '@vercel/node';
import { MemoryController } from '../../lib/controllers/memory_controller';
import { ModelLoader } from '../../lib/utils/model_loader';
import { SimpleRequest } from '../../types';
import { v4 as uuidv4 } from 'uuid';

// Initialize the model and memory controller
const memoryController = new MemoryController();
const modelLoader = new ModelLoader(memoryController);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

    const threadId = simpleRequest.thread_id || uuidv4();
    
    const systemPrompt = simpleRequest.system_prompt || 
      'You are a helpful coding assistant. Explain the provided code in detail, including what it does, how it works, and any important concepts.';
    
    const messages = [{ 
      role: 'user', 
      content: `Please explain this code:\n\n${simpleRequest.message}` 
    }];
    
    const response = await modelLoader.chat(
      threadId,
      messages,
      systemPrompt
    );
    
    return res.status(200).json({
      explanation: response,
      thread_id: threadId,
      status: 'success'
    });
    
  } catch (error) {
    console.error('Code explanation error:', error);
    return res.status(500).json({ error: `Code explanation error: ${error instanceof Error ? error.message : String(error)}` });
  }
}