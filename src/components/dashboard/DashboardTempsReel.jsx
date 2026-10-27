import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, Banknote,
  CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, Clock3,
  Download, HeartPulse, Package, PackageCheck, Pill, RefreshCw,
  Search, ShieldCheck, Sparkles, TrendingUp, Users, Wallet, X,
  Boxes, CheckCircle2, CalendarClock, Stethoscope,
} from "lucide-react";

/* =========================================================
   AINA KOLOINA — DASHBOARD PROFESSIONNEL
   React + Tauri + PostgreSQL
========================================================= */

const C = {
  green: "#438B74",
  dark: "#28594B",
  deep: "#1D4035",
  light: "#E7F2EB",
  pale: "#F4F8F5",
  orange: "#D89A46",
  red: "#D76D68",
  blue: "#6C91C7",
  purple: "#9180C5",
  text: "#263D32",
  muted: "#7B8B80",
  border: "#E4EBE5",
  white: "#FFFFFF",
};

const PERIODS = [
  { label: "7 jours", value: 7 },
  { label: "30 jours", value: 30 },
  { label: "90 jours", value: 90 },
];

const safeArray = (value) => Array.isArray(value) ? value : [];

function firstValue(object, keys, fallback = null) {
  if (!object) return fallback;

  for (const key of keys) {
    const value = object[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

/* Conversion des nombres et montants PostgreSQL */
function toAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value === null || value === undefined || value === "") return 0;

  let text = String(value)
    .replace(/\s/g, "")
    .replace(/Ar/gi, "")
    .replace(/[^\d,.-]/g, "");

  if (!text) return 0;

  // Accepte notamment 12500.50 et 12500,50.
  // Les montants bruts provenant de PostgreSQL sont préférables.
  if (text.includes(",") && text.includes(".")) {
    if (text.lastIndexOf(",") > text.lastIndexOf(".")) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }

  const amount = Number(text);
  return Number.isFinite(amount) ? amount : 0;
}

const money = (value) =>
  new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(toAmount(value)) + " Ar";

const number = (value) =>
  new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(toAmount(value));

function getAmount(item) {
  return toAmount(firstValue(item, [
    "montant_total",
    "montant",
    "total",
    "prix_total",
    "montant_sortie",
    "total_sortie",
  ], 0));
}

/*
 * Comptabilité :
 * priorité au total général réellement enregistré.
 * Si absent, on additionne les sous-totaux disponibles.
 */
function getComptabiliteAmount(item) {
  if (!item) return 0;

  const totalGeneral = firstValue(item, [
    "total_general",
    "montant_total",
    "total_comptabilite",
    "montant_comptabilite",
  ]);

  if (totalGeneral !== null) {
    return toAmount(totalGeneral);
  }

  const totalMedicaments = firstValue(item, [
    "total_medicaments",
    "montant_medicaments",
    "prix_medicaments",
    "sous_total_medicaments",
  ]);

  const totalSoins = toAmount(firstValue(item, [
    "montant_soins",
    "prix_soins",
    "total_soins",
    "soins_montant",
    "cout_soins",
  ], 0));

  const totalConsultation = toAmount(firstValue(item, [
    "montant_consultation",
    "prix_consultation",
    "consultation_montant",
  ], 0));

  const totalHospitalisation = toAmount(firstValue(item, [
    "montant_hospitalisation",
    "prix_hospitalisation",
    "total_hospitalisation",
  ], 0));

  if (totalMedicaments !== null) {
    return toAmount(totalMedicaments)
      + totalSoins
      + totalConsultation
      + totalHospitalisation;
  }

  const lignes = safeArray(firstValue(item, [
    "lignes_medicaments",
    "lignesMedicaments",
    "medicaments",
    "lignes",
  ], []));

  const totalLignes = lignes.reduce((sum, ligne) => {
    const sousTotal = firstValue(ligne, [
      "montant_total",
      "sous_total",
      "prix_total",
      "total",
      "montant_ligne",
    ]);

    if (sousTotal !== null) return sum + toAmount(sousTotal);

    const quantite = toAmount(firstValue(ligne, [
      "quantite",
      "quantité",
    ], 0));

    const prix = toAmount(firstValue(ligne, [
      "prix_unitaire",
      "prix",
      "prix_vente",
    ], 0));

    return sum + quantite * prix;
  }, 0);

  return totalLignes
    + totalSoins
    + totalConsultation
    + totalHospitalisation;
}

function getStock(item) {
  return toAmount(firstValue(item, [
    "stock",
    "quantite_stock",
    "quantite_disponible",
    "quantite",
  ], 0));
}

function getDate(item, keys) {
  const raw = firstValue(item, keys);
  if (!raw) return null;

  const date = raw instanceof Date
    ? new Date(raw)
    : new Date(
        /^\d{4}-\d{2}-\d{2}$/.test(String(raw))
          ? `${raw}T12:00:00`
          : raw
      );

  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function sameDay(a, b) {
  return !!a && !!b && dateKey(a) === dateKey(b);
}

function formatShortDate(date) {
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function formatLongDate(date) {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getPatientName(item) {
  const prenom = firstValue(item, [
    "patient_prenom", "prenom_patient", "prenom",
  ], "");

  const nom = firstValue(item, [
    "patient_nom", "nom_patient", "nom",
  ], "");

  return `${prenom} ${nom}`.trim() || "Patient non renseigné";
}

function getMedicationName(item) {
  return String(firstValue(item, [
    "nom", "nom_medicament", "libelle",
  ], "Médicament"));
}

function getExpiration(item) {
  return getDate(item, ["date_expiration", "dateExpiration"]);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/* =========================================================
   COMPTEUR ANIMÉ
========================================================= */

function AnimatedNumber({ value }) {
  const target = toAmount(value);
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const initial = display;
    const duration = 650;

    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplay(initial + (target - initial) * eased);

      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
    // La valeur affichée évolue quand le montant cible change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return <>{number(display)}</>;
}

/* =========================================================
   MINI GRAPHIQUE SVG
========================================================= */

function Sparkline({ values = [], color = C.green }) {
  const valid = values.map(Number).filter(Number.isFinite);
  const width = 130;
  const height = 42;
  const pad = 4;

  if (valid.length < 2) {
    return (
      <div className="ak-spark-empty">
        <Activity size={14} />
        <span>Évolution</span>
      </div>
    );
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;

  const points = valid.map((value, index) => ({
    x: pad + index * (width - 2 * pad) / (valid.length - 1),
    y: height - pad - ((value - min) / range) * (height - 2 * pad),
  }));

  const line = points.map((point, index) =>
    `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
  ).join(" ");

  const area = `${line} L ${points.at(-1).x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg className="ak-sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={area} fill={color} opacity=".12" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points.at(-1).x}
        cy={points.at(-1).y}
        r="3"
        fill={color}
      />
    </svg>
  );
}

/* =========================================================
   GRAPHIQUE FINANCIER SVG
========================================================= */

function FinancialChart({ data }) {
  const [hovered, setHovered] = useState(null);

  if (!data.length) {
    return <EmptyState message="Aucune donnée pour cette période." />;
  }

  const width = 760;
  const height = 245;
  const left = 48;
  const right = 15;
  const top = 18;
  const bottom = 33;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const maxValue = Math.max(
    1,
    ...data.map((point) => Math.max(point.entrees, point.sorties))
  );

  const x = (index) => left + (
    data.length <= 1
      ? chartWidth / 2
      : index / (data.length - 1) * chartWidth
  );

  const y = (value) => top + chartHeight - value / maxValue * chartHeight;

  const path = (key) => data.map((point, index) =>
    `${index === 0 ? "M" : "L"} ${x(index)} ${y(point[key])}`
  ).join(" ");

  const area = (key) =>
    `${path(key)} L ${x(data.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;

  return (
    <div className="ak-chart-svg-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="ak-financial-svg"
        role="img"
        aria-label="Évolution des recettes de comptabilité et des dépenses"
      >
        <defs>
          <linearGradient id="akIncomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.green} stopOpacity=".25" />
            <stop offset="100%" stopColor={C.green} stopOpacity=".01" />
          </linearGradient>
          <linearGradient id="akExpenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.orange} stopOpacity=".20" />
            <stop offset="100%" stopColor={C.orange} stopOpacity=".01" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const yy = y(maxValue * fraction);
          const value = maxValue * fraction;

          return (
            <g key={fraction}>
              <line
                x1={left}
                y1={yy}
                x2={width - right}
                y2={yy}
                stroke={C.border}
                strokeDasharray="4 5"
              />
              <text
                x={left - 8}
                y={yy + 4}
                fontSize="10"
                fill={C.muted}
                textAnchor="end"
              >
                {value >= 1000000
                  ? `${(value / 1000000).toFixed(1)}M`
                  : value >= 1000
                    ? `${Math.round(value / 1000)}k`
                    : Math.round(value)}
              </text>
            </g>
          );
        })}

        <path d={area("entrees")} fill="url(#akIncomeGradient)" />
        <path d={area("sorties")} fill="url(#akExpenseGradient)" />

        <path
          d={path("entrees")}
          fill="none"
          stroke={C.green}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={path("sorties")}
          fill="none"
          stroke={C.orange}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((point, index) => (
          <g key={point.key}>
            <rect
              x={x(index) - Math.max(10, chartWidth / data.length / 2)}
              y={top}
              width={Math.max(20, chartWidth / data.length)}
              height={chartHeight}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            />

            <circle
              cx={x(index)}
              cy={y(point.entrees)}
              r={hovered === index ? 5 : 3}
              fill={C.green}
              stroke="#fff"
              strokeWidth="1.5"
              pointerEvents="none"
            />
            <circle
              cx={x(index)}
              cy={y(point.sorties)}
              r={hovered === index ? 5 : 3}
              fill={C.orange}
              stroke="#fff"
              strokeWidth="1.5"
              pointerEvents="none"
            />

            {(index === 0 ||
              index === data.length - 1 ||
              index % Math.ceil(data.length / 6) === 0) && (
              <text
                x={x(index)}
                y={height - 10}
                fontSize="10"
                fill={C.muted}
                textAnchor="middle"
              >
                {point.label}
              </text>
            )}
          </g>
        ))}

        {hovered !== null && data[hovered] && (
          <g pointerEvents="none">
            <rect
              x={clamp(x(hovered) - 90, left, width - 190)}
              y={top + 3}
              width="180"
              height="52"
              rx="9"
              fill={C.deep}
            />
            <text
              x={clamp(x(hovered) - 78, left + 12, width - 175)}
              y={top + 20}
              fill="#fff"
              fontSize="11"
            >
              {data[hovered].label}
            </text>
            <text
              x={clamp(x(hovered) - 78, left + 12, width - 175)}
              y={top + 37}
              fill="#fff"
              fontSize="10"
            >
              Entrées : {money(data[hovered].entrees)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/* =========================================================
   GRAPHIQUE EN ANNEAU
========================================================= */

function DonutChart({ segments, total }) {
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const valid = segments.filter((segment) => segment.value > 0);
  const sum = valid.reduce((totalValue, segment) => totalValue + segment.value, 0);
  let offset = 0;

  return (
    <div className="ak-donut-layout">
      <div className="ak-donut-graphic">
        <svg viewBox="0 0 180 180" role="img" aria-label="Répartition des opérations">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#EDF2EE"
            strokeWidth="17"
          />

          {valid.map((segment) => {
            const dash = circumference * segment.value / (sum || 1);
            const currentOffset = offset;
            offset += dash;

            return (
              <circle
                key={segment.label}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="17"
                strokeDasharray={`${Math.max(0, dash - 2)} ${circumference}`}
                strokeDashoffset={-currentOffset}
                transform="rotate(-90 90 90)"
                strokeLinecap="round"
                className="ak-donut-segment"
              />
            );
          })}

          <text
            x="90"
            y="85"
            textAnchor="middle"
            fill={C.text}
            fontSize="24"
            fontWeight="800"
          >
            {number(total)}
          </text>
          <text
            x="90"
            y="105"
            textAnchor="middle"
            fill={C.muted}
            fontSize="10"
          >
            opérations
          </text>
        </svg>
      </div>

      <div className="ak-donut-legend">
        {segments.map((segment) => (
          <div className="ak-legend-row" key={segment.label}>
            <span className="ak-legend-dot" style={{ background: segment.color }} />
            <span className="ak-legend-label">{segment.label}</span>
            <strong>{number(segment.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   COMPOSANTS D'INTERFACE
========================================================= */

function EmptyState({ message }) {
  return (
    <div className="ak-empty">
      <div className="ak-empty-icon"><Activity size={21} /></div>
      <span>{message}</span>
    </div>
  );
}

function Panel({ title, subtitle, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`ak-panel ${className}`}>
      <div className="ak-panel-heading">
        <div className="ak-panel-title-group">
          {Icon && <div className="ak-panel-icon"><Icon size={18} /></div>}
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function KpiCard({ title, value, subtitle, icon: Icon, color, values, suffix = "" }) {
  return (
    <article className="ak-kpi-card">
      <div className="ak-kpi-top">
        <div className="ak-kpi-icon" style={{ color, background: `${color}16` }}>
          <Icon size={20} strokeWidth={2} />
        </div>
        <Sparkline values={values} color={color} />
      </div>

      <div className="ak-kpi-title">{title}</div>

      <div className="ak-kpi-value">
        {typeof value === "number"
          ? <><AnimatedNumber value={value} />{suffix}</>
          : value}
      </div>

      <div className="ak-kpi-footer">
        <span>{subtitle}</span>
        <span className="ak-kpi-arrow"><ArrowUpRight size={15} /></span>
      </div>
    </article>
  );
}

/* =========================================================
   DASHBOARD PRINCIPAL
========================================================= */

export default function DashboardTempsReel() {
  const [solde, setSolde] = useState(0);
  const [medicaments, setMedicaments] = useState([]);
  const [comptabilites, setComptabilites] = useState([]);
  const [sorties, setSorties] = useState([]);
  const [factures, setFactures] = useState([]);

  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState("");
  const [derniereMaj, setDerniereMaj] = useState(null);

  const [periode, setPeriode] = useState(30);
  const [moisCalendrier, setMoisCalendrier] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [jourSelectionne, setJourSelectionne] = useState(() => new Date());
  const [rechercheActivite, setRechercheActivite] = useState("");
  const [filtreActivite, setFiltreActivite] = useState("tout");
  const [voirToutesLesAlertes, setVoirToutesLesAlertes] = useState(false);

  const refreshInProgress = useRef(false);
  const mounted = useRef(false);

  /* Chargement des données */
  const actualiser = useCallback(async (silencieux = false) => {
    if (refreshInProgress.current) return;

    refreshInProgress.current = true;

    if (silencieux) setActualisation(true);
    else setChargement(true);

    const tasks = [
      ["solde", () => invoke("obtenir_solde_centre")],
      ["medicaments", () => invoke("obtenir_medicaments")],
      ["comptabilites", () => invoke("obtenir_comptabilites")],
      ["sorties", () => invoke("obtenir_sorties_diverses")],
      ["factures", () => invoke("obtenir_factures")],
    ];

    try {
      const results = await Promise.allSettled(
        tasks.map(([, request]) => request())
      );

      if (!mounted.current) return;

      let failureCount = 0;

      results.forEach((result, index) => {
        const key = tasks[index][0];

        if (result.status !== "fulfilled") {
          failureCount += 1;
          console.error(`Erreur de chargement (${key}) :`, result.reason);
          return;
        }

        const value = result.value;

        switch (key) {
          case "solde": {
            const raw = typeof value === "number"
              ? value
              : firstValue(value, [
                  "solde_centre", "solde", "montant_total", "capital", "montant",
                ], 0);

            const amount = toAmount(raw);
            if (Number.isFinite(amount)) setSolde(amount);
            break;
          }
          case "medicaments":
            setMedicaments(safeArray(value));
            break;
          case "comptabilites":
            setComptabilites(safeArray(value));
            break;
          case "sorties":
            setSorties(safeArray(value));
            break;
          case "factures":
            setFactures(safeArray(value));
            break;
          default:
            break;
        }
      });

      setErreur(
        failureCount
          ? `${failureCount} source(s) de données n'ont pas pu être actualisées. Les autres sections restent disponibles.`
          : ""
      );

      setDerniereMaj(new Date());
    } catch (error) {
      console.error("Erreur d'actualisation :", error);
      if (mounted.current) setErreur("Impossible d'actualiser les données.");
    } finally {
      refreshInProgress.current = false;

      if (mounted.current) {
        setChargement(false);
        setActualisation(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    actualiser(false);

    const interval = window.setInterval(() => actualiser(true), 60000);
    let active = true;
    const listeners = [];

    [
      "solde-centre-change",
      "aina-koloina-refresh",
      "aina-koloina-data-change",
    ].forEach((eventName) => {
      listeners.push(
        listen(eventName, () => {
          if (active) actualiser(true);
        })
      );
    });

    const onWindowChange = () => actualiser(true);

    window.addEventListener("aina-koloina-data-change", onWindowChange);
    window.addEventListener("solde-centre-change", onWindowChange);

    return () => {
      active = false;
      mounted.current = false;
      window.clearInterval(interval);

      window.removeEventListener("aina-koloina-data-change", onWindowChange);
      window.removeEventListener("solde-centre-change", onWindowChange);

      listeners.forEach((promise) => {
        promise.then((unlisten) => unlisten()).catch(() => {});
      });
    };
  }, [actualiser]);

  /* Activités normalisées */
  const activites = useMemo(() => {
    const items = [];

    comptabilites.forEach((item, index) => {
      items.push({
        id: `comptabilite-${item.id ?? index}`,
        type: "comptabilite",
        label: "Comptabilité",
        description: getPatientName(item),
        montant: getComptabiliteAmount(item),
        date: getDate(item, [
          "date_comptabilite", "created_at", "date_creation", "date",
        ]),
        original: item,
        color: C.green,
        icon: CircleDollarSign,
      });
    });

    sorties.forEach((item, index) => {
      items.push({
        id: `sortie-${item.id ?? index}`,
        type: "sortie",
        label: "Sortie diverse",
        description: String(firstValue(item, [
          "motif", "description", "libelle", "nom",
        ], "Dépense")),
        montant: getAmount(item),
        date: getDate(item, [
          "date_sortie", "created_at", "date_creation", "date",
        ]),
        original: item,
        color: C.orange,
        icon: ArrowDownRight,
      });
    });

    factures.forEach((item, index) => {
      items.push({
        id: `facture-${item.id ?? index}`,
        type: "facture",
        label: "Facture",
        description: getPatientName(item),
        montant: getAmount(item),
        date: getDate(item, [
          "date_facture", "created_at", "date_creation", "date",
        ]),
        original: item,
        color: C.blue,
        icon: Banknote,
      });
    });

    return items
      .filter((item) => item.date)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [comptabilites, sorties, factures]);

  const maintenant = useMemo(() => new Date(), [derniereMaj]);

  const debutPeriode = useMemo(() => {
    const date = new Date(maintenant);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - periode + 1);
    return date;
  }, [maintenant, periode]);

  const activitesPeriode = useMemo(() => activites.filter(
    (item) => item.date >= debutPeriode && item.date <= maintenant
  ), [activites, debutPeriode, maintenant]);

  const totalComptabilites = useMemo(
    () => comptabilites.reduce((sum, item) => sum + getComptabiliteAmount(item), 0),
    [comptabilites]
  );

  const totalSorties = useMemo(
    () => sorties.reduce((sum, item) => sum + getAmount(item), 0),
    [sorties]
  );

  // Les factures sont visibles, mais ne sont pas ajoutées aux recettes.
  const totalFactures = useMemo(
    () => factures.reduce((sum, item) => sum + getAmount(item), 0),
    [factures]
  );

  const stockFaible = useMemo(
    () => medicaments.filter((item) => getStock(item) > 0 && getStock(item) <= 10),
    [medicaments]
  );

  const stockRupture = useMemo(
    () => medicaments.filter((item) => getStock(item) <= 0),
    [medicaments]
  );

  const stockDisponible = useMemo(
    () => medicaments.filter((item) => getStock(item) > 10),
    [medicaments]
  );

  const valeurStock = useMemo(() => medicaments.reduce((sum, item) => {
    const quantite = getStock(item);
    const prix = toAmount(firstValue(item, [
      "prix_unitaire", "prix", "prix_achat",
    ], 0));
    return sum + quantite * prix;
  }, 0), [medicaments]);

  const alertesExpiration = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const limite = new Date(today);
    limite.setDate(limite.getDate() + 60);

    return medicaments
      .map((item) => ({ item, date: getExpiration(item) }))
      .filter(({ date }) => date && date <= limite)
      .sort((a, b) => a.date - b.date);
  }, [medicaments]);

  /* Séries chronologiques : factures exclues des flux financiers */
  const serieFinanciere = useMemo(() => {
    const daily = periode <= 30;
    const buckets = new Map();

    for (let offset = 0; offset < periode; offset += 1) {
      const date = new Date(debutPeriode);
      date.setDate(debutPeriode.getDate() + offset);

      const key = daily
        ? dateKey(date)
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-S${Math.floor((date.getDate() - 1) / 7)}`;

      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          label: daily
            ? date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
            : `S${Math.floor((date.getDate() - 1) / 7) + 1}`,
          entrees: 0,
          sorties: 0,
        });
      }
    }

    activitesPeriode.forEach((item) => {
      if (item.type === "facture") return;

      const date = item.date;
      const key = daily
        ? dateKey(date)
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-S${Math.floor((date.getDate() - 1) / 7)}`;

      const bucket = buckets.get(key);
      if (!bucket) return;

      if (item.type === "sortie") bucket.sorties += item.montant;
      if (item.type === "comptabilite") bucket.entrees += item.montant;
    });

    return Array.from(buckets.values());
  }, [periode, debutPeriode, activitesPeriode]);

  const tendanceComptabilite = useMemo(
    () => serieFinanciere.map((item) => item.entrees),
    [serieFinanciere]
  );

  const tendanceSorties = useMemo(
    () => serieFinanciere.map((item) => item.sorties),
    [serieFinanciere]
  );

  const totalEntreesPeriode = useMemo(
    () => activitesPeriode
      .filter((item) => item.type === "comptabilite")
      .reduce((sum, item) => sum + item.montant, 0),
    [activitesPeriode]
  );

  const totalSortiesPeriode = useMemo(
    () => activitesPeriode
      .filter((item) => item.type === "sortie")
      .reduce((sum, item) => sum + item.montant, 0),
    [activitesPeriode]
  );

  const soldeFlux = totalEntreesPeriode - totalSortiesPeriode;

  const totalOperationsPeriode = activitesPeriode.length;

  const repartition = useMemo(() => [
    {
      label: "Comptabilités",
      value: activitesPeriode.filter((item) => item.type === "comptabilite").length,
      color: C.green,
    },
    {
      label: "Sorties diverses",
      value: activitesPeriode.filter((item) => item.type === "sortie").length,
      color: C.orange,
    },
    {
      label: "Factures",
      value: activitesPeriode.filter((item) => item.type === "facture").length,
      color: C.blue,
    },
  ], [activitesPeriode]);

  /* Calendrier */
  const calendrier = useMemo(() => {
    const year = moisCalendrier.getFullYear();
    const month = moisCalendrier.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      const dayActivities = activites.filter((item) => sameDay(item.date, date));

      // Les factures ne sont pas additionnées au montant financier.
      const total = dayActivities.reduce((sum, item) => {
        if (item.type === "facture") return sum;
        return sum + item.montant;
      }, 0);

      return {
        date,
        dansLeMois: date.getMonth() === month,
        aujourdHui: sameDay(date, new Date()),
        selectionne: sameDay(date, jourSelectionne),
        activites: dayActivities,
        total,
      };
    });
  }, [moisCalendrier, jourSelectionne, activites]);

  const activitesJourSelectionne = useMemo(
    () => activites.filter((item) => sameDay(item.date, jourSelectionne)),
    [activites, jourSelectionne]
  );

  const totalFinancierJour = activitesJourSelectionne.reduce((sum, item) => {
    if (item.type === "facture") return sum;
    return sum + (item.type === "sortie" ? -item.montant : item.montant);
  }, 0);

  const moisPrecedent = () => setMoisCalendrier(
    (date) => new Date(date.getFullYear(), date.getMonth() - 1, 1)
  );

  const moisSuivant = () => setMoisCalendrier(
    (date) => new Date(date.getFullYear(), date.getMonth() + 1, 1)
  );

  const allerAujourdhui = () => {
    const today = new Date();
    setMoisCalendrier(new Date(today.getFullYear(), today.getMonth(), 1));
    setJourSelectionne(today);
  };

  /* Activités filtrées */
  const activitesFiltrees = useMemo(() => {
    const query = rechercheActivite.trim().toLocaleLowerCase("fr-FR");

    return activites.filter((item) => {
      const typeOk = filtreActivite === "tout" || item.type === filtreActivite;
      const text = `${item.label} ${item.description}`.toLocaleLowerCase("fr-FR");
      return typeOk && (!query || text.includes(query));
    });
  }, [activites, filtreActivite, rechercheActivite]);

  /* Alertes */
  const alertes = useMemo(() => {
    const result = [];

    stockRupture.forEach((item) => result.push({
      id: `rupture-${item.id ?? getMedicationName(item)}`,
      niveau: "critique",
      titre: getMedicationName(item),
      detail: "Rupture de stock",
      icon: AlertCircle,
    }));

    stockFaible.forEach((item) => result.push({
      id: `faible-${item.id ?? getMedicationName(item)}`,
      niveau: "attention",
      titre: getMedicationName(item),
      detail: `Stock restant : ${number(getStock(item))}`,
      icon: Package,
    }));

    alertesExpiration.forEach(({ item, date }) => {
      const expired = date.getTime() < new Date().setHours(0, 0, 0, 0);

      result.push({
        id: `expiration-${item.id ?? getMedicationName(item)}`,
        niveau: expired ? "critique" : "attention",
        titre: getMedicationName(item),
        detail: expired
          ? `Date dépassée : ${formatShortDate(date)}`
          : `Expiration : ${formatShortDate(date)}`,
        icon: CalendarClock,
      });
    });

    return result;
  }, [stockRupture, stockFaible, alertesExpiration]);

  const alertesAffichees = voirToutesLesAlertes ? alertes : alertes.slice(0, 5);

  const maintenantTexte = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  /* Export CSV */
  const exporterActivites = () => {
    const rows = [
      ["Date", "Type", "Description", "Montant", "Comptabilisé dans les flux"],
      ...activitesFiltrees.map((item) => [
        item.date.toLocaleDateString("fr-FR"),
        item.label,
        item.description,
        item.montant,
        item.type === "facture" ? "Non — facture exclue des flux" : "Oui",
      ]),
    ];

    const csv = rows.map((row) =>
      row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";")
    ).join("\r\n");

    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "aina-koloina-activites.csv";
    link.click();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const formatTime = (date) => date?.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="ak-dashboard">
      <style>{`
        .ak-dashboard {
          --ak-green: ${C.green};
          --ak-dark: ${C.dark};
          --ak-text: ${C.text};
          --ak-muted: ${C.muted};
          --ak-border: ${C.border};
          min-width: 0;
          width: 100%;
          padding: 23px;
          color: var(--ak-text);
          font-family: Inter, "Segoe UI", system-ui, sans-serif;
          font-size: 13px;
          line-height: 1.5;
          background:
            radial-gradient(ellipse at 5% 0%, #e4f1e9 0, transparent 29%),
            radial-gradient(ellipse at 100% 10%, #edf2f9 0, transparent 25%),
            #F6F8F6;
          box-sizing: border-box;
          animation: akPageIn .45s ease both;
        }

        .ak-dashboard *, .ak-dashboard *::before, .ak-dashboard *::after {
          box-sizing: border-box;
        }

        .ak-dashboard button, .ak-dashboard input, .ak-dashboard select {
          font: inherit;
        }

        .ak-dashboard button { cursor: pointer; }

        .ak-dashboard button:focus-visible,
        .ak-dashboard input:focus-visible,
        .ak-dashboard select:focus-visible {
          outline: 3px solid #438B7440;
          outline-offset: 3px;
        }

        .ak-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
          margin-bottom: 21px;
        }

        .ak-heading-left { min-width: 0; }

        .ak-eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 7px;
          color: var(--ak-green);
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .ak-header h1 {
          margin: 0;
          color: var(--ak-text);
          font-size: clamp(25px, 2.3vw, 33px);
          line-height: 1.18;
          font-weight: 850;
          letter-spacing: -.05em;
        }

        .ak-header-description {
          margin: 8px 0 0;
          color: var(--ak-muted);
          font-size: 12px;
          max-width: 560px;
        }

        .ak-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 8px;
        }

        .ak-date-pill, .ak-button {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid var(--ak-border);
          border-radius: 11px;
          background: #fff;
          color: var(--ak-text);
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
        }

        .ak-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 7px 18px #263d3212;
        }

        .ak-button-primary {
          color: #fff;
          background: linear-gradient(135deg, ${C.dark}, ${C.green});
          border-color: transparent;
          box-shadow: 0 5px 13px #28594b22;
        }

        .ak-button-primary:hover {
          background: linear-gradient(135deg, #20483b, #34765f);
        }

        .ak-button:disabled { opacity: .6; cursor: wait; }

        .ak-status-line {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin: 0 0 20px;
          color: var(--ak-muted);
          font-size: 10px;
        }

        .ak-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${C.green};
          box-shadow: 0 0 0 4px #438B741b;
          animation: akPulse 2.4s ease-in-out infinite;
        }

        .ak-error-banner {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 12px 14px;
          margin-bottom: 16px;
          color: #87562A;
          background: #FFF6E8;
          border: 1px solid #F2DDBB;
          border-radius: 12px;
          font-size: 12px;
        }

        .ak-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 18px;
        }

        .ak-kpi-card {
          min-width: 0;
          position: relative;
          overflow: hidden;
          padding: 17px;
          text-align: left;
          border: 1px solid #E3EBE4;
          border-radius: 17px;
          background: linear-gradient(145deg, #fff 0%, #FCFDFC 100%);
          box-shadow: 0 4px 15px #263d3206;
          animation: akCardIn .55s cubic-bezier(.2,.7,.2,1) both;
          transition: transform .23s ease, box-shadow .23s ease, border-color .23s ease;
        }

        .ak-kpi-card:nth-child(2) { animation-delay: .05s; }
        .ak-kpi-card:nth-child(3) { animation-delay: .1s; }
        .ak-kpi-card:nth-child(4) { animation-delay: .15s; }

        .ak-kpi-card::after {
          content: "";
          position: absolute;
          width: 105px;
          height: 105px;
          top: -65px;
          right: -45px;
          border-radius: 50%;
          background: #438B7408;
          pointer-events: none;
          transition: transform .3s ease;
        }

        .ak-kpi-card:hover {
          transform: translateY(-4px);
          border-color: #C9DED0;
          box-shadow: 0 13px 28px #263d3212;
        }

        .ak-kpi-card:hover::after { transform: scale(1.6); }

        .ak-kpi-top {
          min-height: 44px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 7px;
          margin-bottom: 12px;
        }

        .ak-kpi-icon {
          flex: 0 0 41px;
          width: 41px;
          height: 41px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          transition: transform .25s ease;
        }

        .ak-kpi-card:hover .ak-kpi-icon { transform: rotate(-4deg) scale(1.05); }

        .ak-sparkline {
          width: min(48%, 120px);
          height: 42px;
          overflow: visible;
        }

        .ak-spark-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          width: 82px;
          height: 36px;
          color: #9CAAA0;
          font-size: 9px;
        }

        .ak-kpi-title {
          margin-bottom: 5px;
          color: var(--ak-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .ak-kpi-value {
          color: var(--ak-text);
          font-size: clamp(20px, 1.8vw, 28px);
          line-height: 1.25;
          font-weight: 850;
          letter-spacing: -.045em;
          overflow-wrap: anywhere;
          font-variant-numeric: tabular-nums;
        }

        .ak-kpi-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid #EEF2EE;
          color: var(--ak-muted);
          font-size: 10px;
        }

        .ak-kpi-arrow { display: inline-flex; color: var(--ak-green); }

        .ak-flux-banner {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) repeat(3, minmax(0, 1fr));
          align-items: center;
          gap: 17px;
          position: relative;
          overflow: hidden;
          padding: 20px 22px;
          margin-bottom: 20px;
          border: 1px solid #FFFFFF16;
          border-radius: 19px;
          background: linear-gradient(115deg, #1F473A 0%, #2C634F 52%, #438B74 100%);
          color: #fff;
          box-shadow: 0 10px 26px #28594b1b;
        }

        .ak-flux-banner::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: .22;
          pointer-events: none;
          background-image: radial-gradient(#FFFFFF 0.7px, transparent .7px);
          background-size: 17px 17px;
          mask-image: linear-gradient(90deg, transparent, #000);
        }

        .ak-flux-banner::after {
          content: "";
          position: absolute;
          width: 230px;
          height: 230px;
          top: -140px;
          right: -60px;
          border: 1px solid #FFFFFF25;
          border-radius: 50%;
          box-shadow: 0 0 0 27px #FFFFFF08, 0 0 0 55px #FFFFFF06;
          pointer-events: none;
        }

        .ak-flux-main, .ak-flux-metric { position: relative; z-index: 1; min-width: 0; }
        .ak-flux-label { color: #D8EAE0; font-size: 11px; font-weight: 700; }
        .ak-flux-value { margin-top: 4px; font-size: clamp(23px, 2.4vw, 32px); font-weight: 850; letter-spacing: -.045em; }
        .ak-flux-description { margin-top: 5px; color: #D8EAE0; font-size: 10px; }

        .ak-flux-metric {
          padding-left: 15px;
          border-left: 1px solid #FFFFFF30;
        }

        .ak-flux-metric span { display: block; color: #D8EAE0; font-size: 10px; }
        .ak-flux-metric strong { display: block; margin-top: 5px; font-size: 15px; font-weight: 800; overflow-wrap: anywhere; }
        .ak-flux-metric small { display: block; margin-top: 4px; color: #D8EAE0; font-size: 9px; }

        .ak-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(285px, .95fr);
          gap: 19px;
          align-items: start;
          margin-bottom: 20px;
        }

        .ak-column { min-width: 0; display: grid; gap: 19px; }

        .ak-panel {
          min-width: 0;
          padding: 19px;
          border: 1px solid #E3EBE4;
          border-radius: 17px;
          background: rgba(255,255,255,.96);
          box-shadow: 0 4px 16px #263d3206;
          animation: akCardIn .5s ease both;
          transition: box-shadow .2s ease, border-color .2s ease;
        }

        .ak-panel:hover {
          border-color: #D8E5DA;
          box-shadow: 0 8px 24px #263d320a;
        }

        .ak-panel-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .ak-panel-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .ak-panel-icon {
          flex-shrink: 0;
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: var(--ak-green);
          background: linear-gradient(145deg, #EAF4ED, #F3F8F3);
        }

        .ak-panel h2 {
          margin: 0;
          color: var(--ak-text);
          font-size: 13px;
          line-height: 1.4;
          font-weight: 850;
          letter-spacing: -.02em;
        }

        .ak-panel-heading p {
          margin: 3px 0 0;
          color: var(--ak-muted);
          font-size: 10px;
        }

        .ak-period-control {
          display: flex;
          gap: 3px;
          padding: 4px;
          border: 1px solid #EDF1ED;
          border-radius: 10px;
          background: #F3F6F3;
        }

        .ak-period-button {
          border: 0;
          padding: 6px 9px;
          border-radius: 7px;
          color: var(--ak-muted);
          background: transparent;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
          transition: background .18s ease, color .18s ease, box-shadow .18s ease;
        }

        .ak-period-button.active {
          color: var(--ak-dark);
          background: #fff;
          box-shadow: 0 2px 6px #263d3210;
        }

        .ak-chart-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 15px;
        }

        .ak-chart-stat {
          min-width: 0;
          padding: 11px;
          border: 1px solid #EDF1ED;
          border-radius: 11px;
          background: linear-gradient(145deg, #F8FAF8, #F3F7F4);
        }

        .ak-chart-stat span { display: block; color: var(--ak-muted); font-size: 10px; }
        .ak-chart-stat strong { display: block; margin-top: 4px; font-size: 14px; letter-spacing: -.025em; overflow-wrap: anywhere; }
        .ak-chart-svg-wrap { width: 100%; overflow: hidden; }
        .ak-financial-svg { width: 100%; height: auto; display: block; overflow: visible; }
        .ak-chart-legend { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 12px; }
        .ak-legend-chip { display: inline-flex; align-items: center; gap: 7px; color: var(--ak-muted); font-size: 10px; }
        .ak-legend-dot { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 3px; }
        .ak-chart-note { margin-top: 11px; color: var(--ak-muted); font-size: 10px; }

        .ak-donut-layout {
          display: grid;
          grid-template-columns: minmax(120px, .9fr) minmax(0, 1fr);
          gap: 10px;
          align-items: center;
        }

        .ak-donut-graphic svg { display: block; width: 100%; max-width: 190px; margin: auto; }
        .ak-donut-segment { transition: stroke-dasharray .45s ease, stroke-dashoffset .45s ease; }
        .ak-donut-legend { display: grid; gap: 12px; }
        .ak-legend-row { display: grid; grid-template-columns: 8px minmax(0, 1fr) auto; align-items: center; gap: 7px; font-size: 10px; }
        .ak-legend-label { color: var(--ak-muted); }
        .ak-legend-row strong { color: var(--ak-text); font-size: 11px; }

        .ak-calendar-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 15px; }
        .ak-calendar-month { font-weight: 850; font-size: 13px; text-transform: capitalize; }
        .ak-calendar-actions { display: flex; align-items: center; gap: 5px; }

        .ak-icon-button {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          border: 1px solid var(--ak-border);
          background: #fff;
          color: var(--ak-text);
          border-radius: 9px;
          transition: background .18s ease, transform .18s ease;
        }

        .ak-icon-button:hover { background: #F0F6F0; transform: translateY(-1px); }
        .ak-today-button { border: 0; background: #EAF4ED; color: var(--ak-dark); border-radius: 8px; padding: 7px 9px; font-size: 10px; font-weight: 800; }

        .ak-calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
        .ak-weekday { text-align: center; padding: 5px 0 8px; color: var(--ak-muted); font-size: 9px; font-weight: 800; }

        .ak-day {
          min-width: 0;
          min-height: 45px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          position: relative;
          border: 1px solid transparent;
          border-radius: 10px;
          background: #fff;
          color: var(--ak-text);
          font-size: 11px;
          font-weight: 700;
          transition: background .16s ease, border-color .16s ease, transform .16s ease;
        }

        .ak-day:hover { background: #F0F6F0; transform: translateY(-1px); }
        .ak-day.outside { color: #B7C0B9; }
        .ak-day.today { border-color: #B5D5C0; background: #F1F8F2; }
        .ak-day.selected { color: #fff; background: var(--ak-dark); border-color: var(--ak-dark); }
        .ak-day-dots { display: flex; align-items: center; gap: 2px; height: 4px; }
        .ak-day-dot { width: 4px; height: 4px; border-radius: 50%; }

        .ak-calendar-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 7px;
          padding: 12px 0 0;
          margin-top: 12px;
          border-top: 1px solid #EDF1ED;
          font-size: 10px;
          color: var(--ak-muted);
        }

        .ak-calendar-summary strong { color: var(--ak-dark); }

        .ak-day-detail { margin-top: 13px; padding: 12px; border: 1px solid #EDF1ED; border-radius: 12px; background: #F8FAF8; }
        .ak-day-detail h3 { margin: 0 0 9px; font-size: 11px; font-weight: 850; text-transform: capitalize; }
        .ak-day-activity { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #E7ECE7; }
        .ak-day-activity:last-child { border-bottom: 0; }
        .ak-day-activity-dot { width: 7px; height: 7px; border-radius: 3px; flex-shrink: 0; }
        .ak-day-activity-text { min-width: 0; flex: 1; }
        .ak-day-activity-text strong { display: block; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ak-day-activity-text span { display: block; color: var(--ak-muted); font-size: 9px; }
        .ak-day-activity-amount { white-space: nowrap; font-size: 10px; font-weight: 800; }

        .ak-stock-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
        .ak-stock-metric { min-width: 0; padding: 11px; border: 1px solid #EDF1ED; border-radius: 11px; background: #F8FAF8; }
        .ak-stock-metric span { display: block; color: var(--ak-muted); font-size: 9px; }
        .ak-stock-metric strong { display: block; margin-top: 4px; font-size: 21px; letter-spacing: -.04em; }
        .ak-stock-track { height: 8px; width: 100%; display: flex; overflow: hidden; border-radius: 10px; background: #EDF1ED; }
        .ak-stock-track span { height: 100%; transition: width .6s cubic-bezier(.2,.7,.2,1); }
        .ak-stock-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 11px; }

        .ak-alert-list { display: grid; gap: 8px; }
        .ak-alert-item { display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid #EDF0ED; border-radius: 12px; background: #fff; transition: transform .18s ease, box-shadow .18s ease; }
        .ak-alert-item:hover { transform: translateX(2px); box-shadow: 0 4px 12px #263d3208; }
        .ak-alert-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; flex-shrink: 0; }
        .ak-alert-item.critique .ak-alert-icon { color: #B34C48; background: #FCEDEB; }
        .ak-alert-item.attention .ak-alert-icon { color: #9B6827; background: #FFF4E2; }
        .ak-alert-content { min-width: 0; flex: 1; }
        .ak-alert-content strong { display: block; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ak-alert-content span { display: block; margin-top: 2px; color: var(--ak-muted); font-size: 10px; }
        .ak-alert-badge { padding: 4px 6px; border-radius: 6px; font-size: 9px; font-weight: 850; white-space: nowrap; }
        .ak-alert-badge.critique { color: #A64642; background: #FCEDEB; }
        .ak-alert-badge.attention { color: #95601F; background: #FFF4E2; }

        .ak-activity-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
        .ak-search { display: flex; align-items: center; gap: 7px; min-width: 140px; padding: 8px 10px; border: 1px solid var(--ak-border); border-radius: 10px; background: #F8FAF8; color: var(--ak-muted); }
        .ak-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--ak-text); font-size: 11px; }
        .ak-select { padding: 8px 10px; border: 1px solid var(--ak-border); border-radius: 10px; background: #fff; color: var(--ak-text); font-size: 11px; }
        .ak-activity-list { display: grid; }
        .ak-activity-row { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid #EEF2EE; animation: akRowIn .3s ease both; }
        .ak-activity-row:last-child { border-bottom: 0; }
        .ak-activity-icon { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; }
        .ak-activity-main { min-width: 0; }
        .ak-activity-main strong { display: block; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ak-activity-main span { display: block; margin-top: 2px; color: var(--ak-muted); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ak-activity-right { text-align: right; white-space: nowrap; }
        .ak-activity-right strong { display: block; font-size: 11px; }
        .ak-activity-right span { display: block; margin-top: 3px; color: var(--ak-muted); font-size: 9px; }

        .ak-empty { min-height: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; padding: 18px; color: var(--ak-muted); text-align: center; font-size: 11px; }
        .ak-empty-icon { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 12px; background: #F0F5F0; color: #719481; }

        .ak-footer-note { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px; padding: 12px; color: #8B9A8E; font-size: 10px; }
        .ak-footer-note svg { color: var(--ak-green); }

        .ak-spinning { animation: akSpin .85s linear infinite; }

        @keyframes akSpin { to { transform: rotate(360deg); } }
        @keyframes akPulse {
          0%, 100% { box-shadow: 0 0 0 3px #438B7419; }
          50% { box-shadow: 0 0 0 6px #438B7408; }
        }
        @keyframes akPageIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes akCardIn {
          from { opacity: 0; transform: translateY(9px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes akRowIn {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @media (max-width: 1200px) {
          .ak-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .ak-main-grid { grid-template-columns: minmax(0, 1.25fr) minmax(270px, .9fr); }
          .ak-flux-banner { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .ak-flux-main { grid-column: 1 / -1; }
          .ak-flux-metric:first-of-type { border-left: 0; padding-left: 0; }
        }

        @media (max-width: 900px) {
          .ak-dashboard { padding: 16px; }
          .ak-main-grid { grid-template-columns: minmax(0, 1fr); }
          .ak-column { gap: 16px; }
        }

        @media (max-width: 560px) {
          .ak-dashboard { padding: 11px; }
          .ak-header { gap: 14px; margin-bottom: 17px; }
          .ak-header-actions { width: 100%; justify-content: flex-start; }
          .ak-date-pill { display: none; }
          .ak-kpi-grid { gap: 9px; margin-bottom: 13px; }
          .ak-kpi-card { padding: 12px; border-radius: 13px; }
          .ak-kpi-top { min-height: 33px; margin-bottom: 9px; }
          .ak-kpi-icon { width: 33px; height: 33px; flex-basis: 33px; }
          .ak-kpi-value { font-size: 19px; }
          .ak-sparkline { width: 43%; height: 31px; }
          .ak-kpi-footer { align-items: flex-start; font-size: 9px; }
          .ak-flux-banner { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 15px; gap: 14px; border-radius: 15px; }
          .ak-flux-main { grid-column: 1 / -1; }
          .ak-flux-metric { padding-left: 10px; }
          .ak-flux-metric:nth-of-type(2) { border-left: 0; padding-left: 0; }
          .ak-flux-metric strong { font-size: 13px; }
          .ak-panel { padding: 13px; border-radius: 14px; }
          .ak-panel-heading { align-items: flex-start; gap: 8px; }
          .ak-panel-icon { width: 32px; height: 32px; }
          .ak-period-control { gap: 1px; }
          .ak-period-button { padding: 6px; font-size: 9px; }
          .ak-chart-summary { gap: 6px; }
          .ak-chart-stat { padding: 8px; }
          .ak-chart-stat strong { font-size: 12px; }
          .ak-donut-layout { grid-template-columns: minmax(0, 1fr); }
          .ak-donut-graphic svg { max-width: 165px; }
          .ak-donut-legend { gap: 8px; }
          .ak-day { min-height: 36px; font-size: 10px; }
          .ak-stock-summary { gap: 5px; }
          .ak-stock-metric { padding: 8px; }
          .ak-stock-metric strong { font-size: 17px; }
          .ak-activity-controls { width: 100%; }
          .ak-search { flex: 1; }
          .ak-select { max-width: 100%; }
          .ak-activity-row { grid-template-columns: 30px minmax(0, 1fr) auto; gap: 7px; }
          .ak-activity-icon { width: 30px; height: 30px; }
          .ak-activity-right strong { font-size: 10px; }
          .ak-calendar-summary { justify-content: flex-start; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ak-dashboard *, .ak-dashboard *::before, .ak-dashboard *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      {/* EN-TÊTE */}
      <header className="ak-header">
        <div className="ak-heading-left">
          <div className="ak-eyebrow">
            <Sparkles size={13} />
            Centre de santé · Vue analytique
          </div>
          <h1>Vue d'ensemble</h1>
          <p className="ak-header-description">
            Pilotez les finances, les médicaments et les activités de votre centre.
          </p>
        </div>

        <div className="ak-header-actions">
          <div className="ak-date-pill">
            <CalendarDays size={15} />
            <span>{maintenantTexte}</span>
          </div>

          <button className="ak-button" type="button" onClick={exporterActivites}>
            <Download size={15} />
            Exporter
          </button>

          <button
            className="ak-button ak-button-primary"
            type="button"
            onClick={() => actualiser(false)}
            disabled={actualisation || chargement}
          >
            <RefreshCw
              size={15}
              className={actualisation || chargement ? "ak-spinning" : ""}
            />
            Actualiser
          </button>
        </div>
      </header>

      <div className="ak-status-line">
        <span className="ak-status-dot" />
        Données du centre
        <span>·</span>
        {derniereMaj
          ? `Dernière mise à jour à ${formatTime(derniereMaj)}`
          : "Connexion en cours…"}
        <span>·</span>
        Actualisation automatique toutes les 60 secondes
      </div>

      {erreur && (
        <div className="ak-error-banner">
          <AlertCircle size={17} />
          <span>{erreur}</span>
        </div>
      )}

      {/* KPI PRINCIPAUX */}
      <div className="ak-kpi-grid">
        <KpiCard
          title="Solde du centre"
          value={money(solde)}
          subtitle="Solde actuel"
          icon={Wallet}
          color={C.green}
          values={tendanceComptabilite}
        />

        <KpiCard
          title="Comptabilités enregistrées"
          value={comptabilites.length}
          subtitle={`Total : ${money(totalComptabilites)}`}
          icon={CircleDollarSign}
          color={C.blue}
          values={tendanceComptabilite}
        />

        <KpiCard
          title="Sorties diverses"
          value={sorties.length}
          subtitle={`Total : ${money(totalSorties)}`}
          icon={ArrowDownRight}
          color={C.orange}
          values={tendanceSorties}
        />

        <KpiCard
          title="Références médicaments"
          value={medicaments.length}
          subtitle={`${stockRupture.length} rupture(s) · ${stockFaible.length} faible(s)`}
          icon={Pill}
          color={C.dark}
          values={medicaments.map(getStock)}
        />
      </div>

      {/* BANDEAU FINANCIER */}
      <section className="ak-flux-banner">
        <div className="ak-flux-main">
          <div className="ak-flux-label">
            Solde net des opérations sur {periode} jours
          </div>
          <div className="ak-flux-value">
            {soldeFlux < 0 ? "−" : ""}
            {money(Math.abs(soldeFlux))}
          </div>
          <div className="ak-flux-description">
            {soldeFlux > 0
              ? "Les recettes de comptabilité dépassent les dépenses."
              : soldeFlux < 0
                ? "Les dépenses dépassent les recettes de comptabilité."
                : "Les recettes et dépenses sont équilibrées."}
          </div>
        </div>

        <div className="ak-flux-metric">
          <span>Recettes de comptabilité</span>
          <strong>{money(totalEntreesPeriode)}</strong>
          <small>{periode} derniers jours</small>
        </div>

        <div className="ak-flux-metric">
          <span>Sorties diverses</span>
          <strong>{money(totalSortiesPeriode)}</strong>
          <small>{periode} derniers jours</small>
        </div>

        <div className="ak-flux-metric">
          <span>Opérations datées</span>
          <strong>{number(totalOperationsPeriode)}</strong>
          <small>Factures incluses dans le compte des opérations</small>
        </div>
      </section>

      {/* GRAPHIQUES ET ACTIVITÉS */}
      <div className="ak-main-grid">
        <div className="ak-column">
          <Panel
            title="Analyse financière"
            subtitle="Évolution des recettes de comptabilité et des dépenses"
            icon={TrendingUp}
            action={
              <div className="ak-period-control">
                {PERIODS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`ak-period-button ${periode === item.value ? "active" : ""}`}
                    onClick={() => setPeriode(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="ak-chart-summary">
              <div className="ak-chart-stat">
                <span>Recettes</span>
                <strong style={{ color: C.green }}>{money(totalEntreesPeriode)}</strong>
              </div>
              <div className="ak-chart-stat">
                <span>Dépenses</span>
                <strong style={{ color: C.orange }}>{money(totalSortiesPeriode)}</strong>
              </div>
              <div className="ak-chart-stat">
                <span>Opérations</span>
                <strong>{number(totalOperationsPeriode)}</strong>
              </div>
            </div>

            <FinancialChart data={serieFinanciere} />

            <div className="ak-chart-legend">
              <span className="ak-legend-chip">
                <span className="ak-legend-dot" style={{ background: C.green }} />
                Entrées : médicaments et soins comptabilisés
              </span>
              <span className="ak-legend-chip">
                <span className="ak-legend-dot" style={{ background: C.orange }} />
                Sorties diverses
              </span>
            </div>

            <p className="ak-chart-note">
              Les factures restent visibles dans les activités, mais leurs montants
              ne sont pas ajoutés une seconde fois aux recettes.
            </p>
          </Panel>

          <Panel
            title="Activité récente"
            subtitle={`${activitesFiltrees.length} opération(s) avec une date valide`}
            icon={Activity}
            action={
              <button className="ak-button" type="button" onClick={exporterActivites}>
                <Download size={13} />
                CSV
              </button>
            }
          >
            <div className="ak-activity-controls" style={{ marginBottom: 12 }}>
              <label className="ak-search">
                <Search size={14} />
                <input
                  value={rechercheActivite}
                  onChange={(event) => setRechercheActivite(event.target.value)}
                  placeholder="Rechercher une activité…"
                />
                {rechercheActivite && (
                  <button
                    type="button"
                    onClick={() => setRechercheActivite("")}
                    style={{
                      border: 0,
                      background: "transparent",
                      padding: 0,
                      color: C.muted,
                    }}
                    aria-label="Effacer la recherche"
                  >
                    <X size={13} />
                  </button>
                )}
              </label>

              <select
                className="ak-select"
                value={filtreActivite}
                onChange={(event) => setFiltreActivite(event.target.value)}
                aria-label="Filtrer les activités"
              >
                <option value="tout">Toutes les activités</option>
                <option value="comptabilite">Comptabilités</option>
                <option value="sortie">Sorties diverses</option>
                <option value="facture">Factures</option>
              </select>
            </div>

            {activitesFiltrees.length === 0 ? (
              <EmptyState message="Aucune activité ne correspond à cette recherche." />
            ) : (
              <div className="ak-activity-list">
                {activitesFiltrees.slice(0, 8).map((item) => {
                  const Icon = item.icon;

                  return (
                    <div className="ak-activity-row" key={item.id}>
                      <div
                        className="ak-activity-icon"
                        style={{
                          color: item.color,
                          background: `${item.color}18`,
                        }}
                      >
                        <Icon size={16} />
                      </div>

                      <div className="ak-activity-main">
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                      </div>

                      <div className="ak-activity-right">
                        <strong>{money(item.montant)}</strong>
                        <span>
                          {item.date.toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activitesFiltrees.length > 8 && (
              <p className="ak-chart-note">
                Affichage des 8 premières activités. Utilise la recherche pour
                affiner les résultats.
              </p>
            )}
          </Panel>
        </div>

        <div className="ak-column">
          <Panel
            title="Calendrier du centre"
            subtitle="Sélectionne une date pour consulter les opérations"
            icon={CalendarDays}
          >
            <div className="ak-calendar-toolbar">
              <div className="ak-calendar-month">
                {moisCalendrier.toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </div>

              <div className="ak-calendar-actions">
                <button
                  type="button"
                  className="ak-today-button"
                  onClick={allerAujourdhui}
                >
                  Aujourd'hui
                </button>
                <button
                  type="button"
                  className="ak-icon-button"
                  onClick={moisPrecedent}
                  aria-label="Mois précédent"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  className="ak-icon-button"
                  onClick={moisSuivant}
                  aria-label="Mois suivant"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            <div className="ak-calendar-grid">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                <div className="ak-weekday" key={day}>{day}</div>
              ))}

              {calendrier.map((cell) => (
                <button
                  key={dateKey(cell.date)}
                  type="button"
                  className={[
                    "ak-day",
                    !cell.dansLeMois ? "outside" : "",
                    cell.aujourdHui ? "today" : "",
                    cell.selectionne ? "selected" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => setJourSelectionne(cell.date)}
                  title={
                    cell.activites.length
                      ? `${cell.activites.length} opération(s) · ${money(cell.total)}`
                      : formatLongDate(cell.date)
                  }
                >
                  <span>{cell.date.getDate()}</span>
                  <span className="ak-day-dots">
                    {cell.activites.slice(0, 3).map((item, index) => (
                      <span
                        className="ak-day-dot"
                        key={`${item.id}-${index}`}
                        style={{
                          background: cell.selectionne ? "#fff" : item.color,
                        }}
                      />
                    ))}
                  </span>
                </button>
              ))}
            </div>

            <div className="ak-calendar-summary">
              <span>Opérations ce jour</span>
              <strong>{activitesJourSelectionne.length}</strong>
              <span>Flux net</span>
              <strong style={{ color: totalFinancierJour < 0 ? C.red : C.green }}>
                {totalFinancierJour < 0 ? "−" : ""}
                {money(Math.abs(totalFinancierJour))}
              </strong>
            </div>

            <div className="ak-day-detail">
              <h3>{formatLongDate(jourSelectionne)}</h3>

              {activitesJourSelectionne.length === 0 ? (
                <EmptyState message="Aucune opération enregistrée pour cette date." />
              ) : (
                activitesJourSelectionne.slice(0, 5).map((item) => (
                  <div className="ak-day-activity" key={item.id}>
                    <span
                      className="ak-day-activity-dot"
                      style={{ background: item.color }}
                    />
                    <div className="ak-day-activity-text">
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </div>
                    <div className="ak-day-activity-amount">
                      {money(item.montant)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel
            title="Répartition des opérations"
            subtitle={`Sur les ${periode} derniers jours`}
            icon={Activity}
          >
            <DonutChart
              segments={repartition}
              total={totalOperationsPeriode}
            />
          </Panel>

          <Panel
            title="État du stock"
            subtitle={`${medicaments.length} référence(s) de médicaments`}
            icon={PackageCheck}
          >
            <div className="ak-stock-summary">
              <div className="ak-stock-metric">
                <span>Disponible</span>
                <strong style={{ color: C.green }}>{stockDisponible.length}</strong>
              </div>
              <div className="ak-stock-metric">
                <span>Stock faible</span>
                <strong style={{ color: C.orange }}>{stockFaible.length}</strong>
              </div>
              <div className="ak-stock-metric">
                <span>Rupture</span>
                <strong style={{ color: C.red }}>{stockRupture.length}</strong>
              </div>
            </div>

            <div
              className="ak-stock-track"
              role="img"
              aria-label="Répartition des références selon leur état de stock"
            >
              <span
                style={{
                  background: C.green,
                  width: `${medicaments.length ? stockDisponible.length / medicaments.length * 100 : 0}%`,
                }}
              />
              <span
                style={{
                  background: C.orange,
                  width: `${medicaments.length ? stockFaible.length / medicaments.length * 100 : 0}%`,
                }}
              />
              <span
                style={{
                  background: C.red,
                  width: `${medicaments.length ? stockRupture.length / medicaments.length * 100 : 0}%`,
                }}
              />
            </div>

            <div className="ak-stock-legend">
              <span className="ak-legend-chip">
                <span className="ak-legend-dot" style={{ background: C.green }} />
                Disponible
              </span>
              <span className="ak-legend-chip">
                <span className="ak-legend-dot" style={{ background: C.orange }} />
                Faible
              </span>
              <span className="ak-legend-chip">
                <span className="ak-legend-dot" style={{ background: C.red }} />
                Rupture
              </span>
            </div>

            <div className="ak-calendar-summary">
              <span>Valeur estimée du stock</span>
              <strong>{money(valeurStock)}</strong>
            </div>
          </Panel>

          <Panel
            title="Centre de vigilance"
            subtitle={`${alertes.length} alerte(s) détectée(s)`}
            icon={ShieldCheck}
            action={
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                fontWeight: 850,
                color: alertes.length ? C.red : C.green,
              }}>
                {alertes.length
                  ? <><AlertCircle size={13} /> À surveiller</>
                  : <><CheckCircle2 size={13} /> Tout est calme</>}
              </span>
            }
          >
            {alertesAffichees.length === 0 ? (
              <EmptyState message="Aucune alerte de stock ou de péremption détectée." />
            ) : (
              <div className="ak-alert-list">
                {alertesAffichees.map((alert) => {
                  const Icon = alert.icon;

                  return (
                    <div className={`ak-alert-item ${alert.niveau}`} key={alert.id}>
                      <div className="ak-alert-icon"><Icon size={16} /></div>
                      <div className="ak-alert-content">
                        <strong>{alert.titre}</strong>
                        <span>{alert.detail}</span>
                      </div>
                      <span className={`ak-alert-badge ${alert.niveau}`}>
                        {alert.niveau === "critique" ? "Critique" : "Attention"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {alertes.length > 5 && (
              <button
                type="button"
                className="ak-button"
                style={{ width: "100%", marginTop: 12 }}
                onClick={() => setVoirToutesLesAlertes((value) => !value)}
              >
                {voirToutesLesAlertes
                  ? "Afficher moins"
                  : `Afficher les ${alertes.length - 5} autres alertes`}
              </button>
            )}
          </Panel>
        </div>
      </div>

      <div className="ak-footer-note">
        <HeartPulse size={14} />
        Aina Koloina · Tableau de bord du centre de santé
        <span>·</span>
        <Clock3 size={13} />
        Actualisation automatique
      </div>
    </div>
  );
}