import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  HeartPulse,
  Save,
  X,
  CircleAlert,
  CheckCircle2,
  Coins,
} from "lucide-react";

export default function SoinsForm({
  soin = null,
  onSoinAjoute,
  onSoinModifie,
  onFermer,
}) {
  const modeModification = Boolean(soin);

  const [nom, setNom] = useState(soin?.nom || "");
  const [prix, setPrix] = useState(
    soin?.prix !== undefined && soin?.prix !== null
      ? String(soin.prix)
      : ""
  );

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (soin) {
      setNom(soin.nom || "");
      setPrix(
        soin.prix !== undefined && soin.prix !== null
          ? String(soin.prix)
          : ""
      );
    } else {
      setNom("");
      setPrix("");
    }

    setErreur("");
    setMessage("");
  }, [soin]);

  const enregistrer = async (e) => {
    e.preventDefault();

    setErreur("");
    setMessage("");

    const nomNettoye = nom.trim();
    const prixNumerique = Number(prix);

    if (!nomNettoye) {
      setErreur("Le nom du soin est obligatoire.");
      return;
    }

    if (nomNettoye.length < 2) {
      setErreur("Le nom du soin doit contenir au moins 2 caractères.");
      return;
    }

    if (prix === "" || Number.isNaN(prixNumerique)) {
      setErreur("Veuillez saisir un prix valide.");
      return;
    }

    if (prixNumerique < 0) {
      setErreur("Le prix ne peut pas être négatif.");
      return;
    }

    try {
      setChargement(true);

      let resultat;

      if (!modeModification) {
        resultat = await invoke("ajouter_soin", {
          data: {
            nom: nomNettoye,
            prix: prixNumerique,
          },
        });

        setMessage("Le soin a été enregistré avec succès.");

        setNom("");
        setPrix("");

        if (onSoinAjoute) {
          onSoinAjoute(resultat);
        }
      } else {
        resultat = await invoke("modifier_soin", {
          soinId: soin.id,
          data: {
            nom: nomNettoye,
            prix: prixNumerique,
          },
        });

        setMessage("Le soin a été modifié avec succès.");

        if (onSoinModifie) {
          onSoinModifie(resultat);
        }
      }
    } catch (error) {
      console.error("Erreur soin :", error);

      const erreurTexte = String(error);
      const erreurMinuscule = erreurTexte.toLowerCase();

      if (
        erreurMinuscule.includes("unique") ||
        erreurMinuscule.includes("duplicate") ||
        erreurMinuscule.includes("soins_nom_key")
      ) {
        setErreur("Un soin portant ce nom existe déjà.");
      } else {
        setErreur(
          erreurTexte ||
            "Une erreur est survenue lors de l'enregistrement."
        );
      }
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="flex w-full justify-center px-3 py-4 sm:px-4 sm:py-6">

      {/* =====================================================
          PETIT FORMULAIRE CENTRÉ
      ===================================================== */}

      <div className="w-full max-w-[460px]">

        {/* ===================================================
            EN-TÊTE
        =================================================== */}

        <div className="mb-4 flex items-center gap-3">

          <div
            className="
              flex h-10 w-10 shrink-0
              items-center justify-center
              rounded-xl
            "
            style={{ backgroundColor: "#E7F1ED" }}
          >
            <HeartPulse
              size={20}
              strokeWidth={2}
              style={{ color: "#356B5C" }}
            />
          </div>

          <div className="min-w-0 flex-1">

            <h2 className="text-base font-semibold tracking-tight text-gray-800 sm:text-lg">
              {modeModification
                ? "Modifier le soin"
                : "Ajouter un soin"}
            </h2>

            <p className="mt-0.5 text-xs leading-4 text-gray-500">
              {modeModification
                ? "Modifiez les informations du soin."
                : "Ajoutez un soin et son tarif."}
            </p>

          </div>

          {onFermer && (
            <button
              type="button"
              onClick={onFermer}
              disabled={chargement}
              aria-label="Fermer"
              className="
                flex h-8 w-8 shrink-0
                items-center justify-center
                rounded-lg
                text-gray-400
                transition
                hover:bg-gray-100
                hover:text-gray-700
                disabled:opacity-40
              "
            >
              <X size={17} />
            </button>
          )}

        </div>

        {/* ===================================================
            CARTE
        =================================================== */}

        <div
          className="
            overflow-hidden
            rounded-2xl
            border border-gray-100
            bg-white
            shadow-sm
          "
        >

          <form onSubmit={enregistrer}>

            {/* =================================================
                CONTENU
            ================================================= */}

            <div className="p-4 sm:p-5">

              {/* Nom */}
              <div className="mb-4">

                <label
                  htmlFor="nom-soin"
                  className="
                    mb-1.5
                    block
                    text-xs
                    font-semibold
                    text-gray-700
                    sm:text-sm
                  "
                >
                  Nom du soin
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  id="nom-soin"
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex. Consultation générale"
                  autoComplete="off"
                  disabled={chargement}
                  className="
                    h-10
                    w-full
                    rounded-xl
                    border border-gray-200
                    bg-gray-50
                    px-3.5
                    text-sm
                    text-gray-800
                    placeholder:text-gray-400
                    outline-none
                    transition
                    hover:border-gray-300
                    focus:border-[#356B5C]
                    focus:bg-white
                    focus:ring-2
                    focus:ring-[#356B5C]/10
                    disabled:opacity-60
                  "
                />

              </div>

              {/* Prix */}
              <div className="mb-4">

                <label
                  htmlFor="prix-soin"
                  className="
                    mb-1.5
                    block
                    text-xs
                    font-semibold
                    text-gray-700
                    sm:text-sm
                  "
                >
                  Tarif du soin
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <div className="relative">

                  <Coins
                    size={16}
                    className="
                      pointer-events-none
                      absolute
                      left-3.5
                      top-1/2
                      -translate-y-1/2
                      text-gray-400
                    "
                  />

                  <input
                    id="prix-soin"
                    type="number"
                    min="0"
                    step="0.01"
                    value={prix}
                    onChange={(e) => setPrix(e.target.value)}
                    placeholder="0"
                    disabled={chargement}
                    className="
                      h-10
                      w-full
                      rounded-xl
                      border border-gray-200
                      bg-gray-50
                      py-2
                      pl-10
                      pr-12
                      text-sm
                      font-medium
                      text-gray-800
                      placeholder:font-normal
                      placeholder:text-gray-400
                      outline-none
                      transition
                      hover:border-gray-300
                      focus:border-[#356B5C]
                      focus:bg-white
                      focus:ring-2
                      focus:ring-[#356B5C]/10
                      disabled:opacity-60
                    "
                  />

                  <span
                    className="
                      pointer-events-none
                      absolute
                      right-3.5
                      top-1/2
                      -translate-y-1/2
                      text-xs
                      font-semibold
                      text-gray-400
                    "
                  >
                    Ar
                  </span>

                </div>

              </div>

              {/* =================================================
                  APERÇU DU PRIX
              ================================================= */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  rounded-xl
                  border border-[#DDEBE5]
                  bg-[#F3F7F5]
                  px-3.5
                  py-2.5
                "
              >

                <div>

                  <p className="text-[11px] font-medium text-gray-500 sm:text-xs">
                    Tarif
                  </p>

                  <p className="mt-0.5 text-sm font-bold text-[#356B5C] sm:text-base">
                    {prix !== "" && !Number.isNaN(Number(prix))
                      ? `${new Intl.NumberFormat("fr-FR").format(
                          Number(prix)
                        )} Ar`
                      : "0 Ar"}
                  </p>

                </div>

                <Coins
                  size={19}
                  className="text-[#356B5C]/40"
                />

              </div>

              {/* =================================================
                  ERREUR
              ================================================= */}

              {erreur && (
                <div
                  role="alert"
                  className="
                    mt-4
                    flex
                    items-start
                    gap-2.5
                    rounded-xl
                    border border-red-100
                    bg-red-50
                    px-3
                    py-2.5
                  "
                >

                  <CircleAlert
                    size={16}
                    className="mt-0.5 shrink-0 text-red-500"
                  />

                  <p className="text-xs leading-5 text-red-600">
                    {erreur}
                  </p>

                </div>
              )}

              {/* =================================================
                  SUCCÈS
              ================================================= */}

              {message && (
                <div
                  role="status"
                  className="
                    mt-4
                    flex
                    items-start
                    gap-2.5
                    rounded-xl
                    border border-green-100
                    bg-green-50
                    px-3
                    py-2.5
                  "
                >

                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-green-600"
                  />

                  <p className="text-xs leading-5 text-green-700">
                    {message}
                  </p>

                </div>
              )}

            </div>

            {/* =================================================
                BOUTONS
            ================================================= */}

            <div
              className="
                flex
                flex-col-reverse
                gap-2
                border-t border-gray-100
                bg-gray-50/70
                p-3
                sm:flex-row
                sm:justify-end
                sm:px-4
                sm:py-3
              "
            >

              {onFermer && (
                <button
                  type="button"
                  onClick={onFermer}
                  disabled={chargement}
                  className="
                    min-h-[40px]
                    w-full
                    rounded-xl
                    border border-gray-200
                    bg-white
                    px-4
                    py-2
                    text-xs
                    font-medium
                    text-gray-600
                    transition
                    hover:bg-gray-50
                    hover:text-gray-800
                    disabled:opacity-50
                    sm:w-auto
                  "
                >
                  Annuler
                </button>
              )}

              <button
                type="submit"
                disabled={chargement}
                className="
                  inline-flex
                  min-h-[40px]
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#356B5C]
                  px-5
                  py-2
                  text-xs
                  font-semibold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-[#2D5B4E]
                  active:scale-[0.98]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  sm:w-auto
                "
              >

                <Save
                  size={16}
                  className={chargement ? "animate-pulse" : ""}
                />

                {chargement
                  ? "Enregistrement..."
                  : modeModification
                  ? "Enregistrer"
                  : "Ajouter le soin"}

              </button>

            </div>

          </form>

        </div>

      </div>
    </div>
  );
}