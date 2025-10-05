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

### Character Endpoints

These endpoints provide access to AI-powered characters who can discuss the impact of space weather from their unique perspectives. Each character is a persona with a specific role and background, offering insights into how solar events affect their field.

-   `GET /api/characters` - Get a list of all available characters and their descriptions.
-   `POST /api/characters/{characterName}` - Interact with a specific character.

**Available Characters:**

*   **Captain Rina Hartono (Pilot)**: `/api/characters/pilot` - Discusses aviation impacts like HF radio blackouts and GPS issues.
*   **Ibrahim Kusuma (Power Grid Operator)**: `/api/characters/power-operator` - Explains how geomagnetic storms affect power grids.
*   **Dr. Elena Park (Astronaut)**: `/api/characters/astronaut` - Shares the risks of radiation for humans in space.
*   **Budi Mendes (Satellite Operator)**: `/api/characters/satellite-operator` - Describes how CMEs can disrupt satellite operations.
*   **Arief Rahman (Emergency Coordinator)**: `/api/characters/emergency-coordinator` - Talks about the challenges for emergency services during space weather events.
*   **Dr. Maya Setiawan (Scientist)**: `/api/characters/scientist` - Provides a research perspective on modeling and forecasting solar activity.

#### Interact with a Character

To chat with a character, send a `POST` request to their specific endpoint.

**Example Request:**

```bash
curl -X POST https://your-app.vercel.app/api/characters/pilot \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What was your most challenging experience with space weather?"}
    ],
    "thread_id": "user-thread-456"
  }'
```

**Example Response:**

```json
{
  "response": "I remember one flight over the Arctic... We lost all high-frequency communication for nearly an hour. We had to rely on our training and satellite phone backups to maintain contact. It's a stark reminder of how vulnerable our systems can be.",
  "thread_id": "user-thread-456",
  "status": "success"
}
```

## Solar Imagery Endpoints (Aurora, CME, SUV)

These endpoints fetch the latest images from NOAA, compose them into an animated GIF server-side (no ffmpeg required), upload the GIF to Cloudinary, and return the CDN URL. The default animation speed is 6 FPS (about 1.5x the earlier 4 FPS).

Notes
- Output format: GIF (returned as `video_url`).
- Frame cap: `maxImages` is clamped internally to 288 to avoid oversized requests.
- Background: kept opaque (no transparency) so imagery is preserved.

### Aurora

- GET latest by hemisphere
  - `GET /api/aurora?hemisphere=north|south`

  CMD-compatible curl
  ```bat
  curl -X GET "https://your-app.vercel.app/api/aurora?hemisphere=north" -H "Accept: application/json"
  ```

- POST to compose a new GIF
  - `POST /api/aurora`
  - Body: `hemisphere` ("north"|"south"), optional `maxImages` (1..1000, clamped to 288)

  CMD-compatible curl
  ```bat
  curl -X POST "https://your-app.vercel.app/api/aurora" -H "Content-Type: application/json" -d "{\"hemisphere\":\"north\",\"maxImages\":60}"
  ```

Sample success response
```json
{
  "success": true,
  "data": {
    "hemisphere": "north",
    "video_url": "https://res.cloudinary.com/<cloud>/image/upload/.../aurora.gif",
    "image_count": 60,
    "created_at": "2025-10-04T00:00:00.000Z",
    "date_range": { "start": "2025-10-03T20:00:00Z", "end": "2025-10-04T00:00:00Z" }
  }
}
```

### CME (Coronal Mass Ejection)

Supported types: `ccor1`, `lasco-c2`, `lasco-c3`

- GET latest by type
  - `GET /api/cme?type=ccor1|lasco-c2|lasco-c3`

  CMD-compatible curl
  ```bat
  curl -X GET "https://your-app.vercel.app/api/cme?type=ccor1" -H "Accept: application/json"
  ```

- POST to compose a new GIF
  - `POST /api/cme`
  - Body: `type` (required), optional `maxImages` (1..1000, clamped to 288)

  CMD-compatible curl
  ```bat
  curl -X POST "https://your-app.vercel.app/api/cme" -H "Content-Type: application/json" -d "{\"type\":\"ccor1\",\"maxImages\":60}"
  ```

Sample success response
```json
{
  "success": true,
  "data": {
    "type": "ccor1",
    "video_url": "https://res.cloudinary.com/<cloud>/image/upload/.../cme.gif",
    "image_count": 60,
    "created_at": "2025-10-04T00:00:00.000Z",
    "date_range": { "start": "2025-10-03T20:00:00Z", "end": "2025-10-04T00:00:00Z" }
  }
}
```

### SUV (SUVI 304 Å)

- GET latest
  - `GET /api/suv`

  CMD-compatible curl
  ```bat
  curl -X GET "https://your-app.vercel.app/api/suv" -H "Accept: application/json"
  ```

- POST to compose a new GIF
  - `POST /api/suv`
  - Body: optional `maxImages` (1..1000, clamped to 288)

  CMD-compatible curl
  ```bat
  curl -X POST "https://your-app.vercel.app/api/suv" -H "Content-Type: application/json" -d "{\"maxImages\":60}"
  ```

Sample success response
```json
{
  "success": true,
  "data": {
    "type": "304",
    "video_url": "https://res.cloudinary.com/<cloud>/image/upload/.../suv.gif",
    "image_count": 60,
    "created_at": "2025-10-04T00:00:00.000Z",
    "date_range": { "start": "2025-10-03T20:00:00Z", "end": "2025-10-04T00:00:00Z" }
  }
}
```

### Local development URLs
- Vercel dev typically listens at http://localhost:3000
- Replace the base URL in curl examples with `http://localhost:3000`

```bat
curl -X GET "http://localhost:3000/api/suv" -H "Accept: application/json"
curl -X POST "http://localhost:3000/api/cme" -H "Content-Type: application/json" -d "{\"type\":\"ccor1\",\"maxImages\":60}"
curl -X POST "http://localhost:3000/api/aurora" -H "Content-Type: application/json" -d "{\"hemisphere\":\"north\",\"maxImages\":60}"
```

## Scheduled Jobs (Cron endpoints)

These endpoints can be invoked by a scheduler to ingest and compose the latest imagery automatically. They require a Bearer token if `CRON_SECRET` is set.

- `POST /api/aurora-cron` (process north and south)
- `POST /api/cme-cron` (process ccor1, lasco-c2, lasco-c3)
- `POST /api/suv-cron` (process SUVI 304)

Enable flags
- `AURORA_FETCH_ENABLED=true`
- `CME_FETCH_ENABLED=true`
- `SUV_FETCH_ENABLED=true`

CMD-compatible curl (with secret)
```bat
curl -X POST "https://your-app.vercel.app/api/aurora-cron" -H "Authorization: Bearer %CRON_SECRET%"
```

## Required Environment Variables (Solar imagery)

Cloudinary (upload and delivery)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

PostgreSQL (any compatible managed DB; Supabase works well)
- Prefer: `DATABASE_URL` (includes credentials and ssl)
- Or specify individually: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

Optional
- `CRON_SECRET` (string) to protect cron endpoints with a bearer token
- `AURORA_FETCH_ENABLED`, `CME_FETCH_ENABLED`, `SUV_FETCH_ENABLED` ("true" to enable cron execution)

Performance and limits
- Default FPS: 6 (faster animation). Currently fixed; contact maintainers to make it configurable.
- `maxImages`: validated to 1..1000 in APIs and clamped to 288 in services.
- All GIF composition is done locally (serverless-safe) using sharp + gif-encoder-2.

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

