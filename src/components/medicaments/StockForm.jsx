import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  PackagePlus,
  Calculator,
  Save,
  X,
  ArrowRight,
  AlertCircle,
  Check,
  Boxes,
  CircleDollarSign,
  Pill,
  Layers3,
} from "lucide-react";

export default function StockForm({
  medicament,
  onClose,
  onSuccess,
}) {
  const [quantite, setQuantite] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState(
    medicament?.prix_unitaire ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stockActuel = Number(medicament?.stock || 0);
  const quantiteAjoutee = Number(quantite || 0);
  const prix = Number(prixUnitaire || 0);

  const nouveauStock = stockActuel + quantiteAjoutee;

  const total = quantiteAjoutee * prix;

  const formatMoney = (value) => {
    return new Intl.NumberFormat("fr-FR").format(
      Number(value || 0)
    );
  };

  const isComplete =
    Number(quantite) > 0 &&
    prixUnitaire !== "" &&
    Number(prixUnitaire) >= 0;

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [loading, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!medicament?.id) {
      setError("Médicament introuvable.");
      return;
    }

    if (Number(quantite) <= 0) {
      setError("La quantité doit être supérieure à zéro.");
      return;
    }

    if (
      prixUnitaire === "" ||
      Number(prixUnitaire) < 0
    ) {
      setError(
        "Veuillez renseigner un prix unitaire valide."
      );
      return;
    }

    try {
      setLoading(true);

      await invoke("ajouter_entree_stock", {
        medicamentId: medicament.id,
        quantite: Number(quantite),
        prixUnitaire: Number(prixUnitaire),
      });

      onSuccess?.();
    } catch (err) {
      console.error("Erreur ajout stock :", err);

      setError(
        err?.toString() ||
          "Une erreur est survenue pendant l'ajout du stock."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        bg-[#26332F]/30
        backdrop-blur-[2px]
        p-3 sm:p-5
        animate-[fadeIn_150ms_ease-out]
      "
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          !loading
        ) {
          onClose?.();
        }
      }}
    >
      <div
        className="
          relative
          flex w-full max-w-[820px]
          max-h-[calc(100vh-24px)]
          flex-col
          overflow-hidden
          rounded-[14px]
          border border-[#DDE3E0]
          bg-white
          shadow-[0_18px_50px_rgba(38,51,47,0.14)]
          animate-[slideUp_180ms_ease-out]
        "
      >
        {/* =====================================================
            HEADER
        ====================================================== */}
        <div
          className="
            shrink-0
            border-b border-[#E8ECEA]
            bg-[#F4F6F5]
            px-4 py-4
            sm:px-6 sm:py-4
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="
                  flex h-11 w-11 shrink-0
                  items-center justify-center
                  rounded-[9px]
                  border border-[#D5E0DB]
                  bg-white
                  text-[#356B5C]
                "
              >
                <PackagePlus
                  className="h-5 w-5"
                  strokeWidth={2}
                />
              </div>

              <div className="min-w-0">
                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.1em]
                    text-[#356B5C]
                  "
                >
                  Pharmacie
                </p>

                <h2
                  className="
                    mt-0.5
                    truncate
                    text-[16px]
                    font-bold
                    tracking-[-0.01em]
                    text-[#394842]
                    sm:text-[17px]
                  "
                >
                  Ajouter du stock
                </h2>

                <p
                  className="
                    mt-0.5
                    text-[9px]
                    text-[#87928E]
                  "
                >
                  Ajoutez une nouvelle quantité au stock.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              title="Fermer"
              className="
                flex h-8 w-8 shrink-0
                items-center justify-center
                rounded-[7px]
                border border-[#D6DEDA]
                bg-white
                text-[#68756F]
                transition-colors
                hover:border-[#BFCBC6]
                hover:bg-[#F1F6F4]
                hover:text-[#356B5C]
                active:scale-95
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <X
                className="h-4 w-4"
                strokeWidth={2}
              />
            </button>
          </div>
        </div>

        {/* =====================================================
            CONTENU
        ====================================================== */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div
              className="
                grid grid-cols-1
                lg:grid-cols-[1fr_270px]
              "
            >
              {/* =================================================
                  FORMULAIRE
              ================================================== */}
              <div className="p-4 sm:p-6">
                {/* ERREUR */}
                {error && (
                  <div
                    className="
                      mb-5
                      flex items-start gap-3
                      rounded-[9px]
                      border border-[#E7CFCF]
                      bg-[#FBF5F5]
                      px-3.5 py-3
                      text-[#A34A4A]
                      animate-[fadeIn_150ms_ease-out]
                    "
                  >
                    <AlertCircle
                      className="
                        mt-0.5
                        h-4 w-4
                        shrink-0
                      "
                      strokeWidth={2}
                    />

                    <p
                      className="
                        text-[10px]
                        font-medium
                        leading-5
                      "
                    >
                      {error}
                    </p>
                  </div>
                )}

                {/* MÉDICAMENT */}
                <div className="mb-5">
                  <label
                    className="
                      mb-2
                      flex items-center gap-1.5
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.06em]
                      text-[#68756F]
                    "
                  >
                    <Pill
                      className="
                        h-3.5 w-3.5
                        text-[#356B5C]
                      "
                      strokeWidth={2}
                    />

                    Médicament
                  </label>

                  <div
                    className="
                      relative
                      flex h-11
                      items-center
                      rounded-[9px]
                      border border-[#DDE3E0]
                      bg-[#F4F6F5]
                      px-3
                    "
                  >
                    <Pill
                      className="
                        mr-2.5
                        h-4 w-4
                        shrink-0
                        text-[#687D75]
                      "
                      strokeWidth={1.8}
                    />

                    <span
                      className="
                        truncate
                        text-[11px]
                        font-semibold
                        text-[#394842]
                      "
                    >
                      {medicament?.nom ||
                        "Médicament inconnu"}
                    </span>

                    <span
                      className="
                        ml-auto
                        shrink-0
                        rounded-[5px]
                        border border-[#C9DCD4]
                        bg-white
                        px-2
                        py-1
                        text-[8px]
                        font-bold
                        text-[#356B5C]
                      "
                    >
                      Stock
                    </span>
                  </div>
                </div>

                {/* STOCK ACTUEL */}
                <div className="mb-5">
                  <label
                    className="
                      mb-2
                      flex items-center gap-1.5
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.06em]
                      text-[#68756F]
                    "
                  >
                    <Boxes
                      className="
                        h-3.5 w-3.5
                        text-[#356B5C]
                      "
                      strokeWidth={2}
                    />

                    Stock actuel
                  </label>

                  <div
                    className="
                      flex h-11
                      items-center
                      rounded-[9px]
                      border border-[#DDE3E0]
                      bg-[#F4F6F5]
                      px-3
                    "
                  >
                    <Boxes
                      className="
                        mr-2.5
                        h-4 w-4
                        text-[#687D75]
                      "
                      strokeWidth={1.8}
                    />

                    <span
                      className="
                        text-[11px]
                        font-bold
                        text-[#394842]
                      "
                    >
                      {stockActuel}
                    </span>

                    <span
                      className="
                        ml-1
                        text-[8px]
                        font-medium
                        text-[#87928E]
                      "
                    >
                      unités disponibles
                    </span>
                  </div>
                </div>

                {/* QUANTITÉ + PRIX */}
                <div
                  className="
                    grid
                    grid-cols-1
                    gap-4
                    sm:grid-cols-2
                  "
                >
                  {/* QUANTITÉ */}
                  <div>
                    <label
                      htmlFor="quantite-stock"
                      className="
                        mb-2
                        flex items-center gap-1.5
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.06em]
                        text-[#68756F]
                      "
                    >
                      <Layers3
                        className="
                          h-3.5 w-3.5
                          text-[#356B5C]
                        "
                        strokeWidth={2}
                      />

                      Quantité à ajouter

                      <span className="text-[#A34A4A]">
                        *
                      </span>
                    </label>

                    <div className="group relative">
                      <PackagePlus
                        className="
                          pointer-events-none
                          absolute
                          left-3 top-1/2
                          h-4 w-4
                          -translate-y-1/2
                          text-[#687D75]
                          transition-colors
                          duration-150
                          group-focus-within:text-[#356B5C]
                        "
                        strokeWidth={1.8}
                      />

                      <input
                        id="quantite-stock"
                        type="number"
                        min="1"
                        step="1"
                        value={quantite}
                        onChange={(e) => {
                          setQuantite(e.target.value);
                          setError("");
                        }}
                        placeholder="Ex. 50"
                        disabled={loading}
                        autoFocus
                        className="
                          h-11 w-full
                          rounded-[9px]
                          border border-[#D6DEDA]
                          bg-white
                          pl-10 pr-3
                          text-[11px]
                          font-semibold
                          text-[#394842]
                          outline-none
                          placeholder:font-normal
                          placeholder:text-[#A8B2AE]
                          transition-colors
                          hover:border-[#BFCBC6]
                          focus:border-[#356B5C]
                          focus:ring-2
                          focus:ring-[#DCE9E4]
                          disabled:cursor-not-allowed
                          disabled:bg-[#F4F6F5]
                        "
                      />
                    </div>
                  </div>

                  {/* PRIX */}
                  <div>
                    <label
                      htmlFor="prix-stock"
                      className="
                        mb-2
                        flex items-center gap-1.5
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.06em]
                        text-[#68756F]
                      "
                    >
                      <CircleDollarSign
                        className="
                          h-3.5 w-3.5
                          text-[#356B5C]
                        "
                        strokeWidth={2}
                      />

                      Nouveau prix unitaire

                      <span className="text-[#A34A4A]">
                        *
                      </span>
                    </label>

                    <div className="group relative">
                      <CircleDollarSign
                        className="
                          pointer-events-none
                          absolute
                          left-3 top-1/2
                          h-4 w-4
                          -translate-y-1/2
                          text-[#687D75]
                          transition-colors
                          duration-150
                          group-focus-within:text-[#356B5C]
                        "
                        strokeWidth={1.8}
                      />

                      <input
                        id="prix-stock"
                        type="number"
                        min="0"
                        step="0.01"
                        value={prixUnitaire}
                        onChange={(e) => {
                          setPrixUnitaire(
                            e.target.value
                          );
                          setError("");
                        }}
                        disabled={loading}
                        className="
                          h-11 w-full
                          rounded-[9px]
                          border border-[#D6DEDA]
                          bg-white
                          pl-10 pr-12
                          text-[11px]
                          font-semibold
                          text-[#394842]
                          outline-none
                          transition-colors
                          hover:border-[#BFCBC6]
                          focus:border-[#356B5C]
                          focus:ring-2
                          focus:ring-[#DCE9E4]
                          disabled:cursor-not-allowed
                          disabled:bg-[#F4F6F5]
                        "
                      />

                      <span
                        className="
                          pointer-events-none
                          absolute
                          right-3 top-1/2
                          -translate-y-1/2
                          text-[9px]
                          font-bold
                          text-[#87928E]
                        "
                      >
                        Ar
                      </span>
                    </div>
                  </div>
                </div>

                {/* MOBILE TOTAL */}
                <div
                  className="
                    mt-5
                    flex items-center
                    justify-between
                    rounded-[9px]
                    border border-[#DDE3E0]
                    bg-[#F4F6F5]
                    px-4 py-3
                    lg:hidden
                  "
                >
                  <div
                    className="
                      flex items-center gap-2
                    "
                  >
                    <div
                      className="
                        flex h-8 w-8
                        items-center justify-center
                        rounded-[7px]
                        border border-[#D5E0DB]
                        bg-white
                      "
                    >
                      <Calculator
                        className="
                          h-4 w-4
                          text-[#356B5C]
                        "
                        strokeWidth={1.9}
                      />
                    </div>

                    <div>
                      <p
                        className="
                          text-[8px]
                          font-medium
                          text-[#68756F]
                        "
                      >
                        Valeur de l'entrée
                      </p>

                      <p
                        className="
                          text-[13px]
                          font-bold
                          text-[#356B5C]
                        "
                      >
                        {formatMoney(total)} Ar
                      </p>
                    </div>
                  </div>

                  <span
                    className="
                      text-[8px]
                      font-medium
                      text-[#87928E]
                    "
                  >
                    {quantite || 0} ×{" "}
                    {formatMoney(prix)} Ar
                  </span>
                </div>

                {/* INFO */}
                <div
                  className="
                    mt-5
                    flex items-start gap-2.5
                    rounded-[9px]
                    border border-[#DDE3E0]
                    bg-[#F4F6F5]
                    px-3.5 py-3
                  "
                >
                  <AlertCircle
                    className="
                      mt-0.5
                      h-4 w-4
                      shrink-0
                      text-[#687D75]
                    "
                    strokeWidth={1.8}
                  />

                  <p
                    className="
                      text-[9px]
                      leading-5
                      text-[#68756F]
                    "
                  >
                    Le stock ajouté sera automatiquement
                    enregistré comme une nouvelle entrée
                    de médicament.
                  </p>
                </div>
              </div>

              {/* =================================================
                  APERÇU
              ================================================== */}
              <div
                className="
                  border-t
                  border-[#E8ECEA]
                  bg-[#F4F6F5]
                  p-4
                  lg:border-l
                  lg:border-t-0
                  lg:p-5
                "
              >
                <div className="mb-4">
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                    "
                  >
                    <div>
                      <p
                        className="
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-[0.1em]
                          text-[#356B5C]
                        "
                      >
                        Aperçu
                      </p>

                      <h3
                        className="
                          mt-1
                          text-[13px]
                          font-bold
                          text-[#394842]
                        "
                      >
                        Nouveau stock
                      </h3>
                    </div>

                    <PackagePlus
                      className="
                        h-4 w-4
                        text-[#687D75]
                      "
                      strokeWidth={1.9}
                    />
                  </div>
                </div>

                {/* CARTE */}
                <div
                  className="
                    rounded-[11px]
                    border border-[#DDE3E0]
                    bg-white
                    p-4
                    shadow-[0_3px_12px_rgba(38,51,47,0.05)]
                  "
                >
                  {/* MÉDICAMENT */}
                  <div
                    className="
                      flex items-center gap-3
                    "
                  >
                    <div
                      className="
                        flex h-10 w-10
                        shrink-0
                        items-center justify-center
                        rounded-[8px]
                        border border-[#D5E0DB]
                        bg-[#F4F6F5]
                        text-[#356B5C]
                      "
                    >
                      <Pill
                        className="h-5 w-5"
                        strokeWidth={1.9}
                      />
                    </div>

                    <div className="min-w-0">
                      <p
                        className="
                          truncate
                          text-[11px]
                          font-bold
                          text-[#394842]
                        "
                      >
                        {medicament?.nom ||
                          "Médicament"}
                      </p>

                      <p
                        className="
                          mt-0.5
                          text-[8px]
                          text-[#87928E]
                        "
                      >
                        Ajout de stock
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      my-4 h-px
                      bg-[#E8ECEA]
                    "
                  />

                  {/* STOCK ACTUEL */}
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                    "
                  >
                    <div
                      className="
                        flex items-center gap-2
                      "
                    >
                      <Boxes
                        className="
                          h-3.5 w-3.5
                          text-[#687D75]
                        "
                        strokeWidth={1.8}
                      />

                      <span
                        className="
                          text-[9px]
                          text-[#68756F]
                        "
                      >
                        Stock actuel
                      </span>
                    </div>

                    <span
                      className="
                        text-[11px]
                        font-bold
                        text-[#394842]
                      "
                    >
                      {stockActuel}
                    </span>
                  </div>

                  {/* AJOUT */}
                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      justify-between
                    "
                  >
                    <div
                      className="
                        flex items-center gap-2
                      "
                    >
                      <PackagePlus
                        className="
                          h-3.5 w-3.5
                          text-[#687D75]
                        "
                        strokeWidth={1.8}
                      />

                      <span
                        className="
                          text-[9px]
                          text-[#68756F]
                        "
                      >
                        Quantité ajoutée
                      </span>
                    </div>

                    <span
                      className="
                        text-[11px]
                        font-bold
                        text-[#356B5C]
                      "
                    >
                      +{quantiteAjoutee}
                    </span>
                  </div>

                  {/* NOUVEAU STOCK */}
                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      justify-between
                    "
                  >
                    <div
                      className="
                        flex items-center gap-2
                      "
                    >
                      <Layers3
                        className="
                          h-3.5 w-3.5
                          text-[#687D75]
                        "
                        strokeWidth={1.8}
                      />

                      <span
                        className="
                          text-[9px]
                          text-[#68756F]
                        "
                      >
                        Nouveau stock
                      </span>
                    </div>

                    <span
                      className="
                        text-[11px]
                        font-bold
                        text-[#394842]
                      "
                    >
                      {nouveauStock}
                    </span>
                  </div>

                  <div
                    className="
                      my-4 h-px
                      bg-[#E8ECEA]
                    "
                  />

                  {/* TOTAL */}
                  <div
                    className="
                      rounded-[9px]
                      border border-[#C9DCD4]
                      bg-[#F1F6F4]
                      px-3.5 py-3
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        justify-between
                      "
                    >
                      <div
                        className="
                          flex items-center gap-2
                        "
                      >
                        <Calculator
                          className="
                            h-4 w-4
                            text-[#356B5C]
                          "
                          strokeWidth={1.9}
                        />

                        <span
                          className="
                            text-[9px]
                            font-semibold
                            text-[#68756F]
                          "
                        >
                          Valeur totale
                        </span>
                      </div>

                      <span
                        className="
                          text-[13px]
                          font-bold
                          text-[#356B5C]
                        "
                      >
                        {formatMoney(total)} Ar
                      </span>
                    </div>
                  </div>
                </div>

                {/* STATUS */}
                <div
                  className={
                    isComplete
                      ? `
                        mt-3
                        flex items-center gap-2
                        rounded-[9px]
                        border border-[#C9DCD4]
                        bg-[#F1F6F4]
                        px-3 py-2.5
                        text-[#356B5C]
                      `
                      : `
                        mt-3
                        flex items-center gap-2
                        rounded-[9px]
                        border border-[#DDE3E0]
                        bg-white
                        px-3 py-2.5
                        text-[#87928E]
                      `
                  }
                >
                  {isComplete ? (
                    <Check
                      className="h-3.5 w-3.5"
                      strokeWidth={2.4}
                    />
                  ) : (
                    <AlertCircle
                      className="h-3.5 w-3.5"
                      strokeWidth={1.9}
                    />
                  )}

                  <span
                    className="
                      text-[9px]
                      font-semibold
                    "
                  >
                    {isComplete
                      ? "Informations complètes"
                      : "Informations à compléter"}
                  </span>
                </div>
              </div>
            </div>

            {/* =================================================
                FOOTER
            ================================================== */}
            <div
              className="
                flex
                shrink-0
                flex-col-reverse
                gap-2
                border-t
                border-[#E8ECEA]
                bg-white
                px-4 py-3
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:px-6
              "
            >
              <div
                className="
                  hidden
                  items-center gap-1.5
                  sm:flex
                "
              >
                <span
                  className="
                    h-1.5 w-1.5
                    rounded-full
                    bg-[#356B5C]
                  "
                />

                <span
                  className="
                    text-[8px]
                    text-[#87928E]
                  "
                >
                  Les champs marqués * sont obligatoires
                </span>
              </div>

              <div
                className="
                  flex
                  w-full
                  gap-2
                  sm:w-auto
                "
              >
                {/* ANNULER */}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="
                    flex h-10
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-[8px]
                    border border-[#D6DEDA]
                    bg-white
                    px-4
                    text-[10px]
                    font-bold
                    text-[#68756F]
                    transition-colors
                    hover:border-[#BFCBC6]
                    hover:bg-[#F1F6F4]
                    hover:text-[#356B5C]
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    sm:flex-none
                  "
                >
                  <X
                    className="h-3.5 w-3.5"
                    strokeWidth={2}
                  />

                  Annuler
                </button>

                {/* ENREGISTRER */}
                <button
                  type="submit"
                  disabled={loading || !isComplete}
                  className="
                    group
                    flex h-10
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-[8px]
                    bg-[#356B5C]
                    px-5
                    text-[10px]
                    font-bold
                    text-white
                    transition-colors
                    hover:bg-[#2D5D50]
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:bg-[#B8C5C0]
                    sm:flex-none
                  "
                >
                  {loading ? (
                    <>
                      <span
                        className="
                          h-3.5 w-3.5
                          animate-spin
                          rounded-full
                          border-2
                          border-white/40
                          border-t-white
                        "
                      />

                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save
                        className="h-3.5 w-3.5"
                        strokeWidth={2}
                      />

                      Enregistrer

                      <ArrowRight
                        className="
                          h-3.5 w-3.5
                          transition-transform
                          duration-150
                          group-hover:translate-x-0.5
                        "
                        strokeWidth={2.2}
                      />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* =====================================================
          ANIMATIONS
      ====================================================== */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
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
  );
}