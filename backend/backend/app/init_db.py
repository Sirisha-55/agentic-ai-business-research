from app.database import Base, engine
from app.models import ResearchReport

# Create all database tables
Base.metadata.create_all(
    bind=engine
)

# Confirm successful database initialization
print("Database tables created successfully.")