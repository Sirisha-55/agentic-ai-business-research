from app.database import SessionLocal
from app.models import ResearchReport

# Create a database session
db = SessionLocal()

try:
    # Check whether the research_reports table is accessible
    count = db.query(ResearchReport).count()

    print("Database connection successful.")
    print("Research reports count:", count)

finally:
    # Always close the database session
    db.close()
    