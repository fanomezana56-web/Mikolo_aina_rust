
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { signalerChangementSoldeCentre } from "../../utiles/actualiserSoldeCentre";

import {
  ReceiptText,
  Save,
  AlertCircle,
  CheckCircle2,
  FileText,
  Coins,
  LoaderCircle,
} from "lucide-react";

const formaterMontant = (montant) =>
  `${Number(montant || 0).toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  })} Ar`;

export default function SortieDiversForm({ onSuccess }) {
  const [motif, setMotif] = useState("");
  const [montant, setMontant] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  const montantNumerique = Number(montant);

  const montantValide =
    montant.trim() !== "" &&
    Number.isFinite(montantNumerique) &&
    montantNumerique > 0;

  const enregistrer = async (e) => {
    e.preventDefault();
    setMessage("");
    setErreur("");

    if (enregistrement) return;

    if (!motif.trim()) {
      setErreur("Veuillez renseigner le motif de la dépense.");
      return;
    }

    if (!montantValide) {
      setErreur("Le montant doit être supérieur à 0.");
      return;
    }

    setEnregistrement(true);

    try {
      const resultat = await invoke("enregistrer_sortie_diverse", {
        data: {
          motif: motif.trim(),
          montant: montantNumerique,
        },
      });

      signalerChangementSoldeCentre();

      setMessage(
        `Dépense enregistrée : ${formaterMontant(
          resultat?.montant ?? montantNumerique
        )}`
      );

      setMotif("");
      setMontant("");

      if (onSuccess) {
        await onSuccess();
      }
    } catch (error) {
      console.error(
        "Erreur lors de l'enregistrement de la sortie diverse :",
        error
      );

      setErreur(
        error?.toString() ||
          "Impossible d'enregistrer la dépense. Veuillez réessayer."
      );
    } finally {
      setEnregistrement(false);
    }
  };

  return (
    <section className="w-full rounded-xl border border-[#E5EDE7] bg-white p-4 text-[#30453B] sm:p-5">
      {/* En-tête */}
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DDECE2] bg-[#EDF5F0] text-[#438B74]">
          <ReceiptText size={19} strokeWidth={1.8} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-[#293D34]">
            Nouvelle sortie diverse
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-[#78877D]">
            Enregistrez les dépenses du centre de santé.
          </p>
        </div>

        <span className="shrink-0 rounded-md bg-[#F3F7F4] px-2 py-1 text-[10px] font-semibold text-[#438B74]">
          Dépense
        </span>
      </header>

      {/* Messages */}
      {erreur && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-lg border border-[#F3D9D5] bg-[#FFF5F3] px-3 py-2.5 text-xs text-[#A74C43]"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{erreur}</span>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mb-3 flex items-start gap-2 rounded-lg border border-[#D8EBDD] bg-[#F1F8F2] px-3 py-2.5 text-xs text-[#34765F]"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{message}</span>
        </div>
      )}

      <form onSubmit={enregistrer} className="space-y-4">
        {/* Motif */}
        <div>
          <label
            htmlFor="sortie-motif"
            className="mb-1.5 block text-xs font-semibold text-[#405449]"
          >
            Motif de la dépense
            <span className="ml-1 text-[#D16D64]">*</span>
          </label>

          <div className="flex min-h-10 items-center gap-2.5 rounded-lg border border-[#E1E9E3] bg-[#FAFCFA] px-3 transition-colors focus-within:border-[#438B74] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#438B74]/10">
            <FileText
              size={16}
              className="shrink-0 text-[#438B74]"
            />

            <input
              id="sortie-motif"
              type="text"
              value={motif}
              onChange={(e) => {
                setMotif(e.target.value);
                setErreur("");
                setMessage("");
              }}
              placeholder="Ex. : Eléctricité, entretien..."
              maxLength={255}
              autoComplete="off"
              required
              disabled={enregistrement}
              className="h-10 min-w-0 flex-1 bg-transparent text-xs text-[#30453B] outline-none placeholder:text-[#9AA69E] disabled:cursor-not-allowed"
            />
          </div>

          <p className="mt-1 text-[10px] text-[#929D95]">
            Décrivez brièvement la raison de la dépense.
          </p>
        </div>

        {/* Montant */}
        <div>
          <label
            htmlFor="sortie-montant"
            className="mb-1.5 block text-xs font-semibold text-[#405449]"
          >
            Montant de la dépense
            <span className="ml-1 text-[#D16D64]">*</span>
          </label>

          <div className="flex min-h-11 items-center gap-2.5 rounded-lg border border-[#E1E9E3] bg-[#FAFCFA] px-3 transition-colors focus-within:border-[#438B74] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#438B74]/10">
            <Coins size={17} className="shrink-0 text-[#438B74]" />

            <input
              id="sortie-montant"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={montant}
              onChange={(e) => {
                setMontant(e.target.value);
                setErreur("");
                setMessage("");
              }}
              placeholder="0"
              required
              disabled={enregistrement}
              className="h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums text-[#293D34] outline-none placeholder:text-[#9AA69E] disabled:cursor-not-allowed"
            />

            <span className="rounded-md bg-[#EDF5F0] px-2 py-1 text-[11px] font-bold text-[#438B74]">
              Ar
            </span>
          </div>
        </div>

        {/* Récapitulatif */}
        <div className="rounded-lg border border-[#E2ECE5] bg-[#F7FAF7] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#68796E]">
              <ReceiptText size={15} className="text-[#438B74]" />
              <span>Total de la dépense</span>
            </div>

            <span className="text-sm font-bold tabular-nums text-[#28594B]">
              {formaterMontant(montantValide ? montantNumerique : 0)}
            </span>
          </div>

          <p className="mt-1.5 text-[10px] leading-relaxed text-[#87938A]">
            Cette dépense sera prise en compte dans les sorties du centre.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF1ED] pt-3">
          <p className="text-[10px] text-[#929D95]">
            <span className="font-bold text-[#D16D64]">*</span>{" "}
            Champs obligatoires
          </p>

          <button
            type="submit"
            disabled={enregistrement}
            className="inline-flex h-10  items-center justify-center gap-2 rounded-lg bg-[#438B74] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#34765F] focus:outline-none focus:ring-2 focus:ring-[#438B74]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enregistrement ? (
              <>
                <LoaderCircle size={15} className="animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
