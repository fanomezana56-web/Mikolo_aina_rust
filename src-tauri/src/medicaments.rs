use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ============================================================
// MODÈLE : MÉDICAMENT
// ============================================================

#[derive(Debug, Serialize)]
pub struct Medicament {
    pub id: Uuid,
    pub nom: String,
    pub prix_unitaire: Decimal,
    pub stock: i32,
    pub date_expiration: Option<NaiveDate>,
    pub created_at: DateTime<Utc>,
}

// ============================================================
// MODÈLE : ENTRÉE DE MÉDICAMENT
// ============================================================

#[derive(Debug, Serialize)]
pub struct EntreeMedicament {
    pub id: Uuid,
    pub medicament_id: Uuid,
    pub quantite: i32,
    pub prix_unitaire: Decimal,
    pub prix_total: Decimal,
    pub date_entree: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

// ============================================================
// MODÈLE : NOUVEAU MÉDICAMENT
// ============================================================

#[derive(Debug, Deserialize)]
pub struct NouveauMedicament {
    pub nom: String,
    pub quantite: i32,
    pub prix_unitaire: Decimal,

    // Option permet d'accepter NULL
    // Some(date) = date renseignée
    // None = aucune date
    pub date_expiration: Option<NaiveDate>,
}

// ============================================================
// MODÈLE : STOCK MÉDICAMENT
// ============================================================

#[derive(Debug, Serialize)]
pub struct StockMedicament {
    pub id: Uuid,
    pub nom: String,
    pub prix_unitaire: Decimal,
    pub stock: i32,
    pub date_expiration: Option<NaiveDate>,
    pub created_at: DateTime<Utc>,
}

// ============================================================
// AJOUTER UN MÉDICAMENT
// ============================================================

#[tauri::command]
pub async fn ajouter_medicament(
    pool: tauri::State<'_, PgPool>,
    data: NouveauMedicament,
) -> Result<Medicament, String> {
    // --------------------------------------------------------
    // VALIDATION DU NOM
    // --------------------------------------------------------

    if data.nom.trim().is_empty() {
        return Err(
            "Le nom du médicament est obligatoire.".to_string()
        );
    }

    // --------------------------------------------------------
    // VALIDATION DE LA QUANTITÉ
    // --------------------------------------------------------

    if data.quantite <= 0 {
        return Err(
            "La quantité doit être supérieure à 0.".to_string()
        );
    }

    // --------------------------------------------------------
    // VALIDATION DU PRIX
    // --------------------------------------------------------

    if data.prix_unitaire < Decimal::ZERO {
        return Err(
            "Le prix unitaire ne peut pas être négatif.".to_string()
        );
    }

    // --------------------------------------------------------
    // TRANSACTION
    // --------------------------------------------------------

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| e.to_string())?;

    let medicament_id = Uuid::new_v4();

    // --------------------------------------------------------
    // INSERTION DU MÉDICAMENT
    // --------------------------------------------------------

