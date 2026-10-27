
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;

/* ============================================================
   MÉDICAMENTS D'UNE SORTIE
============================================================ */

#[derive(Debug, Serialize)]
pub struct MedicamentSortieListe {
    pub medicament_id: Uuid,
    pub nom: String,
    pub quantite: i32,
}

/* ============================================================
   MÉDICAMENTS D'UNE COMPTABILITÉ
============================================================ */

#[derive(Debug, Serialize)]
pub struct MedicamentListeComptabilite {
    pub medicament_id: Uuid,
    pub nom: String,
    pub quantite: i32,
    pub prix_unitaire: Decimal,
    pub prix_total: Decimal,
}

/* ============================================================
   SOINS D'UNE COMPTABILITÉ
============================================================ */

#[derive(Debug, Serialize)]
pub struct SoinListeComptabilite {
    pub soin_id: Uuid,
    pub nom: String,
    pub quantite: i32,
    pub prix_unitaire: Decimal,
    pub prix_total: Decimal,
}

/* ============================================================
   LISTE DES COMPTABILITÉS
============================================================ */

#[derive(Debug, Serialize)]
pub struct ComptabiliteListe {
    pub id: Uuid,

    pub patient_id: Uuid,
    pub patient_nom: String,
    pub patient_prenom: Option<String>,

    pub soins: Option<String>,
    pub consultation: i32,
    pub hospitalisation: bool,

    pub total_medicaments: Decimal,
    pub total_soins: Decimal,
    pub total_general: Decimal,

    pub medicaments: Vec<MedicamentListeComptabilite>,
    pub soins_lignes: Vec<SoinListeComptabilite>,

    pub date_comptabilite: DateTime<Utc>,
}

/* ============================================================
   LIGNE MÉDICAMENT ENTRÉE PAR REACT
============================================================ */

#[derive(Debug, Deserialize)]
pub struct LigneComptabiliteInput {
    pub medicament_id: Uuid,
    pub quantite: i32,
}

/* ============================================================
   LIGNE SOIN ENTRÉE PAR REACT
============================================================ */

#[derive(Debug, Deserialize)]
pub struct LigneSoinComptabiliteInput {
    pub soin_id: Uuid,
}

/* ============================================================
   NOUVELLE COMPTABILITÉ
============================================================ */

#[derive(Debug, Deserialize)]
pub struct NouvelleComptabilite {
    pub patient_id: Uuid,
    pub hospitalisation: bool,
    pub lignes_medicaments: Vec<LigneComptabiliteInput>,
    pub lignes_soins: Vec<LigneSoinComptabiliteInput>,
}

/* ============================================================
   RÉSULTAT ENREGISTREMENT
============================================================ */

#[derive(Debug, Serialize)]
pub struct ComptabiliteResultat {
    pub comptabilite_id: Uuid,
    pub total_medicaments: f64,
    pub total_soins: f64,
    pub total_general: f64,
}

/* ============================================================
   DÉTAIL MÉDICAMENT
============================================================ */

#[derive(Debug, Serialize)]
pub struct DetailMedicamentComptabilite {
    pub medicament_id: Uuid,
    pub nom: String,
    pub quantite: i32,
    pub prix_unitaire: Decimal,
    pub prix_total: Decimal,
}

/* ============================================================
   DÉTAIL SOIN
============================================================ */

#[derive(Debug, Serialize)]
pub struct DetailSoinComptabilite {
    pub soin_id: Uuid,
    pub nom: String,
    pub quantite: i32,
    pub prix_unitaire: Decimal,
    pub prix_total: Decimal,
}

/* ============================================================
   DÉTAIL COMPLET D'UNE COMPTABILITÉ
============================================================ */

#[derive(Debug, Serialize)]
pub struct DetailComptabilite {
    pub id: Uuid,

    pub patient_id: Uuid,
    pub patient_nom: String,
    pub patient_prenom: Option<String>,

    pub soins: Option<String>,
    pub consultation: i32,
    pub hospitalisation: bool,

    pub total_medicaments: Decimal,
    pub total_soins: Decimal,
    pub total_general: Decimal,

    pub date_comptabilite: DateTime<Utc>,

    pub sortie_id: Option<Uuid>,

    pub medicaments: Vec<DetailMedicamentComptabilite>,
    pub soins_lignes: Vec<DetailSoinComptabilite>,
}

/* ============================================================
   LISTE DES SORTIES MÉDICAMENTS
============================================================ */

#[derive(Debug, Serialize)]
pub struct SortieMedicamentListe {
    pub id: Uuid,
    pub comptabilite_id: Uuid,
    pub patient_id: Uuid,
    pub patient_nom: String,
    pub patient_prenom: Option<String>,

