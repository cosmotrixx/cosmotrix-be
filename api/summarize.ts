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
      'You are a helpful assistant that provides concise summaries. Summarize the following text in a clear and comprehensive manner.';
    
    const messages = [{ role: 'user', content: simpleRequest.message }];
    
    const response = await modelLoader.chat(
      threadId,
      messages,
      systemPrompt
    );
    
    const chatResponse: ChatResponse = {
      response,
      thread_id: threadId,
      status: 'success'
    };
    
    // Change response field name to match original API
    return res.status(200).json({
      summary: response,
      thread_id: threadId,
      status: 'success'
    });
    
  } catch (error) {
    console.error('Summarization error:', error);
    return res.status(500).json({ error: `Summarization error: ${error instanceof Error ? error.message : String(error)}` });
  }
}