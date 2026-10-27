-- Add migration script here
-- Add migration script here
CREATE TABLE comptabilites (
    id UUID PRIMARY KEY,

    patient_id UUID NOT NULL
        REFERENCES patients(id),

    soins TEXT,

    consultation INTEGER NOT NULL DEFAULT 0,

    hospitalisation BOOLEAN NOT NULL DEFAULT FALSE,

    total_medicaments NUMERIC(12,2) NOT NULL DEFAULT 0,

    date_comptabilite TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT comptabilites_consultation_check
        CHECK (consultation >= 0),

    CONSTRAINT comptabilites_total_check
        CHECK (total_medicaments >= 0)
);