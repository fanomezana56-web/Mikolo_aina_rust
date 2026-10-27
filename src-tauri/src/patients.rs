use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct Patient {
    pub id: Uuid,
    pub nom: String,
    pub prenom: Option<String>,
    pub date_naissance: Option<NaiveDate>,
    pub sexe: Option<String>,
    pub telephone: Option<String>,
    pub adresse: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct NouveauPatient {
    pub nom: String,
    pub prenom: Option<String>,
    pub date_naissance: Option<NaiveDate>,
    pub sexe: Option<String>,
    pub telephone: Option<String>,
    pub adresse: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ModifierPatient {
    pub id: Uuid,
    pub nom: String,
    pub prenom: Option<String>,
    pub date_naissance: Option<NaiveDate>,
    pub sexe: Option<String>,
    pub telephone: Option<String>,
    pub adresse: Option<String>,
}


// ============================================================
// AJOUTER UN PATIENT
// ============================================================

#[tauri::command]
pub async fn ajouter_patient(
    pool: tauri::State<'_, PgPool>,
    data: NouveauPatient,
) -> Result<Patient, String> {

    let nom = data.nom.trim();

    if nom.is_empty() {
        return Err("Le nom du patient est obligatoire.".to_string());
    }

    let prenom = data
        .prenom
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(String::from);

    let patient = sqlx::query_as!(
        Patient,
        r#"
        INSERT INTO patients (
            id,
            nom,
            prenom,
            date_naissance,
            sexe,
            telephone,
            adresse
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
            id,
            nom,
            prenom,
            date_naissance,
            sexe,
            telephone,
            adresse,
            created_at
        "#,
        Uuid::new_v4(),
        nom,
        prenom,
        data.date_naissance,
        data.sexe,
        data.telephone,
        data.adresse
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    Ok(patient)
}


// ============================================================
// OBTENIR TOUS LES PATIENTS
// ============================================================

#[tauri::command]
pub async fn obtenir_patients(
    pool: tauri::State<'_, PgPool>,
) -> Result<Vec<Patient>, String> {

    let patients = sqlx::query_as!(
        Patient,
        r#"
        SELECT
            id,
            nom,
            prenom,
            date_naissance,
            sexe,
            telephone,
            adresse,
            created_at
        FROM patients
        ORDER BY nom ASC, prenom ASC
        "#
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    Ok(patients)
}


// ============================================================
// RECHERCHER DES PATIENTS
// ============================================================

#[tauri::command]
pub async fn rechercher_patients(
    pool: tauri::State<'_, PgPool>,
    recherche: String,
) -> Result<Vec<Patient>, String> {

    let recherche = recherche.trim();

    if recherche.is_empty() {
        return obtenir_patients(pool).await;
    }

    let pattern = format!("%{}%", recherche);

    let patients = sqlx::query_as!(
        Patient,
        r#"
        SELECT
            id,
            nom,
            prenom,
            date_naissance,
            sexe,
            telephone,
            adresse,
            created_at
        FROM patients
        WHERE
            nom ILIKE $1
            OR COALESCE(prenom, '') ILIKE $1
            OR COALESCE(telephone, '') ILIKE $1
            OR CONCAT(
                nom,
                ' ',
                COALESCE(prenom, '')
            ) ILIKE $1
        ORDER BY nom ASC, prenom ASC
        "#,
        pattern
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    Ok(patients)
}


// ============================================================
// MODIFIER UN PATIENT
// ============================================================

#[tauri::command]
pub async fn modifier_patient(
    pool: tauri::State<'_, PgPool>,
    data: ModifierPatient,
) -> Result<Patient, String> {

    let nom = data.nom.trim();

    if nom.is_empty() {
        return Err("Le nom du patient est obligatoire.".to_string());
    }

    let prenom = data
        .prenom
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(String::from);

    let patient = sqlx::query_as!(
        Patient,
        r#"
        UPDATE patients
        SET
            nom = $1,
            prenom = $2,
            date_naissance = $3,
            sexe = $4,
            telephone = $5,
            adresse = $6
        WHERE id = $7
        RETURNING
            id,
            nom,
            prenom,
            date_naissance,
            sexe,
            telephone,
            adresse,
            created_at
        "#,
        nom,
        prenom,
        data.date_naissance,
        data.sexe,
        data.telephone,
        data.adresse,
        data.id
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    match patient {
        Some(patient) => Ok(patient),
        None => Err("Le patient demandé n'existe pas.".to_string()),
    }
}


// ============================================================
// SUPPRIMER UN PATIENT
// ============================================================

#[tauri::command]
pub async fn supprimer_patient(
    pool: tauri::State<'_, PgPool>,
    id: Uuid,
) -> Result<(), String> {

    let result = sqlx::query!(
        r#"
        DELETE FROM patients
        WHERE id = $1
        "#,
        id
    )
    .execute(pool.inner())
    .await
    .map_err(|error| {

        if error
            .to_string()
            .contains("violates foreign key constraint")
        {
            "Impossible de supprimer ce patient car il possède déjà une comptabilité."
                .to_string()
        } else {
            error.to_string()
        }
    })?;

    if result.rows_affected() == 0 {
        return Err(
            "Le patient demandé n'existe pas.".to_string()
        );
    }

    Ok(())
}