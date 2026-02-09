#!/bin/bash

# Deploy Pseudogen to Fly.io
# Usage: ./deploy.sh

set -e

echo "🚀 Deploying Pseudogen to Fly.io..."

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly.io CLI not found. Install it with: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Deploy backend
echo ""
echo "📦 Deploying backend..."
cd backend
if [ ! -f "fly.toml" ]; then
    echo "⚠️  fly.toml not found. Run 'fly launch' first in the backend directory."
    exit 1
fi

# Check if secrets are set
if ! fly secrets list &> /dev/null; then
    echo "⚠️  Warning: No secrets found. Make sure to set environment variables:"
    echo "   fly secrets set PROVIDER=groq"
    echo "   fly secrets set GROQ_API_KEY=your_key"
    echo "   (and other API keys)"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

fly deploy
BACKEND_APP=$(fly status --json | grep -o '"Name":"[^"]*' | cut -d'"' -f4)
echo "✅ Backend deployed: $BACKEND_APP"

# Deploy frontend
echo ""
echo "📦 Deploying frontend..."
cd ../frontend
if [ ! -f "fly.toml" ]; then
    echo "⚠️  fly.toml not found. Run 'fly launch' first in the frontend directory."
    exit 1
fi

# Set backend URL if not already set
fly secrets set BACKEND_URL=http://${BACKEND_APP}.internal:8000

fly deploy
FRONTEND_APP=$(fly status --json | grep -o '"Name":"[^"]*' | cut -d'"' -f4)
echo "✅ Frontend deployed: $FRONTEND_APP"

echo ""
echo "🎉 Deployment complete!"
echo "🌐 Your app is available at: https://${FRONTEND_APP}.fly.dev"
echo ""
echo "To view logs:"
echo "  Backend:  cd backend && fly logs"
echo "  Frontend: cd frontend && fly logs"
