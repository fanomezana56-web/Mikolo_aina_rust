import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Minus,
  Save,
  X,
  Boxes,
  Package,
  AlertCircle,
  ArrowRight,
  PackageMinus,
} from "lucide-react";

export default function RetirerStockForm({
  medicament,
  onClose,
  onSuccess,
}) {
  const [quantite, setQuantite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stockActuel = Number(medicament?.stock || 0);
  const quantiteRetiree = Number(quantite || 0);
  const nouveauStock = stockActuel - quantiteRetiree;

  const isComplete =
    quantite !== "" &&
    Number(quantite) > 0 &&
    Number.isInteger(Number(quantite)) &&
    Number(quantite) <= stockActuel;

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

    if (
      quantite === "" ||
      Number(quantite) <= 0 ||
      !Number.isInteger(Number(quantite))
    ) {
      setError(
        "La quantité à retirer doit être un nombre entier supérieur à zéro."
      );
      return;
    }

    if (Number(quantite) > stockActuel) {
      setError(
        `Stock insuffisant. Vous ne pouvez retirer que ${stockActuel} unité(s).`
      );
      return;
    }

    try {
      setLoading(true);

      await invoke("retirer_stock", {
        medicamentId: medicament.id,
        quantite: Number(quantite),
      });

      onSuccess?.();
    } catch (err) {
      console.error("Erreur retrait stock :", err);

      setError(
        err?.toString() ||
          "Une erreur est survenue pendant le retrait du stock."
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
        if (e.target === e.currentTarget && !loading) {
          onClose?.();
        }
      }}
    >
      <div
        className="
          relative
          flex w-full
          max-w-[820px]
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
        {/* HEADER */}
        <div
          className="
            shrink-0
            border-b border-[#E8ECEA]
            bg-[#F4F6F5]
            px-4 py-4
            sm:px-6 sm:py-4
          "
        >
          <div className="flex items-center justify-between gap-4">
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
                <PackageMinus
                  className="h-[18px] w-[18px]"
                  strokeWidth={1.9}
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
                    text-[16px]
                    font-bold
                    text-[#394842]
                    sm:text-[17px]
                  "
                >
                  Réduire le stock
                </h2>

                <p
                  className="
                    mt-0.5
                    text-[9px]
                    font-medium
                    text-[#87928E]
                  "
                >
                  Retirez une quantité du stock disponible.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
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

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <div
            className="
              grid
              grid-cols-1
              lg:grid-cols-[1fr_270px]
            "
          >
            {/* GAUCHE */}
            <div className="p-4 sm:p-6">
              {/* ERREUR */}
              {error && (
                <div
                  className="
                    mb-4
                    flex items-start gap-2
                    rounded-[9px]
                    border border-[#E7CFCF]
                    bg-[#FBF5F5]
                    px-3
                    py-2.5
                    text-[#A34A4A]
                  "
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    strokeWidth={2}
                  />

                  <p className="text-[10px] font-semibold leading-5">
                    {error}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {/* MÉDICAMENT */}
                <div>
                  <label
                    className="
                      mb-1.5
                      block
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.06em]
                      text-[#68756F]
                    "
                  >
                    Médicament
                  </label>

                  <div
                    className="
                      flex h-11
                      items-center
                      gap-3
                      rounded-[9px]
                      border border-[#DDE3E0]
                      bg-[#F4F6F5]
                      px-3
                    "
                  >
                    <div
                      className="
                        flex h-8 w-8 shrink-0
                        items-center justify-center
                        rounded-[7px]
                        border border-[#D5E0DB]
                        bg-white
                        text-[#356B5C]
                      "
                    >
                      <Package
                        className="h-4 w-4"
                        strokeWidth={1.9}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-[#394842]">
                        {medicament?.nom || "Médicament"}
                      </p>

                      <p className="mt-0.5 text-[8px] font-medium text-[#87928E]">
                        Stock disponible : {stockActuel} unités
                      </p>
                    </div>
                  </div>
                </div>

                {/* STOCK ACTUEL */}
                <div>
                  <label
                    className="
                      mb-1.5
                      block
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.06em]
                      text-[#68756F]
                    "
                  >
                    Stock actuel
                  </label>

                  <div
                    className="
                      flex h-11
                      items-center
                      justify-between
                      rounded-[9px]
                      border border-[#DDE3E0]
                      bg-[#F4F6F5]
                      px-3
                    "
                  >
                    <div className="flex items-center gap-2">
                      <Boxes
                        className="h-4 w-4 text-[#356B5C]"
                        strokeWidth={1.9}
                      />

                      <span className="text-[10px] font-semibold text-[#68756F]">
                        Quantité disponible
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-[16px] font-bold text-[#394842]">
                        {stockActuel}
                      </span>

                      <span className="text-[8px] font-medium text-[#87928E]">
                        unités
                      </span>
                    </div>
                  </div>
                </div>

                {/* QUANTITÉ À RETIRER */}
                <div>
                  <label
                    htmlFor="quantite-retrait"
                    className="
                      mb-1.5
                      block
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.06em]
                      text-[#68756F]
                    "
                  >
                    Quantité à retirer
                  </label>

                  <div className="relative">
                    <Minus
                      className="
                        pointer-events-none
                        absolute
                        left-3.5
                        top-1/2
                        h-4
                        w-4
                        -translate-y-1/2
                        text-[#356B5C]
                      "
                      strokeWidth={2}
                    />

                    <input
                      id="quantite-retrait"
                      type="number"
                      min="1"
                      max={stockActuel}
                      step="1"
                      value={quantite}
                      onChange={(e) => {
                        const value = e.target.value;

                        setQuantite(value);

                        if (Number(value) > stockActuel) {
                          setError(
                            `La quantité ne peut pas dépasser ${stockActuel} unité(s).`
                          );
                        } else {
                          setError("");
                        }
                      }}
                      disabled={loading || stockActuel === 0}
                      autoFocus
                      className="
                        h-11
                        w-full
                        rounded-[9px]
                        border border-[#D6DEDA]
                        bg-white
                        pl-10
                        pr-3
                        text-[11px]
                        font-semibold
                        text-[#394842]
                        outline-none
                        transition-colors
                        placeholder:text-[#A8B2AE]
                        hover:border-[#BFCBC6]
                        focus:border-[#356B5C]
                        focus:ring-2
                        focus:ring-[#DCE9E4]
                        disabled:cursor-not-allowed
                        disabled:bg-[#F4F6F5]
                      "
                      placeholder="Ex : 5"
                    />
                  </div>

                  <p className="mt-1.5 text-[8px] font-medium text-[#87928E]">
                    Maximum autorisé : {stockActuel} unité(s)
                  </p>
                </div>

                {/* APERÇU DU NOUVEAU STOCK */}
                <div
                  className={
                    isComplete
                      ? "flex items-center justify-between rounded-[9px] border border-[#C9DCD4] bg-[#F1F6F4] px-3 py-2.5"
                      : "flex items-center justify-between rounded-[9px] border border-[#DDE3E0] bg-white px-3 py-2.5"
                  }
                >
                  <div className="flex items-center gap-2">
                    <ArrowRight
                      className={
                        isComplete
                          ? "h-3.5 w-3.5 text-[#356B5C]"
                          : "h-3.5 w-3.5 text-[#87928E]"
                      }
                      strokeWidth={2}
                    />

                    <span
                      className={
                        isComplete
                          ? "text-[9px] font-semibold text-[#356B5C]"
                          : "text-[9px] font-semibold text-[#68756F]"
                      }
                    >
                      Stock après retrait
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold text-[#87928E]">
                      {stockActuel}
                    </span>

                    <ArrowRight
                      className="h-3 w-3 text-[#A8B2AE]"
                      strokeWidth={2}
                    />

                    <span
                      className={
                        isComplete
                          ? "text-[12px] font-bold text-[#356B5C]"
                          : "text-[12px] font-bold text-[#87928E]"
                      }
                    >
                      {Math.max(0, nouveauStock)}
                    </span>
                  </div>
                </div>

                {/* INFORMATION */}
                <div
                  className="
                    flex items-start gap-2
                    rounded-[9px]
                    border border-[#DDE3E0]
                    bg-[#F4F6F5]
                    px-3
                    py-2.5
                  "
                >
                  <PackageMinus
                    className="
                      mt-0.5
                      h-3.5 w-3.5
                      shrink-0
                      text-[#356B5C]
                    "
                    strokeWidth={1.9}
                  />

                  <p className="text-[9px] font-medium leading-4 text-[#68756F]">
                    La quantité retirée sera automatiquement déduite du stock
                    disponible.
                  </p>
                </div>
              </div>
            </div>

            {/* APERÇU DROITE */}
            <div
              className="
                border-t border-[#E8ECEA]
                bg-[#F4F6F5]
                p-4
                lg:border-l lg:border-t-0
                lg:p-5
              "
            >
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
                Retrait de stock
              </h3>

              <div
                className="
                  mt-3
                  rounded-[11px]
                  border border-[#DDE3E0]
                  bg-white
                  p-4
                  shadow-[0_4px_14px_rgba(38,51,47,0.04)]
                "
              >
                {/* ICÔNE */}
                <div
                  className="
                    flex h-10 w-10
                    items-center justify-center
                    rounded-[8px]
                    border border-[#D5E0DB]
                    bg-[#F4F6F5]
                    text-[#356B5C]
                  "
                >
                  <PackageMinus
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.9}
                  />
                </div>

                {/* NOM */}
                <div className="mt-4">
                  <p
                    className="
                      text-[8px]
                      font-bold
                      uppercase
                      tracking-[0.08em]
                      text-[#68756F]
                    "
                  >
                    Médicament
                  </p>

                  <p
                    className="
                      mt-1
                      truncate
                      text-[11px]
                      font-bold
                      text-[#394842]
                    "
                  >
                    {medicament?.nom || "Médicament"}
                  </p>
                </div>

                <div className="my-3 h-px bg-[#E8ECEA]" />

                {/* STOCK AVANT */}
                <div>
                  <p
                    className="
                      text-[8px]
                      font-bold
                      uppercase
                      tracking-[0.08em]
                      text-[#68756F]
                    "
                  >
                    Stock actuel
                  </p>

                  <p className="mt-1 text-[16px] font-bold text-[#394842]">
                    {stockActuel}
                    <span className="ml-1 text-[8px] font-medium text-[#87928E]">
                      unités
                    </span>
                  </p>
                </div>

                <div className="my-3 h-px bg-[#E8ECEA]" />

                {/* QUANTITÉ RETIRÉE */}
                <div>
                  <p
                    className="
                      text-[8px]
                      font-bold
                      uppercase
                      tracking-[0.08em]
                      text-[#68756F]
                    "
                  >
                    Quantité retirée
                  </p>

                  <p className="mt-1 text-[16px] font-bold text-[#A34A4A]">
                    {quantiteRetiree}
                    <span className="ml-1 text-[8px] font-medium text-[#87928E]">
                      unités
                    </span>
                  </p>
                </div>

                <div className="my-3 h-px bg-[#E8ECEA]" />

                {/* NOUVEAU STOCK */}
                <div
                  className="
                    rounded-[9px]
                    border border-[#C9DCD4]
                    bg-[#F1F6F4]
                    px-3
                    py-3
                  "
                >
                  <div className="flex items-center justify-between">
                    <p
                      className="
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.08em]
                        text-[#356B5C]
                      "
                    >
                      Nouveau stock
                    </p>

                    <ArrowRight
                      className="h-3 w-3 text-[#87928E]"
                      strokeWidth={2}
                    />
                  </div>

                  <p className="mt-1 text-[19px] font-bold text-[#356B5C]">
                    {Math.max(0, nouveauStock)}
                    <span className="ml-1 text-[8px] font-medium text-[#68756F]">
                      unités
                    </span>
                  </p>
                </div>

                {/* STATUT */}
                <div
                  className={
                    isComplete
                      ? "mt-3 flex items-center gap-2 rounded-[9px] border border-[#C9DCD4] bg-[#F1F6F4] px-3 py-2.5 text-[#356B5C]"
                      : "mt-3 flex items-center gap-2 rounded-[9px] border border-[#DDE3E0] bg-white px-3 py-2.5 text-[#87928E]"
                  }
                >
                  <div
                    className={
                      isComplete
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-white"
                        : "flex h-5 w-5 items-center justify-center rounded-full bg-[#F4F6F5]"
                    }
                  >
                    <PackageMinus
                      className="h-3 w-3"
                      strokeWidth={2}
                    />
                  </div>

                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.06em]">
                      État
                    </p>

                    <p className="mt-0.5 text-[9px] font-semibold">
                      {isComplete
                        ? "Retrait prêt à être confirmé"
                        : "Saisissez une quantité"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div
            className="
              shrink-0
              flex
              flex-col-reverse
              gap-2
              border-t border-[#E8ECEA]
              bg-white
              px-4
              py-3
              sm:flex-row
              sm:items-center
              sm:justify-end
              sm:px-6
            "
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="
                flex h-10
                items-center justify-center
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
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <X
                className="h-3.5 w-3.5"
                strokeWidth={2}
              />
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading || !isComplete}
              className="
                flex h-10
                items-center justify-center
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
                  Retrait...
                </>
              ) : (
                <>
                  <Save
                    className="h-3.5 w-3.5"
                    strokeWidth={2}
                  />
                  Confirmer le retrait
                </>
              )}
            </button>
          </div>
        </form>
      </div>

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