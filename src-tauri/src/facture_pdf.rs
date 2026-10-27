
use chrono::Local;
use printpdf::*;
use rust_decimal::Decimal;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::factures::obtenir_detail_facture;

// ============================================================
// INFORMATIONS DU CENTRE
// ============================================================

const NOM_CENTRE: &str = "MIKOLO AINA";
const TYPE_CENTRE: &str = "CENTRE DE SANTE";
const PROPRIETAIRE: &str = "Dina Elsa";
const TELEPHONE: &str = "0321837055";
const ADRESSE: &str = "Antananarivo, Madagascar";

const EMAIL: &str = "";
const NIF: &str = "";
const STAT: &str = "";

// ============================================================
// DIMENSIONS DU TICKET
// ============================================================

const LARGEUR_PAGE: f32 = 80.0;
const MARGE_GAUCHE: f32 = 5.0;
const MARGE_DROITE: f32 = 5.0;

const X_DEBUT: f32 = MARGE_GAUCHE;
const X_FIN: f32 = LARGEUR_PAGE - MARGE_DROITE;

// ============================================================
// FORMATAGE
// ============================================================

fn format_ar(montant: Decimal) -> String {
    format!("{} Ar", montant.round_dp(2))
}

fn format_numero_facture(numero: &str) -> String {
    let numero = numero.trim();

    if numero.contains('-') {
        return numero.to_string();
    }

    if numero.len() > 4 && numero.is_char_boundary(4) {
        return format!("{}-{}", &numero[..4], &numero[4..]);
    }

    numero.to_string()
}

// ============================================================
// DÉCOUPER UN TEXTE EN LIGNES
// ============================================================

fn decouper_lignes(texte: &str, longueur_max: usize) -> Vec<String> {
    let texte = texte.trim();

    if texte.is_empty() {
        return vec!["Aucun renseignement".to_string()];
    }

    let longueur_max = longueur_max.max(1);
    let mut lignes = Vec::new();
    let mut ligne = String::new();

    for mot in texte.split_whitespace() {
        if mot.chars().count() > longueur_max {
            if !ligne.is_empty() {
                lignes.push(ligne.clone());
                ligne.clear();
            }

            let caracteres: Vec<char> = mot.chars().collect();

            for morceau in caracteres.chunks(longueur_max) {
                lignes.push(morceau.iter().collect());
            }

            continue;
        }

        let nouvelle_longueur =
            ligne.chars().count()
            + if ligne.is_empty() { 0 } else { 1 }
            + mot.chars().count();

        if nouvelle_longueur > longueur_max && !ligne.is_empty() {
            lignes.push(ligne.clone());
            ligne.clear();
        }

        if !ligne.is_empty() {
            ligne.push(' ');
        }

        ligne.push_str(mot);
    }

    if !ligne.is_empty() {
        lignes.push(ligne);
    }

    if lignes.is_empty() {
        lignes.push("Aucun renseignement".to_string());
    }

    lignes
}

// ============================================================
// AJOUTER DU TEXTE
// ============================================================

fn ajouter_texte(
    ops: &mut Vec<Op>,
    x: f32,
    y: f32,
    taille: f32,
    gras: bool,
    contenu: String,
) {
    ops.push(Op::StartTextSection);

    ops.push(Op::SetTextCursor {
        pos: Point::new(Mm(x), Mm(y)),
    });

    ops.push(Op::SetFont {
        font: PdfFontHandle::Builtin(
            if gras {
                BuiltinFont::HelveticaBold
            } else {
                BuiltinFont::Helvetica
            },
        ),
        size: Pt(taille),
    });

    ops.push(Op::ShowText {
        items: vec![TextItem::Text(contenu)],
    });

    ops.push(Op::EndTextSection);
}

// ============================================================
// TEXTE CENTRÉ
// ============================================================

fn texte_centre(
    ops: &mut Vec<Op>,
    y: f32,
    taille: f32,
    gras: bool,
    contenu: String,
) {
    let largeur = contenu.chars().count() as f32 * taille * 0.42;

    let x = ((LARGEUR_PAGE - largeur) / 2.0)
        .max(MARGE_GAUCHE);

    ajouter_texte(ops, x, y, taille, gras, contenu);
}

// ============================================================
// TEXTE ALIGNÉ À DROITE
// ============================================================

fn texte_droite(
    ops: &mut Vec<Op>,
    x_fin: f32,
    y: f32,
    taille: f32,
    gras: bool,
    contenu: String,
) {
    let largeur = contenu.chars().count() as f32 * taille * 0.42;
    let x = (x_fin - largeur).max(MARGE_GAUCHE);

    ajouter_texte(ops, x, y, taille, gras, contenu);
}

