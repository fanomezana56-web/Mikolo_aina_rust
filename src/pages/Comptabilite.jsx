import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  UserRound,
  Pill,
  Stethoscope,
  BedDouble,
  ReceiptText,
  Coins,
  Loader2,
  UsersRound,
  ClipboardList,
  CircleCheck,
  CircleX,
} from "lucide-react";

import PatientSelector from "../components/comptabilite/PatientSelector";
import MedicamentsComptabilite from "../components/comptabilite/MedicamentsComptabilite";
import SoinsComptabilite from "../components/comptabilite/SoinsComptabilite";

/* ============================================================
   SIGNALER AU LAYOUT QUE LE SOLDE DOIT ÊTRE ACTUALISÉ
============================================================ */

function signalerChangementSoldeCentre() {
  window.dispatchEvent(
    new Event("solde-centre-change")
  );
}

/* ============================================================
   FORMAT MONTANT
============================================================ */

function formaterMontant(montant) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(montant || 0));
}

export default function Comptabilite() {
  const [patientSelectionne, setPatientSelectionne] =
    useState(null);

  const [lignesMedicaments, setLignesMedicaments] =
    useState([]);

  const [lignesSoins, setLignesSoins] =
    useState([]);

  const [hospitalisation, setHospitalisation] =
    useState(false);

  const [enregistrement, setEnregistrement] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [erreur, setErreur] =
    useState("");

  // ============================================================
  // TOTAL MÉDICAMENTS
  // ============================================================

  const totalMedicaments = useMemo(() => {
    return lignesMedicaments.reduce(
      (total, ligne) =>
        total + Number(ligne.prix_total || 0),
      0
    );
  }, [lignesMedicaments]);

  const totalUnitesMedicaments = useMemo(() => {
    return lignesMedicaments.reduce(
      (total, ligne) =>
        total + Number(ligne.quantite || 0),
      0
    );
  }, [lignesMedicaments]);

  // ============================================================
  // TOTAL SOINS
  // ============================================================

  const totalSoins = useMemo(() => {
    return lignesSoins.reduce(
      (total, ligne) =>
        total + Number(ligne.prix_total || 0),
      0
    );
  }, [lignesSoins]);

  const totalUnitesSoins = useMemo(() => {
    return lignesSoins.reduce(
      (total, ligne) =>
        total + Number(ligne.quantite || 0),
      0
    );
  }, [lignesSoins]);

  // ============================================================
  // TOTAL GÉNÉRAL
  // ============================================================

  const totalGeneral = useMemo(() => {
    return totalMedicaments + totalSoins;
  }, [totalMedicaments, totalSoins]);

  // ============================================================
  // ENREGISTREMENT
  // ============================================================

  async function enregistrerComptabilite() {
    setMessage("");
    setErreur("");

    // ----------------------------------------------------------
    // Vérification patient
    // ----------------------------------------------------------

    if (!patientSelectionne?.id) {
      setErreur(
        "Veuillez sélectionner un patient."
      );
      return;
    }

    // ----------------------------------------------------------
    // Vérification médicaments
    // ----------------------------------------------------------

    for (const ligne of lignesMedicaments) {
      if (!ligne.medicament_id) {
        setErreur(
          "Un médicament sélectionné est invalide."
        );
        return;
      }
    }

    // ----------------------------------------------------------
    // Vérification soins
    // ----------------------------------------------------------

    for (const ligne of lignesSoins) {
      if (!ligne.soin_id) {
        setErreur(
          "Un soin sélectionné est invalide."
        );
        return;
      }
    }

    // ----------------------------------------------------------
    // Vérification contenu
    // ----------------------------------------------------------

    if (
      lignesMedicaments.length === 0 &&
      lignesSoins.length === 0 &&
      !hospitalisation
    ) {
      setErreur(
        "Ajoutez au moins un médicament, un soin ou sélectionnez l'hospitalisation."
      );
      return;
    }

    try {
      setEnregistrement(true);

      const resultat = await invoke(
        "enregistrer_comptabilite",
        {
          data: {
                patient_id: patientSelectionne.id,

                // Le prix total des soins est enregistré
                // dans la colonne consultation
                consultation: Number(totalSoins || 0),

                hospitalisation,

                lignes_medicaments: lignesMedicaments.map((ligne) => ({
                  medicament_id: ligne.medicament_id,
                  quantite: Number(ligne.quantite),
                })),

                lignes_soins: lignesSoins.map((ligne) => ({
                  soin_id: ligne.soin_id,
                })),
              },
        }
      );

      const totalEnregistre =
        resultat?.total_general !== undefined
          ? Number(resultat.total_general)
          : totalGeneral;

      /* ========================================================
         IMPORTANT :
         LE LAYOUT EST PRÉVENU APRÈS SUCCÈS
      ======================================================== */

      signalerChangementSoldeCentre();

      setMessage(
        `Comptabilité enregistrée avec succès. Total : ${formaterMontant(
          totalEnregistre
        )} Ar`
      );

      // --------------------------------------------------------
      // Réinitialisation
      // --------------------------------------------------------

      setPatientSelectionne(null);
      setLignesMedicaments([]);
      setLignesSoins([]);
      setHospitalisation(false);
    } catch (error) {
      console.error(
        "Erreur enregistrement comptabilité :",
        error
      );

      setErreur(
        typeof error === "string"
          ? error
          : error?.message ||
              "Une erreur est survenue lors de l'enregistrement."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <div className="min-h-screen  px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1450px]">

        {/* ======================================================
            MESSAGES
        ====================================================== */}

        {message && (
          <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-[#CFE5D9] bg-[#F0F8F4] px-3.5 py-2.5 text-[11px] font-medium text-[#39705D]">
            <CheckCircle2
              size={16}
              className="shrink-0"
            />

            <span>{message}</span>
          </div>
        )}

        {erreur && (
          <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-[#ECD4D4] bg-[#FCF5F5] px-3.5 py-2.5 text-[11px] font-medium text-[#A34A4A]">
            <AlertCircle
              size={16}
              className="shrink-0"
            />

            <span>{erreur}</span>
          </div>
        )}

        {/* ======================================================
            LAYOUT PRINCIPAL
        ====================================================== */}

        <div className=" grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">

          {/* ====================================================
              COLONNE GAUCHE
          ==================================================== */}

          <div className=" min-w-0 space-y-5">

            {/* ==================================================
                PATIENT
            ================================================== */}
              <div className="pt-4">
                <PatientSelector
                  patientSelectionne={
                    patientSelectionne
                  }
                  setPatientSelectionne={
                    setPatientSelectionne
                  }
                />
              </div>


            {/* ==================================================
                MÉDICAMENTS
            ================================================== */}

            <section className="bg-white 
             shadow-[0_3px_14px_rgba(38,51,47,0.035)]">
              <div className="flex items-center bg-[#F7FAF8] rounded-[7px]  justify-between border-b border-[#EDF0EE] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#EAF3EF] text-[#356B5C]">
                    <Pill size={14} />
                  </div>

                  <div>
                    <h2 className="text-[12px] font-bold text-[#3D4945]">
                      Médicaments
                    </h2>

                    <p className="text-[9px] text-[#89938F]">
                      Ajoutez les médicaments utilisés.
                    </p>
                  </div>
                </div>

                <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-[9px] font-bold text-[#356B5C]">
                  {lignesMedicaments.length}
                </div>
              </div>

              <div className="p-4">
                <MedicamentsComptabilite
                  lignesMedicaments={
                    lignesMedicaments
                  }
                  setLignesMedicaments={
                    setLignesMedicaments
                  }
                />
              </div>
            </section>

            {/* ==================================================
                SOINS
            ================================================== */}

            <section className=" rounded-[7px] border-[#DDE3E0] bg-white shadow-[0_3px_14px_rgba(38,51,47,0.035)]">
              <div className="flex bg-[#F7FAF8] items-center justify-between border-b border-[#EDF0EE] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#EAF3EF] text-[#356B5C]">
                    <Stethoscope size={14} />
                  </div>

                  <div>
                    <h2 className="text-[12px] font-bold text-[#3D4945]">
                      Soins
                    </h2>

                    <p className="text-[9px] text-[#89938F]">
                      Sélectionnez les soins effectués.
                    </p>
                  </div>
                </div>

                <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#F1F6F4] px-2 text-[9px] font-bold text-[#356B5C]">
                  {lignesSoins.length}
                </div>
              </div>

              <div className="p-4">
                <SoinsComptabilite
                  lignesSoins={lignesSoins}
                  setLignesSoins={setLignesSoins}
                />
              </div>
            </section>

            {/* ==================================================
                HOSPITALISATION
            ================================================== */}

            <section className="rounded-[12px] border border-[#DDE3E0] bg-white shadow-[0_3px_14px_rgba(38,51,47,0.035)]">
              <div className="p-4">
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#EAF3EF] text-[#356B5C]">
                      <BedDouble size={15} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-[#3D4945]">
                        Hospitalisation
                      </p>

                      <p className="mt-0.5 text-[9px] text-[#89938F]">
                        Ajouter l'hospitalisation à cette comptabilité.
                      </p>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={hospitalisation}
                    onChange={(e) =>
                      setHospitalisation(
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 shrink-0 rounded border-[#CBD5D1] text-[#356B5C] focus:ring-[#356B5C]"
                  />
                </label>
              </div>
            </section>
          </div>

          {/* ====================================================
              COLONNE DROITE — RÉSUMÉ
          ==================================================== */}

          <aside className="xl:sticky xl:top-5">
            <section className="overflow-hidden rounded-[12px] border border-[#DDE3E0] bg-white shadow-[0_5px_20px_rgba(38,51,47,0.07)]">

              {/* TITRE */}

              <div className="border-b border-[#E8ECEA] bg-[#FAFBFA] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#356B5C] text-white">
                      <ReceiptText size={15} />
                    </div>

                    <div>
                      <h2 className="text-[12px] font-bold text-[#394842]">
                        Résumé
                      </h2>

                      <p className="text-[9px] text-[#87928E]">
                        Détails de la comptabilité
                      </p>
                    </div>
                  </div>

                  <div className="rounded-full bg-[#EAF3EF] px-2 py-1 text-[8px] font-bold text-[#356B5C]">
                    {lignesMedicaments.length +
                      lignesSoins.length +
                      (hospitalisation ? 1 : 0)}{" "}
                    élément
                    {lignesMedicaments.length +
                      lignesSoins.length +
                      (hospitalisation ? 1 : 0) >
                    1
                      ? "s"
                      : ""}
                  </div>
                </div>
              </div>

              <div className="p-3.5">

                {/* PATIENT */}

                <div className="mb-3 rounded-[9px] border border-[#E3E9E6] bg-[#F7FAF8] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <UsersRound
                      size={13}
                      className="text-[#356B5C]"
                    />

                    <span className="text-[9px] font-bold uppercase tracking-wide text-[#7B8782]">
                      Patient
                    </span>
                  </div>

                  {patientSelectionne ? (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDEDE6] text-[9px] font-bold text-[#356B5C]">
                        {`${patientSelectionne?.nom?.[0] || ""}${
                          patientSelectionne?.prenom?.[0] || ""
                        }`.toUpperCase() || "?"}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold text-[#394842]">
                          {`${patientSelectionne.nom || ""} ${
                            patientSelectionne.prenom || ""
                          }`.trim()}
                        </p>

                        {patientSelectionne.telephone && (
                          <p className="mt-0.5 truncate text-[8px] text-[#87928E]">
                            {patientSelectionne.telephone}
                          </p>
                        )}
                      </div>

                      <CircleCheck
                        size={14}
                        className="ml-auto shrink-0 text-[#438B74]"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[#9AA39F]">
                      <CircleX size={14} />

                      <span className="text-[9px]">
                        Aucun patient sélectionné
                      </span>
                    </div>
                  )}
                </div>

                {/* MÉDICAMENTS */}

                <div className="mb-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Pill
                        size={13}
                        className="text-[#356B5C]"
                      />

                      <span className="text-[9px] font-bold uppercase tracking-wide text-[#68756F]">
                        Médicaments
                      </span>
                    </div>

                    <span className="text-[8px] font-semibold text-[#87928E]">
                      {totalUnitesMedicaments} unité
                      {totalUnitesMedicaments > 1
                        ? "s"
                        : ""}
                    </span>
                  </div>

                  {lignesMedicaments.length > 0 ? (
                    <div className="space-y-1.5">
                      {lignesMedicaments.map(
                        (ligne, index) => (
                          <div
                            key={
                              ligne.medicament_id ||
                              ligne.id ||
                              index
                            }
                            className="flex items-center justify-between gap-2 rounded-[7px] border border-[#E8ECEA] bg-white px-2.5 py-2"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[#F1F6F4] text-[#356B5C]">
                                <Pill size={11} />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-[8px] font-semibold text-[#46534E]">
                                  {ligne.nom ||
                                    ligne.medicament_nom ||
                                    ligne.medicament?.nom ||
                                    "Médicament"}
                                </p>

                                <p className="text-[7px] text-[#929C98]">
                                  Quantité :{" "}
                                  {ligne.quantite || 0}
                                </p>
                              </div>
                            </div>

                            <span className="shrink-0 text-[8px] font-bold text-[#394842]">
                              {formaterMontant(
                                ligne.prix_total
                              )}{" "}
                              Ar
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="rounded-[7px] border border-dashed border-[#DDE3E0] px-3 py-2.5 text-center text-[8px] text-[#9AA39F]">
                      Aucun médicament
                    </div>
                  )}
                </div>

                {/* SOINS */}

                <div className="mb-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Stethoscope
                        size={13}
                        className="text-[#356B5C]"
                      />

                      <span className="text-[9px] font-bold uppercase tracking-wide text-[#68756F]">
                        Soins
                      </span>
                    </div>

                    <span className="text-[8px] font-semibold text-[#87928E]">
                      {totalUnitesSoins} soin
                      {totalUnitesSoins > 1
                        ? "s"
                        : ""}
                    </span>
                  </div>

                  {lignesSoins.length > 0 ? (
                    <div className="space-y-1.5">
                      {lignesSoins.map(
                        (ligne, index) => (
                          <div
                            key={
                              ligne.soin_id ||
                              ligne.id ||
                              index
                            }
                            className="flex items-center justify-between gap-2 rounded-[7px] border border-[#E8ECEA] bg-white px-2.5 py-2"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[#F1F6F4] text-[#356B5C]">
                                <Stethoscope size={11} />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-[8px] font-semibold text-[#46534E]">
                                  {ligne.nom ||
                                    ligne.soin_nom ||
                                    ligne.soin?.nom ||
                                    "Soin"}
                                </p>
                              </div>
                            </div>

                            <span className="shrink-0 text-[8px] font-bold text-[#394842]">
                              {formaterMontant(
                                ligne.prix_total
                              )}{" "}
                              Ar
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="rounded-[7px] border border-dashed border-[#DDE3E0] px-3 py-2.5 text-center text-[8px] text-[#9AA39F]">
                      Aucun soin
                    </div>
                  )}
                </div>

                {/* HOSPITALISATION */}

                <div className="mb-3">
                  <div className="flex items-center justify-between rounded-[8px] border border-[#E3E9E6] bg-[#F7FAF8] px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      <BedDouble
                        size={13}
                        className="text-[#356B5C]"
                      />

                      <div>
                        <p className="text-[8px] font-bold text-[#46534E]">
                          Hospitalisation
                        </p>

                        <p className="text-[7px] text-[#929C98]">
                          {hospitalisation
                            ? "Ajoutée"
                            : "Non sélectionnée"}
                        </p>
                      </div>
                    </div>

                    {hospitalisation ? (
                      <CircleCheck
                        size={14}
                        className="text-[#438B74]"
                      />
                    ) : (
                      <CircleX
                        size={14}
                        className="text-[#B0B8B4]"
                      />
                    )}
                  </div>
                </div>

                {/* TOTAUX */}

                <div className="border-t border-[#E7ECE9] pt-3">
                  <div className="space-y-1.5">

                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-[#7B8782]">
                        Médicaments
                      </span>

                      <span className="text-[9px] font-semibold text-[#52605A]">
                        {formaterMontant(
                          totalMedicaments
                        )}{" "}
                        Ar
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-[#7B8782]">
                        Soins
                      </span>

                      <span className="text-[9px] font-semibold text-[#52605A]">
                        {formaterMontant(
                          totalSoins
                        )}{" "}
                        Ar
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded-[9px] bg-[#356B5C] px-3 py-3 text-white shadow-sm">
                      <div className="flex items-center gap-2">
                        <Coins size={15} />

                        <span className="text-[10px] font-semibold">
                          Total général
                        </span>
                      </div>

                      <span className="text-[14px] font-bold">
                        {formaterMontant(
                          totalGeneral
                        )}{" "}
                        Ar
                      </span>
                    </div>
                  </div>
                </div>

                {/* ENREGISTRER */}

                <button
                  type="button"
                  onClick={
                    enregistrerComptabilite
                  }
                  disabled={enregistrement}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-[9px] bg-[#356B5C] px-4 py-2.5 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#2D5D50] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enregistrement ? (
                    <>
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />

                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />

                      Enregistrer la comptabilité
                    </>
                  )}
                </button>

              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}