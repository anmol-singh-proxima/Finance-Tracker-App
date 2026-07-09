"""SQLAlchemy engine/session. In production this points at RDS Proxy; in local
dev, at the docker-compose `postgres` service — same code path either way. The
DSN and target schema are assembled from the separate ``DB_*`` env vars in
``app.core.config`` (12-factor config, TR-ENV-02)."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    connect_args={
        "connect_timeout": settings.db_connect_timeout_seconds,
        # Route all queries to the configured schema without qualifying every
        # table name in the models.
        "options": f"-csearch_path={settings.db_schema}",
    },
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
