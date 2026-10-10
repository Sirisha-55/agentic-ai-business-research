from app.database import Base, engine, ensure_report_activity_columns
from app.models import ResearchReport

# Create all database tables
Base.metadata.create_all(
    bind=engine
)
ensure_report_activity_columns()

# Confirm successful database initialization
print("Database tables created successfully.")