// ============================================================
// TEXTE CENTRÉ DANS UNE COLONNE
// ============================================================

fn texte_colonne_centre(
    ops: &mut Vec<Op>,
    x_debut: f32,
    x_fin: f32,
    y: f32,
    taille: f32,
    gras: bool,
    contenu: String,
) {
    let largeur = contenu.chars().count() as f32 * taille * 0.42;
    let largeur_colonne = x_fin - x_debut;

    let x = x_debut
        + ((largeur_colonne - largeur) / 2.0).max(0.0);

    ajouter_texte(ops, x, y, taille, gras, contenu);
}

// ============================================================
// LIGNES
// ============================================================

fn ligne(
    ops: &mut Vec<Op>,
    x1: f32,
    y1: f32,
    x2: f32,
    y2: f32,
) {
    ops.push(Op::DrawLine {
        line: Line {
            points: vec![
                LinePoint {
                    p: Point::new(Mm(x1), Mm(y1)),
                    bezier: false,
                },
                LinePoint {
                    p: Point::new(Mm(x2), Mm(y2)),
                    bezier: false,
                },
            ],
            is_closed: false,
        },
    });
}

fn ligne_pointillee(
    ops: &mut Vec<Op>,
    x1: f32,
    y: f32,
    x2: f32,
) {
    let mut x = x1;

    while x < x2 {
        let fin = (x + 1.4).min(x2);
        ligne(ops, x, y, fin, y);
        x += 2.8;
    }
}

// ============================================================
// RECTANGLE
// ============================================================

fn rectangle(
    ops: &mut Vec<Op>,
    x: f32,
    y: f32,
    largeur: f32,
    hauteur: f32,
) {
    ligne(ops, x, y, x + largeur, y);
    ligne(ops, x, y, x, y - hauteur);
    ligne(ops, x + largeur, y, x + largeur, y - hauteur);
    ligne(ops, x, y - hauteur, x + largeur, y - hauteur);
}

// ============================================================
// LOGO MÉDICAL
// ============================================================

fn logo_medical(
    ops: &mut Vec<Op>,
    centre_x: f32,
    centre_y: f32,
) {
    rectangle(
        ops,
        centre_x - 3.5,
        centre_y + 3.5,
        7.0,
        7.0,
    );

    ligne(
        ops,
        centre_x,
        centre_y + 2.0,
        centre_x,
        centre_y - 2.0,
    );

    ligne(
        ops,
        centre_x - 2.0,
        centre_y,
        centre_x + 2.0,
        centre_y,
    );
}

// ============================================================
// GÉNÉRER LE PDF DE LA FACTURE
// ============================================================

