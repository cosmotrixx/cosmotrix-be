# Cosmotrix AI - Serverless TypeScript Backend

A modular serverless backend for AI Agents written in TypeScript, designed to run on Vercel.

## Features

- **Serverless Architecture**: Built for Vercel serverless functions
- **Google Gemini Integration**: Powered by Google's Generative AI
- **Memory Management**: Conversation history tracking per thread
- **Multiple Endpoints**: Chat, summarization, code explanation
- **TypeScript**: Fully typed for better development experience
- **CORS Enabled**: Ready for frontend integration

## API Endpoints

### General Chat
- `POST /api/chat` - Full-featured chat with memory support
- `POST /api/simple-chat` - Simple single-message chat

### Utilities
- `POST /api/summarize` - Text summarization
- `POST /api/code/explain` - Code explanation

### Memory Management
- `GET /api/conversation?thread_id={id}` - Get conversation history

### Health Check
- `GET /api/health` - Service health status

## Setup

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
MODEL_NAME=gemini-2.5-flash
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Development

```bash
npm run dev
```

This will start the Vercel development server.

### 4. Deployment

#### Deploy to Vercel

```bash
npm run deploy
```

#### Set Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `MODEL_NAME`: gemini-2.5-flash (or your preferred model)

## API Usage Examples

### Chat Request

```bash
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "thread_id": "user123",
    "temperature": 0.7,
    "max_tokens": 1000
  }'
```

### Simple Chat Request

```bash
curl -X POST https://your-app.vercel.app/api/simple-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain quantum computing",
    "thread_id": "user123"
  }'
```

### Summarize Text

```bash
curl -X POST https://your-app.vercel.app/api/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Your long text to summarize here...",
    "thread_id": "user123"
  }'
```

### Explain Code

```bash
curl -X POST https://your-app.vercel.app/api/code/explain \
  -H "Content-Type: application/json" \
  -d '{
    "message": "function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }",
    "thread_id": "user123"
  }'
```

### Get Conversation History

```bash
curl -X GET https://your-app.vercel.app/api/conversation?thread_id=user123
```

## Response Format

All endpoints return JSON responses with the following structure:

```json
{
  "response": "AI generated response",
  "thread_id": "user123",
  "status": "success"
}
```

Error responses:

```json
{
  "error": "Error description",
  "status": "error"
}
```

## Project Structure

```
├── api/                    # Vercel serverless functions
│   ├── chat.ts            # Main chat endpoint
│   ├── simple-chat.ts     # Simple chat endpoint
│   ├── conversation.ts    # Get conversation history
│   ├── summarize.ts       # Text summarization
│   ├── health.ts          # Health check
│   ├── index.ts           # Root endpoint
│   └── code/
│       └── explain.ts     # Code explanation
├── lib/                   # Core library
│   ├── controllers/
│   │   └── memory_controller.ts
│   ├── models/
│   │   └── config.ts
│   └── utils/
│       └── model_loader.ts
├── types/                 # TypeScript type definitions
│   └── index.ts
├── package.json
├── tsconfig.json
├── vercel.json           # Vercel configuration
└── README.md
```

## Migration from Python FastAPI

This TypeScript version maintains API compatibility with the original Python FastAPI backend while adding:

- Serverless architecture for better scalability
- Built-in deployment configuration for Vercel
- Enhanced type safety with TypeScript
- Simplified dependencies (no heavy ML frameworks)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Google Gemini API key
```

3. Start the server:
```bash
python -m uvicorn main:app --reload
```

The API will be available at `http://localhost:8000` with interactive documentation at `http://localhost:8000/docs`.

## 🔧 Environment Configuration

Refer to `.env.example` for required environment variables:


## 📡 API Endpoints

### Core Endpoints

#### `GET /`
**Root endpoint** - Server status check
```bash
curl http://localhost:8000/
```

**Response:**
```json
{
  "message": "LLM Backend Utilities is running."
}
```

#### `GET /api/health`
**Health check** - System health status
```bash
curl http://localhost:8000/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "model": "gemini-1.5-flash",
  "timestamp": "2025-10-02T10:30:45Z"
}
```

### Chat Endpoints

#### `POST /api/simple-chat`
**Simple chat** - Single message conversation with optional memory

**Request Body:**
```json
{
  "message": "Hello! Please introduce yourself.",
  "system_prompt": "You are a helpful AI assistant.",
  "thread_id": "optional-thread-id",
  "temperature": 0.7,
  "max_tokens": 200
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/simple-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is machine learning?",
    "system_prompt": "You are an expert in AI and machine learning.",
    "temperature": 0.7
  }'
```

**Response:**
```json
{
  "response": "Machine learning is a subset of artificial intelligence...",
  "thread_id": "thread_abc123",
  "status": "success",
  "model": "gemini-1.5-flash"
}
```

#### `POST /api/chat`
**Advanced chat** - Multi-turn conversation with full message history

**Request Body:**
```json
{
  "messages": [
    {"role": "user", "content": "My name is Sarah"},
    {"role": "assistant", "content": "Nice to meet you Sarah!"},
    {"role": "user", "content": "What's my name?"}
  ],
  "system_prompt": "You are a helpful assistant with perfect memory.",
  "thread_id": "optional-thread-id",
  "temperature": 0.7,
  "max_tokens": 500
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "I am working on a Python project"},
      {"role": "assistant", "content": "That sounds interesting! What kind of Python project?"},
      {"role": "user", "content": "What did I just tell you I was working on?"}
    ],
    "temperature": 0.3
  }'
```

### Specialized AI Features

#### `POST /api/summarize`
**Text summarization** - Summarize long text content

**Request Body:**
```json
{
  "message": "Long text content to summarize...",
  "system_prompt": "Provide a concise summary in 2-3 sentences.",
  "thread_id": "optional-thread-id"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Artificial Intelligence has revolutionized numerous industries by enabling machines to perform tasks that traditionally required human intelligence. Machine learning algorithms analyze vast datasets to identify patterns without explicit programming..."
  }'
```

**Response:**
```json
{
  "summary": "AI has transformed industries through machine learning and pattern recognition...",
  "thread_id": "thread_def456",
  "status": "success"
}
```

#### `POST /api/code/explain`
**Code explanation** - Explain code snippets

**Request Body:**
```json
{
  "message": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
  "system_prompt": "Explain this code step by step for beginners.",
  "thread_id": "optional-thread-id"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/code/explain \
  -H "Content-Type: application/json" \
  -d '{
    "message": "import pandas as pd\ndf = pd.read_csv(\"data.csv\")\nprint(df.head())",
    "system_prompt": "Explain what this Python code does."
  }'
```

**Response:**
```json
{
  "explanation": "This code imports the pandas library, reads a CSV file into a DataFrame, and displays the first 5 rows...",
  "thread_id": "thread_ghi789",
  "status": "success"
}
```

### Memory Management

#### `GET /api/conversation/{thread_id}`
**Get conversation history** - Retrieve chat history for a specific thread

**Example:**
```bash
curl http://localhost:8000/api/conversation/thread_abc123
```

**Response:**
```json
{
  "thread_id": "thread_abc123",
  "history": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there! How can I help you today?"},
    {"role": "user", "content": "Tell me about AI"},
    {"role": "assistant", "content": "AI stands for Artificial Intelligence..."}
  ],
  "message_count": 4,
  "status": "success"
}
```

