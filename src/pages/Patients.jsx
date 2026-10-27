
import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  HeartPulse,
  Hospital,
  LoaderCircle,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  User,
  UserRound,
  Wallet,
} from "lucide-react";

/* =========================
   COULEURS
========================= */

const COLORS = {
  green: "#36765D",
  greenDark: "#245440",
  greenLight: "#EAF3E8",
  white: "#FFFFFF",
  background: "#FFFFFF",
  text: "#29372E",
  muted: "#647168",
  border: "#DDE5C9",
  blue: "#356BA5",
  blueLight: "#EAF2FC",
  orange: "#956116",
  orangeLight: "#FFF3D9",
  red: "#B93838",
  redLight: "#FFF0EE",
  purple: "#7250A1",
  purpleLight: "#F2ECFA",
};

function montantNombre(value) {
  if (value === null || value === undefined || value === "") return 0;

  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formaterMontant(value) {
  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(montantNombre(value)) + " Ar"
  );
}

function formaterDate(value, avecHeure = false) {
  if (!value) return "Date inconnue";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date inconnue";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(avecHeure ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function nomComplet(patient) {
  if (!patient) return "";

  return [patient.nom, patient.prenom]
    .filter((value) => value && value.trim())
    .join(" ");
}

function initiales(patient) {
  const nom = patient?.nom?.trim()?.[0] || "";
  const prenom = patient?.prenom?.trim()?.[0] || "";

  return (nom + prenom).toUpperCase() || "PA";
}

function calculerAge(dateNaissance) {
  if (!dateNaissance) return null;

  const naissance = new Date(`${dateNaissance}T00:00:00`);
  const maintenant = new Date();

  if (Number.isNaN(naissance.getTime()) || naissance > maintenant) {
    return null;
  }

  let age = maintenant.getFullYear() - naissance.getFullYear();

  if (
    maintenant.getMonth() < naissance.getMonth() ||
    (maintenant.getMonth() === naissance.getMonth() &&
      maintenant.getDate() < naissance.getDate())
  ) {
    age--;
  }

  return age;
}

/* =========================
   PETITS COMPOSANTS
========================= */

function Badge({ children, couleur = "vert" }) {
  return <span className={`pat-badge pat-badge-${couleur}`}>{children}</span>;
}

function Statistique({ icone: Icone, titre, valeur, couleur, fond }) {
  return (
    <article className="pat-stat-card">
      <div className="pat-stat-icon" style={{ color: couleur, background: fond }}>
        <Icone size={18} />
      </div>

      <div className="pat-stat-content">
        <span className="pat-stat-title">{titre}</span>
        <strong className="pat-stat-value">{valeur}</strong>
      </div>
    </article>
  );
}

function Vide({ icone: Icone = FileText, titre, description }) {
  return (
    <div className="pat-empty">
      <Icone size={25} />
      <strong>{titre}</strong>
      <p>{description}</p>
    </div>
  );
}

