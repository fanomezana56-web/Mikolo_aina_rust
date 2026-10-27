
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Search,
  RefreshCw,
  Eye,
  CalendarDays,
  ReceiptText,
  Coins,
  UserRound,
  Pill,
  Stethoscope,
  BedDouble,
  FileText,
  Download,
  X,
  ChevronRight,
  Clock3,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Hash,
  Wallet,
} from "lucide-react";

const COULEURS = {
  vert: "#438B74",
  vertFonce: "#28594B",
  texte: "#34443D",
  secondaire: "#77827B",
  fond: "#FCFDFB",
  vertPale: "#EFF6F1",
  ligne: "#E9EEE9",
  orange: "#B98542",
  rouge: "#C65F5F",
};

function nombre(valeur) {
  const resultat = Number(valeur ?? 0);
  return Number.isFinite(resultat) ? resultat : 0;
}

function formaterMontant(valeur) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(nombre(valeur))} Ar`;
}

function formaterDate(valeur) {
  if (!valeur) return "Date non renseignée";

  const date = new Date(valeur);

  if (Number.isNaN(date.getTime())) {
    return String(valeur);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formaterDateCourte(valeur) {
  if (!valeur) return "—";

  const date = new Date(valeur);

  if (Number.isNaN(date.getTime())) {
    return String(valeur);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function nomPatient(facture) {
  return [
    facture?.patient_prenom,
    facture?.patient_nom,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Patient non renseigné";
}

function calculerTotalMedicaments(medicaments = []) {
  return medicaments.reduce(
    (total, medicament) =>
      total +
      nombre(
        medicament.total ??
        nombre(medicament.quantite) *
          nombre(medicament.prix_unitaire)
      ),
    0
  );
}

function Statistique({ icone: Icone, titre, valeur, detail }) {
  return (
    <div className="fl-statistique">
      <div className="fl-statistique-titre">
        <Icone size={16} strokeWidth={1.7} />
        <span>{titre}</span>
      </div>

      <div className="fl-statistique-valeur">
        {valeur}
      </div>

      {detail && (
        <div className="fl-statistique-detail">
          {detail}
        </div>
      )}
    </div>
  );
}

function LigneMontant({ titre, valeur, accent = false }) {
  return (
    <div className={`fl-ligne-montant ${accent ? "accent" : ""}`}>
      <span>{titre}</span>
      <strong>{formaterMontant(valeur)}</strong>
    </div>
  );
}

function EtatVide({ icone: Icone = ReceiptText, titre, description }) {
  return (
    <div className="fl-vide">
      <Icone size={29} strokeWidth={1.4} />
      <p className="fl-vide-titre">{titre}</p>
      <p className="fl-vide-description">{description}</p>
    </div>
  );
}

export default function FacturesListe() {
  const [factures, setFactures] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState("");

  const [recherche, setRecherche] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const [factureSelectionnee, setFactureSelectionnee] =
    useState(null);
  const [detailFacture, setDetailFacture] = useState(null);
  const [chargementDetail, setChargementDetail] =
    useState(false);
  const [erreurDetail, setErreurDetail] = useState("");

  const [generationPDF, setGenerationPDF] = useState(false);
  const [ouverturePDF, setOuverturePDF] = useState(false);

  // Chargement de la liste des factures.
  async function chargerFactures(silencieux = false) {
    try {
      setErreur("");

      if (silencieux) {
        setActualisation(true);
      } else {
        setChargement(true);
      }

      const resultat = await invoke("obtenir_factures");

      setFactures(
        Array.isArray(resultat) ? resultat : []
      );
    } catch (error) {
      console.error("Erreur de chargement des factures :", error);
      setErreur(
        error?.toString() ||
          "Impossible de charger les factures."
      );
    } finally {
      setChargement(false);
      setActualisation(false);
    }
  }

  useEffect(() => {
    chargerFactures();
  }, []);

  // Recherche et filtrage.
  const facturesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return factures.filter((facture) => {
      const texte = [
        facture.numero,
        facture.patient_nom,
        facture.patient_prenom,
        nomPatient(facture),
        facture.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (terme && !texte.includes(terme)) {
        return false;
      }

      if (dateDebut || dateFin) {
        const date = new Date(facture.date_facture);

        if (Number.isNaN(date.getTime())) {
          return false;
        }

        const jour = [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");

        if (dateDebut && jour < dateDebut) {
          return false;
        }

        if (dateFin && jour > dateFin) {
          return false;
        }
      }

      return true;
    });
  }, [factures, recherche, dateDebut, dateFin]);

  // Statistiques calculées à partir des résultats affichés.
  const statistiques = useMemo(() => {
    const total = facturesFiltrees.reduce(
      (somme, facture) =>
        somme + nombre(facture.montant_total),
      0
    );

    return {
      nombre: facturesFiltrees.length,
      total,
      moyenne: facturesFiltrees.length
        ? total / facturesFiltrees.length
        : 0,
    };
  }, [facturesFiltrees]);

  // Ouvrir le détail d'une facture.
  async function afficherDetail(facture) {
    setFactureSelectionnee(facture);
    setDetailFacture(null);
    setErreurDetail("");
    setChargementDetail(true);

    try {
      const resultat = await invoke(
        "obtenir_detail_facture",
        { id: facture.id }
      );

      setDetailFacture(resultat);
    } catch (error) {
      console.error(
        "Erreur de chargement du détail de la facture :",
        error
      );

      setErreurDetail(
        error?.toString() ||
          "Impossible de charger les détails de cette facture."
      );
    } finally {
      setChargementDetail(false);
    }
  }

  function fermerDetail() {
    setFactureSelectionnee(null);
    setDetailFacture(null);
    setErreurDetail("");
    setGenerationPDF(false);
    setOuverturePDF(false);
  }

  // Générer le PDF de la facture.
  async function genererPDF() {
    if (!factureSelectionnee?.id) return;

    try {
      setGenerationPDF(true);
      setErreurDetail("");

      await invoke("generer_pdf_facture", {
        id: factureSelectionnee.id,
      });
    } catch (error) {
      console.error("Erreur de génération du PDF :", error);

      setErreurDetail(
        error?.toString() ||
          "La génération du PDF a échoué."
      );
    } finally {
      setGenerationPDF(false);
    }
  }

  // Ouvrir le PDF avec la commande Tauri existante.
  async function ouvrirPDF() {
    if (!factureSelectionnee?.id) return;

    try {
      setOuverturePDF(true);
      setErreurDetail("");

      await invoke("ouvrir_pdf_facture", {
        id: factureSelectionnee.id,
      });
    } catch (error) {
      console.error("Erreur d'ouverture du PDF :", error);

      setErreurDetail(
        error?.toString() ||
          "Impossible d'ouvrir le PDF."
      );
    } finally {
      setOuverturePDF(false);
    }
  }

  const totalMedicaments = useMemo(() => {
  if (!detailFacture) return 0;

  return nombre(
    detailFacture.montant_medicaments ??
      calculerTotalMedicaments(detailFacture.medicaments)
      );
    }, [detailFacture]);

    const totalSoins = useMemo(() => {
      if (!detailFacture) return 0;

      if (detailFacture.montant_soins != null) {
        return nombre(detailFacture.montant_soins);
      }

      return (detailFacture.soins_lignes ?? []).reduce(
        (total, soin) => total + nombre(soin.prix_total),
        0
      );
    }, [detailFacture]);

    const totalGeneral = nombre(
      detailFacture?.montant_total ??
        factureSelectionnee?.montant_total
    );

  return (
    <div className="fl-page">
      <style>{`
        .fl-page {
          --fl-vert: #438B74;
          --fl-vert-fonce: #28594B;
          --fl-texte: #34443D;
          --fl-secondaire: #77827B;
          --fl-ligne: #E9EEE9;
          width: 100%;
          min-width: 0;
          padding: 12px 16px 20px;
          margin: 0;
          color: var(--fl-texte);
          background: #FCFDFB;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-size: 13px;
          box-sizing: border-box;
          animation: fl-apparition .35s ease both;
        }

        .fl-page *,
        .fl-page *::before,
        .fl-page *::after {
          box-sizing: border-box;
        }

        .fl-page button,
        .fl-page input {
          font: inherit;
        }

        .fl-page button {
          -webkit-tap-highlight-color: transparent;
        }

        .fl-entete {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin: 0 0 18px;
        }

        .fl-surtitre {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--fl-vert);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .12em;
          margin-bottom: 5px;
        }

        .fl-titre {
          margin: 0;
          font-size: clamp(22px, 2.5vw, 29px);
          font-weight: 650;
          letter-spacing: -.055em;
          line-height: 1.2;
          color: #293C33;
        }

        .fl-sous-titre {
          margin: 5px 0 0;
          color: var(--fl-secondaire);
          font-size: 12px;
          line-height: 1.5;
        }

        .fl-bouton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 35px;
          padding: 8px 12px;
          border: 0;
          border-radius: 8px;
          cursor: pointer;
          transition:
            background .18s ease,
            color .18s ease,
            transform .18s ease,
            opacity .18s ease;
        }

        .fl-bouton:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .fl-bouton:active:not(:disabled) {
          transform: scale(.98);
        }

        .fl-bouton-principal {
          background: var(--fl-vert-fonce);
          color: #fff;
        }

        .fl-bouton-principal:hover:not(:disabled) {
          background: #34705B;
        }

        .fl-bouton-neutre {
          color: var(--fl-texte);
          background: #F1F5F1;
        }

        .fl-bouton-neutre:hover:not(:disabled) {
          background: #E6EEE7;
        }

        .fl-bouton-texte {
          color: var(--fl-vert-fonce);
          background: transparent;
          padding: 6px 8px;
        }

        .fl-bouton-texte:hover:not(:disabled) {
          background: #EFF6F1;
        }

        .fl-statistiques {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
          margin: 0 0 20px;
          padding: 13px 0 15px;
          border-top: 1px solid #EEF1ED;
          border-bottom: 1px solid #EEF1ED;
        }

        .fl-statistique {
          min-width: 0;
          padding: 0 4px 0 0;
          animation: fl-montee .4s ease both;
        }

        .fl-statistique:nth-child(2) {
          animation-delay: 50ms;
        }

        .fl-statistique:nth-child(3) {
          animation-delay: 100ms;
        }

        .fl-statistique-titre {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--fl-secondaire);
          font-size: 11px;
          font-weight: 500;
        }

        .fl-statistique-titre svg {
          color: var(--fl-vert);
          flex-shrink: 0;
        }

        .fl-statistique-valeur {
          margin-top: 8px;
          color: #293C33;
          font-size: clamp(20px, 2.5vw, 27px);
          font-weight: 650;
          letter-spacing: -.055em;
          overflow-wrap: anywhere;
        }

        .fl-statistique-detail {
          margin-top: 3px;
          color: #929B95;
          font-size: 10px;
        }

        .fl-outils {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 12px;
        }

        .fl-recherche {
          display: flex;
          align-items: center;
          gap: 9px;
          flex: 1 1 230px;
          max-width: 410px;
          min-width: 0;
          color: #8A958E;
          padding: 0 0 7px;
          border-bottom: 1px solid #DCE5DD;
          transition: border-color .2s ease;
        }

        .fl-recherche:focus-within {
          border-color: var(--fl-vert);
        }

        .fl-recherche input {
          width: 100%;
          min-width: 0;
          padding: 4px 0;
          color: var(--fl-texte);
          background: transparent;
          border: 0;
          outline: none;
          font-size: 12px;
        }

        .fl-recherche input::placeholder {
          color: #9AA39D;
        }

        .fl-filtres {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .fl-date {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #87928A;
          font-size: 10px;
        }

        .fl-date input {
          max-width: 135px;
          padding: 5px 0;
          color: var(--fl-texte);
          background: transparent;
          border: 0;
          border-bottom: 1px solid #E2E8E2;
          outline: none;
          font-size: 10px;
        }

        .fl-date input:focus {
          border-color: var(--fl-vert);
        }

        .fl-resultats {
          margin: 0 0 7px;
          color: #8A958E;
          font-size: 10px;
        }

        .fl-tableau-conteneur {
          width: 100%;
          overflow-x: auto;
          border: 0;
          border-radius: 0;
          background: transparent;
        }

        .fl-tableau {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .fl-tableau thead {
          background: #F5F8F4;
        }

        .fl-tableau th {
          padding: 11px 12px;
          color: #7E8981;
          font-size: 9px;
          font-weight: 650;
          letter-spacing: .07em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .fl-tableau td {
          padding: 12px;
          color: var(--fl-texte);
          font-size: 11px;
          vertical-align: middle;
        }

        .fl-tableau tbody tr {
          border-bottom: 1px solid #F0F3EF;
          animation: fl-ligne .35s ease both;
          transition: background .18s ease;
        }

        .fl-tableau tbody tr:last-child {
          border-bottom: 0;
        }

        .fl-tableau tbody tr:hover {
          background: #F5F9F5;
        }

        .fl-numero {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 145px;
          color: var(--fl-vert-fonce);
          font-weight: 650;
        }

        .fl-numero-icone {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 29px;
          height: 29px;
          flex-shrink: 0;
          color: var(--fl-vert);
          background: #EAF3EC;
          border-radius: 9px;
        }

        .fl-patient {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 150px;
        }

        .fl-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 29px;
          height: 29px;
          flex-shrink: 0;
          color: #47755F;
          background: #EEF3EA;
          border-radius: 50%;
          font-size: 10px;
          font-weight: 700;
        }

        .fl-patient-nom {
          color: #39483F;
          font-size: 11px;
          font-weight: 600;
        }

        .fl-patient-legende {
          margin-top: 3px;
          color: #9AA39D;
          font-size: 9px;
        }

        .fl-montant {
          color: #2C5947;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .fl-action {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 9px;
          color: var(--fl-vert-fonce);
          background: transparent;
          border: 0;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: background .18s ease;
          white-space: nowrap;
        }

        .fl-action:hover {
          background: #EAF3EC;
        }

        .fl-alerte {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: 12px 0;
          padding: 9px 0;
          color: #A64D4D;
          font-size: 11px;
          line-height: 1.5;
        }

        .fl-vide {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: 190px;
          padding: 25px 12px;
          color: #8B978E;
        }

        .fl-vide svg {
          margin-bottom: 12px;
          color: #76A58A;
        }

        .fl-vide-titre {
          margin: 0;
          color: #46574B;
          font-size: 13px;
          font-weight: 650;
        }

        .fl-vide-description {
          max-width: 350px;
          margin: 5px 0 0;
          color: #8B978E;
          font-size: 11px;
          line-height: 1.6;
        }

        .fl-pied {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          color: #929C94;
          font-size: 10px;
        }

        .fl-pied-gauche {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fl-pied svg {
          color: #83A18B;
        }

        
/* ==========================================
   MODAL FACTURE — STYLE ÉLÉGANT ET ÉPURÉ
   La liste des factures reste inchangée.
   ========================================== */

.fl-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(39, 53, 44, 0.22);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  animation: fl-modal-fondu 180ms ease-out both;
}

.fl-modal {
  display: flex;
  flex-direction: column;
  width: min(740px, 100%);
  max-height: calc(100vh - 24px);
  overflow: hidden;
  background: #FEFFFD;
  border: none;
  border-radius: 16px;
  box-shadow: 0 18px 55px rgba(39, 57, 45, 0.12);
  animation: fl-modal-ouverture 220ms ease-out both;
}

.fl-modal-entete {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 19px 22px 14px;
  background: transparent;
  border: none;
}

.fl-modal-surtitre {
  color: #438B74;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.fl-modal-titre {
  margin: 5px 0 0;
  color: #34443D;
  font-size: clamp(20px, 3vw, 25px);
  font-weight: 650;
  letter-spacing: -0.045em;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.fl-modal-date {
  margin: 6px 0 0;
  color: #89938B;
  font-size: 11px;
}

.fl-fermer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 33px;
  height: 33px;
  flex-shrink: 0;
  color: #77847A;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: color 160ms ease, background 160ms ease;
}

.fl-fermer:hover {
  color: #315D49;
  background: #F0F5EF;
}

.fl-modal-contenu {
  min-height: 0;
  overflow-y: auto;
  padding: 0 22px 18px;
  scrollbar-width: thin;
  scrollbar-color: #DCE5DC transparent;
}

/* Identité du patient : légère, sans carte encadrée */

.fl-identite {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 17px;
  padding: 13px 0;
  border-top: 1px solid #F0F3EF;
  border-bottom: 1px solid #F0F3EF;
}

.fl-identite-icone {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 39px;
  height: 39px;
  flex-shrink: 0;
  color: #438B74;
  background: #F0F6F0;
  border-radius: 50%;
}

.fl-identite-nom {
  color: #34443D;
  font-size: 14px;
  font-weight: 650;
}

.fl-identite-legende {
  margin-top: 4px;
  color: #89938B;
  font-size: 10px;
}

/* Informations : disposition fluide, sans petits carrés */

.fl-detail-meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px 20px;
  margin: 0 0 22px;
}

.fl-meta-element {
  min-width: 0;
}

.fl-meta-titre {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  color: #8A948C;
  font-size: 9px;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.fl-meta-titre svg {
  color: #438B74;
  flex-shrink: 0;
}

.fl-meta-valeur {
  color: #3C4B41;
  font-size: 11px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

/* Titres des sections : simples et lisibles */

.fl-section-titre {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 20px 0 9px;
  color: #394A3F;
  font-size: 12px;
  font-weight: 650;
}

.fl-section-titre svg {
  color: #438B74;
  flex-shrink: 0;
}

/* Table des médicaments : aucun encadrement extérieur */

.fl-tableau-conteneur {
  width: 100%;
  overflow-x: auto;
  border: none;
  border-radius: 0;
  background: transparent;
}

.fl-tableau-detail {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.fl-tableau-detail thead {
  background: #F7F9F6;
}

.fl-tableau-detail th {
  padding: 10px 8px;
  color: #818C83;
  background: transparent;
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.fl-tableau-detail td {
  padding: 11px 8px;
  color: #536056;
  border-bottom: 1px solid #F0F3EF;
  font-size: 10px;
  line-height: 1.5;
}

.fl-tableau-detail tbody tr:last-child td {
  border-bottom: none;
}

.fl-tableau-detail tbody tr {
  transition: background 150ms ease;
}

.fl-tableau-detail tbody tr:hover {
  background: #FAFCF9;
}

.fl-align-droite {
  text-align: right;
  white-space: nowrap;
}

/* Soins et informations complémentaires */

.fl-liste-simple {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.fl-liste-simple-ligne {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid #F0F3EF;
  color: #69766C;
  font-size: 11px;
  line-height: 1.5;
}

.fl-liste-simple-ligne:last-child {
  border-bottom: none;
}

.fl-liste-simple-ligne strong {
  color: #3C4D40;
  font-weight: 600;
  text-align: right;
}

/* Résumé financier : accent vert très clair */

.fl-ligne-montant {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 0;
  color: #758076;
  font-size: 11px;
  border-bottom: 1px solid #F0F3EF;
}

.fl-ligne-montant strong {
  color: #3D4C41;
  font-weight: 600;
  text-align: right;
}

.fl-ligne-montant.accent {
  color: #344E3D;
  font-weight: 650;
  border-bottom: none;
}

.fl-ligne-montant.accent strong {
  color: #34765B;
  font-size: 12px;
}

/* Total : pas de grand bloc sombre */

.fl-total {
  margin-top: 15px;
  padding: 14px 0 5px;
  color: #34443D;
  background: transparent;
  border-top: 1px solid #E8EEE7;
  border-radius: 0;
}

.fl-total-libelle {
  color: #7D897F;
  font-size: 10px;
  font-weight: 500;
}

.fl-total-valeur {
  margin-top: 5px;
  color: #34765B;
  font-size: clamp(23px, 4vw, 29px);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.fl-total-note {
  margin-top: 5px;
  color: #8B968D;
  font-size: 10px;
}

/* Erreurs et chargement discrets */

.fl-modal .fl-alerte {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 12px 0;
  padding: 9px 0;
  color: #AD5550;
  background: transparent;
  border: none;
  font-size: 11px;
  line-height: 1.5;
}

.fl-modal .fl-chargement {
  min-height: 125px;
  color: #758278;
  font-size: 12px;
}

/* Pied de fenêtre : boutons légers, sans barre massive */

.fl-modal-pied {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 22px 16px;
  background: #FEFFFD;
  border-top: 1px solid #F0F3EF;
}

.fl-modal-pied .fl-bouton {
  min-height: 35px;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 550;
  transition: background 160ms ease, color 160ms ease;
}

.fl-modal-pied .fl-bouton-neutre {
  color: #526258;
  background: #F3F6F2;
}

.fl-modal-pied .fl-bouton-neutre:hover:not(:disabled) {
  color: #315D49;
  background: #E9F0E8;
}

.fl-modal-pied .fl-bouton-principal {
  color: #fff;
  background: #438B74;
}

.fl-modal-pied .fl-bouton-principal:hover:not(:disabled) {
  background: #34765F;
}

.fl-modal-pied .fl-bouton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Animations douces */

@keyframes fl-modal-fondu {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fl-modal-ouverture {
  from {
    opacity: 0;
    transform: translateY(7px) scale(0.995);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Adaptation aux écrans plus petits */

@media (max-width: 600px) {
  .fl-overlay {
    padding: 7px;
  }

  .fl-modal {
    max-height: calc(100vh - 14px);
    border-radius: 13px;
  }

  .fl-modal-entete {
    padding: 15px 14px 12px;
  }

  .fl-modal-contenu {
    padding: 0 14px 15px;
  }

  .fl-modal-pied {
    padding: 10px 14px 13px;
    gap: 6px;
  }

  .fl-detail-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 15px 12px;
  }

  .fl-tableau-detail th,
  .fl-tableau-detail td {
    padding: 9px 5px;
  }

  .fl-modal-pied .fl-bouton {
    padding: 8px 9px;
    font-size: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fl-overlay,
  .fl-modal {
    animation: none;
  }
}

      `}</style>

      {/* Recherche et dates */}
      <section className="fl-outils">
        <label className="fl-recherche">
          <Search size={17} />
          <input
            type="search"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher un numéro ou un patient…"
            aria-label="Rechercher une facture"
          />
          {recherche && (
            <button
              type="button"
              className="fl-bouton-texte"
              onClick={() => setRecherche("")}
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </label>

        <div className="fl-filtres">
          <label className="fl-date">
            <CalendarDays size={14} />
            <span>Du</span>
            <input
              type="date"
              value={dateDebut}
              max={dateFin || undefined}
              onChange={(event) => setDateDebut(event.target.value)}
              aria-label="Date de début"
            />
          </label>

          <label className="fl-date">
            <span>Au</span>
            <input
              type="date"
              value={dateFin}
              min={dateDebut || undefined}
              onChange={(event) => setDateFin(event.target.value)}
              aria-label="Date de fin"
            />
          </label>

          {(dateDebut || dateFin) && (
            <button
              type="button"
              className="fl-bouton fl-bouton-texte"
              onClick={() => {
                setDateDebut("");
                setDateFin("");
              }}
            >
              <X size={13} />
              Effacer les dates
            </button>
          )}
        </div>
      </section>

      <div className="fl-resultats">
        {facturesFiltrees.length} résultat
        {facturesFiltrees.length !== 1 ? "s" : ""}
        {recherche ? ` pour « ${recherche} »` : ""}
      </div>

      {erreur && (
        <div className="fl-alerte" role="alert">
          <AlertCircle size={17} />
          <span>{erreur}</span>
        </div>
      )}

      {/* Tableau principal */}
      {chargement ? (
        <div className="fl-chargement">
          <LoaderCircle size={20} className="fl-rotation" />
          Chargement des factures…
        </div>
      ) : facturesFiltrees.length === 0 ? (
        <EtatVide
          icone={ReceiptText}
          titre={
            factures.length === 0
              ? "Aucune facture enregistrée"
              : "Aucun résultat"
          }
          description={
            factures.length === 0
              ? "Les factures enregistrées apparaîtront ici."
              : "Essayez de modifier la recherche ou les dates."
          }
        />
      ) : (
        <div className="fl-tableau-conteneur">
          <table className="fl-tableau">
            <thead>
              <tr>
                <th>Facture</th>
                <th>Patient</th>
                <th>Date</th>
                <th>Montant total</th>
                <th aria-label="Actions" />
              </tr>
            </thead>

            <tbody>
              {facturesFiltrees.map((facture, index) => {
                const nom = nomPatient(facture);
                const initiales = nom
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((mot) => mot[0]?.toUpperCase())
                  .join("");

                return (
                  <tr
                    key={facture.id}
                    style={{
                      animationDelay: `${Math.min(index, 10) * 25}ms`,
                    }}
                  >
                    <td>
                      <div className="fl-numero">
                        <div className="fl-numero-icone">
                          <ReceiptText size={15} />
                        </div>
                        <span>
                          {facture.numero || "Facture sans numéro"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="fl-patient">
                        <div className="fl-avatar">
                          {initiales || <UserRound size={14} />}
                        </div>

                        <div>
                          <div className="fl-patient-nom">
                            {nom}
                          </div>
                          <div className="fl-patient-legende">
                            Dossier patient
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>{formaterDateCourte(facture.date_facture)}</td>

                    <td>
                      <span className="fl-montant">
                        {formaterMontant(facture.montant_total)}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="fl-action"
                        onClick={() => afficherDetail(facture)}
                      >
                        <Eye size={15} />
                        Détails
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <footer className="fl-pied">
        <div className="fl-pied-gauche">
          <Clock3 size={13} />
          <span>
            Informations issues des factures enregistrées.
          </span>
        </div>

        <span>
          {facturesFiltrees.length} / {factures.length} facture(s)
        </span>
      </footer>

      {/* Fenêtre de détail */}
      {factureSelectionnee && (
        <div
          className="fl-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              fermerDetail();
            }
          }}
        >
          <section
            className="fl-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fl-modal-titre"
          >
            <header className="fl-modal-entete">
              <div>
                <div className="fl-modal-surtitre">
                  Détail de la facture
                </div>

                <h2
                  className="fl-modal-titre"
                  id="fl-modal-titre"
                >
                  {detailFacture?.numero ||
                    factureSelectionnee.numero ||
                    "Facture"}
                </h2>

                <p className="fl-modal-date">
                  Émise le{" "}
                  {formaterDate(
                    detailFacture?.date_facture ||
                      factureSelectionnee.date_facture
                  )}
                </p>
              </div>

              <button
                type="button"
                className="fl-fermer"
                onClick={fermerDetail}
                aria-label="Fermer le détail"
              >
                <X size={19} />
              </button>
            </header>

            <div className="fl-modal-contenu">
              {chargementDetail ? (
                <div className="fl-chargement">
                  <LoaderCircle
                    size={20}
                    className="fl-rotation"
                  />
                  Chargement du détail…
                </div>
              ) : erreurDetail && !detailFacture ? (
                <div className="fl-alerte" role="alert">
                  <AlertCircle size={17} />
                  <span>{erreurDetail}</span>
                </div>
              ) : detailFacture ? (
                <>
                  <div className="fl-identite">
                    <div className="fl-identite-icone">
                      <UserRound size={21} />
                    </div>

                    <div>
                      <div className="fl-identite-nom">
                        {nomPatient(detailFacture)}
                      </div>
                      <div className="fl-identite-legende">
                        Patient associé à cette facture
                      </div>
                    </div>
                  </div>

                  <div className="fl-detail-meta">
                    <div className="fl-meta-element">
                      <div className="fl-meta-titre">
                        <Hash size={13} />
                        Numéro
                      </div>
                      <div className="fl-meta-valeur">
                        {detailFacture.numero || "—"}
                      </div>
                    </div>

                    <div className="fl-meta-element">
                      <div className="fl-meta-titre">
                        <CalendarDays size={13} />
                        Date
                      </div>
                      <div className="fl-meta-valeur">
                        {formaterDateCourte(
                          detailFacture.date_facture
                        )}
                      </div>
                    </div>

                    <div className="fl-meta-element">
                      <div className="fl-meta-titre">
                        <BedDouble size={13} />
                        Hospitalisation
                      </div>
                      <div className="fl-meta-valeur">
                        {detailFacture.hospitalisation
                          ? "Oui"
                          : "Non"}
                      </div>
                    </div>
                  </div>

                  {/* Soins enregistrés */}
                  <div className="fl-section-titre">
                    <Stethoscope size={16} />
                    Soins et prestations
                  </div>

                  {Array.isArray(detailFacture.soins_lignes) &&
                  detailFacture.soins_lignes.length > 0 ? (
                    <div className="fl-tableau-conteneur">
                      <table className="fl-tableau-detail">
                        <thead>
                          <tr>
                            <th>Nom du soin</th>
                            <th className="fl-align-droite">Qté</th>
                            <th className="fl-align-droite">Prix unitaire</th>
                            <th className="fl-align-droite">Total</th>
                          </tr>
                        </thead>

                        <tbody>
                          {detailFacture.soins_lignes.map((soin, index) => (
                            <tr key={soin.soin_id ?? index}>
                              <td>{soin.nom || "Soin sans nom"}</td>

                              <td className="fl-align-droite">
                                {nombre(soin.quantite)}
                              </td>

                              <td className="fl-align-droite">
                                {formaterMontant(soin.prix_unitaire)}
                              </td>

                              <td className="fl-align-droite">
                                <strong>
                                  {formaterMontant(soin.prix_total)}
                                </strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="fl-liste-simple-ligne">
                      <span>Aucun soin enregistré pour cette facture.</span>
                      <strong>—</strong>
                    </div>
                  )}

                  {/* Médicaments */}
                  <div className="fl-section-titre">
                    <Pill size={16} />
                    Médicaments délivrés
                  </div>

                  {Array.isArray(detailFacture.medicaments) &&
                  detailFacture.medicaments.length > 0 ? (
                    <div className="fl-tableau-conteneur">
                      <table className="fl-tableau-detail">
                        <thead>
                          <tr>
                            <th>Médicament</th>
                            <th className="fl-align-droite">
                              Qté
                            </th>
                            <th className="fl-align-droite">
                              Prix unitaire
                            </th>
                            <th className="fl-align-droite">
                              Total
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {detailFacture.medicaments.map(
                            (medicament, index) => {
                              const totalLigne = nombre(
                                medicament.total ??
                                  nombre(medicament.quantite) *
                                    nombre(medicament.prix_unitaire)
                              );

                              return (
                                <tr
                                  key={
                                    medicament.id ??
                                    `${medicament.nom}-${index}`
                                  }
                                >
                                  <td>
                                    {medicament.nom ||
                                      "Médicament sans nom"}
                                  </td>

                                  <td className="fl-align-droite">
                                    {nombre(medicament.quantite)}
                                  </td>

                                  <td className="fl-align-droite">
                                    {formaterMontant(
                                      medicament.prix_unitaire
                                    )}
                                  </td>

                                  <td className="fl-align-droite">
                                    <strong>
                                      {formaterMontant(totalLigne)}
                                    </strong>
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="fl-liste-simple-ligne">
                      <span>Aucun médicament associé à cette facture</span>
                      <strong>—</strong>
                    </div>
                  )}

                  {/* Résumé financier */}
                  <div className="fl-section-titre">
                    <Coins size={16} />
                    Résumé financier
                  </div>

                  <div className="fl-liste-simple">
                    <LigneMontant
                      titre="Total des médicaments"
                      valeur={totalMedicaments}
                    />

                    <LigneMontant
                      titre="Total des soins"
                      valeur={totalSoins}
                    />

                    <LigneMontant
                      titre="Montant total de la facture"
                      valeur={totalGeneral}
                      accent
                    />
                  </div>

                  <div className="fl-total">
                    <div className="fl-total-libelle">
                      Total de la facture
                    </div>

                    <div className="fl-total-valeur">
                      {formaterMontant(totalGeneral)}
                    </div>

                    <div className="fl-total-note">
                      Facture {detailFacture.numero || ""}
                    </div>
                  </div>

                  {erreurDetail && (
                    <div className="fl-alerte" role="alert">
                      <AlertCircle size={16} />
                      <span>{erreurDetail}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="fl-chargement">
                  Les détails ne sont pas disponibles.
                </div>
              )}
            </div>

            <footer className="fl-modal-pied">
              <button
                type="button"
                className="fl-bouton fl-bouton-neutre"
                onClick={fermerDetail}
              >
                Fermer
              </button>

              <button
                type="button"
                className="fl-bouton fl-bouton-neutre"
                onClick={ouvrirPDF}
                disabled={
                  chargementDetail ||
                  !detailFacture ||
                  ouverturePDF ||
                  generationPDF
                }
              >
                {ouverturePDF ? (
                  <LoaderCircle
                    size={15}
                    className="fl-rotation"
                  />
                ) : (
                  <FileText size={15} />
                )}
                Ouvrir le PDF
              </button>

              <button
                type="button"
                className="fl-bouton fl-bouton-principal"
                onClick={genererPDF}
                disabled={
                  chargementDetail ||
                  !detailFacture ||
                  generationPDF ||
                  ouverturePDF
                }
              >
                {generationPDF ? (
                  <LoaderCircle
                    size={15}
                    className="fl-rotation"
                  />
                ) : (
                  <Download size={15} />
                )}
                Générer le PDF
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
