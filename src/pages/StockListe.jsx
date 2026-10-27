
import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Search,
  RefreshCw,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Boxes,
  CircleDollarSign,
  Warehouse,
  RotateCcw,
  Pill,
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

function obtenirEtatStock(stock) {
  if (stock <= 0) {
    return {
      label: "Rupture",
      classe: "sl-etat-rupture",
      icone: XCircle,
    };
  }

  if (stock <= 5) {
    return {
      label: "Stock faible",
      classe: "sl-etat-faible",
      icone: AlertTriangle,
    };
  }

  return {
    label: "Disponible",
    classe: "sl-etat-disponible",
    icone: CheckCircle2,
  };
}

function Statistique({ icone: Icone, titre, valeur, detail }) {
  return (
    <div className="sl-statistique">
      <div className="sl-statistique-titre">
        <Icone size={16} strokeWidth={1.7} />
        <span>{titre}</span>
      </div>

      <div className="sl-statistique-valeur">{valeur}</div>

      {detail && (
        <div className="sl-statistique-detail">{detail}</div>
      )}
    </div>
  );
}

function EtatVide({ titre, description }) {
  return (
    <div className="sl-vide">
      <Package size={29} strokeWidth={1.4} />
      <p className="sl-vide-titre">{titre}</p>
      <p className="sl-vide-description">{description}</p>
    </div>
  );
}

