
mod database;
mod medicaments;
mod patients;
mod comptabilite;
mod sorties_medicaments;
mod sorties_diverses;
mod factures;
mod facture_pdf;
mod finances;
mod auth;

use sqlx::PgPool;
use std::{fs, io};
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from the Rust app!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenvy::dotenv().ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialiser PostgreSQL et appliquer les migrations.
            let resultat = tauri::async_runtime::block_on(
                database::create_pool()
            );

            let pool = match resultat {
                Ok(pool) => pool,

                Err(erreur) => {
                    let message = format!(
                        "Échec de l'initialisation de PostgreSQL \
                         ou des migrations SQLx : {}",
                        erreur
                    );

                    eprintln!("{}", message);

                    // Enregistrer l'erreur dans le dossier de données
                    // de l'application, sans dépendre du dossier courant.
                    if let Ok(dossier) = app.path().app_data_dir() {
                        if fs::create_dir_all(&dossier).is_ok() {
                            let chemin = dossier.join("startup.log");

                            let _ = fs::write(
                                chemin,
                                format!("{}\n", message),
                            );
                        }
                    }

                    return Err(Box::new(io::Error::other(message))
                        as Box<dyn std::error::Error>);
                }
            };

            app.manage(pool.clone());
            app.manage(auth::AuthState::new(pool));

            println!("Base de données connectée !");
            println!("Service d'authentification initialisé !");
            println!("Migrations SQLx terminées !");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            medicaments::ajouter_medicament,
            medicaments::obtenir_medicaments,
            medicaments::ajouter_entree_stock,
            medicaments::obtenir_stock_medicaments,
            medicaments::modifier_stock,
            medicaments::retirer_stock,
            medicaments::modifier_medicament,

            patients::ajouter_patient,
            patients::obtenir_patients,
            patients::rechercher_patients,
            patients::modifier_patient,
            patients::supprimer_patient,

            comptabilite::enregistrer_comptabilite,
            comptabilite::obtenir_comptabilites,
            comptabilite::obtenir_detail_comptabilite,
            comptabilite::obtenir_soins_actifs,
            comptabilite::ajouter_soin,

            sorties_medicaments::obtenir_sorties_medicaments,
            sorties_medicaments::obtenir_detail_sortie_medicament,

            sorties_diverses::enregistrer_sortie_diverse,
            sorties_diverses::obtenir_sorties_diverses,

            factures::enregistrer_facture,
            factures::obtenir_factures,
            factures::obtenir_detail_facture,

            facture_pdf::generer_pdf_facture,
            facture_pdf::ouvrir_pdf_facture,

            finances::obtenir_solde_centre,

            auth::auth_est_initialisee,
            auth::initialiser_premier_administrateur,
            auth::connexion,
            auth::verifier_authentification,
            auth::deconnexion,
            auth::recuperer_compte,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de Tauri");
}
