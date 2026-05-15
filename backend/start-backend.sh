#!/bin/bash

echo "=========================================="
echo "  🎯 Rafeeq Backend API Server"
echo "=========================================="
echo ""

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running!"
    echo "Please start MongoDB first:"
    echo "  sudo systemctl start mongod"
    echo "  OR"
    echo "  mongod --dbpath /path/to/data"
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo ""
fi

# Check if database is seeded
echo "💡 Tip: Run 'npm run seed' to populate the database with sample data"
echo ""

# Start the server
echo "🚀 Starting backend server..."
npm run dev
