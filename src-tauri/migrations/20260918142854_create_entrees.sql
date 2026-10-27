CREATE TABLE entrees_medicaments (
    id UUID PRIMARY KEY,

    medicament_id UUID NOT NULL
        REFERENCES medicaments(id),

    quantite INTEGER NOT NULL,

    prix_unitaire NUMERIC(12,2) NOT NULL,

    prix_total NUMERIC(12,2)
        GENERATED ALWAYS AS (quantite * prix_unitaire) STORED,

    date_entree TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT entrees_quantite_check CHECK (quantite > 0),
    CONSTRAINT entrees_prix_check CHECK (prix_unitaire >= 0)
);