    let medicament = sqlx::query_as!(
        Medicament,
        r#"
        INSERT INTO medicaments (
            id,
            nom,
            prix_unitaire,
            stock,
            date_expiration
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
            id,
            nom,
            prix_unitaire,
            stock,
            date_expiration,
            created_at
        "#,
        medicament_id,
        data.nom.trim(),
        data.prix_unitaire,
        data.quantite,
        data.date_expiration
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // --------------------------------------------------------
    // ENREGISTRER L'ENTRÉE DE STOCK
    // --------------------------------------------------------

    sqlx::query!(
        r#"
        INSERT INTO entrees_medicaments (
            id,
            medicament_id,
            quantite,
            prix_unitaire
        )
        VALUES ($1, $2, $3, $4)
        "#,
        Uuid::new_v4(),
        medicament_id,
        data.quantite,
        data.prix_unitaire
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // --------------------------------------------------------
    // VALIDATION DE LA TRANSACTION
    // --------------------------------------------------------

    tx.commit()
        .await
        .map_err(|e| e.to_string())?;

    Ok(medicament)
}

// ============================================================
// OBTENIR TOUS LES MÉDICAMENTS
// ============================================================

#[tauri::command]
pub async fn obtenir_medicaments(
    pool: tauri::State<'_, PgPool>,
) -> Result<Vec<Medicament>, String> {
    let medicaments = sqlx::query_as!(
        Medicament,
        r#"
        SELECT
            id,
            nom,
            prix_unitaire,
            stock,
            date_expiration,
            created_at
        FROM medicaments
        ORDER BY nom ASC
        "#
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(medicaments)
}

// ============================================================
// AJOUTER UNE ENTRÉE DE STOCK
// ============================================================

#[tauri::command]
pub async fn ajouter_entree_stock(
    pool: tauri::State<'_, PgPool>,
    medicament_id: Uuid,
    quantite: i32,
    prix_unitaire: Decimal,
) -> Result<Medicament, String> {
    // --------------------------------------------------------
    // VALIDATION QUANTITÉ
    // --------------------------------------------------------

    if quantite <= 0 {
        return Err(
            "La quantité doit être supérieure à 0.".to_string()
        );
    }

    // --------------------------------------------------------
    // VALIDATION PRIX
    // --------------------------------------------------------

    if prix_unitaire < Decimal::ZERO {
        return Err(
            "Le prix unitaire ne peut pas être négatif.".to_string()
        );
    }

    // --------------------------------------------------------
    // TRANSACTION
    // --------------------------------------------------------

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| e.to_string())?;

    // --------------------------------------------------------
    // MISE À JOUR DU STOCK
    // --------------------------------------------------------

    let medicament = sqlx::query_as!(
        Medicament,
        r#"
        UPDATE medicaments
        SET
            stock = stock + $1,
            prix_unitaire = $2
        WHERE id = $3
        RETURNING
            id,
            nom,
            prix_unitaire,
            stock,
            date_expiration,
            created_at
        "#,
        quantite,
        prix_unitaire,
        medicament_id
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let medicament = match medicament {
        Some(medicament) => medicament,

        None => {
            return Err(
                "Médicament introuvable.".to_string()
            );
        }
    };

    // --------------------------------------------------------
    // ENREGISTRER L'ENTRÉE
    // --------------------------------------------------------

    sqlx::query!(
        r#"
        INSERT INTO entrees_medicaments (
            id,
            medicament_id,
            quantite,
            prix_unitaire
        )
        VALUES ($1, $2, $3, $4)
        "#,
        Uuid::new_v4(),
        medicament_id,
        quantite,
        prix_unitaire
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // --------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------

    tx.commit()
        .await
        .map_err(|e| e.to_string())?;

    Ok(medicament)
}

// ============================================================
// OBTENIR LE STOCK DES MÉDICAMENTS
// ============================================================

#[tauri::command]
pub async fn obtenir_stock_medicaments(
    pool: tauri::State<'_, PgPool>,
) -> Result<Vec<StockMedicament>, String> {
    let medicaments = sqlx::query_as!(
        StockMedicament,
        r#"
        SELECT
            id,
            nom,
            prix_unitaire,
            stock,
            date_expiration,
            created_at
        FROM medicaments
        ORDER BY nom ASC
        "#
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|error| error.to_string())?;

    Ok(medicaments)
}

// ============================================================
// MODIFIER LE STOCK
// ============================================================

#[tauri::command]
pub async fn modifier_stock(
    pool: tauri::State<'_, sqlx::PgPool>,
    medicament_id: uuid::Uuid,
    nouveau_stock: i32,
) -> Result<String, String> {
    if nouveau_stock < 0 {
        return Err(
            "Le stock ne peut pas être négatif.".to_string()
        );
    }

    let resultat = sqlx::query!(
        r#"
        UPDATE medicaments
        SET stock = $1
        WHERE id = $2
        "#,
        nouveau_stock,
        medicament_id
    )
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    if resultat.rows_affected() == 0 {
        return Err(
            "Médicament introuvable.".to_string()
        );
    }

    Ok(
        "Stock modifié avec succès.".to_string()
    )
}

// ============================================================
// RETIRER DU STOCK
// ============================================================

#[tauri::command]
pub async fn retirer_stock(
    pool: tauri::State<'_, sqlx::PgPool>,
    medicament_id: uuid::Uuid,
    quantite: i32,
) -> Result<String, String> {
    if quantite <= 0 {
        return Err(
            "La quantité doit être supérieure à zéro."
                .to_string()
        );
    }

    let resultat = sqlx::query!(
        r#"
        UPDATE medicaments
        SET stock = stock - $1
        WHERE id = $2
          AND stock >= $1
        "#,
        quantite,
        medicament_id
    )
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    if resultat.rows_affected() == 0 {
        return Err(
            "Stock insuffisant ou médicament introuvable."
                .to_string()
        );
    }

    Ok(
        "Stock réduit avec succès.".to_string()
    )
}
#[derive(Debug, Deserialize)]

pub struct ModificationMedicament {
    pub nom: String,
    pub prix_unitaire: Decimal,
    pub stock: i32,
    pub date_expiration: Option<NaiveDate>,
}

#[tauri::command]
pub async fn modifier_medicament(
    pool: tauri::State<'_, PgPool>,
    medicament_id: Uuid,
    data: ModificationMedicament,
) -> Result<Medicament, String> {
    if data.nom.trim().is_empty() {
        return Err("Le nom du médicament est obligatoire.".to_string());
    }

    if data.prix_unitaire < Decimal::ZERO {
        return Err(
            "Le prix unitaire ne peut pas être négatif.".to_string()
        );
    }

    if data.stock < 0 {
        return Err(
            "Le stock ne peut pas être négatif.".to_string()
        );
    }

    let resultat = sqlx::query_as!(
        Medicament,
        r#"
        UPDATE medicaments
        SET
            nom = $1,
            prix_unitaire = $2,
            stock = $3,
            date_expiration = $4
        WHERE id = $5
        RETURNING
            id,
            nom,
            prix_unitaire,
            stock,
            date_expiration,
            created_at
        "#,
        data.nom.trim(),
        data.prix_unitaire,
        data.stock,
        data.date_expiration,
        medicament_id
    )
    .fetch_optional(pool.inner())
    .await;

    match resultat {
        Ok(Some(medicament)) => Ok(medicament),

        Ok(None) => {
            Err("Médicament introuvable.".to_string())
        }

        Err(sqlx::Error::Database(db_error))
            if db_error.constraint()
                == Some("medicaments_nom_key") =>
        {
            Err(
                "Un médicament portant ce nom existe déjà."
                    .to_string()
            )
        }

        Err(error) => {
            Err(format!(
                "Erreur lors de la modification : {}",
                error
            ))
        }
    }
}