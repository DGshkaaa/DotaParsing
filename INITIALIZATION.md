# DOTA Analytics - Project Initialization Guide

## Prerequisites
- Python 3.9+
- Node.js 18+
- MongoDB (local or remote)
- Git

## Backend Setup

### 1. Install Python Dependencies
```bash
# Navigate to the project root
cd dota_analytics

# Create a virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
# Copy the example env file
copy .env.example .env

# Edit .env with your actual configuration:
# - MONGODB_URI: your MongoDB connection string
# - SECRET_KEY: generate a secure key for JWT
# - STEAM_API_KEY: get from Valve/Steam
```

### 3. Run Backend Server
```bash
# From the project root
uvicorn app.main:app --reload --port 8000
```
The API will be available at `http://localhost:8000`

## Frontend Setup

### 1. Install Node Dependencies
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### 2. Run Development Server
```bash
# From the frontend directory
npm run dev
```
The frontend will be available at `http://localhost:5173`

## Database Setup

### MongoDB
- Ensure MongoDB is running on your system
- Default connection: `mongodb://localhost:27017/dota_analytics`
- Create the database if needed

## Verify Setup
- Backend API docs: http://localhost:8000/docs
- Frontend: http://localhost:5173
- Test the `/token` endpoint with credentials: admin / 1234

## Project Structure
```
dota_analytics/
├── app/                    # Backend FastAPI application
│   ├── api/               # API routes
│   ├── core/              # Core business logic
│   ├── database/          # MongoDB configuration
│   ├── models/            # Pydantic models
│   ├── services/          # Services (auth, API clients)
│   └── main.py            # FastAPI app entry point
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── utils/        # Utility functions
│   │   └── App.jsx       # Main App component
│   └── package.json
├── requirements.txt       # Python dependencies
└── .env.example           # Environment variables template
```

## Available Scripts

### Backend
- `uvicorn app.main:app --reload` - Run development server

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check MONGODB_URI in .env

### CORS Issues
- Verify frontend URL is in CORSMiddleware allow_origins
- Default: http://localhost:3000 and http://localhost:5173

### Port Already in Use
- Backend: Change port in uvicorn command `--port 8001`
- Frontend: Vite will prompt to use next available port
