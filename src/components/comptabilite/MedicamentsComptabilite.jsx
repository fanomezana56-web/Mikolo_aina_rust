import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Search,
  Pill,
  Package,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  AlertCircle,
  PackageOpen,
} from "lucide-react";

function formaterMontant(montant) {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(montant) || 0)} Ar`;
}

export default function MedicamentsComptabilite({
  lignesMedicaments = [],
  setLignesMedicaments,
}) {
  const [medicaments, setMedicaments] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState("");

  const [selecteurOuvert, setSelecteurOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");

  const selecteurRef = useRef(null);

  // ---------------------------------------------------------
  // CHARGEMENT DES MÉDICAMENTS
  // ---------------------------------------------------------

  useEffect(() => {
    chargerMedicaments();
  }, []);

  const chargerMedicaments = async () => {
    try {
      setChargement(true);
      setErreurChargement("");

      const resultat = await invoke("obtenir_medicaments");

      setMedicaments(Array.isArray(resultat) ? resultat : []);
    } catch (error) {
      console.error(error);

      setErreurChargement(
        "Impossible de récupérer les médicaments."
      );
    } finally {
      setChargement(false);
    }
  };

  // ---------------------------------------------------------
  // MÉDICAMENTS DÉJÀ SÉLECTIONNÉS
  // ---------------------------------------------------------

  const medicamentsSelectionnesIds = useMemo(() => {
    return new Set(
      lignesMedicaments.map((ligne) =>
        String(ligne.medicament_id)
      )
    );
  }, [lignesMedicaments]);

  // ---------------------------------------------------------
  // RECHERCHE
  // ---------------------------------------------------------

  const medicamentsFiltres = useMemo(() => {
    const texte = recherche.trim().toLowerCase();

    if (!texte) {
      return medicaments;
    }

    return medicaments.filter((medicament) =>
      String(medicament.nom || "")
        .toLowerCase()
        .includes(texte)
    );
  }, [medicaments, recherche]);

  // ---------------------------------------------------------
  // STOCK
  // ---------------------------------------------------------

  const obtenirStock = (medicament) => {
    return Number(
      medicament.stock ??
        medicament.quantite_stock ??
        medicament.quantite ??
        0
    );
  };

  // ---------------------------------------------------------
  // PRIX
  // ---------------------------------------------------------

  const obtenirPrix = (medicament) => {
    return Number(
      medicament.prix_unitaire ??
        medicament.prix ??
        medicament.prixUnitaire ??
        0
    );
  };

  // ---------------------------------------------------------
  // SÉLECTION
  // ---------------------------------------------------------

  const selectionnerMedicament = (medicament) => {
    const stock = obtenirStock(medicament);

    if (stock <= 0) {
      return;
    }

    const dejaSelectionne =
      medicamentsSelectionnesIds.has(
        String(medicament.id)
      );

    if (dejaSelectionne) {
      return;
    }

    const prix = obtenirPrix(medicament);

    const nouvelleLigne = {
      medicament_id: medicament.id,
      nom: medicament.nom,
      quantite: 1,
      prix_unitaire: prix,
      prix_total: prix,
      stock_disponible: stock,
    };

    setLignesMedicaments?.([
      ...lignesMedicaments,
      nouvelleLigne,
    ]);

    setRecherche("");
    setSelecteurOuvert(false);
  };

  // ---------------------------------------------------------
  // QUANTITÉ
  // ---------------------------------------------------------

  const modifierQuantite = (
    medicamentId,
    nouvelleQuantite
  ) => {
    let quantite = Number(nouvelleQuantite);

    if (!Number.isFinite(quantite)) {
      quantite = 1;
    }

    quantite = Math.floor(quantite);

    if (quantite < 1) {
      quantite = 1;
    }

    setLignesMedicaments?.(
      lignesMedicaments.map((ligne) => {
        if (
          String(ligne.medicament_id) !==
          String(medicamentId)
        ) {
          return ligne;
        }

        const stock =
          Number(ligne.stock_disponible) || 0;

        if (stock > 0 && quantite > stock) {
          quantite = stock;
        }

        return {
          ...ligne,
          quantite,
          prix_total:
            quantite *
            Number(ligne.prix_unitaire || 0),
        };
      })
    );
  };

  // ---------------------------------------------------------
  // RETIRER
  // ---------------------------------------------------------

  const retirerMedicament = (medicamentId) => {
    setLignesMedicaments?.(
      lignesMedicaments.filter(
        (ligne) =>
          String(ligne.medicament_id) !==
          String(medicamentId)
      )
    );
  };

  // ---------------------------------------------------------
  // CLIC EXTÉRIEUR
  // ---------------------------------------------------------

  useEffect(() => {
    const gererClicExterieur = (event) => {
      if (!selecteurOuvert) {
        return;
      }

      if (
        selecteurRef.current &&
        !selecteurRef.current.contains(event.target)
      ) {
        setSelecteurOuvert(false);
      }
    };

    document.addEventListener(
      "mousedown",
      gererClicExterieur
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        gererClicExterieur
      );
    };
  }, [selecteurOuvert]);

  // ---------------------------------------------------------
  // TOTAUX
  // ---------------------------------------------------------

  const nombreMedicaments =
    lignesMedicaments.length;

  const quantiteTotale =
    lignesMedicaments.reduce(
      (total, ligne) =>
        total + Number(ligne.quantite || 0),
      0
    );

  const montantTotal =
    lignesMedicaments.reduce(
      (total, ligne) =>
        total +
        Number(ligne.prix_unitaire || 0) *
          Number(ligne.quantite || 0),
      0
    );

  // ---------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------

  return (
    <section >

        {/* ERREUR */}

        {erreurChargement && (
          <div className="mb-2.5 flex items-center gap-2 rounded-[7px] border border-[#F0D7D7] bg-[#FFF8F8] px-2.5 py-2">
            <AlertCircle
              size={14}
              className="shrink-0 text-[#B85B5B]"
            />

            <span className="text-[10px] text-[#965050]">
              {erreurChargement}
            </span>
          </div>
        )}

        {/* CHARGEMENT */}

        {chargement ? (
          <div className="flex items-center justify-center py-5">
            <div className="flex items-center gap-2 text-[10px] text-[#7C8983]">
              <Loader2
                size={15}
                className="animate-spin text-[#356B5C]"
              />

              Chargement...
            </div>
          </div>
        ) : medicaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">

            <PackageOpen
              size={24}
              strokeWidth={1.6}
              className="text-[#9AA7A1]"
            />

            <p className="mt-1.5 text-[11px] font-medium text-[#65736D]">
              Aucun médicament disponible
            </p>

            <p className="mt-0.5 text-[9px] text-[#929D98]">
              Aucun médicament n'est disponible dans le stock.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">

            {/* =========================================== */}
            {/* MÉDICAMENTS SÉLECTIONNÉS */}
            {/* =========================================== */}

            {lignesMedicaments.length > 0 && (
              <div className="space-y-1.5">

                {lignesMedicaments.map((ligne) => {
                  const prixTotal =
                    Number(ligne.prix_unitaire || 0) *
                    Number(ligne.quantite || 0);

                  return (
                    <div
                      key={String(
                        ligne.medicament_id
                      )}
                      className="rounded-[8px] border border-[#CFE0D9] bg-[#F1F7F4] px-2.5 py-2"
                    >
                      <div className="flex items-center gap-2">

                        {/* ICÔNE */}

                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-white text-[#356B5C]">
                          <Check
                            size={14}
                            strokeWidth={2.4}
                          />
                        </div>

                        {/* NOM + INFOS */}

                        <div className="min-w-0 flex-1">

                          <div className="flex items-center gap-1.5">

                            <p className="truncate text-[11px] font-semibold text-[#2D3E37]">
                              {ligne.nom}
                            </p>

                            <span className="hidden shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[8px] font-medium text-[#5D7A6E] sm:inline">
                              Sélectionné
                            </span>
                          </div>

                          <div className="mt-0.5 flex items-center gap-2 text-[9px] text-[#788780]">

                            <span>
                              {formaterMontant(
                                ligne.prix_unitaire
                              )}
                            </span>

                            <span className="text-[#B9C5C0]">
                              •
                            </span>

                            <span>
                              Stock :{" "}
                              {ligne.stock_disponible}
                            </span>
                          </div>
                        </div>

                        {/* QUANTITÉ */}

                        <div className="flex h-7 items-center overflow-hidden rounded-[6px] border border-[#D2DFD9] bg-white">

                          <input
                            type="number"
                            min="1"
                            max={ligne.stock_disponible}
                            value={ligne.quantite}
                            onChange={(e) =>
                              modifierQuantite(
                                ligne.medicament_id,
                                e.target.value
                              )
                            }
                            className="h-full w-[42px] border-0 bg-transparent px-1 text-center text-[10px] font-semibold text-[#33463D] outline-none focus:ring-0"
                          />

                        </div>

                        {/* TOTAL */}

                        <div className="hidden min-w-[72px] text-right sm:block">
                          <span className="block text-[8px] text-[#89958F]">
                            Total
                          </span>

                          <span className="text-[10px] font-bold text-[#356B5C]">
                            {formaterMontant(
                              prixTotal
                            )}
                          </span>
                        </div>

                        {/* SUPPRIMER */}

                        <button
                          type="button"
                          onClick={() =>
                            retirerMedicament(
                              ligne.medicament_id
                            )
                          }
                          title="Retirer"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[#9B6666] transition hover:bg-white hover:text-[#8E4141]"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* =========================================== */}
            {/* SÉLECTEUR */}
            {/* =========================================== */}

            <div
              ref={selecteurRef}
              className="relative"
            >

              {/* BOUTON */}

              <button
                type="button"
                onClick={() => {
                  setSelecteurOuvert(
                    !selecteurOuvert
                  );

                  if (!selecteurOuvert) {
                    setRecherche("");
                  }
                }}
                className={`flex h-[46px] w-full items-center gap-2.5 rounded-[8px] border bg-white px-2.5 text-left transition ${
                  selecteurOuvert
                    ? "border-[#356B5C] ring-2 ring-[#E0ECE7]"
                    : "border-[#D7E0DC] hover:border-[#B7C9C1]"
                }`}
              >

                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] ${
                    selecteurOuvert
                      ? "bg-[#356B5C] text-white"
                      : "bg-[#F0F5F2] text-[#356B5C]"
                  }`}
                >
                  <Pill size={14} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-[#3B4C45]">
                    Ajouter un médicament
                  </p>

                  <p className="truncate text-[9px] text-[#929D98]">
                    Rechercher dans le stock
                  </p>
                </div>

                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F2F5F3] text-[#687770]">
                  {selecteurOuvert ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </div>
              </button>

              {/* ======================================== */}
              {/* MENU */}
              {/* ======================================== */}

              {selecteurOuvert && (
                <div className="absolute left-0 right-0 top-[calc(100%+5px)] z-50 overflow-hidden rounded-[8px] border border-[#D5DFDA] bg-white shadow-[0_10px_28px_rgba(38,59,51,0.12)]">

                  {/* RECHERCHE */}

                  <div className="border-b border-[#E7ECEA] bg-[#FAFBFB] p-2">

                    <div className="relative">

                      <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#89958F]"
                      />

                      <input
                        type="text"
                        autoFocus
                        value={recherche}
                        onChange={(e) =>
                          setRecherche(
                            e.target.value
                          )
                        }
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                        placeholder="Rechercher un médicament..."
                        className="h-8 w-full rounded-[6px] border border-[#D8E1DD] bg-white pl-8 pr-2 text-[10px] text-[#34463E] outline-none placeholder:text-[#A0AAA6] focus:border-[#356B5C] focus:ring-1 focus:ring-[#DCE9E4]"
                      />

                    </div>
                  </div>

                  {/* LISTE */}

                  <div className="max-h-[250px] overflow-y-auto p-1.5">

                    {medicamentsFiltres.length ===
                    0 ? (
                      <div className="py-6 text-center">

                        <Search
                          size={20}
                          className="mx-auto text-[#A2ADA8]"
                          strokeWidth={1.6}
                        />

                        <p className="mt-1.5 text-[10px] font-medium text-[#697771]">
                          Aucun résultat
                        </p>

                      </div>
                    ) : (
                      medicamentsFiltres.map(
                        (medicament) => {
                          const stock =
                            obtenirStock(
                              medicament
                            );

                          const prix =
                            obtenirPrix(
                              medicament
                            );

                          const dejaSelectionne =
                            medicamentsSelectionnesIds.has(
                              String(
                                medicament.id
                              )
                            );

                          const disponible =
                            stock > 0;

                          return (
                            <button
                              key={
                                medicament.id
                              }
                              type="button"
                              disabled={
                                !disponible ||
                                dejaSelectionne
                              }
                              onClick={() =>
                                selectionnerMedicament(
                                  medicament
                                )
                              }
                              className={`flex w-full items-center gap-2 rounded-[6px] px-2 py-2 text-left transition ${
                                !disponible ||
                                dejaSelectionne
                                  ? "cursor-not-allowed opacity-50"
                                  : "hover:bg-[#F2F7F4]"
                              }`}
                            >

                              {/* ICÔNE */}

                              <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] ${
                                  disponible &&
                                  !dejaSelectionne
                                    ? "bg-[#EAF3EF] text-[#356B5C]"
                                    : "bg-[#F0F2F1] text-[#8B9691]"
                                }`}
                              >
                                {dejaSelectionne ? (
                                  <Check
                                    size={13}
                                  />
                                ) : (
                                  <Pill
                                    size={13}
                                  />
                                )}
                              </div>

                              {/* INFORMATIONS */}

                              <div className="min-w-0 flex-1">

                                <p className="truncate text-[10px] font-semibold text-[#35463F]">
                                  {
                                    medicament.nom
                                  }
                                </p>

                                <div className="mt-0.5 flex items-center gap-2">

                                  <span className="text-[8px] text-[#7D8983]">
                                    {formaterMontant(
                                      prix
                                    )}
                                  </span>

                                  <span className="text-[#C3CCC8]">
                                    •
                                  </span>

                                  <span
                                    className={`text-[8px] font-medium ${
                                      disponible
                                        ? "text-[#5B7C6E]"
                                        : "text-[#A45E5E]"
                                    }`}
                                  >
                                    {disponible
                                      ? `Stock : ${stock}`
                                      : "Rupture"}
                                  </span>

                                </div>
                              </div>

                              {/* ÉTAT */}

                              {dejaSelectionne ? (
                                <span className="shrink-0 rounded-full bg-[#EEF1EF] px-1.5 py-0.5 text-[7px] font-medium text-[#7B8781]">
                                  Déjà ajouté
                                </span>
                              ) : disponible ? (
                                <Package
                                  size={13}
                                  className="shrink-0 text-[#789287]"
                                />
                              ) : null}

                            </button>
                          );
                        }
                      )
                    )}

                  </div>
                </div>
              )}
            </div>

            {/* =========================================== */}
            {/* RÉSUMÉ COMPACT */}
            {/* =========================================== */}

            {lignesMedicaments.length > 0 && (
              <div className="flex items-center justify-between rounded-[7px] bg-[#F7F9F8] px-2.5 py-2">

                <div className="flex items-center gap-2">

                  <span className="text-[9px] text-[#7C8983]">
                    {quantiteTotale} unité
                    {quantiteTotale > 1
                      ? "s"
                      : ""}
                  </span>

                  <span className="text-[#C4CCC8]">
                    •
                  </span>

                  <span className="text-[9px] text-[#7C8983]">
                    {nombreMedicaments} médicament
                    {nombreMedicaments > 1
                      ? "s"
                      : ""}
                  </span>

                </div>

                <span className="text-[11px] font-bold text-[#356B5C]">
                  {formaterMontant(
                    montantTotal
                  )}
                </span>

              </div>
            )}

          </div>
        )}

        {/* PETITE NOTE */}

        {!chargement &&
          medicaments.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">

              <AlertCircle
                size={11}
                className="shrink-0 text-[#98A39E]"
              />

              <p className="text-[8px] text-[#8B9691]">
                La suppression retire uniquement le médicament
                de cette comptabilité.
              </p>

            </div>
          )}

    </section>
  );
}