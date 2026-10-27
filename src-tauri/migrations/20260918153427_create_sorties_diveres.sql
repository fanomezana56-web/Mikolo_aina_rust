-- Add migration script here
CREATE TABLE sorties_diverses (
    id UUID PRIMARY KEY,

    motif VARCHAR(255) NOT NULL,

    montant NUMERIC(12,2) NOT NULL,

    date_sortie TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT sorties_diverses_montant_check
        CHECK (montant > 0)
);