/* =========================
   PAGE PATIENTS
========================= */

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [comptabilites, setComptabilites] = useState([]);
  const [patientSelectionneId, setPatientSelectionneId] = useState("");
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState("");

  const chargerDonnees = useCallback(async (silencieux = false) => {
    silencieux ? setActualisation(true) : setChargement(true);
    setErreur("");

    try {
      const [patientsResultat, comptabilitesResultat] = await Promise.all([
        invoke("obtenir_patients"),
        invoke("obtenir_comptabilites"),
      ]);

      const listePatients = Array.isArray(patientsResultat)
        ? [...patientsResultat]
        : [];

      const listeComptabilites = Array.isArray(comptabilitesResultat)
        ? [...comptabilitesResultat]
        : [];

      listePatients.sort((a, b) =>
        nomComplet(a).localeCompare(nomComplet(b), "fr", {
          sensitivity: "base",
        })
      );

      listeComptabilites.sort(
        (a, b) =>
          new Date(b.date_comptabilite || 0).getTime() -
          new Date(a.date_comptabilite || 0).getTime()
      );

      setPatients(listePatients);
      setComptabilites(listeComptabilites);

      setPatientSelectionneId((ancienId) => {
        if (listePatients.some((p) => String(p.id) === String(ancienId))) {
          return ancienId;
        }

        return listePatients[0]?.id?.toString() || "";
      });
    } catch (error) {
      console.error("Erreur de chargement :", error);
      setErreur(
        typeof error === "string"
          ? error
          : error?.message || "Impossible de charger les données."
      );
    } finally {
      setChargement(false);
      setActualisation(false);
    }
  }, []);

  useEffect(() => {
    chargerDonnees();
  }, [chargerDonnees]);

  const patientsFiltres = useMemo(() => {
    const terme = recherche.trim().toLocaleLowerCase("fr");

    if (!terme) return patients;

    return patients.filter((patient) =>
      [
        patient.nom,
        patient.prenom,
        patient.telephone,
        patient.adresse,
        patient.sexe,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(terme)
    );
  }, [patients, recherche]);

  const patientSelectionne = useMemo(
    () =>
      patients.find(
        (patient) => String(patient.id) === String(patientSelectionneId)
      ) || null,
    [patients, patientSelectionneId]
  );

  const historique = useMemo(() => {
    if (!patientSelectionne) return [];

    return comptabilites
      .filter(
        (c) => String(c.patient_id) === String(patientSelectionne.id)
      )
      .sort(
        (a, b) =>
          new Date(b.date_comptabilite || 0).getTime() -
          new Date(a.date_comptabilite || 0).getTime()
      );
  }, [comptabilites, patientSelectionne]);

  const statistiques = useMemo(() => {
    const totalMedicaments = historique.reduce(
      (somme, c) => somme + montantNombre(c.total_medicaments),
      0
    );

    const totalSoins = historique.reduce(
      (somme, c) => somme + montantNombre(c.total_soins),
      0
    );

    const totalGeneral = historique.reduce(
      (somme, c) => somme + montantNombre(c.total_general),
      0
    );

    const quantiteMedicaments = historique.reduce(
      (total, c) =>
        total +
        (Array.isArray(c.medicaments)
          ? c.medicaments.reduce(
              (somme, m) => somme + montantNombre(m.quantite),
              0
            )
          : 0),
      0
    );

    const nombreSoins = historique.reduce(
      (total, c) =>
        total +
        (Array.isArray(c.soins_lignes)
          ? c.soins_lignes.reduce(
              (somme, s) => somme + montantNombre(s.quantite),
              0
            )
          : 0),
      0
    );

    return {
      nombreVisites: historique.length,
      totalMedicaments,
      totalSoins,
      totalGeneral,
      quantiteMedicaments,
      nombreSoins,
      nombreHospitalisations: historique.filter((c) => c.hospitalisation)
        .length,
    };
  }, [historique]);

  if (chargement) {
    return (
      <>
        <style>{styles}</style>
        <main className="pat-page">
          <div className="pat-loading">
            <LoaderCircle className="pat-spin" size={27} />
            <strong>Chargement des patients...</strong>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <main className="pat-page">
        <header className="pat-header">
          <div className="pat-header-left">
            <div className="pat-header-icon">
              <HeartPulse size={23} />
            </div>

            <div>
              <h1>Dossiers des patients</h1>
              <p>Visites, soins et médicaments</p>
            </div>
          </div>

          <button
            type="button"
            className="pat-refresh-button"
            onClick={() => chargerDonnees(true)}
            disabled={actualisation}
          >
            <RefreshCw
              size={15}
              className={actualisation ? "pat-spin" : ""}
            />
            {actualisation ? "Actualisation..." : "Actualiser"}
          </button>
        </header>

        {erreur && (
          <div className="pat-error">
            <AlertCircle size={18} />
            <div>
              <strong>Erreur de chargement</strong>
              <p>{erreur}</p>
            </div>
            <button type="button" onClick={() => chargerDonnees()}>
              Réessayer
            </button>
          </div>
        )}

        <section className="pat-selector-card">
          <div className="pat-section-heading">
            <div className="pat-heading-icon">
              <Search size={18} />
            </div>

            <div>
              <h2>Rechercher un patient</h2>
              <p>Sélectionne un dossier à consulter.</p>
            </div>

            <span className="pat-count">
              {patients.length} patient{patients.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="pat-selector-grid">
            <div className="pat-field">
              <label htmlFor="pat-recherche">Recherche</label>
              <div className="pat-input-wrap">
                <Search size={16} />
                <input
                  id="pat-recherche"
                  type="search"
                  placeholder="Nom, prénom ou téléphone"
                  value={recherche}
                  onChange={(event) => setRecherche(event.target.value)}
                />
              </div>
            </div>

            <div className="pat-field">
              <label htmlFor="pat-select">Patient</label>
              <div className="pat-select-wrap">
                <UserRound size={16} />
                <select
                  id="pat-select"
                  value={patientSelectionneId}
                  onChange={(event) =>
                    setPatientSelectionneId(event.target.value)
                  }
                >
                  {patientsFiltres.length === 0 && (
                    <option value="">Aucun patient trouvé</option>
                  )}

                  {patientsFiltres.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {nomComplet(patient)}
                      {patient.telephone ? `, ${patient.telephone}` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="pat-select-chevron" />
              </div>
            </div>
          </div>

          {patients.length === 0 && (
            <div className="pat-inline-empty">
              Aucun patient enregistré.
            </div>
          )}

          {patients.length > 0 && patientsFiltres.length === 0 && (
            <div className="pat-inline-empty">
              Aucun résultat pour cette recherche.
            </div>
          )}
        </section>

        {patientSelectionne ? (
          <>
            <section className="pat-profile-card">
              <div className="pat-profile-main">
                <div className="pat-avatar">
                  {initiales(patientSelectionne)}
                </div>

                <div className="pat-profile-identity">
                  <div className="pat-profile-name-line">
                    <h2>{nomComplet(patientSelectionne)}</h2>
                    <Badge>
                      <CheckCircle2 size={12} />
                      Dossier sélectionné
                    </Badge>
                  </div>

                  <div className="pat-profile-meta">
                    <span>
                      <User size={14} />
                      {patientSelectionne.sexe || "Sexe non renseigné"}
                    </span>

                    <span>
                      <CalendarDays size={14} />
                      {patientSelectionne.date_naissance
                        ? `${formaterDate(patientSelectionne.date_naissance)}${
                            calculerAge(patientSelectionne.date_naissance) !==
                            null
                              ? ` · ${calculerAge(
                                  patientSelectionne.date_naissance
                                )} ans`
                              : ""
                          }`
                        : "Naissance non renseignée"}
                    </span>

                    <span>
                      <Phone size={14} />
                      {patientSelectionne.telephone || "Téléphone non renseigné"}
                    </span>
                  </div>

                  {patientSelectionne.adresse && (
                    <p className="pat-address">{patientSelectionne.adresse}</p>
                  )}
                </div>
              </div>

              <div className="pat-profile-date">
                <span>Création du dossier</span>
                <strong>{formaterDate(patientSelectionne.created_at)}</strong>
              </div>
            </section>

            <section className="pat-stats-grid">
              <Statistique
                icone={Activity}
                titre="Visites"
                valeur={statistiques.nombreVisites}
                couleur={COLORS.green}
                fond={COLORS.greenLight}
              />

              <Statistique
                icone={Package}
                titre="Médicaments · unités"
                valeur={statistiques.quantiteMedicaments}
                couleur={COLORS.blue}
                fond={COLORS.blueLight}
              />

              <Statistique
                icone={Stethoscope}
                titre="Soins · quantités"
                valeur={statistiques.nombreSoins}
                couleur={COLORS.purple}
                fond={COLORS.purpleLight}
              />

              <Statistique
                icone={Wallet}
                titre="Total comptabilisé"
                valeur={formaterMontant(statistiques.totalGeneral)}
                couleur={COLORS.greenDark}
                fond={COLORS.greenLight}
              />
            </section>

            <section className="pat-finance-card">
              <div className="pat-section-heading">
                <div className="pat-heading-icon">
                  <Wallet size={18} />
                </div>
                <div>
                  <h2>Résumé comptable</h2>
                  <p>Total de toutes les visites du patient.</p>
                </div>
              </div>

              <div className="pat-finance-grid">
                <div className="pat-finance-item pat-medicaments">
                  <span>Médicaments</span>
                  <strong>
                    {formaterMontant(statistiques.totalMedicaments)}
                  </strong>
                </div>

                <div className="pat-finance-item pat-soins">
                  <span>Soins</span>
                  <strong>{formaterMontant(statistiques.totalSoins)}</strong>
                </div>

                <div className="pat-finance-item pat-finance-total">
                  <span>Total général</span>
                  <strong>
                    {formaterMontant(statistiques.totalGeneral)}
                  </strong>
                </div>
              </div>

              {statistiques.nombreHospitalisations > 0 && (
                <div className="pat-hospitalisation-note">
                  <Hospital size={15} />
                  {statistiques.nombreHospitalisations} visite
                  {statistiques.nombreHospitalisations > 1 ? "s" : ""} avec
                  hospitalisation
                </div>
              )}
            </section>

            <section className="pat-history-section">
              <div className="pat-history-heading">
                <div>
                  <h2>Historique des visites</h2>
                  <p>De la plus récente à la plus ancienne.</p>
                </div>

                <span className="pat-count">
                  {historique.length} dossier{historique.length > 1 ? "s" : ""}
                </span>
              </div>

              {historique.length === 0 ? (
                <Vide
                  icone={FileText}
                  titre="Aucune visite"
                  description="Les comptabilités de ce patient apparaîtront ici."
                />
              ) : (
                <div className="pat-history-list">
                  {historique.map((comptabilite, index) => {
                    const medicaments = Array.isArray(comptabilite.medicaments)
                      ? comptabilite.medicaments
                      : [];

                    const soins = Array.isArray(comptabilite.soins_lignes)
                      ? comptabilite.soins_lignes
                      : [];

                    const totalMedicaments = montantNombre(
                      comptabilite.total_medicaments
                    );

                    const totalSoins = montantNombre(comptabilite.total_soins);

                    const totalGeneral = montantNombre(
                      comptabilite.total_general
                    );

                    return (
                      <article
                        className="pat-visit-card"
                        key={comptabilite.id}
                      >
                        <div className="pat-visit-header">
                          <div className="pat-visit-date-icon">
                            <CalendarDays size={18} />
                          </div>

                          <div className="pat-visit-heading-text">
                            <h3>
                              Visite du{" "}
                              {formaterDate(
                                comptabilite.date_comptabilite,
                                true
                              )}
                            </h3>
                            <span>
                              Dossier #{index + 1} · Réf.{" "}
                              {String(comptabilite.id).slice(0, 8)}
                            </span>
                          </div>

                          <div className="pat-visit-total">
                            <span>Total de la visite</span>
                            <strong>{formaterMontant(totalGeneral)}</strong>
                          </div>
                        </div>

                        <div className="pat-visit-summary">
                          <div className="pat-summary-item">
                            <span>Soins / observation</span>
                            <strong>
                              {comptabilite.soins?.trim() || "Non renseigné"}
                            </strong>
                          </div>

                          <div className="pat-summary-item">
                            <span>Hospitalisation</span>
                            <strong>
                              {comptabilite.hospitalisation ? (
                                <Badge couleur="orange">
                                  <Hospital size={12} /> Oui
                                </Badge>
                              ) : (
                                <Badge couleur="gris">Non</Badge>
                              )}
                            </strong>
                          </div>
                        </div>

                        <div className="pat-visit-content">
                          <div className="pat-subsection-heading">
                            <div className="pat-subsection-icon pat-subsection-blue">
                              <Package size={17} />
                            </div>

                            <div>
                              <h4>Médicaments</h4>
                              <p>
                                {medicaments.length} référence
                                {medicaments.length > 1 ? "s" : ""}
                              </p>
                            </div>

                            <strong className="pat-subsection-total pat-total-blue">
                              {formaterMontant(totalMedicaments)}
                            </strong>
                          </div>

                          {medicaments.length === 0 ? (
                            <p className="pat-no-lines">
                              Aucun médicament enregistré.
                            </p>
                          ) : (
                            <div className="pat-table-wrap">
                              <table className="pat-table">
                                <thead>
                                  <tr>
                                    <th>Médicament</th>
                                    <th className="pat-align-right">Qté</th>
                                    <th className="pat-align-right">Prix unit.</th>
                                    <th className="pat-align-right">Total</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {medicaments.map((medicament, i) => (
                                    <tr
                                      key={`${medicament.medicament_id || medicament.nom}-${i}`}
                                    >
                                      <td>
                                        <div className="pat-product-name">
                                          <span className="pat-product-dot" />
                                          <strong>
                                            {medicament.nom || "Médicament inconnu"}
                                          </strong>
                                        </div>
                                      </td>

                                      <td className="pat-align-right">
                                        <Badge couleur="bleu">
                                          ×{medicament.quantite ?? 0}
                                        </Badge>
                                      </td>

                                      <td className="pat-align-right">
                                        {formaterMontant(
                                          medicament.prix_unitaire
                                        )}
                                      </td>

                                      <td className="pat-align-right pat-cell-total pat-total-blue">
                                        {formaterMontant(
                                          medicament.prix_total ??
                                            montantNombre(
                                              medicament.prix_unitaire
                                            ) *
                                              montantNombre(medicament.quantite)
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        <div className="pat-visit-content pat-care-content">
                          <div className="pat-subsection-heading">
                            <div className="pat-subsection-icon pat-subsection-green">
                              <Stethoscope size={17} />
                            </div>

                            <div>
                              <h4>Soins effectués</h4>
                              <p>
                                {soins.length} prestation
                                {soins.length > 1 ? "s" : ""}
                              </p>
                            </div>

                            <strong className="pat-subsection-total pat-total-green">
                              {formaterMontant(totalSoins)}
                            </strong>
                          </div>

                          {soins.length === 0 ? (
                            <p className="pat-no-lines">
                              Aucun soin détaillé enregistré.
                            </p>
                          ) : (
                            <div className="pat-table-wrap">
                              <table className="pat-table">
                                <thead>
                                  <tr>
                                    <th>Prestation / soin</th>
                                    <th className="pat-align-right">Qté</th>
                                    <th className="pat-align-right">Prix unit.</th>
                                    <th className="pat-align-right">Total</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {soins.map((soin, i) => (
                                    <tr key={`${soin.soin_id || soin.nom}-${i}`}>
                                      <td>
                                        <div className="pat-product-name">
                                          <span className="pat-care-dot" />
                                          <strong>
                                            {soin.nom || "Soin inconnu"}
                                          </strong>
                                        </div>
                                      </td>

                                      <td className="pat-align-right">
                                        {soin.quantite ?? 0}
                                      </td>

                                      <td className="pat-align-right">
                                        {formaterMontant(soin.prix_unitaire)}
                                      </td>

                                      <td className="pat-align-right pat-cell-total pat-total-green">
                                        {formaterMontant(
                                          soin.prix_total ??
                                            montantNombre(soin.prix_unitaire) *
                                              montantNombre(soin.quantite)
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        <div className="pat-visit-footer">
                          <div className="pat-visit-footer-label">
                            <ShieldCheck size={16} />
                            Récapitulatif
                          </div>

                          <div className="pat-visit-footer-values">
                            <span>
                              Médicaments :{" "}
                              <strong>
                                {formaterMontant(totalMedicaments)}
                              </strong>
                            </span>

                            <span>
                              Soins :{" "}
                              <strong>{formaterMontant(totalSoins)}</strong>
                            </span>

                            <span className="pat-footer-grand-total">
                              Total :{" "}
                              <strong>{formaterMontant(totalGeneral)}</strong>
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          patients.length > 0 &&
          patientsFiltres.length > 0 && (
            <Vide
              icone={UserRound}
              titre="Sélectionne un patient"
              description="Choisis un patient dans la liste."
            />
          )
        )}

        <footer className="pat-page-footer">
          <Clock3 size={13} />
          Données issues des dossiers et comptabilités enregistrés.
        </footer>
      </main>
    </>
  );
}

/* =========================
   STYLES
========================= */

const styles = `
.pat-page {
  width: 100%;
  min-width: 0;
  padding: 18px;
  color: ${COLORS.text};
  background: #FFFFFF;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
  font-size: 12px;
  line-height: 1.45;
}

.pat-page *,
.pat-page *::before,
.pat-page *::after {
  box-sizing: border-box;
}

.pat-page button,
.pat-page input,
.pat-page select {
  font: inherit;
}

.pat-page h1,
.pat-page h2,
.pat-page h3,
.pat-page h4,
.pat-page p {
  overflow-wrap: anywhere;
}

.pat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 17px;
}

.pat-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.pat-header-icon,
.pat-heading-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: ${COLORS.greenDark};
  background: ${COLORS.greenLight};
  border: 1px solid ${COLORS.border};
  border-radius: 10px;
}

.pat-header-icon {
  width: 43px;
  height: 43px;
}

.pat-header h1 {
  margin: 0 0 3px;
  color: ${COLORS.greenDark};
  font-size: 19px;
  font-weight: 750;
  line-height: 1.3;
}

.pat-header p {
  margin: 0;
  color: ${COLORS.muted};
  font-size: 11px;
}

.pat-refresh-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid ${COLORS.border};
  border-radius: 8px;
  color: ${COLORS.greenDark};
  background: #FFFFFF;
  font-size: 11px;
  font-weight: 650;
  cursor: pointer;
}

.pat-refresh-button:hover:not(:disabled) {
  background: ${COLORS.greenLight};
}

.pat-refresh-button:disabled {
  opacity: .65;
  cursor: wait;
}

.pat-spin {
  animation: pat-spin 1s linear infinite;
}

@keyframes pat-spin {
  to { transform: rotate(360deg); }
}

.pat-error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
  padding: 11px;
  border: 1px solid #F0CACA;
  border-radius: 9px;
  color: ${COLORS.red};
  background: ${COLORS.redLight};
}

.pat-error p {
  margin: 3px 0 0;
  overflow-wrap: anywhere;
}

.pat-error button {
  margin-left: auto;
  border: 1px solid #E8B7B7;
  border-radius: 6px;
  padding: 5px 8px;
  color: ${COLORS.red};
  background: #FFFFFF;
  cursor: pointer;
}

.pat-selector-card,
.pat-profile-card,
.pat-finance-card,
.pat-visit-card,
.pat-stat-card {
  min-width: 0;
  border: 1px solid ${COLORS.border};
  border-radius: 11px;
  background: #FFFFFF;
  box-shadow: 0 2px 7px rgba(35, 75, 48, .035);
}

.pat-selector-card {
  margin-bottom: 14px;
  padding: 15px;
}

.pat-section-heading,
.pat-finance-title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 13px;
}

.pat-heading-icon {
  width: 34px;
  height: 34px;
}

.pat-section-heading h2,
.pat-finance-title h2,
.pat-history-heading h2 {
  margin: 0 0 3px;
  color: ${COLORS.text};
  font-size: 13px;
  font-weight: 750;
}

.pat-section-heading p,
.pat-finance-title p,
.pat-history-heading p {
  margin: 0;
  color: ${COLORS.muted};
  font-size: 10.5px;
}

.pat-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: auto;
  padding: 5px 8px;
  border: 1px solid ${COLORS.border};
  border-radius: 7px;
  color: ${COLORS.greenDark};
  background: ${COLORS.greenLight};
  font-size: 10px;
  font-weight: 700;
}

.pat-selector-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 12px;
}

.pat-field {
  min-width: 0;
}

.pat-field label {
  display: block;
  margin-bottom: 5px;
  color: #43574A;
  font-size: 10.5px;
  font-weight: 700;
}

.pat-input-wrap,
.pat-select-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 37px;
  width: 100%;
  padding: 0 9px;
  border: 1px solid ${COLORS.border};
  border-radius: 8px;
  color: ${COLORS.muted};
  background: #FFFFFF;
}

.pat-input-wrap:focus-within,
.pat-select-wrap:focus-within {
  border-color: ${COLORS.green};
  box-shadow: 0 0 0 2px rgba(54, 118, 93, .10);
}

.pat-input-wrap input,
.pat-select-wrap select {
  width: 100%;
  min-width: 0;
  height: 35px;
  padding: 0;
  border: 0;
  outline: 0;
  color: ${COLORS.text};
  background: transparent;
  font-size: 11px;
}

.pat-input-wrap input::placeholder {
  color: #87948A;
}

.pat-select-wrap select {
  appearance: none;
  padding-right: 20px;
  cursor: pointer;
}

.pat-select-chevron {
  position: absolute;
  right: 9px;
  pointer-events: none;
}

.pat-inline-empty {
  margin-top: 10px;
  padding: 9px;
  border-radius: 7px;
  color: ${COLORS.muted};
  background: #F7F9F4;
  font-size: 11px;
}

.pat-profile-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
  padding: 15px;
}

.pat-profile-main {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  min-width: 0;
}

.pat-avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 49px;
  height: 49px;
  border: 1px solid #D3E3C8;
  border-radius: 11px;
  color: ${COLORS.greenDark};
  background: ${COLORS.greenLight};
  font-size: 16px;
  font-weight: 800;
}

.pat-profile-identity {
  min-width: 0;
}

.pat-profile-name-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin: 1px 0 8px;
}

.pat-profile-name-line h2 {
  margin: 0;
  color: ${COLORS.text};
  font-size: 15px;
  font-weight: 750;
}

.pat-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 5px;
  font-size: 9.5px;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
}

.pat-badge-vert {
  color: ${COLORS.greenDark};
  background: ${COLORS.greenLight};
}

.pat-badge-bleu {
  color: ${COLORS.blue};
  background: ${COLORS.blueLight};
}

.pat-badge-orange {
  color: ${COLORS.orange};
  background: ${COLORS.orangeLight};
}

.pat-badge-gris {
  color: #5F6B62;
  background: #F0F2ED;
}

.pat-profile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 12px;
}

.pat-profile-meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: ${COLORS.muted};
  font-size: 10.5px;
}

.pat-profile-meta svg {
  flex-shrink: 0;
  color: ${COLORS.green};
}

.pat-address {
  margin: 7px 0 0;
  color: ${COLORS.muted};
  font-size: 10.5px;
}

.pat-profile-date {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  gap: 4px;
}

.pat-profile-date span {
  color: ${COLORS.muted};
  font-size: 9.5px;
}

.pat-profile-date strong {
  color: ${COLORS.greenDark};
  font-size: 10.5px;
}

.pat-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.pat-stat-card {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px;
}

.pat-stat-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 8px;
}

.pat-stat-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.pat-stat-title {
  color: ${COLORS.muted};
  font-size: 10px;
}

.pat-stat-value {
  color: ${COLORS.text};
  font-size: 15px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.pat-finance-card {
  margin-bottom: 19px;
  padding: 15px;
}

.pat-finance-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.pat-finance-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 11px;
  border: 1px solid ${COLORS.border};
  border-radius: 8px;
  background: #FFFFFF;
}

.pat-finance-item span {
  color: ${COLORS.muted};
  font-size: 10px;
}

.pat-finance-item strong {
  color: ${COLORS.text};
  font-size: 14px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.pat-medicaments {
  border-color: #D6E4F7;
  background: #F6F9FE;
}

.pat-medicaments strong {
  color: ${COLORS.blue};
}

.pat-soins {
  border-color: #D5E8D8;
  background: #F4F9F2;
}

.pat-soins strong {
  color: ${COLORS.greenDark};
}

.pat-finance-total {
  border-color: #D2E0AD;
  background: #F4F7E7;
}

.pat-finance-total strong {
  color: #536D20;
  font-size: 15px;
}

.pat-hospitalisation-note {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 7px;
  color: ${COLORS.orange};
  background: ${COLORS.orangeLight};
  font-size: 10.5px;
}

.pat-history-section {
  min-width: 0;
}

.pat-history-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 11px;
}

.pat-history-heading h2 {
  font-size: 15px;
}

.pat-history-list {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.pat-visit-card {
  overflow: hidden;
}

.pat-visit-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid ${COLORS.border};
  background: #F8FAF5;
}

.pat-visit-date-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 1px solid #E7D9A9;
  border-radius: 8px;
  color: ${COLORS.orange};
  background: ${COLORS.orangeLight};
}

.pat-visit-heading-text {
  min-width: 0;
}

.pat-visit-heading-text h3 {
  margin: 0 0 3px;
  color: ${COLORS.text};
  font-size: 12px;
  font-weight: 750;
}

.pat-visit-heading-text span {
  color: ${COLORS.muted};
  font-size: 9.5px;
}

.pat-visit-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  margin-left: auto;
  flex-shrink: 0;
}

.pat-visit-total span {
  color: ${COLORS.muted};
  font-size: 9.5px;
}

.pat-visit-total strong {
  color: #536D20;
  font-size: 14px;
  font-weight: 800;
}

.pat-visit-summary {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, .8fr);
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid ${COLORS.border};
  background: #FFFFFF;
}

.pat-summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pat-summary-item > span {
  color: ${COLORS.muted};
  font-size: 9.5px;
}

.pat-summary-item > strong {
  color: ${COLORS.text};
  font-size: 10.5px;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.pat-visit-content {
  padding: 13px 14px;
}

.pat-care-content {
  border-top: 1px solid ${COLORS.border};
  background: #FCFDFB;
}

.pat-subsection-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 9px;
}

.pat-subsection-icon {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  flex-shrink: 0;
  border-radius: 7px;
}

.pat-subsection-blue {
  color: ${COLORS.blue};
  background: ${COLORS.blueLight};
}

.pat-subsection-green {
  color: ${COLORS.green};
  background: ${COLORS.greenLight};
}

.pat-subsection-heading h4 {
  margin: 0 0 2px;
  color: ${COLORS.text};
  font-size: 11.5px;
  font-weight: 750;
}

.pat-subsection-heading p {
  margin: 0;
  color: ${COLORS.muted};
  font-size: 9.5px;
}

.pat-subsection-total {
  margin-left: auto;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.pat-total-blue {
  color: ${COLORS.blue};
}

.pat-total-green {
  color: ${COLORS.greenDark};
}

.pat-table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid ${COLORS.border};
  border-radius: 7px;
}

.pat-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10.5px;
}

.pat-table th {
  padding: 8px 9px;
  border-bottom: 1px solid ${COLORS.border};
  color: #526255;
  background: #F5F8EE;
  font-size: 9.5px;
  font-weight: 750;
  text-align: left;
  white-space: nowrap;
}

.pat-table td {
  padding: 9px;
  border-bottom: 1px solid #EDF0E7;
  color: #526055;
  vertical-align: middle;
}

.pat-table tbody tr:last-child td {
  border-bottom: 0;
}

.pat-table tbody tr:hover {
  background: #FAFCF7;
}

.pat-align-right {
  text-align: right !important;
  white-space: nowrap;
}

.pat-product-name {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 100px;
}

.pat-product-name strong {
  color: ${COLORS.text};
  font-weight: 650;
  overflow-wrap: anywhere;
}

.pat-product-dot,
.pat-care-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${COLORS.blue};
}

.pat-care-dot {
  background: ${COLORS.green};
}

.pat-cell-total {
  font-weight: 750;
}

.pat-no-lines {
  margin: 0;
  padding: 10px;
  border: 1px dashed ${COLORS.border};
  border-radius: 7px;
  color: ${COLORS.muted};
  background: #FBFCF8;
  font-size: 10.5px;
}

.pat-visit-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 9px;
  padding: 10px 14px;
  border-top: 1px solid ${COLORS.border};
  background: #F7F9F0;
}

.pat-visit-footer-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${COLORS.greenDark};
  font-size: 10px;
  font-weight: 700;
}

.pat-visit-footer-values {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px 13px;
}

.pat-visit-footer-values > span {
  color: ${COLORS.muted};
  font-size: 9.5px;
}

.pat-visit-footer-values strong {
  color: ${COLORS.text};
  font-size: 10.5px;
}

.pat-visit-footer-values .pat-footer-grand-total,
.pat-visit-footer-values .pat-footer-grand-total strong {
  color: #536D20;
  font-weight: 800;
}

.pat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 27px 16px;
  border: 1px dashed ${COLORS.border};
  border-radius: 10px;
  color: ${COLORS.green};
  text-align: center;
  background: #FFFFFF;
}

.pat-empty > strong {
  color: ${COLORS.text};
  font-size: 12px;
}

.pat-empty p {
  max-width: 400px;
  margin: 0;
  color: ${COLORS.muted};
  font-size: 10.5px;
}

.pat-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 230px;
  color: ${COLORS.green};
}

.pat-loading strong {
  color: ${COLORS.text};
  font-size: 12px;
}

.pat-page-footer {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 18px;
  padding-top: 10px;
  border-top: 1px solid ${COLORS.border};
  color: ${COLORS.muted};
  font-size: 9.5px;
}

@media (max-width: 1000px) {
  .pat-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pat-profile-card {
    align-items: flex-start;
  }
}

@media (max-width: 650px) {
  .pat-page {
    padding: 11px;
  }

  .pat-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .pat-refresh-button {
    width: 100%;
  }

  .pat-selector-grid,
  .pat-finance-grid,
  .pat-stats-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .pat-profile-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .pat-profile-date {
    align-items: flex-start;
    padding-left: 60px;
  }

  .pat-visit-header {
    flex-wrap: wrap;
  }

  .pat-visit-total {
    align-items: flex-start;
    width: 100%;
    margin-left: 46px;
  }

  .pat-visit-summary {
    grid-template-columns: minmax(0, 1fr);
  }

  .pat-table {
    min-width: 490px;
  }

  .pat-visit-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .pat-visit-footer-values {
    justify-content: flex-start;
  }

  .pat-error {
    flex-wrap: wrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pat-spin {
    animation: none;
  }
}
`;