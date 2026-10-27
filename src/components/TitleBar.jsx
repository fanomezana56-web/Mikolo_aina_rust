
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  HeartPulse, Minus, Square, Copy, X, Maximize2, Minimize,
  LayoutDashboard, Users, Pill, WalletCards, ReceiptText, Package,
  ChevronDown, Clock3, CalendarDays, UserRound, Keyboard, LogOut,
  RefreshCw, Search, Database, Bell, AlertTriangle, CheckCircle2,
  XCircle, ArrowRight, FileText, Activity, Settings, Command,
} from "lucide-react";

const appWindow = getCurrentWindow();

const NAVIGATION = [
  { label: "Tableau de bord", path: "/", icon: LayoutDashboard, shortcut: "Alt + 1" },
  { label: "Patients", path: "/patients", icon: Users, shortcut: "Alt + 2" },
  { label: "Médicaments", path: "/medicaments", icon: Pill, shortcut: "Alt + 3" },
  { label: "Comptabilité", path: "/comptabilite", icon: WalletCards, shortcut: "Alt + 4" },
  { label: "Historique comptable", path: "/comptabilite/liste", icon: ReceiptText },
  { label: "Factures", path: "/factures", icon: FileText, shortcut: "Alt + 5" },
  { label: "Stock", path: "/stock", icon: Package, shortcut: "Alt + 6" },
  { label: "Sorties de médicaments", path: "/sorties-medicaments", icon: Pill },
  { label: "Sorties diverses", path: "/sorties", icon: WalletCards },
  { label: "Soins", path: "/soins", icon: HeartPulse },
];

const classesBouton =
  "flex items-center justify-center rounded-md transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/50";

function obtenirNom(utilisateur) {
  if (!utilisateur) return "Administrateur";
  const nom = [utilisateur.prenom, utilisateur.nom].filter(Boolean).join(" ");
  return nom || utilisateur.nom_complet || utilisateur.username ||
    utilisateur.email || "Administrateur";
}

function formaterMontant(montant) {
  const valeur = Number(montant);
  if (montant === null || montant === undefined || montant === "" ||
      !Number.isFinite(valeur)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valeur);
}

function lireNom(element) {
  return [
    element?.nom_complet,
    element?.nom,
    element?.libelle,
    element?.designation,
    element?.nom_medicament,
    element?.prenom,
  ].filter(Boolean).join(" ");
}

function lireQuantite(medicament) {
  const valeurs = [
    medicament?.quantite_stock,
    medicament?.quantite,
    medicament?.stock,
    medicament?.quantite_actuelle,
  ];
  const valeur = valeurs.find((v) => v !== null && v !== undefined && v !== "");
  return valeur === undefined ? null : Number(valeur);
}

