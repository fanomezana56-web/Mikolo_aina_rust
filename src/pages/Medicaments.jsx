
import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";

import {
  Pill,
  Plus,
  Search,
  Package,
  Boxes,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  X,
  CheckCircle2,
  Trash2,
  Filter,
  ShieldAlert,
  Activity,
  PackageCheck,
} from "lucide-react";

import ModifierMedicamentForm from "../components/medicaments/ModifierStockForm";
import RetirerStockForm from "../components/medicaments/RetirerStockForm";
import StockForm from "../components/medicaments/StockForm";
import MedicamentForm from "../components/medicaments/MedicamentForm";
import MedicamentTable from "../components/medicaments/MedicamentsTable";

const COULEURS = {
  fond: "#F4F6F5",
  blanc: "#FFFFFF",
  texte: "#394842",
  secondaire: "#87928E",
  vert: "#356B5C",
  vertHover: "#2D5D50",
  vertPale: "#F1F6F4",
  bordure: "#DDE3E0",
  bordureChamp: "#D6DEDA",
  orange: "#A47B42",
  orangePale: "#FAF7F1",
  rouge: "#A34A4A",
  rougePale: "#FBF5F5",
};

function nombre(valeur) {
  const resultat = Number(valeur ?? 0);
  return Number.isFinite(resultat) ? resultat : 0;
}

function CarteStatistique({
  titre,
  valeur,
  description,
  icone: Icone,
  couleur = "vert",
  onClick,
}) {
  const themes = {
    vert: {
      icone: "border-[#C9DCD4] bg-[#F1F6F4] text-[#356B5C]",
      bordure: "border-[#DDE3E0]",
      etiquette: "text-[#87928E]",
    },
    orange: {
      icone: "border-[#E5D9C7] bg-[#FAF7F1] text-[#A47B42]",
      bordure: "border-[#E3D9C7]",
      etiquette: "text-[#A47B42]",
    },
    rouge: {
      icone: "border-[#E7CFCF] bg-[#FBF5F5] text-[#A34A4A]",
      bordure: "border-[#E7CFCF]",
      etiquette: "text-[#A34A4A]",
    },
    bleu: {
      icone: "border-[#D5DFEB] bg-[#F2F6FA] text-[#597DA9]",
      bordure: "border-[#DDE3E0]",
      etiquette: "text-[#87928E]",
    },
  };
  

  const theme = themes[couleur] || themes.vert;
  const Conteneur = onClick ? "button" : "div";

  return (
    <Conteneur
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={[
        "w-full rounded-[12px] border bg-white p-4 text-left",
        "shadow-[0_3px_12px_rgba(38,51,47,0.04)]",
        "transition-colors",
        theme.bordure,
        onClick
          ? "group hover:border-[#C9DCD4] hover:bg-[#FBFDFC]"
          : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center",
            "rounded-[8px] border",
            theme.icone,
          ].join(" ")}
        >
          <Icone className="h-4 w-4" strokeWidth={1.9} />
        </div>

        {onClick ? (
          <ArrowRight className="h-4 w-4 text-[#87928E] transition-transform group-hover:translate-x-0.5 group-hover:text-[#356B5C]" />
        ) : (
          <span
            className={[
              "text-[8px] font-bold uppercase tracking-[0.07em]",
              theme.etiquette,
            ].join(" ")}
          >
            {titre}
          </span>
        )}
      </div>

      <p className="mt-3 text-[21px] font-bold tracking-tight text-[#394842]">
        {valeur}
      </p>

      <p className="mt-0.5 text-[9px] font-medium leading-4 text-[#87928E]">
        {description}
      </p>
    </Conteneur>
  );
}

