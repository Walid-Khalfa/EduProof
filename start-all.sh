#!/bin/bash
# Start both frontend and backend servers

echo "🚀 Starting EduProof Full Stack..."

# Start backend in background
echo "📡 Starting backend API server..."
cd server && pnpm tsx watch index.ts &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend dev server..."
cd ..
pnpm dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