function lireDateExpiration(medicament) {
  const valeur = medicament?.date_expiration;
  if (!valeur) return null;
  const date = new Date(`${String(valeur).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formaterDate(date) {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ZoneRedimensionnement({ direction, classe }) {
  const redimensionner = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await appWindow.startResizeDragging(direction);
    } catch (erreur) {
      console.error("Redimensionnement impossible :", erreur);
    }
  };

  return (
    <div
      onMouseDown={redimensionner}
      className={`fixed z-[9999] ${classe}`}
      aria-hidden="true"
    />
  );
}

function StatutConnexion({ statut, verifier }) {
  const config = {
    verification: {
      texte: "Vérification…",
      classe: "bg-amber-300",
      icone: RefreshCw,
    },
    connecte: {
      texte: "PostgreSQL connecté",
      classe: "bg-emerald-300",
      icone: CheckCircle2,
    },
    erreur: {
      texte: "Base indisponible",
      classe: "bg-red-300",
      icone: XCircle,
    },
  }[statut] || {
    texte: "État inconnu",
    classe: "bg-slate-300",
    icone: Database,
  };

  const Icone = config.icone;

  return (
    <button
      type="button"
      onClick={verifier}
      title={`${config.texte}, cliquer pour vérifier`}
      className="hidden items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-[9px] font-semibold hover:bg-white/15 lg:flex"
    >
      <span className={`h-2 w-2 rounded-full ${config.classe}`} />
      <Icone size={12} />
      <span className="hidden 2xl:inline">{config.texte}</span>
    </button>
  );
}

export default function TitleBar({ utilisateur, onDeconnexion }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [maximise, setMaximise] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [adminOuvert, setAdminOuvert] = useState(false);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [alertesOuvertes, setAlertesOuvertes] = useState(false);
  const [termeRecherche, setTermeRecherche] = useState("");
  const [horloge, setHorloge] = useState(new Date());

  const [soldeCentre, setSoldeCentre] = useState(null);
  const [derniereActualisation, setDerniereActualisation] = useState(null);
  const [chargementSolde, setChargementSolde] = useState(false);
  const [erreurSolde, setErreurSolde] = useState(false);
  const [actualisationManuelle, setActualisationManuelle] = useState(false);

  const [statutBase, setStatutBase] = useState("verification");
  const [derniereVerificationBase, setDerniereVerificationBase] = useState(null);
  const [medicaments, setMedicaments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [chargementRecherche, setChargementRecherche] = useState(false);
  const [erreurRecherche, setErreurRecherche] = useState("");
  const [erreurFenetre, setErreurFenetre] = useState("");
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false);

  const actualiserEtatFenetre = useCallback(async () => {
    try {
      const [max, fullscreen] = await Promise.all([
        appWindow.isMaximized(),
        appWindow.isFullscreen(),
      ]);
      setMaximise(max);
      setPleinEcran(fullscreen);
    } catch (erreur) {
      console.error("État de la fenêtre indisponible :", erreur);
    }
  }, []);

  const chargerSoldeCentre = useCallback(async (silencieux = false) => {
    if (!silencieux) {
      setChargementSolde(true);
      setActualisationManuelle(true);
    }

    try {
      const resultat = await invoke("obtenir_solde_centre");
      setSoldeCentre(resultat);
      setErreurSolde(false);
      setDerniereActualisation(new Date());
    } catch (erreur) {
      console.error("Erreur de chargement du capital :", erreur);
      setErreurSolde(true);
    } finally {
      setChargementSolde(false);
      setActualisationManuelle(false);
    }
  }, []);

  const verifierBase = useCallback(async () => {
    setStatutBase("verification");
    try {
      await invoke("test_database");
      setStatutBase("connecte");
      setDerniereVerificationBase(new Date());
      return true;
    } catch (erreur) {
      console.error("Vérification PostgreSQL échouée :", erreur);
      setStatutBase("erreur");
      setDerniereVerificationBase(new Date());
      return false;
    }
  }, []);

  const chargerDonneesRecherche = useCallback(async () => {
    setChargementRecherche(true);
    setErreurRecherche("");

    const [resultatPatients, resultatMedicaments] = await Promise.allSettled([
      invoke("obtenir_patients"),
      invoke("obtenir_medicaments"),
    ]);

    if (resultatPatients.status === "fulfilled") {
      const resultat = resultatPatients.value;
      setPatients(Array.isArray(resultat) ? resultat : resultat?.patients || []);
    }

    if (resultatMedicaments.status === "fulfilled") {
      const resultat = resultatMedicaments.value;
      setMedicaments(Array.isArray(resultat) ? resultat : resultat?.medicaments || []);
    }

    if (
      resultatPatients.status === "rejected" &&
      resultatMedicaments.status === "rejected"
    ) {
      setErreurRecherche(
        "Impossible de charger les patients et les médicaments. Vérifie les noms des commandes Rust."
      );
    }

    setChargementRecherche(false);
  }, []);

  useEffect(() => {
    const intervalleHorloge = window.setInterval(() => setHorloge(new Date()), 1000);
    const intervalleSolde = window.setInterval(() => chargerSoldeCentre(true), 30000);
    const intervalleBase = window.setInterval(() => verifierBase(), 60000);

    actualiserEtatFenetre();
    chargerSoldeCentre();
    verifierBase();

    let actif = true;
    let annulerEcouteTaille;
    const annulerEcoutes = [];

    appWindow.onResized(() => actualiserEtatFenetre())
      .then((annuler) => {
        if (actif) annulerEcouteTaille = annuler;
        else annuler();
      })
      .catch((erreur) => console.warn("Suivi de fenêtre impossible :", erreur));

    async function installerEcoutes() {
      for (const nom of ["solde-centre-change", "dashboard-refresh"]) {
        try {
          const annuler = await listen(nom, () => chargerSoldeCentre(true));
          if (actif) annulerEcoutes.push(annuler);
          else annuler();
        } catch (erreur) {
          console.warn(`Événement ${nom} indisponible :`, erreur);
        }
      }
    }

    installerEcoutes();

    const actualiserDepuisInterface = () => chargerSoldeCentre(true);
    window.addEventListener("solde-centre-change", actualiserDepuisInterface);

    return () => {
      actif = false;
      window.clearInterval(intervalleHorloge);
      window.clearInterval(intervalleSolde);
      window.clearInterval(intervalleBase);
      annulerEcouteTaille?.();
      annulerEcoutes.forEach((annuler) => annuler());
      window.removeEventListener("solde-centre-change", actualiserDepuisInterface);
    };
  }, [actualiserEtatFenetre, chargerSoldeCentre, verifierBase]);

  useEffect(() => {
    setMenuOuvert(false);
    setAdminOuvert(false);
    setRechercheOuverte(false);
    setAlertesOuvertes(false);
  }, [location.pathname]);

  useEffect(() => {
    const gererRaccourcis = (event) => {
      const cible = event.target;
      const saisieEnCours =
        cible instanceof HTMLElement &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(cible.tagName) ||
          cible.isContentEditable);

      if (event.key === "Escape") {
        setMenuOuvert(false);
        setAdminOuvert(false);
        setRechercheOuverte(false);
        setAlertesOuvertes(false);
        if (pleinEcran) appWindow.setFullscreen(false).catch(console.error);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setRechercheOuverte((v) => !v);
        setMenuOuvert(false);
        setAlertesOuvertes(false);
        return;
      }

      if (saisieEnCours) return;

      if (event.key === "F11") {
        event.preventDefault();
        appWindow.isFullscreen()
          .then((etat) => appWindow.setFullscreen(!etat))
          .catch(console.error);
        return;
      }

      if (!event.altKey || event.ctrlKey || event.shiftKey) return;

      const raccourcis = {
        "1": "/", "2": "/patients", "3": "/medicaments",
        "4": "/comptabilite", "5": "/factures", "6": "/stock",
      };
      if (raccourcis[event.key]) {
        event.preventDefault();
        navigate(raccourcis[event.key]);
      }
    };

    window.addEventListener("keydown", gererRaccourcis);
    return () => window.removeEventListener("keydown", gererRaccourcis);
  }, [navigate, pleinEcran]);

  const executerActionFenetre = async (action) => {
    setErreurFenetre("");
    try {
      await action();
      await actualiserEtatFenetre();
    } catch (erreur) {
      console.error("Action sur la fenêtre impossible :", erreur);
      setErreurFenetre("Action impossible");
      window.setTimeout(() => setErreurFenetre(""), 2500);
    }
  };

  const fermerApplication = async () => {
    if (!window.confirm("Voulez-vous vraiment fermer Aina Koloina ?")) return;
    await executerActionFenetre(() => appWindow.close());
  };

  const seDeconnecter = async () => {
    if (deconnexionEnCours) return;
    if (!window.confirm("Voulez-vous vraiment vous déconnecter ?")) return;

    setDeconnexionEnCours(true);
    setAdminOuvert(false);
    try {
      await onDeconnexion?.();
    } catch (erreur) {
      console.error("Erreur de déconnexion :", erreur);
    } finally {
      setDeconnexionEnCours(false);
    }
  };

  const joursAvantExpiration = (date) =>
    Math.ceil((date.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);

  const alertes = useMemo(() => {
    const resultat = [];

    for (const medicament of medicaments) {
      const nom = lireNom(medicament) || "Médicament sans nom";
      const quantite = lireQuantite(medicament);
      const expiration = lireDateExpiration(medicament);

      if (quantite !== null && Number.isFinite(quantite)) {
        if (quantite <= 0) {
          resultat.push({
            id: `stock-zero-${medicament.id ?? nom}`,
            type: "danger",
            titre: "Rupture de stock",
            detail: nom,
            valeur: "Stock nul",
            path: "/stock",
          });
        } else if (quantite <= 10) {
          resultat.push({
            id: `stock-faible-${medicament.id ?? nom}`,
            type: "warning",
            titre: "Stock faible",
            detail: nom,
            valeur: `${quantite} restant(s)`,
            path: "/stock",
          });
        }
      }

      if (expiration) {
        const jours = joursAvantExpiration(expiration);
        if (jours < 0) {
          resultat.push({
            id: `expire-${medicament.id ?? nom}`,
            type: "danger",
            titre: "Date dépassée",
            detail: nom,
            valeur: expiration.toLocaleDateString("fr-FR"),
            path: "/medicaments",
          });
        } else if (jours <= 30) {
          resultat.push({
            id: `expiration-${medicament.id ?? nom}`,
            type: "warning",
            titre: "Expiration proche",
            detail: nom,
            valeur: jours === 0 ? "Aujourd’hui" : `Dans ${jours} jour(s)`,
            path: "/medicaments",
          });
        }
      }
    }

    return resultat;
  }, [medicaments]);

  const resultatsRecherche = useMemo(() => {
    const terme = termeRecherche.trim().toLocaleLowerCase("fr");
    if (!terme) return [];

    const modules = NAVIGATION
      .filter((item) => item.label.toLocaleLowerCase("fr").includes(terme))
      .map((item) => ({
        id: `module-${item.path}`,
        label: item.label,
        description: "Ouvrir le module",
        path: item.path,
        icon: item.icon,
        categorie: "Module",
      }));

    const patientsFiltres = patients
      .filter((patient) =>
        [
          patient?.nom, patient?.prenom, patient?.nom_complet,
          patient?.telephone, patient?.numero, patient?.id,
        ].some((v) => String(v ?? "").toLocaleLowerCase("fr").includes(terme))
      )
      .slice(0, 5)
      .map((patient) => ({
        id: `patient-${patient.id}`,
        label: [patient.prenom, patient.nom].filter(Boolean).join(" ") ||
          patient.nom_complet || `Patient ${patient.id ?? ""}`,
        description: "Patient",
        path: "/patients",
        icon: Users,
        categorie: "Patient",
      }));

    const medicamentsFiltres = medicaments
      .filter((medicament) =>
        [
          medicament?.nom, medicament?.libelle, medicament?.designation,
          medicament?.nom_medicament, medicament?.id,
        ].some((v) => String(v ?? "").toLocaleLowerCase("fr").includes(terme))
      )
      .slice(0, 5)
      .map((medicament) => ({
        id: `medicament-${medicament.id}`,
        label: lireNom(medicament) || `Médicament ${medicament.id ?? ""}`,
        description: "Médicament",
        path: "/medicaments",
        icon: Pill,
        categorie: "Médicament",
      }));

    return [...modules, ...patientsFiltres, ...medicamentsFiltres].slice(0, 12);
  }, [termeRecherche, patients, medicaments]);

  const capitalDisponible =
    soldeCentre?.montant_total !== null &&
    soldeCentre?.montant_total !== undefined;

  return (
    <>
      <header
        className="relative z-[200] flex h-[54px] w-full shrink-0 select-none items-center gap-2 border-b border-[#244C40] bg-[#28594B] px-2 text-white shadow-md sm:px-3"
        data-tauri-drag-region
        onDoubleClick={(event) => {
          if (event.target.closest("button")) return;
          executerActionFenetre(() => appWindow.toggleMaximize());
        }}
      >
        <div className="flex min-w-0 shrink-0 items-center gap-2" data-tauri-drag-region>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#28594B]" data-tauri-drag-region>
            <HeartPulse size={19} strokeWidth={2.2} />
          </div>
          <div className="hidden min-w-0 flex-col justify-center sm:flex" data-tauri-drag-region>
            <span className="text-[10px] font-extrabold tracking-[0.12em]">MIKOLO AINA</span>
            <span className="text-[8px] tracking-wider text-white/70">CENTRE DE SANTÉ</span>
          </div>
        </div>

        <div className="relative ml-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMenuOuvert((v) => !v);
              setAdminOuvert(false);
              setAlertesOuvertes(false);
            }}
            className="flex h-[31px] items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2 text-[10px] font-semibold hover:bg-white/20 sm:px-2.5"
          >
            <LayoutDashboard size={13} />
            <span className="hidden md:inline">Navigation</span>
            <ChevronDown size={12} />
          </button>

          {menuOuvert && (
            <div className="absolute left-0 top-[38px] z-[500] max-h-[75vh] w-[250px] overflow-y-auto rounded-xl border border-[#DCE7E0] bg-white py-1.5 text-[#263D34] shadow-xl">
              <div className="border-b border-[#E8EFEA] px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#438B74]">Accès rapide</p>
                <p className="mt-0.5 text-[10px] text-slate-500">Sélectionnez un module</p>
              </div>
              {NAVIGATION.map((item) => {
                const Icone = item.icon;
                const actif = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      navigate(item.path);
                      setMenuOuvert(false);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[11px] ${
                      actif ? "bg-[#EAF4EE] font-bold text-[#28594B]" : "hover:bg-[#F4F8F5]"
                    }`}
                  >
                    <Icone size={15} />
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && <span className="text-[9px] text-slate-400">{item.shortcut}</span>}
                  </button>
                );
              })}
              <div className="border-t border-[#E8EFEA] px-3 py-2 text-[9px] text-slate-500">
                <Keyboard className="mr-1 inline" size={12} />
                Ctrl + K : recherche · F11 : plein écran · Échap : fermer
              </div>
            </div>
          )}
        </div>

        <div className="ml-auto flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
          <StatutConnexion statut={statutBase} verifier={verifierBase} />

          <button
            type="button"
            onClick={() => {
              setRechercheOuverte(true);
              setMenuOuvert(false);
              setAlertesOuvertes(false);
              chargerDonneesRecherche();
            }}
            title="Recherche rapide (Ctrl + K)"
            aria-label="Ouvrir la recherche rapide"
            className={`${classesBouton} h-[32px] w-[32px] border border-white/15 bg-white/10`}
          >
            <Search size={15} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setAlertesOuvertes((v) => !v);
                setMenuOuvert(false);
                setAdminOuvert(false);
              }}
              title={`${alertes.length} alerte(s) de stock et d’expiration`}
              aria-label="Afficher les alertes"
              className={`${classesBouton} relative h-[32px] w-[32px] border border-white/15 bg-white/10`}
            >
              <Bell size={15} />
              {alertes.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#D76D68] px-1 text-[9px] font-bold text-white">
                  {alertes.length > 9 ? "9+" : alertes.length}
                </span>
              )}
            </button>

            {alertesOuvertes && (
              <div className="absolute right-0 top-[40px] z-[600] w-[310px] overflow-hidden rounded-xl border border-[#DCE7E0] bg-white text-[#263D34] shadow-xl sm:w-[350px]">
                <div className="flex items-center justify-between border-b border-[#E8EFEA] bg-[#F5F9F5] px-3 py-3">
                  <div>
                    <p className="text-[11px] font-bold">Alertes du centre</p>
                    <p className="mt-0.5 text-[9px] text-slate-500">Stocks et dates d’expiration</p>
                  </div>
                  <span className="rounded-full bg-[#E4F0E7] px-2 py-1 text-[10px] font-bold text-[#28594B]">
                    {alertes.length}
                  </span>
                </div>

                <div className="max-h-[340px] overflow-y-auto">
                  {alertes.length === 0 ? (
                    <div className="px-4 py-7 text-center">
                      <CheckCircle2 size={25} className="mx-auto mb-2 text-[#438B74]" />
                      <p className="text-[11px] font-semibold">Aucune alerte détectée</p>
                      <p className="mt-1 text-[9px] text-slate-500">
                        Les alertes dépendent des quantités et dates disponibles.
                      </p>
                    </div>
                  ) : alertes.map((alerte) => (
                    <button
                      key={alerte.id}
                      type="button"
                      onClick={() => {
                        navigate(alerte.path);
                        setAlertesOuvertes(false);
                      }}
                      className="flex w-full items-start gap-2.5 border-b border-[#EEF2EF] px-3 py-3 text-left hover:bg-[#F6F9F6]"
                    >
                      <span className={`mt-0.5 rounded-md p-1.5 ${
                        alerte.type === "danger" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                      }`}>
                        <AlertTriangle size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold">{alerte.titre}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-600">{alerte.detail}</span>
                        <span className="mt-1 block text-[9px] text-slate-400">{alerte.valeur}</span>
                      </span>
                      <ArrowRight size={13} className="mt-1 text-slate-400" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigate("/stock");
                    setAlertesOuvertes(false);
                  }}
                  className="w-full border-t border-[#E8EFEA] px-3 py-2.5 text-[10px] font-bold text-[#347458] hover:bg-[#F5F9F5]"
                >
                  Ouvrir le stock
                </button>
              </div>
            )}
          </div>

          <div className="flex h-[36px] min-w-0 shrink items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2 sm:gap-2 sm:px-3" title="Capital actuel du centre">
            <div className="flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-md bg-white/15">
              {chargementSolde ? <RefreshCw size={14} className="animate-spin" /> : <WalletCards size={15} />}
            </div>
            <div className="flex min-w-0 flex-col gap-[2px]">
              <span className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-wider text-white/70">Capital actuel</span>
              <span className={`max-w-[125px] truncate text-[10px] font-extrabold tabular-nums sm:text-[11px] ${erreurSolde ? "text-amber-200" : ""}`}>
                {capitalDisponible
                  ? `${formaterMontant(soldeCentre.montant_total)} Ar`
                  : erreurSolde ? "Indisponible" : "Chargement…"}
              </span>
              <span className="hidden text-[8px] text-white/65 2xl:block">
                {derniereActualisation
                  ? `Mis à jour à ${derniereActualisation.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                  : "Pas encore actualisé"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => chargerSoldeCentre()}
              disabled={actualisationManuelle}
              title="Actualiser le capital"
              aria-label="Actualiser le capital"
              className={`${classesBouton} h-[25px] w-[25px] shrink-0 text-white/75 disabled:opacity-50`}
            >
              <RefreshCw size={12} className={actualisationManuelle ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="hidden shrink-0 flex-col items-end leading-tight lg:flex">
            <span className="mt-0.5 flex items-center gap-1 text-[9px] capitalize text-white/75">
              <CalendarDays size={10} />
              {formaterDate(horloge)}
            </span>
            <span className="flex items-center gap-1 text-[12px] font-bold tabular-nums">
              <Clock3 size={12} />
              {horloge.toLocaleTimeString("fr-FR", {
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              })}
            </span>
            {derniereVerificationBase && (
              <span className=" text-[8px] text-white/60 2xl:block">
                Base vérifiée à {derniereVerificationBase.toLocaleTimeString("fr-FR")}
              </span>
            )}
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setAdminOuvert((v) => !v);
                setMenuOuvert(false);
                setAlertesOuvertes(false);
              }}
              aria-expanded={adminOuvert}
              title={obtenirNom(utilisateur)}
              className="flex h-[34px] max-w-[150px] items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2 hover:bg-white/20 sm:gap-2 sm:px-2.5"
            >
              <UserRound size={15} className="shrink-0" />
              <span className="hidden max-w-[90px] truncate text-[10px] font-semibold md:inline">{obtenirNom(utilisateur)}</span>
              <ChevronDown size={12} />
            </button>

            {adminOuvert && (
              <div className="absolute right-0 top-[42px] z-[600] w-[240px] overflow-hidden rounded-xl border border-[#DCE7E0] bg-white text-[#263D34] shadow-xl">
                <div className="border-b border-[#E8EFEA] bg-[#F5F9F5] p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#E2F0E5] text-[#347458]">
                      <UserRound size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold">{obtenirNom(utilisateur)}</p>
                      <p className="mt-0.5 text-[9px] text-slate-500">Session administrateur</p>
                    </div>
                  </div>
                </div>
                <div className="px-3 py-2 text-[9px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${statutBase === "connecte" ? "bg-emerald-500" : statutBase === "erreur" ? "bg-red-500" : "bg-amber-400"}`} />
                    {statutBase === "connecte" ? "Base de données disponible" : statutBase === "erreur" ? "Base de données indisponible" : "Vérification de la base…"}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={deconnexionEnCours}
                  onClick={seDeconnecter}
                  className="flex w-full items-center gap-2.5 px-3 py-3 text-left text-[11px] font-semibold text-[#B64F4F] hover:bg-[#FFF1EF] disabled:opacity-50"
                >
                  <LogOut size={15} />
                  <span className="flex-1">{deconnexionEnCours ? "Déconnexion…" : "Se déconnecter"}</span>
                </button>
              </div>
            )}
          </div>

          {erreurFenetre && <span className="hidden text-[10px] text-amber-200 sm:inline">{erreurFenetre}</span>}
        </div>

        <div className="ml-1 flex h-[54px] shrink-0 items-stretch border-l border-white/10">
          <button type="button" title="Réduire" aria-label="Réduire la fenêtre" onClick={() => executerActionFenetre(() => appWindow.minimize())} className="flex w-[32px] items-center justify-center hover:bg-white/15 sm:w-[36px]">
            <Minus size={15} />
          </button>
          <button type="button" title={maximise ? "Restaurer" : "Agrandir"} aria-label={maximise ? "Restaurer la fenêtre" : "Agrandir la fenêtre"} onClick={() => executerActionFenetre(() => appWindow.toggleMaximize())} className="flex w-[32px] items-center justify-center hover:bg-white/15 sm:w-[36px]">
            {maximise ? <Copy size={13} /> : <Square size={13} />}
          </button>
          <button type="button" title={pleinEcran ? "Quitter le plein écran" : "Plein écran"} aria-label="Basculer le plein écran" onClick={() => executerActionFenetre(() => appWindow.setFullscreen(!pleinEcran))} className="hidden w-[32px] items-center justify-center hover:bg-white/15 2xl:flex">
            {pleinEcran ? <Minimize size={14} /> : <Maximize2 size={14} />}
          </button>
          <button type="button" title="Fermer l'application" aria-label="Fermer l'application" onClick={fermerApplication} className="flex w-[36px] items-center justify-center hover:bg-[#C74646] sm:w-[42px]">
            <X size={16} />
          </button>
        </div>
      </header>

      {rechercheOuverte && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/35 px-3 pt-[12vh]" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setRechercheOuverte(false);
        }}>
          <div className="w-full max-w-[560px] overflow-hidden rounded-xl border border-[#DCE7E0] bg-white text-[#263D34] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-[#E8EFEA] px-4 py-3">
              <Search size={18} className="text-[#438B74]" />
              <input
                autoFocus
                value={termeRecherche}
                onChange={(event) => setTermeRecherche(event.target.value)}
                placeholder="Rechercher un patient, un médicament ou un module…"
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400"
              />
              <button type="button" onClick={() => setRechercheOuverte(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Fermer la recherche">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              {chargementRecherche && (
                <p className="flex items-center gap-2 px-3 py-4 text-[11px] text-slate-500">
                  <RefreshCw size={14} className="animate-spin" /> Chargement des données…
                </p>
              )}
              {erreurRecherche && <p className="px-3 py-3 text-[10px] text-red-600">{erreurRecherche}</p>}
              {!chargementRecherche && termeRecherche.trim() && resultatsRecherche.length === 0 && (
                <p className="px-3 py-6 text-center text-[11px] text-slate-500">Aucun résultat trouvé.</p>
              )}
              {!termeRecherche.trim() && !chargementRecherche && (
                <p className="px-3 py-5 text-center text-[11px] text-slate-500">
                  Tapez un nom, un médicament ou un module.
                </p>
              )}
              {resultatsRecherche.map((resultat) => {
                const Icone = resultat.icon;
                return (
                  <button
                    key={resultat.id}
                    type="button"
                    onClick={() => {
                      navigate(resultat.path);
                      setRechercheOuverte(false);
                      setTermeRecherche("");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#F0F7F2]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E5F2E9] text-[#347458]">
                      <Icone size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold">{resultat.label}</span>
                      <span className="block text-[9px] text-slate-500">{resultat.description}</span>
                    </span>
                    <span className="text-[9px] text-slate-400">{resultat.categorie}</span>
                    <ArrowRight size={13} className="text-slate-400" />
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-[#E8EFEA] bg-[#F8FAF8] px-4 py-2 text-[9px] text-slate-500">
              <span><Command size={11} className="mr-1 inline" /> Ctrl + K pour ouvrir/fermer</span>
              <span>Échap pour fermer</span>
            </div>
          </div>
        </div>
      )}

      {!maximise && !pleinEcran && (
        <>
          <ZoneRedimensionnement direction="North" classe="left-[6px] right-[6px] top-0 h-[4px] cursor-n-resize" />
          <ZoneRedimensionnement direction="South" classe="bottom-0 left-[6px] right-[6px] h-[5px] cursor-s-resize" />
          <ZoneRedimensionnement direction="West" classe="bottom-[6px] left-0 top-[6px] w-[5px] cursor-w-resize" />
          <ZoneRedimensionnement direction="East" classe="bottom-[6px] right-0 top-[6px] w-[5px] cursor-e-resize" />
          <ZoneRedimensionnement direction="NorthWest" classe="left-0 top-0 h-[8px] w-[8px] cursor-nw-resize" />
          <ZoneRedimensionnement direction="NorthEast" classe="right-0 top-0 h-[8px] w-[8px] cursor-ne-resize" />
          <ZoneRedimensionnement direction="SouthWest" classe="bottom-0 left-0 h-[8px] w-[8px] cursor-sw-resize" />
          <ZoneRedimensionnement direction="SouthEast" classe="bottom-0 right-0 h-[8px] w-[8px] cursor-se-resize" />
        </>
      )}
    </>
  );
}
