
import { useState } from "react";
import { FileText, ReceiptText } from "lucide-react";

import FactureForm from "../components/factures/FactureForm";
import FacturesListe from "../components/factures/FacturesListe";

export default function Factures() {
  const [refreshKey, setRefreshKey] = useState(0);

  function factureCreee() {
    setRefreshKey((ancien) => ancien + 1);
  }

  return (
    <main className="min-h-full px-2 py-2 sm:px-3 sm:py-3  bg-[#ffff]">
      <div className="mx-auto max-w-[1600px] space-y-4">

        {/* FORMULAIRE DE CRÉATION */}
        <section
          aria-labelledby="facture-form-title"
          className="min-w-0"
        >

          <FactureForm onSuccess={factureCreee} />
        </section>

        {/* LISTE DES FACTURES */}
        <section
          aria-labelledby="facture-list-title"
          className="min-w-0 pt-2"
        >
          <div className="min-w-0">
            <FacturesListe key={refreshKey} />
          </div>
        </section>

        {/* PIED DE PAGE */}
        <footer className="pt-2 text-center text-[11px] text-[#829087]">
          Aina Koloina · Gestion administrative et facturation
        </footer>

      </div>
    </main>
  );
}