function BoutonFiltre({
  actif,
  onClick,
  titre,
  valeur,
  icone: Icone,
  theme = "vert",
}) {
  const styles = {
    vert: actif
      ? "border-[#C9DCD4] bg-[#F1F6F4] text-[#356B5C]"
      : "border-[#DDE3E0] bg-white text-[#68756F] hover:bg-[#F8FAF9]",
    orange: actif
      ? "border-[#E5D9C7] bg-[#FAF7F1] text-[#A47B42]"
      : "border-[#DDE3E0] bg-white text-[#68756F] hover:bg-[#F8FAF9]",
    rouge: actif
      ? "border-[#E7CFCF] bg-[#FBF5F5] text-[#A34A4A]"
      : "border-[#DDE3E0] bg-white text-[#68756F] hover:bg-[#F8FAF9]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={[
        "flex min-w-0 items-center justify-between gap-2",
        "rounded-[8px] border px-3 py-2.5 text-left",
        "transition-colors",
        styles[theme] || styles.vert,
      ].join(" ")}
    >
      <span className="flex min-w-0 items-center gap-1.5 text-[9px] font-bold">
        {Icone && <Icone className="h-3 w-3 shrink-0" />}
        <span className="truncate">{titre}</span>
      </span>

      <span className="text-[9px] font-bold tabular-nums">
        {valeur}
      </span>
    </button>
  );
}

