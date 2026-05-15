# Rafeeq Call Helper - رفيق مساعد المكالمات الذكي

A smart call helper application with a React frontend and Node.js/Express backend using MongoDB.

## Prerequisites

Before running the project, install the following:

### 1. Node.js
- Download from: https://nodejs.org/
- Choose the **LTS** version
- Run the installer with default settings
- **Restart your computer** after installation

### 2. MongoDB
- Download from: https://www.mongodb.com/try/download/community
- Choose **MongoDB Community Server** for Windows
- During installation:
  - Select **"Complete"** setup type
  - **Check** "Install MongoDB as a Service" (important!)
  - Optionally check "Install MongoDB Compass" for a GUI
- **Restart your computer** after installation

## How to Run

### Fix Security Warning (first time only)
If Windows blocks `start.bat` with a security warning:
1. **Right-click** on `start.bat`
2. Click **Properties**
3. At the bottom, check **"Unblock"**
4. Click **OK**
5. Now double-click `start.bat` to run it

### Start the Project
1. Double-click **`start.bat`**
2. The script will automatically:
   - Check that Node.js and MongoDB are installed
   - Install all dependencies (first run only)
   - Seed the database with default users (first run only)
   - Start the backend and frontend servers

### Access the App
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

### Default Login Credentials
| Role  | Username | Password  |
|-------|----------|-----------|
| Admin | admin    | admin123  |
| User  | user     | user123   |

## Troubleshooting

### "Node.js is NOT installed" error
- Make sure you installed Node.js from https://nodejs.org/
- **Restart your computer** after installing (required for PATH to update)

### "MongoDB is NOT installed" error
- Make sure you installed MongoDB Community Server
- During installation, you must check **"Install MongoDB as a Service"**
- **Restart your computer** after installing

### Backend crashes with "ECONNREFUSED"
- MongoDB service is not running
- Open **Services** (search "Services" in Start menu)
- Find **"MongoDB Server"** and click **Start**
- Or right-click `start.bat` > **Run as administrator**

### Security error when running start.bat
- Right-click `start.bat` > **Properties** > check **"Unblock"** > OK
- Or: right-click `start.bat` > **Run as administrator**

## Project Structure
```
CallHelperFigma/
├── backend/          # Express.js API server
│   ├── models/       # MongoDB models
│   ├── routes/       # API routes
│   ├── services/     # Business logic
│   ├── utils/        # Seed script
│   └── server.js     # Entry point
├── components/       # React components
├── contexts/         # React contexts
├── services/         # Frontend services
├── styles/           # CSS styles
├── App.tsx           # Main React app
├── start.bat         # Windows startup script
└── start.sh          # Linux/Mac startup script
```
