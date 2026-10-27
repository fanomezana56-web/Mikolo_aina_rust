
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ============================================================
// FACTURE - LISTE
// ============================================================

#[derive(Debug, Serialize)]
pub struct FactureListe {
    pub id: Uuid,
    pub numero: String,
    pub comptabilite_id: Uuid,
    pub patient_nom: String,
    pub patient_prenom: Option<String>,
    pub date_facture: DateTime<Utc>,
    pub montant_total: Decimal,
}

// ============================================================
// NOUVELLE FACTURE
// ============================================================

#[derive(Debug, Deserialize)]
pub struct NouvelleFacture {
    pub comptabilite_id: Uuid,
}

// ============================================================
// RÉSULTAT CRÉATION FACTURE
// ============================================================

#[derive(Debug, Serialize)]
pub struct FactureResultat {
    pub id: Uuid,
    pub numero: String,
    pub comptabilite_id: Uuid,
    pub montant_total: Decimal,
    pub date_facture: DateTime<Utc>,
}

// ============================================================
// DÉTAIL MÉDICAMENT FACTURE
// ============================================================

#[derive(Debug, Serialize)]
pub struct MedicamentFactureDetail {
    pub id: Uuid,
    pub nom: String,
    pub quantite: i32,
    pub prix_unitaire: Decimal,
    pub total: Decimal,
}

// ============================================================
// DÉTAIL SOIN FACTURE
// ============================================================

#[derive(Debug, Serialize)]
pub struct SoinFactureDetail {
    pub soin_id: Uuid,
    pub nom: String,
    pub quantite: i32,
    pub prix_unitaire: Decimal,
    pub prix_total: Decimal,
}

// ============================================================
// DÉTAIL FACTURE
// ============================================================

#[derive(Debug, Serialize)]
pub struct FactureDetail {
    pub id: Uuid,
    pub numero: String,
    pub comptabilite_id: Uuid,

    pub patient_id: Uuid,
    pub patient_nom: String,
    pub patient_prenom: Option<String>,

    pub date_facture: DateTime<Utc>,

    pub soins: Option<String>,
    pub consultation: i32,
    pub hospitalisation: bool,

    pub medicaments: Vec<MedicamentFactureDetail>,
    pub soins_lignes: Vec<SoinFactureDetail>,

    pub montant_medicaments: Decimal,
    pub montant_soins: Decimal,
    pub montant_total: Decimal,
}

// ============================================================
// GÉNÉRER NUMÉRO FACTURE
// ============================================================

