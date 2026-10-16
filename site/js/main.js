(() => {
  "use strict";

  const COLORS = {
    ink: "#163b35", orange: "#b85738", lime: "#c6ea72", teal: "#2b6b5b",
    blue: "#577c9e", gold: "#916e12", lilac: "#795e8e", pale: "#66786c",
    rose: "#b45460", slate: "#536a66"
  };
  const SOURCE_LABELS = {
    "Bioenergy": "Biyoenerji",
    "Gas": "Doğalgaz",
    "Hard coal": "Taş kömürü",
    "Hydro": "Hidroelektrik",
    "Lignite": "Linyit",
    "Nuclear": "Nükleer",
    "Onshore wind": "Karasal rüzgâr",
    "Other fossil": "Diğer fosil",
    "Other renewables": "Diğer yenilenebilir",
    "Solar": "Güneş"
  };
  const SOURCE_COLORS = {
    "Hydro": COLORS.blue,
    "Gas": COLORS.orange,
    "Hard coal": COLORS.ink,
    "Lignite": COLORS.slate,
    "Onshore wind": COLORS.teal,
    "Solar": COLORS.gold,
    "Bioenergy": COLORS.lilac,
    "Other renewables": COLORS.pale,
    "Other fossil": COLORS.rose,
    "Nuclear": "#b8a19a"
  };
  const STEP_META = {
    "growth": { kicker: "BULGU 01 / ÖLÇEK", title: "Elektrik üretimi 2000–2024 arasında nasıl değişti?", description: "Türkiye'nin yıllara göre toplam elektrik üretimi.", note: "Dikey eksen: elektrik üretimi (TWh)" },
    "shares": { kicker: "BULGU 02 / PAYLAR", title: "Fosil payı gerilerken yenilenebilirlerin payı yükseldi", description: "Toplam üretim içindeki payın zamanla değişimi.", note: "Dikey eksen: toplam üretim içindeki pay (%)" },
    "mix": { kicker: "BULGU 03 / KAYNAK KARMASI", title: "Elektrik kaynaklarının ağırlığı yıllar içinde değişti", description: "Birbirini dışlayan ayrıntılı kaynak bileşenlerinin üretim payı.", note: "Dikey eksen: toplam üretim içindeki pay (%)" },
    "source-change": { kicker: "BULGU 04 / MUTLAK FARK", title: "Hangi kaynakların üretimi en çok arttı?", description: "2000 ve 2024 arasındaki üretim farkı; kaynak bileşenleri çifte sayılmaz.", note: "Yatay eksen: üretim farkı (TWh)" },
    "renewables": { kicker: "BULGU 05 / YENİLENEBİLİRLER", title: "Hidroelektrik, rüzgâr ve güneş aynı eğriyi izlemedi", description: "Seçili yenilenebilir kaynakların üretim miktarı.", note: "Dikey eksen: elektrik üretimi (TWh)" },
    "amounts": { kicker: "BULGU 06 / MİKTAR VE PAY", title: "Pay düşerken fosil üretimi de artabilir mi?", description: "Fosil ve yenilenebilir kaynaklardan gelen yıllık üretim miktarı.", note: "Dikey eksen: elektrik üretimi (TWh)" }
  };

  let annual = [];
  let mix = [];
  let sourceChange = [];
  let metrics = null;
  let activeStep = "growth";

  const $ = (id) => document.getElementById(id);
  const numberTR = (value, digits = 1) => Number(value).toLocaleString("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const integerTR = (value) => Number(value).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  const signedTR = (value, digits = 1) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${numberTR(Math.abs(value), digits)}`;
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) { row.push(field); field = ""; }
      else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && text[i + 1] === "\n") i += 1;
        row.push(field); field = "";
        if (row.some((cell) => cell !== "")) rows.push(row);
        row = [];
      } else field += char;
    }
    if (field.length || row.length) { row.push(field); if (row.some((cell) => cell !== "")) rows.push(row); }
    if (!rows.length) return [];
    const headers = rows[0].map((header) => header.trim());
    return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? "").trim()])));
  }

  async function loadData() {
    const [annualRes, mixRes, changeRes, metricsRes] = await Promise.all([
      fetch("./data/annual_metrics.csv"),
      fetch("./data/generation_mix.csv"),
      fetch("./data/source_change_2000_2024.csv"),
      fetch("./data/story_metrics.json")
    ]);
    if (![annualRes, mixRes, changeRes, metricsRes].every((response) => response.ok)) throw new Error("Analiz çıktıları yüklenemedi. Siteyi proje klasöründen yerel sunucuyla açın.");
    const [annualText, mixText, changeText, metricsJson] = await Promise.all([
      annualRes.text(), mixRes.text(), changeRes.text(), metricsRes.json()
    ]);
    annual = parseCSV(annualText).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === "" ? null : (key === "Year" ? Number(value) : Number.isNaN(Number(value)) ? value : Number(value))])));
    mix = parseCSV(mixText).map((row) => ({ Year: Number(row.Year), source: row.source, generation_twh: Number(row.generation_twh), share_pct: Number(row.share_pct) }));
    sourceChange = parseCSV(changeText).map((row) => ({ ...row, generation_2000_twh: Number(row.generation_2000_twh), generation_2024_twh: Number(row.generation_2024_twh), absolute_change_twh: Number(row.absolute_change_twh), share_2000_pct: Number(row.share_2000_pct), share_2024_pct: Number(row.share_2024_pct), share_change_pp: Number(row.share_change_pp) }));
    metrics = metricsJson;
    renderHeadlineMetrics();
    populateSourceSelect();
    renderStoryChart("growth");
    renderExplorer();
    bindStorySteps();
    bindControls();
  }

  function renderHeadlineMetrics() {
    const m = metrics.metrics;
    const multiplier = m.total_generation_end_twh / m.total_generation_start_twh;
    $("hero-multiplier").textContent = `${numberTR(multiplier, 1)} katına`;
    $("stat-total-start").textContent = numberTR(m.total_generation_start_twh, 2);
    $("stat-total-end").textContent = numberTR(m.total_generation_end_twh, 2);
    $("stat-fossil-change").textContent = signedTR(m.fossil_share_change_pp, 1);
    $("text-total-start").textContent = numberTR(m.total_generation_start_twh, 2);
    $("text-total-end").textContent = numberTR(m.total_generation_end_twh, 2);
    $("text-total-growth").textContent = `%${numberTR(m.total_generation_change_pct, 1)}`;
    $("text-fossil-share-start").textContent = `%${numberTR(m.fossil_share_start_pct, 1)}`;
    $("text-fossil-share-end").textContent = `%${numberTR(m.fossil_share_end_pct, 1)}`;
    $("text-renew-share-start").textContent = `%${numberTR(m.renewables_share_start_pct, 1)}`;
    $("text-renew-share-end").textContent = `%${numberTR(m.renewables_share_end_pct, 1)}`;
    $("text-top-source").textContent = SOURCE_LABELS[m.largest_absolute_source_increase] || m.largest_absolute_source_increase;
    $("text-top-source-change").textContent = signedTR(m.largest_absolute_source_increase_twh, 2);
    $("text-fossil-amount-start").textContent = numberTR(m.fossil_generation_start_twh, 2);
    $("text-fossil-amount-end").textContent = numberTR(m.fossil_generation_end_twh, 2);
  }

  function populateSourceSelect() {
    const select = $("source-select");
    const sources = [...new Set(mix.map((row) => row.source))].sort((a, b) => (SOURCE_LABELS[a] || a).localeCompare(SOURCE_LABELS[b] || b, "tr"));
    select.innerHTML = sources.map((source) => `<option value="${esc(source)}">${esc(SOURCE_LABELS[source] || source)}</option>`).join("");
    select.value = "Hydro";
  }

  function svgStart(title, desc, viewBox = "0 0 900 520") {
    return `<title>${esc(title)}</title><desc>${esc(desc)}</desc><g class="plot-layer">`;
  }
  function svgEnd() { return "</g>"; }
  function textEl(x, y, text, cls = "svg-tick", anchor = "middle", extra = "") { return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}" ${extra}>${esc(text)}</text>`; }
  function lineEl(x1, y1, x2, y2, cls = "svg-grid") { return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`; }
  function pathEl(path, cls, extra = "") { return `<path d="${path}" class="${cls}" ${extra}/>`; }

  function chartGeometry(width = 900, height = 520, margins = { left: 88, right: 34, top: 44, bottom: 74 }) {
    return { width, height, margins, plotW: width - margins.left - margins.right, plotH: height - margins.top - margins.bottom, x0: margins.left, y0: margins.top };
  }
  function chooseTicks(min, max, desired = 5) {
    if (max === min) return [min];
    const raw = (max - min) / desired;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const candidates = [1, 2, 2.5, 5, 10].map((n) => n * pow);
    const step = candidates.find((n) => n >= raw) || candidates[candidates.length - 1];
    const result = [];
    for (let value = Math.ceil(min / step) * step; value <= max + step * 0.001; value += step) result.push(Number(value.toPrecision(5)));
    if (!result.length) result.push(min, max);
    return result;
  }
  function renderAxes({ g, yMin, yMax, yLabel, xLabel, xValues, yDigits = 0 }) {
    let svg = "";
    const y = (value) => g.y0 + g.plotH - ((value - yMin) / (yMax - yMin || 1)) * g.plotH;
    const x = (index) => g.x0 + (xValues.length === 1 ? g.plotW / 2 : (index / (xValues.length - 1)) * g.plotW);
    chooseTicks(yMin, yMax, 4).forEach((tick) => {
      const py = y(tick);
      svg += lineEl(g.x0, py, g.x0 + g.plotW, py, "svg-grid");
      svg += textEl(g.x0 - 12, py + 4, numberTR(tick, yDigits), "svg-tick", "end");
    });
    svg += lineEl(g.x0, g.y0, g.x0, g.y0 + g.plotH, "svg-axis");
    svg += lineEl(g.x0, g.y0 + g.plotH, g.x0 + g.plotW, g.y0 + g.plotH, "svg-axis");
    const labelIndices = [...new Set([0, ...xValues.map((_, i) => i).filter((i) => i > 0 && i < xValues.length - 1 && (i % Math.ceil(xValues.length / 6) === 0)), xValues.length - 1])];
    labelIndices.forEach((index) => { svg += textEl(x(index), g.y0 + g.plotH + 26, xValues[index], "svg-tick"); });
    svg += textEl(g.x0 + g.plotW / 2, g.y0 + g.plotH + 55, xLabel, "svg-axis-title");
    if (yLabel) svg += `<text x="22" y="${g.y0 + g.plotH / 2}" transform="rotate(-90 22 ${g.y0 + g.plotH / 2})" text-anchor="middle" class="svg-axis-title">${esc(yLabel)}</text>`;
    return { svg, x, y };
  }

  function renderLineChart({ title, desc, rows, xKey = "Year", series, yLabel, unit, yMin = 0, yMax = null, height = 520, width = 900, xLabel = "Yıl" }) {
    const allValues = series.flatMap((item) => rows.map((row) => Number(row[item.key])).filter(Number.isFinite));
    if (yMax === null) yMax = Math.max(...allValues) * 1.14 || 1;
    const g = chartGeometry(width, height, { left: 100, right: 40, top: 45, bottom: 78 });
    const xValues = rows.map((row) => String(row[xKey]));
    const { svg: axes, x, y } = renderAxes({ g, yMin, yMax, yLabel, xLabel, xValues, yDigits: yMax <= 10 ? 1 : 0 });
    let content = axes;
    series.forEach((item, sIndex) => {
      const points = rows.map((row, index) => ({ x: x(index), y: y(Number(row[item.key])), value: Number(row[item.key]), year: row[xKey] })).filter((point) => Number.isFinite(point.value));
      if (!points.length) return;
      const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
      content += pathEl(path, "svg-line", `stroke="${item.color}"`);
      const every = Math.max(1, Math.floor(points.length / 12));
      points.forEach((point, index) => {
        if (index % every === 0 || index === points.length - 1) content += `<circle cx="${point.x}" cy="${point.y}" r="3.5" class="svg-point" fill="${item.color}"/>`;
      });
      const start = points[0];
      const end = points[points.length - 1];
      const startLabelY = Math.min(g.y0 + g.plotH - 8, Math.max(g.y0 + 16, start.y + (sIndex % 2 === 0 ? -10 : 17)));
      const endLabelY = Math.min(g.y0 + g.plotH - 10, Math.max(g.y0 + 13, end.y - 10 - sIndex * 14));
      if (series.length <= 2) content += textEl(start.x + 7, startLabelY, `${numberTR(start.value, 1)} ${unit}`, "svg-end-label", "start");
      content += textEl(end.x - 2, endLabelY, `${numberTR(end.value, 1)} ${unit}`, "svg-end-label", "end");
    });
    const compact = window.innerWidth <= 500;
    const legendCharWidth = compact ? 14 : 7;
    const legendCap = compact ? 280 : 140;
    const totalLegendW = series.reduce((sum, item) => sum + 36 + Math.min(legendCap, item.label.length * legendCharWidth), 0);
    let legendX = Math.max(g.x0, (width - totalLegendW) / 2);
    const legendY = height - 8;
    series.forEach((item) => {
      content += `<line x1="${legendX}" y1="${legendY - 4}" x2="${legendX + 20}" y2="${legendY - 4}" stroke="${item.color}" stroke-width="4" stroke-linecap="round"/>`;
      content += textEl(legendX + 27, legendY, item.label, "svg-legend", "start");
      legendX += 36 + Math.min(legendCap, item.label.length * legendCharWidth);
    });
    return svgStart(title, desc, `0 0 ${width} ${height}`) + content + svgEnd();
  }

  function renderStackedArea({ title, desc, rows, sources, height = 520, width = 900 }) {
    const compact = window.innerWidth <= 500;
    const g = chartGeometry(width, 560, { left: 94, right: 30, top: 44, bottom: 118 });
    const xValues = rows.map((row) => String(row.Year));
    const { svg: axes, x, y } = renderAxes({ g, yMin: 0, yMax: 100, yLabel: "Üretim payı (%)", xLabel: "Yıl", xValues, yDigits: 0 });
    let content = axes;
    const sums = rows.map((row) => sources.reduce((sum, source) => sum + Number(row[source.key] || 0), 0));
    const normalized = rows.map((row, rowIndex) => {
      const values = sources.map((source) => Math.max(0, Number(row[source.key] || 0)));
      const total = values.reduce((sum, value) => sum + value, 0);
      return values.map((value) => total > 0 ? (value / total) * 100 : 0);
    });
    let cumulative = rows.map(() => 0);
    sources.forEach((source, sourceIndex) => {
      const lower = cumulative.slice();
      cumulative = cumulative.map((value, rowIndex) => value + normalized[rowIndex][sourceIndex]);
      const upperPts = rows.map((_, index) => [x(index), y(cumulative[index])]);
      const lowerPts = rows.map((_, index) => [x(index), y(lower[index])]).reverse();
      const polygon = [...upperPts, ...lowerPts].map(([px, py], index) => `${index === 0 ? "M" : "L"}${px.toFixed(2)} ${py.toFixed(2)}`).join(" ") + " Z";
      content += `<path d="${polygon}" fill="${source.color}" fill-opacity=".88" stroke="#fffef8" stroke-width=".65"/>`;
    });
    let lx = g.x0, ly = 520;
    const legendColumns = compact ? 3 : 5;
    const legendCharWidth = compact ? 14 : 7;
    sources.forEach((source, i) => {
      const label = source.label;
      if (i > 0 && i % legendColumns === 0) { lx = g.x0; ly += compact ? 22 : 21; }
      content += `<rect x="${lx}" y="${ly - 11}" width="10" height="10" rx="2" fill="${source.color}"/>`;
      content += textEl(lx + 15, ly - 2, label, "svg-legend", "start");
      lx += 20 + label.length * legendCharWidth;
    });
    return svgStart(title, desc, `0 0 ${width} 560`) + content + svgEnd();
  }

  function renderBarChart({ title, desc, rows, height = 520, width = 900 }) {
    const ordered = [...rows].sort((a, b) => b.absolute_change_twh - a.absolute_change_twh).slice(0, 10);
    const compact = window.innerWidth <= 500;
    const left = compact ? 240 : 185, right = compact ? 50 : 56, top = 43, bottom = 50;
    const plotW = width - left - right, plotH = height - top - bottom;
    const maxAbs = Math.max(...ordered.map((row) => Math.abs(row.absolute_change_twh)), 1);
    const minVal = Math.min(0, ...ordered.map((row) => row.absolute_change_twh));
    const maxVal = Math.max(0, ...ordered.map((row) => row.absolute_change_twh));
    const span = maxVal - minVal || 1;
    const x = (value) => left + ((value - minVal) / span) * plotW;
    const rowH = plotH / ordered.length;
    let content = "";
    chooseTicks(minVal, maxVal, 5).forEach((tick) => {
      content += lineEl(x(tick), top, x(tick), top + plotH, "svg-grid");
      content += textEl(x(tick), top + plotH + 24, numberTR(tick, 0), "svg-tick");
    });
    content += lineEl(x(0), top, x(0), top + plotH, "svg-axis");
    ordered.forEach((row, index) => {
      const y = top + index * rowH + rowH * .2;
      const barH = rowH * .54;
      const val = row.absolute_change_twh;
      const zeroX = x(0), endX = x(val);
      const color = val >= 0 ? (row.source === "Hard coal" ? COLORS.orange : COLORS.teal) : COLORS.blue;
      content += textEl(left - 14, y + barH * .72, SOURCE_LABELS[row.source] || row.source, "svg-bar-label", "end");
      content += `<rect x="${Math.min(zeroX, endX)}" y="${y}" width="${Math.max(1, Math.abs(endX-zeroX))}" height="${barH}" rx="2" fill="${color}"/>`;
      const labelX = val >= 0 ? endX + 8 : endX - 8;
      content += textEl(labelX, y + barH * .72, `${val > 0 ? "+" : ""}${numberTR(val, 1)}`, "svg-bar-value", val >= 0 ? "start" : "end");
    });
    content += textEl(left + plotW/2, height - 7, "2000–2024 üretim farkı (TWh)", "svg-axis-title");
    return svgStart(title, desc, `0 0 ${width} ${height}`) + content + svgEnd();
  }

  function renderStoryChart(step) {
    activeStep = step;
    const meta = STEP_META[step];
    if (!meta || !annual.length) return;
    $("story-chart-kicker").textContent = meta.kicker;
    $("story-chart-title").textContent = meta.title;
    $("story-chart-description").textContent = meta.description;
    $("story-axis-note").textContent = meta.note;
    const index = Object.keys(STEP_META).indexOf(step) + 1;
    $("story-chart-index").textContent = `${String(index).padStart(2,"0")}—06`;
    $("visual-progress-fill").style.width = `${(index / 6) * 100}%`;
    let svg = "";
    const years = annual.map((row) => row.Year >= 2000 && row.Year <= 2024).filter(Boolean);
    if (step === "growth") {
      svg = renderLineChart({ title: meta.title, desc: meta.description, rows: annual, series: [{ key: "total_generation_twh", label: "Toplam üretim", color: COLORS.teal }], yLabel: "Üretim (TWh)", unit: "TWh", yMax: 390 });
    } else if (step === "shares") {
      svg = renderLineChart({ title: meta.title, desc: meta.description, rows: annual, series: [
        { key: "fossil_share_pct", label: "Fosil yakıtlar", color: COLORS.orange },
        { key: "renewables_share_pct", label: "Yenilenebilirler", color: COLORS.teal }
      ], yLabel: "Üretim payı (%)", unit: "%", yMax: 100 });
    } else if (step === "mix") {
      const byYear = annual.map((row) => ({ Year: row.Year }));
      const sourceGroups = [
        { key: "Fossil", label: "Fosil yakıtlar", members: ["Hard coal", "Lignite", "Gas", "Other fossil"], color: COLORS.orange },
        { key: "Hydro", label: "Hidroelektrik", members: ["Hydro"], color: COLORS.blue },
        { key: "Wind", label: "Karasal rüzgâr", members: ["Onshore wind"], color: COLORS.teal },
        { key: "Solar", label: "Güneş", members: ["Solar"], color: COLORS.gold },
        { key: "Other renewables", label: "Diğer yenilenebilir", members: ["Bioenergy", "Other renewables"], color: COLORS.lilac }
      ];
      byYear.forEach((row) => sourceGroups.forEach((group) => {
        row[group.key] = mix.filter((item) => item.Year === row.Year && group.members.includes(item.source)).reduce((sum, item) => sum + item.share_pct, 0);
      }));
      svg = renderStackedArea({ title: meta.title, desc: meta.description, rows: byYear, sources: sourceGroups.map((group) => ({ key: group.key, label: group.label, color: group.color })) });
    } else if (step === "source-change") {
      svg = renderBarChart({ title: meta.title, desc: meta.description, rows: sourceChange });
    } else if (step === "renewables") {
      svg = renderLineChart({ title: meta.title, desc: meta.description, rows: annual.map((row) => {
        const result = { Year: row.Year };
        ["Hydro", "Onshore wind", "Solar"].forEach((source) => {
          const found = mix.find((item) => item.Year === row.Year && item.source === source);
          result[source] = found ? found.generation_twh : 0;
        });
        return result;
      }), series: [
        { key: "Hydro", label: "Hidroelektrik", color: COLORS.blue },
        { key: "Onshore wind", label: "Karasal rüzgâr", color: COLORS.teal },
        { key: "Solar", label: "Güneş", color: COLORS.gold }
      ], yLabel: "Üretim (TWh)", unit: "TWh", yMax: 100 });
    } else if (step === "amounts") {
      svg = renderLineChart({ title: meta.title, desc: meta.description, rows: annual, series: [
        { key: "fossil_generation_twh", label: "Fosil yakıtlar", color: COLORS.orange },
        { key: "renewables_generation_twh", label: "Yenilenebilirler", color: COLORS.teal }
      ], yLabel: "Üretim (TWh)", unit: "TWh", yMax: 220 });
    }
    $("story-chart").innerHTML = svg;
    $("story-chart").setAttribute("aria-label", `${meta.title}. ${meta.description}`);
    document.querySelectorAll(".story-step").forEach((article) => {
      const isActive = article.dataset.step === step;
      article.classList.toggle("is-active", isActive);
      if (isActive) article.setAttribute("aria-current", "step"); else article.removeAttribute("aria-current");
    });
  }

  function bindStorySteps() {
    const steps = [...document.querySelectorAll(".story-step")];
    if (!("IntersectionObserver" in window)) {
      window.addEventListener("scroll", () => {
        const candidate = steps.map((element) => ({ element, distance: Math.abs(element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2 - window.innerHeight / 2) })).sort((a,b) => a.distance - b.distance)[0];
        if (candidate) renderStoryChart(candidate.element.dataset.step);
      }, { passive: true });
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) renderStoryChart(visible.target.dataset.step);
    }, { rootMargin: "-40% 0px -40% 0px", threshold: [0, .1, .25, .5, .75, 1] });
    steps.forEach((step) => observer.observe(step));
  }

  function bindControls() {
    $("source-select").addEventListener("change", renderExplorer);
    $("year-range").addEventListener("input", renderExplorer);
    document.querySelectorAll('input[name="measure"]').forEach((input) => input.addEventListener("change", renderExplorer));
  }

  function renderExplorer() {
    if (!mix.length) return;
    const source = $("source-select").value;
    const measure = document.querySelector('input[name="measure"]:checked').value;
    const startYear = Number($("year-range").value);
    const label = SOURCE_LABELS[source] || source;
    const valueLabel = measure === "generation_twh" ? "Üretim" : "Üretim payı";
    const unit = measure === "generation_twh" ? "TWh" : "%";
    const rows = mix.filter((row) => row.source === source && row.Year >= startYear && row.Year <= 2024).sort((a,b) => a.Year - b.Year);
    if (!rows.length) return;
    const start = rows[0], end = rows[rows.length - 1];
    const startValue = start[measure], endValue = end[measure], delta = endValue - startValue;
    const chartTitle = `${label}: ${startYear}–2024 ${valueLabel.toLocaleLowerCase("tr")}`;
    $("year-range-value").textContent = startYear;
    $("explore-chart-title").textContent = chartTitle;
    const changeLabel = measure === "generation_twh" ? `${signedTR(delta, 2)} TWh` : `${signedTR(delta, 2)} yüzde puan`;
    const svg = renderLineChart({ title: chartTitle, desc: `Türkiye'de ${label} için ${startYear}–2024 döneminde ${valueLabel.toLowerCase("tr")} değerleri.`, rows, series: [{ key: measure, label, color: SOURCE_COLORS[source] || COLORS.teal }], yLabel: `${valueLabel} (${unit})`, unit, yMax: null, height: 470, width: 900 });
    $("explore-chart").innerHTML = svg;
    $("explore-chart").setAttribute("aria-label", `${chartTitle}. Seçilen dönemin başlangıcı ${numberTR(startValue,2)} ${unit}; dönem sonu ${numberTR(endValue,2)} ${unit}.`);
    $("explore-start-value").textContent = `${numberTR(startValue, 2)} ${unit}`;
    $("explore-end-value").textContent = `${numberTR(endValue, 2)} ${unit}`;
    $("explore-delta-value").textContent = changeLabel;
    $("explore-start-year").textContent = start.Year;
    $("explore-end-year").textContent = end.Year;
    $("explore-delta-note").textContent = measure === "share_pct" ? "Yüzde puan farkı" : "Mutlak üretim farkı";
    $("explore-source-note").textContent = `Kaynak: Ember – Yearly Electricity Data (Europe CSV). Birim: ${unit}. Seçilen kaynak: ${label}.`;
  }

  function showLoadError(error) {
    const wrap = $("story-chart-wrap");
    if (wrap) wrap.innerHTML = `<div class="load-error" role="alert"><strong>Grafik verileri yüklenemedi.</strong><p>${esc(error.message)} Yerel test için proje kökünde <code>python3 -m http.server 8000</code> komutunu çalıştırıp <code>http://localhost:8000/site/</code> adresini açın.</p></div>`;
  }

  document.addEventListener("DOMContentLoaded", () => loadData().catch(showLoadError));
})();
