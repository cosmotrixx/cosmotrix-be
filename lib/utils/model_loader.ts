import { GoogleGenerativeAI } from '@google/generative-ai';
import { MemoryController } from '../controllers/memory_controller';
import { ChatMessage } from '../../types';

export class ModelLoader {
  private genAI: GoogleGenerativeAI;
  private modelName: string;
  private memoryController: MemoryController | null;
  private compiledGraph: any;

  constructor(memoryController?: MemoryController) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.modelName = process.env.MODEL_NAME || 'gemini-2.5-flash';
    this.memoryController = memoryController || null;
    
    if (this.memoryController) {
      this.compiledGraph = this.memoryController.compileWorkflow(this.callModel.bind(this));
    }
  }

  private async callModel(state: any) {
    /**
     * Internal method used by LangGraph workflow
     */
    const messages = state.messages;
    
    // Convert messages to Gemini format
    const geminiMessages = this.convertMessagesToGemini(messages);
    
    const model = this.genAI.getGenerativeModel({ 
      model: this.modelName,
      generationConfig: this.getGenerationConfig(state.extra)
    });
    
    const result = await model.generateContent(geminiMessages);
    const response = result.response;
    
    return { 
      messages: [{ 
        role: 'assistant', 
        content: response.text() 
      }] 
    };
  }

  private convertMessagesToGemini(messages: ChatMessage[]): string {
    return messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  private getGenerationConfig(extra?: any) {
    const config: any = {};
    
    if (extra) {
      if (extra.temperature !== undefined) {
        config.temperature = extra.temperature;
      }
      if (extra.max_output_tokens !== undefined) {
        config.maxOutputTokens = extra.max_output_tokens;
      } else if (extra.max_tokens !== undefined) {
        config.maxOutputTokens = extra.max_tokens;
      }
    }
    
    return config;
  }

  async chat(
    tid: string,
    messages: ChatMessage[],
    sysPrompt?: string,
    tools?: any[],
    extra?: any
  ): Promise<string> {
    if (sysPrompt) {
      messages = [{ role: 'system', content: sysPrompt }, ...messages];
    }
    
    if (this.memoryController) {
      const inputData = {
        messages,
        tools,
        extra
      };
      
      const result = await this.memoryController.invokeWithMemory(
        this.compiledGraph,
        inputData,
        tid
      );
      
      return result.messages[result.messages.length - 1].content;
    } else {
      // Direct model call without memory
      const model = this.genAI.getGenerativeModel({ 
        model: this.modelName,
        generationConfig: this.getGenerationConfig(extra)
      });
      
      const geminiMessages = this.convertMessagesToGemini(messages);
      const result = await model.generateContent(geminiMessages);
      
      return result.response.text();
    }
  }

  getModelName(): string {
    return this.modelName;
  }
}