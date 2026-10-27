
import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  Eye,
  EyeOff,
  HeartPulse,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  RefreshCw,
  ShieldCheck,
  UserRound,
  AlertCircle,
} from "lucide-react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

  .ak-auth, .ak-auth * { box-sizing: border-box; }

  .ak-auth {
    --green: #397963;
    --green-dark: #245442;
    --green-deep: #173e31;
    --green-soft: #eaf3ee;
    --green-pale: #f5f9f6;
    --text: #24342d;
    --muted: #77847d;
    --border: #e4ebe6;
    min-height: 100vh;
    width: 100%;
    padding: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text);
    background: #f4f7f5;
    font-family: 'DM Sans', sans-serif;
  }

  .ak-shell {
    display: grid;
    grid-template-columns: minmax(300px, 0.92fr) minmax(400px, 1.08fr);
    width: min(1080px, 100%);
    min-height: 650px;
    overflow: hidden;
    background: #fff;
    border: 1px solid #e7ede8;
    border-radius: 22px;
    box-shadow: 0 24px 70px rgba(31, 66, 49, .09);
  }

  .ak-brand {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 38px 34px 30px;
    overflow: hidden;
    color: #fff;
    background:
      radial-gradient(ellipse at 8% 90%, rgba(117, 169, 133, .25), transparent 45%),
      linear-gradient(155deg, #2e6b53 0%, #214f3d 54%, #173d30 100%);
  }

  .ak-brand::before, .ak-brand::after {
    content: "";
    position: absolute;
    pointer-events: none;
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 50%;
  }

  .ak-brand::before {
    width: 360px;
    height: 360px;
    right: -190px;
    top: 110px;
  }

  .ak-brand::after {
    width: 260px;
    height: 260px;
    right: -140px;
    top: 160px;
  }

  .ak-brand-top, .ak-brand-content, .ak-brand-footer {
    position: relative;
    z-index: 1;
  }

  .ak-brand-logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ak-logo-icon {
    width: 45px;
    height: 45px;
    display: grid;
    place-items: center;
    color: #fff;
    background: rgba(255,255,255,.13);
    border: 1px solid rgba(255,255,255,.17);
    border-radius: 13px;
  }

  .ak-logo-name {
    margin: 0;
    font-family: 'Manrope', sans-serif;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -.65px;
  }

  .ak-logo-subtitle {
    margin-top: 3px;
    color: rgba(255,255,255,.68);
    font-size: 11px;
    letter-spacing: .5px;
  }

  .ak-brand-content { margin: auto 0; padding: 58px 0; }

  .ak-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 11px;
    border: 1px solid rgba(255,255,255,.19);
    border-radius: 7px;
    color: #e0eee5;
    background: rgba(255,255,255,.07);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
  }

  .ak-brand-title {
    max-width: 360px;
    margin: 24px 0 15px;
    font-family: 'Manrope', sans-serif;
    font-size: clamp(28px, 3vw, 39px);
    font-weight: 800;
    line-height: 1.22;
    letter-spacing: -1.5px;
  }

  .ak-brand-description {
    max-width: 330px;
    margin: 0;
    color: rgba(255,255,255,.74);
    font-size: 13px;
    line-height: 1.9;
  }

  .ak-feature-list {
    display: grid;
    gap: 17px;
    margin-top: 34px;
  }

  .ak-feature {
    display: flex;
    align-items: center;
    gap: 12px;
    color: rgba(255,255,255,.89);
    font-size: 12px;
  }

  .ak-feature-icon {
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    color: #d4e9da;
    background: rgba(255,255,255,.09);
    border-radius: 9px;
  }

  .ak-brand-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 18px;
    border-top: 1px solid rgba(255,255,255,.14);
    color: rgba(255,255,255,.59);
    font-size: 10px;
  }

  .ak-brand-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .ak-status-dot {
    width: 7px;
    height: 7px;
    background: #9ad1a7;
    border-radius: 50%;
  }

  .ak-main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 44px clamp(28px, 5vw, 62px);
    background: #fff;
  }

  .ak-mobile-brand { display: none; }

  .ak-step {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 22px;
    color: var(--green);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
  }

  .ak-step-mark {
    width: 7px;
    height: 7px;
    background: var(--green);
    border-radius: 2px;
  }

  .ak-heading {
    margin: 0;
    color: #23382d;
    font-family: 'Manrope', sans-serif;
    font-size: clamp(25px, 3vw, 31px);
    font-weight: 800;
    line-height: 1.3;
    letter-spacing: -.9px;
  }

  .ak-description {
    margin: 10px 0 28px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.8;
  }

  .ak-form { display: flex; flex-direction: column; gap: 18px; }

  .ak-field { display: flex; flex-direction: column; gap: 8px; }

  .ak-label {
    color: #43554a;
    font-size: 11px;
    font-weight: 700;
  }

  .ak-input-wrap { position: relative; }

  .ak-input-icon {
    position: absolute;
    top: 50%;
    left: 14px;
    color: #89968e;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .ak-input {
    width: 100%;
    height: 47px;
    padding: 0 43px;
    outline: none;
    border: 1px solid #dfe7e1;
    border-radius: 9px;
    color: #293b30;
    background: #fff;
    font: inherit;
    font-size: 12px;
    transition: border-color .18s, box-shadow .18s, background .18s;
  }

  .ak-input::placeholder { color: #a4aea7; }

  .ak-input:hover { border-color: #b9cec0; }

  .ak-input:focus {
    border-color: #559477;
    box-shadow: 0 0 0 3px rgba(57,121,99,.11);
  }

  .ak-input:disabled { background: #f5f7f5; }

  .ak-password-toggle {
    position: absolute;
    top: 50%;
    right: 12px;
    display: grid;
    place-items: center;
    padding: 5px;
    border: 0;
    color: #87958c;
    background: transparent;
    cursor: pointer;
    transform: translateY(-50%);
  }

  .ak-password-toggle:hover { color: var(--green); }

  .ak-button {
    min-height: 47px;
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 12px 16px;
    border: 1px solid transparent;
    border-radius: 9px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background .18s, border-color .18s, transform .18s;
  }

  .ak-button:focus-visible, .ak-link:focus-visible, .ak-checkbox:focus-visible {
    outline: 3px solid rgba(57,121,99,.25);
    outline-offset: 3px;
  }

  .ak-button-primary {
    margin-top: 3px;
    color: #fff;
    background: #34765b;
    box-shadow: 0 5px 12px rgba(43,102,76,.13);
  }

  .ak-button-primary:hover:not(:disabled) {
    background: #285e47;
    transform: translateY(-1px);
  }

  .ak-button:disabled { opacity: .6; cursor: not-allowed; }

  .ak-button-secondary {
    color: #386e56;
    background: #f0f6f1;
    border-color: #dfebe1;
  }

  .ak-button-secondary:hover:not(:disabled) { background: #e5f0e8; }

  .ak-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: 0;
    color: #397963;
    background: transparent;
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
  }

  .ak-link:hover { color: #214f3d; text-decoration: underline; }

  .ak-form-footer {
    display: flex;
    justify-content: center;
    margin-top: 3px;
  }

  .ak-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 23px 0;
    color: #a0aaa3;
    font-size: 10px;
  }

  .ak-divider::before, .ak-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: #edf0ed;
  }

  .ak-notice {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 12px;
    border: 1px solid #e3c9c6;
    border-radius: 8px;
    color: #8b3d38;
    background: #fff7f6;
    font-size: 11px;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }

  .ak-notice svg { flex-shrink: 0; margin-top: 1px; }

  .ak-notice-success {
    border-color: #d5e8d9;
    color: #2d6d4b;
    background: #f2f8f3;
  }

  .ak-hint {
    margin: 0;
    color: #87928a;
    font-size: 10px;
    line-height: 1.75;
  }

  .ak-security-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 24px;
    padding: 12px;
    border: 1px solid #e6eee7;
    border-radius: 9px;
    background: #f7faf7;
    color: #6d7e72;
    font-size: 10px;
    line-height: 1.7;
  }

  .ak-security-note svg { flex-shrink: 0; color: #52836a; }

  .ak-recovery-key {
    padding: 17px 14px;
    border: 1px dashed #a8c9b1;
    border-radius: 9px;
    color: #24563d;
    background: #f3f8f3;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-align: center;
    overflow-wrap: anywhere;
    user-select: all;
  }

  .ak-checkbox-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: #526259;
    font-size: 11px;
    line-height: 1.7;
    cursor: pointer;
  }

  .ak-checkbox {
    width: 15px;
    height: 15px;
    margin: 2px 0 0;
    flex-shrink: 0;
    accent-color: #34765b;
    cursor: pointer;
  }

  .ak-loading, .ak-error-screen {
    width: min(430px, 100%);
    margin: auto;
    text-align: center;
  }

  .ak-loading-icon {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    margin: 0 auto 18px;
    color: var(--green);
    background: var(--green-soft);
    border-radius: 15px;
  }

  .ak-loading-title {
    margin: 0;
    font-family: 'Manrope', sans-serif;
    font-size: 22px;
    font-weight: 800;
  }

  .ak-loading-text {
    margin: 10px 0 22px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.8;
  }

  .ak-spinner { animation: ak-spin 1s linear infinite; }

  @keyframes ak-spin { to { transform: rotate(360deg); } }

  .ak-bottom-note {
    margin-top: 30px;
    color: #9ba59e;
    font-size: 10px;
    line-height: 1.8;
    text-align: center;
  }

  .ak-bottom-note strong { color: #6b7c70; font-weight: 600; }

  @media (max-width: 760px) {
    .ak-auth { padding: 14px; align-items: flex-start; }

    .ak-shell {
      grid-template-columns: 1fr;
      min-height: auto;
      width: min(500px, 100%);
      margin: auto;
      border-radius: 17px;
    }

    .ak-brand { display: none; }

    .ak-main { padding: 28px 25px 24px; }

    .ak-mobile-brand {
      display: flex;
      align-items: center;
      gap: 11px;
      margin-bottom: 35px;
    }

    .ak-mobile-brand .ak-logo-icon {
      color: #fff;
      background: var(--green);
      border: none;
    }

    .ak-mobile-brand .ak-logo-name { color: #254936; }

    .ak-mobile-brand .ak-logo-subtitle { color: #829087; }

    .ak-heading { font-size: 27px; }

    .ak-description { margin-bottom: 25px; }
  }

  @media (max-width: 380px) {
    .ak-main { padding: 24px 18px; }
    .ak-heading { font-size: 24px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ak-auth *, .ak-auth *::before, .ak-auth *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
    }
  }
`;

export default function AuthGate({ onAuthenticated }) {
  const [initialisee, setInitialisee] = useState(null);
  const [verificationTerminee, setVerificationTerminee] = useState(false);
  const [mode, setMode] = useState("connexion");

  const [username, setUsername] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [cleRecuperation, setCleRecuperation] = useState("");
  const [cleAffichee, setCleAffichee] = useState("");
  const [cleSauvegardee, setCleSauvegardee] = useState(false);

  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const verifierInitialisation = useCallback(async () => {
    setVerificationTerminee(false);
    setErreur("");

    try {
      const resultat = await invoke("auth_est_initialisee");

      setInitialisee(Boolean(resultat));
      setMode(resultat ? "connexion" : "initialisation");
    } catch (e) {
      console.error("Vérification de l'authentification :", e);
      setInitialisee(null);
      setErreur(
        typeof e === "string"
          ? e
          : e?.message ||
            "Le service de données est indisponible. Vérifiez la connexion à PostgreSQL."
      );
    } finally {
      setVerificationTerminee(true);
    }
  }, []);

  useEffect(() => {
    verifierInitialisation();
  }, [verifierInitialisation]);

  function reinitialiserMessages() {
    setErreur("");
    setMessage("");
  }

  function changerMode(nouveauMode) {
    reinitialiserMessages();
    setMode(nouveauMode);
    setAfficherMotDePasse(false);
  }

  async function copierCle() {
    try {
      await navigator.clipboard.writeText(cleAffichee);
      setMessage("La clé a été copiée. Conservez-la dans un endroit sûr.");
    } catch {
      setMessage(
        "La copie automatique est indisponible. Sélectionnez la clé et copiez-la manuellement."
      );
    }
  }

  async function soumettre(e) {
    e.preventDefault();
    reinitialiserMessages();

    if (chargement) return;

    if (!username.trim()) {
      setErreur("Veuillez renseigner votre identifiant.");
      return;
    }

    if (mode !== "afficher-cle" && !motDePasse) {
      setErreur("Veuillez renseigner votre mot de passe.");
      return;
    }

    if (
      (mode === "initialisation" || mode === "recuperation") &&
      motDePasse !== confirmation
    ) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    if (mode === "recuperation" && !cleRecuperation.trim()) {
      setErreur("Veuillez renseigner votre clé de récupération.");
      return;
    }

    setChargement(true);

    try {
      if (mode === "initialisation") {
        const resultat = await invoke(
          "initialiser_premier_administrateur",
          {
            username: username.trim(),
            motDePasse,
          }
        );

        if (!resultat?.cle_recuperation) {
          throw new Error(
            "La clé de récupération n'a pas été renvoyée par le service. Vérifiez le backend avant de recommencer."
          );
        }

        setCleAffichee(resultat.cle_recuperation);
        setCleSauvegardee(false);
        setMotDePasse("");
        setConfirmation("");
        setMode("afficher-cle");
        setInitialisee(true);
        return;
      }

      if (mode === "connexion") {
        const resultat = await invoke("connexion", {
          username: username.trim(),
          motDePasse,
        });

        if (!resultat?.jeton) {
          throw new Error(
            "La session n'a pas pu être ouverte. Vérifiez le résultat renvoyé par le backend."
          );
        }

        onAuthenticated(resultat);
        return;
      }

      if (mode === "recuperation") {
        const resultat = await invoke("recuperer_compte", {
          username: username.trim(),
          cleRecuperation: cleRecuperation.trim(),
          nouveauMotDePasse: motDePasse,
        });

        if (!resultat?.nouvelle_cle_recuperation) {
          throw new Error(
            "La nouvelle clé de récupération n'a pas été renvoyée par le service."
          );
        }

        setCleAffichee(resultat.nouvelle_cle_recuperation);
        setCleSauvegardee(false);
        setCleRecuperation("");
        setMotDePasse("");
        setConfirmation("");
        setMode("afficher-cle");
      }
    } catch (e) {
      console.error("Opération d'authentification :", e);

      setErreur(
        typeof e === "string"
          ? e
          : e?.message || "L'opération n'a pas abouti. Veuillez réessayer."
      );
    } finally {
      setChargement(false);
    }
  }

  const configurations = {
    initialisation: {
      etape: "Configuration initiale",
      titre: "Créer le compte administrateur",
      description:
        "Créez le compte principal qui permettra d'administrer Milolo Aina.",
      bouton: "Créer le compte",
      icone: ShieldCheck,
    },
    connexion: {
      etape: "Accès au logiciel",
      titre: "Connexion à votre espace",
      description:
        "Renseignez vos identifiants pour accéder à votre espace de gestion.",
      bouton: "Ouvrir ma session",
      icone: LogIn,
    },
    recuperation: {
      etape: "Assistance au compte",
      titre: "Récupérer votre accès",
      description:
        "Utilisez votre identifiant et votre clé de récupération pour définir un nouveau mot de passe.",
      bouton: "Réinitialiser le mot de passe",
      icone: KeyRound,
    },
    "afficher-cle": {
      etape: "Conservation de la clé",
      titre: "Enregistrer votre clé de secours",
      description:
        "Cette clé vous permettra de récupérer votre compte en cas d'oubli du mot de passe.",
      bouton: "Continuer vers la connexion",
      icone: ShieldCheck,
    },
  };

  const contenu = configurations[mode] || configurations.connexion;
  const IconeEtape = contenu.icone;

  const champMotDePasse = (label, valeur, setter, nom) => (
    <div className="ak-field">
      <label className="ak-label" htmlFor={nom}>
        {label}
      </label>

      <div className="ak-input-wrap">
        <LockKeyhole
          className="ak-input-icon"
          size={16}
          aria-hidden="true"
        />

        <input
          id={nom}
          className="ak-input"
          type={afficherMotDePasse ? "text" : "password"}
          value={valeur}
          onChange={(e) => setter(e.target.value)}
          placeholder="Saisissez votre mot de passe"
          autoComplete={
            nom === "mot-de-passe"
              ? mode === "connexion"
                ? "current-password"
                : "new-password"
              : "new-password"
          }
          disabled={chargement}
          required
        />

        <button
          type="button"
          className="ak-password-toggle"
          onClick={() => setAfficherMotDePasse((v) => !v)}
          aria-label={
            afficherMotDePasse
              ? "Masquer le mot de passe"
              : "Afficher le mot de passe"
          }
        >
          {afficherMotDePasse ? (
            <EyeOff size={16} />
          ) : (
            <Eye size={16} />
          )}
        </button>
      </div>
    </div>
  );

  if (!verificationTerminee) {
    return (
      <div className="ak-auth">
        <style>{styles}</style>

        <div className="ak-loading">
          <div className="ak-loading-icon">
            <ShieldCheck size={26} />
          </div>

          <h1 className="ak-loading-title">Milolo Aina</h1>

          <p className="ak-loading-text">
            Préparation de votre espace de gestion.
            <br />
            Vérification du service de données en cours…
          </p>

          <LoaderCircle
            className="ak-spinner"
            size={23}
            color="#397963"
            aria-label="Chargement"
          />
        </div>
      </div>
    );
  }

  if (initialisee === null) {
    return (
      <div className="ak-auth">
        <style>{styles}</style>

        <div className="ak-loading ak-error-screen">
          <div
            className="ak-loading-icon"
            style={{ color: "#a84b42", background: "#fff0ee" }}
          >
            <AlertCircle size={26} />
          </div>

          <h1 className="ak-loading-title">Connexion indisponible</h1>

          <p className="ak-loading-text">{erreur}</p>

          <button
            type="button"
            className="ak-button ak-button-primary"
            onClick={verifierInitialisation}
          >
            <RefreshCw size={15} />
            Réessayer
          </button>

          <p className="ak-bottom-note">
            <strong>Mikolo Aina</strong>
            <br />
            Gestion de centre de santé
          </p>
        </div>
      </div>
    );
  }

  async function continuerApresCle(e) {
    e.preventDefault();

    if (!cleSauvegardee) {
      setErreur(
        "Veuillez confirmer que vous avez conservé votre clé de secours."
      );
      return;
    }

    reinitialiserMessages();
    setCleAffichee("");
    setMode("connexion");
    setMotDePasse("");
    setAfficherMotDePasse(false);
    setMessage("Votre clé de secours a été confirmée.");
  }

  return (
    <div className="ak-auth">
      <style>{styles}</style>

      <main className="ak-shell">
        <aside className="ak-brand">
          <div className="ak-brand-top">
            <div className="ak-brand-logo">
              <div className="ak-logo-icon">
                <HeartPulse size={25} strokeWidth={1.8} />
              </div>

              <div>
                <p className="ak-logo-name">Mikolo Aina</p>
                <div className="ak-logo-subtitle">
                  GESTION DE CENTRE DE SANTÉ
                </div>
              </div>
            </div>
          </div>

          <div className="ak-brand-content">
            <div className="ak-eyebrow">
              <Activity size={13} />
              Votre espace professionnel
            </div>

            <h2 className="ak-brand-title">
              Une gestion claire, au service de la santé.
            </h2>

            <p className="ak-brand-description">
              Retrouvez les informations essentielles de votre centre dans
              un espace de travail conçu pour faciliter le suivi quotidien.
            </p>

            <div className="ak-feature-list">
              <div className="ak-feature">
                <div className="ak-feature-icon">
                  <ShieldCheck size={16} />
                </div>
                <span>Accès réservé aux utilisateurs autorisés</span>
              </div>

              <div className="ak-feature">
                <div className="ak-feature-icon">
                  <Activity size={16} />
                </div>
                <span>Gestion des opérations au même endroit</span>
              </div>

              <div className="ak-feature">
                <div className="ak-feature-icon">
                  <LockKeyhole size={16} />
                </div>
                <span>Procédure dédiée à la récupération du compte</span>
              </div>
            </div>
          </div>

        </aside>

        <section className="ak-main">
          <div className="ak-mobile-brand">
            <div className="ak-logo-icon">
              <HeartPulse size={24} />
            </div>

            <div>
              <p className="ak-logo-name">Mikolo Aina</p>
              <div className="ak-logo-subtitle">
                GESTION DE CENTRE DE SANTÉ
              </div>
            </div>
          </div>

          <div className="ak-step">
            <IconeEtape size={14} />
            {contenu.etape}
          </div>

          <h1 className="ak-heading">{contenu.titre}</h1>

          <p className="ak-description">{contenu.description}</p>

          {erreur && (
            <div className="ak-notice" role="alert">
              <AlertCircle size={17} />
              <span>{erreur}</span>
            </div>
          )}

          {message && (
            <div
              className="ak-notice ak-notice-success"
              role="status"
              style={{ marginBottom: 18 }}
            >
              <CheckCircle2 size={17} />
              <span>{message}</span>
            </div>
          )}

          {mode === "afficher-cle" ? (
            <form className="ak-form" onSubmit={continuerApresCle}>
              <div className="ak-security-note" style={{ marginTop: 0 }}>
                <ShieldCheck size={17} />
                <span>
                  Conservez cette clé dans un endroit sûr, séparément de
                  votre mot de passe. Elle est destinée à la récupération
                  de votre compte.
                </span>
              </div>

              <div className="ak-field">
                <label className="ak-label">VOTRE CLÉ DE SECOURS</label>

                <div className="ak-recovery-key">{cleAffichee}</div>

                <p className="ak-hint">
                  Vérifiez que vous avez copié ou noté la clé avant de
                  continuer.
                </p>
              </div>

              <button
                type="button"
                className="ak-button ak-button-secondary"
                onClick={copierCle}
              >
                <Clipboard size={16} />
                Copier la clé
              </button>

              <label className="ak-checkbox-row">
                <input
                  className="ak-checkbox"
                  type="checkbox"
                  checked={cleSauvegardee}
                  onChange={(e) => setCleSauvegardee(e.target.checked)}
                />

                <span>
                  J'ai conservé cette clé dans un endroit sûr et je pourrai
                  la retrouver si nécessaire.
                </span>
              </label>

              <button type="submit" className="ak-button ak-button-primary">
                Continuer vers la connexion
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form className="ak-form" onSubmit={soumettre}>
              <div className="ak-field">
                <label className="ak-label" htmlFor="identifiant">
                  Identifiant
                </label>

                <div className="ak-input-wrap">
                  <UserRound
                    className="ak-input-icon"
                    size={16}
                    aria-hidden="true"
                  />

                  <input
                    id="identifiant"
                    className="ak-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Votre identifiant"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={chargement}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {mode === "recuperation" && (
                <div className="ak-field">
                  <label className="ak-label" htmlFor="cle-recuperation">
                    Clé de récupération
                  </label>

                  <div className="ak-input-wrap">
                    <KeyRound
                      className="ak-input-icon"
                      size={16}
                      aria-hidden="true"
                    />

                    <input
                      id="cle-recuperation"
                      className="ak-input"
                      type="text"
                      value={cleRecuperation}
                      onChange={(e) => setCleRecuperation(e.target.value)}
                      placeholder="Saisissez votre clé de secours"
                      autoComplete="off"
                      disabled={chargement}
                      required
                    />
                  </div>
                </div>
              )}

              {champMotDePasse(
                mode === "recuperation"
                  ? "Nouveau mot de passe"
                  : "Mot de passe",
                motDePasse,
                setMotDePasse,
                "mot-de-passe"
              )}

              {(mode === "initialisation" || mode === "recuperation") &&
                champMotDePasse(
                  "Confirmer le mot de passe",
                  confirmation,
                  setConfirmation,
                  "confirmation-mot-de-passe"
                )}

              {mode === "connexion" && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: -5,
                  }}
                >
                  <button
                    type="button"
                    className="ak-link"
                    onClick={() => changerMode("recuperation")}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {mode === "initialisation" && (
                <div className="ak-security-note" style={{ marginTop: 0 }}>
                  <ShieldCheck size={17} />
                  <span>
                    Ce compte administrateur sera utilisé pour accéder au
                    logiciel. Conservez vos identifiants en lieu sûr.
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="ak-button ak-button-primary"
                disabled={chargement}
              >
                {chargement ? (
                  <>
                    <LoaderCircle size={16} className="ak-spinner" />
                    Traitement en cours…
                  </>
                ) : (
                  <>
                    {contenu.bouton}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {mode !== "initialisation" && (
                <>
                  <div className="ak-divider">ou</div>

                  <div className="ak-form-footer">
                    <button
                      type="button"
                      className="ak-link"
                      onClick={() => changerMode("connexion")}
                      disabled={chargement}
                    >
                      <ArrowLeft size={14} />
                      Retour à la connexion
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          <div className="ak-bottom-note">
            <strong>Mikolo Aina</strong>
            <br />
            Accès réservé au personnel autorisé
          </div>
        </section>
      </main>
    </div>
  );
}
