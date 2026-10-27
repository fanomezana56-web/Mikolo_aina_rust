
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Pill,
  Users,
  Receipt,
  Calculator,
  PackageMinus,
  Settings,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  Archive,
  Package,
  HeartPulse,
  X,
  Stethoscope,
  Activity,
  CircleHelp,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const menu = [
  {
    label: "Accueil",
    path: "/",
    icon: LayoutDashboard,
    color: "#438B74",
  },
  {
    label: "Médicaments",
    path: "/medicaments",
    icon: Pill,
    color: "#5484B8",
    dropdown: "medicaments",
  },
  {
    label: "Patients",
    path: "/patients",
    icon: Users,
    color: "#9270B8",
  },
  {
    label: "Soins",
    path: "/Soins",
    icon: Stethoscope,
    color: "#4295A0",
  },
  {
    label: "Comptabilité",
    path: "/comptabilite",
    icon: Calculator,
    color: "#B78A43",
    dropdown: "comptabilite",
  },
  {
    label: "Sorties médicaments",
    path: "/sorties-medicaments",
    icon: PackageMinus,
    color: "#C17B58",
  },
  {
    label: "Dépenses",
    path: "/sorties",
    icon: Archive,
    color: "#B76F78",
  },
  {
    label: "Factures",
    path: "/factures",
    icon: Receipt,
    color: "#8170B4",
  },
];

const sousMenus = {
  medicaments: [
    {
      label: "Liste des médicaments",
      path: "/medicaments",
      icon: Pill,
      end: true,
    },
    {
      label: "Gestion du stock",
      path: "/stock",
      icon: Package,
      end: true,
    },
  ],
  comptabilite: [
    {
      label: "Nouvelle comptabilité",
      path: "/comptabilite",
      icon: Calculator,
      end: true,
    },
    {
      label: "Historique comptable",
      path: "/comptabilite/liste",
      icon: ClipboardList,
      end: true,
    },
  ],
};

