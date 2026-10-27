import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Search,
  Stethoscope,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

function formaterMontant(montant) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(montant || 0));
}

export default function SoinsComptabilite({
  lignesSoins = [],
  setLignesSoins,
}) {
  const [soins, setSoins] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState("");

  const [selecteurOuvert, setSelecteurOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");

  const selecteurRef = useRef(null);

  const lignes = Array.isArray(lignesSoins)
    ? lignesSoins
    : [];

  // ============================================================
  // CHARGER LES SOINS
  // ============================================================

  async function chargerSoins() {
    try {
      setChargement(true);
      setErreurChargement("");

      const resultat = await invoke("obtenir_soins_actifs");

      if (Array.isArray(resultat)) {
        setSoins(resultat);
      } else {
        setSoins([]);
        setErreurChargement(
          "Le serveur a retourné une liste de soins invalide."
        );
      }
    } catch (error) {
      console.error("Erreur chargement soins :", error);

      setErreurChargement(
        typeof error === "string"
          ? error
          : error?.message ||
              "Impossible de charger les soins."
      );

      setSoins([]);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerSoins();
  }, []);

  // ============================================================
  // FERMER LE SELECTEUR EN DEHORS
  // ============================================================

  useEffect(() => {
    function gererClicExterieur(event) {
      if (
        selecteurRef.current &&
        !selecteurRef.current.contains(event.target)
      ) {
        setSelecteurOuvert(false);
      }
    }

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
  }, []);

  // ============================================================
  // IDS DÉJÀ SÉLECTIONNÉS
  // ============================================================

  const idsSelectionnes = useMemo(() => {
    return new Set(
      lignes.map((ligne) =>
        String(ligne.soin_id)
      )
    );
  }, [lignes]);

  // ============================================================
  // RECHERCHE
  // ============================================================

  const soinsFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    if (!terme) {
      return soins;
    }

    return soins.filter((soin) =>
      String(soin.nom || "")
        .toLowerCase()
        .includes(terme)
    );
  }, [soins, recherche]);

  // ============================================================
  // SÉLECTIONNER UN SOIN
  // ============================================================

  function selectionnerSoin(soin) {
    if (!soin || !setLignesSoins) {
      return;
    }

    // Empêcher les doublons
    if (idsSelectionnes.has(String(soin.id))) {
      return;
    }

    const prix = Number(soin.prix || 0);

    const nouvelleLigne = {
      soin_id: soin.id,
      nom: soin.nom,
      prix_unitaire: prix,
      prix_total: prix,
    };

    setLignesSoins([
      ...lignes,
      nouvelleLigne,
    ]);

    // Réinitialiser le sélecteur
    setRecherche("");
    setSelecteurOuvert(false);
    setErreurChargement("");
  }

  // ============================================================
  // SUPPRIMER UN SOIN
  // ============================================================

  function supprimerSoin(index) {
    const nouvellesLignes = lignes.filter(
      (_, i) => i !== index
    );

    setLignesSoins(nouvellesLignes);
  }

  // ============================================================
  // TOTAL
  // ============================================================

  const totalSoins = useMemo(() => {
    return lignes.reduce(
      (total, ligne) =>
        total + Number(ligne.prix_total || 0),
      0
    );
  }, [lignes]);

  // ============================================================
  // AFFICHAGE
  // ============================================================

  return (
    <div className="space-y-3.5">

      {/* ======================================================
          ERREUR
      ====================================================== */}

      {erreurChargement && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">

          <div className="flex min-w-0 items-center gap-2 text-xs text-red-700">
            <AlertCircle
              size={15}
              className="shrink-0"
            />

            <span className="truncate">
              {erreurChargement}
            </span>
          </div>

          <button
            type="button"
            onClick={chargerSoins}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100"
          >
            <RefreshCw size={13} />
            Réessayer
          </button>

        </div>
      )}

      {/* ======================================================
          ZONE DE SÉLECTION
      ====================================================== */}



        

        {/* ==================================================
            SÉLECTEUR
        ================================================== */}

        <div
          ref={selecteurRef}
          className="relative"
        >

          <button
            type="button"
            onClick={() => {
              if (!chargement) {
                setSelecteurOuvert(
                  !selecteurOuvert
                );
              }
            }}
            disabled={chargement}
            className="
              flex
              h-[46px]
              w-full
              items-center
              justify-between
              rounded-lg
              border
              border-[#D8E0DC]
              bg-[#FAFCFB]
              px-3
              text-left
              transition
              hover:border-[#C5D4CD]
              hover:bg-white
              focus:outline-none
              focus:ring-2
              focus:ring-[#356B5C]/10
              disabled:cursor-not-allowed
              disabled:bg-gray-100
            "
          >

            <div className="flex min-w-0 items-center gap-2.5">

              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-[#356B5C] shadow-sm">
                {chargement ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <Stethoscope size={14} />
                )}
              </div>

              <div className="min-w-0">

                <p className="truncate text-xs font-medium text-[#4A5751]">
                  {chargement
                    ? "Chargement des soins..."
                    : soins.length === 0
                    ? "Aucun soin disponible"
                    : "Ajouter un soin"}
                </p>

                {!chargement &&
                  soins.length > 0 && (
                    <p className="truncate text-[10px] text-[#9AA49F]">
                      Rechercher dans les soins disponibles
                    </p>
                  )}

              </div>

            </div>

            {!chargement &&
              soins.length > 0 && (
                <div className="ml-2 shrink-0 text-[#7C8983]">

                  {selecteurOuvert ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}

                </div>
              )}

          </button>

          {/* ==================================================
              MENU
          ================================================== */}

          {selecteurOuvert &&
            !chargement &&
            soins.length > 0 && (
              <div className="absolute left-0 right-0 top-[51px] z-30 overflow-hidden rounded-lg border border-[#DDE4E0] bg-white shadow-lg shadow-black/5">

                {/* RECHERCHE */}

                <div className="border-b border-[#EDF0EE] bg-[#FAFCFB] p-2">

                  <div className="relative">

                    <Search
                      size={14}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#89958F]"
                    />

                    <input
                      type="text"
                      value={recherche}
                      onChange={(e) =>
                        setRecherche(e.target.value)
                      }
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                      autoFocus
                      placeholder="Rechercher un soin..."
                      className="
                        h-8
                        w-full
                        rounded-md
                        border
                        border-[#DDE4E0]
                        bg-white
                        pl-8
                        pr-3
                        text-xs
                        text-[#46524D]
                        outline-none
                        placeholder:text-[#A3ACA8]
                        focus:border-[#356B5C]
                        focus:ring-1
                        focus:ring-[#356B5C]/10
                      "
                    />

                  </div>

                </div>

                {/* LISTE */}

                <div className="max-h-[250px] overflow-y-auto p-1.5">

                  {soinsFiltres.length === 0 ? (

                    <div className="px-3 py-7 text-center">

                      <Search
                        size={20}
                        className="mx-auto mb-2 text-[#B1BBB6]"
                      />

                      <p className="text-xs font-medium text-[#69756F]">
                        Aucun soin trouvé
                      </p>

                      <p className="mt-1 text-[10px] text-[#9CA6A1]">
                        Essayez un autre terme.
                      </p>

                    </div>

                  ) : (

                    soinsFiltres.map((soin) => {

                      const dejaSelectionne =
                        idsSelectionnes.has(
                          String(soin.id)
                        );

                      return (
                        <button
                          key={soin.id}
                          type="button"
                          disabled={dejaSelectionne}
                          onClick={() =>
                            selectionnerSoin(soin)
                          }
                          className="
                            group
                            flex
                            w-full
                            items-center
                            justify-between
                            gap-3
                            rounded-md
                            px-2.5
                            py-2
                            text-left
                            transition
                            hover:bg-[#F3F7F5]
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >

                          <div className="flex min-w-0 items-center gap-2.5">

                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#EAF3EF] text-[#356B5C]">
                              {dejaSelectionne ? (
                                <Check size={14} />
                              ) : (
                                <Stethoscope size={14} />
                              )}
                            </div>

                            <div className="min-w-0">

                              <p className="truncate text-xs font-medium text-[#46524D]">
                                {soin.nom}
                              </p>

                              <p className="mt-0.5 text-[10px] text-[#8E9994]">
                                {formaterMontant(
                                  soin.prix
                                )}{" "}
                                Ar
                              </p>

                            </div>

                          </div>

                          {dejaSelectionne ? (

                            <span className="shrink-0 rounded-md bg-[#EAF3EF] px-1.5 py-1 text-[9px] font-semibold text-[#356B5C]">
                              Ajouté
                            </span>

                          ) : (

                            <span className="shrink-0 text-[10px] font-medium text-[#356B5C] opacity-0 transition group-hover:opacity-100">
                              Sélectionner
                            </span>

                          )}

                        </button>
                      );
                    })

                  )}

                </div>

              </div>
            )}

        

      </div>

      {/* ======================================================
          SOINS SÉLECTIONNÉS
      ====================================================== */}

      {lignes.length > 0 && (

        <div className="rounded-lg border border-[#DDE4E0] bg-white">

          <div className="flex items-center justify-between border-b border-[#E9EDEA] bg-[#FAFCFB] px-3 py-2.5">

            <div className="flex items-center gap-2">

              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#EAF3EF] text-[#356B5C]">
                <Check size={13} />
              </div>

              <span className="text-xs font-semibold text-[#46524D]">
                Soins sélectionnés
              </span>

            </div>

            <span className="text-[10px] font-medium text-[#8C9792]">
              {lignes.length} soin
              {lignes.length > 1 ? "s" : ""}
            </span>

          </div>

          <div className="divide-y divide-[#EEF1EF]">

            {lignes.map((ligne, index) => (

              <div
                key={`${ligne.soin_id}-${index}`}
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  px-3
                  py-2.5
                  transition
                  hover:bg-[#FAFCFB]
                "
              >

                <div className="flex min-w-0 items-center gap-2.5">

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#EAF3EF] text-[#356B5C]">
                    <Stethoscope size={14} />
                  </div>

                  <div className="min-w-0">

                    <p className="truncate text-xs font-semibold text-[#3F4B46]">
                      {ligne.nom}
                    </p>

                    <p className="mt-0.5 text-[10px] text-[#929D98]">
                      Soin sélectionné
                    </p>

                  </div>

                </div>

                <div className="flex shrink-0 items-center gap-2">

                  <span className="text-xs font-bold text-[#356B5C]">
                    {formaterMontant(
                      ligne.prix_unitaire
                    )}{" "}
                    Ar
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      supprimerSoin(index)
                    }
                    title="Retirer ce soin"
                    className="
                      flex
                      h-7
                      w-7
                      items-center
                      justify-center
                      rounded-md
                      text-[#A17A7A]
                      transition
                      hover:bg-red-50
                      hover:text-red-600
                    "
                  >
                    <X size={14} />
                  </button>

                </div>

              </div>

            ))}

          </div>

          {/* ==================================================
              TOTAL
          ================================================== */}

          <div className="flex items-center justify-between border-t border-[#E7EBE9] bg-[#F7F9F8] px-3 py-2.5">

            <div>

              <p className="text-[10px] text-[#8B9691]">
                Total des soins
              </p>

              <p className="text-xs font-medium text-[#596660]">
                {lignes.length} prestation
                {lignes.length > 1 ? "s" : ""}
              </p>

            </div>

            <span className="text-base font-bold text-[#356B5C]">
              {formaterMontant(totalSoins)} Ar
            </span>

          </div>

        </div>

      )}

    </div>
  );
}