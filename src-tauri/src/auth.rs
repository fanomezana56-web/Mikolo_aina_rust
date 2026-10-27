
use argon2::{
    password_hash::{
        PasswordHash,
        PasswordHasher,
        PasswordVerifier,
        SaltString,
    },
    Argon2,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use chrono::{DateTime, Duration, Utc};
use rand::{rngs::OsRng, RngCore};
use serde::Serialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use tauri::State;
use tokio::sync::Mutex;
use uuid::Uuid;

const INACTIVITE_MINUTES: i64 = 10;
const SESSION_MAX_HEURES: i64 = 8;
const MAX_ECHECS: i32 = 5;
const VERROUILLAGE_MINUTES: i64 = 15;

#[derive(Clone, Serialize)]
pub struct Utilisateur {
    pub id: Uuid,
    pub username: String,
    pub role: String,
}

#[derive(Clone)]
struct Session {
    utilisateur: Utilisateur,
    derniere_activite: DateTime<Utc>,
    expiration: DateTime<Utc>,
}

pub struct AuthState {
    pub pool: PgPool,
    sessions: Mutex<HashMap<String, Session>>,
}

impl AuthState {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub async fn verifier_session(
        &self,
        jeton: &str,
    ) -> Result<Utilisateur, String> {
        if jeton.is_empty() {
            return Err("Veuillez vous connecter.".into());
        }

        let maintenant = Utc::now();
        let mut sessions = self.sessions.lock().await;

        let session = sessions
            .get(jeton)
            .cloned()
            .ok_or_else(|| "Session invalide. Reconnectez-vous.".to_string())?;

        if maintenant >= session.expiration
            || maintenant - session.derniere_activite
                >= Duration::minutes(INACTIVITE_MINUTES)
        {
            sessions.remove(jeton);
            return Err("Session expirée. Veuillez vous reconnecter.".into());
        }

        let session = sessions
            .get_mut(jeton)
            .ok_or_else(|| "Session invalide.".to_string())?;

        session.derniere_activite = maintenant;
        Ok(session.utilisateur.clone())
    }

    pub async fn exiger_admin(
        &self,
        jeton: &str,
    ) -> Result<Utilisateur, String> {
        let utilisateur = self.verifier_session(jeton).await?;

        if utilisateur.role != "administrateur" {
            audit(
                &self.pool,
                Some(utilisateur.id),
                Some(&utilisateur.username),
                "permission_refusee",
                false,
                json!({}),
            )
            .await?;

            return Err("Permission refusée.".into());
        }

        Ok(utilisateur)
    }
}

fn hacher(secret: &str) -> Result<String, String> {
    let sel = SaltString::generate(&mut OsRng);

    Argon2::default()
        .hash_password(secret.as_bytes(), &sel)
        .map(|hash| hash.to_string())
        .map_err(|_| "Impossible de sécuriser le secret.".to_string())
}

fn verifier_hash(secret: &str, empreinte: &str) -> bool {
    let hash = match PasswordHash::new(empreinte) {
        Ok(hash) => hash,
        Err(_) => return false,
    };

    Argon2::default()
        .verify_password(secret.as_bytes(), &hash)
        .is_ok()
}

fn nouvelle_cle() -> String {
    let mut octets = [0u8; 32];
    OsRng.fill_bytes(&mut octets);
    URL_SAFE_NO_PAD.encode(octets)
}

fn valider_mot_de_passe(mot_de_passe: &str) -> Result<(), String> {
    if mot_de_passe.chars().count() < 12 {
        return Err(
            "Le mot de passe doit contenir au moins 12 caractères.".into()
        );
    }

    if mot_de_passe.len() > 1024 {
        return Err("Le mot de passe est trop long.".into());
    }

    Ok(())
}

fn valider_username(username: &str) -> Result<String, String> {
    let username = username.trim().to_lowercase();

    if !(3..=50).contains(&username.len()) {
        return Err(
            "Le nom d'utilisateur doit contenir de 3 à 50 caractères.".into()
        );
    }

    if !username
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.'))
    {
        return Err("Nom d'utilisateur invalide.".into());
    }

    Ok(username)
}

async fn audit(
    pool: &PgPool,
    user_id: Option<Uuid>,
    username: Option<&str>,
    action: &str,
    success: bool,
    details: serde_json::Value,
) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO auth_audit
            (user_id, username, action, success, details)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(user_id)
    .bind(username)
    .bind(action)
    .bind(success)
    .bind(details)
    .execute(pool)
    .await
    .map_err(|e| format!("Erreur du journal d'audit : {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn auth_est_initialisee(
    state: State<'_, AuthState>,
) -> Result<bool, String> {
    let nombre: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM app_users"
    )
    .fetch_one(&state.pool)
    .await
    .map_err(|e| format!("Vérification impossible : {e}"))?;

    Ok(nombre > 0)
}

#[derive(Serialize)]
pub struct InitialisationResultat {
    pub cle_recuperation: String,
}

#[tauri::command]
pub async fn initialiser_premier_administrateur(
    state: State<'_, AuthState>,
    username: String,
    mot_de_passe: String,
) -> Result<InitialisationResultat, String> {
    let username = valider_username(&username)?;
    valider_mot_de_passe(&mot_de_passe)?;

    let password_hash = hacher(&mot_de_passe)?;
    let cle = nouvelle_cle();
    let recovery_hash = hacher(&cle)?;

    let mut tx = state.pool.begin().await
        .map_err(|e| format!("Connexion à la base impossible : {e}"))?;

    // Sérialise les tentatives d'initialisation simultanées.
    sqlx::query("SELECT pg_advisory_xact_lock(20261013)")
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Verrouillage impossible : {e}"))?;

    let nombre: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM app_users"
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Lecture impossible : {e}"))?;

    if nombre != 0 {
        return Err(
            "Le compte administrateur existe déjà. Initialisation interdite."
                .into()
        );
    }

    let id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO app_users
            (id, username, password_hash, recovery_key_hash, role)
        VALUES ($1, $2, $3, $4, 'administrateur')
        "#,
    )
    .bind(id)
    .bind(&username)
    .bind(password_hash)
    .bind(recovery_hash)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Création du compte impossible : {e}"))?;

    sqlx::query(
        r#"
        INSERT INTO auth_audit
            (user_id, username, action, success, details)
        VALUES ($1, $2, 'initialisation_administrateur', TRUE, '{}'::jsonb)
        "#,
    )
    .bind(id)
    .bind(&username)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Journalisation impossible : {e}"))?;

    tx.commit()
        .await
        .map_err(|e| format!("Validation impossible : {e}"))?;

    // La clé en clair n'est renvoyée qu'à cette étape.
    Ok(InitialisationResultat {
        cle_recuperation: cle,
    })
}