export default function Sidebar({
  ouverte = true,
  onToggle,
  onNavigate,
  mobile = false,
}) {
  const location = useLocation();
  const menuOuvert = ouverte || mobile;

  const estDansMedicaments =
    location.pathname === "/medicaments" ||
    location.pathname.startsWith("/medicaments/") ||
    location.pathname === "/stock";

  const estDansComptabilite =
    location.pathname === "/comptabilite" ||
    location.pathname.startsWith("/comptabilite/");

  const [medicamentsOuvert, setMedicamentsOuvert] =
    useState(estDansMedicaments);

  const [comptabiliteOuverte, setComptabiliteOuverte] =
    useState(estDansComptabilite);

  useEffect(() => {
    if (estDansMedicaments) setMedicamentsOuvert(true);
    if (estDansComptabilite) setComptabiliteOuverte(true);
  }, [
    location.pathname,
    estDansMedicaments,
    estDansComptabilite,
  ]);

  const etatSousMenus = {
    medicaments: {
      ouvert: medicamentsOuvert,
      setOuvert: setMedicamentsOuvert,
      actif: estDansMedicaments,
    },
    comptabilite: {
      ouvert: comptabiliteOuverte,
      setOuvert: setComptabiliteOuverte,
      actif: estDansComptabilite,
    },
  };

  const basculerSousMenu = (type) => {
    if (!menuOuvert) {
      onToggle?.();
      etatSousMenus[type].setOuvert(true);
      return;
    }

    etatSousMenus[type].setOuvert((ancien) => !ancien);
  };

  const fermerNavigationMobile = () => {
    onNavigate?.();
  };

  return (
    <aside
      className={`ak-sidebar ${mobile ? "ak-sidebar-mobile" : ""}`}
      aria-label="Navigation principale"
    >
      <style>{`
        .ak-sidebar {
          position: relative;
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          min-width: 0;
          min-height: 0;
          max-height: 100%;
          overflow: hidden;
          color: #344D3F;
          background: #FAFCFA;
          font-family: "DM Sans", "Segoe UI", Arial, sans-serif;
        }

        .ak-sidebar,
        .ak-sidebar * {
          box-sizing: border-box;
        }

        .ak-sidebar-brand {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          min-width: 0;
          min-height: 57px;
          padding: 8px 10px;
          border-bottom: 1px solid #E7EEE8;
          background: linear-gradient(120deg, #FFFFFF, #F5FAF6);
        }

        .ak-sidebar-logo {
          position: relative;
          display: flex;
          flex: 0 0 33px;
          width: 33px;
          height: 33px;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: #FFFFFF;
          background: linear-gradient(145deg, #57977D, #2E6851);
          box-shadow: 0 3px 8px rgba(46, 104, 81, .16);
        }

        .ak-sidebar-brand-text {
          flex: 1;
          min-width: 0;
          margin-left: 9px;
        }

        .ak-sidebar-brand-title {
          overflow: hidden;
          margin: 0;
          color: #294B3B;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .07em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ak-sidebar-brand-subtitle {
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 4px 0 0;
          color: #809187;
          font-size: 9px;
        }

        .ak-sidebar-collapse {
          display: flex;
          flex: 0 0 25px;
          width: 25px;
          height: 25px;
          align-items: center;
          justify-content: center;
          margin-left: 3px;
          border: 1px solid transparent;
          border-radius: 7px;
          color: #819187;
          background: transparent;
          cursor: pointer;
        }

        .ak-sidebar-collapse:hover {
          border-color: #DCE8DF;
          color: #32694F;
          background: #F0F7F1;
        }

        .ak-sidebar-scroll {
          flex: 1 1 0%;
          min-width: 0;
          min-height: 0;
          padding: 10px 8px;
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior-y: contain;
          scrollbar-width: thin;
          scrollbar-color: #C8D9CD transparent;
          scrollbar-gutter: stable;
          -webkit-overflow-scrolling: touch;
        }

        .ak-sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }

        .ak-sidebar-scroll::-webkit-scrollbar-thumb {
          border-radius: 20px;
          background: #C8D9CD;
        }

        .ak-sidebar-section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
          margin: 0 2px 8px;
          padding: 0 5px;
          color: #93A198;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .ak-sidebar-count {
          display: inline-flex;
          min-width: 19px;
          height: 17px;
          align-items: center;
          justify-content: center;
          border: 1px solid #E2EBE4;
          border-radius: 5px;
          color: #73877A;
          background: #FFFFFF;
          font-size: 8px;
        }

        .ak-sidebar-menu-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .ak-sidebar-item {
          position: relative;
          display: flex;
          width: 100%;
          min-width: 0;
          min-height: 35px;
          align-items: center;
          gap: 8px;
          padding: 4px 7px;
          border: 1px solid transparent;
          border-radius: 8px;
          color: #687A6E;
          background: transparent;
          text-align: left;
          text-decoration: none;
          cursor: pointer;
          transition: background .16s, border-color .16s, color .16s;
        }

        .ak-sidebar-item:hover {
          border-color: #E6EEE7;
          color: #355E47;
          background: #FFFFFF;
        }

        .ak-sidebar-item.is-active {
          border-color: #D7E8DC;
          color: #2F6B4F;
          background: #EAF4ED;
        }

        .ak-sidebar-item.is-active::before {
          position: absolute;
          top: 7px;
          bottom: 7px;
          left: -1px;
          width: 3px;
          border-radius: 0 4px 4px 0;
          background: #438B74;
          content: "";
        }

        .ak-sidebar-icon {
          display: flex;
          flex: 0 0 25px;
          width: 25px;
          height: 25px;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          color: #839389;
        }

        .ak-sidebar-item:hover .ak-sidebar-icon {
          color: var(--item-color, #438B74);
          background: #F0F6F1;
        }

        .ak-sidebar-item.is-active .ak-sidebar-icon {
          color: var(--item-color, #438B74);
          background: #FFFFFF;
        }

        .ak-sidebar-label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          font-size: 10px;
          font-weight: 550;
          line-height: 1.4;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ak-sidebar-item.is-active .ak-sidebar-label {
          font-weight: 750;
        }

        .ak-sidebar-arrow {
          flex: 0 0 auto;
          color: #93A197;
          transition: transform .18s ease;
        }

        .ak-sidebar-arrow.is-open {
          transform: rotate(180deg);
        }

        .ak-sidebar-submenu {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin: 4px 0 5px 19px;
          padding: 1px 0 1px 9px;
          border-left: 1px solid #DCE8DF;
        }

        .ak-sidebar-subitem {
          display: flex;
          min-width: 0;
          min-height: 31px;
          align-items: center;
          gap: 7px;
          padding: 5px 7px;
          border: 1px solid transparent;
          border-radius: 7px;
          color: #78877D;
          text-decoration: none;
          transition: all .16s ease;
        }

        .ak-sidebar-subitem:hover {
          border-color: #E5EDE6;
          color: #3B6D51;
          background: #FFFFFF;
        }

        .ak-sidebar-subitem.is-active {
          border-color: #DCE9DE;
          color: #356B50;
          background: #FFFFFF;
        }

        .ak-sidebar-subitem-icon {
          display: flex;
          flex: 0 0 21px;
          width: 21px;
          height: 21px;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }

        .ak-sidebar-subitem.is-active .ak-sidebar-subitem-icon {
          color: #438B74;
          background: #EAF4ED;
        }

        .ak-sidebar-subitem-label {
          flex: 1;
          min-width: 0;
          font-size: 9px;
          font-weight: 550;
          line-height: 1.45;
        }

        .ak-sidebar-active-dot {
          flex: 0 0 5px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #438B74;
        }

        .ak-sidebar-tooltip {
          position: absolute;
          top: 50%;
          right: calc(100% + 9px);
          z-index: 100;
          width: max-content;
          max-width: 210px;
          padding: 7px 10px;
          transform: translateY(-50%);
          border: 1px solid #DDE8E0;
          border-radius: 7px;
          color: #355644;
          background: #FFFFFF;
          box-shadow: 0 5px 18px rgba(33, 57, 41, .12);
          font-size: 10px;
          font-weight: 700;
          white-space: normal;
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transition: opacity .15s ease;
        }

        .ak-sidebar-item:hover .ak-sidebar-tooltip,
        .ak-sidebar-item:focus-visible .ak-sidebar-tooltip {
          visibility: visible;
          opacity: 1;
        }

        .ak-sidebar-footer {
          position: relative;
          z-index: 2;
          flex: 0 0 auto;
          min-width: 0;
          padding: 7px 8px;
          border-top: 1px solid #E5ECE6;
          background: #F7FAF7;
        }

        .ak-sidebar-footer-button {
          display: flex;
          width: 100%;
          min-width: 0;
          min-height: 31px;
          align-items: center;
          gap: 8px;
          padding: 3px 7px;
          border: 1px solid transparent;
          border-radius: 8px;
          color: #708176;
          background: transparent;
          text-align: left;
          cursor: pointer;
        }

        .ak-sidebar-footer-button:hover {
          border-color: #E0EAE2;
          color: #356B50;
          background: #FFFFFF;
        }

        .ak-sidebar-footer-icon {
          display: flex;
          flex: 0 0 25px;
          width: 25px;
          height: 25px;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
        }

        .ak-sidebar-profile {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
          padding: 6px;
          border: 1px solid #E0EAE2;
          border-radius: 9px;
          background: #FFFFFF;
        }

        .ak-sidebar-avatar {
          position: relative;
          display: flex;
          flex: 0 0 29px;
          width: 29px;
          height: 29px;
          align-items: center;
          justify-content: center;
          border: 1px solid #CFE3D5;
          border-radius: 9px;
          color: #397653;
          background: linear-gradient(145deg, #E8F4EB, #D5E9DC);
          font-size: 10px;
          font-weight: 900;
        }

        .ak-sidebar-status {
          position: absolute;
          right: -2px;
          bottom: -2px;
          width: 9px;
          height: 9px;
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          background: #55A477;
        }

        .ak-sidebar-profile-info {
          flex: 1;
          min-width: 0;
        }

        .ak-sidebar-profile-name {
          overflow: hidden;
          margin: 0;
          color: #3A5142;
          font-size: 9px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ak-sidebar-profile-status {
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 3px 0 0;
          color: #8A998E;
          font-size: 8px;
        }

        .ak-sidebar-status-dot {
          flex: 0 0 5px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #55A477;
        }

        .ak-sidebar-footer-note {
          margin: 6px 0 0;
          color: #A0ADA4;
          font-size: 7px;
          font-weight: 650;
          letter-spacing: .06em;
          text-align: center;
        }

        @media (max-height: 560px) {
          .ak-sidebar-brand {
            min-height: 45px;
            padding-top: 5px;
            padding-bottom: 5px;
          }

          .ak-sidebar-logo {
            flex-basis: 28px;
            width: 28px;
            height: 28px;
          }

          .ak-sidebar-scroll {
            padding-top: 5px;
            padding-bottom: 5px;
          }

          .ak-sidebar-item {
            min-height: 31px;
          }

          .ak-sidebar-subitem {
            min-height: 27px;
          }

          .ak-sidebar-footer {
            padding: 4px 7px;
          }

          .ak-sidebar-profile {
            margin-top: 3px;
            padding: 4px;
          }

          .ak-sidebar-footer-note {
            display: none;
          }
        }

        @media (max-height: 390px) {
          .ak-sidebar-brand-subtitle {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ak-sidebar *,
          .ak-sidebar *::before,
          .ak-sidebar *::after {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>

      <div className="ak-sidebar-brand">
        <div className="ak-sidebar-logo">
          <HeartPulse size={18} strokeWidth={2.1} />
        </div>

        {menuOuvert && (
          <div className="ak-sidebar-brand-text">
            <p className="ak-sidebar-brand-title">
              MIKOLO AINA
            </p>

            <p className="ak-sidebar-brand-subtitle">
              <Activity size={10} />
              Centre de santé
            </p>
          </div>
        )}

        {!mobile && menuOuvert && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Réduire la navigation"
            title="Réduire la navigation"
            className="ak-sidebar-collapse"
          >
            <ChevronRight size={15} />
          </button>
        )}

        {!mobile && !menuOuvert && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Développer la navigation"
            title="Développer la navigation"
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
          />
        )}

        {mobile && (
          <button
            type="button"
            onClick={fermerNavigationMobile}
            aria-label="Fermer la navigation"
            className="ak-sidebar-collapse ml-auto"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <nav className="ak-sidebar-scroll">
        {menuOuvert && (
          <div className="ak-sidebar-section-title">
            <span>Navigation</span>
            <span className="ak-sidebar-count">{menu.length}</span>
          </div>
        )}

        <div className="ak-sidebar-menu-list">
          {menu.map((item) => {
            const Icon = item.icon;

            if (item.dropdown) {
              const type = item.dropdown;
              const etat = etatSousMenus[type];

              return (
                <div key={item.path}>
                  <button
                    type="button"
                    onClick={() => basculerSousMenu(type)}
                    aria-expanded={menuOuvert && etat.ouvert}
                    aria-label={item.label}
                    title={!menuOuvert ? item.label : undefined}
                    className={`ak-sidebar-item ${
                      etat.actif ? "is-active" : ""
                    }`}
                    style={{ "--item-color": item.color }}
                  >
                    <span className="ak-sidebar-icon">
                      <Icon size={16} strokeWidth={1.9} />
                    </span>

                    {menuOuvert && (
                      <>
                        <span className="ak-sidebar-label">
                          {item.label}
                        </span>

                        <ChevronDown
                          size={13}
                          className={`ak-sidebar-arrow ${
                            etat.ouvert ? "is-open" : ""
                          }`}
                        />
                      </>
                    )}

                    {!menuOuvert && (
                      <span className="ak-sidebar-tooltip">
                        {item.label}
                      </span>
                    )}
                  </button>

                  {menuOuvert && etat.ouvert && (
                    <div className="ak-sidebar-submenu">
                      {sousMenus[type].map((sousItem) => {
                        const SousIcon = sousItem.icon;

                        return (
                          <NavLink
                            key={sousItem.path}
                            to={sousItem.path}
                            end={sousItem.end}
                            onClick={fermerNavigationMobile}
                            className={({ isActive }) =>
                              `ak-sidebar-subitem ${
                                isActive ? "is-active" : ""
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <span className="ak-sidebar-subitem-icon">
                                  <SousIcon size={13} />
                                </span>

                                <span className="ak-sidebar-subitem-label">
                                  {sousItem.label}
                                </span>

                                {isActive && (
                                  <span className="ak-sidebar-active-dot" />
                                )}
                              </>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={fermerNavigationMobile}
                title={!menuOuvert ? item.label : undefined}
                className={({ isActive }) =>
                  `ak-sidebar-item ${
                    isActive ? "is-active" : ""
                  }`
                }
                style={{ "--item-color": item.color }}
              >
                {({ isActive }) => (
                  <>
                    <span className="ak-sidebar-icon">
                      <Icon size={16} strokeWidth={1.9} />
                    </span>

                    {menuOuvert && (
                      <>
                        <span className="ak-sidebar-label">
                          {item.label}
                        </span>

                        {isActive && (
                          <span
                            className="ak-sidebar-active-dot"
                            style={{ background: item.color }}
                          />
                        )}
                      </>
                    )}

                    {!menuOuvert && (
                      <span className="ak-sidebar-tooltip">
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {menuOuvert && (
          <div className="mt-4 border-t border-dashed border-[#E2EAE3] pt-3">
            <div className="ak-sidebar-section-title">
              <span>Centre de santé</span>
            </div>

            <div className="mx-1 rounded-lg border border-[#E0EBE2] bg-white p-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF4ED] text-[#438B74]">
                  <HeartPulse size={15} />
                </span>

                <div className="min-w-0">
                  <p className="m-0 text-[9px] font-bold text-[#3A5D47]">
                    Espace de gestion
                  </p>

                  <p className="mt-1 mb-0 text-[8px] leading-3 text-[#87968B]">
                    Patients, soins et stocks
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

    </aside>
  );
}