    pub medicaments: Vec<MedicamentSortieListe>,

    pub total_sortie: Decimal,
    pub nombre_medicaments: i32,
    pub date_sortie: DateTime<Utc>,
}

/* ============================================================
   CONVERTIR DECIMAL EN F64
============================================================ */

fn decimal_to_f64(value: Decimal) -> Result<f64, String> {
    value
        .to_string()
        .parse::<f64>()
        .map_err(|_| "Impossible de convertir le montant.".to_string())
}

/* ============================================================
   ENREGISTRER UNE COMPTABILITÉ
============================================================ */

#[tauri::command]
pub async fn enregistrer_comptabilite(
    pool: tauri::State<'_, PgPool>,
    data: NouvelleComptabilite,
) -> Result<ComptabiliteResultat, String> {
    if data.patient_id.is_nil() {
        return Err("Le patient est obligatoire.".to_string());
    }

    for ligne in &data.lignes_medicaments {
        if ligne.medicament_id.is_nil() {
            return Err(
                "Un médicament sélectionné est invalide.".to_string()
            );
        }

        if ligne.quantite <= 0 {
            return Err(
                "La quantité d'un médicament doit être supérieure à zéro."
                    .to_string()
            );
        }
    }

    for ligne in &data.lignes_soins {
        if ligne.soin_id.is_nil() {
            return Err("Un soin sélectionné est invalide.".to_string());
        }
    }

    if data.lignes_medicaments.is_empty()
        && data.lignes_soins.is_empty()
        && !data.hospitalisation
    {
        return Err(
            "Ajoutez au moins un médicament, un soin ou sélectionnez l'hospitalisation."
                .to_string()
        );
    }

    let mut transaction: Transaction<'_, Postgres> = pool
        .begin()
        .await
        .map_err(|error| error.to_string())?;

    let patient_existe: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
            SELECT 1
            FROM patients
            WHERE id = $1
        )
        "#,
    )
    .bind(data.patient_id)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| error.to_string())?;

    if !patient_existe {
        return Err("Le patient sélectionné n'existe pas.".to_string());
    }

    let comptabilite_id = Uuid::new_v4();

    /* --------------------------------------------------------
       CALCULER LE TOTAL DES MÉDICAMENTS
    -------------------------------------------------------- */

    let mut total_medicaments = Decimal::ZERO;

    for ligne in &data.lignes_medicaments {
        let medicament = sqlx::query!(
            r#"
            SELECT
                id,
                nom,
                prix_unitaire,
                stock
            FROM medicaments
            WHERE id = $1
            FOR UPDATE
            "#,
            ligne.medicament_id
        )
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;

        let medicament = match medicament {
            Some(medicament) => medicament,
            None => {
                return Err(format!(
                    "Le médicament {} n'existe pas.",
                    ligne.medicament_id
                ));
            }
        };

        if medicament.stock < ligne.quantite {
            return Err(format!(
                "Stock insuffisant pour le médicament '{}'. Stock disponible : {}.",
                medicament.nom,
                medicament.stock
            ));
        }

        let prix_total =
            medicament.prix_unitaire * Decimal::from(ligne.quantite);

        total_medicaments += prix_total;
    }

    /* --------------------------------------------------------
       CALCULER LE TOTAL DES SOINS
    -------------------------------------------------------- */

    let mut total_soins = Decimal::ZERO;

    for ligne in &data.lignes_soins {
        let soin = sqlx::query!(
            r#"
            SELECT
                id,
                nom,
                prix,
                actif
            FROM soins
            WHERE id = $1
            FOR UPDATE
            "#,
            ligne.soin_id
        )
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;

        let soin = match soin {
            Some(soin) => soin,
            None => {
                return Err(format!(
                    "Le soin {} n'existe pas.",
                    ligne.soin_id
                ));
            }
        };

        if !soin.actif {
            return Err(format!(
                "Le soin '{}' n'est plus actif.",
                soin.nom
            ));
        }

        total_soins += soin.prix;
    }

    let total_general = total_medicaments + total_soins;

    /* --------------------------------------------------------
       INSÉRER LA COMPTABILITÉ
    -------------------------------------------------------- */

    sqlx::query!(
        r#"
        INSERT INTO comptabilites (
            id,
            patient_id,
            soins,
            consultation,
            hospitalisation,
            total_medicaments,
            total_soins,
            total_general
        )
        VALUES (
            $1,
            $2,
            NULL,
            0,
            $3,
            $4,
            $5,
            $6
        )
        "#,
        comptabilite_id,
        data.patient_id,
        data.hospitalisation,
        total_medicaments,
        total_soins,
        total_general
    )
    .execute(&mut *transaction)
    .await
    .map_err(|error| error.to_string())?;

    /* --------------------------------------------------------
       CRÉER LA SORTIE DES MÉDICAMENTS
    -------------------------------------------------------- */

    let sortie_id = Uuid::new_v4();

    if !data.lignes_medicaments.is_empty() {
        sqlx::query!(
            r#"
            INSERT INTO sorties_medicaments (
                id,
                comptabilite_id
            )
            VALUES ($1, $2)
            "#,
            sortie_id,
            comptabilite_id
        )
        .execute(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;
    }

    /* --------------------------------------------------------
       ENREGISTRER LES MÉDICAMENTS ET DIMINUER LE STOCK
    -------------------------------------------------------- */

    for ligne in &data.lignes_medicaments {
        let medicament = sqlx::query!(
            r#"
            SELECT
                prix_unitaire,
                stock
            FROM medicaments
            WHERE id = $1
            FOR UPDATE
            "#,
            ligne.medicament_id
        )
        .fetch_one(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;

        sqlx::query!(
            r#"
            INSERT INTO lignes_sortie_medicaments (
                id,
                sortie_id,
                medicament_id,
                quantite,
                prix_unitaire
            )
            VALUES ($1, $2, $3, $4, $5)
            "#,
            Uuid::new_v4(),
            sortie_id,
            ligne.medicament_id,
            ligne.quantite,
            medicament.prix_unitaire
        )
        .execute(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;

        let nouveau_stock = medicament.stock - ligne.quantite;

        sqlx::query!(
            r#"
            UPDATE medicaments
            SET stock = $1
            WHERE id = $2
            "#,
            nouveau_stock,
            ligne.medicament_id
        )
        .execute(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;
    }

    /* --------------------------------------------------------
       ENREGISTRER LES SOINS
       Un soin sélectionné = une prestation
    -------------------------------------------------------- */

    for ligne in &data.lignes_soins {
        let soin = sqlx::query!(
            r#"
            SELECT
                nom,
                prix,
                actif
            FROM soins
            WHERE id = $1
            FOR UPDATE
            "#,
            ligne.soin_id
        )
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;

        let soin = match soin {
            Some(soin) => soin,
            None => {
                return Err(format!(
                    "Le soin {} n'existe plus.",
                    ligne.soin_id
                ));
            }
        };

        if !soin.actif {
            return Err(format!(
                "Le soin '{}' n'est plus actif.",
                soin.nom
            ));
        }

        let prix_total = soin.prix;

        sqlx::query!(
            r#"
            INSERT INTO lignes_soins_comptabilite (
                id,
                comptabilite_id,
                soin_id,
                quantite,
                prix_unitaire,
                prix_total
            )
            VALUES ($1, $2, $3, 1, $4, $5)
            "#,
            Uuid::new_v4(),
            comptabilite_id,
            ligne.soin_id,
            soin.prix,
            prix_total
        )
        .execute(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;
    }

    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())?;

    Ok(ComptabiliteResultat {
        comptabilite_id,
        total_medicaments: decimal_to_f64(total_medicaments)?,
        total_soins: decimal_to_f64(total_soins)?,
        total_general: decimal_to_f64(total_general)?,
    })
}

/* ============================================================
   OBTENIR TOUTES LES COMPTABILITÉS
============================================================ */

#[tauri::command]
pub async fn obtenir_comptabilites(
    pool: tauri::State<'_, PgPool>,
) -> Result<Vec<ComptabiliteListe>, String> {
    let comptabilites = sqlx::query!(
        r#"
        SELECT
            c.id,
            c.patient_id,
            p.nom AS patient_nom,
            p.prenom AS patient_prenom,
            c.soins,
            c.consultation,
            c.hospitalisation,
            c.total_medicaments,
            c.total_soins,
            c.total_general,
            c.date_comptabilite
        FROM comptabilites c
        INNER JOIN patients p ON p.id = c.patient_id
        ORDER BY c.date_comptabilite DESC
        "#
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    let mut resultat = Vec::new();

    for comptabilite in comptabilites {
        /* ----------------------------------------------------
           MÉDICAMENTS : PRIX UNITAIRE ET PRIX TOTAL
        ---------------------------------------------------- */

        let medicaments = sqlx::query!(
            r#"
            SELECT
                lsm.medicament_id,
                m.nom,
                lsm.quantite,
                lsm.prix_unitaire
            FROM lignes_sortie_medicaments lsm
            INNER JOIN sorties_medicaments sm
                ON sm.id = lsm.sortie_id
            INNER JOIN medicaments m
                ON m.id = lsm.medicament_id
            WHERE sm.comptabilite_id = $1
            ORDER BY m.nom ASC
            "#,
            comptabilite.id
        )
        .fetch_all(pool.inner())
        .await
        .map_err(|error| error.to_string())?;

        let medicaments_liste: Vec<MedicamentListeComptabilite> =
            medicaments
                .into_iter()
                .map(|medicament| {
                    let prix_total =
                        medicament.prix_unitaire
                            * Decimal::from(medicament.quantite);

                    MedicamentListeComptabilite {
                        medicament_id: medicament.medicament_id,
                        nom: medicament.nom,
                        quantite: medicament.quantite,
                        prix_unitaire: medicament.prix_unitaire,
                        prix_total,
                    }
                })
                .collect();

        /* ----------------------------------------------------
           SOINS AVEC PRIX
        ---------------------------------------------------- */

        let soins = sqlx::query!(
            r#"
            SELECT
                lsc.soin_id,
                s.nom,
                lsc.quantite,
                lsc.prix_unitaire,
                lsc.prix_total
            FROM lignes_soins_comptabilite lsc
            INNER JOIN soins s ON s.id = lsc.soin_id
            WHERE lsc.comptabilite_id = $1
            ORDER BY s.nom ASC
            "#,
            comptabilite.id
        )
        .fetch_all(pool.inner())
        .await
        .map_err(|error| error.to_string())?;

        let soins_liste: Vec<SoinListeComptabilite> = soins
            .into_iter()
            .map(|soin| SoinListeComptabilite {
                soin_id: soin.soin_id,
                nom: soin.nom,
                quantite: soin.quantite,
                prix_unitaire: soin.prix_unitaire,
                prix_total: soin.prix_total,
            })
            .collect();

        resultat.push(ComptabiliteListe {
            id: comptabilite.id,
            patient_id: comptabilite.patient_id,
            patient_nom: comptabilite.patient_nom,
            patient_prenom: comptabilite.patient_prenom,
            soins: comptabilite.soins,
            consultation: comptabilite.consultation,
            hospitalisation: comptabilite.hospitalisation,
            total_medicaments: comptabilite.total_medicaments,
            total_soins: comptabilite.total_soins,
            total_general: comptabilite.total_general,
            medicaments: medicaments_liste,
            soins_lignes: soins_liste,
            date_comptabilite: comptabilite.date_comptabilite,
        });
    }

    Ok(resultat)
}

/* ============================================================
   OBTENIR LES SOINS ACTIFS
============================================================ */

#[derive(Debug, Serialize)]
pub struct SoinActif {
    pub id: Uuid,
    pub nom: String,
    pub prix: Decimal,
}

#[tauri::command]
pub async fn obtenir_soins_actifs(
    pool: tauri::State<'_, PgPool>,
) -> Result<Vec<SoinActif>, String> {
    let soins = sqlx::query!(
        r#"
        SELECT
            id,
            nom,
            prix
        FROM soins
        WHERE actif = TRUE
        ORDER BY nom ASC
        "#
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    Ok(soins
        .into_iter()
        .map(|soin| SoinActif {
            id: soin.id,
            nom: soin.nom,
            prix: soin.prix,
        })
        .collect())
}

/* ============================================================
   OBTENIR LE DÉTAIL COMPLET D'UNE COMPTABILITÉ
============================================================ */

#[tauri::command]
pub async fn obtenir_detail_comptabilite(
    pool: tauri::State<'_, PgPool>,
    comptabilite_id: Uuid,
) -> Result<DetailComptabilite, String> {
    let comptabilite = sqlx::query!(
        r#"
        SELECT
            c.id,
            c.patient_id,
            p.nom AS patient_nom,
            p.prenom AS patient_prenom,
            c.soins,
            c.consultation,
            c.hospitalisation,
            c.total_medicaments,
            c.total_soins,
            c.total_general,
            c.date_comptabilite,
            sm.id AS sortie_id
        FROM comptabilites c
        INNER JOIN patients p ON p.id = c.patient_id
        LEFT JOIN sorties_medicaments sm
            ON sm.comptabilite_id = c.id
        WHERE c.id = $1
        "#,
        comptabilite_id
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    let comptabilite = match comptabilite {
        Some(value) => value,
        None => {
            return Err("Cette comptabilité n'existe pas.".to_string());
        }
    };

    /* --------------------------------------------------------
       MÉDICAMENTS
    -------------------------------------------------------- */

    let medicaments = sqlx::query!(
        r#"
        SELECT
            lsm.medicament_id,
            m.nom,
            lsm.quantite,
            lsm.prix_unitaire
        FROM lignes_sortie_medicaments lsm
        INNER JOIN sorties_medicaments sm
            ON sm.id = lsm.sortie_id
        INNER JOIN medicaments m
            ON m.id = lsm.medicament_id
        WHERE sm.comptabilite_id = $1
        ORDER BY m.nom ASC
        "#,
        comptabilite_id
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    let lignes_medicaments: Vec<DetailMedicamentComptabilite> =
        medicaments
            .into_iter()
            .map(|medicament| {
                let prix_total =
                    medicament.prix_unitaire
                        * Decimal::from(medicament.quantite);

                DetailMedicamentComptabilite {
                    medicament_id: medicament.medicament_id,
                    nom: medicament.nom,
                    quantite: medicament.quantite,
                    prix_unitaire: medicament.prix_unitaire,
                    prix_total,
                }
            })
            .collect();

    /* --------------------------------------------------------
       SOINS
    -------------------------------------------------------- */

    let soins = sqlx::query!(
        r#"
        SELECT
            lsc.soin_id,
            s.nom,
            lsc.quantite,
            lsc.prix_unitaire,
            lsc.prix_total
        FROM lignes_soins_comptabilite lsc
        INNER JOIN soins s ON s.id = lsc.soin_id
        WHERE lsc.comptabilite_id = $1
        ORDER BY s.nom ASC
        "#,
        comptabilite_id
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    let lignes_soins: Vec<DetailSoinComptabilite> = soins
        .into_iter()
        .map(|soin| DetailSoinComptabilite {
            soin_id: soin.soin_id,
            nom: soin.nom,
            quantite: soin.quantite,
            prix_unitaire: soin.prix_unitaire,
            prix_total: soin.prix_total,
        })
        .collect();

    Ok(DetailComptabilite {
        id: comptabilite.id,
        patient_id: comptabilite.patient_id,
        patient_nom: comptabilite.patient_nom,
        patient_prenom: comptabilite.patient_prenom,
        soins: comptabilite.soins,
        consultation: comptabilite.consultation,
        hospitalisation: comptabilite.hospitalisation,
        total_medicaments: comptabilite.total_medicaments,
        total_soins: comptabilite.total_soins,
        total_general: comptabilite.total_general,
        date_comptabilite: comptabilite.date_comptabilite,
        sortie_id: comptabilite.sortie_id,
        medicaments: lignes_medicaments,
        soins_lignes: lignes_soins,
    })
}

/* ============================================================
   NOUVEAU SOIN
============================================================ */

#[derive(Debug, Deserialize)]
pub struct NouveauSoin {
    pub nom: String,
    pub prix: Decimal,
}

/* ============================================================
   SOIN
============================================================ */

#[derive(Debug, Serialize)]
pub struct Soin {
    pub id: Uuid,
    pub nom: String,
    pub prix: Decimal,
    pub actif: bool,
}

/* ============================================================
   AJOUTER UN SOIN
============================================================ */

#[tauri::command]
pub async fn ajouter_soin(
    pool: tauri::State<'_, PgPool>,
    data: NouveauSoin,
) -> Result<Soin, String> {
    let nom = data.nom.trim().to_string();

    if nom.is_empty() {
        return Err("Le nom du soin est obligatoire.".to_string());
    }

    if nom.len() < 2 {
        return Err(
            "Le nom du soin doit contenir au moins 2 caractères."
                .to_string()
        );
    }

    if data.prix < Decimal::ZERO {
        return Err(
            "Le prix du soin ne peut pas être négatif.".to_string()
        );
    }

    let soin_existant = sqlx::query!(
        r#"
        SELECT id
        FROM soins
        WHERE LOWER(nom) = LOWER($1)
        "#,
        nom
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    if soin_existant.is_some() {
        return Err("Un soin portant ce nom existe déjà.".to_string());
    }

    let soin_id = Uuid::new_v4();

    let soin = sqlx::query!(
        r#"
        INSERT INTO soins (
            id,
            nom,
            prix,
            actif
        )
        VALUES ($1, $2, $3, TRUE)
        RETURNING
            id,
            nom,
            prix,
            actif
        "#,
        soin_id,
        nom,
        data.prix
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|error| {
        let message = error.to_string();

        if message.to_lowercase().contains("unique")
            || message.to_lowercase().contains("duplicate")
        {
            "Un soin portant ce nom existe déjà.".to_string()
        } else {
            message
        }
    })?;

    Ok(Soin {
        id: soin.id,
        nom: soin.nom,
        prix: soin.prix,
        actif: soin.actif,
    })
}