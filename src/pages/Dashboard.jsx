
import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Command,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";

/* -------------------------------------------------------
   MIKOLO AINA — Financial Command Center
   Le solde affiché provient exclusivement du backend.
------------------------------------------------------- */

const COLORS = {
  green: "#39866E",
  greenLight: "#82BBA4",
  greenPale: "#E9F4EE",
  yellow: "#D5B85D",
  yellowPale: "#F8F2DC",
  red: "#C76D69",
  blue: "#6887B8",
  ink: "#23352E",
  muted: "#84918A",
  line: "#E8EDE8",
};

const money = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";

  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 2,
    }).format(number) + " Ar"
  );
};

const numberValue = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null || value === "") return 0;

  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const get = (obj, ...keys) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }
  return undefined;
};

const getDate = (obj) =>
  get(
    obj,
    "created_at",
    "date_comptabilite",
    "date_sortie",
    "date_facture",
    "date",
    "createdAt",
    "dateComptabilite",
    "dateSortie",
    "dateFacture"
  );

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const shortDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(date);

const longDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

const getStock = (medicine) =>
  numberValue(
    get(
      medicine,
      "quantite",
      "stock",
      "quantite_stock",
      "quantite_disponible",
      "quantiteDisponible"
    )
  );

const getMedicineName = (medicine) =>
  get(medicine, "nom", "name", "libelle") || "Médicament sans nom";

const getPatientName = (item) => {
  const direct = get(item, "patient_nom", "nom_patient", "patientNom");
  const first = get(item, "patient_prenom", "prenom_patient", "patientPrenom");
  const nested = item?.patient;

  if (direct || first) return `${first || ""} ${direct || ""}`.trim();
  if (nested) {
    return `${get(nested, "prenom", "first_name") || ""} ${
      get(nested, "nom", "last_name") || ""
    }`.trim();
  }
  return "";
};

const makeActivity = (item, type, amount, title, date, id) => ({
  id: `${type}-${id ?? Math.random().toString(36).slice(2)}`,
  type,
  title,
  date: parseDate(date),
  amount: numberValue(amount),
  patient: getPatientName(item),
});

