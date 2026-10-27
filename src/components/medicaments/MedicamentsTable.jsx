import {
  Package,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  PackagePlus,
  CircleDollarSign,
  Activity,
  Pencil,
  Minus,
  Trash2,
  CalendarDays,
} from "lucide-react";

export default function MedicamentTable({
  medicaments = [],
  onAddStock,
  onEditStock,
  onDelete,
}) {
  const formatMoney = (value) => {
    return new Intl.NumberFormat("fr-FR").format(
      Number(value || 0)
    );
  };

  // ============================================================
  // FORMATER UNE DATE
  // ============================================================

  const formatDate = (date) => {
    if (!date) {
      return "Non renseignée";
    }

    const dateObj = new Date(`${date}T00:00:00`);

    if (Number.isNaN(dateObj.getTime())) {
      return "Date invalide";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(dateObj);
  };

  // ============================================================
  // VÉRIFIER L'ÉTAT DE LA DATE D'EXPIRATION
  // ============================================================

  const getExpirationInfo = (date) => {
    if (!date) {
      return {
        type: "none",
        label: "Non renseignée",
      };
    }

    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);

    const dateExpiration = new Date(
      `${date}T00:00:00`
    );

    if (Number.isNaN(dateExpiration.getTime())) {
      return {
        type: "invalid",
        label: "Date invalide",
      };
    }

    // Médicament déjà expiré
    if (dateExpiration < aujourdHui) {
      return {
        type: "expired",
        label: "Expiré",
      };
    }

    // Calcul du nombre de jours restants
    const difference =
      dateExpiration.getTime() -
      aujourdHui.getTime();

    const joursRestants = Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    );

    // Expiration dans moins de 30 jours
    if (joursRestants <= 30) {
      return {
        type: "soon",
        label: "Expire bientôt",
      };
    }

    return {
      type: "valid",
      label: "Valide",
    };
  };

  return (
    <div
      className="
        overflow-hidden
        rounded-[12px]
        border border-[#DDE3E0]
        bg-white
        shadow-[0_3px_12px_rgba(38,51,47,0.05)]
      "
    >
      {/* =====================================================
          ÉTAT VIDE
      ====================================================== */}

      {medicaments.length === 0 ? (
        <div
          className="
            flex
            min-h-[300px]
            flex-col
            items-center
            justify-center
            px-6
            py-12
            text-center
          "
        >
          <div
            className="
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-[10px]
              border border-[#DDE3E0]
              bg-[#F4F6F5]
              text-[#356B5C]
            "
          >
            <Boxes
              className="h-6 w-6"
              strokeWidth={1.8}
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
            Aucun médicament
          </h3>

          <p
            className="
              mt-1.5
              max-w-sm
              text-[10px]
              leading-5
              text-[#87928E]
            "
          >
            Aucun médicament ne correspond aux critères
            sélectionnés.
          </p>
        </div>
      ) : (
        <>
          {/* =====================================================
              TABLEAU
          ====================================================== */}

          <div
            className="
              max-h-[620px]
              overflow-auto
              scrollbar-thin
              scrollbar-track-transparent
              scrollbar-thumb-[#C9D2CE]
            "
          >
            <table
              className="
                w-full
                min-w-[1220px]
                border-collapse
              "
            >
              {/* =================================================
                  EN-TÊTE
              ================================================== */}

              <thead className="sticky top-0 z-20">
                <tr className="bg-[#F4F6F5]">

                  {/* MÉDICAMENT */}

                  <th
                    className="
                      w-[2%]
                      border-b border-[#DDE3E0]
                      px-5
                      py-3
                      text-left
                    "
                  >
                    <span
                      className="
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.1em]
                        text-[#68756F]
                      "
                    >
                      Médicament
                    </span>
                  </th>

                  {/* PRIX */}

                  <th
                    className="
                      w-[5%]
                      border-b border-[#DDE3E0]
                      px-4
                      py-3
                      text-right
                    "
                  >
                    <span
                      className="
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.1em]
                        text-[#68756F]
                      "
                    >
                      Prix unitaire
                    </span>
                  </th>

                  {/* STOCK */}

                  <th
                    className="
                      w-[8%]
                      border-b border-[#DDE3E0]
                      px-4
                      py-3
                      text-center
                    "
                  >
                    <span
                      className="
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.1em]
                        text-[#68756F]
                      "
                    >
                      Stock
                    </span>
                  </th>

                  {/* EXPIRATION */}

                  <th
                    className="
                      w-[8%]
                      border-b border-[#DDE3E0]
                      px-4
                      py-3
                      text-center
                    "
                  >
                    <span
                      className="
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.1em]
                        text-[#68756F]
                      "
                    >
                      Expiration
                    </span>
                  </th>

                  {/* ÉTAT */}

                  <th
                    className="
                      w-[8%]
                      border-b border-[#DDE3E0]
                      px-4
                      py-3
                      text-center
                    "
                  >
                    <span
                      className="
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.1em]
                        text-[#68756F]
                      "
                    >
                      État
                    </span>
                  </th>

                  {/* ACTIONS */}

                  <th
                    className="
                      w-[2%]
                      border-b border-[#DDE3E0]
                      px-5
                      py-3
                      text-right
                    "
                  >
                    <span
                      className="
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.1em]
                        text-[#68756F]
                      "
                    >
                      Actions
                    </span>
                  </th>

                </tr>
              </thead>

              {/* =================================================
                  CORPS
              ================================================== */}

              <tbody>
                {medicaments.map((medicament) => {
                  const stock = Number(
                    medicament.stock || 0
                  );

                  const lowStock =
                    stock > 0 && stock <= 10;

                  const outOfStock =
                    stock === 0;

                  const expiration =
                    getExpirationInfo(
                      medicament.date_expiration
                    );

                  return (
                    <tr
                      key={medicament.id}
                      className="
                        group
                        border-b
                        border-[#E8ECEA]
                        bg-white
                        transition-colors
                        duration-150
                        last:border-b-0
                        hover:bg-[#FAFBFA]
                      "
                    >

                      {/* =================================================
                          MÉDICAMENT
                      ================================================== */}

                      <td className="px-5 py-3">
                        <div
                          className="
                            flex
                            min-w-0
                            items-center
                            gap-3
                          "
                        >
                          <div
                            className="
                              relative
                              flex
                              h-9
                              w-9
                              shrink-0
                              items-center
                              justify-center
                              rounded-[8px]
                              border border-[#DDE3E0]
                              bg-[#F4F6F5]
                              text-[#356B5C]
                            "
                          >
                            <Package
                              className="h-[17px] w-[17px]"
                              strokeWidth={1.9}
                            />

                            <span
                              className={
                                outOfStock
                                  ? "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-white bg-[#A34A4A]"
                                  : lowStock
                                  ? "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-white bg-[#A47B42]"
                                  : "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-white bg-[#356B5C]"
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <p
                              className="
                                truncate
                                text-[10px]
                                font-bold
                                text-[#394842]
                              "
                              title={medicament.nom}
                            >
                              {medicament.nom}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* =================================================
                          PRIX
                      ================================================== */}

                      <td className="px-4 py-3 text-right">
                        <div
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                          "
                        >

                          <span
                            className="
                              text-[10px]
                              font-semibold
                              text-[#394842]
                            "
                          >
                            {formatMoney(
                              medicament.prix_unitaire
                            )}
                          </span>

                          <span
                            className="
                              text-[8px]
                              font-medium
                              text-[#87928E]
                            "
                          >
                            Ar
                          </span>
                        </div>
                      </td>

                      {/* =================================================
                          STOCK
                      ================================================== */}

                      <td className="px-4 py-3 text-center">
                        <div
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                          "
                        >
                          <PackagePlus
                            className={
                              outOfStock
                                ? "h-3.5 w-3.5 text-[#A34A4A]"
                                : lowStock
                                ? "h-3.5 w-3.5 text-[#A47B42]"
                                : "h-3.5 w-3.5 text-[#687D75]"
                            }
                            strokeWidth={1.8}
                          />

                          <span
                            className={
                              outOfStock
                                ? "text-[11px] font-bold text-[#A34A4A]"
                                : lowStock
                                ? "text-[11px] font-bold text-[#A47B42]"
                                : "text-[11px] font-bold text-[#394842]"
                            }
                          >
                            {stock}
                          </span>

                          <span
                            className="
                              text-[8px]
                              font-medium
                              text-[#87928E]
                            "
                          >
                            unité{stock > 1 ? "s" : ""}
                          </span>
                        </div>
                      </td>

                      {/* =================================================
                          DATE EXPIRATION
                      ================================================== */}

                      <td className="px-4 py-3 text-center">

                        {expiration.type === "none" && (
                          <div
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-[7px]
                              border border-[#DDE3E0]
                              bg-[#F7F8F7]
                              px-2.5
                              py-1.5
                              text-[8px]
                              font-semibold
                              text-[#87928E]
                            "
                          >
                            <CalendarDays
                              className="h-3 w-3"
                              strokeWidth={1.8}
                            />

                            Non renseignée
                          </div>
                        )}

                        {expiration.type === "valid" && (
                          <div
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-[7px]
                              border border-[#C9DCD4]
                              bg-[#F1F6F4]
                              px-2.5
                              py-1.5
                              text-[8px]
                              font-bold
                              text-[#356B5C]
                            "
                            title="Date d'expiration valide"
                          >
                            <CalendarDays
                              className="h-3 w-3"
                              strokeWidth={1.9}
                            />

                            {formatDate(
                              medicament.date_expiration
                            )}
                          </div>
                        )}

                        {expiration.type === "soon" && (
                          <div
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-[7px]
                              border border-[#E5D9C7]
                              bg-[#FAF7F1]
                              px-2.5
                              py-1.5
                              text-[8px]
                              font-bold
                              text-[#A47B42]
                            "
                            title="Ce médicament expire dans moins de 30 jours"
                          >
                            <AlertTriangle
                              className="h-3 w-3"
                              strokeWidth={2}
                            />

                            {formatDate(
                              medicament.date_expiration
                            )}
                          </div>
                        )}

                        {expiration.type === "expired" && (
                          <div
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-[7px]
                              border border-[#E7CFCF]
                              bg-[#FBF5F5]
                              px-2.5
                              py-1.5
                              text-[8px]
                              font-bold
                              text-[#A34A4A]
                            "
                            title="Ce médicament est expiré"
                          >
                            <AlertTriangle
                              className="h-3 w-3"
                              strokeWidth={2}
                            />

                            {formatDate(
                              medicament.date_expiration
                            )}
                          </div>
                        )}

                        {expiration.type === "invalid" && (
                          <div
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-[7px]
                              border border-[#E7CFCF]
                              bg-[#FBF5F5]
                              px-2.5
                              py-1.5
                              text-[8px]
                              font-bold
                              text-[#A34A4A]
                            "
                          >
                            <AlertTriangle
                              className="h-3 w-3"
                              strokeWidth={2}
                            />

                            Date invalide
                          </div>
                        )}

                      </td>

                      {/* =================================================
                          ÉTAT STOCK
                      ================================================== */}

                      <td className="px-4 py-3 text-center">

                        {outOfStock && (
                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-[7px]
                              border border-[#E7CFCF]
                              bg-[#FBF5F5]
                              px-2.5
                              py-1.5
                              text-[8px]
                              font-bold
                              text-[#A34A4A]
                            "
                          >
                            <AlertTriangle
                              className="h-3 w-3"
                              strokeWidth={2}
                            />

                            Rupture
                          </span>
                        )}

                        {!outOfStock &&
                          lowStock && (
                            <span
                              className="
                                inline-flex
                                items-center
                                gap-1.5
                                rounded-[7px]
                                border border-[#E5D9C7]
                                bg-[#FAF7F1]
                                px-2.5
                                py-1.5
                                text-[8px]
                                font-bold
                                text-[#A47B42]
                              "
                            >
                              <AlertTriangle
                                className="h-3 w-3"
                                strokeWidth={2}
                              />

                              Stock faible
                            </span>
                          )}

                        {!outOfStock &&
                          !lowStock && (
                            <span
                              className="
                                inline-flex
                                items-center
                                gap-1.5
                                rounded-[7px]
                                border border-[#C9DCD4]
                                bg-[#F1F6F4]
                                px-2.5
                                py-1.5
                                text-[8px]
                                font-bold
                                text-[#356B5C]
                              "
                            >
                              <CheckCircle2
                                className="h-3 w-3"
                                strokeWidth={2}
                              />

                              Disponible
                            </span>
                          )}

                      </td>

                      {/* =================================================
                          ACTIONS
                      ================================================== */}

                      <td className="px-5 py-3">

                        <div
                          className="
                            flex
                            items-center
                            justify-end
                            gap-1.5
                          "
                        >

                          {/* AJOUTER STOCK */}

                          <button
                            type="button"
                            onClick={() =>
                              onAddStock?.(medicament)
                            }
                            title={`Ajouter du stock à ${medicament.nom}`}
                            className="
                              inline-flex
                              h-8
                              items-center
                              gap-1.5
                              rounded-[7px]
                              border border-[#D6DEDA]
                              bg-white
                              px-2.5
                              text-[8px]
                              font-bold
                              text-[#596B65]
                              transition-colors
                              hover:border-[#BFCBC6]
                              hover:bg-[#F1F6F4]
                              hover:text-[#356B5C]
                              active:scale-95
                            "
                          >
                            <Plus
                              className="h-3.5 w-3.5"
                              strokeWidth={2.2}
                            />
                          </button>

                          {/* MODIFIER */}

                          <button
                            type="button"
                            onClick={() =>
                              onEditStock?.(medicament)
                            }
                            title={`Modifier le stock de ${medicament.nom}`}
                            className="
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-[7px]
                              border border-[#D6DEDA]
                              bg-white
                              text-[#687D75]
                              transition-colors
                              hover:border-[#BFCBC6]
                              hover:bg-[#F1F6F4]
                              hover:text-[#356B5C]
                              active:scale-95
                            "
                          >
                            <Pencil
                              className="h-3.5 w-3.5"
                              strokeWidth={1.9}
                            />
                          </button>

                          {/* SUPPRIMER */}

                          <button
                            type="button"
                            onClick={() =>
                              onDelete?.(medicament)
                            }
                            title={`Supprimer définitivement ${medicament.nom}`}
                            className="
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-[7px]
                              border border-[#E1D4D4]
                              bg-white
                              text-[#A34A4A]
                              transition-colors
                              hover:border-[#D5BDBD]
                              hover:bg-[#FBF5F5]
                              hover:text-[#963F3F]
                              active:scale-95
                            "
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              strokeWidth={1.9}
                            />
                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* =====================================================
              PIED DU TABLEAU
          ====================================================== */}

          <div
            className="
              flex
              flex-col
              gap-1.5
              border-t border-[#E8ECEA]
              bg-[#F4F6F5]
              px-4
              py-2.5
              sm:flex-row
              sm:items-center
              sm:justify-between
              sm:px-5
            "
          >

            <div
              className="
                flex
                items-center
                gap-1.5
              "
            >
              <Boxes
                className="h-3 w-3 text-[#687D75]"
                strokeWidth={1.8}
              />

              <span
                className="
                  text-[8px]
                  font-semibold
                  text-[#68756F]
                "
              >
                {medicaments.length} médicament
                {medicaments.length > 1
                  ? "s"
                  : ""}
              </span>
            </div>

            <span
              className="
                text-[8px]
                text-[#87928E]
              "
            >
              Faites défiler pour voir tous les médicaments
            </span>

          </div>
        </>
      )}
    </div>
  );
}
