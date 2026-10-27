use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;


#[derive(Debug, Serialize)]
pub struct MedicamentSortieListe {
    pub medicament_id: Uuid,
    pub nom: String,
    pub quantite: i32,
}

#[derive(Debug, Serialize)]
pub struct SortieMedicamentListe {
    pub id: Uuid,
    pub comptabilite_id: Uuid,
    pub patient_id: Uuid,
    pub patient_nom: String,
    pub patient_prenom: Option<String>,
    pub date_sortie: DateTime<Utc>,
    pub medicaments: Vec<MedicamentSortieListe>,
    pub nombre_medicaments: i64,
    pub total_sortie: Decimal,
}

#[derive(Debug, Serialize)]
pub struct MedicamentSortieDetail {
    pub id: Uuid,
    pub nom: String,
    pub quantite: i32,
    pub prix_unitaire: Decimal,
    pub total: Decimal,
}

#[derive(Debug, Serialize)]
pub struct SortieMedicamentDetail {
    pub id: Uuid,
    pub comptabilite_id: Uuid,
    pub patient_id: Uuid,
    pub patient_nom: String,
    pub patient_prenom: Option<String>,
    pub date_sortie: DateTime<Utc>,
    pub medicaments: Vec<MedicamentSortieDetail>,
    pub total_sortie: Decimal,
}
#[tauri::command]
pub async fn obtenir_sorties_medicaments(
    pool: tauri::State<'_, PgPool>,
) -> Result<Vec<SortieMedicamentListe>, String> {
    let sorties_base = sqlx::query_as!(
        SortieMedicamentBase,
        r#"
        SELECT
            sm.id,
            sm.comptabilite_id,
            c.patient_id,
            p.nom AS patient_nom,
            p.prenom AS patient_prenom,
            sm.date_sortie
        FROM sorties_medicaments sm

        INNER JOIN comptabilites c
            ON c.id = sm.comptabilite_id

        INNER JOIN patients p
            ON p.id = c.patient_id

        ORDER BY sm.date_sortie DESC
        "#
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    let mut sorties = Vec::new();

    for sortie in sorties_base {
        let medicaments = sqlx::query_as!(
            MedicamentSortieListe,
            r#"
            SELECT
                m.id AS medicament_id,
                m.nom,
                lsm.quantite

            FROM lignes_sortie_medicaments lsm

            INNER JOIN medicaments m
                ON m.id = lsm.medicament_id

            WHERE lsm.sortie_id = $1

            ORDER BY m.nom ASC
            "#,
            sortie.id
        )
        .fetch_all(pool.inner())
        .await
        .map_err(|error| error.to_string())?;

        let nombre_medicaments = medicaments
            .iter()
            .map(|medicament| i64::from(medicament.quantite))
            .sum();

        let total_sortie = sqlx::query_scalar!(
            r#"
            SELECT COALESCE(
                SUM(lsm.quantite * lsm.prix_unitaire),
                0
            ) AS "total_sortie!"
            FROM lignes_sortie_medicaments lsm
            WHERE lsm.sortie_id = $1
            "#,
            sortie.id
        )
        .fetch_one(pool.inner())
        .await
        .map_err(|error| error.to_string())?;

        sorties.push(SortieMedicamentListe {
            id: sortie.id,
            comptabilite_id: sortie.comptabilite_id,
            patient_id: sortie.patient_id,
            patient_nom: sortie.patient_nom,
            patient_prenom: sortie.patient_prenom,
            date_sortie: sortie.date_sortie,
            medicaments,
            nombre_medicaments,
            total_sortie,
        });
    }

    Ok(sorties)
}

#[derive(Debug)]
struct SortieMedicamentBase {
    id: Uuid,
    comptabilite_id: Uuid,
    patient_id: Uuid,
    patient_nom: String,
    patient_prenom: Option<String>,
    date_sortie: DateTime<Utc>,
}

#[tauri::command]
pub async fn obtenir_detail_sortie_medicament(
    id: Uuid,
    pool: tauri::State<'_, PgPool>,
) -> Result<SortieMedicamentDetail, String> {
    let sortie = sqlx::query_as!(
        SortieMedicamentBase,
        r#"
        SELECT
            sm.id,
            sm.comptabilite_id,
            c.patient_id,
            p.nom AS patient_nom,
            p.prenom AS patient_prenom,
            sm.date_sortie
        FROM sorties_medicaments sm

        INNER JOIN comptabilites c
            ON c.id = sm.comptabilite_id

        INNER JOIN patients p
            ON p.id = c.patient_id

        WHERE sm.id = $1
        "#,
        id
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|error| error.to_string())?
    .ok_or_else(|| "Sortie de médicaments introuvable".to_string())?;

    let medicaments = sqlx::query_as!(
        MedicamentSortieDetail,
        r#"
        SELECT
            m.id,
            m.nom,
            lsm.quantite,
            lsm.prix_unitaire,
            (
                lsm.quantite * lsm.prix_unitaire
            ) AS "total!"

        FROM lignes_sortie_medicaments lsm

        INNER JOIN medicaments m
            ON m.id = lsm.medicament_id

        WHERE lsm.sortie_id = $1

        ORDER BY m.nom ASC
        "#,
        id
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    let total_sortie = medicaments
        .iter()
        .fold(Decimal::ZERO, |total, medicament| {
            total + medicament.total
        });

    Ok(SortieMedicamentDetail {
        id: sortie.id,
        comptabilite_id: sortie.comptabilite_id,
        patient_id: sortie.patient_id,
        patient_nom: sortie.patient_nom,
        patient_prenom: sortie.patient_prenom,
        date_sortie: sortie.date_sortie,
        medicaments,
        total_sortie,
    })
}

