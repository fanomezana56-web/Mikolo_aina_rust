
use rust_decimal::Decimal;
use serde::Serialize;
use sqlx::PgPool;

#[derive(Debug, Serialize)]
pub struct SoldeCentre {
    pub total_medicaments: Decimal,
    pub total_soins: Decimal,
    pub total_comptabilites: Decimal,
    pub total_sorties_diverses: Decimal,
    pub montant_total: Decimal,
}

#[tauri::command]
pub async fn obtenir_solde_centre(
    pool: tauri::State<'_, PgPool>,
) -> Result<SoldeCentre, String> {
    let result = sqlx::query!(
        r#"
        SELECT
            COALESCE(
                SUM(c.total_medicaments),
                0
            ) AS "total_medicaments!",

            COALESCE(
                SUM(c.total_soins),
                0
            ) AS "total_soins!",

            COALESCE(
                SUM(c.total_general),
                0
            ) AS "total_comptabilites!",

            (
                SELECT COALESCE(SUM(sd.montant), 0)
                FROM sorties_diverses sd
            ) AS "total_sorties_diverses!"

        FROM comptabilites c
        "#
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|error| {
        format!(
            "Erreur lors du calcul du capital du centre : {}",
            error
        )
    })?;

    let total_medicaments = result.total_medicaments;
    let total_soins = result.total_soins;
    let total_comptabilites = result.total_comptabilites;
    let total_sorties_diverses = result.total_sorties_diverses;

    let montant_total =
        total_comptabilites - total_sorties_diverses;

    Ok(SoldeCentre {
        total_medicaments,
        total_soins,
        total_comptabilites,
        total_sorties_diverses,
        montant_total,
    })
}
