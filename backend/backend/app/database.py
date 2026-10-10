from sqlalchemy import create_engine
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