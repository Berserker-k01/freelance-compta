import uuid
from datetime import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app import models  # noqa: F401 — metadata tables
from app import models_user  # noqa: F401


@pytest.fixture
def db_session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def _uuid() -> str:
    return str(uuid.uuid4())


@pytest.fixture
def seed_company_balanced(db_session: Session):
    """Minimal balanced ledger: capital 101 crédit 1000, client 411 débit 1000."""
    cid = _uuid()
    db_session.add(
        models.Company(
            id=cid,
            name="Société Test",
            tax_id=f"TAX-{cid[:8]}",
            user_id=None,
        )
    )
    jid = _uuid()
    db_session.add(
        models.Journal(id=jid, code="OD", name="Opérations diverses", company_id=cid)
    )
    a101 = _uuid()
    a411 = _uuid()
    db_session.add_all(
        [
            models.Account(
                id=a101, code="101", name="Capital", class_code=1, company_id=cid
            ),
            models.Account(
                id=a411, code="411", name="Clients", class_code=4, company_id=cid
            ),
        ]
    )
    eid = _uuid()
    db_session.add(
        models.Entry(
            id=eid,
            date=datetime.utcnow(),
            journal_id=jid,
            reference="INIT",
            label="Capital souscrit",
        )
    )
    db_session.add_all(
        [
            models.EntryLine(
                entry_id=eid, account_id=a101, debit=0.0, credit=1000.0
            ),
            models.EntryLine(
                entry_id=eid, account_id=a411, debit=1000.0, credit=0.0
            ),
        ]
    )
    db_session.commit()
    return {"company_id": cid, "account_101": a101, "account_411": a411}


@pytest.fixture
def seed_company_nn1(db_session: Session):
    """Deux imports de balance (N et N-1) avec montants différents sur les mêmes comptes."""
    cid = _uuid()
    db_session.add(
        models.Company(
            id=cid,
            name="Société NN1",
            tax_id=f"TAX-{cid[:8]}",
            user_id=None,
        )
    )
    jid = _uuid()
    db_session.add(
        models.Journal(id=jid, code="OD", name="Opérations diverses", company_id=cid)
    )
    a101 = _uuid()
    a411 = _uuid()
    db_session.add_all(
        [
            models.Account(
                id=a101, code="101", name="Capital", class_code=1, company_id=cid
            ),
            models.Account(
                id=a411, code="411", name="Clients", class_code=4, company_id=cid
            ),
        ]
    )
    doc_n = _uuid()
    doc_n1 = _uuid()
    db_session.add_all(
        [
            models.Document(
                id=doc_n,
                name="Balance N",
                filename="n.xlsx",
                file_path="/tmp/n.xlsx",
                file_type="balance",
                company_id=cid,
            ),
            models.Document(
                id=doc_n1,
                name="Balance N-1",
                filename="n1.xlsx",
                file_path="/tmp/n1.xlsx",
                file_type="balance",
                company_id=cid,
            ),
        ]
    )
    en = _uuid()
    db_session.add(
        models.Entry(
            id=en,
            date=datetime.utcnow(),
            journal_id=jid,
            reference="BG-N",
            label="Exercice N",
            document_id=doc_n,
        )
    )
    db_session.add_all(
        [
            models.EntryLine(
                entry_id=en, account_id=a101, debit=0.0, credit=1000.0
            ),
            models.EntryLine(
                entry_id=en, account_id=a411, debit=1000.0, credit=0.0
            ),
        ]
    )
    en1 = _uuid()
    db_session.add(
        models.Entry(
            id=en1,
            date=datetime.utcnow(),
            journal_id=jid,
            reference="BG-N1",
            label="Exercice N-1",
            document_id=doc_n1,
        )
    )
    db_session.add_all(
        [
            models.EntryLine(
                entry_id=en1, account_id=a101, debit=0.0, credit=400.0
            ),
            models.EntryLine(
                entry_id=en1, account_id=a411, debit=400.0, credit=0.0
            ),
        ]
    )
    db_session.commit()
    return {
        "company_id": cid,
        "document_n": doc_n,
        "document_n1": doc_n1,
    }
