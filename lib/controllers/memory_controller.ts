// Simple in-memory storage for conversation history
interface ConversationMemory {
  [threadId: string]: any[];
}

export class MemoryController {
  private memory: ConversationMemory;

  constructor() {
    this.memory = {};
    console.log('MemoryController initialized');
  }

  compileWorkflow(callModelFn: (state: any) => any) {
    console.log('Compiling Workflow');
    // Return a simple wrapper that maintains conversation state
    return {
      invoke: async (inputData: any, config: any) => {
        const threadId = config.configurable.thread_id;
        
        // Get existing conversation or create new one
        if (!this.memory[threadId]) {
          this.memory[threadId] = [];
        }
        
        // Add new messages to conversation history
        const existingMessages = this.memory[threadId];
        const allMessages = [...existingMessages, ...inputData.messages];
        
        // Call the model with all messages
        const result = await callModelFn({
          messages: allMessages,
          tools: inputData.tools,
          extra: inputData.extra
        });
        
        // Store the result in memory
        this.memory[threadId] = [...allMessages, ...result.messages];
        
        return result;
      }
    };
  }

  async invokeWithMemory(compiledGraph: any, inputData: any, threadId: string) {
    /**
     * Proper way to use memory with LangGraph - let the compiled graph handle checkpointing
     */
    const config = { configurable: { thread_id: threadId } };
    return await compiledGraph.invoke(inputData, config);
  }

  async getConversationHistory(threadId: string): Promise<any[]> {
    /**
     * Get the conversation history for a thread
     */
    try {
      return this.memory[threadId] || [];
    } catch (error) {
      console.error(`Error loading conversation history: ${error}`);
      return [];
    }
  }
}