
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Search,
  RefreshCw,
  Eye,
  CalendarDays,
  UserRound,
  Pill,
  ReceiptText,
  AlertCircle,
  PackageOpen,
  X,
  Clock,
  Hash,
  Boxes,
  CircleDollarSign,
  ChevronRight,
} from "lucide-react";

function nombre(valeur) {
  const resultat = Number(valeur ?? 0);
  return Number.isFinite(resultat) ? resultat : 0;
}

function formaterMontant(valeur) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(nombre(valeur))} Ar`;
}

function formaterDate(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);

  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formaterDateComplete(date) {
  if (!date) return "Date non renseignée";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);

  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formaterHeure(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function obtenirCleDate(date) {
  if (!date) return "inconnue";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "inconnue";

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function nomPatient(sortie) {
  return [
    sortie?.patient_prenom,
    sortie?.patient_nom,
  ].filter(Boolean).join(" ").trim() || "Patient non renseigné";
}

function nomMedicament(medicament) {
  return medicament?.nom ||
    medicament?.medicament_nom ||
    "Médicament sans nom";
}

function Statistique({ icone: Icone, titre, valeur, detail }) {
  return (
    <div className="sm-stat">
      <div className="sm-stat-titre">
        <Icone size={15} strokeWidth={1.7} />
        <span>{titre}</span>
      </div>
      <div className="sm-stat-valeur">{valeur}</div>
      {detail && <div className="sm-stat-detail">{detail}</div>}
    </div>
  );
}

function EtatVide({ titre, description }) {
  return (
    <div className="sm-vide">
      <PackageOpen size={29} strokeWidth={1.4} />
      <p className="sm-vide-titre">{titre}</p>
      <p className="sm-vide-description">{description}</p>
    </div>
  );
}

export default function SortiesMedicamentsListe() {
  const [sorties, setSorties] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [dateRecherchee, setDateRecherchee] = useState("");
  const [loading, setLoading] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState("");
  const [sortieDetail, setSortieDetail] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);
  const [erreurDetail, setErreurDetail] = useState("");

  useEffect(() => {
    chargerSorties();
  }, []);

  async function chargerSorties(silencieux = false) {
    try {
      setErreur("");
      if (silencieux) {
        setActualisation(true);
      } else {
        setLoading(true);
      }

      const resultat = await invoke("obtenir_sorties_medicaments");
      setSorties(Array.isArray(resultat) ? resultat : []);
    } catch (error) {
      console.error("Erreur de chargement des sorties :", error);
      setErreur(
        error?.toString() ||
        "Impossible de charger l'historique des sorties."
      );
    } finally {
      setLoading(false);
      setActualisation(false);
    }
  }

  const sortiesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return sorties
      .filter((sortie) => {
        const patient = nomPatient(sortie).toLowerCase();
        const correspondRecherche =
          !terme ||
          patient.includes(terme) ||
          String(sortie.patient_id ?? "").includes(terme) ||
          String(sortie.id ?? "").includes(terme);

        const correspondDate =
          !dateRecherchee ||
          obtenirCleDate(sortie.date_sortie) === dateRecherchee;

        return correspondRecherche && correspondDate;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date_sortie).getTime() || 0;
        const dateB = new Date(b.date_sortie).getTime() || 0;
        return dateB - dateA;
      });
  }, [sorties, recherche, dateRecherchee]);

  const sortiesParDate = useMemo(() => {
    const groupes = {};

    sortiesFiltrees.forEach((sortie) => {
      const cle = obtenirCleDate(sortie.date_sortie);

      if (!groupes[cle]) {
        groupes[cle] = {
          cle,
          date: sortie.date_sortie,
          sorties: [],
          total: 0,
          quantites: 0,
        };
      }

      groupes[cle].sorties.push(sortie);
      groupes[cle].total += nombre(sortie.total_sortie);
      groupes[cle].quantites += nombre(sortie.total_quantite);
    });

    return Object.values(groupes).sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });
  }, [sortiesFiltrees]);

  const statistiques = useMemo(() => ({
    totalSorties: sortiesFiltrees.length,
    totalMontant: sortiesFiltrees.reduce(
      (total, sortie) => total + nombre(sortie.total_sortie), 0
    ),
    totalMedicaments: sortiesFiltrees.reduce(
      (total, sortie) => total + nombre(sortie.total_quantite), 0
    ),
    nombreJours: sortiesParDate.length,
  }), [sortiesFiltrees, sortiesParDate]);

  
  async function afficherDetail(id) {
    if (!id) {
      setErreurDetail("L'identifiant de la sortie est introuvable.");
      return;
    }

    try {
      setChargementDetail(true);
      setErreurDetail("");
      setSortieDetail(null);

      const resultat = await invoke(
        "obtenir_detail_sortie_medicament",
        { id: id }
      );

      setSortieDetail(resultat);
    } catch (error) {
      console.error("Erreur de chargement du détail :", error);

      setErreurDetail(
        error?.toString() ||
        "Impossible de récupérer le détail de cette sortie."
      );
    } finally {
      setChargementDetail(false);
    }
  }


  function fermerDetail() {
    setSortieDetail(null);
    setErreurDetail("");
  }

  function reinitialiserFiltres() {
    setRecherche("");
    setDateRecherchee("");
  }

  const detailMedicaments = Array.isArray(sortieDetail?.medicaments)
    ? sortieDetail.medicaments
    : [];

  const quantiteDetail =
    sortieDetail?.total_quantite ??
    detailMedicaments.reduce(
      (total, medicament) => total + nombre(medicament.quantite), 0
    );

  const montantDetail =
    sortieDetail?.total_sortie ??
    detailMedicaments.reduce(
      (total, medicament) =>
        total + nombre(
          medicament.prix_total ??
          nombre(medicament.quantite) * nombre(medicament.prix_unitaire)
        ), 0
    );

  return (
    <div className="sm-page">
      <style>{`
        .sm-page {
          --sm-vert: #438B74;
          --sm-vert-fonce: #28594B;
          --sm-texte: #34443D;
          --sm-secondaire: #77827B;
          width: 100%;
          min-width: 0;
          margin: 0;
          padding: 12px 16px 20px;
          color: var(--sm-texte);
          background: #FCFDFB;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-size: 13px;
          box-sizing: border-box;
          animation: sm-apparition .3s ease both;
        }

        .sm-page *, .sm-page *::before, .sm-page *::after {
          box-sizing: border-box;
        }

        .sm-page button, .sm-page input { font: inherit; }
        .sm-page button { -webkit-tap-highlight-color: transparent; }

        .sm-entete {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin: 0 0 17px;
        }

        .sm-surtitre {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 5px;
          color: var(--sm-vert);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .12em;
        }

        .sm-titre {
          margin: 0;
          color: #293C33;
          font-size: clamp(22px, 2.5vw, 29px);
          font-weight: 650;
          letter-spacing: -.055em;
          line-height: 1.2;
        }

        .sm-sous-titre {
          margin: 5px 0 0;
          color: var(--sm-secondaire);
          font-size: 12px;
          line-height: 1.5;
        }

        .sm-bouton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 34px;
          padding: 7px 11px;
          color: var(--sm-vert-fonce);
          background: transparent;
          border: 0;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 550;
          cursor: pointer;
          transition: background .16s ease, color .16s ease;
        }

        .sm-bouton:hover:not(:disabled) { background: #EFF6F1; }
        .sm-bouton:disabled { opacity: .55; cursor: not-allowed; }
        .sm-bouton-principal { color: #fff; background: var(--sm-vert); }
        .sm-bouton-principal:hover:not(:disabled) {
          color: #fff;
          background: #34765F;
        }

        .sm-entete-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .sm-statistiques {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
          margin: 0 0 19px;
          padding: 13px 0 15px;
          border-top: 1px solid #EEF1ED;
          border-bottom: 1px solid #EEF1ED;
        }

        .sm-stat { min-width: 0; padding-right: 5px; }
        .sm-stat-titre {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--sm-secondaire);
          font-size: 11px;
          font-weight: 500;
        }

        .sm-stat-titre svg { flex-shrink: 0; color: var(--sm-vert); }

        .sm-stat-valeur {
          margin-top: 8px;
          color: #293C33;
          font-size: clamp(19px, 2.2vw, 26px);
          font-weight: 650;
          letter-spacing: -.045em;
          overflow-wrap: anywhere;
        }

        .sm-stat-detail { margin-top: 3px; color: #929B95; font-size: 10px; }

        .sm-outils {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin: 0 0 12px;
        }

        .sm-recherche {
          display: flex;
          align-items: center;
          gap: 9px;
          flex: 1 1 230px;
          max-width: 420px;
          min-width: 0;
          padding: 0 0 7px;
          color: #8A958E;
          border-bottom: 1px solid #DCE5DD;
        }

        .sm-recherche:focus-within { border-color: var(--sm-vert); }

        .sm-recherche input {
          width: 100%;
          min-width: 0;
          padding: 4px 0;
          color: var(--sm-texte);
          background: transparent;
          border: 0;
          outline: none;
          font-size: 12px;
        }

        .sm-recherche input::placeholder { color: #9AA39D; }

        .sm-filtres {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .sm-date {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #87928A;
          font-size: 10px;
        }

        .sm-date input {
          max-width: 140px;
          padding: 5px 0;
          color: var(--sm-texte);
          background: transparent;
          border: 0;
          border-bottom: 1px solid #E2E8E2;
          outline: none;
          font-size: 10px;
        }

        .sm-date input:focus { border-color: var(--sm-vert); }

        .sm-resultats {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin: 0 0 8px;
          color: #8A958E;
          font-size: 10px;
        }

        .sm-alerte {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: 10px 0;
          padding: 9px 0;
          color: #A64D4D;
          font-size: 11px;
          line-height: 1.5;
        }

        .sm-alerte svg { flex-shrink: 0; margin-top: 1px; }
        .sm-alerte-texte { min-width: 0; flex: 1; overflow-wrap: anywhere; }
        .sm-alerte-titre { margin-bottom: 2px; font-weight: 650; }
        .sm-fermer-alerte {
          padding: 2px;
          color: inherit;
          background: transparent;
          border: 0;
          cursor: pointer;
        }

        .sm-historique-entete {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 0 0 8px;
          padding: 9px 0;
          border-bottom: 1px solid #EEF1ED;
        }

        .sm-historique-titre {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #39483F;
          font-size: 12px;
          font-weight: 650;
        }

        .sm-historique-titre svg { color: var(--sm-vert); }
        .sm-historique-legende { margin-top: 3px; color: #929B95; font-size: 10px; }

        /* Défilement unique pour les dates et les tableaux */
        .sm-historique-scroll {
          height: 460px;
          max-height: 65vh;
          overflow: auto;
          position: relative;
          isolation: isolate;
          scrollbar-width: thin;
          scrollbar-color: #C8D8CB transparent;
          overscroll-behavior: contain;
        }

        /* La date reste collée en haut */
        .sm-jour {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 52px;
          margin: 0;
          padding: 9px 12px;
          color: #34443D;
          background: #EAF2E9;
          border-bottom: 1px solid #D9E5D8;
        }

        .sm-jour-gauche {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .sm-jour-icone { flex-shrink: 0; color: var(--sm-vert); }

        .sm-jour-date {
          color: #39483F;
          font-size: 11px;
          font-weight: 650;
          text-transform: capitalize;
        }

        .sm-jour-legende { margin-top: 3px; color: #929B95; font-size: 9px; }

        .sm-jour-total { flex-shrink: 0; text-align: right; }
        .sm-jour-total-label { color: #929B95; font-size: 9px; }
        .sm-jour-total-valeur { margin-top: 3px; color: #34765B; font-size: 11px; font-weight: 700; }

        /* Pas de second conteneur de défilement */
        .sm-tableau-conteneur {
          width: 100%;
          min-width: 0;
          overflow: visible;
        }

        .sm-tableau {
          width: 100%;
          min-width: 690px;
          border-collapse: separate;
          border-spacing: 0;
          text-align: left;
        }

        .sm-tableau thead { position: static; }

        /* Titres collés sous la date */
        .sm-tableau thead th {
          position: sticky;
          top: 52px;
          z-index: 10;
          padding: 10px 11px;
          color: #52675A;
          background: #F0F5EF;
          box-shadow: inset 0 -2px 0 #DDE7DC;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .055em;
          text-transform: uppercase;
          text-align: left;
          white-space: nowrap;
        }

        .sm-tableau td {
          padding: 11px;
          color: var(--sm-texte);
          font-size: 11px;
          vertical-align: top;
          background: #FCFDFB;
        }

        .sm-tableau tbody tr { transition: background .16s ease; }
        .sm-tableau tbody tr:hover td { background: #F7FAF6; }

        .sm-patient {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 145px;
        }

        .sm-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          color: #47755F;
          background: #EEF3EA;
          border-radius: 50%;
        }

        .sm-patient-nom { color: #39483F; font-size: 11px; font-weight: 600; }
        .sm-patient-legende { margin-top: 3px; color: #9AA39D; font-size: 9px; }

        .sm-heure {
          display: flex;
          align-items: center;
          gap: 5px;
          padding-top: 4px;
          color: #68756F;
          white-space: nowrap;
        }

        .sm-heure svg { color: #8A958E; }
        .sm-medicaments { min-width: 175px; }

        .sm-medicament-ligne {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 4px 0;
        }

        .sm-medicament-ligne + .sm-medicament-ligne { border-top: 1px solid #F2F4F1; }

        .sm-medicament-nom {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          color: #46574B;
          font-size: 10px;
        }

        .sm-medicament-nom svg { flex-shrink: 0; color: var(--sm-vert); }
        .sm-medicament-nom span { overflow-wrap: anywhere; }
        .sm-quantite { flex-shrink: 0; color: #68756F; font-size: 10px; font-weight: 600; white-space: nowrap; }
        .sm-montant { color: #2C5947; font-size: 11px; font-weight: 700; white-space: nowrap; }

        .sm-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px 7px;
          color: var(--sm-vert-fonce);
          background: transparent;
          border: 0;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .sm-action:hover { background: #EAF3EC; }

        .sm-total-general {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 12px;
          padding: 12px 0 0;
          border-top: 1px solid #E8EEE7;
        }

        .sm-total-label { color: #7D897F; font-size: 10px; }
        .sm-total-note { margin-top: 4px; color: #929B95; font-size: 10px; }

        .sm-total-valeur {
          color: #34765B;
          font-size: clamp(19px, 2.5vw, 25px);
          font-weight: 700;
          letter-spacing: -.035em;
          overflow-wrap: anywhere;
          text-align: right;
        }

        .sm-vide {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 190px;
          padding: 24px 12px;
          color: #8B978E;
          text-align: center;
        }

        .sm-vide > svg { margin-bottom: 12px; color: #76A58A; }
        .sm-vide-titre { margin: 0; color: #46574B; font-size: 13px; font-weight: 650; }
        .sm-vide-description { max-width: 350px; margin: 5px 0 0; color: #8B978E; font-size: 11px; line-height: 1.6; }

        .sm-pied {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          color: #929C94;
          font-size: 10px;
        }

        .sm-pied-gauche { display: flex; align-items: center; gap: 6px; }
        .sm-pied svg { color: #83A18B; }

        /* Fenêtre de détail */
        .sm-overlay {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          background: rgba(39, 53, 44, .35);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          animation: sm-fondu .18s ease both;
        }

        .sm-modal {
          display: flex;
          flex-direction: column;
          width: min(820px, 100%);
          max-height: calc(100vh - 24px);
          overflow: hidden;
          background: #FEFFFD;
          border-radius: 15px;
          box-shadow: 0 18px 55px rgba(39, 57, 45, .12);
          animation: sm-ouverture .2s ease both;
        }

        .sm-modal-entete {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 22px 13px;
        }

        .sm-modal-surtitre { color: var(--sm-vert); font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
        .sm-modal-titre { margin: 5px 0 0; color: #34443D; font-size: clamp(20px, 3vw, 25px); font-weight: 650; letter-spacing: -.045em; line-height: 1.25; }
        .sm-modal-date { margin: 6px 0 0; color: #89938B; font-size: 11px; }

        .sm-fermer {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 33px;
          height: 33px;
          flex-shrink: 0;
          color: #77847A;
          background: transparent;
          border: 0;
          border-radius: 50%;
          cursor: pointer;
        }

        .sm-fermer:hover { color: #315D49; background: #F0F5EF; }

        .sm-modal-contenu {
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0 22px 18px;
          scrollbar-width: thin;
          scrollbar-color: #DCE5DC transparent;
        }

        .sm-identite {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px 0;
          border-top: 1px solid #F0F3EF;
          border-bottom: 1px solid #F0F3EF;
        }

        .sm-identite-icone {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          color: var(--sm-vert);
          background: #F0F6F0;
          border-radius: 50%;
        }

        .sm-identite-nom { color: #34443D; font-size: 14px; font-weight: 650; overflow-wrap: anywhere; }
        .sm-identite-legende { margin-top: 4px; color: #89938B; font-size: 10px; }

        .sm-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px 20px;
          margin-bottom: 20px;
        }

        .sm-meta-element { min-width: 0; }

        .sm-meta-titre {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
          color: #8A948C;
          font-size: 9px;
          letter-spacing: .035em;
          text-transform: uppercase;
        }

        .sm-meta-titre svg { flex-shrink: 0; color: var(--sm-vert); }
        .sm-meta-valeur { color: #3C4B41; font-size: 11px; font-weight: 600; overflow-wrap: anywhere; }

        .sm-section-titre {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 20px 0 9px;
          color: #394A3F;
          font-size: 12px;
          font-weight: 650;
        }

        .sm-section-titre svg { flex-shrink: 0; color: var(--sm-vert); }

        .sm-tableau-detail { width: 100%; border-collapse: collapse; text-align: left; }
        .sm-tableau-detail thead { background: #F7F9F6; }

        .sm-tableau-detail th {
          padding: 10px 8px;
          color: #818C83;
          font-size: 9px;
          font-weight: 650;
          letter-spacing: .035em;
          text-transform: uppercase;
        }

        .sm-tableau-detail td {
          padding: 11px 8px;
          color: #536056;
          border-bottom: 1px solid #F0F3EF;
          font-size: 10px;
          line-height: 1.5;
        }

        .sm-tableau-detail tbody tr:last-child td { border-bottom: 0; }
        .sm-align-droite { text-align: right; white-space: nowrap; }

        .sm-liste-simple { display: flex; flex-direction: column; }

        .sm-liste-ligne {
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

        .sm-liste-ligne:last-child { border-bottom: 0; }
        .sm-liste-ligne strong { color: #3C4D40; font-weight: 600; text-align: right; }

        .sm-total-detail { margin-top: 15px; padding: 14px 0 5px; border-top: 1px solid #E8EEE7; }
        .sm-total-detail-label { color: #7D897F; font-size: 10px; }

        .sm-total-detail-valeur {
          margin-top: 5px;
          color: #34765B;
          font-size: clamp(23px, 4vw, 29px);
          font-weight: 700;
          letter-spacing: -.045em;
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .sm-modal-pied {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 11px 22px 15px;
          border-top: 1px solid #F0F3EF;
        }

        .sm-chargement {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 150px;
          color: #758278;
          font-size: 11px;
        }

        .sm-erreur-detail {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin: 12px 0;
          padding: 9px 0;
          color: #AD5550;
          font-size: 11px;
          line-height: 1.5;
        }

        @keyframes sm-apparition { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sm-fondu { from { opacity: 0; } to { opacity: 1; } }

        @keyframes sm-ouverture {
          from { opacity: 0; transform: translateY(7px) scale(.995); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 760px) {
          .sm-page { padding: 12px 12px 18px; }
          .sm-statistiques { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 18px; }
          .sm-meta { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .sm-historique-scroll { height: 380px; max-height: 60vh; }
          .sm-jour { min-height: 52px; padding: 9px 8px; }
          .sm-tableau thead th { top: 52px; }
        }

        @media (max-width: 560px) {
          .sm-entete { align-items: flex-start; }
          .sm-titre { font-size: 21px; }
          .sm-sous-titre { font-size: 11px; }
          .sm-outils { align-items: stretch; }
          .sm-recherche { flex-basis: 100%; max-width: none; }
          .sm-filtres { justify-content: space-between; }
          .sm-date input { max-width: 125px; }
          .sm-modal { max-height: calc(100vh - 14px); border-radius: 13px; }
          .sm-overlay { padding: 7px; }
          .sm-modal-entete { padding: 15px 14px 12px; }
          .sm-modal-contenu { padding: 0 14px 15px; }
          .sm-modal-pied { padding: 10px 14px 13px; }
          .sm-meta { gap: 14px 12px; }
          .sm-tableau-detail th, .sm-tableau-detail td { padding: 9px 5px; }
          .sm-resultats { flex-wrap: wrap; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sm-page, .sm-overlay, .sm-modal { animation: none; }
        }
      `}</style>

      <header className="sm-entete">
        <div>
          <div className="sm-surtitre">
            <PackageOpen size={13} />
            Gestion du stock
          </div>
          <h1 className="sm-titre">Sorties de médicaments</h1>
          <p className="sm-sous-titre">
            Historique des médicaments délivrés aux patients
          </p>
        </div>

        <div className="sm-entete-actions">
          <button
            type="button"
            className="sm-bouton"
            onClick={() => chargerSorties(true)}
            disabled={loading || actualisation}
          >
            <RefreshCw
              size={14}
              className={loading || actualisation ? "animate-spin" : ""}
            />
            <span>{actualisation ? "Actualisation…" : "Actualiser"}</span>
          </button>
        </div>
      </header>

      {erreur && (
        <div className="sm-alerte" role="alert">
          <AlertCircle size={16} />
          <div className="sm-alerte-texte">
            <div className="sm-alerte-titre">
              Impossible de charger les sorties
            </div>
            <div>{erreur}</div>
          </div>
          <button
            type="button"
            className="sm-fermer-alerte"
            onClick={() => setErreur("")}
            aria-label="Fermer l'erreur"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <section className="sm-statistiques">
        <Statistique
          icone={CalendarDays}
          titre="Jours d'activité"
          valeur={statistiques.nombreJours}
        />
        <Statistique
          icone={ReceiptText}
          titre="Nombre de sorties"
          valeur={statistiques.totalSorties}
        />
        <Statistique
          icone={Pill}
          titre="Quantité délivrée"
          valeur={new Intl.NumberFormat("fr-FR").format(
            statistiques.totalMedicaments
          )}
          detail="Unités de médicaments"
        />
        <Statistique
          icone={CircleDollarSign}
          titre="Montant total"
          valeur={formaterMontant(statistiques.totalMontant)}
          detail="Selon les résultats affichés"
        />
      </section>

      <section className="sm-outils">
        <label className="sm-recherche">
          <Search size={17} />
          <input
            type="search"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher un patient ou un identifiant…"
            aria-label="Rechercher une sortie"
          />
          {recherche && (
            <button
              type="button"
              className="sm-bouton"
              onClick={() => setRecherche("")}
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </label>

        <div className="sm-filtres">
          <label className="sm-date">
            <CalendarDays size={14} />
            <span>Date</span>
            <input
              type="date"
              value={dateRecherchee}
              onChange={(event) => setDateRecherchee(event.target.value)}
              aria-label="Filtrer par date"
            />
          </label>

          {(recherche || dateRecherchee) && (
            <button
              type="button"
              className="sm-bouton"
              onClick={reinitialiserFiltres}
            >
              <X size={13} />
              Réinitialiser
            </button>
          )}
        </div>
      </section>

      <div className="sm-resultats">
        <span>
          {sortiesFiltrees.length} résultat
          {sortiesFiltrees.length !== 1 ? "s" : ""}
          {recherche ? ` pour « ${recherche} »` : ""}
        </span>
        {dateRecherchee && <span>Le {formaterDate(dateRecherchee)}</span>}
      </div>

      <section>
        <div className="sm-historique-entete">
          <div>
            <div className="sm-historique-titre">
              <Boxes size={15} />
              Historique des sorties
            </div>
            <div className="sm-historique-legende">
              Opérations classées par date, de la plus récente à la plus ancienne
            </div>
          </div>
          <span className="sm-historique-legende">
            {sortiesFiltrees.length} opération(s)
          </span>
        </div>

        {loading ? (
          <div className="sm-chargement">
            <RefreshCw size={19} className="animate-spin" />
            Chargement de l'historique…
          </div>
        ) : sortiesFiltrees.length === 0 ? (
          <EtatVide
            titre={
              sorties.length === 0
                ? "Aucune sortie enregistrée"
                : "Aucun résultat trouvé"
            }
            description={
              sorties.length === 0
                ? "Les sorties de médicaments enregistrées apparaîtront ici."
                : "Modifiez votre recherche ou choisissez une autre date."
            }
          />
        ) : (
          <div className="sm-historique-scroll">
            {sortiesParDate.map((groupe) => (
              <div key={groupe.cle}>
                <div className="sm-jour">
                  <div className="sm-jour-gauche">
                    <CalendarDays size={15} className="sm-jour-icone" />
                    <div>
                      <div className="sm-jour-date">
                        {formaterDateComplete(groupe.date)}
                      </div>
                      <div className="sm-jour-legende">
                        {groupe.sorties.length} sortie
                        {groupe.sorties.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="sm-jour-total">
                    <div className="sm-jour-total-label">Total du jour</div>
                    <div className="sm-jour-total-valeur">
                      {formaterMontant(groupe.total)}
                    </div>
                  </div>
                </div>

                <div className="sm-tableau-conteneur">
                  <table className="sm-tableau">
                    <thead>
                      <tr>
                        <th>Heure</th>
                        <th>Patient</th>
                        <th>Médicaments</th>
                        <th style={{ textAlign: "right" }}>Montant</th>
                        <th style={{ textAlign: "right" }}>Détail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupe.sorties.map((sortie) => (
                        <tr key={sortie.id}>
                          <td>
                            <div className="sm-heure">
                              <Clock size={12} />
                              {formaterHeure(sortie.date_sortie)}
                            </div>
                          </td>
                          <td>
                            <div className="sm-patient">
                              <div className="sm-avatar">
                                <UserRound size={14} />
                              </div>
                              <div>
                                <div className="sm-patient-nom">
                                  {nomPatient(sortie)}
                                </div>
                                {sortie.patient_id != null && (
                                  <div className="sm-patient-legende">
                                    Patient #{sortie.patient_id}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="sm-medicaments">
                              {Array.isArray(sortie.medicaments) &&
                              sortie.medicaments.length > 0 ? (
                                sortie.medicaments.map((medicament, index) => (
                                  <div
                                    key={
                                      medicament.id ??
                                      medicament.medicament_id ??
                                      `${sortie.id}-${index}`
                                    }
                                    className="sm-medicament-ligne"
                                  >
                                    <div className="sm-medicament-nom">
                                      <Pill size={11} />
                                      <span>{nomMedicament(medicament)}</span>
                                    </div>
                                    <span className="sm-quantite">
                                      ×{nombre(medicament.quantite)}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <span className="sm-historique-legende">
                                  Aucun détail disponible
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span className="sm-montant">
                              {formaterMontant(sortie.total_sortie)}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="sm-action"
                              onClick={() => afficherDetail(sortie.id)}
                              title="Consulter le détail"
                              aria-label={`Consulter la sortie ${sortie.id}`}
                            >
                              <Eye size={14} />
                              <span>Détails</span>
                              <ChevronRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && sortiesFiltrees.length > 0 && (
          <div className="sm-total-general">
            <div>
              <div className="sm-total-label">Total général</div>
              <div className="sm-total-note">
                {statistiques.totalSorties} sortie(s) ·{" "}
                {new Intl.NumberFormat("fr-FR").format(
                  statistiques.totalMedicaments
                )}{" "}
                unité(s) délivrée(s)
              </div>
            </div>
            <div className="sm-total-valeur">
              {formaterMontant(statistiques.totalMontant)}
            </div>
          </div>
        )}
      </section>

      <footer className="sm-pied">
        <div className="sm-pied-gauche">
          <Clock size={12} />
          Historique issu des sorties enregistrées.
        </div>
        <span>
          {sortiesFiltrees.length} / {sorties.length} sortie(s)
        </span>
      </footer>

      {sortieDetail && (
        <div
          className="sm-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) fermerDetail();
          }}
        >
          <section
            className="sm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sm-modal-titre"
          >
            <header className="sm-modal-entete">
              <div>
                <div className="sm-modal-surtitre">Historique du stock</div>
                <h2 className="sm-modal-titre" id="sm-modal-titre">
                  Détail de la sortie
                </h2>
                <p className="sm-modal-date">
                  Enregistrée le {formaterDate(sortieDetail.date_sortie)}
                  {" à "}{formaterHeure(sortieDetail.date_sortie)}
                </p>
              </div>
              <button
                type="button"
                className="sm-fermer"
                onClick={fermerDetail}
                aria-label="Fermer le détail"
              >
                <X size={19} />
              </button>
            </header>

            <div className="sm-modal-contenu">
              <div className="sm-identite">
                <div className="sm-identite-icone">
                  <UserRound size={21} />
                </div>
                <div>
                  <div className="sm-identite-nom">
                    {nomPatient(sortieDetail)}
                  </div>
                  <div className="sm-identite-legende">
                    Patient associé à cette sortie
                  </div>
                </div>
              </div>

              <div className="sm-meta">
                <div className="sm-meta-element">
                  <div className="sm-meta-titre"><Hash size={13} /> Identifiant</div>
                  <div className="sm-meta-valeur">#{sortieDetail.id ?? "—"}</div>
                </div>
                <div className="sm-meta-element">
                  <div className="sm-meta-titre"><CalendarDays size={13} /> Date</div>
                  <div className="sm-meta-valeur">{formaterDate(sortieDetail.date_sortie)}</div>
                </div>
                <div className="sm-meta-element">
                  <div className="sm-meta-titre"><Clock size={13} /> Heure</div>
                  <div className="sm-meta-valeur">{formaterHeure(sortieDetail.date_sortie)}</div>
                </div>
              </div>

              <div className="sm-section-titre">
                <Pill size={16} />
                Médicaments délivrés
              </div>

              {detailMedicaments.length > 0 ? (
                <div className="sm-tableau-conteneur">
                  <table className="sm-tableau-detail">
                    <thead>
                      <tr>
                        <th>Médicament</th>
                        <th className="sm-align-droite">Quantité</th>
                        <th className="sm-align-droite">Prix unitaire</th>
                        <th className="sm-align-droite">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailMedicaments.map((medicament, index) => {
                        const prixUnitaire = nombre(medicament.prix_unitaire);
                        const totalLigne = nombre(
                          medicament.prix_total ??
                          nombre(medicament.quantite) * prixUnitaire
                        );

                        return (
                          <tr
                            key={
                              medicament.id ??
                              medicament.medicament_id ??
                              `${nomMedicament(medicament)}-${index}`
                            }
                          >
                            <td>{nomMedicament(medicament)}</td>
                            <td className="sm-align-droite">
                              {nombre(medicament.quantite)}
                            </td>
                            <td className="sm-align-droite">
                              {formaterMontant(prixUnitaire)}
                            </td>
                            <td className="sm-align-droite">
                              <strong>{formaterMontant(totalLigne)}</strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="sm-vide">
                  <PackageOpen size={25} />
                  <p className="sm-vide-titre">Aucun médicament disponible</p>
                  <p className="sm-vide-description">
                    Aucun détail de médicament n'est associé à cette sortie.
                  </p>
                </div>
              )}

              <div className="sm-section-titre">
                <CircleDollarSign size={16} />
                Résumé de la sortie
              </div>

              <div className="sm-liste-simple">
                <div className="sm-liste-ligne">
                  <span>Nombre de lignes de médicaments</span>
                  <strong>{detailMedicaments.length}</strong>
                </div>
                <div className="sm-liste-ligne">
                  <span>Quantité totale délivrée</span>
                  <strong>
                    {new Intl.NumberFormat("fr-FR").format(nombre(quantiteDetail))}
                  </strong>
                </div>
              </div>

              <div className="sm-total-detail">
                <div className="sm-total-detail-label">Montant total de la sortie</div>
                <div className="sm-total-detail-valeur">
                  {formaterMontant(montantDetail)}
                </div>
                <div className="sm-total-note">
                  Sortie n° {sortieDetail.id ?? "—"}
                </div>
              </div>

              {erreurDetail && (
                <div className="sm-erreur-detail" role="alert">
                  <AlertCircle size={15} />
                  <span>{erreurDetail}</span>
                </div>
              )}
            </div>

            <footer className="sm-modal-pied">
              <button type="button" className="sm-bouton" onClick={fermerDetail}>
                Fermer
              </button>
            </footer>
          </section>
        </div>
      )}

      {chargementDetail && (
        <div className="sm-overlay" style={{ zIndex: 1100 }}>
          <div className="sm-chargement">
            <RefreshCw size={19} className="animate-spin" />
            Chargement du détail…
          </div>
        </div>
      )}

      {erreurDetail && !sortieDetail && !chargementDetail && (
        <div
          className="sm-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setErreurDetail("");
          }}
        >
          <section className="sm-modal" role="alertdialog" aria-modal="true">
            <header className="sm-modal-entete">
              <div>
                <div className="sm-modal-surtitre">Une erreur est survenue</div>
                <h2 className="sm-modal-titre">Détail indisponible</h2>
              </div>
              <button
                type="button"
                className="sm-fermer"
                onClick={() => setErreurDetail("")}
                aria-label="Fermer"
              >
                <X size={19} />
              </button>
            </header>
            <div className="sm-modal-contenu">
              <div className="sm-erreur-detail">
                <AlertCircle size={16} />
                <span>{erreurDetail}</span>
              </div>
            </div>
            <footer className="sm-modal-pied">
              <button
                type="button"
                className="sm-bouton"
                onClick={() => setErreurDetail("")}
              >
                Fermer
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
