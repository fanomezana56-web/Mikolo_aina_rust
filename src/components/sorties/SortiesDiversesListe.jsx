
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import {
  Search,
  RefreshCw,
  Eye,
  CalendarDays,
  ReceiptText,
  Coins,
  Archive,
  X,
  Hash,
  Clock3,
  AlertCircle,
  ArrowDownRight,
  TrendingDown,
  RotateCcw,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";

function nombre(valeur) {
  const resultat = Number(valeur ?? 0);
  return Number.isFinite(resultat) ? resultat : 0;
}

function formaterMontant(montant) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(nombre(montant));
}

function formaterDate(date) {
  if (!date) return "Date non renseignée";

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) return String(date);

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(valeur);
}

function formaterDateCourte(date) {
  if (!date) return "—";

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) return String(date);

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(valeur);
}

function formaterHeure(date) {
  if (!date) return "—";

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(valeur);
}

export default function SortiesDiversesListe({ refreshKey = 0 }) {
  const [sorties, setSorties] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState("");

  const [recherche, setRecherche] = useState("");
  const [dateRecherchee, setDateRecherchee] = useState("");
  const [sortieSelectionnee, setSortieSelectionnee] = useState(null);

  async function chargerSorties(silencieux = false) {
    try {
      setErreur("");

      if (silencieux) {
        setActualisation(true);
      } else {
        setChargement(true);
      }

      const resultat = await invoke("obtenir_sorties_diverses");

      setSorties(Array.isArray(resultat) ? resultat : []);
    } catch (error) {
      console.error("Erreur de chargement des sorties :", error);

      setErreur(
        error?.toString() ||
          "Impossible de charger les sorties diverses."
      );
    } finally {
      setChargement(false);
      setActualisation(false);
    }
  }

  useEffect(() => {
    chargerSorties();
  }, [refreshKey]);

  useEffect(() => {
    if (!sortieSelectionnee) return;

    function gererClavier(event) {
      if (event.key === "Escape") {
        setSortieSelectionnee(null);
      }
    }

    window.addEventListener("keydown", gererClavier);

    return () => {
      window.removeEventListener("keydown", gererClavier);
    };
  }, [sortieSelectionnee]);

  const sortiesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return sorties.filter((sortie) => {
      const motif = String(sortie.motif || "").toLowerCase();

      const correspondRecherche =
        !terme ||
        motif.includes(terme) ||
        String(sortie.id ?? "").toLowerCase().includes(terme);

      let correspondDate = true;

      if (dateRecherchee) {
        const date = sortie.date_sortie
          ? new Date(sortie.date_sortie)
          : null;

        if (!date || Number.isNaN(date.getTime())) {
          correspondDate = false;
        } else {
          const jour = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0"),
          ].join("-");

          correspondDate = jour === dateRecherchee;
        }
      }

      return correspondRecherche && correspondDate;
    });
  }, [sorties, recherche, dateRecherchee]);

  const totalMontant = useMemo(
    () =>
      sortiesFiltrees.reduce(
        (total, sortie) => total + nombre(sortie.montant),
        0
      ),
    [sortiesFiltrees]
  );

  const totalGeneral = useMemo(
    () =>
      sorties.reduce(
        (total, sortie) => total + nombre(sortie.montant),
        0
      ),
    [sorties]
  );

  const derniereSortie = sorties.length
    ? [...sorties].sort(
        (a, b) =>
          new Date(b.date_sortie || 0).getTime() -
          new Date(a.date_sortie || 0).getTime()
      )[0]
    : null;

  const filtresActifs = Boolean(recherche.trim() || dateRecherchee);

  function effacerFiltres() {
    setRecherche("");
    setDateRecherchee("");
  }

  return (
    <>
      <style>{`
        @keyframes sdApparition {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes sdMontee {
          from {
            opacity: 0;
            transform: translateY(7px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes sdModal {
          from {
            opacity: 0;
            transform: translateY(8px) scale(.995);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .sd-page {
          width: 100%;
          min-width: 0;
          padding: 12px 16px 20px;
          color: #34443D;
          background: #FCFDFB;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-size: 12px;
          box-sizing: border-box;
          animation: sdApparition .3s ease both;
        }

        .sd-page *,
        .sd-page *::before,
        .sd-page *::after {
          box-sizing: border-box;
        }

        .sd-page button,
        .sd-page input {
          font: inherit;
        }

        .sd-page button {
          -webkit-tap-highlight-color: transparent;
        }

        .sd-entete {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 17px;
        }

        .sd-entete-gauche {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .sd-icone-principal {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 39px;
          height: 39px;
          flex-shrink: 0;
          color: #438B74;
          background: #EAF3EE;
          border-radius: 12px;
        }

        .sd-surtitre {
          margin-bottom: 4px;
          color: #438B74;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .sd-titre {
          margin: 0;
          color: #293C33;
          font-size: clamp(19px, 2.4vw, 25px);
          font-weight: 650;
          letter-spacing: -.045em;
          line-height: 1.25;
        }

        .sd-sous-titre {
          margin: 4px 0 0;
          color: #829087;
          font-size: 11px;
          line-height: 1.5;
        }

        .sd-bouton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 34px;
          padding: 7px 11px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background .16s ease, color .16s ease, transform .16s ease;
        }

        .sd-bouton:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .sd-bouton:active:not(:disabled) {
          transform: scale(.98);
        }

        .sd-bouton-principal {
          color: white;
          background: #438B74;
        }

        .sd-bouton-principal:hover:not(:disabled) {
          background: #34765F;
        }

        .sd-bouton-neutre {
          color: #526258;
          background: #F1F5F1;
        }

        .sd-bouton-neutre:hover:not(:disabled) {
          background: #E7EEE7;
        }

        .sd-bouton-texte {
          min-height: 28px;
          padding: 5px 7px;
          color: #438B74;
          background: transparent;
        }

        .sd-bouton-texte:hover:not(:disabled) {
          background: #EDF5EF;
        }

        /* Statistiques sobres, sans grandes cartes */

        .sd-statistiques {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          margin-bottom: 18px;
          padding: 13px 0 15px;
          border-top: 1px solid #EEF1ED;
          border-bottom: 1px solid #EEF1ED;
        }

        .sd-statistique {
          min-width: 0;
          animation: sdMontee .35s ease both;
        }

        .sd-statistique:nth-child(2) {
          animation-delay: 40ms;
        }

        .sd-statistique:nth-child(3) {
          animation-delay: 80ms;
        }

        .sd-statistique-titre {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #77857B;
          font-size: 10px;
          font-weight: 500;
        }

        .sd-statistique-titre svg {
          flex-shrink: 0;
          color: #438B74;
        }

        .sd-statistique-valeur {
          margin-top: 7px;
          overflow-wrap: anywhere;
          color: #293C33;
          font-size: clamp(19px, 2.3vw, 25px);
          font-weight: 650;
          letter-spacing: -.045em;
          line-height: 1.3;
        }

        .sd-statistique-valeur.vert {
          color: #438B74;
        }

        .sd-statistique-detail {
          margin-top: 3px;
          color: #929D95;
          font-size: 9px;
          line-height: 1.5;
        }

        /* Recherche et filtres */

        .sd-outils {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }

        .sd-recherche {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1 1 230px;
          max-width: 390px;
          min-width: 0;
          padding: 0 0 7px;
          color: #8A958E;
          border-bottom: 1px solid #DCE5DD;
          transition: border-color .16s ease;
        }

        .sd-recherche:focus-within {
          border-color: #438B74;
        }

        .sd-recherche input {
          width: 100%;
          min-width: 0;
          padding: 4px 0;
          color: #34443D;
          background: transparent;
          border: 0;
          outline: none;
          font-size: 11px;
        }

        .sd-recherche input::placeholder {
          color: #9AA39D;
        }

        .sd-date {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #438B74;
        }

        .sd-date input {
          max-width: 145px;
          padding: 5px 0;
          color: #34443D;
          background: transparent;
          border: 0;
          border-bottom: 1px solid #E2E8E2;
          outline: none;
          font-size: 10px;
        }

        .sd-date input:focus {
          border-color: #438B74;
        }

        .sd-historique-entete {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 9px;
        }

        .sd-historique-titre {
          margin: 0;
          color: #34483D;
          font-size: 12px;
          font-weight: 650;
        }

        .sd-historique-description {
          margin-top: 3px;
          color: #8B9990;
          font-size: 10px;
        }

        .sd-resultats {
          color: #8B978E;
          font-size: 10px;
        }

        /* Tableau épuré */

        .sd-tableau-conteneur {
          width: 100%;
          overflow-x: auto;
          background: transparent;
        }

        .sd-tableau {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .sd-tableau thead {
          background: #F5F8F4;
        }

        .sd-tableau th {
          padding: 10px 11px;
          color: #7E8981;
          font-size: 9px;
          font-weight: 650;
          letter-spacing: .06em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .sd-tableau td {
          padding: 11px;
          color: #34443D;
          font-size: 11px;
          vertical-align: middle;
        }

        .sd-tableau tbody tr {
          border-bottom: 1px solid #F0F3EF;
          transition: background .16s ease;
          animation: sdMontee .3s ease both;
        }

        .sd-tableau tbody tr:last-child {
          border-bottom: none;
        }

        .sd-tableau tbody tr:hover {
          background: #F5F9F5;
        }

        .sd-date-cellule {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 120px;
        }

        .sd-date-icone {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 29px;
          height: 29px;
          flex-shrink: 0;
          color: #438B74;
          background: #EDF4F0;
          border-radius: 9px;
        }

        .sd-date-principale {
          color: #46564B;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
        }

        .sd-date-secondaire {
          margin-top: 3px;
          color: #98A39C;
          font-size: 9px;
        }

        .sd-motif {
          max-width: 420px;
          overflow: hidden;
          color: #39483F;
          font-size: 11px;
          font-weight: 550;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sd-motif-legende {
          margin-top: 3px;
          color: #98A39C;
          font-size: 9px;
        }

        .sd-montant {
          color: #2F674F;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .sd-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-height: 29px;
          padding: 6px 8px;
          color: #356B55;
          background: transparent;
          border: none;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: background .16s ease;
          white-space: nowrap;
        }

        .sd-action:hover {
          background: #EAF3EC;
        }

        .sd-pied-tableau {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
          padding: 10px 0;
          border-top: 1px solid #EEF1ED;
        }

        .sd-pied-texte {
          color: #89968C;
          font-size: 10px;
        }

        .sd-pied-total {
          color: #34765F;
          font-size: 11px;
          font-weight: 650;
        }

        /* Chargement, erreurs et état vide */

        .sd-chargement,
        .sd-vide {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 170px;
          padding: 25px 12px;
          text-align: center;
        }

        .sd-chargement {
          gap: 10px;
          color: #718178;
          font-size: 11px;
        }

        .sd-vide-icone {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          margin-bottom: 11px;
          color: #438B74;
          background: #EDF4F0;
          border-radius: 13px;
        }

        .sd-vide-titre {
          margin: 0;
          color: #46574B;
          font-size: 12px;
          font-weight: 650;
        }

        .sd-vide-description {
          max-width: 330px;
          margin: 5px 0 0;
          color: #8B978E;
          font-size: 10px;
          line-height: 1.6;
        }

        .sd-alerte {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: 10px 0;
          padding: 9px 0;
          color: #A64D4D;
          font-size: 11px;
          line-height: 1.5;
        }

        .sd-alerte svg {
          flex-shrink: 0;
        }

        /* Fenêtre de détail compacte */

        .sd-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          background: rgba(39, 53, 44, .24);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          animation: sdApparition .16s ease both;
        }

        .sd-modal {
          display: flex;
          flex-direction: column;
          width: min(590px, 100%);
          max-height: calc(100vh - 24px);
          max-height: calc(100dvh - 24px);
          overflow: hidden;
          background: #FEFFFD;
          border: none;
          border-radius: 15px;
          box-shadow: 0 18px 55px rgba(39, 57, 45, .13);
          animation: sdModal .2s ease both;
        }

        .sd-modal-entete {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 19px 13px;
        }

        .sd-modal-surtitre {
          color: #438B74;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .11em;
          text-transform: uppercase;
        }

        .sd-modal-titre {
          margin: 5px 0 0;
          color: #34443D;
          font-size: 19px;
          font-weight: 650;
          letter-spacing: -.035em;
        }

        .sd-modal-description {
          margin: 5px 0 0;
          color: #89938B;
          font-size: 10px;
        }

        .sd-fermer {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 31px;
          height: 31px;
          flex-shrink: 0;
          color: #77847A;
          background: transparent;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: background .16s ease;
        }

        .sd-fermer:hover {
          background: #EFF5EF;
          color: #315D49;
        }

        .sd-modal-contenu {
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0 19px 17px;
          scrollbar-width: thin;
          scrollbar-color: #DCE5DC transparent;
        }

        .sd-montant-bloc {
          padding: 15px 16px;
          background: #EDF5F0;
          border-radius: 11px;
        }

        .sd-montant-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #648474;
          font-size: 9px;
          font-weight: 650;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .sd-montant-valeur {
          margin-top: 7px;
          color: #356F59;
          font-size: clamp(25px, 4vw, 31px);
          font-weight: 700;
          letter-spacing: -.045em;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .sd-montant-note {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          color: #6C8B7A;
          font-size: 9px;
        }

        .sd-modal-section {
          margin-top: 19px;
        }

        .sd-modal-section-titre {
          margin: 0 0 9px;
          color: #879288;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .09em;
          text-transform: uppercase;
        }

        .sd-motif-detail {
          color: #34483D;
          font-size: 12px;
          font-weight: 550;
          line-height: 1.8;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .sd-info-ligne {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid #F0F3EF;
        }

        .sd-info-ligne:last-child {
          border-bottom: none;
        }

        .sd-info-icone {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 31px;
          height: 31px;
          flex-shrink: 0;
          color: #438B74;
          background: #F0F5F1;
          border-radius: 9px;
        }

        .sd-info-label {
          color: #8A9990;
          font-size: 9px;
        }

        .sd-info-valeur {
          margin-top: 4px;
          color: #34483D;
          font-size: 10px;
          font-weight: 550;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .sd-modal-pied {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 11px 19px;
          border-top: 1px solid #F0F3EF;
        }

        .sd-modal-pied-note {
          color: #929C94;
          font-size: 9px;
        }

        @media (max-width: 650px) {
          .sd-page {
            padding: 10px 12px 16px;
          }

          .sd-statistiques {
            gap: 12px;
          }

          .sd-statistique-titre {
            align-items: flex-start;
            font-size: 9px;
          }

          .sd-statistique-valeur {
            font-size: clamp(17px, 4vw, 22px);
          }

          .sd-recherche {
            max-width: none;
            flex-basis: 100%;
          }

          .sd-outils {
            gap: 10px;
          }

          .sd-tableau {
            min-width: 540px;
          }

          .sd-modal-entete {
            padding: 14px 14px 11px;
          }

          .sd-modal-contenu {
            padding: 0 14px 14px;
          }

          .sd-modal-pied {
            padding: 10px 14px;
          }
        }

        @media (max-width: 380px) {
          .sd-entete {
            align-items: flex-start;
          }

          .sd-bouton-actualiser {
            width: 34px;
            min-width: 34px;
            padding: 0;
            font-size: 0;
          }

          .sd-bouton-actualiser svg {
            width: 15px;
            height: 15px;
          }

          .sd-statistiques {
            gap: 8px;
          }

          .sd-statistique-valeur {
            font-size: 16px;
          }

          .sd-date input {
            max-width: 125px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sd-page,
          .sd-statistique,
          .sd-tableau tbody tr,
          .sd-overlay,
          .sd-modal {
            animation: none !important;
          }

          .sd-bouton,
          .sd-action,
          .sd-fermer {
            transition: none !important;
          }
        }
      `}</style>

      <main className="sd-page">

        {/* Statistiques */}
        <section className="sd-statistiques">
          <div className="sd-statistique">
            <div className="sd-statistique-titre">
              <ReceiptText size={15} />
              Nombre de sorties
            </div>

            <div className="sd-statistique-valeur">
              {sortiesFiltrees.length}
            </div>

            <p className="sd-statistique-detail">
              {filtresActifs
                ? "Dépenses correspondant aux filtres"
                : "Dépenses enregistrées"}
            </p>
          </div>

          <div className="sd-statistique">
            <div className="sd-statistique-titre">
              <Coins size={15} />
              Montant des résultats
            </div>

            <div className="sd-statistique-valeur vert">
              {formaterMontant(totalMontant)}
              <span className="ml-1 text-[10px] font-medium tracking-normal">
                Ar
              </span>
            </div>

            <p className="sd-statistique-detail">
              Total de la sélection actuelle
            </p>
          </div>

          <div className="sd-statistique">
            <div className="sd-statistique-titre">
              <TrendingDown size={15} />
              Montant cumulé
            </div>

            <div className="sd-statistique-valeur">
              {formaterMontant(totalGeneral)}
              <span className="ml-1 text-[10px] font-medium tracking-normal">
                Ar
              </span>
            </div>

            <p className="sd-statistique-detail">
              Toutes les dépenses enregistrées
            </p>
          </div>
        </section>

        {/* Recherche et filtre */}
        <section className="sd-outils">
          <label className="sd-recherche">
            <Search size={16} />

            <input
              type="search"
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un motif ou un identifiant..."
              aria-label="Rechercher une sortie"
            />

            {recherche && (
              <button
                type="button"
                className="sd-bouton sd-bouton-texte"
                onClick={() => setRecherche("")}
                aria-label="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )}
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <label className="sd-date">
              <CalendarDays size={14} />

              <input
                type="date"
                value={dateRecherchee}
                onChange={(event) =>
                  setDateRecherchee(event.target.value)
                }
                aria-label="Filtrer par date"
              />
            </label>

            {filtresActifs && (
              <button
                type="button"
                onClick={effacerFiltres}
                className="sd-bouton sd-bouton-texte"
              >
                <RotateCcw size={12} />
                Réinitialiser
              </button>
            )}
          </div>
        </section>

        {/* Erreur de chargement */}
        {erreur && (
          <div className="sd-alerte" role="alert">
            <AlertCircle size={16} />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">Chargement impossible</p>
              <p className="mt-1 break-words">{erreur}</p>

              <button
                type="button"
                onClick={() => chargerSorties()}
                className="mt-2 underline underline-offset-2"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {/* Historique */}
        <section>
          <div className="sd-historique-entete">
            <div>
              <h3 className="sd-historique-titre">
                Historique des dépenses
              </h3>

              <p className="sd-historique-description">
                {sortiesFiltrees.length} résultat
                {sortiesFiltrees.length !== 1 ? "s" : ""}
                {filtresActifs ? " après filtrage" : ""}
              </p>
            </div>

            {derniereSortie && (
              <div className="flex items-center gap-1.5 text-[10px] text-[#89968C]">
                <Clock3 size={12} />
                Dernière sortie :{" "}
                {formaterDateCourte(derniereSortie.date_sortie)}
              </div>
            )}
          </div>

          {chargement ? (
            <div className="sd-chargement">
              <LoaderCircle
                size={21}
                className="animate-spin text-[#438B74]"
              />
              Chargement des dépenses...
            </div>
          ) : sortiesFiltrees.length === 0 ? (
            <div className="sd-vide">
              <div className="sd-vide-icone">
                <Archive size={22} strokeWidth={1.5} />
              </div>

              <h4 className="sd-vide-titre">
                {sorties.length === 0
                  ? "Aucune sortie enregistrée"
                  : "Aucun résultat trouvé"}
              </h4>

              <p className="sd-vide-description">
                {sorties.length === 0
                  ? "Les dépenses diverses enregistrées apparaîtront ici."
                  : "Modifiez votre recherche ou la date sélectionnée."}
              </p>

              {filtresActifs && (
                <button
                  type="button"
                  onClick={effacerFiltres}
                  className="sd-bouton sd-bouton-principal mt-3"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="sd-tableau-conteneur">
                <table className="sd-tableau">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Motif de la dépense</th>
                      <th className="text-right">Montant</th>
                      <th className="text-right">Détail</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortiesFiltrees.map((sortie, index) => (
                      <tr
                        key={sortie.id}
                        style={{
                          animationDelay: `${Math.min(index, 10) * 20}ms`,
                        }}
                      >
                        <td>
                          <div className="sd-date-cellule">
                            <div className="sd-date-icone">
                              <CalendarDays size={14} />
                            </div>

                            <div>
                              <p className="sd-date-principale">
                                {formaterDateCourte(sortie.date_sortie)}
                              </p>

                              <p className="sd-date-secondaire">
                                {formaterHeure(sortie.date_sortie)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td>
                          <p
                            className="sd-motif"
                            title={sortie.motif || "Motif non renseigné"}
                          >
                            {sortie.motif || "Motif non renseigné"}
                          </p>

                          <p className="sd-motif-legende">
                            Dépense diverse
                          </p>
                        </td>

                        <td className="text-right">
                          <span className="sd-montant">
                            {formaterMontant(sortie.montant)}
                          </span>

                          <span className="ml-1 text-[9px] text-[#8A9990]">
                            Ar
                          </span>
                        </td>

                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => setSortieSelectionnee(sortie)}
                            title="Consulter le détail"
                            aria-label={`Consulter la sortie ${sortie.id}`}
                            className="sd-action"
                          >
                            <Eye size={15} />
                            Détails
                            <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <footer className="sd-pied-tableau">
                <p className="sd-pied-texte">
                  {sortiesFiltrees.length} sortie
                  {sortiesFiltrees.length !== 1 ? "s" : ""} affichée
                  {sortiesFiltrees.length !== 1 ? "s" : ""}
                  {" · "}
                  {sorties.length} au total
                </p>

                <p className="sd-pied-total">
                  Total affiché : {formaterMontant(totalMontant)} Ar
                </p>
              </footer>
            </>
          )}
        </section>
      </main>

      {/* Fenêtre de détail */}
      {sortieSelectionnee && (
        <div
          className="sd-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSortieSelectionnee(null);
            }
          }}
        >
          <section
            className="sd-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sd-modal-titre"
          >
            <header className="sd-modal-entete">
              <div className="min-w-0">
                <p className="sd-modal-surtitre">
                  Gestion financière
                </p>

                <h3
                  id="sd-modal-titre"
                  className="sd-modal-titre"
                >
                  Détail de la sortie
                </h3>

                <p className="sd-modal-description">
                  Informations de la dépense enregistrée
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSortieSelectionnee(null)}
                aria-label="Fermer le détail"
                className="sd-fermer"
              >
                <X size={18} />
              </button>
            </header>

            <div className="sd-modal-contenu">
              {/* Montant */}
              <div className="sd-montant-bloc">
                <div className="sd-montant-label">
                  <Coins size={14} />
                  Montant de la dépense
                </div>

                <div className="sd-montant-valeur">
                  {formaterMontant(sortieSelectionnee.montant)}
                  <span className="ml-1.5 text-sm font-medium tracking-normal">
                    Ar
                  </span>
                </div>

                <div className="sd-montant-note">
                  <ArrowDownRight size={13} />
                  Sortie financière enregistrée
                </div>
              </div>

              {/* Motif */}
              <section className="sd-modal-section">
                <h4 className="sd-modal-section-titre">
                  Motif de la dépense
                </h4>

                <p className="sd-motif-detail">
                  {sortieSelectionnee.motif || "Motif non renseigné"}
                </p>
              </section>

              {/* Informations */}
              <section className="sd-modal-section">
                <h4 className="sd-modal-section-titre">
                  Informations complémentaires
                </h4>

                <div>
                  <div className="sd-info-ligne">
                    <div className="sd-info-icone">
                      <CalendarDays size={15} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="sd-info-label">Date de sortie</p>

                      <p className="sd-info-valeur">
                        {formaterDate(sortieSelectionnee.date_sortie)}
                      </p>
                    </div>
                  </div>

                  {sortieSelectionnee.created_at && (
                    <div className="sd-info-ligne">
                      <div className="sd-info-icone">
                        <Clock3 size={15} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="sd-info-label">
                          Date de création
                        </p>

                        <p className="sd-info-valeur">
                          {formaterDate(sortieSelectionnee.created_at)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="sd-info-ligne">
                    <div className="sd-info-icone">
                      <Hash size={15} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="sd-info-label">
                        Identifiant de la sortie
                      </p>

                      <p className="sd-info-valeur font-mono">
                        {sortieSelectionnee.id}
                      </p>
                    </div>
                  </div>

                  <div className="sd-info-ligne">
                    <div className="sd-info-icone">
                      <ReceiptText size={15} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="sd-info-label">Catégorie</p>

                      <p className="sd-info-valeur">
                        Sortie diverse
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Récapitulatif */}
              <section className="sd-modal-section">
                <h4 className="sd-modal-section-titre">
                  Récapitulatif financier
                </h4>

                <div className="flex items-center justify-between gap-3 border-t border-[#E9EEE9] py-3">
                  <span className="text-[11px] text-[#77857B]">
                    Montant enregistré
                  </span>

                  <strong className="text-[12px] font-semibold text-[#34765F]">
                    {formaterMontant(sortieSelectionnee.montant)} Ar
                  </strong>
                </div>
              </section>
            </div>

            <footer className="sd-modal-pied">
              <p className="sd-modal-pied-note">
                Détail de la dépense
              </p>

              <button
                type="button"
                onClick={() => setSortieSelectionnee(null)}
                className="sd-bouton sd-bouton-principal"
              >
                Fermer
                <ChevronRight size={13} />
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
