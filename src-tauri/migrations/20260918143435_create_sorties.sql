CREATE TABLE sorties_medicaments (
    id UUID PRIMARY KEY,

    comptabilite_id UUID NOT NULL
        REFERENCES comptabilites(id)
        ON DELETE CASCADE,

    date_sortie TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);