#[tauri::command]
pub async fn generer_pdf_facture(
    app: AppHandle,
    id: Uuid,
) -> Result<String, String> {
    let pool = app.state::<sqlx::PgPool>();

    let facture = obtenir_detail_facture(id, pool).await?;

    // --------------------------------------------------------
    // DESCRIPTION ET DIMENSIONS DYNAMIQUES
    // --------------------------------------------------------

    let description_soins = facture
        .soins
        .clone()
        .unwrap_or_default()
        .trim()
        .to_string();

    let lignes_description = if description_soins.is_empty() {
        Vec::new()
    } else {
        decouper_lignes(&description_soins, 31)
    };

    let mut lignes_soins_estimees = 0usize;

    for soin in &facture.soins_lignes {
        lignes_soins_estimees +=
            decouper_lignes(&soin.nom, 17).len().max(1);
    }

    let mut lignes_medicaments_estimees = 0usize;

    for medicament in &facture.medicaments {
        lignes_medicaments_estimees +=
            decouper_lignes(&medicament.nom, 17).len().max(1);
    }

    // Espace réservé au total et au bloc de fin.
    let hauteur_page =
        285.0
        + lignes_description.len().saturating_sub(1) as f32 * 5.5
        + lignes_soins_estimees as f32 * 7.0
        + lignes_medicaments_estimees as f32 * 7.0;

    // --------------------------------------------------------
    // CRÉATION DU DOCUMENT
    // --------------------------------------------------------

    let mut doc = PdfDocument::new(
        &format!("Facture {}", facture.numero),
    );

    let mut ops = Vec::new();
    let mut y = hauteur_page - 12.0;

    // ========================================================
    // EN-TÊTE DU CENTRE
    // ========================================================

    logo_medical(&mut ops, 9.0, y + 0.5);

    ajouter_texte(
        &mut ops,
        15.0,
        y,
        12.0,
        true,
        NOM_CENTRE.to_string(),
    );

    y -= 6.0;

    texte_centre(
        &mut ops,
        y,
        7.3,
        false,
        TYPE_CENTRE.to_string(),
    );

    y -= 5.5;

    texte_centre(
        &mut ops,
        y,
        6.2,
        false,
        ADRESSE.to_string(),
    );

    y -= 5.2;

    texte_centre(
        &mut ops,
        y,
        6.2,
        false,
        format!("Tel : {}", TELEPHONE),
    );

    if !EMAIL.is_empty() {
        y -= 5.0;

        texte_centre(
            &mut ops,
            y,
            5.8,
            false,
            EMAIL.to_string(),
        );
    }

    y -= 7.5;

    if !NIF.is_empty() {
        ajouter_texte(
            &mut ops,
            X_DEBUT,
            y,
            5.6,
            false,
            format!("NIF : {}", NIF),
        );

        y -= 5.0;
    }

    if !STAT.is_empty() {
        ajouter_texte(
            &mut ops,
            X_DEBUT,
            y,
            5.6,
            false,
            format!("STAT : {}", STAT),
        );

        y -= 5.0;
    }

    ajouter_texte(
        &mut ops,
        X_DEBUT,
        y,
        5.6,
        false,
        format!("Proprietaire : {}", PROPRIETAIRE),
    );

    y -= 6.5;

    ligne_pointillee(
        &mut ops,
        X_DEBUT - 1.0,
        y,
        X_FIN + 1.0,
    );

    // ========================================================
    // TITRE ET NUMÉRO DE FACTURE
    // ========================================================

    y -= 9.0;

    texte_centre(
        &mut ops,
        y,
        10.5,
        true,
        "FACTURE".to_string(),
    );

    y -= 7.5;

    ajouter_texte(
        &mut ops,
        X_DEBUT,
        y,
        7.0,
        true,
        format!(
            "N° {}",
            format_numero_facture(&facture.numero)
        ),
    );

    y -= 6.5;

    ligne_pointillee(
        &mut ops,
        X_DEBUT - 1.0,
        y,
        X_FIN + 1.0,
    );

    // ========================================================
    // INFORMATIONS PATIENT
    // ========================================================

    y -= 9.0;

    ajouter_texte(
        &mut ops,
        X_DEBUT,
        y,
        7.5,
        true,
        "PATIENT".to_string(),
    );

    y -= 6.5;

    let patient_nom = match &facture.patient_prenom {
        Some(prenom) if !prenom.trim().is_empty() => {
            format!("{} {}", facture.patient_nom, prenom)
        }
        _ => facture.patient_nom.clone(),
    };

    for ligne_patient in decouper_lignes(&patient_nom, 31) {
        ajouter_texte(
            &mut ops,
            X_DEBUT,
            y,
            7.0,
            true,
            ligne_patient,
        );

        y -= 5.5;
    }

    y -= 2.0;

    ligne_pointillee(
        &mut ops,
        X_DEBUT - 1.0,
        y,
        X_FIN + 1.0,
    );

    // ========================================================
    // SOINS
    // ========================================================

    y -= 9.0;

    ajouter_texte(
        &mut ops,
        X_DEBUT,
        y,
        7.5,
        true,
        "SOINS".to_string(),
    );

    y -= 6.0;

    if !lignes_description.is_empty() {
        ajouter_texte(
            &mut ops,
            X_DEBUT,
            y,
            5.8,
            false,
            "Description :".to_string(),
        );

        y -= 5.0;

        for description in &lignes_description {
            ajouter_texte(
                &mut ops,
                X_DEBUT,
                y,
                5.8,
                false,
                description.clone(),
            );

            y -= 5.0;
        }

        y -= 1.0;
    }

    // Colonnes du tableau.
    const COL_NOM_DEBUT: f32 = 5.0;
    const COL_QTE_DEBUT: f32 = 37.0;
    const COL_QTE_FIN: f32 = 44.0;
    const COL_PU_FIN: f32 = 61.0;
    const COL_TOTAL_FIN: f32 = 75.0;

    // En-tête du tableau des soins.
    ajouter_texte(
        &mut ops,
        COL_NOM_DEBUT,
        y,
        5.0,
        true,
        "Soin".to_string(),
    );

    texte_colonne_centre(
        &mut ops,
        COL_QTE_DEBUT,
        COL_QTE_FIN,
        y,
        5.0,
        true,
        "Qte".to_string(),
    );

    texte_droite(
        &mut ops,
        COL_PU_FIN,
        y,
        4.6,
        true,
        "P.U.".to_string(),
    );

    texte_droite(
        &mut ops,
        COL_TOTAL_FIN,
        y,
        4.6,
        true,
        "Total".to_string(),
    );

    y -= 4.5;

    ligne(
        &mut ops,
        X_DEBUT - 1.0,
        y,
        X_FIN + 1.0,
        y,
    );

    y -= 6.0;

    if facture.soins_lignes.is_empty() {
        ajouter_texte(
            &mut ops,
            COL_NOM_DEBUT,
            y,
            5.5,
            false,
            "Aucun soin detaille".to_string(),
        );

        y -= 7.0;
    } else {
        for soin in &facture.soins_lignes {
            let lignes_nom = decouper_lignes(&soin.nom, 17);

            texte_colonne_centre(
                &mut ops,
                COL_QTE_DEBUT,
                COL_QTE_FIN,
                y,
                5.0,
                false,
                soin.quantite.to_string(),
            );

            texte_droite(
                &mut ops,
                COL_PU_FIN,
                y,
                4.2,
                false,
                format_ar(soin.prix_unitaire),
            );

            texte_droite(
                &mut ops,
                COL_TOTAL_FIN,
                y,
                4.2,
                false,
                format_ar(soin.prix_total),
            );

            for (index, nom_ligne) in lignes_nom.iter().enumerate() {
                if index > 0 {
                    y -= 5.0;
                }

                ajouter_texte(
                    &mut ops,
                    COL_NOM_DEBUT,
                    y,
                    5.2,
                    false,
                    nom_ligne.clone(),
                );
            }

            y -= 7.0;
        }
    }

    // Total des soins.
    y -= 1.0;

    ligne_pointillee(
        &mut ops,
        X_DEBUT - 1.0,
        y,
        X_FIN + 1.0,
    );

    y -= 7.0;

    ajouter_texte(
        &mut ops,
        X_DEBUT,
        y,
        5.8,
        true,
        "Total soins".to_string(),
    );

    texte_droite(
        &mut ops,
        X_FIN,
        y,
        5.5,
        true,
        format_ar(facture.montant_soins),
    );

    y -= 6.5;

    ajouter_texte(
        &mut ops,
        X_DEBUT,
        y,
        5.8,
        false,
        format!(
            "Hospitalisation : {}",
            if facture.hospitalisation {
                "Oui"
            } else {
                "Non"
            }
        ),
    );

    y -= 7.0;

    ligne_pointillee(
        &mut ops,
        X_DEBUT - 1.0,
        y,
        X_FIN + 1.0,
    );

    // ========================================================
    // MÉDICAMENTS
    // ========================================================

    y -= 9.0;

    ajouter_texte(
        &mut ops,
        X_DEBUT,
        y,
        7.5,
        true,
        "MEDICAMENTS".to_string(),
    );

    y -= 7.0;

    ajouter_texte(
        &mut ops,
        COL_NOM_DEBUT,
        y,
        5.0,
        true,
        "Designation".to_string(),
    );

    texte_colonne_centre(
        &mut ops,
        COL_QTE_DEBUT,
        COL_QTE_FIN,
        y,
        5.0,
        true,
        "Qte".to_string(),
    );

    texte_droite(
        &mut ops,
        COL_PU_FIN,
        y,
        4.6,
        true,
        "P.U.".to_string(),
    );

    texte_droite(
        &mut ops,
        COL_TOTAL_FIN,
        y,
        4.6,
        true,
        "Total".to_string(),
    );

    y -= 4.5;

    ligne(
        &mut ops,
        X_DEBUT - 1.0,
        y,
        X_FIN + 1.0,
        y,
    );

    y -= 6.0;

    if facture.medicaments.is_empty() {
        ajouter_texte(
            &mut ops,
            COL_NOM_DEBUT,
            y,
            5.5,
            false,
            "Aucun medicament".to_string(),
        );

        y -= 7.0;
    } else {
        for medicament in &facture.medicaments {
            let lignes_nom = decouper_lignes(
                &medicament.nom,
                17,
            );

            texte_colonne_centre(
                &mut ops,
                COL_QTE_DEBUT,
                COL_QTE_FIN,
                y,
                5.0,
                false,
                medicament.quantite.to_string(),
            );

            texte_droite(
                &mut ops,
                COL_PU_FIN,
                y,
                4.2,
                false,
                format_ar(medicament.prix_unitaire),
            );

            texte_droite(
                &mut ops,
                COL_TOTAL_FIN,
                y,
                4.2,
                false,
                format_ar(medicament.total),
            );

            for (index, nom_ligne) in lignes_nom.iter().enumerate() {
                if index > 0 {
                    y -= 5.0;
                }

                ajouter_texte(
                    &mut ops,
                    COL_NOM_DEBUT,
                    y,
                    5.2,
                    false,
                    nom_ligne.clone(),
                );
            }

            y -= 7.0;
        }
    }

    // ========================================================
    // TOTAL DES MÉDICAMENTS
    // ========================================================

    y -= 1.0;

    ligne_pointillee(
        &mut ops,
        X_DEBUT - 1.0,
        y,
        X_FIN + 1.0,
    );

    y -= 7.0;

    ajouter_texte(
        &mut ops,
        X_DEBUT,
        y,
        5.8,
        true,
        "Total medicaments".to_string(),
    );

    texte_droite(
        &mut ops,
        X_FIN,
        y,
        5.5,
        true,
        format_ar(facture.montant_medicaments),
    );

    // ========================================================
    // TOTAL GÉNÉRAL — CADRE BIEN ALIGNÉ
    // ========================================================

    y -= 10.0;

    // Cadre extérieur fermé : 72 mm de largeur.
    // Le texte reste à l'intérieur avec des marges régulières.
    rectangle(
        &mut ops,
        4.0,
        y + 7.0,
        72.0,
        13.0,
    );

    // Séparation visuelle entre le libellé et le montant.
    ligne(
        &mut ops,
        40.0,
        y + 4.0,
        40.0,
        y - 3.0,
    );

    ajouter_texte(
        &mut ops,
        8.0,
        y - 0.5,
        8.0,
        true,
        "TOTAL".to_string(),
    );

    texte_droite(
        &mut ops,
        72.0,
        y - 0.5,
        6.5,
        true,
        format_ar(facture.montant_total),
    );

    // ========================================================
    // CADRE DU BAS : SIGNATURE, DATE ET REMERCIEMENT
    // Aucun autre texte après le total.
    // ========================================================

    y -= 13.0;

    // Cadre fin autour des trois lignes de fin.
    rectangle(
        &mut ops,
        5.0,
        y + 4.0,
        70.0,
        20.0,
    );

    // Signature du centre.
    texte_centre(
        &mut ops,
        y,
        7.0,
        true,
        NOM_CENTRE.to_string(),
    );

    // Date et heure de génération de la facture.
    let maintenant = Local::now();

    texte_centre(
        &mut ops,
        y - 6.0,
        6.0,
        false,
        format!(
            "{} - {}",
            maintenant.format("%d/%m/%Y"),
            maintenant.format("%H:%M")
        ),
    );

    // Remerciement.
    texte_centre(
        &mut ops,
        y - 13.0,
        6.0,
        false,
        "Merci pour votre confiance".to_string(),
    );

    // ========================================================
    // CRÉATION DE LA PAGE
    // ========================================================

    let page = PdfPage::new(
        Mm(LARGEUR_PAGE),
        Mm(hauteur_page),
        ops,
    );

    doc.with_pages(vec![page]);

    // ========================================================
    // CHEMIN DU FICHIER SUR LE BUREAU
    // ========================================================

    let dossier = app
        .path()
        .desktop_dir()
        .map_err(|e| {
            format!(
                "Impossible de trouver le dossier Bureau : {}",
                e
            )
        })?;

    let nom_fichier = format!(
        "{}.pdf",
        format_numero_facture(&facture.numero)
    );

    let chemin: PathBuf = dossier.join(nom_fichier);

    // ========================================================
    // SAUVEGARDE DU PDF
    // ========================================================

    let options = PdfSaveOptions::default();
    let mut warnings = Vec::new();

    let bytes = doc.save(&options, &mut warnings);

    fs::write(&chemin, bytes).map_err(|e| {
        format!("Impossible d'enregistrer le PDF : {}", e)
    })?;

    Ok(chemin.to_string_lossy().to_string())
}

// ============================================================
// OUVRIR LE PDF
// ============================================================

#[tauri::command]
pub async fn ouvrir_pdf_facture(
    app: AppHandle,
    id: Uuid,
) -> Result<String, String> {
    let chemin = generer_pdf_facture(app.clone(), id).await?;

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &chemin])
            .spawn()
            .map_err(|e| {
                format!("Impossible d'ouvrir le PDF : {}", e)
            })?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&chemin)
            .spawn()
            .map_err(|e| {
                format!("Impossible d'ouvrir le PDF : {}", e)
            })?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(&chemin)
            .spawn()
            .map_err(|e| {
                format!("Impossible d'ouvrir le PDF : {}", e)
            })?;
    }

    Ok(chemin)
}
