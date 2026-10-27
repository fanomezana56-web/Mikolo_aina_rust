import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  X,
  UserPlus,
  Save,
  Loader2,
  UserRound,
  CalendarDays,
  Phone,
  MapPin,
  VenusAndMars,
  AlertCircle,
  ShieldCheck,
  FileText,
  ChevronDown,
  CheckCircle2,
  IdCard,
  UserPen,
} from "lucide-react";

export default function PatientForm({
  patient = null,
  onClose,
  onSuccess,
}) {
  const modeModification = Boolean(patient);

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [sexe, setSexe] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (patient) {
      setNom(patient.nom || "");
      setPrenom(patient.prenom || "");
      setDateNaissance(patient.date_naissance || "");
      setSexe(patient.sexe || "");
      setTelephone(patient.telephone || "");
      setAdresse(patient.adresse || "");
    } else {
      setNom("");
      setPrenom("");
      setDateNaissance("");
      setSexe("");
      setTelephone("");
      setAdresse("");
    }

    setError("");
  }, [patient]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!nom.trim()) {
      setError("Le nom du patient est obligatoire.");
      return;
    }

    try {
      setLoading(true);

      const data = {
        nom: nom.trim(),
        prenom: prenom.trim() || null,
        date_naissance: dateNaissance || null,
        sexe: sexe || null,
        telephone: telephone.trim() || null,
        adresse: adresse.trim() || null,
      };

      let result;

      if (modeModification) {
        result = await invoke("modifier_patient", {
          data: {
            id: patient.id,
            ...data,
          },
        });
      } else {
        result = await invoke("ajouter_patient", {
          data,
        });
      }

      onSuccess?.(result);
    } catch (err) {
      console.error(err);

      setError(
        typeof err === "string"
          ? err
          : "Une erreur est survenue lors de l'enregistrement."
      );
    } finally {
      setLoading(false);
    }
  };

  const formulaireValide = nom.trim() !== "";

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        bg-[#26332F]/30
        p-3
        backdrop-blur-[2px]
        sm:p-5
        animate-[fadeIn_150ms_ease-out]
      "
    >
      <div
        className="
          relative
          flex
          max-h-[calc(100vh-24px)]
          w-full
          max-w-[820px]
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
            sm:px-6
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
                {modeModification ? (
                  <UserPen
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.9}
                  />
                ) : (
                  <UserPlus
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.9}
                  />
                )}
              </div>

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <h2 className="text-[16px] font-bold text-[#394842] sm:text-[17px]">
                    {modeModification
                      ? "Modifier le patient"
                      : "Nouveau patient"}
                  </h2>

                  <span
                    className="
                      hidden
                      items-center gap-1
                      rounded-full
                      border border-[#C9DCD4]
                      bg-[#F1F6F4]
                      px-2 py-0.5
                      text-[7px]
                      font-bold
                      uppercase
                      tracking-[0.1em]
                      text-[#356B5C]
                      sm:inline-flex
                    "
                  >
                    <FileText className="h-2.5 w-2.5" />
                    Dossier patient
                  </span>
                </div>

                <p className="mt-0.5 text-[9px] leading-4 text-[#68756F] sm:text-[10px]">
                  {modeModification
                    ? "Mettez à jour les informations enregistrées dans le dossier."
                    : "Enregistrez les informations administratives du patient."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Fermer"
              title="Fermer"
              className="
                flex h-8 w-8 shrink-0
                items-center justify-center
                rounded-[8px]
                border border-[#DDE3E0]
                bg-white
                text-[#87928E]
                transition-all
                hover:border-[#C9DCD4]
                hover:bg-[#F1F6F4]
                hover:text-[#356B5C]
                active:scale-95
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <X className="h-4 w-4" strokeWidth={1.9} />
            </button>

          </div>

          {/* Ligne d'information */}

          <div
            className="
              mt-4
              flex
              flex-wrap
              items-center
              gap-x-4
              gap-y-2
              border-t border-[#E8ECEA]
              pt-3
            "
          >
            <div className="flex items-center gap-1.5">

              <ShieldCheck
                className="h-3 w-3 text-[#356B5C]"
                strokeWidth={1.9}
              />

              <span className="text-[8px] font-medium text-[#68756F]">
                Informations sécurisées
              </span>
            </div>

            <div className="flex items-center gap-1.5">

              <IdCard
                className="h-3 w-3 text-[#68756F]"
                strokeWidth={1.8}
              />

              <span className="text-[8px] font-medium text-[#68756F]">
                Dossier administratif
              </span>
            </div>

            {modeModification && patient?.id && (
              <div className="flex items-center gap-1.5">

                <span className="text-[8px] text-[#87928E]">
                  ID
                </span>

                <span className="max-w-[160px] truncate rounded-[5px] border border-[#DDE3E0] bg-white px-1.5 py-0.5 font-mono text-[7px] text-[#68756F]">
                  {patient.id}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================
            FORMULAIRE
        ====================================================== */}

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >

          <div className="min-h-0 flex-1 overflow-y-auto">

            <div className="space-y-5 p-4 sm:p-6">

              {/* =================================================
                  ERREUR
              ================================================== */}

              {error && (
                <div
                  className="
                    flex items-start gap-2.5
                    rounded-[9px]
                    border border-[#E7CFCF]
                    bg-[#FBF5F5]
                    px-3 py-2.5
                  "
                >
                  <div
                    className="
                      flex h-7 w-7 shrink-0
                      items-center justify-center
                      rounded-[7px]
                      border border-[#E7CFCF]
                      bg-white
                    "
                  >
                    <AlertCircle
                      className="h-4 w-4 text-[#A34A4A]"
                      strokeWidth={1.9}
                    />
                  </div>

                  <div>

                    <p className="text-[9px] font-bold text-[#A34A4A]">
                      Impossible d'enregistrer
                    </p>

                    <p className="mt-0.5 text-[9px] leading-4 text-[#A34A4A]">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* =================================================
                  IDENTIFICATION
              ================================================== */}

              <section>

                <div className="mb-3 flex items-center gap-2">

                  <div
                    className="
                      flex h-7 w-7
                      items-center justify-center
                      rounded-[8px]
                      border border-[#DDE3E0]
                      bg-[#F4F6F5]
                      text-[#356B5C]
                    "
                  >
                    <UserRound
                      className="h-3.5 w-3.5"
                      strokeWidth={1.8}
                    />
                  </div>

                  <div>

                    <h3 className="text-[10px] font-bold text-[#394842]">
                      Identification
                    </h3>

                    <p className="text-[8px] text-[#87928E]">
                      Identité principale du patient
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  {/* NOM */}

                  <div>

                    <label
                      htmlFor="patient-nom"
                      className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.04em] text-[#68756F]"
                    >
                      Nom
                      <span className="ml-1 text-[#A34A4A]">
                        *
                      </span>
                    </label>

                    <div className="relative">

                      <UserRound
                        className="
                          pointer-events-none
                          absolute left-3 top-1/2
                          h-3.5 w-3.5
                          -translate-y-1/2
                          text-[#87928E]
                        "
                        strokeWidth={1.8}
                      />

                      <input
                        id="patient-nom"
                        type="text"
                        value={nom}
                        onChange={(e) =>
                          setNom(e.target.value)
                        }
                        placeholder="Nom du patient"
                        disabled={loading}
                        autoFocus
                        className="
                          h-11
                          w-full
                          rounded-[9px]
                          border border-[#D6DEDA]
                          bg-white
                          pl-9 pr-3
                          text-[11px]
                          font-medium
                          text-[#394842]
                          outline-none
                          transition-all
                          placeholder:text-[#87928E]
                          hover:border-[#BFCBC6]
                          focus:border-[#356B5C]
                          focus:ring-4
                          focus:ring-[#DCE9E4]
                          disabled:cursor-not-allowed
                          disabled:bg-[#F4F6F5]
                          disabled:opacity-60
                        "
                      />
                    </div>

                    <p className="mt-1 text-[7.5px] text-[#87928E]">
                      Champ obligatoire
                    </p>
                  </div>

                  {/* PRÉNOM */}

                  <div>

                    <label
                      htmlFor="patient-prenom"
                      className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.04em] text-[#68756F]"
                    >
                      Prénom
                    </label>

                    <div className="relative">

                      <UserRound
                        className="
                          pointer-events-none
                          absolute left-3 top-1/2
                          h-3.5 w-3.5
                          -translate-y-1/2
                          text-[#87928E]
                        "
                        strokeWidth={1.8}
                      />

                      <input
                        id="patient-prenom"
                        type="text"
                        value={prenom}
                        onChange={(e) =>
                          setPrenom(e.target.value)
                        }
                        placeholder="Prénom du patient"
                        disabled={loading}
                        className="
                          h-11
                          w-full
                          rounded-[9px]
                          border border-[#D6DEDA]
                          bg-white
                          pl-9 pr-3
                          text-[11px]
                          text-[#394842]
                          outline-none
                          transition-all
                          placeholder:text-[#87928E]
                          hover:border-[#BFCBC6]
                          focus:border-[#356B5C]
                          focus:ring-4
                          focus:ring-[#DCE9E4]
                          disabled:cursor-not-allowed
                          disabled:bg-[#F4F6F5]
                          disabled:opacity-60
                        "
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* SEPARATEUR */}

              <div className="h-px bg-[#E8ECEA]" />

              {/* =================================================
                  INFORMATIONS PERSONNELLES
              ================================================== */}

              <section>

                <div className="mb-3 flex items-center gap-2">

                  <div
                    className="
                      flex h-7 w-7
                      items-center justify-center
                      rounded-[8px]
                      border border-[#DDE3E0]
                      bg-[#F4F6F5]
                      text-[#356B5C]
                    "
                  >
                    <CalendarDays
                      className="h-3.5 w-3.5"
                      strokeWidth={1.8}
                    />
                  </div>

                  <div>

                    <h3 className="text-[10px] font-bold text-[#394842]">
                      Informations personnelles
                    </h3>

                    <p className="text-[8px] text-[#87928E]">
                      Informations complémentaires du dossier
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  {/* DATE */}

                  <div>

                    <label
                      htmlFor="patient-date-naissance"
                      className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.04em] text-[#68756F]"
                    >
                      Date de naissance
                    </label>

                    <div className="relative">

                      <CalendarDays
                        className="
                          pointer-events-none
                          absolute left-3 top-1/2
                          h-3.5 w-3.5
                          -translate-y-1/2
                          text-[#87928E]
                        "
                        strokeWidth={1.8}
                      />

                      <input
                        id="patient-date-naissance"
                        type="date"
                        value={dateNaissance}
                        onChange={(e) =>
                          setDateNaissance(e.target.value)
                        }
                        disabled={loading}
                        className="
                          h-11
                          w-full
                          rounded-[9px]
                          border border-[#D6DEDA]
                          bg-white
                          pl-9 pr-3
                          text-[11px]
                          text-[#394842]
                          outline-none
                          transition-all
                          hover:border-[#BFCBC6]
                          focus:border-[#356B5C]
                          focus:ring-4
                          focus:ring-[#DCE9E4]
                          disabled:cursor-not-allowed
                          disabled:bg-[#F4F6F5]
                          disabled:opacity-60
                        "
                      />
                    </div>
                  </div>

                  {/* SEXE */}

                  <div>

                    <label
                      htmlFor="patient-sexe"
                      className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.04em] text-[#68756F]"
                    >
                      Sexe
                    </label>

                    <div className="relative">

                      <VenusAndMars
                        className="
                          pointer-events-none
                          absolute left-3 top-1/2
                          z-10
                          h-3.5 w-3.5
                          -translate-y-1/2
                          text-[#87928E]
                        "
                        strokeWidth={1.8}
                      />

                      <select
                        id="patient-sexe"
                        value={sexe}
                        onChange={(e) =>
                          setSexe(e.target.value)
                        }
                        disabled={loading}
                        className="
                          h-11
                          w-full
                          appearance-none
                          rounded-[9px]
                          border border-[#D6DEDA]
                          bg-white
                          pl-9 pr-9
                          text-[11px]
                          text-[#394842]
                          outline-none
                          transition-all
                          hover:border-[#BFCBC6]
                          focus:border-[#356B5C]
                          focus:ring-4
                          focus:ring-[#DCE9E4]
                          disabled:cursor-not-allowed
                          disabled:bg-[#F4F6F5]
                          disabled:opacity-60
                        "
                      >
                        <option value="">
                          Sélectionner le sexe
                        </option>

                        <option value="Masculin">
                          Masculin
                        </option>

                        <option value="Féminin">
                          Féminin
                        </option>
                      </select>

                      <ChevronDown
                        className="
                          pointer-events-none
                          absolute right-3 top-1/2
                          h-3.5 w-3.5
                          -translate-y-1/2
                          text-[#87928E]
                        "
                        strokeWidth={1.8}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* SEPARATEUR */}

              <div className="h-px bg-[#E8ECEA]" />

              {/* =================================================
                  COORDONNÉES
              ================================================== */}

              <section>

                <div className="mb-3 flex items-center gap-2">

                  <div
                    className="
                      flex h-7 w-7
                      items-center justify-center
                      rounded-[8px]
                      border border-[#DDE3E0]
                      bg-[#F4F6F5]
                      text-[#356B5C]
                    "
                  >
                    <Phone
                      className="h-3.5 w-3.5"
                      strokeWidth={1.8}
                    />
                  </div>

                  <div>

                    <h3 className="text-[10px] font-bold text-[#394842]">
                      Coordonnées
                    </h3>

                    <p className="text-[8px] text-[#87928E]">
                      Informations permettant de contacter le patient
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  {/* TÉLÉPHONE */}

                  <div>

                    <label
                      htmlFor="patient-telephone"
                      className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.04em] text-[#68756F]"
                    >
                      Téléphone
                    </label>

                    <div className="relative">

                      <Phone
                        className="
                          pointer-events-none
                          absolute left-3 top-1/2
                          h-3.5 w-3.5
                          -translate-y-1/2
                          text-[#87928E]
                        "
                        strokeWidth={1.8}
                      />

                      <input
                        id="patient-telephone"
                        type="tel"
                        value={telephone}
                        onChange={(e) =>
                          setTelephone(e.target.value)
                        }
                        placeholder="Ex. : 034 00 000 00"
                        disabled={loading}
                        className="
                          h-11
                          w-full
                          rounded-[9px]
                          border border-[#D6DEDA]
                          bg-white
                          pl-9 pr-3
                          text-[11px]
                          text-[#394842]
                          outline-none
                          transition-all
                          placeholder:text-[#87928E]
                          hover:border-[#BFCBC6]
                          focus:border-[#356B5C]
                          focus:ring-4
                          focus:ring-[#DCE9E4]
                          disabled:cursor-not-allowed
                          disabled:bg-[#F4F6F5]
                          disabled:opacity-60
                        "
                      />
                    </div>
                  </div>

                  {/* ADRESSE */}

                  <div>

                    <label
                      htmlFor="patient-adresse"
                      className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.04em] text-[#68756F]"
                    >
                      Adresse
                    </label>

                    <div className="relative">

                      <MapPin
                        className="
                          pointer-events-none
                          absolute left-3 top-3.5
                          h-3.5 w-3.5
                          text-[#87928E]
                        "
                        strokeWidth={1.8}
                      />

                      <textarea
                        id="patient-adresse"
                        value={adresse}
                        onChange={(e) =>
                          setAdresse(e.target.value)
                        }
                        placeholder="Adresse du patient"
                        rows={1}
                        disabled={loading}
                        className="
                          min-h-[44px]
                          w-full
                          resize-none
                          rounded-[9px]
                          border border-[#D6DEDA]
                          bg-white
                          py-3 pl-9 pr-3
                          text-[11px]
                          text-[#394842]
                          outline-none
                          transition-all
                          placeholder:text-[#87928E]
                          hover:border-[#BFCBC6]
                          focus:border-[#356B5C]
                          focus:ring-4
                          focus:ring-[#DCE9E4]
                          disabled:cursor-not-allowed
                          disabled:bg-[#F4F6F5]
                          disabled:opacity-60
                        "
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* =================================================
                  APERÇU
              ================================================== */}

              <div
                className="
                  rounded-[10px]
                  border border-[#DDE3E0]
                  bg-[#F4F6F5]
                  px-3 py-3
                "
              >
                <div className="flex items-center justify-between gap-3">

                  <div className="flex min-w-0 items-center gap-2">

                    <div
                      className="
                        flex h-7 w-7 shrink-0
                        items-center justify-center
                        rounded-[7px]
                        border border-[#DDE3E0]
                        bg-white
                        text-[#356B5C]
                      "
                    >
                      <UserRound
                        className="h-3.5 w-3.5"
                        strokeWidth={1.8}
                      />
                    </div>

                    <div className="min-w-0">

                      <p className="text-[7px] font-bold uppercase tracking-[0.1em] text-[#87928E]">
                        Aperçu du dossier
                      </p>

                      <p className="truncate text-[10px] font-bold text-[#394842]">
                        {nom.trim() || "Nom du patient"}
                        {prenom.trim()
                          ? ` ${prenom.trim()}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {formulaireValide ? (
                    <span
                      className="
                        inline-flex shrink-0
                        items-center gap-1
                        rounded-full
                        border border-[#C9DCD4]
                        bg-[#F1F6F4]
                        px-2 py-1
                        text-[7px]
                        font-bold
                        text-[#356B5C]
                      "
                    >
                      <CheckCircle2
                        className="h-3 w-3"
                        strokeWidth={2}
                      />
                      Prêt
                    </span>
                  ) : (
                    <span
                      className="
                        shrink-0
                        rounded-full
                        border border-[#DDE3E0]
                        bg-white
                        px-2 py-1
                        text-[7px]
                        font-semibold
                        text-[#87928E]
                      "
                    >
                      Nom requis
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* =====================================================
              FOOTER
          ====================================================== */}

          <div
            className="
              shrink-0
              border-t border-[#E8ECEA]
              bg-white
              px-4 py-3
              sm:px-6
            "
          >
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-center text-[8px] leading-4 text-[#87928E] sm:text-left">
                <span className="font-semibold text-[#A34A4A]">
                  *
                </span>{" "}
                Le nom du patient est obligatoire.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">

                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="
                    inline-flex
                    h-10
                    items-center
                    justify-center
                    rounded-[8px]
                    border border-[#DDE3E0]
                    bg-white
                    px-4
                    text-[10px]
                    font-semibold
                    text-[#68756F]
                    transition-all
                    hover:border-[#C9DCD4]
                    hover:bg-[#F1F6F4]
                    hover:text-[#356B5C]
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={loading || !formulaireValide}
                  className="
                    inline-flex
                    h-10
                    items-center
                    justify-center
                    gap-2
                    rounded-[8px]
                    bg-[#356B5C]
                    px-5
                    text-[10px]
                    font-semibold
                    text-white
                    transition-all
                    hover:bg-[#2D5D50]
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:bg-[#B8C5C0]
                  "
                >
                  {loading ? (
                    <>
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        strokeWidth={2}
                      />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save
                        className="h-3.5 w-3.5"
                        strokeWidth={2}
                      />

                      {modeModification
                        ? "Enregistrer les modifications"
                        : "Créer le patient"}
                    </>
                  )}
                </button>

              </div>
            </div>
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