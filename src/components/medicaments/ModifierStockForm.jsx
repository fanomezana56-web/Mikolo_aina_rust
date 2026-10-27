import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Pencil,
  Save,
  X,
  Boxes,
  Package,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  CheckCircle2,
} from "lucide-react";

function formaterMontant(montant) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(montant || 0));
}

function formaterDate(date) {
  if (!date) return "Non renseignée";

  const [annee, mois, jour] = date.split("-");

  if (!annee || !mois || !jour) {
    return date;
  }

  return `${jour}/${mois}/${annee}`;
}

export default function ModifierMedicamentForm({
  medicament,
  onClose,
  onSuccess,
}) {
  const [nom, setNom] = useState(medicament?.nom ?? "");
  const [prixUnitaire, setPrixUnitaire] = useState(
    medicament?.prix_unitaire ?? ""
  );
  const [stock, setStock] = useState(
    medicament?.stock ?? ""
  );
  const [dateExpiration, setDateExpiration] = useState(
    medicament?.date_expiration ?? ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stockActuel = Number(medicament?.stock || 0);
  const nouveauStock = Number(stock || 0);

  const prixActuel = Number(
    medicament?.prix_unitaire || 0
  );
  const nouveauPrix = Number(prixUnitaire || 0);

  const differenceStock = nouveauStock - stockActuel;

  const isComplete =
    nom.trim() !== "" &&
    prixUnitaire !== "" &&
    Number(prixUnitaire) >= 0 &&
    stock !== "" &&
    Number(stock) >= 0 &&
    Number.isInteger(Number(stock));

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [loading, onClose]);

  useEffect(() => {
    setNom(medicament?.nom ?? "");
    setPrixUnitaire(medicament?.prix_unitaire ?? "");
    setStock(medicament?.stock ?? "");
    setDateExpiration(
      medicament?.date_expiration ?? ""
    );
    setError("");
  }, [medicament]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!medicament?.id) {
      setError("Médicament introuvable.");
      return;
    }

    if (!nom.trim()) {
      setError(
        "Le nom du médicament est obligatoire."
      );
      return;
    }

    if (
      prixUnitaire === "" ||
      Number(prixUnitaire) < 0
    ) {
      setError(
        "Veuillez saisir un prix unitaire valide."
      );
      return;
    }

    if (
      stock === "" ||
      Number(stock) < 0 ||
      !Number.isInteger(Number(stock))
    ) {
      setError(
        "Veuillez saisir une quantité entière valide."
      );
      return;
    }

    try {
      setLoading(true);

      await invoke("modifier_medicament", {
        medicamentId: medicament.id,
        data: {
          nom: nom.trim(),
          prix_unitaire: Number(prixUnitaire),
          stock: Number(stock),
          date_expiration:
            dateExpiration || null,
        },
      });

      onSuccess?.();
    } catch (err) {
      console.error(
        "Erreur modification médicament :",
        err
      );

      const message = err?.toString() || "";

      if (
        message.includes(
          "medicaments_nom_key"
        ) ||
        message.includes(
          "clé dupliquée"
        ) ||
        message.includes(
          "existe déjà"
        )
      ) {
        setError(
          "Un médicament portant ce nom existe déjà."
        );
      } else {
        setError(
          message ||
            "Une erreur est survenue pendant la modification du médicament."
        );
      }
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
        p-4
        backdrop-blur-[2px]
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
          w-full
          max-w-[900px]
          max-h-[92vh]
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
            flex
            items-center
            justify-between
            border-b border-[#E8ECEA]
            bg-[#F4F6F5]
            px-5
            py-4
            sm:px-6
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-10 w-10
                items-center justify-center
                rounded-[9px]
                border border-[#D1DDD8]
                bg-white
                text-[#356B5C]
              "
            >
              <Pencil
                className="h-[18px] w-[18px]"
                strokeWidth={1.9}
              />
            </div>

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
                Pharmacie
              </p>

              <h2
                className="
                  mt-0.5
                  text-[15px]
                  font-bold
                  text-[#394842]
                "
              >
                Modifier le médicament
              </h2>

              <p
                className="
                  mt-0.5
                  text-[9px]
                  font-medium
                  text-[#87928E]
                "
              >
                Modifiez les informations du médicament
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              flex h-8 w-8
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

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(92vh-75px)] overflow-y-auto"
        >
          <div className="p-5 sm:p-6">
            {/* ERREUR */}
            {error && (
              <div
                className="
                  mb-5
                  flex items-start gap-2.5
                  rounded-[9px]
                  border border-[#E7CFCF]
                  bg-[#FBF5F5]
                  px-3.5
                  py-3
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

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              {/* GAUCHE */}
              <div className="space-y-4">
                {/* NOM */}
                <div>
                  <label
                    htmlFor="nom-medicament"
                    className="
                      mb-1.5
                      block
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.08em]
                      text-[#68756F]
                    "
                  >
                    Nom du médicament
                  </label>

                  <div className="relative">
                    <Package
                      className="
                        pointer-events-none
                        absolute
                        left-3.5
                        top-1/2
                        h-4
                        w-4
                        -translate-y-1/2
                        text-[#687D75]
                      "
                      strokeWidth={1.9}
                    />

                    <input
                      id="nom-medicament"
                      type="text"
                      value={nom}
                      onChange={(e) =>
                        setNom(e.target.value)
                      }
                      disabled={loading}
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
                        focus:border-[#356B5C]
                        focus:ring-2
                        focus:ring-[#DCE9E4]
                        disabled:cursor-not-allowed
                        disabled:bg-[#F4F6F5]
                      "
                      placeholder="Ex : Paracétamol"
                    />
                  </div>
                </div>

                {/* PRIX / STOCK */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* PRIX */}
                  <div>
                    <label
                      htmlFor="prix-unitaire"
                      className="
                        mb-1.5
                        block
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.08em]
                        text-[#68756F]
                      "
                    >
                      Prix unitaire
                    </label>

                    <div className="relative">
                      <CircleDollarSign
                        className="
                          pointer-events-none
                          absolute
                          left-3.5
                          top-1/2
                          h-4
                          w-4
                          -translate-y-1/2
                          text-[#687D75]
                        "
                        strokeWidth={1.9}
                      />

                      <input
                        id="prix-unitaire"
                        type="number"
                        min="0"
                        step="0.01"
                        value={prixUnitaire}
                        onChange={(e) =>
                          setPrixUnitaire(
                            e.target.value
                          )
                        }
                        disabled={loading}
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
                          focus:border-[#356B5C]
                          focus:ring-2
                          focus:ring-[#DCE9E4]
                          disabled:cursor-not-allowed
                          disabled:bg-[#F4F6F5]
                        "
                        placeholder="Ex : 2500"
                      />
                    </div>

                    <p className="mt-1.5 text-[8px] font-medium text-[#87928E]">
                      Ancien prix :{" "}
                      {formaterMontant(prixActuel)} Ar
                    </p>
                  </div>

                  {/* STOCK */}
                  <div>
                    <label
                      htmlFor="stock-medicament"
                      className="
                        mb-1.5
                        block
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.08em]
                        text-[#68756F]
                      "
                    >
                      Stock
                    </label>

                    <div className="relative">
                      <Boxes
                        className="
                          pointer-events-none
                          absolute
                          left-3.5
                          top-1/2
                          h-4
                          w-4
                          -translate-y-1/2
                          text-[#687D75]
                        "
                        strokeWidth={1.9}
                      />

                      <input
                        id="stock-medicament"
                        type="number"
                        min="0"
                        step="1"
                        value={stock}
                        onChange={(e) =>
                          setStock(e.target.value)
                        }
                        disabled={loading}
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
                          focus:border-[#356B5C]
                          focus:ring-2
                          focus:ring-[#DCE9E4]
                          disabled:cursor-not-allowed
                          disabled:bg-[#F4F6F5]
                        "
                        placeholder="Ex : 25"
                      />
                    </div>

                    <p className="mt-1.5 text-[8px] font-medium text-[#87928E]">
                      Ancien stock :{" "}
                      {stockActuel} unités
                    </p>
                  </div>
                </div>

                {/* DATE EXPIRATION */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="date-expiration"
                      className="
                        block
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.08em]
                        text-[#68756F]
                      "
                    >
                      Date d'expiration
                    </label>

                    <span className="text-[8px] font-semibold text-[#87928E]">
                      Optionnel
                    </span>
                  </div>

                  <div className="relative">
                    <CalendarDays
                      className="
                        pointer-events-none
                        absolute
                        left-3.5
                        top-1/2
                        h-4
                        w-4
                        -translate-y-1/2
                        text-[#687D75]
                      "
                      strokeWidth={1.9}
                    />

                    <input
                      id="date-expiration"
                      type="date"
                      value={dateExpiration}
                      onChange={(e) =>
                        setDateExpiration(
                          e.target.value
                        )
                      }
                      disabled={loading}
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
                        focus:border-[#356B5C]
                        focus:ring-2
                        focus:ring-[#DCE9E4]
                        disabled:cursor-not-allowed
                        disabled:bg-[#F4F6F5]
                      "
                    />
                  </div>

                  <p className="mt-1.5 text-[8px] font-medium text-[#87928E]">
                    Laissez vide si aucune date
                    d'expiration n'est renseignée.
                  </p>
                </div>

                {/* VARIATION STOCK */}
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    rounded-[9px]
                    border border-[#DDE3E0]
                    bg-[#F4F6F5]
                    px-3.5
                    py-3
                  "
                >
                  <span className="text-[9px] font-semibold text-[#68756F]">
                    Variation du stock
                  </span>

                  <span
                    className={
                      differenceStock > 0
                        ? "text-[10px] font-bold text-[#356B5C]"
                        : differenceStock < 0
                        ? "text-[10px] font-bold text-[#A34A4A]"
                        : "text-[10px] font-bold text-[#68756F]"
                    }
                  >
                    {differenceStock > 0
                      ? `+${differenceStock}`
                      : differenceStock}{" "}
                    unités
                  </span>
                </div>
              </div>

              {/* DROITE : APERÇU */}
              <div
                className="
                  rounded-[12px]
                  border border-[#DDE3E0]
                  bg-[#F4F6F5]
                  p-4
                "
              >
                <div className="flex items-center gap-2">
                  <div
                    className="
                      flex h-8 w-8
                      items-center justify-center
                      rounded-[8px]
                      border border-[#D5E0DB]
                      bg-white
                      text-[#356B5C]
                    "
                  >
                    <CheckCircle2
                      className="h-4 w-4"
                      strokeWidth={1.9}
                    />
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-[#394842]">
                      Aperçu
                    </p>

                    <p className="text-[8px] text-[#87928E]">
                      Nouvelles informations
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {/* NOM */}
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-[#68756F]">
                      Médicament
                    </p>

                    <p className="mt-1 truncate text-[11px] font-bold text-[#394842]">
                      {nom.trim() || "Médicament"}
                    </p>
                  </div>

                  <div className="h-px bg-[#DDE3E0]" />

                  {/* PRIX */}
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-[#68756F]">
                      Prix unitaire
                    </p>

                    <p className="mt-1 text-[14px] font-bold text-[#356B5C]">
                      {formaterMontant(
                        nouveauPrix
                      )}{" "}
                      Ar
                    </p>
                  </div>

                  <div className="h-px bg-[#DDE3E0]" />

                  {/* STOCK */}
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-[#68756F]">
                      Stock
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#68756F]">
                        {stockActuel}
                      </span>

                      <ArrowRight
                        className="h-3.5 w-3.5 text-[#87928E]"
                        strokeWidth={2}
                      />

                      <span className="text-[15px] font-bold text-[#356B5C]">
                        {stock || 0}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-[#DDE3E0]" />

                  {/* EXPIRATION */}
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-[#68756F]">
                      Expiration
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      <CalendarDays
                        className="h-3.5 w-3.5 text-[#687D75]"
                        strokeWidth={1.9}
                      />

                      <span
                        className={
                          dateExpiration
                            ? "text-[10px] font-bold text-[#394842]"
                            : "text-[10px] font-semibold text-[#87928E]"
                        }
                      >
                        {formaterDate(
                          dateExpiration
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-[#DDE3E0]" />

                  {/* ÉTAT */}
                  <div
                    className="
                      rounded-[9px]
                      border border-[#DDE3E0]
                      bg-white
                      px-3
                      py-2.5
                    "
                  >
                    <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-[#68756F]">
                      État du stock
                    </p>

                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className={
                          nouveauStock === 0
                            ? "h-2 w-2 rounded-full bg-[#A34A4A]"
                            : nouveauStock <= 10
                            ? "h-2 w-2 rounded-full bg-[#A47B42]"
                            : "h-2 w-2 rounded-full bg-[#356B5C]"
                        }
                      />

                      <span className="text-[9px] font-bold text-[#394842]">
                        {nouveauStock === 0
                          ? "Rupture"
                          : nouveauStock <= 10
                          ? "Stock faible"
                          : "Disponible"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div
            className="
              flex
              flex-col-reverse
              gap-2
              border-t border-[#E8ECEA]
              bg-[#F4F6F5]
              px-5
              py-4
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
              <X className="h-3.5 w-3.5" />
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
                  Modification...
                </>
              ) : (
                <>
                  <Save
                    className="h-3.5 w-3.5"
                    strokeWidth={2}
                  />
                  Enregistrer
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