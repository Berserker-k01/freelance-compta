from sqlalchemy.orm import Session
from . import models

SYSCOHADA_ACCOUNTS = [
    # CLASSE 1 : RESSOURCES DURABLES
    {"code": "101", "name": "Capital social", "class_code": 1},
    {"code": "111", "name": "Réserves légales", "class_code": 1},
    {"code": "121", "name": "Report à nouveau créditeur", "class_code": 1},
    {"code": "131", "name": "Résultat net : Bénéfice", "class_code": 1},
    {"code": "139", "name": "Résultat net : Perte", "class_code": 1},
    
    # CLASSE 2 : ACTIF IMMOBILISÉ
    {"code": "211", "name": "Terrains", "class_code": 2},
    {"code": "212", "name": "Agencements et aménagements de terrains", "class_code": 2},
    {"code": "213", "name": "Constructions", "class_code": 2},
    {"code": "215", "name": "Installations techniques, matériels et outillages", "class_code": 2},
    {"code": "218", "name": "Autres immobilisations corporelles", "class_code": 2}, # Mobilier, Mat info
    
    # CLASSE 3 : STOCKS
    {"code": "311", "name": "Marchandises", "class_code": 3},
    {"code": "321", "name": "Matières premières et fournitures", "class_code": 3},
    
    # CLASSE 4 : TIERS (Créances & Dettes)
    {"code": "401", "name": "Fournisseurs, dettes en compte", "class_code": 4},
    {"code": "411", "name": "Clients", "class_code": 4},
    {"code": "441", "name": "État, impôt sur les bénéfices", "class_code": 4},
    {"code": "443", "name": "État, TVA facturée", "class_code": 4},
    {"code": "444", "name": "État, Impôts et taxes dus", "class_code": 4},
    {"code": "445", "name": "État, TVA récupérable", "class_code": 4},
    
    # CLASSE 5 : TRÉSORERIE
    {"code": "521", "name": "Banques", "class_code": 5},
    {"code": "571", "name": "Caisse", "class_code": 5},
    
    # CLASSE 6 : CHARGES
    {"code": "601", "name": "Achats de marchandises", "class_code": 6},
    {"code": "602", "name": "Achats de matières premières", "class_code": 6},
    {"code": "604", "name": "Achats d'études et prestations de services", "class_code": 6},
    {"code": "605", "name": "Autres achats", "class_code": 6}, # Eau, Électricité (6051, 6052)
    {"code": "611", "name": "Transports", "class_code": 6},
    {"code": "621", "name": "Services extérieurs A", "class_code": 6}, # Sous-traitance
    {"code": "622", "name": "Services extérieurs B", "class_code": 6}, # Pub, loyers
    {"code": "631", "name": "Frais de personnel", "class_code": 6}, # Salaires (à détailler)
    
    # CLASSE 7 : PRODUITS
    {"code": "701", "name": "Ventes de marchandises", "class_code": 7},
    {"code": "706", "name": "Services vendus", "class_code": 7},
]

def seed_syscohada(db: Session, company_id: int):
    """Seed the database with standard SYSCOHADA accounts for a new company."""
    # Check if accounts already exist
    existing = db.query(models.Account).filter(models.Account.company_id == company_id).first()
    if existing:
        return {"message": "Accounts already seeded for this company"}
    
    for acc in SYSCOHADA_ACCOUNTS:
        db_acc = models.Account(
            code=acc["code"],
            name=acc["name"],
            class_code=acc["class_code"],
            company_id=company_id
        )
        db.add(db_acc)
    
    db.commit()
    return {"message": f"Successfully seeded {len(SYSCOHADA_ACCOUNTS)} SYSCOHADA accounts"}
