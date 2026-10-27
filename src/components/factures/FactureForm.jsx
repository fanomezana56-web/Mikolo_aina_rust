
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Search,
  ChevronDown,
  X,
  UserRound,
  CalendarDays,
  ReceiptText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Check,
} from "lucide-react";

function formaterMontant(montant) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(montant) || 0);
}

function formaterDate(date) {
  if (!date) return "—";

  const resultat = new Date(date);

  if (Number.isNaN(resultat.getTime())) return "—";

  return resultat.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function nomPatient(comptabilite) {
  return (
    `${comptabilite?.patient_nom || ""} ${
      comptabilite?.patient_prenom || ""
    }`.trim() || "Patient inconnu"
  );
}

function calculerTotalMedicaments(comptabilite) {
  if (comptabilite?.total_medicaments != null) {
    return Number(comptabilite.total_medicaments) || 0;
  }

  return (comptabilite?.medicaments ?? []).reduce(
    (total, medicament) =>
      total +
      Number(
        medicament.prix_total ??
          Number(medicament.quantite || 0) *
            Number(medicament.prix_unitaire || 0)
      ),
    0
  );
}

function calculerTotalSoins(comptabilite) {
  if (comptabilite?.total_soins != null) {
    return Number(comptabilite.total_soins) || 0;
  }

  return (comptabilite?.soins_lignes ?? []).reduce(
    (total, soin) =>
      total +
      Number(
        soin.prix_total ??
          Number(soin.quantite || 0) *
            Number(soin.prix_unitaire || 0)
      ),
    0
  );
}

function calculerTotalGeneral(comptabilite) {
  if (!comptabilite) return 0;

  if (comptabilite.total_general != null) {
    return Number(comptabilite.total_general) || 0;
  }

  return (
    calculerTotalMedicaments(comptabilite) +
    calculerTotalSoins(comptabilite)
  );
}

export default function FactureForm({ onSuccess }) {
  const [comptabilites, setComptabilites] = useState([]);
  const [comptabiliteId, setComptabiliteId] = useState("");
  const [chargement, setChargement] = useState(false);
  const [chargementComptabilites, setChargementComptabilites] =
    useState(true);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [selectOuvert, setSelectOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    let actif = true;

    async function chargerComptabilites() {
      try {
        setChargementComptabilites(true);
        setErreur("");

        const resultat = await invoke("obtenir_comptabilites");

        if (actif) {
          setComptabilites(Array.isArray(resultat) ? resultat : []);
        }
      } catch (error) {
        console.error(error);

        if (actif) {
          setErreur(
            typeof error === "string"
              ? error
              : "Impossible de charger les comptabilités."
          );
        }
      } finally {
        if (actif) {
          setChargementComptabilites(false);
        }
      }
    }

    chargerComptabilites();

    return () => {
      actif = false;
    };
  }, []);

  const comptabiliteSelectionnee = useMemo(
    () =>
      comptabilites.find(
        (comptabilite) =>
          String(comptabilite.id) === String(comptabiliteId)
      ),
    [comptabilites, comptabiliteId]
  );

  const montantTotal = calculerTotalGeneral(comptabiliteSelectionnee);

  const comptabilitesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLocaleLowerCase("fr");

    if (!terme) return comptabilites;

    return comptabilites.filter((comptabilite) => {
      const texte = [
        nomPatient(comptabilite),
        comptabilite.id,
        formaterDate(comptabilite.date_comptabilite),
      ]
        .join(" ")
        .toLocaleLowerCase("fr");

      return texte.includes(terme);
    });
  }, [comptabilites, recherche]);

  function selectionnerComptabilite(id) {
    setComptabiliteId(id);
    setSelectOuvert(false);
    setRecherche("");
    setMessage("");
    setErreur("");
  }

  function deselectionnerComptabilite() {
    setComptabiliteId("");
    setMessage("");
    setErreur("");
  }

  async function enregistrerFacture(e) {
    e.preventDefault();
    setMessage("");
    setErreur("");

    if (!comptabiliteId) {
      setErreur("Veuillez sélectionner une comptabilité.");
      return;
    }

    try {
      setChargement(true);

      const resultat = await invoke("enregistrer_facture", {
        data: {
          comptabilite_id: comptabiliteId,
        },
      });

      setMessage(
        `Facture ${resultat.numero} créée avec succès.`
      );

      setComptabiliteId("");
      setSelectOuvert(false);
      setRecherche("");

      if (onSuccess) onSuccess(resultat);
    } catch (error) {
      console.error(error);

      setErreur(
        typeof error === "string"
          ? error
          : "Impossible d'enregistrer la facture."
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      <form onSubmit={enregistrerFacture}>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">

          {/* SÉLECTION DE LA COMPTABILITÉ */}
          <div className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                setSelectOuvert((ouvert) => !ouvert);
                setRecherche("");
                setErreur("");
              }}
              disabled={chargementComptabilites || chargement}
              aria-expanded={selectOuvert}
              className="flex h-11 w-full min-w-0 items-center gap-2.5 rounded-lg bg-[#F5F8F6] px-3 text-left transition hover:bg-[#EDF4EF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#438B74] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserRound
                size={17}
                className="shrink-0 text-[#438B74]"
              />

              <div className="min-w-0 flex-1">
                {chargementComptabilites ? (
                  <span className="text-sm text-[#748078]">
                    Chargement des comptabilités...
                  </span>
                ) : comptabiliteSelectionnee ? (
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="truncate text-sm font-semibold text-[#30463D]">
                      {nomPatient(comptabiliteSelectionnee)}
                    </span>
                    <span className="shrink-0 text-xs text-[#7B8981]">
                      {formaterDate(
                        comptabiliteSelectionnee.date_comptabilite
                      )}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-[#356B5C]">
                      {formaterMontant(montantTotal)} Ar
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-[#68756F]">
                    Sélectionner la comptabilité à facturer
                  </span>
                )}
              </div>

              {comptabiliteSelectionnee ? (
                <Check
                  size={16}
                  className="shrink-0 text-[#438B74]"
                />
              ) : (
                <ChevronDown
                  size={17}
                  className={`shrink-0 text-[#748078] transition-transform ${
                    selectOuvert ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>

            {/* MENU DE SÉLECTION */}
            {selectOuvert && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-lg bg-white shadow-[0_8px_24px_rgba(38,51,47,0.12)] ring-1 ring-[#E4EBE6]">
                <div className="p-2">
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87928E]"
                    />

                    <input
                      type="text"
                      value={recherche}
                      onChange={(e) => setRecherche(e.target.value)}
                      placeholder="Rechercher un patient ou un dossier..."
                      autoComplete="off"
                      autoFocus
                      className="h-9 w-full rounded-md bg-[#F6F8F6] pl-9 pr-3 text-sm text-[#30463D] outline-none placeholder:text-[#87928E] focus:ring-1 focus:ring-[#438B74]"
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  {comptabilitesFiltrees.length === 0 ? (
                    <p className="px-3 py-5 text-center text-xs text-[#748078]">
                      {chargementComptabilites
                        ? "Chargement..."
                        : "Aucune comptabilité trouvée."}
                    </p>
                  ) : (
                    comptabilitesFiltrees.map((comptabilite) => {
                      const selectionnee =
                        String(comptabilite.id) ===
                        String(comptabiliteId);

                      return (
                        <button
                          key={comptabilite.id}
                          type="button"
                          onClick={() =>
                            selectionnerComptabilite(comptabilite.id)
                          }
                          className={`flex w-full min-w-0 items-center gap-2.5 px-3 py-2.5 text-left transition ${
                            selectionnee
                              ? "bg-[#EDF5F0]"
                              : "hover:bg-[#F6F9F7]"
                          }`}
                        >
                          <UserRound
                            size={16}
                            className="shrink-0 text-[#438B74]"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#30463D]">
                              {nomPatient(comptabilite)}
                            </p>

                            <p className="mt-0.5 text-xs text-[#7B8981]">
                              {formaterDate(
                                comptabilite.date_comptabilite
                              )}
                            </p>
                          </div>

                          <span className="shrink-0 text-xs font-semibold text-[#356B5C]">
                            {formaterMontant(
                              calculerTotalGeneral(comptabilite)
                            )}{" "}
                            Ar
                          </span>

                          {selectionnee && (
                            <Check
                              size={15}
                              className="shrink-0 text-[#438B74]"
                            />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-between bg-[#F7F9F7] px-3 py-2">
                  <span className="text-xs text-[#748078]">
                    {comptabilitesFiltrees.length} dossier(s)
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectOuvert(false);
                      setRecherche("");
                    }}
                    className="text-xs font-medium text-[#438B74] hover:text-[#28594B]"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DÉSÉLECTION */}
          {comptabiliteSelectionnee && (
            <button
              type="button"
              onClick={deselectionnerComptabilite}
              disabled={chargement}
              title="Désélectionner la comptabilité"
              aria-label="Désélectionner la comptabilité"
              className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-lg text-[#7B8981] transition hover:bg-[#FBEFEE] hover:text-[#B84D4D] disabled:opacity-50 sm:self-auto"
            >
              <X size={17} />
            </button>
          )}

          {/* CRÉATION DE LA FACTURE */}
          <button
            type="submit"
            disabled={
              chargement ||
              chargementComptabilites ||
              !comptabiliteId
            }
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#356B5C] px-4 text-sm font-semibold text-white transition hover:bg-[#28594B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#438B74] disabled:cursor-not-allowed disabled:bg-[#B8C5C0] sm:px-5"
          >
            {chargement ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Save size={16} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* MESSAGES */}
      {message && (
        <div
          role="status"
          className="flex items-center gap-2 text-xs font-medium text-[#356B5C]"
        >
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {erreur && (
        <div
          role="alert"
          className="flex items-center gap-2 text-xs text-[#B84D4D]"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{erreur}</span>
        </div>
      )}

      {!chargementComptabilites &&
        comptabilites.length === 0 &&
        !erreur && (
          <p className="text-xs text-[#748078]">
            Aucune comptabilité disponible pour le moment.
          </p>
        )}
    </div>
  );
}
