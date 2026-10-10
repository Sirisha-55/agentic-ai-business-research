from datetime import datetime

from sqlalchemy import Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ResearchReport(Base):
    __tablename__ = "research_reports"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    user_query: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    final_report: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    agent_results: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    activity_events: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.now,
        nullable=False
    )
