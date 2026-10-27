
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::{env, io, path::PathBuf};

pub async fn create_pool() -> Result<PgPool, sqlx::Error> {
    // Chercher .env dans plusieurs emplacements.
    let mut chemins = Vec::<PathBuf>::new();

    if let Ok(exe) = env::current_exe() {
        if let Some(dossier) = exe.parent() {
            chemins.push(dossier.join(".env"));
        }
    }

    if let Ok(dossier) = env::current_dir() {
        chemins.push(dossier.join(".env"));
    }

    // Charger le premier fichier .env trouvé.
    for chemin in chemins {
        if chemin.is_file() {
            dotenvy::from_path(&chemin).map_err(|e| {
                sqlx::Error::Configuration(Box::new(e))
            })?;

            break;
        }
    }

    // Lire la variable de connexion.
    let database_url = env::var("DATABASE_URL").map_err(|_| {
        sqlx::Error::Configuration(Box::new(io::Error::new(
            io::ErrorKind::NotFound,
            "DATABASE_URL absente. Aucun fichier .env valide trouvé et variable système absente.",
        )))
    })?;

    // Créer le pool PostgreSQL.
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    // Exécuter les migrations intégrées.
    let migrator = sqlx::migrate!("./migrations");

    migrator
        .run(&pool)
        .await
        .map_err(|e| sqlx::Error::Migrate(Box::new(e)))?;

    Ok(pool)
}
