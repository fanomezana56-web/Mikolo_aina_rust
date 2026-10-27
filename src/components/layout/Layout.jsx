
import { useCallback, useEffect, useState } from "react";
import {
  HeartPulse,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout({
  jeton,
  utilisateur,
  onDeconnexion,
}) {
  const [sidebarOuverte, setSidebarOuverte] = useState(true);
  const [mobileOuverte, setMobileOuverte] = useState(false);

  const [soldeCentre, setSoldeCentre] = useState(null);
  const [chargementSolde, setChargementSolde] = useState(true);
  const [erreurSolde, setErreurSolde] = useState(false);
  const [derniereActualisation, setDerniereActualisation] =
    useState(null);

  const location = useLocation();

  const basculerSidebar = useCallback(() => {
    setSidebarOuverte((ancienneValeur) => !ancienneValeur);
  }, []);

  const chargerSoldeCentre = useCallback(
    async (silencieux = false) => {
      try {
        if (!silencieux) {
          setChargementSolde(true);
        }

        const resultat = await invoke("obtenir_solde_centre");

        setSoldeCentre(resultat);
        setErreurSolde(false);
        setDerniereActualisation(new Date());
      } catch (error) {
        console.error(
          "Erreur lors du chargement du capital du centre :",
          error
        );
        setErreurSolde(true);
      } finally {
        setChargementSolde(false);
      }
    },
    []
  );

  // Chargement initial, actualisation périodique et événements Tauri.
  useEffect(() => {
    let actif = true;
    let annulerEcoutes = [];

    chargerSoldeCentre();

    const intervalle = window.setInterval(() => {
      chargerSoldeCentre(true);
    }, 30000);

    async function installerEcoutes() {
      const evenements = [
        "solde-centre-change",
        "dashboard-refresh",
      ];

      for (const evenement of evenements) {
        try {
          const annuler = await listen(evenement, () => {
            chargerSoldeCentre(true);
          });

          if (actif) {
            annulerEcoutes.push(annuler);
          } else {
            annuler();
          }
        } catch (error) {
          console.error(
            `Impossible d'écouter l'événement ${evenement} :`,
            error
          );
        }
      }
    }

    installerEcoutes();

    const actualiserDepuisInterface = () => {
      chargerSoldeCentre(true);
    };

    window.addEventListener(
      "solde-centre-change",
      actualiserDepuisInterface
    );

    return () => {
      actif = false;
      window.clearInterval(intervalle);

      window.removeEventListener(
        "solde-centre-change",
        actualiserDepuisInterface
      );

      annulerEcoutes.forEach((annuler) => annuler());
    };
  }, [chargerSoldeCentre]);

  // Fermer le menu mobile lors d'un changement de page.
  useEffect(() => {
    setMobileOuverte(false);
  }, [location.pathname]);

  // Fermer le menu mobile avec Échap.
  useEffect(() => {
    function fermerMenu(event) {
      if (event.key === "Escape") {
        setMobileOuverte(false);
      }
    }

    window.addEventListener("keydown", fermerMenu);

    return () => {
      window.removeEventListener("keydown", fermerMenu);
    };
  }, []);

  return (
    <div className="ak-shell">
      <style>{`
        /* Réinitialisation générale */
        html,
        body,
        #root {
          width: 100%;
          height: 100%;
          min-width: 0;
          min-height: 0;
          margin: 0;
          padding: 0;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        html,
        body {
          overflow: hidden;
        }

        /* Fenêtre principale */
        .ak-shell {
          --ak-green: #438B74;
          --ak-green-dark: #2F6C55;
          --ak-ink: #34473C;
          --ak-muted: #8A978E;
          --ak-border: #E3EAE2;

          display: flex;
          flex-direction: row;
          align-items: stretch;

          width: 100%;
          height: 100%;
          min-width: 0;
          min-height: 0;

          margin: 0;
          overflow: hidden;

          color: var(--ak-ink);
          background: #F6F8F5;
          font-family: "DM Sans", "Segoe UI", sans-serif;
        }

        .ak-shell > * {
          min-width: 0;
          min-height: 0;
        }

        /* Zone contenant les pages */
        .ak-content {
          display: flex;
          flex: 1 1 0%;
          flex-direction: column;

          width: 0;
          height: 100%;
          min-width: 0;
          min-height: 0;

          overflow: hidden;
        }

        /* Zone de défilement principale */
        .ak-page-main {
          display: block;
          flex: 1 1 auto;

          width: 100%;
          height: auto;
          min-width: 0;
          min-height: 0;

          overflow-x: auto;
          overflow-y: auto;

          overscroll-behavior: contain;
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: #CBD8CC transparent;

          -webkit-overflow-scrolling: touch;
        }

        .ak-page-main::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .ak-page-main::-webkit-scrollbar-track {
          background: transparent;
        }

        .ak-page-main::-webkit-scrollbar-thumb {
          background: #CBD8CC;
          border: 2px solid #F5F7F4;
          border-radius: 20px;
        }

        .ak-page-main::-webkit-scrollbar-thumb:hover {
          background: #A9BFAE;
        }

        .ak-page-main > * {
          min-width: 0;
          max-width: 100%;
        }

        .ak-page-main img,
        .ak-page-main canvas,
        .ak-page-main svg {
          max-width: 100%;
        }

        /* Bouton de réduction du menu latéral */
        .ak-sidebar-toggle {
          transition:
            background .18s,
            border-color .18s,
            box-shadow .18s,
            color .18s;
        }

        .ak-sidebar-toggle:hover {
          background: #EDF5EE;
          border-color: #BBD6C4;
          box-shadow: 0 4px 12px rgba(38,67,58,.12);
          color: #2F6C55;
        }

        /* Menu mobile */
        .ak-mobile-backdrop {
          animation: ak-backdrop-in .18s ease-out both;
        }

        .ak-mobile-drawer {
          animation: ak-drawer-in .22s ease-out both;
          box-shadow: -12px 0 40px rgba(29,48,36,.12);
        }

        @keyframes ak-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes ak-drawer-in {
          from {
            transform: translateX(24px);
            opacity: .7;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 850px) {
          .ak-page-main {
            scrollbar-gutter: auto;
          }
        }

        @media (max-width: 639px) {
          .ak-page-main {
            overflow-x: auto;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ak-shell *,
          .ak-shell *::before,
          .ak-shell *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      {/* Contenu des pages : le défilement vertical se fait ici */}
      <div className="ak-content">
        <main className="ak-page-main">
          <Outlet />
        </main>
      </div>

      {/* Menu latéral pour ordinateur */}
      <aside
        className="relative hidden h-full min-h-0 shrink-0 lg:block"
        style={{
          height: "100%",
          maxHeight: "100%",
        }}
      >
        <button
          type="button"
          onClick={basculerSidebar}
          aria-label={
            sidebarOuverte
              ? "Réduire le menu"
              : "Ouvrir le menu"
          }
          title={
            sidebarOuverte
              ? "Réduire le menu"
              : "Ouvrir le menu"
          }
          className="ak-sidebar-toggle absolute left-0 top-1/2 z-50 flex h-[28px] w-[28px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#C8DAD0] bg-white text-[#39765C] shadow-[0_3px_9px_rgba(38,67,58,.10)] active:scale-95"
        >
          {sidebarOuverte ? (
            <ChevronRight
              className="h-[14px] w-[14px]"
              strokeWidth={2.5}
            />
          ) : (
            <ChevronLeft
              className="h-[14px] w-[14px]"
              strokeWidth={2.5}
            />
          )}
        </button>

        <Sidebar
          ouverte={sidebarOuverte}
          onToggle={basculerSidebar}
          mobile={false}
        />
      </aside>

      {/* Bouton d'ouverture du menu mobile */}
      <button
        type="button"
        aria-label="Ouvrir le menu"
        title="Ouvrir le menu"
        onClick={() => setMobileOuverte(true)}
        className="fixed bottom-4 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-[#DCE7DD] bg-white text-[#39765C] shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Menu mobile */}
      {mobileOuverte && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMobileOuverte(false)}
            className="ak-mobile-backdrop fixed inset-0 z-40 bg-[#23362B]/30 backdrop-blur-[3px] lg:hidden"
          />

          <div
            className="ak-mobile-drawer fixed inset-y-0 right-0 z-50 flex min-h-0 w-[min(86vw,320px)] flex-col overflow-hidden border-l border-[#DCE7DD] bg-white lg:hidden"
            style={{
              height: "100%",
              maxHeight: "100%",
            }}
          >
            <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-[#E6ECE5] px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-[29px] w-[29px] items-center justify-center rounded-[8px] bg-gradient-to-br from-[#579A7D] to-[#306D56] text-white">
                  <HeartPulse className="h-[15px] w-[15px]" />
                </div>

                <span className="text-[11px] font-extrabold tracking-wide text-[#34473C]">
                  Mikolo Aina
                </span>
              </div>

              <button
                type="button"
                onClick={() => setMobileOuverte(false)}
                aria-label="Fermer le menu"
                className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#E1E9E1] bg-white text-[#65766A]"
              >
                <X className="h-[15px] w-[15px]" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <Sidebar
                ouverte={true}
                mobile={true}
                onNavigate={() => setMobileOuverte(false)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