#[derive(Serialize)]
pub struct ConnexionResultat {
    pub jeton: String,
    pub utilisateur: Utilisateur,
}

#[tauri::command]
pub async fn connexion(
    state: State<'_, AuthState>,
    username: String,
    mot_de_passe: String,
) -> Result<ConnexionResultat, String> {
    let username = valider_username(&username)?;

    let ligne = sqlx::query(
        r#"
        SELECT id, username, password_hash, role, actif,
               failed_attempts, locked_until
        FROM app_users
        WHERE username = $1
        "#,
    )
    .bind(&username)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| format!("Erreur de base de données : {e}"))?;

    let Some(ligne) = ligne else {
        audit(
            &state.pool, None, Some(&username),
            "connexion_refusee", false,
            json!({"raison": "compte_inconnu"}),
        ).await?;
        return Err("Identifiants incorrects ou compte verrouillé.".into());
    };

    let id: Uuid = ligne.try_get("id").map_err(|e| e.to_string())?;
    let nom: String = ligne.try_get("username").map_err(|e| e.to_string())?;
    let hash: String = ligne.try_get("password_hash").map_err(|e| e.to_string())?;
    let role: String = ligne.try_get("role").map_err(|e| e.to_string())?;
    let actif: bool = ligne.try_get("actif").map_err(|e| e.to_string())?;
    let echecs: i32 = ligne.try_get("failed_attempts").map_err(|e| e.to_string())?;
    let verrou: Option<DateTime<Utc>> =
        ligne.try_get("locked_until").map_err(|e| e.to_string())?;

    if !actif || verrou.map(|date| date > Utc::now()).unwrap_or(false) {
        audit(
            &state.pool, Some(id), Some(&nom),
            "connexion_refusee", false,
            json!({"raison": "compte_inactif_ou_verrouille"}),
        ).await?;
        return Err("Identifiants incorrects ou compte verrouillé.".into());
    }

    let correct = verifier_hash(&mot_de_passe, &hash);

    if !correct {
        sqlx::query(
            r#"
            UPDATE app_users
            SET failed_attempts = failed_attempts + 1,
                locked_until = CASE
                    WHEN failed_attempts + 1 >= $2
                    THEN NOW() + ($3 * INTERVAL '1 minute')
                    ELSE locked_until
                END,
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(MAX_ECHECS)
        .bind(VERROUILLAGE_MINUTES)
        .execute(&state.pool)
        .await
        .map_err(|e| format!("Mise à jour impossible : {e}"))?;

        audit(
            &state.pool, Some(id), Some(&nom),
            "connexion_refusee", false,
            json!({"raison": "mot_de_passe_incorrect"}),
        ).await?;

        return Err("Identifiants incorrects ou compte verrouillé.".into());
    }

    let _ = echecs;

    sqlx::query(
        r#"
        UPDATE app_users
        SET failed_attempts = 0, locked_until = NULL, updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(&state.pool)
    .await
    .map_err(|e| format!("Réinitialisation des tentatives impossible : {e}"))?;

    audit(
        &state.pool, Some(id), Some(&nom),
        "connexion_reussie", true, json!({}),
    ).await?;

    let jeton = nouvelle_cle();
    let maintenant = Utc::now();

    let utilisateur = Utilisateur {
        id,
        username: nom,
        role,
    };

    state.sessions.lock().await.insert(
        jeton.clone(),
        Session {
            utilisateur: utilisateur.clone(),
            derniere_activite: maintenant,
            expiration: maintenant + Duration::hours(SESSION_MAX_HEURES),
        },
    );

    Ok(ConnexionResultat { jeton, utilisateur })
}

#[tauri::command]
pub async fn verifier_authentification(
    state: State<'_, AuthState>,
    jeton: String,
) -> Result<Utilisateur, String> {
    state.verifier_session(&jeton).await
}

#[tauri::command]
pub async fn deconnexion(
    state: State<'_, AuthState>,
    jeton: String,
) -> Result<(), String> {
    let utilisateur = state.verifier_session(&jeton).await.ok();
    state.sessions.lock().await.remove(&jeton);

    if let Some(u) = utilisateur {
        audit(
            &state.pool, Some(u.id), Some(&u.username),
            "deconnexion", true, json!({}),
        ).await?;
    }

    Ok(())
}

#[derive(Serialize)]
pub struct RecuperationResultat {
    pub nouvelle_cle_recuperation: String,
}

#[tauri::command]
pub async fn recuperer_compte(
    state: State<'_, AuthState>,
    username: String,
    cle_recuperation: String,
    nouveau_mot_de_passe: String,
) -> Result<RecuperationResultat, String> {
    let username = valider_username(&username)?;
    valider_mot_de_passe(&nouveau_mot_de_passe)?;

    if cle_recuperation.len() < 40 || cle_recuperation.len() > 100 {
        return Err("Clé de récupération invalide.".into());
    }

    let mut tx = state.pool.begin().await
        .map_err(|e| format!("Connexion à la base impossible : {e}"))?;

    sqlx::query("SELECT pg_advisory_xact_lock(20261014)")
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Verrouillage impossible : {e}"))?;

    let ligne = sqlx::query(
        r#"
        SELECT id, username, recovery_key_hash
        FROM app_users
        WHERE username = $1 AND actif = TRUE
        FOR UPDATE
        "#,
    )
    .bind(&username)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| format!("Lecture impossible : {e}"))?;

    let Some(ligne) = ligne else {
        return Err("Impossible de vérifier les informations de récupération.".into());
    };

    let id: Uuid = ligne.try_get("id").map_err(|e| e.to_string())?;
    let nom: String = ligne.try_get("username").map_err(|e| e.to_string())?;
    let hash: String = ligne.try_get("recovery_key_hash").map_err(|e| e.to_string())?;

    if !verifier_hash(&cle_recuperation, &hash) {
        sqlx::query(
            r#"
            UPDATE app_users
            SET failed_attempts = failed_attempts + 1,
                locked_until = CASE
                    WHEN failed_attempts + 1 >= $2
                    THEN NOW() + ($3 * INTERVAL '1 minute')
                    ELSE locked_until
                END,
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(MAX_ECHECS)
        .bind(VERROUILLAGE_MINUTES)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Mise à jour impossible : {e}"))?;

        sqlx::query(
            r#"
            INSERT INTO auth_audit
                (user_id, username, action, success, details)
            VALUES ($1, $2, 'recuperation_refusee', FALSE, '{}'::jsonb)
            "#,
        )
        .bind(id)
        .bind(&nom)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Audit impossible : {e}"))?;

        tx.commit().await
            .map_err(|e| format!("Validation impossible : {e}"))?;

        return Err("Clé de récupération incorrecte.".into());
    }

    let nouveau_hash = hacher(&nouveau_mot_de_passe)?;
    let nouvelle_cle = nouvelle_cle();
    let nouvelle_cle_hash = hacher(&nouvelle_cle)?;

    sqlx::query(
        r#"
        UPDATE app_users
        SET password_hash = $2,
            recovery_key_hash = $3,
            failed_attempts = 0,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(nouveau_hash)
    .bind(nouvelle_cle_hash)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Mise à jour du compte impossible : {e}"))?;

    sqlx::query(
        r#"
        INSERT INTO auth_audit
            (user_id, username, action, success, details)
        VALUES ($1, $2, 'mot_de_passe_reinitialise', TRUE, '{}'::jsonb)
        "#,
    )
    .bind(id)
    .bind(&nom)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Audit impossible : {e}"))?;

    tx.commit().await
        .map_err(|e| format!("Validation impossible : {e}"))?;

    // Invalide les sessions qui pourraient être encore actives.
    state.sessions.lock().await.clear();

    Ok(RecuperationResultat {
        nouvelle_cle_recuperation: nouvelle_cle,
    })
}
