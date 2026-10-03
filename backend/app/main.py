from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router
from app.database import Base, engine
from app import models


# ---------------------------------------------------------
# FASTAPI APPLICATION
# ---------------------------------------------------------

app = FastAPI(
    title="Agentic AI Business Research System",
    description="Backend API for AI-powered business research and analysis",
    version="1.0.0"
)


# ---------------------------------------------------------
# DATABASE TABLE CREATION
# ---------------------------------------------------------

# Create all SQLAlchemy tables if they do not already exist.
# This is useful when deploying the application with a new
# PostgreSQL database on Render.

Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------
# CORS CONFIGURATION
# ---------------------------------------------------------

# Allow the frontend to communicate with the FastAPI backend.
# Local development and the deployed Vercel frontend are allowed.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local Next.js development
        "http://localhost:3000",
        "http://127.0.0.1:3000",

        # Local React/Vite development
        "http://localhost:5173",
        "http://127.0.0.1:5173",

        # Production Vercel frontend
        "https://agentic-ai-business-research.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ---------------------------------------------------------
# API ROUTES
# ---------------------------------------------------------

# Register all business research API routes.
app.include_router(router)


# ---------------------------------------------------------
# HOME ENDPOINT
# ---------------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Agentic AI Business Research API is running"
    }


# ---------------------------------------------------------
# HEALTH ENDPOINT
# ---------------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }