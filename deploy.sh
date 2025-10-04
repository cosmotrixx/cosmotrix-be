#!/bin/bash

# Deployment script for Cosmotrix AI Serverless Backend

echo "🚀 Deploying Cosmotrix AI to Vercel..."

# Check if environment variables are set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  Warning: GEMINI_API_KEY not set in environment variables"
    echo "   Make sure to set it in your Vercel dashboard"
fi

# Build TypeScript
echo "📦 Building TypeScript..."
npm run build

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "📋 Don't forget to set environment variables in Vercel dashboard:"
echo "   - GEMINI_API_KEY"
echo "   - MODEL_NAME"