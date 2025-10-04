import { ModelConfig } from '../../types';

export class Config {
  // Enable/disable reasoning for reasoning models
  static enable_reasoning: boolean = true;
  
  static reasoning = {
    effort: 'medium' as const,  // 'low', 'medium', or 'high'
    summary: 'auto' as const,  // 'detailed', 'auto', or null
  };

  static extra = {
    google_api_key: process.env.GEMINI_API_KEY,
    model: process.env.MODEL_NAME,
  };

  static getConfig(): ModelConfig {
    return {
      enable_reasoning: this.enable_reasoning,
      reasoning: this.reasoning,
      extra: this.extra
    };
  }
}