CREATE TABLE medicaments (
    id UUID PRIMARY KEY,
    nom VARCHAR(200) NOT NULL UNIQUE,
    prix_unitaire NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT medicaments_prix_check CHECK (prix_unitaire >= 0),
    CONSTRAINT medicaments_stock_check CHECK (stock >= 0)
);