function TooltipFinance({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="ak-tooltip">
      <div className="ak-tooltip-date">{label}</div>
      {payload.map((item) => (
        <div className="ak-tooltip-row" key={item.dataKey}>
          <span className="ak-tooltip-dot" style={{ background: item.color }} />
          <span>{item.name}</span>
          <strong>{money(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loadErrors, setLoadErrors] = useState([]);
  const [period, setPeriod] = useState(30);
  const [search, setSearch] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(dateKey(new Date()));
  const [activeTab, setActiveTab] = useState("tout");

  const [data, setData] = useState({
    solde: null,
    medicaments: [],
    comptabilites: [],
    sorties: [],
    factures: [],
    sortiesMedicaments: [],
    patients: [],
  });

  const refreshDashboard = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    const commands = [
      ["solde", "obtenir_solde_centre", null],
      ["medicaments", "obtenir_medicaments", []],
      ["comptabilites", "obtenir_comptabilites", []],
      ["sorties", "obtenir_sorties_diverses", []],
      ["factures", "obtenir_factures", []],
      ["sortiesMedicaments", "obtenir_sorties_medicaments", []],
      ["patients", "obtenir_patients", []],
    ];

    const results = await Promise.allSettled(
      commands.map(([, command]) => invoke(command))
    );

    const next = {};
    const errors = [];

    results.forEach((result, index) => {
      const [key, command, fallback] = commands[index];

      if (result.status === "fulfilled") {
        next[key] = result.value ?? fallback;
      } else {
        next[key] = fallback;
        errors.push(command);
      }
    });

    setData((previous) => ({ ...previous, ...next }));
    setLoadErrors(errors);
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    refreshDashboard();

    const interval = window.setInterval(() => {
      refreshDashboard(true);
    }, 30000);

    let unlisteners = [];
    let mounted = true;

    const registerEvents = async () => {
      for (const eventName of [
        "dashboard-refresh",
        "solde-centre-change",
      ]) {
        try {
          const unlisten = await listen(eventName, () => {
            refreshDashboard(true);
          });

          if (mounted) unlisteners.push(unlisten);
          else unlisten();
        } catch {
          // L'événement est facultatif : l'actualisation périodique reste active.
        }
      }
    };

    registerEvents();

    return () => {
      mounted = false;
      window.clearInterval(interval);
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [refreshDashboard]);

  const medicines = Array.isArray(data.medicaments) ? data.medicaments : [];
  const accounts = Array.isArray(data.comptabilites)
    ? data.comptabilites
    : [];
  const expenses = Array.isArray(data.sorties) ? data.sorties : [];
  const invoices = Array.isArray(data.factures) ? data.factures : [];
  const patients = Array.isArray(data.patients) ? data.patients : [];

  const balance = get(data.solde, "montant_total", "montantTotal");
  const medicineExpenses = get(
    data.solde,
    "total_medicaments",
    "totalMedicaments"
  );
  const miscellaneousExpenses = get(
    data.solde,
    "total_sorties_diverses",
    "totalSortiesDiverses"
  );

  const stockSummary = useMemo(() => {
    let empty = 0;
    let low = 0;
    let available = 0;

    medicines.forEach((medicine) => {
      const quantity = getStock(medicine);
      if (quantity <= 0) empty += 1;
      else if (quantity <= 10) low += 1;
      else available += 1;
    });

    return { empty, low, available, total: medicines.length };
  }, [medicines]);

  const activity = useMemo(() => {
    const all = [
      ...accounts.map((item) =>
        makeActivity(
          item,
          "comptabilite",
          get(item, "total_general", "totalGeneral"),
          "Comptabilité enregistrée",
          getDate(item),
          get(item, "id")
        )
      ),
      ...expenses.map((item) =>
        makeActivity(
          item,
          "sortie",
          get(item, "montant", "amount"),
          get(item, "motif", "description") || "Dépense diverse",
          getDate(item),
          get(item, "id")
        )
      ),
      ...invoices.map((item) =>
        makeActivity(
          item,
          "facture",
          get(item, "montant", "total", "montant_total"),
          "Facture créée",
          getDate(item),
          get(item, "id")
        )
      ),
      ...(Array.isArray(data.sortiesMedicaments)
        ? data.sortiesMedicaments
        : []
      ).map((item) =>
        makeActivity(
          item,
          "medicament",
          get(item, "total_sortie", "totalSortie"),
          "Sortie de médicaments",
          getDate(item),
          get(item, "id")
        )
      ),
    ];

    return all
      .filter((item) => item.date)
      .sort((a, b) => b.date - a.date);
  }, [
    accounts,
    expenses,
    invoices,
    data.sortiesMedicaments,
  ]);

  const filteredActivity = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("fr");

    return activity.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        `${item.title} ${item.patient} ${item.type}`
          .toLocaleLowerCase("fr")
          .includes(normalizedSearch);

      const matchesTab = activeTab === "tout" || item.type === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [activity, search, activeTab]);

  const chartData = useMemo(() => {
    const today = new Date();
    const days = period;
    const start = new Date(today);
    start.setDate(today.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);

    const buckets = new Map();

    for (let i = 0; i < days; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      buckets.set(dateKey(date), {
        key: dateKey(date),
        date,
        label: shortDate(date),
        comptabilites: 0,
        sorties: 0,
        operations: 0,
      });
    }

    accounts.forEach((item) => {
      const date = parseDate(getDate(item));
      if (!date) return;

      const bucket = buckets.get(dateKey(date));
      if (!bucket) return;

      bucket.comptabilites += numberValue(
        get(item, "total_general", "totalGeneral")
      );
      bucket.operations += 1;
    });

    expenses.forEach((item) => {
      const date = parseDate(getDate(item));
      if (!date) return;

      const bucket = buckets.get(dateKey(date));
      if (!bucket) return;

      bucket.sorties += numberValue(get(item, "montant", "amount"));
      bucket.operations += 1;
    });

    return Array.from(buckets.values()).map((item) => ({
      ...item,
      comptabilites: Math.round(item.comptabilites),
      sorties: Math.round(item.sorties),
    }));
  }, [accounts, expenses, period]);

  const chartTotals = useMemo(
    () =>
      chartData.reduce(
        (total, day) => ({
          comptabilites: total.comptabilites + day.comptabilites,
          sorties: total.sorties + day.sorties,
          operations: total.operations + day.operations,
        }),
        { comptabilites: 0, sorties: 0, operations: 0 }
      ),
    [chartData]
  );

  const stockChart = [
    { name: "Disponible", value: stockSummary.available, color: COLORS.green },
    { name: "Stock faible", value: stockSummary.low, color: COLORS.yellow },
    { name: "Rupture", value: stockSummary.empty, color: COLORS.red },
  ];

  const monthStart = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth(),
    1
  );

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];

    for (let i = 0; i < offset; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(year, month, day);
      const key = dateKey(date);
      const count = activity.filter(
        (item) => item.date && dateKey(item.date) === key
      ).length;

      days.push({ day, key, count, date });
    }

    while (days.length < 35) days.push(null);
    return days;
  }, [calendarDate, activity]);

  const selectedDayActivity = useMemo(
    () =>
      activity.filter(
        (item) => item.date && dateKey(item.date) === selectedDay
      ),
    [activity, selectedDay]
  );

  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(monthStart);

  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const navigateTo = (path) => navigate(path);

  return (
    <div className="ak-dashboard">
      <style>{styles}</style>

      <main className="ak-main">
        <section className="ak-heading-row">
          <div>
            <h1>Centre de contrôle</h1>
            <p className="ak-heading-sub">
              Activité financière, opérations et état des ressources.
            </p>
          </div>

          <div className="ak-heading-controls">
            <div className="ak-updated">
              <span className="ak-live-dot" />
              {lastUpdated
                ? `Synchronisé à ${lastUpdated.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Synchronisation…"}
            </div>
            <button
              className="ak-primary-button"
              onClick={() => navigateTo("/comptabilite")}
            >
              <Plus size={15} />
              Nouvelle comptabilité
            </button>
          </div>
        </section>

        {loadErrors.length > 0 && (
          <div className="ak-warning-strip">
            <Database size={15} />
            <span>
              Certaines données ne sont pas disponibles. Vérifie les commandes
              : {loadErrors.join(", ")}.
            </span>
            <button onClick={() => refreshDashboard(true)}>
              Réessayer
            </button>
          </div>
        )}

        <section className="ak-ribbon" aria-label="Indicateurs d'activité">
          <div className="ak-ribbon-item">
            <div className="ak-ribbon-icon green">
              <Users size={17} />
            </div>
            <div className="ak-ribbon-copy">
              <span>Patients enregistrés</span>
              <strong>{patients.length.toLocaleString("fr-FR")}</strong>
            </div>
            <span className="ak-ribbon-detail">Base patients</span>
          </div>

          <div className="ak-ribbon-divider" />

          <div className="ak-ribbon-item">
            <div className="ak-ribbon-icon blue">
              <Stethoscope size={17} />
            </div>
            <div className="ak-ribbon-copy">
              <span>Comptabilités</span>
              <strong>{accounts.length.toLocaleString("fr-FR")}</strong>
            </div>
            <span className="ak-ribbon-detail">Enregistrées</span>
          </div>

          <div className="ak-ribbon-divider" />

          <div className="ak-ribbon-item">
            <div className="ak-ribbon-icon yellow">
              <Package size={17} />
            </div>
            <div className="ak-ribbon-copy">
              <span>Références en stock</span>
              <strong>{medicines.length.toLocaleString("fr-FR")}</strong>
            </div>
            <span className="ak-ribbon-detail">
              {stockSummary.empty + stockSummary.low} à surveiller
            </span>
          </div>

          <div className="ak-ribbon-divider" />

          <div className="ak-ribbon-item">
            <div className="ak-ribbon-icon red">
              <CreditCard size={17} />
            </div>
            <div className="ak-ribbon-copy">
              <span>Dépenses diverses</span>
              <strong>{expenses.length.toLocaleString("fr-FR")}</strong>
            </div>
            <span className="ak-ribbon-detail">Opérations saisies</span>
          </div>
        </section>

        <section className="ak-analysis-grid">
          <article className="ak-panel ak-finance-panel">
            <div className="ak-panel-heading">
              <div>
                <div className="ak-section-label">
                  <span className="ak-section-dot" />
                  ANALYSE FINANCIÈRE
                </div>
                <h2>Flux des opérations</h2>
                <p>Comptabilités enregistrées et dépenses diverses.</p>
              </div>

              <div className="ak-period-switch">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    className={period === days ? "active" : ""}
                    onClick={() => setPeriod(days)}
                  >
                    {days} j
                  </button>
                ))}
              </div>
            </div>

            <div className="ak-chart-summary">
              <div className="ak-chart-metric">
                <span className="ak-chart-metric-dot green" />
                <span className="ak-chart-metric-label">
                  Total des comptabilités
                </span>
                <strong>{money(chartTotals.comptabilites)}</strong>
              </div>
              <div className="ak-chart-metric">
                <span className="ak-chart-metric-dot yellow" />
                <span className="ak-chart-metric-label">
                  Dépenses diverses
                </span>
                <strong>{money(chartTotals.sorties)}</strong>
              </div>
              <div className="ak-chart-metric ak-chart-metric-last">
                <span className="ak-chart-metric-label">
                  Opérations sur la période
                </span>
                <strong>{chartTotals.operations}</strong>
              </div>
            </div>

            <div className="ak-finance-chart">
              {loading ? (
                <div className="ak-chart-loading">
                  <span className="ak-loader" />
                  Chargement des données…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="akGreenGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={COLORS.green}
                          stopOpacity={0.22}
                        />
                        <stop
                          offset="100%"
                          stopColor={COLORS.green}
                          stopOpacity={0.015}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      vertical={false}
                      stroke={COLORS.line}
                      strokeDasharray="3 5"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: COLORS.muted, fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval={period === 90 ? 8 : period === 30 ? 3 : 0}
                    />
                    <YAxis
                      tick={{ fill: COLORS.muted, fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(value) =>
                        value >= 1000000
                          ? `${(value / 1000000).toFixed(1)} M`
                          : value >= 1000
                          ? `${Math.round(value / 1000)} k`
                          : value
                      }
                    />
                    <Tooltip content={<TooltipFinance />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={26}
                      iconType="circle"
                      iconSize={6}
                      wrapperStyle={{
                        fontSize: 10,
                        color: COLORS.muted,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="comptabilites"
                      name="Comptabilités"
                      stroke={COLORS.green}
                      strokeWidth={2.4}
                      fill="url(#akGreenGradient)"
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                    <Bar
                      dataKey="sorties"
                      name="Dépenses diverses"
                      fill={COLORS.yellow}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={10}
                      opacity={0.85}
                    />
                    <Line
                      type="monotone"
                      dataKey="sorties"
                      name="Tendance des dépenses"
                      stroke="#B9A04E"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="ak-chart-footer">
              <button
                className="ak-text-button"
                onClick={() => navigateTo("/comptabilite/liste")}
              >
                Voir les opérations <ArrowUpRight size={14} />
              </button>
            </div>
          </article>

          <article className="ak-panel ak-stock-panel">
            <div className="ak-panel-heading ak-panel-heading-tight">
              <div>
                <div className="ak-section-label">
                  <span className="ak-section-dot yellow" />
                  INVENTAIRE
                </div>
                <h2>État du stock</h2>
                <p>Disponibilité des médicaments.</p>
              </div>
              <button
                className="ak-small-icon-button"
                onClick={() => navigateTo("/medicaments")}
                title="Ouvrir les médicaments"
              >
                <ArrowUpRight size={16} />
              </button>
            </div>

            <div className="ak-stock-visual">
              <div className="ak-stock-donut">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockChart}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="72%"
                      outerRadius="94%"
                      paddingAngle={stockSummary.total ? 4 : 0}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {stockChart.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} référence(s)`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="ak-stock-center">
                  <strong>{stockSummary.total}</strong>
                  <span>références</span>
                </div>
              </div>

              <div className="ak-stock-legend">
                {stockChart.map((entry) => (
                  <div className="ak-stock-legend-row" key={entry.name}>
                    <span
                      className="ak-stock-legend-dot"
                      style={{ background: entry.color }}
                    />
                    <span>{entry.name}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="ak-stock-alert">
              <div className="ak-stock-alert-icon">
                <Zap size={15} />
              </div>
              <div>
                <strong>
                  {stockSummary.empty + stockSummary.low === 0
                    ? "Stock sous contrôle"
                    : `${stockSummary.empty + stockSummary.low} référence(s) à vérifier`}
                </strong>
                <span>
                  {stockSummary.empty} rupture(s) · {stockSummary.low} stock(s)
                  faible(s)
                </span>
              </div>
            </div>

            <button
              className="ak-wide-link"
              onClick={() => navigateTo("/medicaments")}
            >
              Gérer les stocks <ChevronRight size={15} />
            </button>
          </article>
        </section>

        <section className="ak-lower-grid">
          <article className="ak-panel ak-activity-panel">
            <div className="ak-panel-heading">
              <div>
                <div className="ak-section-label">
                  <span className="ak-section-dot blue" />
                  JOURNAL OPÉRATIONNEL
                </div>
                <h2>Activité récente</h2>
                <p>Historique unifié des dernières opérations.</p>
              </div>
              <span className="ak-count-pill">
                {filteredActivity.length} opérations
              </span>
            </div>

            <div className="ak-activity-tools">
              <div className="ak-search">
                <Search size={15} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher une opération…"
                  aria-label="Rechercher une opération"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Effacer la recherche"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="ak-filter-tabs">
                {[
                  ["tout", "Tout"],
                  ["comptabilite", "Comptabilité"],
                  ["sortie", "Dépenses"],
                  ["facture", "Factures"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={activeTab === key ? "active" : ""}
                    onClick={() => setActiveTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ak-activity-list">
              {loading ? (
                <div className="ak-empty-state">
                  <span className="ak-loader" />
                  Chargement du journal…
                </div>
              ) : filteredActivity.length === 0 ? (
                <div className="ak-empty-state">
                  <div className="ak-empty-icon">
                    <Command size={19} />
                  </div>
                  <strong>Aucune opération à afficher</strong>
                  <span>
                    Essaie un autre filtre ou enregistre une nouvelle opération.
                  </span>
                </div>
              ) : (
                filteredActivity.slice(0, 9).map((item) => {
                  const Icon =
                    item.type === "comptabilite"
                      ? Stethoscope
                      : item.type === "sortie"
                      ? ArrowDownRight
                      : item.type === "facture"
                      ? FileText
                      : Package;

                  return (
                    <div className="ak-activity-row" key={item.id}>
                      <div className={`ak-activity-icon ${item.type}`}>
                        <Icon size={15} />
                      </div>
                      <div className="ak-activity-info">
                        <strong>{item.title}</strong>
                        <span>
                          {item.patient || "Centre de santé"}
                          <span className="ak-activity-dot-separator">·</span>
                          {item.date.toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                          })}
                          {" · "}
                          {item.date.toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="ak-activity-amount">
                        <strong>{money(item.amount)}</strong>
                        <span>
                          {item.type === "sortie"
                            ? "Dépense"
                            : item.type === "comptabilite"
                            ? "Comptabilisé"
                            : item.type === "facture"
                            ? "Facturation"
                            : "Stock"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="ak-activity-footer">
              <span>
                <Clock3 size={13} />
                Dernières opérations connues
              </span>
              <button
                className="ak-text-button"
                onClick={() => navigateTo("/comptabilite/liste")}
              >
                Ouvrir la comptabilité <ArrowUpRight size={14} />
              </button>
            </div>
          </article>

          <article className="ak-panel ak-calendar-panel">
            <div className="ak-panel-heading ak-calendar-heading">
              <div>
                <div className="ak-section-label">
                  <span className="ak-section-dot yellow" />
                  AGENDA D'ACTIVITÉ
                </div>
                <h2>Calendrier</h2>
                <p>Choisis un jour pour explorer les opérations.</p>
              </div>
              <CalendarDays size={19} className="ak-calendar-heading-icon" />
            </div>

            <div className="ak-calendar-toolbar">
              <strong>{monthLabel}</strong>
              <div className="ak-calendar-nav">
                <button
                  onClick={() =>
                    setCalendarDate(
                      new Date(
                        calendarDate.getFullYear(),
                        calendarDate.getMonth() - 1,
                        1
                      )
                    )
                  }
                  aria-label="Mois précédent"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() =>
                    setCalendarDate(
                      new Date(
                        calendarDate.getFullYear(),
                        calendarDate.getMonth() + 1,
                        1
                      )
                    )
                  }
                  aria-label="Mois suivant"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            <div className="ak-calendar-grid">
              {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
                <div className="ak-calendar-weekday" key={`${day}-${index}`}>
                  {day}
                </div>
              ))}

              {calendarDays.map((item, index) =>
                item ? (
                  <button
                    key={item.key}
                    className={[
                      "ak-calendar-day",
                      item.key === selectedDay ? "selected" : "",
                      item.key === dateKey(new Date()) ? "today" : "",
                      item.count ? "has-activity" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedDay(item.key)}
                    title={`${item.count} opération(s)`}
                  >
                    <span>{item.day}</span>
                    {item.count > 0 && <i />}
                  </button>
                ) : (
                  <div
                    className="ak-calendar-day empty"
                    key={`empty-${index}`}
                  />
                )
              )}
            </div>

            <div className="ak-selected-day">
              <div className="ak-selected-day-heading">
                <div>
                  <span>JOUR SÉLECTIONNÉ</span>
                  <strong>
                    {longDate(
                      parseDate(selectedDay) || new Date()
                    )}
                  </strong>
                </div>
                <span className="ak-day-count">
                  {selectedDayActivity.length}
                </span>
              </div>

              {selectedDayActivity.length === 0 ? (
                <div className="ak-calendar-empty">
                  <Check size={14} />
                  Aucune opération enregistrée ce jour-là.
                </div>
              ) : (
                <div className="ak-day-activity-list">
                  {selectedDayActivity.slice(0, 3).map((item) => (
                    <div className="ak-day-activity" key={item.id}>
                      <span
                        className={`ak-day-activity-marker ${item.type}`}
                      />
                      <span>{item.title}</span>
                      <strong>{money(item.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="ak-bottom-strip">
          <div className="ak-bottom-status">
            <span className="ak-bottom-status-icon">
              <ShieldCheck size={15} />
            </span>
            <div>
              <strong>Contrôle des données</strong>
            </div>
          </div>

          <div className="ak-bottom-balance-breakdown">
            <div>
              <span>Sorties médicaments</span>
              <strong>
                {medicineExpenses == null ? "—" : money(medicineExpenses)}
              </strong>
            </div>
            <span className="ak-breakdown-operator">−</span>
            <div>
              <span>Dépenses diverses</span>
              <strong>
                {miscellaneousExpenses == null
                  ? "—"
                  : money(miscellaneousExpenses)}
              </strong>
            </div>
            <div className="ak-formula-note">
              <Database size={12} />
              Solde calculé côté serveur
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

.ak-dashboard {
  --ak-green: #39866E;
  --ak-ink: #23352E;
  --ak-muted: #84918A;
  min-height: 100%;
  color: var(--ak-ink);
  background:
    radial-gradient(ellipse at 12% 0%, rgba(215, 235, 222, .25), transparent 30%),
    #F6F8F5;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  overflow-x: hidden;
}

.ak-dashboard * { box-sizing: border-box; }
.ak-dashboard button, .ak-dashboard input { font: inherit; }
.ak-dashboard button { cursor: pointer; }
.ak-dashboard button:focus-visible, .ak-dashboard input:focus-visible {
  outline: 2px solid rgba(57,134,110,.5);
  outline-offset: 2px;
}

.ak-topbar {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 28px;
  background: rgba(255,255,255,.94);
  border-bottom: 1px solid #E6ECE6;
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(18px);
}

.ak-brand, .ak-top-context, .ak-top-actions, .ak-balance-inline {
  display: flex;
  align-items: center;
}
.ak-brand { gap: 10px; flex-shrink: 0; }
.ak-brand-symbol {
  width: 35px;
  height: 35px;
  display: grid;
  place-items: center;
  color: white;
  border-radius: 11px;
  background: linear-gradient(145deg, #4B987F, #286A55);
  box-shadow: 0 4px 11px rgba(57,134,110,.19), inset 0 1px rgba(255,255,255,.25);
}
.ak-brand-name {
  font: 800 11px 'Manrope', sans-serif;
  letter-spacing: 1.1px;
}
.ak-brand-sub { font-size: 10px; color: var(--ak-muted); margin-top: 3px; }
.ak-top-context { gap: 8px; color: #68786F; font-size: 10px; }
.ak-live-dot, .ak-footer-live {
  width: 6px; height: 6px; border-radius: 50%;
  background: #50A77D; display: inline-block;
  box-shadow: 0 0 0 3px rgba(80,167,125,.12);
}
.ak-top-separator { width: 1px; height: 15px; background: #E2E8E2; margin: 0 5px; }
.ak-top-date { text-transform: capitalize; }
.ak-top-actions { gap: 12px; }
.ak-balance-inline {
  min-height: 34px; gap: 9px; padding: 0 11px;
  border: 1px solid #E4ECE5; border-radius: 9px;
  background: linear-gradient(110deg, #FAFCF9, #F2F8F3);
}
.ak-balance-icon {
  color: var(--ak-green); display: grid; place-items: center;
}
.ak-balance-caption { color: #718078; font-size: 10px; }
.ak-balance-inline strong {
  font: 800 12px 'Manrope', sans-serif; color: #286C55; white-space: nowrap;
}
.ak-icon-button, .ak-small-icon-button {
  display: grid; place-items: center; border: 1px solid #E2E9E2;
  color: #65756B; background: white; border-radius: 9px;
  transition: .2s ease;
}
.ak-icon-button { width: 34px; height: 34px; }
.ak-icon-button:hover, .ak-small-icon-button:hover {
  color: var(--ak-green); border-color: #B9D7C5; background: #F2F8F3;
  transform: translateY(-1px);
}
.ak-spinning svg { animation: ak-spin .8s linear infinite; }
@keyframes ak-spin { to { transform: rotate(360deg); } }

.ak-main { max-width: 1700px; margin: 0 auto; padding: 24px 28px 16px; }
.ak-heading-row {
  display: flex; justify-content: space-between; align-items: center; gap: 20px;
  margin-bottom: 20px;
}
.ak-eyebrow, .ak-section-label {
  display: flex; align-items: center; gap: 7px;
  font-size: 9px; font-weight: 800; letter-spacing: 1.35px;
  color: #71867A;
}
.ak-eyebrow svg { color: #B39B48; }
.ak-eyebrow-line { width: 30px; height: 1px; background: #D7C986; margin-left: 3px; }
.ak-heading-row h1 {
  font: 800 25px 'Manrope', sans-serif; letter-spacing: -.9px;
  margin: 7px 0 4px; color: #26382F;
}
.ak-heading-sub { margin: 0; color: #87938C; font-size: 11px; }
.ak-heading-controls { display: flex; align-items: center; gap: 15px; }
.ak-updated { display: flex; align-items: center; gap: 7px; color: #7B8980; font-size: 10px; }
.ak-primary-button {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  border: 1px solid #2F795F; color: white; border-radius: 8px;
  padding: 10px 13px; font-size: 11px; font-weight: 700;
  background: linear-gradient(135deg, #4A9479, #31765E);
  box-shadow: 0 4px 9px rgba(49,118,94,.13);
  transition: transform .2s, box-shadow .2s;
}
.ak-primary-button:hover {
  transform: translateY(-2px); box-shadow: 0 7px 15px rgba(49,118,94,.2);
}
.ak-warning-strip {
  display: flex; align-items: center; gap: 9px; padding: 10px 12px;
  border: 1px solid #EADCB2; border-radius: 8px; margin-bottom: 14px;
  background: #FFFBEF; color: #806A2F; font-size: 11px;
}
.ak-warning-strip span { flex: 1; }
.ak-warning-strip button {
  border: 0; background: transparent; color: #705B21; font-weight: 700;
}

.ak-ribbon {
  display: flex; align-items: center; gap: 15px;
  background: rgba(255,255,255,.93); border: 1px solid #E5EBE4;
   min-height: 76px; padding: 12px 16px;
  box-shadow: 0 3px 12px rgba(34,62,43,.025);
  margin-bottom: 16px; position: relative; overflow: hidden;
}

.ak-ribbon-item { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
.ak-ribbon-icon {
  width: 35px; height: 35px; border-radius: 10px;
  display: grid; place-items: center; flex-shrink: 0;
}
.ak-ribbon-icon.green { color: #39866E; background: #E9F4ED; }
.ak-ribbon-icon.blue { color: #6383B3; background: #EEF2FA; }
.ak-ribbon-icon.yellow { color: #A58B34; background: #F9F3DE; }
.ak-ribbon-icon.red { color: #B96460; background: #F9ECEB; }
.ak-ribbon-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ak-ribbon-copy span { color: #849088; font-size: 10px; white-space: nowrap; }
.ak-ribbon-copy strong { font: 800 20px 'Manrope', sans-serif; letter-spacing: -.6px; color: #293B31; }
.ak-ribbon-detail { color: #A0AAA3; font-size: 9px; margin-left: auto; white-space: nowrap; }
.ak-ribbon-divider { width: 1px; height: 32px; background: #E9EDE8; flex-shrink: 0; }
.ak-ribbon-status {
  display: flex; align-items: center; gap: 5px; align-self: flex-start;
  color: #5B8D70; font-size: 9px; white-space: nowrap; margin-left: 4px;
}

.ak-analysis-grid {
  display: grid; grid-template-columns: minmax(0, 1.95fr) minmax(280px, .85fr);
  gap: 16px; margin-bottom: 16px;
}
.ak-panel {
  border: 1px solid #E4EAE3; background: rgba(255,255,255,.96);
  border-radius: 12px; min-width: 0; overflow: hidden;
  box-shadow: 0 3px 13px rgba(33,57,40,.025);
  transition: border-color .25s, box-shadow .25s;
  animation: ak-enter .45s ease both;
}
.ak-panel:hover { border-color: #D5E3D7; box-shadow: 0 7px 23px rgba(33,57,40,.045); }
@keyframes ak-enter {
  from { opacity: 0; transform: translateY(7px); }
  to { opacity: 1; transform: translateY(0); }
}
.ak-finance-panel { padding: 19px 19px 0; }
.ak-stock-panel { padding: 19px 18px 0; }
.ak-panel-heading {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
}
.ak-panel-heading h2 {
  font: 800 15px 'Manrope', sans-serif; margin: 6px 0 4px;
  letter-spacing: -.3px; color: #293B31;
}
.ak-panel-heading p { margin: 0; color: #8A968E; font-size: 10px; line-height: 1.5; }
.ak-section-label { font-size: 8px; letter-spacing: 1.1px; }
.ak-section-dot { width: 6px; height: 6px; border-radius: 50%; background: #4B987B; }
.ak-section-dot.yellow { background: #D2B45A; }
.ak-section-dot.blue { background: #7392C0; }
.ak-period-switch {
  display: flex; gap: 2px; padding: 3px; border: 1px solid #E9EDE8;
  background: #F6F8F5; border-radius: 8px;
}
.ak-period-switch button {
  border: 0; border-radius: 5px; padding: 6px 9px;
  background: transparent; color: #829087; font-size: 10px; font-weight: 700;
  transition: .2s;
}
.ak-period-switch button.active {
  color: #34765D; background: white; box-shadow: 0 1px 4px #203b2910;
}
.ak-chart-summary {
  display: flex; align-items: center; gap: 22px; padding: 16px 0 9px;
  border-bottom: 1px solid #F0F2EF; margin-top: 7px;
}
.ak-chart-metric { display: grid; grid-template-columns: 7px auto; align-items: center; column-gap: 6px; row-gap: 4px; }
.ak-chart-metric-dot { width: 6px; height: 6px; border-radius: 50%; grid-row: 1; }
.ak-chart-metric-dot.green { background: #39866E; }
.ak-chart-metric-dot.yellow { background: #D5B85D; }
.ak-chart-metric-label { color: #8B978F; font-size: 9px; }
.ak-chart-metric strong {
  grid-column: 2; font: 800 14px 'Manrope', sans-serif; color: #2F4337;
}
.ak-chart-metric-last { margin-left: auto; text-align: right; }
.ak-chart-metric-last .ak-chart-metric-label { grid-column: 1 / -1; }
.ak-chart-metric-last strong { grid-column: 1 / -1; }
.ak-finance-chart { width: 100%; height: 260px; padding-top: 13px; }
.ak-chart-loading, .ak-empty-state {
  display: flex; align-items: center; justify-content: center; flex-direction: column;
  gap: 9px; height: 100%; color: #87948B; font-size: 11px;
}
.ak-loader {
  display: inline-block; width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid #E0EBE2; border-top-color: #438B74;
  animation: ak-spin .7s linear infinite;
}
.ak-tooltip {
  background: rgba(255,255,255,.98); border: 1px solid #E4EAE4;
  border-radius: 9px; padding: 11px 12px; min-width: 190px;
  box-shadow: 0 9px 30px rgba(27,53,36,.12);
}
.ak-tooltip-date { font-size: 10px; color: #87948B; margin-bottom: 8px; text-transform: capitalize; }
.ak-tooltip-row { display: flex; align-items: center; gap: 7px; font-size: 10px; margin-top: 6px; color: #68776D; }
.ak-tooltip-row strong { margin-left: auto; color: #2D4034; font-weight: 700; }
.ak-tooltip-dot { width: 6px; height: 6px; border-radius: 50%; }
.ak-chart-footer {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  min-height: 42px; border-top: 1px solid #EDF1EC;
}
.ak-chart-footer-note { display: flex; align-items: center; gap: 7px; color: #8A978E; font-size: 9px; }
.ak-chart-footer-note svg { flex-shrink: 0; color: #9AAA9D; }
.ak-text-button {
  display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
  border: 0; background: transparent; color: #39866E; font-size: 10px;
  font-weight: 700; padding: 5px 0; transition: gap .2s;
}
.ak-text-button:hover { gap: 8px; color: #24664F; }

.ak-panel-heading-tight { align-items: center; }
.ak-small-icon-button { width: 30px; height: 30px; }
.ak-stock-visual {
  display: flex; align-items: center; justify-content: space-around; gap: 8px;
  padding: 15px 0 14px; min-height: 172px;
}
.ak-stock-donut { width: 142px; height: 142px; position: relative; flex-shrink: 0; }
.ak-stock-center {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  flex-direction: column; pointer-events: none;
}
.ak-stock-center strong { font: 800 25px 'Manrope', sans-serif; color: #2D4135; letter-spacing: -1px; }
.ak-stock-center span { color: #89968D; font-size: 9px; margin-top: 1px; }
.ak-stock-legend { display: flex; flex-direction: column; gap: 13px; flex: 1; min-width: 0; }
.ak-stock-legend-row { display: grid; grid-template-columns: 7px minmax(0,1fr) auto; gap: 6px; align-items: center; }
.ak-stock-legend-dot { width: 6px; height: 6px; border-radius: 50%; }
.ak-stock-legend-row span:nth-child(2) { color: #78867D; font-size: 10px; }
.ak-stock-legend-row strong { color: #33463A; font: 800 12px 'Manrope', sans-serif; }
.ak-stock-alert {
  display: flex; align-items: center; gap: 9px; padding: 11px;
  background: #F8FAF5; border: 1px solid #EDF0E3; border-radius: 9px;
}
.ak-stock-alert-icon {
  display: grid; place-items: center; width: 28px; height: 28px; flex-shrink: 0;
  background: #F6F0DA; color: #9C8536; border-radius: 8px;
}
.ak-stock-alert > div:last-child { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ak-stock-alert strong { font-size: 10px; color: #4A594C; }
.ak-stock-alert span { font-size: 9px; color: #929D91; }
.ak-wide-link {
  display: flex; align-items: center; justify-content: space-between; width: 100%;
  padding: 13px 0; border: 0; background: transparent; color: #438B74;
  font-weight: 700; font-size: 10px;
}
.ak-wide-link:hover { color: #245F49; }

.ak-lower-grid {
  display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(330px, .85fr);
  gap: 16px; margin-bottom: 16px;
}
.ak-activity-panel, .ak-calendar-panel { padding: 18px; }
.ak-count-pill {
  padding: 6px 8px; background: #F2F7F1; color: #62826C;
  border: 1px solid #E5EDE2; border-radius: 6px; font-size: 9px; white-space: nowrap;
}
.ak-activity-tools {
  display: flex; align-items: center; gap: 10px; margin: 15px 0 6px;
}
.ak-search {
  display: flex; align-items: center; gap: 7px; flex: 1; min-width: 120px;
  border: 1px solid #E7ECE6; border-radius: 7px; background: #FAFBF9;
  padding: 0 9px; height: 32px; color: #98A39B;
}
.ak-search input { min-width: 0; width: 100%; border: 0; outline: none; background: transparent; color: #34463A; font-size: 10px; }
.ak-search input::placeholder { color: #A2ACA4; }
.ak-search button { display: grid; place-items: center; border: 0; background: transparent; color: #8C988F; padding: 2px; }
.ak-filter-tabs { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.ak-filter-tabs button {
  border: 1px solid transparent; background: transparent; color: #87948B;
  padding: 7px 8px; border-radius: 6px; font-size: 9px; white-space: nowrap;
}
.ak-filter-tabs button.active {
  color: #35765D; border-color: #E1ECE2; background: #F0F7F1; font-weight: 700;
}
.ak-activity-list { min-height: 170px; }
.ak-activity-row {
  display: flex; align-items: center; gap: 10px; min-height: 53px;
  border-bottom: 1px solid #F0F2EF; transition: background .2s; padding: 5px 3px;
}
.ak-activity-row:hover { background: #FAFCF9; }
.ak-activity-icon {
  width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0;
}
.ak-activity-icon.comptabilite { background: #EAF4ED; color: #43866C; }
.ak-activity-icon.sortie { background: #FAF1DF; color: #A28A3C; }
.ak-activity-icon.facture { background: #EDF1FA; color: #6A85B5; }
.ak-activity-icon.medicament { background: #F5ECEB; color: #B66C65; }
.ak-activity-info { display: flex; flex-direction: column; gap: 5px; min-width: 0; flex: 1; }
.ak-activity-info strong {
  font-size: 10px; color: #3B4B40; font-weight: 700;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ak-activity-info > span {
  font-size: 9px; color: #98A299; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.ak-activity-dot-separator { margin: 0 5px; color: #D1D8D0; }
.ak-activity-amount { text-align: right; display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
.ak-activity-amount strong { color: #35483B; font: 700 10px 'Manrope', sans-serif; }
.ak-activity-amount span { font-size: 9px; color: #9AA49B; }
.ak-empty-state { min-height: 190px; text-align: center; }
.ak-empty-state strong { font-size: 11px; color: #53645A; }
.ak-empty-state > span:not(.ak-loader) { max-width: 230px; line-height: 1.5; font-size: 10px; }
.ak-empty-icon {
  width: 38px; height: 38px; display: grid; place-items: center;
  border-radius: 12px; color: #7C9A84; background: #EDF5ED;
}
.ak-activity-footer {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding-top: 12px; border-top: 1px solid #EEF1ED;
}
.ak-activity-footer > span { display: flex; align-items: center; gap: 5px; color: #99A39B; font-size: 9px; }

.ak-calendar-heading-icon { color: #B6A35C; }
.ak-calendar-toolbar {
  display: flex; align-items: center; justify-content: space-between; margin: 19px 0 11px;
}
.ak-calendar-toolbar > strong {
  font: 800 12px 'Manrope', sans-serif; color: #3A4C40; text-transform: capitalize;
}
.ak-calendar-nav { display: flex; gap: 4px; }
.ak-calendar-nav button {
  display: grid; place-items: center; width: 25px; height: 25px;
  border: 1px solid #E6EBE4; background: white; color: #748278; border-radius: 6px;
}
.ak-calendar-nav button:hover { background: #F1F7F0; color: #39866E; }
.ak-calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0,1fr)); gap: 4px; }
.ak-calendar-weekday {
  text-align: center; color: #A0AAA2; font-size: 9px; font-weight: 700; padding-bottom: 5px;
}
.ak-calendar-day {
  border: 1px solid transparent; background: transparent; min-width: 0;
  height: 31px; border-radius: 7px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 3px;
  color: #58695D; font-size: 10px; position: relative; transition: .16s;
}
.ak-calendar-day:hover { background: #F0F6EF; border-color: #E0EBDF; }
.ak-calendar-day.today { color: #33785D; border-color: #B7D7BF; font-weight: 800; }
.ak-calendar-day.selected { color: white; background: #438B74; border-color: #438B74; box-shadow: 0 3px 8px #438b742c; }
.ak-calendar-day i { display: block; width: 3px; height: 3px; border-radius: 50%; background: #D1B654; }
.ak-calendar-day.selected i { background: #F7E6A5; }
.ak-calendar-day.empty { pointer-events: none; }
.ak-selected-day {
  margin-top: 15px; padding-top: 12px; border-top: 1px solid #EEF1EC;
}
.ak-selected-day-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ak-selected-day-heading > div { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.ak-selected-day-heading span:first-child {
  font-size: 8px; letter-spacing: .9px; color: #9AA59C; font-weight: 800;
}
.ak-selected-day-heading strong { font-size: 10px; color: #526357; text-transform: capitalize; }
.ak-day-count {
  display: grid; place-items: center; min-width: 24px; height: 24px;
  padding: 0 6px; border-radius: 7px; background: #F0F6EF; color: #43866C;
  font-weight: 800; font-size: 10px;
}
.ak-calendar-empty {
  display: flex; align-items: center; gap: 7px; color: #98A39A;
  font-size: 9px; margin-top: 12px;
}
.ak-calendar-empty svg { color: #6D9B78; }
.ak-day-activity-list { margin-top: 8px; }
.ak-day-activity {
  display: flex; align-items: center; gap: 7px; padding: 7px 0;
  border-bottom: 1px solid #F1F3F0; font-size: 9px; color: #78867B;
}
.ak-day-activity:last-child { border-bottom: 0; }
.ak-day-activity-marker { width: 5px; height: 5px; border-radius: 50%; background: #438B74; flex-shrink: 0; }
.ak-day-activity-marker.sortie { background: #D2B45A; }
.ak-day-activity-marker.facture { background: #7392C0; }
.ak-day-activity-marker.medicament { background: #C76D69; }
.ak-day-activity > span:nth-child(2) { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ak-day-activity strong { font-size: 9px; color: #435448; }

.ak-bottom-strip {
  display: flex; align-items: center; justify-content: space-between; gap: 18px;
  background: linear-gradient(105deg, #F1F7F0, #FCFCF7);
  border: 1px solid #E1EADF; border-radius: 10px; padding: 13px 16px;
}
.ak-bottom-status { display: flex; align-items: center; gap: 10px; min-width: 0; }
.ak-bottom-status-icon {
  display: grid; place-items: center; width: 30px; height: 30px;
  color: #47876C; background: #E2F0E3; border-radius: 9px; flex-shrink: 0;
}
.ak-bottom-status > div { display: flex; flex-direction: column; gap: 4px; }
.ak-bottom-status strong { font-size: 10px; color: #43574A; }
.ak-bottom-status span:not(.ak-bottom-status-icon) { color: #8A998B; font-size: 9px; }
.ak-bottom-balance-breakdown { display: flex; align-items: center; gap: 13px; }
.ak-bottom-balance-breakdown > div:not(.ak-formula-note) { display: flex; flex-direction: column; gap: 4px; }
.ak-bottom-balance-breakdown > div > span { font-size: 9px; color: #849286; white-space: nowrap; }
.ak-bottom-balance-breakdown strong { font: 800 11px 'Manrope', sans-serif; color: #3E5846; }
.ak-breakdown-operator { color: #A7B1A4; font-size: 15px; }
.ak-formula-note {
  display: flex; align-items: center; gap: 5px; color: #87958A;
  font-size: 9px; border-left: 1px solid #DDE6D9; padding-left: 12px; white-space: nowrap;
}
.ak-footer {
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding: 15px 2px 2px; color: #A1AAA2; font-size: 9px;
}
.ak-footer-separator { margin: 0 5px; color: #CBD3C9; }
.ak-footer > span:last-child { display: flex; align-items: center; gap: 7px; }
.ak-footer-live { width: 5px; height: 5px; }

@media (min-width: 1500px) {
  .ak-main { padding-left: 34px; padding-right: 34px; }
  .ak-finance-chart { height: 290px; }
  .ak-stock-donut { width: 155px; height: 155px; }
  .ak-calendar-day { height: 35px; }
}

@media (max-width: 1150px) {
  .ak-main { padding: 20px 18px 14px; }
  .ak-topbar { padding: 0 18px; }
  .ak-ribbon { gap: 10px; padding: 11px; }
  .ak-ribbon-detail { display: none; }
  .ak-ribbon-status { display: none; }
  .ak-analysis-grid { grid-template-columns: minmax(0, 1.5fr) minmax(260px, .8fr); }
  .ak-lower-grid { grid-template-columns: minmax(0, 1.2fr) minmax(300px, .8fr); }
  .ak-filter-tabs button { padding: 7px 6px; }
}

@media (max-width: 850px) {
  .ak-top-context { display: none; }
  .ak-heading-row { align-items: flex-start; }
  .ak-analysis-grid, .ak-lower-grid { grid-template-columns: 1fr; }
  .ak-stock-panel { padding-bottom: 0; }
  .ak-stock-visual { justify-content: flex-start; gap: 24px; }
  .ak-stock-donut { width: 150px; height: 150px; }
  .ak-stock-legend { max-width: 260px; }
  .ak-ribbon { flex-wrap: wrap; }
  .ak-ribbon-item { flex-basis: calc(50% - 15px); }
  .ak-ribbon-divider { display: none; }
  .ak-bottom-strip { align-items: flex-start; flex-direction: column; }
  .ak-bottom-balance-breakdown { width: 100%; flex-wrap: wrap; }
}

@media (max-width: 560px) {
  .ak-topbar { height: 58px; padding: 0 12px; gap: 8px; }
  .ak-brand-symbol { width: 31px; height: 31px; }
  .ak-brand-name { font-size: 10px; }
  .ak-brand-sub { font-size: 9px; }
  .ak-balance-inline { gap: 6px; padding: 0 7px; }
  .ak-balance-caption { display: none; }
  .ak-balance-inline strong { font-size: 10px; }
  .ak-top-actions { gap: 6px; }
  .ak-main { padding: 17px 10px 12px; }
  .ak-heading-row { flex-direction: column; gap: 12px; margin-bottom: 15px; }
  .ak-heading-row h1 { font-size: 22px; }
  .ak-heading-controls { width: 100%; justify-content: space-between; gap: 8px; }
  .ak-updated { font-size: 9px; }
  .ak-primary-button { padding: 9px; font-size: 10px; }
  .ak-ribbon { padding: 12px 10px; gap: 14px 8px; }
  .ak-ribbon-item { flex-basis: calc(50% - 5px); gap: 7px; }
  .ak-ribbon-icon { width: 30px; height: 30px; border-radius: 8px; }
  .ak-ribbon-copy span { font-size: 9px; }
  .ak-ribbon-copy strong { font-size: 17px; }
  .ak-panel { border-radius: 10px; }
  .ak-finance-panel, .ak-stock-panel, .ak-activity-panel, .ak-calendar-panel { padding: 14px; }
  .ak-panel-heading h2 { font-size: 14px; }
  .ak-panel-heading p { font-size: 9px; }
  .ak-period-switch button { padding: 6px 7px; }
  .ak-chart-summary { gap: 12px; flex-wrap: wrap; }
  .ak-chart-metric-label { font-size: 8px; }
  .ak-chart-metric strong { font-size: 12px; }
  .ak-chart-metric-last { margin-left: 0; text-align: left; }
  .ak-finance-chart { height: 235px; }
  .ak-chart-footer { align-items: flex-start; flex-direction: column; padding: 10px 0; }
  .ak-stock-visual { gap: 10px; }
  .ak-stock-donut { width: 125px; height: 125px; }
  .ak-stock-legend-row span:nth-child(2) { font-size: 9px; }
  .ak-activity-tools { align-items: stretch; flex-direction: column; }
  .ak-filter-tabs { overflow-x: auto; }
  .ak-filter-tabs button { flex: 1; }
  .ak-activity-info strong { max-width: 155px; }
  .ak-activity-amount strong { font-size: 9px; }
  .ak-activity-footer { align-items: flex-start; flex-direction: column; }
  .ak-bottom-balance-breakdown { gap: 10px; }
  .ak-formula-note { width: 100%; border-left: 0; padding-left: 0; }
  .ak-footer { align-items: flex-start; flex-direction: column; }
}
`;

export default Dashboard;