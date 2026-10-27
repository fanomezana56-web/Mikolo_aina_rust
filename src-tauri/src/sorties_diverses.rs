use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct SortieDiversListe {
    pub id: Uuid,
    pub motif: String,
    pub montant: Decimal,
    pub date_sortie: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct NouvelleSortieDivers {
    pub motif: String,
    pub montant: Decimal,
}

#[derive(Debug, Serialize)]
pub struct SortieDiversResultat {
    pub id: Uuid,
    pub motif: String,
    pub montant: Decimal,
    pub date_sortie: DateTime<Utc>,
}

#[tauri::command]
pub async fn enregistrer_sortie_diverse(
    data: NouvelleSortieDivers,
    pool: tauri::State<'_, PgPool>,
) -> Result<SortieDiversResultat, String> {
    let motif = data.motif.trim().to_string();

    if motif.is_empty() {
        return Err("Le motif de la sortie est obligatoire.".to_string());
    }

    if data.montant <= Decimal::ZERO {
        return Err("Le montant doit être supérieur à 0.".to_string());
    }

    let id = Uuid::new_v4();

    let sortie = sqlx::query_as!(
        SortieDiversResultat,
        r#"
        INSERT INTO sorties_diverses (
            id,
            motif,
            montant
        )
        VALUES ($1, $2, $3)
        RETURNING
            id,
            motif,
            montant,
            date_sortie
        "#,
        id,
        motif,
        data.montant
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    Ok(sortie)
}

#[tauri::command]
pub async fn obtenir_sorties_diverses(
    pool: tauri::State<'_, PgPool>,
) -> Result<Vec<SortieDiversListe>, String> {
    let sorties = sqlx::query_as!(
        SortieDiversListe,
        r#"
        SELECT
            id,
            motif,
            montant,
            date_sortie,
            created_at
        FROM sorties_diverses
        ORDER BY date_sortie DESC
        "#
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    Ok(sorties)
}