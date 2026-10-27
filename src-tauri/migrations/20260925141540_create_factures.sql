-- Add migration script here
CREATE TABLE factures (
    id UUID PRIMARY KEY,

    numero VARCHAR(50) NOT NULL UNIQUE,

    comptabilite_id UUID NOT NULL,

    date_facture TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    montant_total NUMERIC(12,2) NOT NULL DEFAULT 0,

    montant_paye NUMERIC(12,2) NOT NULL DEFAULT 0,

    reste_a_payer NUMERIC(12,2) NOT NULL DEFAULT 0,

    statut VARCHAR(30) NOT NULL DEFAULT 'non_payee',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT factures_comptabilite_fk
        FOREIGN KEY (comptabilite_id)
        REFERENCES comptabilites(id)
        ON DELETE RESTRICT,

    CONSTRAINT factures_montant_total_check
        CHECK (montant_total >= 0),

    CONSTRAINT factures_montant_paye_check
        CHECK (montant_paye >= 0),

    CONSTRAINT factures_reste_check
        CHECK (reste_a_payer >= 0),

    CONSTRAINT factures_statut_check
        CHECK (
            statut IN (
                'non_payee',
                'partiellement_payee',
                'payee'
            )
        )
);

CREATE INDEX idx_factures_comptabilite
    ON factures(comptabilite_id);

CREATE INDEX idx_factures_date
    ON factures(date_facture);

CREATE INDEX idx_factures_statut
    ON factures(statut);