export default function StockListe() {
  const [medicaments, setMedicaments] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("tous");
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState("");

  const chargerStock = useCallback(async (silencieux = false) => {
    try {
      setErreur("");

      if (silencieux) {
        setActualisation(true);
      } else {
        setChargement(true);
      }

      const resultat = await invoke("obtenir_stock_medicaments");

      setMedicaments(Array.isArray(resultat) ? resultat : []);
    } catch (error) {
      console.error("Erreur de chargement du stock :", error);
      setErreur(
        typeof error === "string"
          ? error
          : error?.message ||
              "Impossible de charger le stock des médicaments."
      );
    } finally {
      setChargement(false);
      setActualisation(false);
    }
  }, []);

  useEffect(() => {
    chargerStock();
  }, [chargerStock]);

  const medicamentsFiltres = useMemo(() => {
    const terme = recherche.trim().toLocaleLowerCase("fr-FR");

    return medicaments.filter((medicament) => {
      const nom = String(medicament.nom || "").toLocaleLowerCase("fr-FR");
      const correspondRecherche = !terme || nom.includes(terme);
      const stock = nombre(medicament.stock);

      let correspondFiltre = true;

      if (filtre === "rupture") {
        correspondFiltre = stock <= 0;
      } else if (filtre === "faible") {
        correspondFiltre = stock > 0 && stock <= 5;
      } else if (filtre === "disponible") {
        correspondFiltre = stock > 5;
      }

      return correspondRecherche && correspondFiltre;
    });
  }, [medicaments, recherche, filtre]);

  const statistiques = useMemo(() => {
    const ruptures = medicaments.filter(
      (medicament) => nombre(medicament.stock) <= 0
    ).length;

    const faibles = medicaments.filter((medicament) => {
      const stock = nombre(medicament.stock);
      return stock > 0 && stock <= 5;
    }).length;

    const disponibles = medicaments.filter(
      (medicament) => nombre(medicament.stock) > 5
    ).length;

    const unites = medicaments.reduce(
      (total, medicament) => total + nombre(medicament.stock),
      0
    );

    const valeur = medicaments.reduce(
      (total, medicament) =>
        total +
        nombre(medicament.stock) *
          nombre(medicament.prix_unitaire),
      0
    );

    return {
      nombre: medicaments.length,
      ruptures,
      faibles,
      disponibles,
      unites,
      valeur,
      alertes: ruptures + faibles,
    };
  }, [medicaments]);

  const reinitialiserFiltres = () => {
    setRecherche("");
    setFiltre("tous");
  };

  return (
    <div className="sl-page">
      <style>{`
        .sl-page {
          --sl-vert: #438B74;
          --sl-vert-fonce: #28594B;
          --sl-texte: #34443D;
          --sl-secondaire: #77827B;
          --sl-ligne: #E9EEE9;
          width: 100%;
          min-width: 0;
          min-height: 100%;
          padding: 12px 16px 20px;
          margin: 0;
          color: var(--sl-texte);
          background: #FCFDFB;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-size: 13px;
          box-sizing: border-box;
          animation: sl-apparition .35s ease both;
        }

        .sl-page *,
        .sl-page *::before,
        .sl-page *::after {
          box-sizing: border-box;
        }

        .sl-page button,
        .sl-page input {
          font: inherit;
        }

        .sl-page button {
          -webkit-tap-highlight-color: transparent;
        }

        .sl-entete {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin: 0 0 18px;
        }

        .sl-entete-gauche {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .sl-icone-principale {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          color: var(--sl-vert);
          background: #EFF6F1;
          border-radius: 10px;
        }

        .sl-surtitre {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 0 0 5px;
          color: var(--sl-vert);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .12em;
        }

        .sl-titre {
          margin: 0;
          color: #293C33;
          font-size: clamp(22px, 2.5vw, 29px);
          font-weight: 650;
          letter-spacing: -.055em;
          line-height: 1.2;
        }

        .sl-sous-titre {
          margin: 5px 0 0;
          color: var(--sl-secondaire);
          font-size: 12px;
          line-height: 1.5;
        }

        .sl-bouton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 35px;
          padding: 8px 11px;
          color: var(--sl-vert-fonce);
          background: #F1F5F1;
          border: 0;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 550;
          white-space: nowrap;
          cursor: pointer;
          transition: background .18s ease, transform .18s ease;
        }

        .sl-bouton:hover:not(:disabled) {
          background: #E6EEE7;
        }

        .sl-bouton:active:not(:disabled) {
          transform: scale(.98);
        }

        .sl-bouton:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .sl-bouton-texte {
          padding: 6px 8px;
          color: var(--sl-vert-fonce);
          background: transparent;
        }

        .sl-bouton-texte:hover:not(:disabled) {
          background: #EFF6F1;
        }

        .sl-statistiques {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
          margin: 0 0 20px;
          padding: 13px 0 15px;
          border-top: 1px solid #EEF1ED;
          border-bottom: 1px solid #EEF1ED;
        }

        .sl-statistique {
          min-width: 0;
          padding-right: 4px;
          animation: sl-montee .4s ease both;
        }

        .sl-statistique:nth-child(2) {
          animation-delay: 50ms;
        }

        .sl-statistique:nth-child(3) {
          animation-delay: 100ms;
        }

        .sl-statistique:nth-child(4) {
          animation-delay: 150ms;
        }

        .sl-statistique-titre {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--sl-secondaire);
          font-size: 11px;
          font-weight: 500;
        }

        .sl-statistique-titre svg {
          color: var(--sl-vert);
          flex-shrink: 0;
        }

        .sl-statistique-valeur {
          margin-top: 8px;
          color: #293C33;
          font-size: clamp(20px, 2.2vw, 27px);
          font-weight: 650;
          letter-spacing: -.055em;
          overflow-wrap: anywhere;
          font-variant-numeric: tabular-nums;
        }

        .sl-statistique-detail {
          margin-top: 4px;
          color: #929B95;
          font-size: 10px;
          line-height: 1.5;
        }

        .sl-statistique-valeur.montant {
          color: #2C5947;
          font-size: clamp(16px, 1.7vw, 22px);
          letter-spacing: -.035em;
        }

        .sl-outils {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 12px;
        }

        .sl-recherche {
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

        .sl-recherche:focus-within {
          border-color: var(--sl-vert);
        }

        .sl-recherche input {
          width: 100%;
          min-width: 0;
          padding: 4px 0;
          color: var(--sl-texte);
          background: transparent;
          border: 0;
          outline: none;
          font-size: 12px;
        }

        .sl-recherche input::placeholder {
          color: #9AA39D;
        }

        .sl-filtres {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }

        .sl-filtre {
          min-height: 30px;
          padding: 6px 9px;
          color: #78847B;
          background: transparent;
          border: 0;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 550;
          white-space: nowrap;
          cursor: pointer;
          transition: background .18s ease, color .18s ease;
        }

        .sl-filtre:hover {
          color: var(--sl-vert-fonce);
          background: #F2F6F1;
        }

        .sl-filtre.actif {
          color: var(--sl-vert-fonce);
          background: #EAF3EC;
          font-weight: 700;
        }

        .sl-resultats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin: 0 0 7px;
          color: #8A958E;
          font-size: 10px;
        }

        .sl-legende {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sl-legende-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .sl-point {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #438B74;
        }

        .sl-point.faible {
          background: #B98542;
        }

        .sl-point.rupture {
          background: #C65F5F;
        }

        .sl-alerte {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: 12px 0;
          padding: 9px 0;
          color: #A64D4D;
          font-size: 11px;
          line-height: 1.5;
        }

        .sl-alerte svg {
          flex-shrink: 0;
        }

        .sl-alerte span {
          flex: 1;
          overflow-wrap: anywhere;
        }

        .sl-tableau-conteneur {
          position: relative;
          width: 100%;
          max-height: min(530px, 62vh);
          min-height: 180px;
          overflow: auto;
          border: 0;
          border-radius: 0;
          background: transparent;
          isolation: isolate;
          scrollbar-width: thin;
          scrollbar-color: #DCE5DC transparent;
        }

        .sl-tableau-conteneur::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }

        .sl-tableau-conteneur::-webkit-scrollbar-thumb {
          background: #D3DED5;
          border-radius: 8px;
        }

        .sl-tableau-conteneur::-webkit-scrollbar-track {
          background: transparent;
        }

        .sl-tableau {
          width: 100%;
          min-width: 720px;
          border-collapse: separate;
          border-spacing: 0;
          text-align: left;
        }

        .sl-tableau thead {
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .sl-tableau th {
          position: sticky;
          top: 0;
          z-index: 11;
          padding: 11px 12px;
          color: #7E8981;
          background: #F5F8F4;
          border-bottom: 1px solid #E5EBE4;
          box-shadow: inset 0 -1px 0 #E5EBE4;
          font-size: 9px;
          font-weight: 650;
          letter-spacing: .07em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .sl-tableau td {
          padding: 12px;
          color: var(--sl-texte);
          background: #FCFDFB;
          border-bottom: 1px solid #F0F3EF;
          font-size: 11px;
          vertical-align: middle;
        }

        .sl-tableau tbody tr {
          animation: sl-ligne .35s ease both;
          transition: background .18s ease;
        }

        .sl-tableau tbody tr:last-child td {
          border-bottom: 0;
        }

        .sl-tableau tbody tr:hover td {
          background: #F5F9F5;
        }

        .sl-produit {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 165px;
        }

        .sl-produit-icone {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 29px;
          height: 29px;
          flex-shrink: 0;
          color: var(--sl-vert);
          background: #EAF3EC;
          border-radius: 9px;
        }

        .sl-produit-nom {
          max-width: 270px;
          margin: 0;
          color: #39483F;
          font-size: 11px;
          font-weight: 650;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .sl-produit-id {
          margin: 3px 0 0;
          color: #9AA39D;
          font-size: 9px;
        }

        .sl-stock-nombre {
          color: #34443D;
          font-size: 13px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        .sl-stock-nombre.rupture {
          color: #C65F5F;
        }

        .sl-stock-nombre.faible {
          color: #B98542;
        }

        .sl-stock-unite {
          margin-left: 4px;
          color: #89958E;
          font-size: 9px;
        }

        .sl-montant {
          color: #45554B;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .sl-montant-total {
          color: #2C5947;
          font-weight: 700;
        }

        .sl-etat {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 5px 7px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 650;
          white-space: nowrap;
        }

        .sl-etat-rupture {
          color: #AD5555;
          background: #FBF0F0;
        }

        .sl-etat-faible {
          color: #9A753A;
          background: #FAF5E9;
        }

        .sl-etat-disponible {
          color: #34765B;
          background: #EFF6F1;
        }

        .sl-pied {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          color: #929C94;
          font-size: 10px;
        }

        .sl-pied-gauche {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sl-pied svg {
          color: #83A18B;
          flex-shrink: 0;
        }

        .sl-pied-statistiques {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sl-pied-stat {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .sl-pied-stat strong {
          font-weight: 700;
        }

        .sl-vide {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 190px;
          padding: 25px 12px;
          color: #8B978E;
          text-align: center;
        }

        .sl-vide > svg {
          margin-bottom: 12px;
          color: #76A58A;
        }

        .sl-vide-titre {
          margin: 0;
          color: #46574B;
          font-size: 13px;
          font-weight: 650;
        }

        .sl-vide-description {
          max-width: 350px;
          margin: 5px 0 0;
          color: #8B978E;
          font-size: 11px;
          line-height: 1.6;
        }

        .sl-chargement {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 190px;
          color: #758278;
          font-size: 12px;
        }

        .sl-rotation {
          animation: sl-tourner .9s linear infinite;
        }

        @keyframes sl-tourner {
          to { transform: rotate(360deg); }
        }

        @keyframes sl-apparition {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes sl-montee {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes sl-ligne {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (max-width: 1050px) {
          .sl-statistiques {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px 22px;
          }

          .sl-outils {
            align-items: stretch;
            flex-direction: column;
          }

          .sl-recherche {
            max-width: none;
            flex-basis: auto;
            width: 100%;
          }

          .sl-filtres {
            width: 100%;
          }
        }

        @media (max-width: 600px) {
          .sl-page {
            padding: 12px 11px 18px;
          }

          .sl-entete {
            align-items: flex-start;
            flex-direction: column;
            margin-bottom: 15px;
          }

          .sl-entete > .sl-bouton {
            align-self: flex-end;
          }

          .sl-titre {
            font-size: 22px;
          }

          .sl-sous-titre {
            font-size: 11px;
          }

          .sl-statistiques {
            gap: 14px 12px;
            margin-bottom: 16px;
          }

          .sl-statistique-titre {
            align-items: flex-start;
            font-size: 10px;
          }

          .sl-statistique-valeur {
            font-size: 22px;
          }

          .sl-statistique-valeur.montant {
            font-size: 16px;
          }

          .sl-filtres {
            gap: 3px;
          }

          .sl-filtre {
            padding: 6px 7px;
            font-size: 9px;
          }

          .sl-resultats {
            align-items: flex-start;
            flex-direction: column;
          }

          .sl-tableau-conteneur {
            max-height: 55vh;
            min-height: 170px;
          }

          .sl-pied {
            align-items: flex-start;
            flex-direction: column;
          }

          .sl-pied-statistiques {
            gap: 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sl-page *,
          .sl-page *::before,
          .sl-page *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <header className="sl-entete">
        <div className="sl-entete-gauche">
          <div className="sl-icone-principale">
            <Warehouse size={19} strokeWidth={1.7} />
          </div>

          <div>
            <div className="sl-surtitre">
              <Pill size={12} />
              Gestion du stock
            </div>

            <h1 className="sl-titre">Stock des médicaments</h1>

            <p className="sl-sous-titre">
              Consultez les quantités disponibles et surveillez votre inventaire.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="sl-bouton"
          onClick={() => chargerStock(true)}
          disabled={actualisation || chargement}
        >
          <RefreshCw
            size={14}
            className={actualisation || chargement ? "sl-rotation" : ""}
          />
        </button>
      </header>

      <section className="sl-statistiques">
        <Statistique
          icone={Boxes}
          titre="Médicaments"
          valeur={statistiques.nombre}
          detail="Références enregistrées"
        />

        <Statistique
          icone={Package}
          titre="Unités en stock"
          valeur={statistiques.unites.toLocaleString("fr-FR")}
          detail="Quantité totale"
        />

        <Statistique
          icone={AlertTriangle}
          titre="Alertes de stock"
          valeur={statistiques.alertes}
          detail={`${statistiques.ruptures} rupture(s) · ${statistiques.faibles} stock(s) faible(s)`}
        />

        <Statistique
          icone={CircleDollarSign}
          titre="Valeur du stock"
          valeur={
            <span className="sl-valeur-montant">
              {formaterMontant(statistiques.valeur)}
            </span>
          }
          detail="Valeur estimée de l'inventaire"
        />
      </section>

      <style>{`
        .sl-valeur-montant {
          color: #2C5947;
          font-size: clamp(16px, 1.7vw, 22px);
          letter-spacing: -.035em;
        }
      `}</style>

      <section className="sl-outils">
        <label className="sl-recherche">
          <Search size={16} />
          <input
            type="search"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher un médicament…"
            aria-label="Rechercher un médicament"
          />

          {recherche && (
            <button
              type="button"
              className="sl-bouton-texte"
              onClick={() => setRecherche("")}
              aria-label="Effacer la recherche"
            >
              <XCircle size={14} />
            </button>
          )}
        </label>

        <div className="sl-filtres" aria-label="Filtres du stock">
          {[
            ["tous", "Tous"],
            ["disponible", "Disponible"],
            ["faible", "Stock faible"],
            ["rupture", "Rupture"],
          ].map(([valeur, label]) => (
            <button
              key={valeur}
              type="button"
              className={`sl-filtre ${filtre === valeur ? "actif" : ""}`}
              onClick={() => setFiltre(valeur)}
              aria-pressed={filtre === valeur}
            >
              {label}
            </button>
          ))}

          {(recherche || filtre !== "tous") && (
            <button
              type="button"
              className="sl-bouton-texte sl-bouton"
              onClick={reinitialiserFiltres}
              title="Réinitialiser les filtres"
            >
              <RotateCcw size={12} />
              Effacer
            </button>
          )}
        </div>
      </section>

      <div className="sl-resultats">
        <span>
          {medicamentsFiltres.length} résultat
          {medicamentsFiltres.length !== 1 ? "s" : ""}
          {recherche ? ` pour « ${recherche} »` : ""}
        </span>

        <div className="sl-legende">
          <span className="sl-legende-item">
            <span className="sl-point" />
            Disponible
          </span>
          <span className="sl-legende-item">
            <span className="sl-point faible" />
            Faible
          </span>
          <span className="sl-legende-item">
            <span className="sl-point rupture" />
            Rupture
          </span>
        </div>
      </div>

      {erreur && (
        <div className="sl-alerte" role="alert">
          <AlertTriangle size={16} />
          <span>{erreur}</span>

          <button
            type="button"
            className="sl-bouton sl-bouton-texte"
            onClick={() => chargerStock()}
            disabled={chargement}
          >
            Réessayer
          </button>
        </div>
      )}

      {chargement ? (
        <div className="sl-chargement">
          <RefreshCw size={18} className="sl-rotation" />
          Chargement du stock…
        </div>
      ) : medicamentsFiltres.length === 0 ? (
        <EtatVide
          titre={
            medicaments.length === 0
              ? "Aucun médicament enregistré"
              : "Aucun résultat"
          }
          description={
            medicaments.length === 0
              ? "Les médicaments enregistrés apparaîtront ici."
              : "Modifiez votre recherche ou choisissez un autre filtre."
          }
        />
      ) : (
        <div className="sl-tableau-conteneur">
          <table className="sl-tableau">
            <thead>
              <tr>
                <th scope="col">Médicament</th>
                <th scope="col" style={{ textAlign: "center" }}>
                  Stock
                </th>
                <th scope="col" style={{ textAlign: "right" }}>
                  Prix unitaire
                </th>
                <th scope="col" style={{ textAlign: "right" }}>
                  Valeur du stock
                </th>
                <th scope="col" style={{ textAlign: "center" }}>
                  État
                </th>
              </tr>
            </thead>

            <tbody>
              {medicamentsFiltres.map((medicament, index) => {
                const stock = nombre(medicament.stock);
                const prix = nombre(medicament.prix_unitaire);
                const valeur = stock * prix;
                const etat = obtenirEtatStock(stock);
                const IconeEtat = etat.icone;

                return (
                  <tr
                    key={medicament.id}
                    style={{
                      animationDelay: `${Math.min(index, 10) * 25}ms`,
                    }}
                  >
                    <td>
                      <div className="sl-produit">
                        <div className="sl-produit-icone">
                          <Package size={15} />
                        </div>

                        <div>
                          <p className="sl-produit-nom">
                            {medicament.nom || "Médicament sans nom"}
                          </p>
                          
                        </div>
                      </div>
                    </td>

                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <span
                        className={`sl-stock-nombre ${
                          stock <= 0
                            ? "rupture"
                            : stock <= 5
                            ? "faible"
                            : ""
                        }`}
                      >
                        {stock.toLocaleString("fr-FR")}
                      </span>

                      <span className="sl-stock-unite">
                        unité{stock > 1 ? "s" : ""}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <span className="sl-montant">
                        {formaterMontant(prix)}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <span className="sl-montant sl-montant-total">
                        {formaterMontant(valeur)}
                      </span>
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <span className={`sl-etat ${etat.classe}`}>
                        <IconeEtat size={12} />
                        {etat.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <footer className="sl-pied">
        <div className="sl-pied-gauche">
          <Boxes size={13} />
          <span>Inventaire des médicaments enregistrés.</span>
        </div>

        <div className="sl-pied-statistiques">
          <span className="sl-pied-stat">
            Rupture :
            <strong style={{ color: "#C65F5F" }}>
              {statistiques.ruptures}
            </strong>
          </span>

          <span className="sl-pied-stat">
            Stock faible :
            <strong style={{ color: "#B98542" }}>
              {statistiques.faibles}
            </strong>
          </span>

          <span className="sl-pied-stat">
            <strong style={{ color: "#438B74" }}>
              {medicamentsFiltres.length} / {medicaments.length}
            </strong>
            affichés
          </span>
        </div>
      </footer>
    </div>
  );
}
