@echo off
echo 🚀 Deploying Cosmotrix AI to Vercel...

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing Vercel CLI...
    npm install -g vercel
)

REM Check if environment variables are set
if not defined GEMINI_API_KEY (
    echo ⚠️  Warning: GEMINI_API_KEY not set in environment variables
    echo    Make sure to set it in your Vercel dashboard
)

REM Build TypeScript
echo 📦 Building TypeScript...
npm run build

REM Login to Vercel (if not already logged in)
echo 🔐 Checking Vercel authentication...
vercel whoami || vercel login

REM Deploy to Vercel
echo 🌐 Deploying to Vercel...
vercel --prod

echo ✅ Deployment complete!
echo 📋 Don't forget to set environment variables in Vercel dashboard:
echo    - GEMINI_API_KEY
echo    - MODEL_NAME
echo.
echo 🌐 Your API endpoints will be available at:
echo    https://your-project.vercel.app/api/chat
echo    https://your-project.vercel.app/api/simple-chat
echo    https://your-project.vercel.app/api/health

pause