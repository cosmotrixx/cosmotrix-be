export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  thread_id?: string;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface SimpleRequest {
  message: string;
  thread_id?: string;
  system_prompt?: string;
}

export interface ChatResponse {
  response: string;
  thread_id: string;
  status: string;
}

export interface ConversationHistoryResponse {
  thread_id: string;
  history: any[];
  status: string;
}

export interface HealthResponse {
  status: string;
  model: string;
  memory: string;
}

export interface ModelConfig {
  enable_reasoning: boolean;
  reasoning: {
    effort: 'low' | 'medium' | 'high';
    summary: 'detailed' | 'auto' | null;
  };
  extra: {
    google_api_key?: string;
    model?: string;
  };
}

export interface VercelRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  query: Record<string, string | string[]>;
}

export interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (object: any) => VercelResponse;
  send: (body: any) => VercelResponse;
  setHeader: (name: string, value: string) => VercelResponse;
}