import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  UserPlus,
  UserRound,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  Phone,
  CalendarDays,
  UsersRound,
  AlertCircle,
  VenusAndMars,
  UserCheck,
  ChevronDown,
  Search,
  ShieldCheck,
  CircleUserRound,
} from "lucide-react";

import PatientForm from "./PatientForm";

export default function PatientSelector({
  patientSelectionne,
  setPatientSelectionne,
}) {
  const [patients, setPatients] = useState([]);
  const [recherche, setRecherche] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectOuvert, setSelectOuvert] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [patientAModifier, setPatientAModifier] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [patientASupprimer, setPatientASupprimer] = useState(null);

  const selectRef = useRef(null);

  // =========================================================
  // CHARGER LES PATIENTS
  // =========================================================

  const chargerPatients = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await invoke("obtenir_patients");

      setPatients(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error(err);

      setError(
        typeof err === "string"
          ? err
          : "Impossible de charger les patients."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerPatients();
  }, []);

  // =========================================================
  // FERMER LE SELECT À L'EXTÉRIEUR
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target)
      ) {
        setSelectOuvert(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // =========================================================
  // FERMER AVEC ESC
  // =========================================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectOuvert(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // =========================================================
  // HELPERS
  // =========================================================

  const nomComplet = (patient) => {
    return `${patient?.nom || ""} ${patient?.prenom || ""}`.trim();
  };

  const initiales = (patient) => {
    const nom =
      patient?.nom?.trim()?.charAt(0) || "";

    const prenom =
      patient?.prenom?.trim()?.charAt(0) || "";

    return `${nom}${prenom}`.toUpperCase() || "?";
  };

  const formaterDate = (date) => {
    if (!date) return null;

    const valeur = String(date).slice(0, 10);

    const [annee, mois, jour] = valeur.split("-");

    if (!annee || !mois || !jour) {
      return valeur;
    }

    return `${jour}/${mois}/${annee}`;
  };

  // =========================================================
  // RECHERCHE LOCALE
  // =========================================================

  const patientsFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    const patientsTries = [...patients].sort((a, b) =>
      nomComplet(a).localeCompare(
        nomComplet(b),
        "fr",
        {
          sensitivity: "base",
        }
      )
    );

    if (!terme) {
      return patientsTries;
    }

    return patientsTries.filter((patient) => {
      const texte = `
        ${patient?.nom || ""}
        ${patient?.prenom || ""}
        ${patient?.telephone || ""}
        ${patient?.adresse || ""}
        ${patient?.sexe || ""}
      `.toLowerCase();

      return texte.includes(terme);
    });
  }, [patients, recherche]);

  // =========================================================
  // SÉLECTIONNER
  // =========================================================

  const selectionnerPatient = (patient) => {
    setPatientSelectionne?.(patient);

    setSelectOuvert(false);
    setRecherche("");
    setError("");
  };

  // =========================================================
  // NOUVEAU PATIENT
  // =========================================================

  const ouvrirNouveauPatient = () => {
    setPatientAModifier(null);
    setShowForm(true);
    setError("");
    setSelectOuvert(false);
  };

  // =========================================================
  // MODIFIER
  // =========================================================

  const ouvrirModification = (patient) => {
    if (!patient) return;

    setPatientAModifier(patient);
    setShowForm(true);
    setError("");
    setSelectOuvert(false);
  };

  // =========================================================
  // APRÈS SAUVEGARDE
  // =========================================================

  const handlePatientSaved = async (patient) => {
    await chargerPatients();

    setPatientSelectionne?.(patient);

    setShowForm(false);
    setPatientAModifier(null);
    setSelectOuvert(false);
    setRecherche("");
  };

  // =========================================================
  // DEMANDER SUPPRESSION
  // =========================================================

  const demanderSuppression = (patient) => {
    if (!patient) return;

    setPatientASupprimer(patient);
    setShowDeleteConfirm(true);
    setError("");
    setSelectOuvert(false);
  };

  // =========================================================
  // SUPPRIMER
  // =========================================================

  const supprimerPatient = async () => {
    if (!patientASupprimer) return;

    try {
      setLoading(true);
      setError("");

      await invoke("supprimer_patient", {
        id: patientASupprimer.id,
      });

      if (
        patientSelectionne &&
        String(patientSelectionne.id) ===
          String(patientASupprimer.id)
      ) {
        setPatientSelectionne?.(null);
      }

      setShowDeleteConfirm(false);
      setPatientASupprimer(null);

      await chargerPatients();
    } catch (err) {
      console.error(err);

      setError(
        typeof err === "string"
          ? err
          : "Impossible de supprimer ce patient."
      );

      setShowDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* =====================================================
          SECTION PRINCIPALE
      ===================================================== */}

      <section
        className="
          bg-white
          shadow-[0_4px_18px_rgba(38,51,47,0.04)]
        "
      >
        {/* ===================================================
            HEADER
        =================================================== */}

        <div
          className="
            border-b
            border-[#E8ECEA]
           bg-[#F7FAF8]
           border-[#F7FAF8]
           rounded-[7px]
            px-4
            py-3.5
            sm:px-5
          "
        >
          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-[8px]
                  border
                  border-[#D5E0DB]
                  bg-white
                "
              >
                <UsersRound className="h-4 w-4 text-[#356B5C]" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2
                    className="
                      text-[13px]
                      font-bold
                      text-[#394842]
                    "
                  >
                    Patient
                  </h2>

                  <span
                    className="
                      rounded-full
                      border
                      border-[#DDE3E0]
                      bg-white
                      px-1.5
                      py-0.5
                      text-[8px]
                      font-semibold
                      text-[#68756F]
                    "
                  >
                    {patients.length}
                  </span>
                </div>

                <p
                  className="
                    mt-0.5
                    text-[9px]
                    text-[#87928E]
                  "
                >
                  Sélectionnez le patient concerné.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={ouvrirNouveauPatient}
              className="
                flex
                h-9
                items-center
                justify-center
                gap-1.5
                rounded-[8px]
                bg-[#356B5C]
                px-3.5
                text-[9px]
                font-semibold
                text-white
                shadow-[0_3px_10px_rgba(53,107,92,0.15)]
                transition
                hover:bg-[#2D5D50]
                active:scale-[0.98]
              "
            >
              <UserPlus className="h-3.5 w-3.5" />

              Nouveau patient
            </button>
          </div>
        </div>

        {/* ===================================================
            CONTENU
        =================================================== */}

        <div className="rounded-b-[12px] p-4 sm:p-5">
          <div
            ref={selectRef}
            className="relative"
          >
            {/* LABEL */}

            <div
              className="
                mb-1.5
                flex
                items-center
                justify-between
              "
            >
              <label
                className="
                  flex
                  items-center
                  gap-1.5
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-[#68756F]
                "
              >
                <UserCheck
                  className="
                    h-3.5
                    w-3.5
                    text-[#356B5C]
                  "
                />

                Patient
              </label>

              {patientSelectionne && (
                <span
                  className="
                    inline-flex
                    items-center
                    gap-1
                    rounded-full
                    border
                    border-[#C9DCD4]
                    bg-[#EAF3EF]
                    px-2
                    py-0.5
                    text-[7px]
                    font-semibold
                    text-[#356B5C]
                  "
                >
                  <Check className="h-2.5 w-2.5" />
                  Sélectionné
                </span>
              )}
            </div>

            {/* =================================================
                BOUTON DU SELECT
            ================================================= */}

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                setSelectOuvert((value) => !value)
              }
              className={`
                group
                relative
                flex
                min-h-[74px]
                w-full
                items-center
                gap-3
                rounded-[10px]
                border
                bg-white
                px-3.5
                py-2.5
                text-left
                outline-none
                transition-all
                duration-200
                ${
                  selectOuvert
                    ? "border-[#356B5C] ring-4 ring-[#DCE9E4] shadow-[0_6px_20px_rgba(53,107,92,0.10)]"
                    : "border-[#D6DEDA] hover:border-[#BFCBC6] hover:shadow-[0_4px_14px_rgba(38,51,47,0.05)]"
                }
                ${
                  loading
                    ? "cursor-not-allowed bg-[#F4F6F5]"
                    : ""
                }
              `}
            >
              {patientSelectionne ? (
                <>
                  <div
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-[#C9DCD4]
                      bg-[#EAF3EF]
                      text-[11px]
                      font-bold
                      text-[#356B5C]
                      shadow-[0_2px_6px_rgba(53,107,92,0.08)]
                    "
                  >
                    {initiales(patientSelectionne)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="
                          truncate
                          text-[11px]
                          font-bold
                          text-[#394842]
                        "
                      >
                        {nomComplet(patientSelectionne)}
                      </span>

                      <span
                        className="
                          inline-flex
                          items-center
                          gap-1
                          rounded-full
                          border
                          border-[#C9DCD4]
                          bg-[#F1F6F4]
                          px-1.5
                          py-0.5
                          text-[7px]
                          font-semibold
                          text-[#356B5C]
                        "
                      >
                        <ShieldCheck className="h-2.5 w-2.5" />
                        Patient
                      </span>
                    </div>

                    <div
                      className="
                        mt-1.5
                        flex
                        flex-wrap
                        gap-x-3
                        gap-y-1
                      "
                    >
                      {patientSelectionne.telephone && (
                        <span
                          className="
                            flex
                            items-center
                            gap-1
                            text-[8px]
                            text-[#68756F]
                          "
                        >
                          <Phone
                            className="
                              h-3
                              w-3
                              text-[#356B5C]
                            "
                          />

                          {patientSelectionne.telephone}
                        </span>
                      )}

                      {patientSelectionne.date_naissance && (
                        <span
                          className="
                            flex
                            items-center
                            gap-1
                            text-[8px]
                            text-[#68756F]
                          "
                        >
                          <CalendarDays
                            className="
                              h-3
                              w-3
                              text-[#356B5C]
                            "
                          />

                          {formaterDate(
                            patientSelectionne.date_naissance
                          )}
                        </span>
                      )}

                      {patientSelectionne.sexe && (
                        <span
                          className="
                            flex
                            items-center
                            gap-1
                            text-[8px]
                            text-[#68756F]
                          "
                        >
                          <VenusAndMars
                            className="
                              h-3
                              w-3
                              text-[#356B5C]
                            "
                          />

                          {patientSelectionne.sexe}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-dashed
                      border-[#C9DCD4]
                      bg-[#F4F6F5]
                    "
                  >
                    <CircleUserRound
                      className="
                        h-5
                        w-5
                        text-[#87928E]
                      "
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="
                        text-[10px]
                        font-semibold
                        text-[#394842]
                      "
                    >
                      Aucun patient sélectionné
                    </p>

                    <p
                      className="
                        mt-1
                        text-[8px]
                        text-[#87928E]
                      "
                    >
                      Cliquez pour rechercher et
                      sélectionner un patient.
                    </p>
                  </div>
                </>
              )}

              <div
                className={`
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-[7px]
                  border
                  border-[#DDE3E0]
                  bg-[#F4F6F5]
                  text-[#68756F]
                  transition-transform
                  duration-200
                  ${
                    selectOuvert
                      ? "rotate-180 bg-[#EAF3EF] text-[#356B5C]"
                      : ""
                  }
                `}
              >
                <ChevronDown className="h-4 w-4" />
              </div>
            </button>

            {/* =================================================
                DROPDOWN
            ================================================= */}

            {selectOuvert && (
              <div
                className="
                  absolute
                  left-0
                  right-0
                  top-full
                  z-50
                  mt-2
                  overflow-hidden
                  rounded-[11px]
                  border
                  border-[#D6DEDA]
                  bg-white
                  shadow-[0_18px_45px_rgba(38,51,47,0.14)]
                "
              >
                {/* RECHERCHE */}

                <div
                  className="
                    border-b
                    border-[#E8ECEA]
                    bg-[#F4F6F5]
                    p-2.5
                  "
                >
                  <div className="relative">
                    <Search
                      className="
                        pointer-events-none
                        absolute
                        left-3
                        top-1/2
                        h-3.5
                        w-3.5
                        -translate-y-1/2
                        text-[#87928E]
                      "
                    />

                    <input
                      autoFocus
                      type="text"
                      value={recherche}
                      onChange={(e) =>
                        setRecherche(e.target.value)
                      }
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                      placeholder="Rechercher un patient..."
                      className="
                        h-9
                        w-full
                        rounded-[8px]
                        border
                        border-[#D6DEDA]
                        bg-white
                        pl-9
                        pr-8
                        text-[9px]
                        text-[#394842]
                        outline-none
                        transition
                        placeholder:text-[#A0AAA5]
                        focus:border-[#356B5C]
                        focus:ring-2
                        focus:ring-[#DCE9E4]
                      "
                    />

                    {recherche && (
                      <button
                        type="button"
                        onClick={() =>
                          setRecherche("")
                        }
                        className="
                          absolute
                          right-2
                          top-1/2
                          flex
                          h-6
                          w-6
                          -translate-y-1/2
                          items-center
                          justify-center
                          rounded-full
                          text-[#87928E]
                          transition
                          hover:bg-[#EAF3EF]
                          hover:text-[#356B5C]
                        "
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div
                    className="
                      mt-2
                      flex
                      items-center
                      justify-between
                      px-1
                    "
                  >
                    <span
                      className="
                        flex
                        items-center
                        gap-1
                        text-[7px]
                        font-semibold
                        uppercase
                        tracking-[0.06em]
                        text-[#87928E]
                      "
                    >
                      <UsersRound className="h-2.5 w-2.5" />
                      Patients
                    </span>

                    <span
                      className="
                        rounded-full
                        bg-[#EAF3EF]
                        px-1.5
                        py-0.5
                        text-[7px]
                        font-bold
                        text-[#356B5C]
                      "
                    >
                      {patientsFiltres.length}
                    </span>
                  </div>
                </div>

                {/* LISTE */}

                <div
                  className="
                    max-h-[330px]
                    overflow-y-auto
                    p-1.5
                  "
                >
                  {patientsFiltres.length === 0 ? (
                    <div
                      className="
                        flex
                        min-h-[130px]
                        flex-col
                        items-center
                        justify-center
                        px-4
                        text-center
                      "
                    >
                      <div
                        className="
                          flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-[#DDE3E0]
                          bg-[#F4F6F5]
                        "
                      >
                        <UserRound
                          className="
                            h-4
                            w-4
                            text-[#87928E]
                          "
                        />
                      </div>

                      <p
                        className="
                          mt-2
                          text-[9px]
                          font-semibold
                          text-[#394842]
                        "
                      >
                        Aucun patient trouvé
                      </p>

                      <p
                        className="
                          mt-1
                          text-[8px]
                          text-[#87928E]
                        "
                      >
                        Essayez avec un autre nom,
                        prénom ou téléphone.
                      </p>
                    </div>
                  ) : (
                    patientsFiltres.map((patient) => {
                      const estSelectionne =
                        String(patientSelectionne?.id) ===
                        String(patient.id);

                      return (
                        <div
                          key={patient.id}
                          className={`
                            group
                            mb-1
                            rounded-[8px]
                            border
                            transition
                            last:mb-0
                            ${
                              estSelectionne
                                ? "border-[#C9DCD4] bg-[#EAF3EF]"
                                : "border-transparent bg-white hover:border-[#E2E8E5] hover:bg-[#F7F9F8]"
                            }
                          `}
                        >
                          {/* PATIENT */}

                          <div
                            className="
                              flex
                              items-center
                              gap-2.5
                              px-2.5
                              py-2
                            "
                          >
                            <button
                              type="button"
                              onClick={() =>
                                selectionnerPatient(patient)
                              }
                              className="
                                flex
                                min-w-0
                                flex-1
                                items-center
                                gap-2.5
                                text-left
                              "
                            >
                              {/* AVATAR */}

                              <div
                                className={`
                                  flex
                                  h-9
                                  w-9
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-full
                                  text-[8px]
                                  font-bold
                                  ${
                                    estSelectionne
                                      ? "border border-[#C9DCD4] bg-white text-[#356B5C]"
                                      : "border border-[#DDE3E0] bg-[#F4F6F5] text-[#68756F]"
                                  }
                                `}
                              >
                                {initiales(patient)}
                              </div>

                              {/* INFORMATIONS */}

                              <div className="min-w-0 flex-1">
                                <div
                                  className="
                                    flex
                                    items-center
                                    gap-1.5
                                  "
                                >
                                  <p
                                    className="
                                      truncate
                                      text-[9px]
                                      font-bold
                                      text-[#394842]
                                    "
                                  >
                                    {nomComplet(patient)}
                                  </p>

                                  {estSelectionne && (
                                    <span
                                      className="
                                        shrink-0
                                        rounded-full
                                        bg-[#356B5C]
                                        px-1.5
                                        py-0.5
                                        text-[6px]
                                        font-bold
                                        text-white
                                      "
                                    >
                                      ACTUEL
                                    </span>
                                  )}
                                </div>

                                <div
                                  className="
                                    mt-1
                                    flex
                                    flex-wrap
                                    gap-x-2.5
                                    gap-y-0.5
                                  "
                                >
                                  {patient.telephone && (
                                    <span
                                      className="
                                        flex
                                        items-center
                                        gap-1
                                        text-[7px]
                                        text-[#87928E]
                                      "
                                    >
                                      <Phone
                                        className="
                                          h-2.5
                                          w-2.5
                                          text-[#356B5C]
                                        "
                                      />

                                      {patient.telephone}
                                    </span>
                                  )}

                                  {patient.date_naissance && (
                                    <span
                                      className="
                                        flex
                                        items-center
                                        gap-1
                                        text-[7px]
                                        text-[#87928E]
                                      "
                                    >
                                      <CalendarDays
                                        className="
                                          h-2.5
                                          w-2.5
                                          text-[#356B5C]
                                        "
                                      />

                                      {formaterDate(
                                        patient.date_naissance
                                      )}
                                    </span>
                                  )}

                                  {patient.sexe && (
                                    <span
                                      className="
                                        flex
                                        items-center
                                        gap-1
                                        text-[7px]
                                        text-[#87928E]
                                      "
                                    >
                                      <VenusAndMars
                                        className="
                                          h-2.5
                                          w-2.5
                                          text-[#356B5C]
                                        "
                                      />

                                      {patient.sexe}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* =================================================
                                ACTIONS
                            ================================================= */}

                            <div
                              className="
                                flex
                                shrink-0
                                items-center
                                gap-1
                              "
                            >
                              <button
                                type="button"
                                title="Modifier"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  ouvrirModification(patient);
                                }}
                                disabled={loading}
                                className="
                                  flex
                                  h-6
                                  w-6
                                  items-center
                                  justify-center
                                  rounded-[6px]
                                  border
                                  border-[#DDE3E0]
                                  bg-white
                                  text-[#68756F]
                                  transition
                                  hover:border-[#C9DCD4]
                                  hover:bg-[#EAF3EF]
                                  hover:text-[#356B5C]
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50
                                "
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>

                              <button
                                type="button"
                                title="Supprimer"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  demanderSuppression(patient);
                                }}
                                disabled={loading}
                                className="
                                  flex
                                  h-6
                                  w-6
                                  items-center
                                  justify-center
                                  rounded-[6px]
                                  border
                                  border-[#E7CFCF]
                                  bg-white
                                  text-[#A34A4A]
                                  transition
                                  hover:bg-[#FBF5F5]
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50
                                "
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>

                              {/* CHECK */}

                              <div
                                className={`
                                  flex
                                  h-6
                                  w-6
                                  items-center
                                  justify-center
                                  rounded-full
                                  ${
                                    estSelectionne
                                      ? "bg-[#356B5C] text-white"
                                      : "border border-[#DDE3E0] bg-white text-[#B4BFBA]"
                                  }
                                `}
                              >
                                {estSelectionne ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <ChevronDown
                                    className="
                                      h-3
                                      w-3
                                      -rotate-90
                                    "
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* FOOTER */}

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    border-t
                    border-[#E8ECEA]
                    bg-[#F4F6F5]
                    px-3
                    py-2
                  "
                >
                  <span
                    className="
                      text-[7px]
                      text-[#87928E]
                    "
                  >
                    {patientsFiltres.length} résultat
                    {patientsFiltres.length > 1
                      ? "s"
                      : ""}
                  </span>

                  <button
                    type="button"
                    onClick={ouvrirNouveauPatient}
                    className="
                      flex
                      items-center
                      gap-1
                      rounded-[6px]
                      border
                      border-[#C9DCD4]
                      bg-white
                      px-2
                      py-1.5
                      text-[7px]
                      font-semibold
                      text-[#356B5C]
                      transition
                      hover:bg-[#EAF3EF]
                    "
                  >
                    <UserPlus className="h-2.5 w-2.5" />

                    Nouveau patient
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              ERREUR
          ================================================= */}

          {error && (
            <div
              className="
                mt-3
                flex
                items-start
                gap-2.5
                rounded-[8px]
                border
                border-[#E7CFCF]
                bg-[#FBF5F5]
                px-3
                py-2.5
              "
            >
              <AlertCircle
                className="
                  mt-0.5
                  h-3.5
                  w-3.5
                  shrink-0
                  text-[#A34A4A]
                "
              />

              <p
                className="
                  text-[9px]
                  leading-4
                  text-[#A34A4A]
                "
              >
                {error}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          FORMULAIRE PATIENT
      ===================================================== */}

      {showForm && (
        <PatientForm
          patient={patientAModifier}
          onClose={() => {
            setShowForm(false);
            setPatientAModifier(null);
          }}
          onSuccess={handlePatientSaved}
        />
      )}

      {/* =====================================================
          CONFIRMATION SUPPRESSION
      ===================================================== */}

      {showDeleteConfirm && patientASupprimer && (
        <div
          className="
            fixed
            inset-0
            z-[60]
            flex
            items-center
            justify-center
            bg-[#26332F]/30
            p-3
            backdrop-blur-[2px]
          "
        >
          <div
            className="
              w-full
              max-w-[390px]
              overflow-hidden
              rounded-[12px]
              border
              border-[#DDE3E0]
              bg-white
              shadow-[0_18px_50px_rgba(38,51,47,0.14)]
            "
          >
            <div className="p-4 sm:p-5">
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-[9px]
                  border
                  border-[#E7CFCF]
                  bg-[#FBF5F5]
                "
              >
                <Trash2
                  className="
                    h-4
                    w-4
                    text-[#A34A4A]
                  "
                />
              </div>

              <h3
                className="
                  mt-4
                  text-[13px]
                  font-bold
                  text-[#394842]
                "
              >
                Supprimer le patient ?
              </h3>

              <p
                className="
                  mt-1.5
                  text-[9px]
                  leading-4
                  text-[#68756F]
                "
              >
                Vous êtes sur le point de supprimer :
              </p>

              <div
                className="
                  mt-2.5
                  flex
                  items-center
                  gap-2.5
                  rounded-[9px]
                  border
                  border-[#DDE3E0]
                  bg-[#F4F6F5]
                  px-3
                  py-2.5
                "
              >
                <div
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-[#C9DCD4]
                    bg-white
                    text-[8px]
                    font-bold
                    text-[#356B5C]
                  "
                >
                  {initiales(patientASupprimer)}
                </div>

                <div className="min-w-0">
                  <p
                    className="
                      truncate
                      text-[10px]
                      font-semibold
                      text-[#394842]
                    "
                  >
                    {nomComplet(patientASupprimer)}
                  </p>

                  {patientASupprimer.telephone && (
                    <p
                      className="
                        mt-0.5
                        text-[8px]
                        text-[#87928E]
                      "
                    >
                      {patientASupprimer.telephone}
                    </p>
                  )}
                </div>
              </div>

              <p
                className="
                  mt-3
                  text-[8px]
                  leading-4
                  text-[#87928E]
                "
              >
                La suppression peut être refusée si ce
                patient est déjà utilisé dans d'autres
                données.
              </p>
            </div>

            <div
              className="
                flex
                items-center
                justify-end
                gap-2
                border-t
                border-[#E8ECEA]
                bg-[#F4F6F5]
                px-4
                py-3
              "
            >
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPatientASupprimer(null);
                }}
                disabled={loading}
                className="
                  h-9
                  rounded-[7px]
                  border
                  border-[#D6DEDA]
                  bg-white
                  px-3.5
                  text-[9px]
                  font-semibold
                  text-[#68756F]
                  transition
                  hover:bg-[#F7F9F8]
                  disabled:opacity-50
                "
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={supprimerPatient}
                disabled={loading}
                className="
                  flex
                  h-9
                  items-center
                  gap-1.5
                  rounded-[7px]
                  bg-[#A34A4A]
                  px-3.5
                  text-[9px]
                  font-semibold
                  text-white
                  transition
                  hover:bg-[#913F3F]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3" />
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}