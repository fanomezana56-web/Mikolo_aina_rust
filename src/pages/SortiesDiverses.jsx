import { useState } from "react";
import { Archive, PlusCircle } from "lucide-react";

import SortieDiversForm from "../components/sorties/SortieDiversForm";
import SortiesDiversesListe from "../components/sorties/SortiesDiversesListe";

export default function SortiesDiverses() {
  const [refreshKey, setRefreshKey] = useState(0);

  function sortieEnregistree() {
    setRefreshKey((ancien) => ancien + 1);
  }

  return (
    <div className="min-h-full space-y-5 bg-[#ffffff] p-4 sm:p-6">

      


      {/* FORMULAIRE */}
      <SortieDiversForm onSuccess={sortieEnregistree} />

      {/* LISTE */}
      <SortiesDiversesListe refreshKey={refreshKey} />

    </div>
  );
}