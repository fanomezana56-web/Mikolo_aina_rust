import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";

import AuthGate from "./components/auth/AuthGate";
import Layout from "./components/layout/Layout";
import TitleBar from "./components/TitleBar";

import Dashboard from "./pages/Dashboard";
import Medicaments from "./pages/Medicaments";
import Comptabilite from "./pages/Comptabilite";
import ComptabiliteListe from "./pages/ComptabiliteListe";
import SortiesMedicaments from "./pages/SortiesMedicaments";
import SortiesDiverses from "./pages/SortiesDiverses";
import Factures from "./pages/Factures";
import StockListe from "./pages/StockListe";
import SoinsForm from "./components/comptabilite/SoinsForm";
import Patients from "./pages/Patients";

function Application({ auth, onDeconnexion }) {
  return (
    <BrowserRouter>
      <div className="flex h-screen min-h-0 w-full flex-col overflow-hidden bg-[#F4F6F5]">

        {/* Barre de titre personnalisée */}
        <TitleBar
          utilisateur={auth?.utilisateur}
          onDeconnexion={onDeconnexion}
        />

        {/* Contenu principal */}
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <Routes>
            <Route
              element={
                <Layout
                  jeton={auth.jeton}
                  utilisateur={auth.utilisateur}
                  onDeconnexion={onDeconnexion}
                />
              }
            >
              <Route path="/" element={<Dashboard />} />

              <Route
                path="/medicaments"
                element={<Medicaments />}
              />

              <Route
                path="/comptabilite"
                element={<Comptabilite />}
              />

              <Route
                path="/comptabilite/liste"
                element={<ComptabiliteListe />}
              />

              <Route
                path="/sorties"
                element={<SortiesDiverses />}
              />

              <Route
                path="/factures"
                element={<Factures />}
              />

              <Route
                path="/sorties-medicaments"
                element={<SortiesMedicaments />}
              />

              <Route
                path="/stock"
                element={<StockListe />}
              />

              <Route
                path="/soins"
                element={<SoinsForm />}
              />

              <Route
                path="/patients"
                element={<Patients />}
              />

              <Route
                path="*"
                element={<Navigate to="/" replace />}
              />
            </Route>
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  const [auth, setAuth] = useState(null);
  const [verificationEnCours, setVerificationEnCours] =
    useState(true);

  useEffect(() => {
    let actif = true;

    async function verifierSession() {
      if (actif) {
        setVerificationEnCours(false);
      }
    }

    verifierSession();

    return () => {
      actif = false;
    };
  }, []);

  async function deconnecter() {
    const jeton = auth?.jeton;

    try {
      if (jeton) {
        await invoke("deconnexion", { jeton });
      }
    } catch (erreur) {
      console.error("Erreur de déconnexion :", erreur);
    } finally {
      setAuth(null);
    }
  }

  if (verificationEnCours) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F8F5]">
        <p className="text-sm font-medium text-[#28594B]">
          Initialisation...
        </p>
      </div>
    );
  }

  if (!auth) {
    return (
      <AuthGate
        onAuthenticated={(resultat) => {
          if (!resultat?.jeton) {
            console.error(
              "Connexion impossible : jeton absent."
            );
            return;
          }

          setAuth(resultat);
        }}
      />
    );
  }

  return (
    <Application
      auth={auth}
      onDeconnexion={deconnecter}
    />
  );
}