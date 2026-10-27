-- Add migration script here
-- ============================================================
-- MIGRATION : AJOUT DU SYSTÈME DE GESTION DES SOINS
-- ============================================================

-- ============================================================
-- 1. TABLE DES SOINS
-- ============================================================

CREATE TABLE soins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nom VARCHAR(150) NOT NULL UNIQUE,

    prix NUMERIC(12,2) NOT NULL DEFAULT 0,

    actif BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT soins_prix_check
        CHECK (prix >= 0)
);


-- ============================================================
-- 2. TABLE DES SOINS D'UNE COMPTABILITÉ
-- ============================================================

CREATE TABLE lignes_soins_comptabilite (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    comptabilite_id UUID NOT NULL
        REFERENCES comptabilites(id)
        ON DELETE CASCADE,

    soin_id UUID NOT NULL
        REFERENCES soins(id),

    quantite INTEGER NOT NULL DEFAULT 1,

    prix_unitaire NUMERIC(12,2) NOT NULL,

    prix_total NUMERIC(12,2) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT lignes_soins_quantite_check
        CHECK (quantite > 0),

    CONSTRAINT lignes_soins_prix_unitaire_check
        CHECK (prix_unitaire >= 0),

    CONSTRAINT lignes_soins_prix_total_check
        CHECK (prix_total >= 0)
);


-- ============================================================
-- 3. INDEX
-- ============================================================

CREATE INDEX idx_soins_actif
    ON soins(actif);

CREATE INDEX idx_lignes_soins_comptabilite
    ON lignes_soins_comptabilite(comptabilite_id);

CREATE INDEX idx_lignes_soins_soin
    ON lignes_soins_comptabilite(soin_id);


-- ============================================================
-- 4. AJOUT DU TOTAL DES SOINS DANS COMPTABILITES
-- ============================================================

ALTER TABLE comptabilites
ADD COLUMN total_soins NUMERIC(12,2) NOT NULL DEFAULT 0;


ALTER TABLE comptabilites
ADD CONSTRAINT comptabilites_total_soins_check
CHECK (total_soins >= 0);


-- ============================================================
-- 5. AJOUT DU TOTAL GÉNÉRAL
-- ============================================================

ALTER TABLE comptabilites
ADD COLUMN total_general NUMERIC(12,2) NOT NULL DEFAULT 0;


ALTER TABLE comptabilites
ADD CONSTRAINT comptabilites_total_general_check
CHECK (total_general >= 0);


-- ============================================================
-- 6. CRÉER LE SOIN "CONSULTATION"
-- ============================================================

INSERT INTO soins (
    id,
    nom,
    prix,
    actif
)
VALUES (
    gen_random_uuid(),
    'Consultation',
    0,
    TRUE
);


-- ============================================================
-- 7. TRANSFORMER LES ANCIENNES CONSULTATIONS
--    EN LIGNES DE SOINS
-- ============================================================

INSERT INTO lignes_soins_comptabilite (
    comptabilite_id,
    soin_id,
    quantite,
    prix_unitaire,
    prix_total
)
SELECT
    c.id,
    s.id,
    1,
    c.consultation,
    c.consultation
FROM comptabilites c
CROSS JOIN soins s
WHERE s.nom = 'Consultation'
  AND c.consultation > 0;


-- ============================================================
-- 8. CALCULER LE TOTAL DES SOINS EXISTANTS
-- ============================================================

UPDATE comptabilites c
SET total_soins = COALESCE(
    (
        SELECT SUM(ls.prix_total)
        FROM lignes_soins_comptabilite ls
        WHERE ls.comptabilite_id = c.id
    ),
    0
);


-- ============================================================
-- 9. CALCULER LE TOTAL GÉNÉRAL
-- ============================================================

UPDATE comptabilites
SET total_general =
    COALESCE(total_medicaments, 0)
    +
    COALESCE(total_soins, 0);


-- ============================================================
-- 10. ANCIEN CHAMP "soins"
-- ============================================================
--
-- On le conserve temporairement pour ne PAS perdre
-- les anciennes données textuelles.
--
-- Il pourra être supprimé plus tard après vérification.
--