async fn generer_numero_facture(
    pool: &PgPool,
) -> Result<String, String> {
    let annee = Utc::now().format("%Y").to_string();

    let nombre: i64 = sqlx::query_scalar!(
        r#"
        SELECT COUNT(*)
        FROM factures
        WHERE EXTRACT(YEAR FROM date_facture) = $1
        "#,
        annee
            .parse::<Decimal>()
            .map_err(|e| e.to_string())?
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?
    .unwrap_or(0);

    Ok(format!("FAC-{}-{:06}", annee, nombre + 1))
}

// ============================================================
// ENREGISTRER / CRÉER UNE FACTURE
// ============================================================

#[tauri::command]
pub async fn enregistrer_facture(
    data: NouvelleFacture,
    pool: tauri::State<'_, PgPool>,
) -> Result<FactureResultat, String> {
    // Vérifier que la comptabilité existe et récupérer
    // le montant général calculé par le module comptabilité.

    let comptabilite = sqlx::query!(
        r#"
        SELECT
            c.id,
            c.total_general
        FROM comptabilites c
        WHERE c.id = $1
        "#,
        data.comptabilite_id
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let comptabilite = match comptabilite {
        Some(value) => value,
        None => {
            return Err(
                "La comptabilité demandée n'existe pas.".to_string()
            );
        }
    };

    // Vérifier qu'une facture n'existe pas déjà
    // pour cette comptabilité.

    let facture_existante = sqlx::query_scalar!(
        r#"
        SELECT id
        FROM factures
        WHERE comptabilite_id = $1
        LIMIT 1
        "#,
        data.comptabilite_id
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    if facture_existante.is_some() {
        return Err(
            "Une facture existe déjà pour cette comptabilité."
                .to_string()
        );
    }

    // Le total général inclut les médicaments et les soins.
    // Aucun tarif d'hospitalisation ou de consultation
    // n'est ajouté automatiquement.

    let montant_total = comptabilite.total_general;

    // Générer le numéro et l'identifiant de la facture.

    let numero = generer_numero_facture(pool.inner()).await?;
    let id = Uuid::new_v4();

    // Enregistrer la facture.

    let facture = sqlx::query_as!(
        FactureResultat,
        r#"
        INSERT INTO factures (
            id,
            numero,
            comptabilite_id,
            montant_total
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
            id,
            numero,
            comptabilite_id,
            montant_total,
            date_facture
        "#,
        id,
        numero,
        data.comptabilite_id,
        montant_total
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(facture)
}

// ============================================================
// OBTENIR TOUTES LES FACTURES
// ============================================================

#[tauri::command]
pub async fn obtenir_factures(
    pool: tauri::State<'_, PgPool>,
) -> Result<Vec<FactureListe>, String> {
    let factures = sqlx::query_as!(
        FactureListe,
        r#"
        SELECT
            f.id,
            f.numero,
            f.comptabilite_id,
            p.nom AS patient_nom,
            p.prenom AS patient_prenom,
            f.date_facture,

            -- Utiliser le total de la comptabilité pour
            -- afficher aussi les soins sur les anciennes factures.
            c.total_general AS montant_total

        FROM factures f

        INNER JOIN comptabilites c
            ON c.id = f.comptabilite_id

        INNER JOIN patients p
            ON p.id = c.patient_id

        ORDER BY f.date_facture DESC
        "#
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(factures)
}

// ============================================================
// OBTENIR LE DÉTAIL D'UNE FACTURE
// ============================================================

#[tauri::command]
pub async fn obtenir_detail_facture(
    id: Uuid,
    pool: tauri::State<'_, PgPool>,
) -> Result<FactureDetail, String> {
    // --------------------------------------------------------
    // Informations générales
    // --------------------------------------------------------

    let facture = sqlx::query!(
        r#"
        SELECT
            f.id,
            f.numero,
            f.comptabilite_id,
            f.date_facture,

            -- Le total comptable comprend médicaments + soins.
            c.total_general AS montant_total,

            c.patient_id,
            c.soins,
            c.consultation,
            c.hospitalisation,

            p.nom AS patient_nom,
            p.prenom AS patient_prenom

        FROM factures f

        INNER JOIN comptabilites c
            ON c.id = f.comptabilite_id

        INNER JOIN patients p
            ON p.id = c.patient_id

        WHERE f.id = $1
        "#,
        id
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let facture = match facture {
        Some(value) => value,
        None => {
            return Err(
                "La facture demandée n'existe pas.".to_string()
            );
        }
    };

    // --------------------------------------------------------
    // Médicaments
    // --------------------------------------------------------

    let medicaments_db = sqlx::query!(
        r#"
        SELECT
            m.id,
            m.nom,
            l.quantite,
            l.prix_unitaire,
            (l.quantite * l.prix_unitaire) AS total

        FROM lignes_sortie_medicaments l

        INNER JOIN medicaments m
            ON m.id = l.medicament_id

        INNER JOIN sorties_medicaments s
            ON s.id = l.sortie_id

        WHERE s.comptabilite_id = $1

        ORDER BY m.nom ASC
        "#,
        facture.comptabilite_id
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let medicaments: Vec<MedicamentFactureDetail> = medicaments_db
        .into_iter()
        .map(|medicament| MedicamentFactureDetail {
            id: medicament.id,
            nom: medicament.nom,
            quantite: medicament.quantite,
            prix_unitaire: medicament.prix_unitaire,
            total: medicament.total.unwrap_or(Decimal::ZERO),
        })
        .collect();

    let montant_medicaments = medicaments
        .iter()
        .fold(Decimal::ZERO, |somme, ligne| somme + ligne.total);

    // --------------------------------------------------------
    // Soins
    // --------------------------------------------------------

    let soins_db = sqlx::query!(
        r#"
        SELECT
            lsc.soin_id,
            s.nom,
            lsc.quantite,
            lsc.prix_unitaire,
            lsc.prix_total

        FROM lignes_soins_comptabilite lsc

        INNER JOIN soins s
            ON s.id = lsc.soin_id

        WHERE lsc.comptabilite_id = $1

        ORDER BY s.nom ASC
        "#,
        facture.comptabilite_id
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let soins_lignes: Vec<SoinFactureDetail> = soins_db
        .into_iter()
        .map(|soin| SoinFactureDetail {
            soin_id: soin.soin_id,
            nom: soin.nom,
            quantite: soin.quantite,
            prix_unitaire: soin.prix_unitaire,
            prix_total: soin.prix_total,
        })
        .collect();

    let montant_soins = soins_lignes
        .iter()
        .fold(Decimal::ZERO, |somme, ligne| somme + ligne.prix_total);

    // --------------------------------------------------------
    // Retour du détail complet
    // --------------------------------------------------------

    Ok(FactureDetail {
        id: facture.id,
        numero: facture.numero,
        comptabilite_id: facture.comptabilite_id,

        patient_id: facture.patient_id,
        patient_nom: facture.patient_nom,
        patient_prenom: facture.patient_prenom,

        date_facture: facture.date_facture,

        soins: facture.soins,
        consultation: facture.consultation,
        hospitalisation: facture.hospitalisation,

        medicaments,
        soins_lignes,

        montant_medicaments,
        montant_soins,
        montant_total: facture.montant_total,
    })
}

