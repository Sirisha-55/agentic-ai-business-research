from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings


# Create the PostgreSQL database engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=False
)


# Create a session factory for database operations
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)


# Base class for all SQLAlchemy database models
class Base(DeclarativeBase):
    pass


# Create a database session
def get_db():

    # Open a database session
    db = SessionLocal()

    try:
        # Provide the session to the caller
        yield db

    finally:
        # Always close the session
        db.close()


def ensure_report_activity_columns():
    """Add activity storage to existing report tables without data loss."""
    with engine.begin() as connection:
        if engine.dialect.name == "postgresql":
            connection.execute(text(
                "ALTER TABLE research_reports "
                "ADD COLUMN IF NOT EXISTS agent_results JSON"
            ))
            connection.execute(text(
                "ALTER TABLE research_reports "
                "ADD COLUMN IF NOT EXISTS activity_events JSON"
            ))
            return

        columns = {
            column["name"]
            for column in inspect(connection).get_columns("research_reports")
        }
        if "agent_results" not in columns:
            connection.execute(text(
                "ALTER TABLE research_reports ADD COLUMN agent_results JSON"
            ))
        if "activity_events" not in columns:
            connection.execute(text(
                "ALTER TABLE research_reports ADD COLUMN activity_events JSON"
            ))
