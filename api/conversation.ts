import { VercelRequest, VercelResponse } from '@vercel/node';
import { MemoryController } from '../lib/controllers/memory_controller';
import { ConversationHistoryResponse } from '../types';

// Initialize the memory controller
const memoryController = new MemoryController();

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

  try {
    const threadId = req.query.thread_id as string;
    
    if (!threadId) {
      return res.status(400).json({ error: 'thread_id is required' });
    }

    const history = await memoryController.getConversationHistory(threadId);
    
    const response: ConversationHistoryResponse = {
      thread_id: threadId,
      history,
      status: 'success'
    };
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Error retrieving history:', error);
    return res.status(500).json({ error: `Error retrieving history: ${error instanceof Error ? error.message : String(error)}` });
  }
}