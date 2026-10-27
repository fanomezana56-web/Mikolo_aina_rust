-- Add migration script here
CREATE TABLE patients (
    id UUID PRIMARY KEY,

    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100),

    date_naissance DATE,

    sexe VARCHAR(20),

    telephone VARCHAR(30),

    adresse TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);