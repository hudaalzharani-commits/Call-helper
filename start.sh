#!/bin/bash

# Rafeeq Call Helper - Complete Startup Script
# This script starts both backend and frontend servers

echo "=========================================="
echo "  رفيق - مساعد المكالمات الذكي"
echo "  Rafeeq Call Helper with MongoDB"
echo "=========================================="
echo ""

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running!"
    echo "Starting MongoDB..."
    sudo systemctl start mongod
    sleep 2
    if ! pgrep -x "mongod" > /dev/null; then
        echo "❌ Failed to start MongoDB"
        echo "Please start it manually: sudo systemctl start mongod"
        exit 1
    fi
    echo "✅ MongoDB started successfully"
fi
echo "✅ MongoDB is running"
echo ""

# Check if frontend node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install frontend dependencies"
        exit 1
    fi
    echo "✅ Frontend dependencies installed"
    echo ""
fi

# Check if backend node_modules exists
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
    cd ..
    echo "✅ Backend dependencies installed"
    echo ""
fi

# Check if database is seeded
echo "💡 Checking database..."
if ! mongosh --quiet --eval "db.getMongo().getDBNames().indexOf('rafeeq_db') > -1" rafeeq_db > /dev/null 2>&1; then
    echo "⚠️  Database not seeded. Seeding now..."
    cd backend
    npm run seed
    cd ..
    echo ""
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "🚀 Starting Backend API Server..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 3

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start. Check backend.log for errors."
    exit 1
fi
echo "✅ Backend running on http://localhost:5000"
echo ""

echo "🚀 Starting Frontend Development Server..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║                                            ║"
echo "║   ✅  All servers are running!            ║"
echo "║                                            ║"
echo "║   🌐  Frontend: http://localhost:3000     ║"
echo "║   🔌  Backend:  http://localhost:5000     ║"
echo "║   🗄️   MongoDB: Running                    ║"
echo "║                                            ║"
echo "║   👤  Login: admin / admin123             ║"
echo "║                                            ║"
echo "║   Press Ctrl+C to stop all servers        ║"
echo "║                                            ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Wait for user interrupt
wait
