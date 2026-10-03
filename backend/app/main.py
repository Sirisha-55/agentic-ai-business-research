from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router


# ---------------------------------------------------------
# FASTAPI APPLICATION
# ---------------------------------------------------------

app = FastAPI(
    title="Agentic AI Business Research System",
    description="Backend API for AI-powered business research and analysis",
    version="1.0.0"
)


# ---------------------------------------------------------
# CORS CONFIGURATION
# ---------------------------------------------------------

# Allow the frontend to communicate with the FastAPI backend.
# Next.js frontend runs on port 3000.
# Port 5173 is also allowed for local React/Vite development.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
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