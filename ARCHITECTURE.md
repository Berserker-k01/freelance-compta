# Auditia - SaaS de Génération de Liasse Fiscale OTR / SYSCOHADA

Ce document détaille l'architecture complète, les fonctionnalités et la méthodologie d'implémentation technique d'Auditia, un SaaS permettant de générer automatiquement une liasse fiscale OTR à partir d'une balance générale.

## 1. Module d'Ingestion de Données (ETL Comptable)
**Objectif :** Transformer n'importe quel fichier comptable brut en données structurées.
- **Fonctionnalité :** Importateur de Balance Générale universel (CSV, XLSX).
- **Implémentation :**
  - Utilisation de `Pandas` (Python) pour la lecture et le traitement des fichiers.
  - Algorithmes de détection de colonnes par expressions régulières (Numéro de compte, Libellé, Débit, Crédit).
  - Nettoyage et normalisation SYSCOHADA : suppression des lignes totales, gestion des longueurs de comptes (3 à 6 chiffres).

## 2. Moteur de Mapping Dynamique
**Objectif :** Faire le pont entre la balance et le fichier OTR.
- **Fonctionnalité :** Système de règles de correspondance par motifs (wildcards).
- **Implémentation :**
  - Rapprochement dynamique entre cellules du template OTR et les racines de comptes (ex: `24*`).
  - Tolérance aux logiques algébriques multiples : `SOLDE_DEBITEUR`, `SOLDE_CREDITEUR`, `VALEUR_ABSOLUE` (`ABS()`), et `INVERSION_SIGNE` (`-`).

## 3. Module d'Injection Chirurgicale (`ExcelInjector`)
**Objectif :** Remplir le fichier OTR officiel sans le corrompre ni casser ses composants internes.
- **Fonctionnalité :** Écriture non-destructive sur le template Excel master.
- **Implémentation :**
  - Utilisation de la librairie standard `openpyxl` paramétrée avec `keep_vba=True` et `data_only=False`.
  - Gestion automatique des cellules fusionnées (ciblage strict de la cellule top-left).
  - Protection absolue des formules natives : l'injection est strictement confinée aux cellules de saisie pour préserver l'intégrité des calculs internes à l'ouverture par le tableur de destination.

## 4. Interface de Saisie des Données "Hors-Balance"
**Objectif :** Collecter les données de conformité et annexes non présentes dans la comptabilité brute.
- **Fonctionnalité :** Formulaires dynamiques de complétion (Notes annexes, informations entreprise).
- **Implémentation :**
  - **Frontend (Next.js/React) :** Formulaires ergonomiques (Page de garde, Effectifs "Note 27B", Véhicules "Note 85").
  - **Persistance :** Mise en base relationnelle réutilisable d'un exercice à l'autre pour accélérer les dépôts subséquents.

## 5. Module d'Intelligence Fiscale (Page 58)
**Objectif :** Faciliter et automatiser le passage du bénéfice comptable au résultat fiscal.
- **Fonctionnalité :** Détection et imputation des réintégrations et déductions.
- **Implémentation :**
  - Mapping dédié pour les comptes structurellement non déductibles (ex: `657` Amendes).
  - Écran de "Revue Fiscale" interactif sur le Frontend pour les ajustements humains (extra-comptables).

## 6. Système de "Pre-flight Check" (Validation)
**Objectif :** Garantie d'intégrité de 100% sur le calcul avant export.
- **Fonctionnalité :** Contrôle de Cohérence / Simulateur de conformité.
- **Implémentation :**
  - Somme totale Débits = Somme totale Crédits.
  - Résultat Net Bilan = Résultat Net Compte de Résultat.
  - Barrières logicielles pré-génération (`guardrails`) avec rapport d'erreurs pour l'utilisateur.

## 7. Sécurité et Archivage
**Objectif :** Protéger le secret professionnel et les données de conformité sensibles des entreprises.
- **Fonctionnalité :** Chiffrement robuste et cloisonnement inter-clients (Multi-tenancy).
- **Implémentation :**
  - **Isolations :** Identifiants UUID primaires pour masquer la volumétrie et prévenir l'énumération par des tiers.
  - **Chiffrement au repos (AES-256) :** Les fichiers et données critiques en base sont chiffrés. En cas d'exfiltration, la donnée reste inexploitable.

---

## 🛠 Pile Technologique
- **Backend :** FastAPI (Python)
- **Data & Excel :** Pandas (Analyse), Openpyxl (Génération)
- **Base de données :** PostgreSQL
- **Frontend :** Next.js (React), Tailwind CSS
- **Infrastructure :** Docker / Docker Compose
