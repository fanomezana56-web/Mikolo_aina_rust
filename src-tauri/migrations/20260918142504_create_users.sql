-- Add migration script here
CREATE TABLE users (
    id UUID PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'agent',
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);