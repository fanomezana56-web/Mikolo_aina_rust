-- Add migration script here
CREATE TABLE lignes_sortie_medicaments (
    id UUID PRIMARY KEY,

    sortie_id UUID NOT NULL
        REFERENCES sorties_medicaments(id)
        ON DELETE CASCADE,

    medicament_id UUID NOT NULL
        REFERENCES medicaments(id),

    quantite INTEGER NOT NULL,

    prix_unitaire NUMERIC(12,2) NOT NULL,

    prix_total NUMERIC(12,2)
        GENERATED ALWAYS AS (quantite * prix_unitaire) STORED,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT lignes_sortie_quantite_check
        CHECK (quantite > 0),

    CONSTRAINT lignes_sortie_prix_check
        CHECK (prix_unitaire >= 0)
);