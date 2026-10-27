
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  FileText,
  Hash,
  Hospital,
  Package,
  Search,
  Stethoscope,
  User,
  X,
  RefreshCw,
  ClipboardList,
  Wallet,
  CalendarCheck,
} from "lucide-react";

/* ============================================================
   FORMATAGE
============================================================ */

function formaterMontant(montant) {
  return `${Number(montant || 0).toLocaleString("fr-FR")} Ar`;
}

function formaterHeure(date) {
  if (!date) return "--:--";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "--:--";

  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formaterDate(date) {
  if (!date) return "Date inconnue";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "Date inconnue";

  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formaterDateComplete(date) {
  if (!date) return "Date inconnue";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "Date inconnue";

  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function obtenirNomPatient(dossier) {
  return [
    dossier?.patient_nom,
    dossier?.patient_prenom,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Patient inconnu";
}

function obtenirMedicaments(dossier) {
  return Array.isArray(dossier?.medicaments)
    ? dossier.medicaments
    : [];
}

function obtenirSoins(dossier) {
  return Array.isArray(dossier?.soins_lignes)
    ? dossier.soins_lignes
    : [];
}

function obtenirTotalSoins(dossier) {
  if (dossier?.total_soins !== undefined) {
    return Number(dossier.total_soins || 0);
  }

  return obtenirSoins(dossier).reduce(
    (total, soin) =>
      total +
      Number(soin?.prix_total ?? soin?.prix_unitaire ?? 0),
    0
  );
}

function obtenirTotalMedicaments(dossier) {
  if (dossier?.total_medicaments !== undefined) {
    return Number(dossier.total_medicaments || 0);
  }

  return obtenirMedicaments(dossier).reduce(
    (total, medicament) =>
      total + Number(medicament?.prix_total || 0),
    0
  );
}

function calculerTotalComptabilite(dossier) {
  if (dossier?.total_general !== undefined) {
    return Number(dossier.total_general || 0);
  }

  return (
    obtenirTotalMedicaments(dossier) +
    obtenirTotalSoins(dossier)
  );
}

function getDateKey(date) {
  if (!date) return "date-inconnue";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "date-inconnue";

  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");

  return `${annee}-${mois}-${jour}`;
}

function getDateLabel(date) {
  return formaterDateComplete(date);
}

/* ============================================================
   PETIT COMPOSANT DE CHARGEMENT
============================================================ */

function IndicateurChargement({ texte }) {
  return (
    <div className="cl3d-loading">
      <div className="cl3d-spinner" />
      <p>{texte}</p>
    </div>
  );
}

/* ============================================================
   COMPOSANT PRINCIPAL
============================================================ */

export default function ComptabiliteListe() {
  const [comptabilites, setComptabilites] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [dateRecherchee, setDateRecherchee] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const [detail, setDetail] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);

  const [sortieDetail, setSortieDetail] = useState(null);
  const [chargementSortie, setChargementSortie] = useState(false);

  const [groupesOuverts, setGroupesOuverts] = useState({});

  /* ============================================================
     CHARGEMENT DES COMPTABILITÉS
  ============================================================ */

  async function chargerComptabilites() {
    try {
      setChargement(true);
      setErreur("");

      const resultat = await invoke("obtenir_comptabilites");

      setComptabilites(
        Array.isArray(resultat) ? resultat : []
      );
    } catch (error) {
      console.error(error);

      setErreur(
        typeof error === "string"
          ? error
          : "Impossible de charger les comptabilités."
      );
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerComptabilites();
  }, []);

  /* ============================================================
     RECHERCHE ET FILTRES
  ============================================================ */

  const comptabilitesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return comptabilites.filter((dossier) => {
      const patient = obtenirNomPatient(dossier);

      const nomsMedicaments = obtenirMedicaments(dossier)
        .map((medicament) => medicament?.nom || "")
        .join(" ");

      const nomsSoins = obtenirSoins(dossier)
        .map((soin) => soin?.nom || "")
        .join(" ");

      const texte = [
        patient,
        nomsMedicaments,
        nomsSoins,
        dossier?.id || "",
      ]
        .join(" ")
        .toLowerCase();

      const correspondRecherche =
        !terme || texte.includes(terme);

      const correspondDate =
        !dateRecherchee ||
        getDateKey(dossier?.date_comptabilite) === dateRecherchee;

      return correspondRecherche && correspondDate;
    });
  }, [comptabilites, recherche, dateRecherchee]);

  /* ============================================================
     GROUPES PAR JOUR
  ============================================================ */

  const groupes = useMemo(() => {
    const resultat = {};

    comptabilitesFiltrees.forEach((dossier) => {
      const key = getDateKey(dossier?.date_comptabilite);

      if (!resultat[key]) {
        resultat[key] = {
          date: dossier?.date_comptabilite,
          elements: [],
        };
      }

      resultat[key].elements.push(dossier);
    });

    return Object.entries(resultat).sort(
      ([keyA], [keyB]) => keyB.localeCompare(keyA)
    );
  }, [comptabilitesFiltrees]);

  function toggleGroupe(key) {
    setGroupesOuverts((precedent) => ({
      ...precedent,
      [key]: precedent[key] === false,
    }));
  }

  /* ============================================================
     DÉTAIL D'UNE COMPTABILITÉ
  ============================================================ */

  async function ouvrirDetail(comptabiliteId) {
    try {
      setErreur("");
      setChargementDetail(true);
      setDetail(null);

      const resultat = await invoke(
        "obtenir_detail_comptabilite",
        { comptabiliteId }
      );

      setDetail(resultat);
    } catch (error) {
      console.error(error);

      setErreur(
        typeof error === "string"
          ? error
          : "Impossible de charger le détail de la comptabilité."
      );
    } finally {
      setChargementDetail(false);
    }
  }

  /* ============================================================
     DÉTAIL D'UNE SORTIE DE MÉDICAMENTS
  ============================================================ */

  async function ouvrirSortie(sortieId) {
    if (!sortieId) return;

    try {
      setErreur("");
      setChargementSortie(true);
      setSortieDetail(null);

      const resultat = await invoke(
        "obtenir_detail_sortie_medicament",
        { id: sortieId }
      );

      setSortieDetail(resultat);
    } catch (error) {
      console.error(
        "Erreur lors du chargement du détail de la sortie :",
        error
      );

      setErreur(
        `Impossible de charger le détail de la sortie : ${
          typeof error === "string" ? error : JSON.stringify(error)
        }`
      );
    } finally {
      setChargementSortie(false);
    }
  }

  /* ============================================================
     STATISTIQUES
  ============================================================ */

  const statistiques = useMemo(() => {
    return comptabilitesFiltrees.reduce(
      (acc, dossier) => {
        acc.dossiers += 1;
        acc.total += calculerTotalComptabilite(dossier);
        acc.totalSoins += obtenirTotalSoins(dossier);

        if (dossier?.hospitalisation === true) {
          acc.hospitalisations += 1;
        }

        return acc;
      },
      {
        dossiers: 0,
        total: 0,
        totalSoins: 0,
        hospitalisations: 0,
      }
    );
  }, [comptabilitesFiltrees]);

  /* ============================================================
     ÉCRAN DE CHARGEMENT INITIAL
  ============================================================ */

  if (chargement) {
    return (
      <div className="cl3d-page">
        <style>{stylesComptabilite}</style>

        <div className="cl3d-loading-page">
          <IndicateurChargement texte="Chargement des comptabilités..." />
        </div>
      </div>
    );
  }

  return (
    <div className="cl3d-page">
      <style>{stylesComptabilite}</style>

      {/* EN-TÊTE */}

      <header className="cl3d-header">
        <div className="cl3d-heading">
          <div className="cl3d-heading-icon">
            <FileText size={23} />
          </div>

          <div>
            <p className="cl3d-eyebrow">GESTION FINANCIÈRE</p>
            <h1>Liste des comptabilités</h1>
            <p className="cl3d-subtitle">
              Historique des dossiers et suivi des opérations
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={chargerComptabilites}
          className="cl3d-button cl3d-button-primary"
        >
          <RefreshCw size={15} />
          Actualiser
        </button>
      </header>

      {/* ERREUR */}

      {erreur && (
        <div className="cl3d-error">
          <div className="cl3d-error-message">
            <X size={17} />
            <span>{erreur}</span>
          </div>

          <button
            type="button"
            onClick={() => setErreur("")}
            aria-label="Fermer le message"
            className="cl3d-icon-button"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* STATISTIQUES */}

      <section className="cl3d-stats">
        <article className="cl3d-stat-card">
          <div className="cl3d-stat-top">
            <span>Dossiers enregistrés</span>
            <div className="cl3d-stat-icon green">
              <ClipboardList size={19} />
            </div>
          </div>
          <strong>{statistiques.dossiers}</strong>
          <small>Résultats correspondant aux filtres</small>
        </article>

        <article className="cl3d-stat-card">
          <div className="cl3d-stat-top">
            <span>Montant total</span>
            <div className="cl3d-stat-icon blue">
              <Wallet size={19} />
            </div>
          </div>
          <strong className="cl3d-stat-money">
            {formaterMontant(statistiques.total)}
          </strong>
          <small>Total des dossiers affichés</small>
        </article>

        <article className="cl3d-stat-card">
          <div className="cl3d-stat-top">
            <span>Total des soins</span>
            <div className="cl3d-stat-icon purple">
              <Stethoscope size={19} />
            </div>
          </div>
          <strong className="cl3d-stat-money">
            {formaterMontant(statistiques.totalSoins)}
          </strong>
          <small>Montant des prestations de soins</small>
        </article>

        <article className="cl3d-stat-card">
          <div className="cl3d-stat-top">
            <span>Hospitalisations</span>
            <div className="cl3d-stat-icon orange">
              <Hospital size={19} />
            </div>
          </div>
          <strong>{statistiques.hospitalisations}</strong>
          <small>Dossiers avec hospitalisation</small>
        </article>
      </section>

      {/* RECHERCHE ET DATE */}

      <section className="cl3d-filter-panel">
        <div className="cl3d-filter-heading">
          <div>
            <h2>Rechercher une opération</h2>
            <p>Filtre les dossiers par patient, médicament, soin ou date.</p>
          </div>

          {(recherche || dateRecherchee) && (
            <button
              type="button"
              className="cl3d-clear-button"
              onClick={() => {
                setRecherche("");
                setDateRecherchee("");
              }}
            >
              Effacer les filtres
            </button>
          )}
        </div>

        <div className="cl3d-filters">
          <label className="cl3d-search">
            <Search size={17} />
            <input
              type="text"
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Patient, médicament, soin ou identifiant..."
            />

            {recherche && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => setRecherche("")}
              >
                <X size={15} />
              </button>
            )}
          </label>

          <label className="cl3d-date-filter">
            <CalendarDays size={17} />
            <input
              type="date"
              value={dateRecherchee}
              onChange={(event) => setDateRecherchee(event.target.value)}
              aria-label="Filtrer par date"
            />
          </label>
        </div>

        <div className="cl3d-filter-footer">
          <span>
            <strong>{comptabilitesFiltrees.length}</strong>
            {" "}dossier(s) trouvé(s)
          </span>

          <span>
            <CalendarCheck size={14} />
            {groupes.length} journée(s)
          </span>
        </div>
      </section>

      {/* LISTE DES JOURNÉES */}

      {groupes.length === 0 ? (
        <section className="cl3d-empty">
          <div className="cl3d-empty-icon">
            <FileText size={26} />
          </div>

          <h3>Aucune comptabilité trouvée</h3>
          <p>
            Aucune comptabilité ne correspond aux critères sélectionnés.
          </p>

          {(recherche || dateRecherchee) && (
            <button
              type="button"
              className="cl3d-button cl3d-button-primary"
              onClick={() => {
                setRecherche("");
                setDateRecherchee("");
              }}
            >
              Réinitialiser les filtres
            </button>
          )}
        </section>
      ) : (
        <section className="cl3d-groups">
          {groupes.map(([key, groupe]) => {
            const ouvert = groupesOuverts[key] !== false;

            const totalJour = groupe.elements.reduce(
              (total, dossier) =>
                total + calculerTotalComptabilite(dossier),
              0
            );

            return (
              <article className="cl3d-day-card" key={key}>
                <button
                  type="button"
                  className="cl3d-day-header"
                  onClick={() => toggleGroupe(key)}
                  aria-expanded={ouvert}
                >
                  <div className="cl3d-day-main">
                    <div className="cl3d-day-icon">
                      <CalendarDays size={19} />
                    </div>

                    <div className="cl3d-day-label">
                      <h2>{getDateLabel(groupe.date)}</h2>
                      <p>
                        {groupe.elements.length}{" "}
                        {groupe.elements.length > 1
                          ? "comptabilités"
                          : "comptabilité"}
                      </p>
                    </div>
                  </div>

                  <div className="cl3d-day-right">
                    <div className="cl3d-day-total">
                      <small>Total de la journée</small>
                      <strong>{formaterMontant(totalJour)}</strong>
                    </div>

                    <span className="cl3d-chevron">
                      {ouvert ? (
                        <ChevronUp size={19} />
                      ) : (
                        <ChevronDown size={19} />
                      )}
                    </span>
                  </div>
                </button>

                {ouvert && (
                  <div className="cl3d-table-scroll">
                    <table className="cl3d-table">
                      <thead>
                        <tr>
                          <th>Heure</th>
                          <th>Patient</th>
                          <th>Médicaments</th>
                          <th>Soins</th>
                          <th className="align-right">Montant</th>
                          <th className="align-center">Hospitalisation</th>
                          <th className="align-center">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {groupe.elements.map((dossier) => {
                          const medicaments = obtenirMedicaments(dossier);
                          const soins = obtenirSoins(dossier);
                          const totalMedicaments =
                            obtenirTotalMedicaments(dossier);
                          const totalSoins =
                            obtenirTotalSoins(dossier);
                          const totalGeneral =
                            calculerTotalComptabilite(dossier);

                          return (
                            <tr key={dossier.id}>
                              <td>
                                <span className="cl3d-time">
                                  <Clock3 size={14} />
                                  {formaterHeure(
                                    dossier.date_comptabilite
                                  )}
                                </span>
                              </td>

                              <td>
                                <div className="cl3d-patient">
                                  <div className="cl3d-avatar">
                                    <User size={15} />
                                  </div>
                                  <div className="cl3d-patient-info">
                                    <strong>
                                      {obtenirNomPatient(dossier)}
                                    </strong>
                                    <small>Patient</small>
                                  </div>
                                </div>
                              </td>

                              <td>
                                {medicaments.length === 0 ? (
                                  <span className="cl3d-muted">
                                    Aucun médicament
                                  </span>
                                ) : (
                                  <div className="cl3d-item-list">
                                    {medicaments.map((medicament, index) => (
                                      <div
                                        className="cl3d-item"
                                        key={
                                          medicament.medicament_id ??
                                          `${medicament.nom}-${index}`
                                        }
                                      >
                                        <span className="cl3d-item-icon">
                                          <Package size={13} />
                                        </span>

                                        <span className="cl3d-item-name">
                                          {medicament.nom || "Médicament"}
                                        </span>

                                        <span className="cl3d-quantity">
                                          ×{medicament.quantite ?? 0}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>

                              <td>
                                {soins.length === 0 ? (
                                  <span className="cl3d-muted">
                                    Aucun soin
                                  </span>
                                ) : (
                                  <div className="cl3d-item-list">
                                    {soins.map((soin, index) => (
                                      <div
                                        className="cl3d-item"
                                        key={
                                          soin.soin_id ??
                                          `${soin.nom}-${index}`
                                        }
                                      >
                                        <span className="cl3d-item-icon">
                                          <Stethoscope size={13} />
                                        </span>

                                        <span className="cl3d-item-name">
                                          {soin.nom || "Soin"}
                                        </span>

                                        <span className="cl3d-item-price">
                                          {formaterMontant(soin.prix_total)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>

                              <td className="align-right">
                                <div className="cl3d-amount-cell">
                                  <strong className="cl3d-amount">
                                    {formaterMontant(totalGeneral)}
                                  </strong>

                                  <small>
                                    Méd. {formaterMontant(totalMedicaments)}
                                  </small>

                                  <small>
                                    Soins {formaterMontant(totalSoins)}
                                  </small>
                                </div>
                              </td>

                              <td className="align-center">
                                {dossier.hospitalisation ? (
                                  <span className="cl3d-badge cl3d-badge-green">
                                    <Hospital size={12} />
                                    Oui
                                  </span>
                                ) : (
                                  <span className="cl3d-badge cl3d-badge-neutral">
                                    Non
                                  </span>
                                )}
                              </td>

                              <td className="align-center">
                                <button
                                  type="button"
                                  className="cl3d-view-button"
                                  title="Voir le détail"
                                  aria-label="Voir le détail de la comptabilité"
                                  onClick={() => ouvrirDetail(dossier.id)}
                                >
                                  <Eye size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {/* ============================================================
         MODAL DÉTAIL DE COMPTABILITÉ
      ============================================================ */}

      {(detail || chargementDetail) && (
        <div
          className="cl3d-overlay"
          onClick={() => {
            if (!chargementDetail) setDetail(null);
          }}
        >
          <section
            className="cl3d-modal cl3d-modal-large"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cl3d-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="cl3d-modal-header">
              <div className="cl3d-modal-heading">
                <div className="cl3d-heading-icon cl3d-heading-icon-small">
                  <FileText size={20} />
                </div>

                <div>
                  <h2 id="cl3d-detail-title">
                    Détail de la comptabilité
                  </h2>

                  {detail && (
                    <p>
                      {formaterDate(detail.date_comptabilite)}
                      {" à "}
                      {formaterHeure(detail.date_comptabilite)}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="cl3d-close-button"
                onClick={() => setDetail(null)}
                disabled={chargementDetail}
                aria-label="Fermer le détail"
              >
                <X size={19} />
              </button>
            </header>

            {chargementDetail ? (
              <IndicateurChargement texte="Chargement du détail..." />
            ) : detail ? (
              <div className="cl3d-modal-body">
                {/* PATIENT */}

                <section className="cl3d-detail-card">
                  <div className="cl3d-section-title">
                    <User size={17} />
                    <h3>Informations du patient</h3>
                  </div>

                  <div className="cl3d-patient-details">
                    <div>
                      <small>Nom complet</small>
                      <strong>{obtenirNomPatient(detail)}</strong>
                    </div>
                  </div>
                </section>

                {/* SOINS */}

                <section className="cl3d-detail-card">
                  <div className="cl3d-section-heading">
                    <div className="cl3d-section-title">
                      <Stethoscope size={18} />
                      <h3>Soins</h3>
                    </div>

                    <strong className="cl3d-section-total">
                      {formaterMontant(detail.total_soins)}
                    </strong>
                  </div>

                  {Array.isArray(detail.soins_lignes) &&
                  detail.soins_lignes.length > 0 ? (
                    <div className="cl3d-detail-table-wrap">
                      <table className="cl3d-detail-table">
                        <thead>
                          <tr>
                            <th>Soin</th>
                            <th className="align-center">Quantité</th>
                            <th className="align-right">Prix total</th>
                          </tr>
                        </thead>

                        <tbody>
                          {detail.soins_lignes.map((soin, index) => (
                            <tr
                              key={soin.soin_id ?? `${soin.nom}-${index}`}
                            >
                              <td>
                                <div className="cl3d-detail-product">
                                  <span className="cl3d-item-icon">
                                    <Stethoscope size={14} />
                                  </span>
                                  <strong>{soin.nom || "Soin"}</strong>
                                </div>
                              </td>

                              <td className="align-center">
                                <span className="cl3d-quantity">
                                  {soin.quantite ?? 1}
                                </span>
                              </td>

                              <td className="align-right">
                                <strong className="cl3d-section-total">
                                  {formaterMontant(soin.prix_total)}
                                </strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="cl3d-no-items">
                      Aucun soin enregistré.
                    </p>
                  )}
                </section>

                {/* MÉDICAMENTS */}

                <section className="cl3d-detail-card">
                  <div className="cl3d-section-heading">
                    <div className="cl3d-section-title">
                      <Package size={18} />
                      <h3>Médicaments</h3>
                    </div>

                    <strong className="cl3d-section-total">
                      {formaterMontant(detail.total_medicaments)}
                    </strong>
                  </div>

                  {Array.isArray(detail.medicaments) &&
                  detail.medicaments.length > 0 ? (
                    <div className="cl3d-detail-table-wrap">
                      <table className="cl3d-detail-table">
                        <thead>
                          <tr>
                            <th>Médicament</th>
                            <th className="align-center">Quantité</th>
                            <th className="align-right">Prix unitaire</th>
                            <th className="align-right">Total</th>
                          </tr>
                        </thead>

                        <tbody>
                          {detail.medicaments.map((medicament, index) => (
                            <tr
                              key={
                                medicament.medicament_id ??
                                `${medicament.nom}-${index}`
                              }
                            >
                              <td>
                                <div className="cl3d-detail-product">
                                  <span className="cl3d-item-icon">
                                    <Package size={14} />
                                  </span>
                                  <strong>
                                    {medicament.nom || "Médicament"}
                                  </strong>
                                </div>
                              </td>

                              <td className="align-center">
                                <span className="cl3d-quantity">
                                  {medicament.quantite ?? 0}
                                </span>
                              </td>

                              <td className="align-right">
                                {formaterMontant(
                                  medicament.prix_unitaire
                                )}
                              </td>

                              <td className="align-right">
                                <strong className="cl3d-section-total">
                                  {formaterMontant(
                                    medicament.prix_total
                                  )}
                                </strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="cl3d-no-items">
                      Aucun médicament enregistré.
                    </p>
                  )}
                </section>

                {/* HOSPITALISATION */}

                <section className="cl3d-detail-card">
                  <div className="cl3d-section-heading">
                    <div className="cl3d-section-title">
                      <Hospital size={18} />
                      <div>
                        <h3>Hospitalisation</h3>
                        <p>Statut du dossier</p>
                      </div>
                    </div>

                    <span
                      className={
                        detail.hospitalisation
                          ? "cl3d-badge cl3d-badge-green"
                          : "cl3d-badge cl3d-badge-neutral"
                      }
                    >
                      {detail.hospitalisation ? "Oui" : "Non"}
                    </span>
                  </div>
                </section>

                {/* SORTIE ASSOCIÉE */}

                {detail.sortie_id && (
                  <section className="cl3d-detail-card">
                    <div className="cl3d-section-heading">
                      <div>
                        <div className="cl3d-section-title">
                          <Package size={18} />
                          <h3>Sortie de médicaments</h3>
                        </div>

                        <p className="cl3d-subtitle cl3d-break">
                          Référence : {detail.sortie_id}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="cl3d-button cl3d-button-secondary"
                        onClick={() => ouvrirSortie(detail.sortie_id)}
                      >
                        <Eye size={15} />
                        Voir la sortie
                      </button>
                    </div>
                  </section>
                )}

                {/* TOTAL GÉNÉRAL */}

                <section className="cl3d-total-card">
                  <div className="cl3d-total-top">
                    <div>
                      <small>TOTAL GÉNÉRAL</small>
                      <p>Médicaments et soins</p>
                    </div>

                    <strong>
                      {formaterMontant(detail.total_general)}
                    </strong>
                  </div>

                  <div className="cl3d-total-breakdown">
                    <div>
                      <span>Total médicaments</span>
                      <strong>
                        {formaterMontant(detail.total_medicaments)}
                      </strong>
                    </div>

                    <div>
                      <span>Total soins</span>
                      <strong>
                        {formaterMontant(detail.total_soins)}
                      </strong>
                    </div>
                  </div>
                </section>
              </div>
            ) : null}
          </section>
        </div>
      )}

      {/* ============================================================
         MODAL SORTIE DE MÉDICAMENTS
      ============================================================ */}

      {(sortieDetail || chargementSortie) && (
        <div
          className="cl3d-overlay cl3d-overlay-top"
          onClick={() => {
            if (!chargementSortie) setSortieDetail(null);
          }}
        >
          <section
            className="cl3d-modal cl3d-modal-medium"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cl3d-sortie-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="cl3d-modal-header">
              <div className="cl3d-modal-heading">
                <div className="cl3d-heading-icon cl3d-heading-icon-small">
                  <Package size={20} />
                </div>

                <div>
                  <h2 id="cl3d-sortie-title">
                    Sortie de médicaments
                  </h2>

                  {sortieDetail && (
                    <p>
                      {formaterDate(sortieDetail.date_sortie)}
                      {" à "}
                      {formaterHeure(sortieDetail.date_sortie)}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="cl3d-close-button"
                onClick={() => setSortieDetail(null)}
                disabled={chargementSortie}
                aria-label="Fermer la sortie"
              >
                <X size={19} />
              </button>
            </header>

            {chargementSortie ? (
              <IndicateurChargement texte="Chargement de la sortie..." />
            ) : sortieDetail ? (
              <div className="cl3d-modal-body">
                <section className="cl3d-detail-card">
                  <div className="cl3d-section-title">
                    <User size={17} />
                    <div>
                      <small>Patient</small>
                      <h3>{obtenirNomPatient(sortieDetail)}</h3>
                    </div>
                  </div>
                </section>

                <section className="cl3d-detail-card">
                  <div className="cl3d-section-heading">
                    <div className="cl3d-section-title">
                      <Package size={18} />
                      <h3>Médicaments sortis</h3>
                    </div>

                    <strong className="cl3d-section-total">
                      {formaterMontant(sortieDetail.total_sortie)}
                    </strong>
                  </div>

                  {Array.isArray(sortieDetail.medicaments) &&
                  sortieDetail.medicaments.length > 0 ? (
                    <div className="cl3d-exit-list">
                      {sortieDetail.medicaments.map((medicament, index) => (
                        <div
                          className="cl3d-exit-item"
                          key={
                            medicament.medicament_id ??
                            `${medicament.nom}-${index}`
                          }
                        >
                          <span className="cl3d-item-icon">
                            <Package size={15} />
                          </span>

                          <div className="cl3d-exit-name">
                            <strong>
                              {medicament.nom || "Médicament"}
                            </strong>
                            <small>
                              Quantité : {medicament.quantite ?? 0}
                            </small>
                          </div>

                          <span className="cl3d-quantity">
                            ×{medicament.quantite ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="cl3d-no-items">
                      Aucun médicament dans cette sortie.
                    </p>
                  )}
                </section>

                <section className="cl3d-total-card">
                  <div className="cl3d-total-top">
                    <div>
                      <small>TOTAL DE LA SORTIE</small>
                      <p>Valeur totale des médicaments</p>
                    </div>

                    <strong>
                      {formaterMontant(sortieDetail.total_sortie)}
                    </strong>
                  </div>
                </section>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   STYLE COMPLET — FACTURESLISTE + RELIEF 3D
============================================================ */

const stylesComptabilite = `
  .cl3d-page {
    --green: #438B74;
    --green-dark: #28594B;
    --text: #34443D;
    --muted: #77827B;
    --line: #E7EEE8;
    --soft: #F3F7F3;
    --surface: #FFFFFF;

    min-height: 100%;
    padding: 24px;
    color: var(--text);
    background:
      radial-gradient(ellipse at 5% 0%, rgba(67,139,116,.08), transparent 34%),
      radial-gradient(ellipse at 100% 12%, rgba(168,194,159,.09), transparent 30%),
      #FCFDFB;
    font-family: inherit;
    font-size: 13px;
  }

  .cl3d-page * {
    box-sizing: border-box;
  }

  .cl3d-page button,
  .cl3d-page input {
    font: inherit;
  }

  .cl3d-page button {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .cl3d-page button:focus-visible,
  .cl3d-page input:focus-visible {
    outline: 3px solid rgba(67,139,116,.22);
    outline-offset: 2px;
  }

  /* En-tête */

  .cl3d-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 25px;
  }

  .cl3d-heading,
  .cl3d-modal-heading {
    display: flex;
    align-items: center;
    gap: 13px;
    min-width: 0;
  }

  .cl3d-heading-icon {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border: 1px solid #D9E9DD;
    border-radius: 14px;
    color: var(--green-dark);
    background: linear-gradient(145deg, #FFFFFF 0%, #E5F1E7 100%);
    box-shadow:
      0 4px 9px rgba(40,89,75,.08),
      inset 0 1px 0 #FFFFFF,
      inset 0 -1px 0 rgba(40,89,75,.04);
  }

  .cl3d-heading-icon-small {
    width: 42px;
    height: 42px;
    border-radius: 12px;
  }

  .cl3d-eyebrow {
    margin: 0 0 4px;
    color: var(--green);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .13em;
  }

  .cl3d-header h1 {
    margin: 0;
    color: var(--text);
    font-size: 22px;
    font-weight: 750;
    letter-spacing: -.045em;
    line-height: 1.3;
  }

  .cl3d-subtitle {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .cl3d-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 38px;
    padding: 9px 14px;
    border: 1px solid transparent;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    transition: all .18s ease;
  }

  .cl3d-button-primary {
    border-color: #387A63;
    color: #FFFFFF;
    background: linear-gradient(145deg, #4C987F, #35765F);
    box-shadow:
      0 3px 7px rgba(40,89,75,.17),
      inset 0 1px 0 rgba(255,255,255,.23);
  }

  .cl3d-button-primary:hover {
    background: linear-gradient(145deg, #438B74, #28594B);
    box-shadow: 0 5px 12px rgba(40,89,75,.2);
    transform: translateY(-1px);
  }

  .cl3d-button-secondary {
    border-color: #DDE8DF;
    color: var(--green-dark);
    background: linear-gradient(145deg, #FFFFFF, #F4F8F4);
    box-shadow: 0 2px 5px rgba(40,89,75,.05);
  }

  .cl3d-button-secondary:hover {
    border-color: #B9D2C1;
    background: #EDF6EF;
  }

  /* Erreur */

  .cl3d-error {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
    padding: 12px 14px;
    border: 1px solid #F0D4D1;
    border-radius: 10px;
    color: #9B4943;
    background: linear-gradient(145deg, #FFFFFF, #FFF5F4);
    box-shadow: 0 3px 8px rgba(135,57,51,.045);
  }

  .cl3d-error-message {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    line-height: 1.5;
  }

  .cl3d-icon-button {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 7px;
    color: inherit;
    background: transparent;
  }

  .cl3d-icon-button:hover {
    background: #FCE8E6;
  }

  /* Cartes statistiques 3D */

  .cl3d-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 15px;
    margin-bottom: 22px;
  }

  .cl3d-stat-card {
    position: relative;
    min-width: 0;
    padding: 17px 17px 15px;
    overflow: hidden;
    border: 1px solid #E2EBE3;
    border-radius: 13px;
    background: linear-gradient(145deg, #FFFFFF 0%, #FAFCF9 68%, #F5F9F4 100%);
    box-shadow:
      0 2px 4px rgba(35,70,48,.035),
      0 7px 17px rgba(35,70,48,.045),
      inset 0 1px 0 #FFFFFF,
      inset 0 -1px 0 rgba(40,89,75,.025);
    transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  }

  .cl3d-stat-card::before {
    position: absolute;
    top: 0;
    left: 16px;
    right: 16px;
    height: 2px;
    border-radius: 0 0 5px 5px;
    background: linear-gradient(90deg, #A7CDB6, #E3EDE2);
    content: "";
  }

  .cl3d-stat-card:hover {
    transform: translateY(-2px);
    border-color: #D2E3D5;
    box-shadow:
      0 4px 7px rgba(35,70,48,.045),
      0 12px 24px rgba(35,70,48,.075),
      inset 0 1px 0 #FFFFFF;
  }

  .cl3d-stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
    color: #718078;
    font-size: 11px;
    font-weight: 650;
  }

  .cl3d-stat-icon {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 1px solid transparent;
    border-radius: 10px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 2px 4px rgba(30,60,42,.04);
  }

  .cl3d-stat-icon.green {
    border-color: #D9E9DC;
    color: #438B74;
    background: linear-gradient(145deg, #F9FCF8, #E5F1E6);
  }

  .cl3d-stat-icon.blue {
    border-color: #DCE7F2;
    color: #6489B5;
    background: linear-gradient(145deg, #FFFFFF, #EAF1F9);
  }

  .cl3d-stat-icon.purple {
    border-color: #E5DFF0;
    color: #8B7BB4;
    background: linear-gradient(145deg, #FFFFFF, #F0ECF8);
  }

  .cl3d-stat-icon.orange {
    border-color: #F0E3D0;
    color: #BB8B4A;
    background: linear-gradient(145deg, #FFFFFF, #FBF0E0);
  }

  .cl3d-stat-card > strong {
    display: block;
    overflow-wrap: anywhere;
    color: #30463A;
    font-size: 25px;
    font-weight: 780;
    letter-spacing: -.045em;
    line-height: 1.35;
  }

  .cl3d-stat-card > strong.cl3d-stat-money {
    font-size: clamp(16px, 1.5vw, 21px);
    letter-spacing: -.035em;
  }

  .cl3d-stat-card > small {
    display: block;
    margin-top: 7px;
    color: #8A958D;
    font-size: 10px;
    line-height: 1.45;
  }

  /* Recherche */

  .cl3d-filter-panel {
    margin-bottom: 23px;
    padding: 17px 18px 13px;
    border: 1px solid #E4EBE4;
    border-radius: 13px;
    background: linear-gradient(145deg, #FFFFFF 0%, #FCFDFC 75%, #F7FAF6 100%);
    box-shadow:
      0 2px 4px rgba(35,70,48,.03),
      0 7px 17px rgba(35,70,48,.04),
      inset 0 1px 0 #FFFFFF;
  }

  .cl3d-filter-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 13px;
  }

  .cl3d-filter-heading h2 {
    margin: 0;
    color: #34443D;
    font-size: 13px;
    font-weight: 750;
  }

  .cl3d-filter-heading p {
    margin: 4px 0 0;
    color: #859087;
    font-size: 11px;
  }

  .cl3d-clear-button {
    padding: 6px 9px;
    border: 1px solid #DFE9E0;
    border-radius: 7px;
    color: #477963;
    background: #F8FBF7;
    font-size: 10px;
    font-weight: 700;
  }

  .cl3d-clear-button:hover {
    border-color: #BFD5C4;
    background: #EDF6EE;
  }

  .cl3d-filters {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: 12px;
  }

  .cl3d-search,
  .cl3d-date-filter {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    min-height: 42px;
    padding: 0 12px;
    border: 1px solid #E1E9E1;
    border-radius: 9px;
    color: #819087;
    background: linear-gradient(145deg, #FFFFFF, #FAFCFA);
    box-shadow: inset 0 1px 2px rgba(35,70,48,.025);
    transition: border-color .18s ease, box-shadow .18s ease;
  }

  .cl3d-search:focus-within,
  .cl3d-date-filter:focus-within {
    border-color: #8BB8A0;
    box-shadow: 0 0 0 3px rgba(67,139,116,.1);
  }

  .cl3d-search input,
  .cl3d-date-filter input {
    width: 100%;
    min-width: 0;
    height: 40px;
    padding: 0;
    border: 0 !important;
    outline: none !important;
    color: #34443D;
    background: transparent !important;
    box-shadow: none !important;
    font-size: 12px;
  }

  .cl3d-search input::placeholder {
    color: #9AA49D;
  }

  .cl3d-search button {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 25px;
    height: 25px;
    border: 0;
    border-radius: 6px;
    color: #7D8B81;
    background: transparent;
  }

  .cl3d-search button:hover {
    background: #EDF4ED;
  }

  .cl3d-filter-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
    padding-top: 11px;
    border-top: 1px solid #EEF2ED;
    color: #89948C;
    font-size: 10px;
  }

  .cl3d-filter-footer strong {
    color: #436F59;
    font-weight: 800;
  }

  .cl3d-filter-footer > span:last-child {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  /* Aucun résultat */

  .cl3d-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 54px 20px;
    border: 1px solid #E4EBE4;
    border-radius: 14px;
    text-align: center;
    background: linear-gradient(145deg, #FFFFFF, #F8FBF7);
    box-shadow:
      0 3px 8px rgba(35,70,48,.035),
      0 10px 24px rgba(35,70,48,.04),
      inset 0 1px 0 #FFFFFF;
  }

  .cl3d-empty-icon {
    display: grid;
    place-items: center;
    width: 54px;
    height: 54px;
    margin-bottom: 15px;
    border: 1px solid #DDEADE;
    border-radius: 17px;
    color: #438B74;
    background: linear-gradient(145deg, #FFFFFF, #EAF3E9);
    box-shadow: 0 4px 9px rgba(40,89,75,.07), inset 0 1px 0 #FFFFFF;
  }

  .cl3d-empty h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 750;
  }

  .cl3d-empty p {
    margin: 7px 0 18px;
    color: #859087;
    font-size: 12px;
  }

  /* Groupes journaliers */

  .cl3d-groups {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .cl3d-day-card {
    min-width: 0;
    overflow: hidden;
    border: 1px solid #E2EAE2;
    border-radius: 13px;
    background: linear-gradient(145deg, #FFFFFF, #FBFDFB);
    box-shadow:
      0 2px 4px rgba(35,70,48,.035),
      0 7px 17px rgba(35,70,48,.045),
      inset 0 1px 0 #FFFFFF;
    transition: border-color .18s ease, box-shadow .18s ease;
  }

  .cl3d-day-card:hover {
    border-color: #D2E2D4;
    box-shadow:
      0 3px 6px rgba(35,70,48,.04),
      0 10px 22px rgba(35,70,48,.06),
      inset 0 1px 0 #FFFFFF;
  }

  .cl3d-day-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    width: 100%;
    padding: 14px 16px;
    border: 0;
    border-bottom: 1px solid #E8EEE7;
    text-align: left;
    background: linear-gradient(105deg, #FFFFFF, #F5F9F4);
  }

  .cl3d-day-header:hover {
    background: linear-gradient(105deg, #FBFDFB, #EEF5EE);
  }

  .cl3d-day-main,
  .cl3d-day-right {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
  }

  .cl3d-day-icon {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 37px;
    height: 37px;
    border: 1px solid #DCE9DC;
    border-radius: 11px;
    color: #438B74;
    background: linear-gradient(145deg, #FFFFFF, #E7F1E5);
    box-shadow: 0 2px 5px rgba(40,89,75,.06), inset 0 1px 0 #FFFFFF;
  }

  .cl3d-day-label {
    min-width: 0;
  }

  .cl3d-day-label h2 {
    margin: 0;
    color: #34443D;
    font-size: 12px;
    font-weight: 750;
    text-transform: capitalize;
  }

  .cl3d-day-label p {
    margin: 4px 0 0;
    color: #8A958C;
    font-size: 10px;
  }

  .cl3d-day-total {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
  }

  .cl3d-day-total small {
    color: #8A958C;
    font-size: 9px;
  }

  .cl3d-day-total strong {
    color: #438B74;
    font-size: 12px;
    font-weight: 800;
  }

  .cl3d-chevron {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 29px;
    height: 29px;
    border: 1px solid #E2EAE1;
    border-radius: 8px;
    color: #738479;
    background: #FFFFFF;
    box-shadow: 0 1px 3px rgba(35,70,48,.04);
  }

  /* Tableau principal */

  .cl3d-table-scroll {
    max-height: 520px;
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-color: #C8D9CA #F4F7F3;
    scrollbar-width: thin;
  }

  .cl3d-table {
    width: 100%;
    min-width: 1080px;
    border-collapse: separate;
    border-spacing: 0;
    text-align: left;
  }

  .cl3d-table thead th {
    position: sticky;
    top: 0;
    z-index: 3;
    padding: 11px 12px;
    border-bottom: 1px solid #E2EAE2;
    color: #75847A;
    background: #F3F7F2;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .075em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .cl3d-table tbody td {
    padding: 12px;
    border-bottom: 1px solid #EEF2ED;
    color: #526258;
    font-size: 11px;
    vertical-align: top;
  }

  .cl3d-table tbody tr {
    background: #FFFFFF;
    transition: background .15s ease;
  }

  .cl3d-table tbody tr:hover {
    background: #F7FAF6;
  }

  .cl3d-table tbody tr:last-child td {
    border-bottom: 0;
  }

  .cl3d-page .align-right {
    text-align: right;
  }

  .cl3d-page .align-center {
    text-align: center;
  }

  .cl3d-time {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #52675A;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }

  .cl3d-time svg {
    color: #82998A;
  }

  .cl3d-patient {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 140px;
  }

  .cl3d-avatar {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 30px;
    height: 30px;
    border: 1px solid #DCE9DD;
    border-radius: 10px;
    color: #438B74;
    background: linear-gradient(145deg, #FFFFFF, #EAF3E8);
    box-shadow: 0 2px 4px rgba(40,89,75,.04);
  }

  .cl3d-patient-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .cl3d-patient-info strong {
    max-width: 165px;
    overflow: hidden;
    color: #34443D;
    font-size: 11px;
    font-weight: 750;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cl3d-patient-info small {
    color: #929B93;
    font-size: 9px;
  }

  .cl3d-muted {
    color: #9AA49C;
    font-size: 10px;
    font-style: italic;
  }

  .cl3d-item-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 190px;
  }

  .cl3d-item {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 6px 7px;
    border: 1px solid #E7EDE6;
    border-radius: 7px;
    background: linear-gradient(145deg, #FFFFFF, #F7FAF6);
    box-shadow: 0 1px 2px rgba(35,70,48,.025), inset 0 1px 0 #FFFFFF;
  }

  .cl3d-item-icon {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 25px;
    height: 25px;
    border: 1px solid #DCE9DC;
    border-radius: 7px;
    color: #438B74;
    background: linear-gradient(145deg, #FFFFFF, #E8F2E7);
  }

  .cl3d-item-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: #45574B;
    font-size: 10px;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cl3d-quantity {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    padding: 3px 6px;
    border: 1px solid #E6EBE5;
    border-radius: 5px;
    color: #69796E;
    background: #F3F6F2;
    font-size: 9px;
    font-weight: 750;
    white-space: nowrap;
  }

  .cl3d-item-price {
    flex: 0 0 auto;
    color: #438B74;
    font-size: 9px;
    font-weight: 750;
    white-space: nowrap;
  }

  .cl3d-amount-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    white-space: nowrap;
  }

  .cl3d-amount {
    padding: 6px 8px;
    border: 1px solid #D3E4D4;
    border-radius: 7px;
    color: #326B52;
    background: linear-gradient(145deg, #FFFFFF, #EAF4E8);
    box-shadow: 0 2px 4px rgba(40,89,75,.045), inset 0 1px 0 #FFFFFF;
    font-size: 11px;
    font-weight: 800;
  }

  .cl3d-amount-cell small {
    color: #8C988E;
    font-size: 9px;
  }

  .cl3d-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 5px 8px;
    border: 1px solid transparent;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 750;
    white-space: nowrap;
  }

  .cl3d-badge-green {
    border-color: #D4E6D5;
    color: #367253;
    background: linear-gradient(145deg, #FFFFFF, #E8F4E7);
  }

  .cl3d-badge-neutral {
    border-color: #E6EAE5;
    color: #7D8980;
    background: linear-gradient(145deg, #FFFFFF, #F2F4F0);
  }

  .cl3d-id {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 5px 6px;
    border: 1px solid #E6EBE5;
    border-radius: 6px;
    color: #77847A;
    background: #F7F9F6;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 9px;
  }

  .cl3d-view-button {
    display: inline-grid;
    place-items: center;
    width: 31px;
    height: 31px;
    border: 1px solid #DCE7DC;
    border-radius: 8px;
    color: #438B74;
    background: linear-gradient(145deg, #FFFFFF, #F1F7EF);
    box-shadow: 0 2px 4px rgba(35,70,48,.04), inset 0 1px 0 #FFFFFF;
  }

  .cl3d-view-button:hover {
    transform: translateY(-1px);
    border-color: #B7D3BB;
    color: #28594B;
    background: #EAF4E8;
    box-shadow: 0 4px 8px rgba(35,70,48,.08);
  }

  /* Modales : fond profond et cartes 3D */

  .cl3d-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(25,43,34,.48);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    animation: cl3d-fade-in .16s ease-out;
  }

  /* La modale de sortie reste au-dessus de celle du détail */
  .cl3d-overlay-top {
    z-index: 100000;
  }

  .cl3d-modal {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    border: 1px solid rgba(220, 234, 220, 0.95);
    border-radius: 17px;
    background: linear-gradient(145deg, #FFFFFF, #F8FBF7);
    box-shadow:
      0 8px 20px rgba(17, 35, 25, 0.1),
      0 25px 75px rgba(17, 35, 25, 0.22),
      inset 0 1px 0 #FFFFFF;
    animation: cl3d-modal-in 0.2s ease-out;
  }

  .cl3d-modal-large {
    max-width: 980px;
  }

  .cl3d-modal-medium {
    max-width: 720px;
  }

  .cl3d-modal-header {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 15px 19px;
    border-bottom: 1px solid #E3EBE2;
    background: linear-gradient(110deg, #FFFFFF, #F4F8F2);
    box-shadow: 0 2px 5px rgba(35,70,48,.025);
  }

  .cl3d-modal-heading h2 {
    margin: 0;
    color: #34443D;
    font-size: 15px;
    font-weight: 780;
    letter-spacing: -.025em;
  }

  .cl3d-modal-heading p {
    margin: 4px 0 0;
    color: #7E8C81;
    font-size: 10px;
  }

  .cl3d-close-button {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 1px solid #E4EBE3;
    border-radius: 9px;
    color: #718076;
    background: linear-gradient(145deg, #FFFFFF, #F1F5EF);
    box-shadow: 0 2px 4px rgba(35,70,48,.04);
  }

  .cl3d-close-button:hover:not(:disabled) {
    border-color: #E5C9C5;
    color: #A4544B;
    background: #FFF3F1;
  }

  .cl3d-close-button:disabled {
    cursor: not-allowed;
    opacity: .5;
  }

  .cl3d-modal-body {
    min-height: 0;
    padding: 18px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: #C7D8C8 #F4F7F2;
  }

  .cl3d-detail-card {
    margin-bottom: 15px;
    padding: 15px;
    border: 1px solid #E3EBE2;
    border-radius: 12px;
    background: linear-gradient(145deg, #FFFFFF 0%, #FCFDFC 75%, #F7FAF6 100%);
    box-shadow:
      0 2px 4px rgba(35,70,48,.025),
      0 5px 13px rgba(35,70,48,.035),
      inset 0 1px 0 #FFFFFF;
  }

  .cl3d-section-title {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
    color: #438B74;
  }

  .cl3d-section-title h3 {
    margin: 0;
    color: #34443D;
    font-size: 12px;
    font-weight: 780;
  }

  .cl3d-section-title small {
    display: block;
    margin-bottom: 3px;
    color: #8A958B;
    font-size: 10px;
  }

  .cl3d-section-title p {
    margin: 4px 0 0;
    color: #849087;
    font-size: 10px;
  }

  .cl3d-patient-details {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 15px;
    padding-top: 14px;
    border-top: 1px solid #EEF2EC;
  }

  .cl3d-patient-details > div {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }

  .cl3d-patient-details small {
    color: #8A958B;
    font-size: 10px;
  }

  .cl3d-patient-details strong {
    color: #43554A;
    font-size: 12px;
    font-weight: 700;
  }

  .cl3d-break {
    overflow-wrap: anywhere;
  }

  .cl3d-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 13px;
  }

  .cl3d-section-total {
    color: #438B74;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .cl3d-detail-table-wrap {
    max-width: 100%;
    overflow-x: auto;
    border: 1px solid #EAF0E9;
    border-radius: 8px;
  }

  .cl3d-detail-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    text-align: left;
  }

  .cl3d-detail-table th {
    padding: 10px;
    border-bottom: 1px solid #E3EBE2;
    color: #75847A;
    background: #F3F7F2;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .05em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .cl3d-detail-table td {
    padding: 10px;
    border-bottom: 1px solid #EEF2EC;
    color: #5B6A5F;
    font-size: 11px;
  }

  .cl3d-detail-table tbody tr:last-child td {
    border-bottom: 0;
  }

  .cl3d-detail-table tbody tr:hover {
    background: #F9FBF8;
  }

  .cl3d-detail-product {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 120px;
  }

  .cl3d-detail-product strong {
    color: #405247;
    font-size: 11px;
    font-weight: 700;
  }

  .cl3d-no-items {
    margin: 0;
    padding: 18px 12px;
    border: 1px dashed #DFE8DE;
    border-radius: 8px;
    color: #8C988E;
    background: #FAFCF9;
    font-size: 11px;
    text-align: center;
  }

  .cl3d-total-card {
    padding: 17px;
    border: 1px solid #CFE1CF;
    border-radius: 12px;
    background:
      radial-gradient(ellipse at top right, rgba(255,255,255,.75), transparent 55%),
      linear-gradient(145deg, #F6FAF3, #E6F1E3);
    box-shadow:
      0 3px 8px rgba(40,89,75,.055),
      0 7px 16px rgba(40,89,75,.04),
      inset 0 1px 0 rgba(255,255,255,.95),
      inset 0 -1px 0 rgba(40,89,75,.035);
  }

  .cl3d-total-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
  }

  .cl3d-total-top small {
    color: #64806A;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .09em;
  }

  .cl3d-total-top p {
    margin: 5px 0 0;
    color: #718174;
    font-size: 11px;
  }

  .cl3d-total-top > strong {
    color: #28594B;
    font-size: clamp(17px, 2.2vw, 24px);
    font-weight: 850;
    letter-spacing: -.04em;
    text-align: right;
  }

  .cl3d-total-breakdown {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 15px;
    padding-top: 12px;
    border-top: 1px solid #D3E4D0;
  }

  .cl3d-total-breakdown > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: #718174;
    font-size: 10px;
  }

  .cl3d-total-breakdown strong {
    color: #43594A;
    font-size: 11px;
    font-weight: 750;
    text-align: right;
  }

  .cl3d-exit-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cl3d-exit-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border: 1px solid #E4EBE2;
    border-radius: 9px;
    background: linear-gradient(145deg, #FFFFFF, #F7FAF5);
    box-shadow: 0 1px 3px rgba(35,70,48,.025), inset 0 1px 0 #FFFFFF;
  }

  .cl3d-exit-name {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .cl3d-exit-name strong {
    overflow: hidden;
    color: #405247;
    font-size: 11px;
    font-weight: 750;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cl3d-exit-name small {
    color: #859187;
    font-size: 10px;
  }

  /* Chargement */

  .cl3d-loading-page {
    display: grid;
    min-height: 400px;
    place-items: center;
  }

  .cl3d-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 200px;
    padding: 24px;
    color: #78867C;
    text-align: center;
  }

  .cl3d-loading p {
    margin: 0;
    font-size: 12px;
  }

  .cl3d-spinner {
    width: 35px;
    height: 35px;
    border: 3px solid #E0EAE0;
    border-top-color: #438B74;
    border-radius: 50%;
    animation: cl3d-spin .8s linear infinite;
  }

  @keyframes cl3d-spin {
    to { transform: rotate(360deg); }
  }

  @keyframes cl3d-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes cl3d-modal-in {
    from { opacity: 0; transform: translateY(8px) scale(.99); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* Responsive */

  @media (max-width: 1100px) {
    .cl3d-page {
      padding: 19px;
    }

    .cl3d-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .cl3d-stat-card > strong.cl3d-stat-money {
      font-size: 19px;
    }
  }

  @media (max-width: 650px) {
    .cl3d-page {
      padding: 13px;
    }

    .cl3d-header {
      align-items: flex-start;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 20px;
    }

    .cl3d-header > .cl3d-button {
      width: 100%;
    }

    .cl3d-header h1 {
      font-size: 19px;
    }

    .cl3d-heading-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
    }

    .cl3d-stats {
      gap: 10px;
      margin-bottom: 16px;
    }

    .cl3d-stat-card {
      padding: 13px;
    }

    .cl3d-stat-top {
      align-items: flex-start;
      margin-bottom: 10px;
      font-size: 10px;
    }

    .cl3d-stat-icon {
      width: 31px;
      height: 31px;
      border-radius: 9px;
    }

    .cl3d-stat-card > strong {
      font-size: 22px;
    }

    .cl3d-stat-card > strong.cl3d-stat-money {
      font-size: 15px;
      line-height: 1.5;
    }

    .cl3d-stat-card > small {
      font-size: 9px;
    }

    .cl3d-filter-panel {
      padding: 13px;
      margin-bottom: 16px;
    }

    .cl3d-filter-heading {
      align-items: flex-start;
      flex-direction: column;
    }

    .cl3d-filters {
      grid-template-columns: minmax(0, 1fr);
      gap: 9px;
    }

    .cl3d-filter-footer {
      align-items: flex-start;
      flex-direction: column;
      gap: 6px;
    }

    .cl3d-day-header {
      padding: 11px;
      gap: 8px;
    }

    .cl3d-day-main {
      gap: 8px;
    }

    .cl3d-day-icon {
      width: 32px;
      height: 32px;
    }

    .cl3d-day-label h2 {
      font-size: 11px;
    }

    .cl3d-day-total small {
      font-size: 8px;
    }

    .cl3d-day-total strong {
      max-width: 120px;
      font-size: 10px;
      overflow-wrap: anywhere;
    }

    .cl3d-chevron {
      width: 25px;
      height: 25px;
    }

    .cl3d-overlay {
    position: fixed;
    inset: 0;
    z-index: 99990;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(25, 43, 34, 0.55);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    isolation: isolate;
    animation: cl3d-fade-in 0.16s ease-out;
  }

    .cl3d-modal {
      max-height: 94vh;
      border-radius: 13px;
    }

    .cl3d-modal-header {
      padding: 12px;
    }

    .cl3d-modal-heading h2 {
      font-size: 13px;
    }

    .cl3d-modal-body {
      padding: 11px;
    }

    .cl3d-detail-card {
      padding: 12px;
      margin-bottom: 11px;
    }

    .cl3d-patient-details {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }

    .cl3d-total-top {
      align-items: flex-start;
      flex-direction: column;
      gap: 10px;
    }

    .cl3d-total-top > strong {
      font-size: 21px;
      text-align: left;
      overflow-wrap: anywhere;
    }

    .cl3d-total-breakdown {
      grid-template-columns: minmax(0, 1fr);
    }

    .cl3d-total-breakdown > div {
      align-items: flex-start;
      flex-direction: column;
      gap: 4px;
    }

    .cl3d-section-heading {
      align-items: flex-start;
    }

    .cl3d-button-secondary {
      white-space: normal;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cl3d-page *,
    .cl3d-page *::before,
    .cl3d-page *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;