export default function Medicaments() {
  const navigate = useNavigate();

  const [medicaments, setMedicaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actualisationEnCours, setActualisationEnCours] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filtreStock, setFiltreStock] = useState("tous");

  const [showForm, setShowForm] = useState(false);
  const [showStockForm, setShowStockForm] = useState(false);
  const [showEditStockForm, setShowEditStockForm] = useState(false);
  const [showRemoveStockForm, setShowRemoveStockForm] = useState(false);

  const [selectedMedicament, setSelectedMedicament] = useState(null);
  const [medicamentASupprimer, setMedicamentASupprimer] = useState(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [alertesStockOuvertes, setAlertesStockOuvertes] = useState(true);
  
  const chargerMedicaments = useCallback(async (silencieux = false) => {
    if (silencieux) {
      setActualisationEnCours(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const resultat = await invoke("obtenir_medicaments");

      setMedicaments(Array.isArray(resultat) ? resultat : []);
    } catch (err) {
      console.error("Erreur chargement médicaments :", err);

      setError(
        err?.toString?.() ||
          "Impossible de charger les médicaments."
      );
    } finally {
      setLoading(false);
      setActualisationEnCours(false);
    }
  }, []);

  useEffect(() => {
    chargerMedicaments();
  }, [chargerMedicaments]);

  const statistiquesStock = useMemo(() => {
    let rupture = 0;
    let faible = 0;
    let disponible = 0;
    let totalUnites = 0;

    medicaments.forEach((medicament) => {
      const stock = Math.max(0, nombre(medicament.stock));

      totalUnites += stock;

      if (stock === 0) {
        rupture++;
      } else if (stock <= 10) {
        faible++;
      } else {
        disponible++;
      }
    });

    return {
      tous: medicaments.length,
      rupture,
      faible,
      disponible,
      totalUnites,
    };
  }, [medicaments]);

  const filteredMedicaments = useMemo(() => {
    const recherche = search.trim().toLowerCase();

    return medicaments.filter((medicament) => {
      const correspondRecherche =
        !recherche ||
        String(medicament.nom ?? "").toLowerCase().includes(recherche) ||
        String(medicament.id ?? "").toLowerCase().includes(recherche) ||
        String(medicament.prix_unitaire ?? "").toLowerCase().includes(recherche) ||
        String(medicament.stock ?? "").toLowerCase().includes(recherche);

      const stock = nombre(medicament.stock);

      let correspondFiltre = true;

      if (filtreStock === "rupture") {
        correspondFiltre = stock === 0;
      } else if (filtreStock === "faible") {
        correspondFiltre = stock > 0 && stock <= 10;
      } else if (filtreStock === "disponible") {
        correspondFiltre = stock > 10;
      }

      return correspondRecherche && correspondFiltre;
    });
  }, [medicaments, search, filtreStock]);

  const medicamentsStockFaible = useMemo(() => {
    return medicaments
      .filter((medicament) => nombre(medicament.stock) <= 10)
      .sort(
        (a, b) =>
          nombre(a.stock) - nombre(b.stock)
      );
  }, [medicaments]);

  const ouvrirFormulaireStock = (medicament, type) => {
    setSelectedMedicament(medicament);
    setShowStockForm(type === "ajouter");
    setShowEditStockForm(type === "modifier");
    setShowRemoveStockForm(type === "retirer");
  };

  const fermerFormulaireStock = () => {
    setShowStockForm(false);
    setShowEditStockForm(false);
    setShowRemoveStockForm(false);
    setSelectedMedicament(null);
  };

  const handleDeleteMedicament = (medicament) => {
    setError("");
    setMedicamentASupprimer(medicament);
  };

  const confirmerSuppression = async () => {
    if (!medicamentASupprimer || suppressionEnCours) return;

    try {
      setSuppressionEnCours(true);
      setError("");

      await invoke("supprimer_medicament", {
        id: medicamentASupprimer.id,
      });

      setMedicamentASupprimer(null);
      await chargerMedicaments(true);
    } catch (err) {
      console.error("Erreur suppression médicament :", err);

      setError(
        err?.toString?.() ||
          "Impossible de supprimer ce médicament. Vérifiez s'il est utilisé dans l'historique."
      );
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const reinitialiserFiltres = () => {
    setSearch("");
    setFiltreStock("tous");
  };

  return (
    <div className="min-h-full bg-[#F4F6F5] px-3 py-4 sm:px-5 sm:py-5 xl:px-7">
      <div className="mx-auto max-w-[1500px]">

        {/* En-tête */}
        <header className="flex flex-col gap-4 rounded-[14px] border border-[#DDE3E0] bg-white p-4 shadow-[0_3px_14px_rgba(38,51,47,0.05)] sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px] border border-[#C9DCD4] bg-[#F1F6F4] text-[#356B5C]">
              <Pill className="h-[19px] w-[19px]" strokeWidth={1.8} />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#356B5C]">
                Pharmacie
              </p>
              <h1 className="mt-0.5 truncate text-[18px] font-bold tracking-tight text-[#394842]">
                Médicaments
              </h1>
              <p className="mt-0.5 text-[10px] font-medium text-[#87928E]">
                Gestion des médicaments et suivi des stocks
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#356B5C] px-4 text-[10px] font-bold text-white transition-colors hover:bg-[#2D5D50] active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
            Nouveau médicament
          </button>
        </header>

        {/* Erreur */}
        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start justify-between gap-3 rounded-[9px] border border-[#E7CFCF] bg-[#FBF5F5] px-3.5 py-3 text-[#A34A4A]"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="break-words text-[10px] font-semibold leading-5">
                {error}
              </p>
            </div>

            <button
              type="button"
              aria-label="Fermer le message d'erreur"
              onClick={() => setError("")}
              className="shrink-0 rounded-[6px] p-1 transition-colors hover:bg-[#F4E7E7]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Statistiques */}
        <section
          aria-label="Statistiques des stocks"
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <CarteStatistique
            titre="Références"
            valeur={statistiquesStock.tous}
            description="Médicaments enregistrés"
            icone={Pill}
            couleur="vert"
          />

          <CarteStatistique
            titre="Stock total"
            valeur={statistiquesStock.totalUnites.toLocaleString("fr-FR")}
            description="Unités actuellement en stock"
            icone={Boxes}
            couleur="bleu"
            onClick={() => navigate("/stock")}
          />

          <CarteStatistique
            titre="Stock faible"
            valeur={statistiquesStock.faible}
            description="Médicaments de 1 à 10 unités"
            icone={Activity}
            couleur="orange"
            onClick={() => setFiltreStock("faible")}
          />

          <CarteStatistique
            titre="Rupture"
            valeur={statistiquesStock.rupture}
            description="Médicaments sans stock disponible"
            icone={ShieldAlert}
            couleur="rouge"
            onClick={() => setFiltreStock("rupture")}
          />
        </section>

        
          {/* Alertes de stock : section repliable */}
          {medicamentsStockFaible.length > 0 && (
            <section className="mt-4 overflow-hidden rounded-[12px] border border-[#E3D9C7] bg-white shadow-[0_3px_12px_rgba(70,60,40,0.035)]">
              {/* En-tête cliquable */}
              <button
                type="button"
                onClick={() =>
                  setAlertesStockOuvertes((ouverte) => !ouverte)
                }
                aria-expanded={alertesStockOuvertes}
                aria-controls="liste-medicaments-a-surveiller"
                className="flex w-full items-center justify-between gap-3 bg-[#FAF7F1] px-4 py-3 text-left transition-colors hover:bg-[#F6F0E5] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A47B42]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-[#E5D9C7] bg-white text-[#A47B42]">
                    <AlertTriangle
                      className="h-3.5 w-3.5"
                      strokeWidth={2}
                    />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-[10px] font-bold text-[#695A43]">
                      Médicaments à surveiller
                    </h2>

                    <p className="mt-0.5 text-[9px] leading-4 text-[#8D7C62]">
                      Ruptures et stocks inférieurs ou égaux à 10 unités
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-[6px] border border-[#E5D9C7] bg-white px-2 text-[9px] font-bold tabular-nums text-[#A47B42]">
                    {medicamentsStockFaible.length}
                  </span>

                  <span
                    className={[
                      "flex h-7 w-7 items-center justify-center rounded-[7px]",
                      "text-[#A47B42] transition-transform duration-200",
                      alertesStockOuvertes ? "rotate-180" : "rotate-0",
                    ].join(" ")}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        d="m6 9 6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </button>

              {/* Contenu affiché uniquement lorsque la section est ouverte */}
              {alertesStockOuvertes && (
                <div id="liste-medicaments-a-surveiller">
                  <div className="divide-y divide-[#E8ECEA]">
                    {medicamentsStockFaible.slice(0, 5).map((medicament) => {
                      const stock = nombre(medicament.stock);
                      const rupture = stock === 0;

                      return (
                        <div
                          key={medicament.id}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-[#F8FAF9]"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className={[
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border",
                                rupture
                                  ? "border-[#E7CFCF] bg-[#FBF5F5] text-[#A34A4A]"
                                  : "border-[#E5D9C7] bg-[#FAF7F1] text-[#A47B42]",
                              ].join(" ")}
                            >
                              {rupture ? (
                                <ShieldAlert className="h-3.5 w-3.5" />
                              ) : (
                                <Package className="h-3.5 w-3.5" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p
                                title={medicament.nom}
                                className="truncate text-[10px] font-bold text-[#394842]"
                              >
                                {medicament.nom}
                              </p>

                              <p className="mt-0.5 text-[8px] text-[#87928E]">
                                Référence #{medicament.id}
                              </p>
                            </div>
                          </div>

                          <span
                            className={[
                              "shrink-0 rounded-[6px] border px-2 py-1 text-[8px] font-bold",
                              rupture
                                ? "border-[#E7CFCF] bg-[#FBF5F5] text-[#A34A4A]"
                                : "border-[#E5D9C7] bg-[#FAF7F1] text-[#A47B42]",
                            ].join(" ")}
                          >
                            {rupture
                              ? "Rupture"
                              : `${stock} unité${stock > 1 ? "s" : ""}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {medicamentsStockFaible.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setFiltreStock("faible")}
                      className="flex w-full items-center justify-center gap-2 border-t border-[#E9E2D4] px-4 py-2.5 text-[9px] font-bold text-[#A47B42] transition-colors hover:bg-[#FAF7F1]"
                    >
                      Voir les médicaments à stock faible
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </section>
          )}


        {/* Recherche et filtres */}
        <section className="mt-4 rounded-[12px] border border-[#DDE3E0] bg-white p-4 shadow-[0_3px_12px_rgba(38,51,47,0.04)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#D5E0DB] bg-[#F4F6F5] text-[#356B5C]">
              <Filter className="h-3.5 w-3.5" strokeWidth={1.9} />
            </div>

            <div>
              <h2 className="text-[10px] font-bold text-[#394842]">
                Recherche et filtres
              </h2>
              <p className="mt-0.5 text-[9px] text-[#87928E]">
                Retrouvez rapidement un médicament selon son état de stock
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2.5 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#87928E]" />

              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, identifiant, prix ou quantité..."
                aria-label="Rechercher un médicament"
                className="h-10 w-full rounded-[8px] border border-[#D6DEDA] bg-white pl-9 pr-9 text-[10px] font-medium text-[#394842] outline-none transition-colors placeholder:text-[#A8B2AE] hover:border-[#BFCBC6] focus:border-[#356B5C] focus:ring-2 focus:ring-[#DCE9E4]"
              />

              {search && (
                <button
                  type="button"
                  aria-label="Effacer la recherche"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-[5px] text-[#87928E] transition-colors hover:bg-[#F1F6F4] hover:text-[#356B5C]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => chargerMedicaments(true)}
              disabled={loading || actualisationEnCours}
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] border border-[#D6DEDA] bg-white px-4 text-[9px] font-bold text-[#68756F] transition-colors hover:border-[#BFCBC6] hover:bg-[#F1F6F4] hover:text-[#356B5C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={[
                  "h-3.5 w-3.5",
                  actualisationEnCours ? "animate-spin" : "",
                ].join(" ")}
              />
              {actualisationEnCours ? "Actualisation..." : "Actualiser"}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <BoutonFiltre
              actif={filtreStock === "tous"}
              onClick={() => setFiltreStock("tous")}
              titre="Tous"
              valeur={statistiquesStock.tous}
              icone={PackageCheck}
            />

            <BoutonFiltre
              actif={filtreStock === "rupture"}
              onClick={() => setFiltreStock("rupture")}
              titre="Rupture"
              valeur={statistiquesStock.rupture}
              icone={ShieldAlert}
              theme="rouge"
            />

            <BoutonFiltre
              actif={filtreStock === "faible"}
              onClick={() => setFiltreStock("faible")}
              titre="Stock faible"
              valeur={statistiquesStock.faible}
              icone={AlertTriangle}
              theme="orange"
            />

            <BoutonFiltre
              actif={filtreStock === "disponible"}
              onClick={() => setFiltreStock("disponible")}
              titre="Disponible"
              valeur={statistiquesStock.disponible}
              icone={CheckCircle2}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E8ECEA] pt-3">
            <p className="text-[9px] text-[#87928E]" aria-live="polite">
              <span className="font-bold text-[#394842]">
                {filteredMedicaments.length}
              </span>{" "}
              résultat{filteredMedicaments.length > 1 ? "s" : ""} affiché
              {filteredMedicaments.length > 1 ? "s" : ""}
            </p>

            {(search || filtreStock !== "tous") && (
              <button
                type="button"
                onClick={reinitialiserFiltres}
                className="text-[9px] font-bold text-[#356B5C] transition-colors hover:text-[#2D5D50] hover:underline"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </section>

        {/* Tableau */}
        <section className="mt-4">
          {loading ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[14px] border border-[#DDE3E0] bg-white shadow-[0_3px_12px_rgba(38,51,47,0.04)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-[9px] border border-[#D5E0DB] bg-[#F4F6F5]">
                <RefreshCw className="h-5 w-5 animate-spin text-[#356B5C]" />
              </div>
              <p className="mt-3 text-[10px] font-bold text-[#394842]">
                Chargement des médicaments...
              </p>
              <p className="mt-1 text-[9px] text-[#87928E]">
                Récupération des données
              </p>
            </div>
          ) : filteredMedicaments.length === 0 ? (
            <div className="flex min-h-[230px] flex-col items-center justify-center rounded-[14px] border border-[#DDE3E0] bg-white px-4 py-8 text-center shadow-[0_3px_12px_rgba(38,51,47,0.04)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-[9px] border border-[#D5E0DB] bg-[#F4F6F5] text-[#356B5C]">
                <Package className="h-5 w-5" />
              </div>

              <h2 className="mt-3 text-[11px] font-bold text-[#394842]">
                {medicaments.length === 0
                  ? "Aucun médicament enregistré"
                  : "Aucun résultat trouvé"}
              </h2>

              <p className="mt-1 max-w-sm text-[9px] leading-5 text-[#87928E]">
                {medicaments.length === 0
                  ? "Ajoutez votre premier médicament pour commencer à gérer le stock."
                  : "Essayez une autre recherche ou modifiez les filtres sélectionnés."}
              </p>

              {medicaments.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="mt-4 flex h-9 items-center gap-2 rounded-[8px] bg-[#356B5C] px-4 text-[9px] font-bold text-white transition-colors hover:bg-[#2D5D50]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un médicament
                </button>
              ) : (
                <button
                  type="button"
                  onClick={reinitialiserFiltres}
                  className="mt-4 rounded-[8px] border border-[#D6DEDA] px-4 py-2 text-[9px] font-bold text-[#356B5C] transition-colors hover:bg-[#F1F6F4]"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            <MedicamentTable
              medicaments={filteredMedicaments}
              onAddStock={(medicament) =>
                ouvrirFormulaireStock(medicament, "ajouter")
              }
              onEditStock={(medicament) =>
                ouvrirFormulaireStock(medicament, "modifier")
              }
              onRemoveStock={(medicament) =>
                ouvrirFormulaireStock(medicament, "retirer")
              }
              onDelete={handleDeleteMedicament}
            />
          )}
        </section>
      </div>

      {/* Nouveau médicament */}
      {showForm && (
        <MedicamentForm
          onClose={() => setShowForm(false)}
          onSuccess={async () => {
            setShowForm(false);
            await chargerMedicaments(true);
          }}
        />
      )}

      {/* Ajouter du stock */}
      {showStockForm && selectedMedicament && (
        <StockForm
          medicament={selectedMedicament}
          onClose={fermerFormulaireStock}
          onSuccess={async () => {
            fermerFormulaireStock();
            await chargerMedicaments(true);
          }}
        />
      )}

      {/* Modifier le stock */}
      {showEditStockForm && selectedMedicament && (
        <ModifierMedicamentForm
          medicament={selectedMedicament}
          onClose={fermerFormulaireStock}
          onSuccess={async () => {
            fermerFormulaireStock();
            await chargerMedicaments(true);
          }}
        />
      )}

      {/* Retirer du stock */}
      {showRemoveStockForm && selectedMedicament && (
        <RetirerStockForm
          medicament={selectedMedicament}
          onClose={fermerFormulaireStock}
          onSuccess={async () => {
            fermerFormulaireStock();
            await chargerMedicaments(true);
          }}
        />
      )}

      {/* Confirmation de suppression */}
      {medicamentASupprimer && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#26332F]/30 p-3 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !suppressionEnCours) {
              setMedicamentASupprimer(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-suppression-medicament"
            className="w-full max-w-[440px] overflow-hidden rounded-[14px] border border-[#DDE3E0] bg-white shadow-[0_18px_50px_rgba(38,51,47,0.14)] animate-[slideUp_180ms_ease-out]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#E8ECEA] bg-[#F4F6F5] px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border border-[#E7CFCF] bg-white text-[#A34A4A]">
                  <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
                </div>

                <div className="min-w-0">
                  <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#A34A4A]">
                    Confirmation
                  </p>
                  <h2
                    id="titre-suppression-medicament"
                    className="mt-0.5 text-[14px] font-bold text-[#394842]"
                  >
                    Supprimer le médicament
                  </h2>
                  <p className="mt-0.5 text-[9px] font-medium text-[#87928E]">
                    Vérifiez le médicament avant de continuer
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setMedicamentASupprimer(null)}
                disabled={suppressionEnCours}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-[#D6DEDA] bg-white text-[#68756F] transition-colors hover:bg-[#F1F6F4] hover:text-[#356B5C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              <div className="rounded-[9px] border border-[#E7CFCF] bg-[#FBF5F5] p-3.5">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#A34A4A]" />

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[#71383D]">
                      Attention
                    </p>
                    <p className="mt-1 text-[9px] leading-5 text-[#825C60]">
                      Vous allez demander la suppression de ce médicament.
                      Cette action peut être refusée s'il est utilisé dans
                      les entrées, les sorties ou la comptabilité.
                    </p>

                    <div className="mt-2.5 rounded-[8px] border border-[#E7CFCF] bg-white px-3 py-2.5">
                      <p
                        title={medicamentASupprimer.nom}
                        className="truncate text-[11px] font-bold text-[#394842]"
                      >
                        {medicamentASupprimer.nom}
                      </p>
                      <p className="mt-1 text-[8px] text-[#87928E]">
                        Référence #{medicamentASupprimer.id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[8px] border border-[#DDE3E0] bg-[#F4F6F5] px-3 py-2.5">
                <p className="text-[9px] leading-5 text-[#68756F]">
                  Pour préserver l'intégrité des données, ne supprimez pas
                  manuellement les historiques liés sans vérifier les règles
                  de votre base de données. Si le médicament est utilisé,
                  conservez-le et consultez ses opérations associées.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#E8ECEA] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
              <button
                type="button"
                onClick={() => setMedicamentASupprimer(null)}
                disabled={suppressionEnCours}
                className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#D6DEDA] bg-white px-4 text-[10px] font-bold text-[#68756F] transition-colors hover:bg-[#F1F6F4] hover:text-[#356B5C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Annuler
              </button>

              <button
                type="button"
                onClick={confirmerSuppression}
                disabled={suppressionEnCours}
                className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#A34A4A] px-4 text-[10px] font-bold text-white transition-colors hover:bg-[#963F3F] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#B8C5C0]"
              >
                {suppressionEnCours ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer définitivement
                  </>
                )}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(10px) scale(0.99);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
