import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  getCategoryColor,
  getCategoryLabel,
  getHearingCategory,
  formatFrequency,
  toDisplayDb,
} from '@/features/hearing-test/constants/hearing-test.constants';
import {
  getHearingTestHistoryFiltered,
  hfrtPayloadToResult,
  pttPayloadToEarResults,
  type StoredHearingTestRow,
} from '@/features/hearing-test/services/HearingResultService';
import type { HearingTestType, HFRTPayload, PTTPayload } from '@/features/hearing-test/services/hearing.storage';
import { getHFRTQualityBand, HFRT_MAX_FREQ, HFRT_MIN_FREQ, HFRT_QUALITY_BANDS } from '@/features/hearing-test/services/HFRTAlgorithm';
import { PTT_FREQUENCIES } from '@/features/hearing-test/services/PTTAlgorithm';
import type { PTTEarResult } from '@/features/hearing-test/types/ptt.types';

// ─────────────────────────────────────────────────────────────────────────────
// Exports the user's hearing-test results as a styled PDF — same colour
// language and category/quality vocabulary as the live result screens
// (PTTResultView / HFRTResultView), reduced to what prints well on a static
// page. Charts are hand-drawn inline SVG, porting the same coordinate math as
// AudiogramChart / HFRTSpectrumChart / EvolutionChart rather than trying to
// screenshot the live React Native components.
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportFilter {
  testTypes:  HearingTestType[];   // ['ptt'], ['hfrt'], or both
  startDate?: Date | null;         // inclusive
  endDate?:   Date | null;         // inclusive (whole day)
}

export type PdfExportResult =
  | { status: 'shared' }
  | { status: 'unavailable' }
  | { status: 'empty' };

const EAR_RIGHT = '#C0392B';
const EAR_LEFT  = '#2A6BC1';

function endOfDay(d: Date): Date {
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end;
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function periodLabel(startDate?: Date | null, endDate?: Date | null): string {
  if (startDate && endDate) return `Du ${fullDate(startDate.toISOString())} au ${fullDate(endDate.toISOString())}`;
  if (startDate) return `Depuis le ${fullDate(startDate.toISOString())}`;
  if (endDate)   return `Jusqu’au ${fullDate(endDate.toISOString())}`;
  return 'Toute la période disponible';
}

// ── Evolution chart (mirrors EvolutionChart.tsx's layout math) ───────────────

function buildEvolutionSvg(
  points: { date: string; value: number }[],
  unit: 'dB' | 'kHz',
  betterWhenHigher: boolean,
): string {
  const W = 660, H = 200;
  const padL = 40, padR = 14, padT = 14, padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const values = points.map(p => p.value);
  let yMin = Math.min(...values);
  let yMax = Math.max(...values);
  if (yMin === yMax) {
    const pad = Math.max(1, Math.abs(yMin) * 0.1);
    yMin -= pad; yMax += pad;
  } else {
    const pad = (yMax - yMin) * 0.15;
    yMin -= pad; yMax += pad;
  }

  const xFor = (i: number) => points.length === 1 ? padL + plotW / 2 : padL + (i / (points.length - 1)) * plotW;
  const yFor = (v: number) => padT + ((yMax - v) / (yMax - yMin)) * plotH;
  const fmtVal = (v: number) => (unit === 'kHz' ? v.toFixed(1) : String(Math.round(v)));

  const gridLines = Array.from({ length: 5 }).map((_, i) => {
    const v = yMax - (i / 4) * (yMax - yMin);
    const y = yFor(v);
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#F0F4F8" stroke-width="1" />
      <text x="${padL - 6}" y="${(y + 3.5).toFixed(1)}" font-size="10" fill="#94A3B8" text-anchor="end">${fmtVal(v)}</text>`;
  }).join('');

  const pts = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value) }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const dots = pts.map(p =>
    `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#fff" stroke="#0B7285" stroke-width="2.5" />`,
  ).join('');

  const showEvery = points.length <= 6;
  const dateLabels = points.map((p, i) => {
    if (!(showEvery || i === 0 || i === points.length - 1)) return '';
    return `<text x="${xFor(i).toFixed(1)}" y="${H - 6}" font-size="10" fill="#475569" text-anchor="middle">${shortDate(p.date)}</text>`;
  }).join('');

  return `
    <svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      ${gridLines}
      <path d="${pathD}" fill="none" stroke="#0B7285" stroke-width="2.5" />
      ${dots}
      ${dateLabels}
    </svg>
    <div class="chart-caption">
      <span>${unit === 'kHz' ? 'Fréquence (kHz)' : 'Seuil (dB)'}</span>
      <span>${betterWhenHigher ? '↑ plus haut = mieux' : '↓ plus bas = mieux'}</span>
    </div>`;
}

// ── Audiogram (mirrors AudiogramChart.tsx's layout math) ─────────────────────

function buildAudiogramSvg(earResults: PTTEarResult[]): string {
  const CHART_MIN_DB = -20, CHART_MAX_DB = 80;
  const W = 620, H = 240;
  const padL = 38, padR = 14, padT = 12, padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const minLog = Math.log(PTT_FREQUENCIES[0]);
  const maxLog = Math.log(PTT_FREQUENCIES[PTT_FREQUENCIES.length - 1]);
  const freqToX = (hz: number) => padL + ((Math.log(hz) - minLog) / (maxLog - minLog)) * plotW;
  const dbToY = (db: number) => {
    const clamped = Math.min(CHART_MAX_DB, Math.max(CHART_MIN_DB, db));
    return padT + ((clamped - CHART_MIN_DB) / (CHART_MAX_DB - CHART_MIN_DB)) * plotH;
  };

  const left  = earResults.find(e => e.ear === 'left');
  const right = earResults.find(e => e.ear === 'right');

  const yLines = [-20, 0, 20, 40, 60, 80].map(db => {
    const y = dbToY(db);
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#F0F4F8" stroke-width="1" />
      <text x="${padL - 6}" y="${(y + 3.5).toFixed(1)}" font-size="10" fill="#94A3B8" text-anchor="end">${toDisplayDb(db)}</text>`;
  }).join('');

  const xLabels = PTT_FREQUENCIES.map(hz => {
    const x = freqToX(hz);
    return `<text x="${x.toFixed(1)}" y="${H - 8}" font-size="10" fill="#475569" text-anchor="middle">${hz >= 1000 ? `${hz / 1000}k` : hz}</text>`;
  }).join('');

  function seriesPath(ear?: PTTEarResult): string {
    if (!ear) return '';
    return ear.thresholds
      .map((t, i) => `${i === 0 ? 'M' : 'L'} ${freqToX(t.frequency).toFixed(1)} ${dbToY(t.thresholdDb).toFixed(1)}`)
      .join(' ');
  }

  const rightPath = seriesPath(right);
  const leftPath  = seriesPath(left);

  const rightMarkers = (right?.thresholds ?? []).map(t => {
    const x = freqToX(t.frequency), y = dbToY(t.thresholdDb);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="none" stroke="${EAR_RIGHT}" stroke-width="2.5" />`;
  }).join('');

  const leftMarkers = (left?.thresholds ?? []).map(t => {
    const x = freqToX(t.frequency), y = dbToY(t.thresholdDb);
    return `<g stroke="${EAR_LEFT}" stroke-width="2.5">
      <line x1="${(x - 5).toFixed(1)}" y1="${(y - 5).toFixed(1)}" x2="${(x + 5).toFixed(1)}" y2="${(y + 5).toFixed(1)}" />
      <line x1="${(x - 5).toFixed(1)}" y1="${(y + 5).toFixed(1)}" x2="${(x + 5).toFixed(1)}" y2="${(y - 5).toFixed(1)}" />
    </g>`;
  }).join('');

  return `
    <svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      ${yLines}
      ${xLabels}
      ${rightPath ? `<path d="${rightPath}" fill="none" stroke="${EAR_RIGHT}" stroke-width="2" />` : ''}
      ${leftPath  ? `<path d="${leftPath}" fill="none" stroke="${EAR_LEFT}" stroke-width="2" />`   : ''}
      ${rightMarkers}
      ${leftMarkers}
    </svg>
    <div class="chart-caption">
      <span style="color:${EAR_RIGHT};font-weight:700;">○ Oreille droite</span>
      <span style="color:${EAR_LEFT};font-weight:700;">✕ Oreille gauche</span>
    </div>`;
}

// ── Spectrum bar (mirrors HFRTSpectrumChart.tsx's layout math) ───────────────

function buildSpectrumSvg(maxHz: number): string {
  const W = 620, H = 64;
  const padL = 8, padR = 8;
  const plotW = W - padL - padR;
  const minLog = Math.log(HFRT_MIN_FREQ);
  const maxLog = Math.log(HFRT_MAX_FREQ);
  const freqToX = (hz: number) => {
    const clamped = Math.min(HFRT_MAX_FREQ, Math.max(HFRT_MIN_FREQ, hz));
    return padL + ((Math.log(clamped) - minLog) / (maxLog - minLog)) * plotW;
  };

  const zones = HFRT_QUALITY_BANDS.map((band, i) => {
    const from = band.minHz;
    const to   = i < HFRT_QUALITY_BANDS.length - 1 ? HFRT_QUALITY_BANDS[i + 1].minHz : HFRT_MAX_FREQ;
    const x0 = freqToX(from), x1 = freqToX(to);
    return `<rect x="${x0.toFixed(1)}" y="8" width="${Math.max(0, x1 - x0).toFixed(1)}" height="30" fill="${band.color}" />`;
  }).join('');

  const markerX = freqToX(maxHz);

  return `
    <svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${padL}" y="8" width="${plotW}" height="30" rx="8" fill="#F1F5F9" />
      ${zones}
      <line x1="${markerX.toFixed(1)}" y1="4" x2="${markerX.toFixed(1)}" y2="44" stroke="#155E75" stroke-width="2.5" />
      <circle cx="${markerX.toFixed(1)}" cy="23" r="6" fill="#155E75" stroke="#fff" stroke-width="2" />
      <text x="${padL}" y="${H - 4}" font-size="10" fill="#94A3B8">8 kHz</text>
      <text x="${W - padR}" y="${H - 4}" font-size="10" fill="#94A3B8" text-anchor="end">20 kHz</text>
    </svg>`;
}

// ── Per-result cards ──────────────────────────────────────────────────────────

function buildPTTCard(row: StoredHearingTestRow): string {
  const earResults = pttPayloadToEarResults(row.payload as PTTPayload);
  const left  = earResults.find(e => e.ear === 'left');
  const right = earResults.find(e => e.ear === 'right');
  const ptaDb = left && right
    ? Math.round((left.avgDb + right.avgDb) / 2)
    : left?.avgDb ?? right?.avgDb ?? 0;
  const category = getHearingCategory(ptaDb);
  const catColor = getCategoryColor(category);
  const catLabel = getCategoryLabel(category);

  const tableRows = PTT_FREQUENCIES.map(freq => {
    const r = right?.thresholds.find(t => t.frequency === freq);
    const l = left?.thresholds.find(t => t.frequency === freq);
    return `<tr>
      <td style="text-align:left;font-weight:600;">${formatFrequency(freq)}</td>
      <td style="color:${EAR_RIGHT};font-weight:700;">${r ? toDisplayDb(r.thresholdDb) : '—'}</td>
      <td style="color:${EAR_LEFT};font-weight:700;">${l ? toDisplayDb(l.thresholdDb) : '—'}</td>
    </tr>`;
  }).join('');

  return `
    <div class="card">
      <div class="card-head">
        <strong>${fullDate(row.created_at)}</strong>
        <span class="badge" style="background:${catColor}22;color:${catColor};">${catLabel}</span>
      </div>
      <div class="stat-row">
        <div><span class="muted">Seuil moyen</span><br/><strong class="stat-value">${toDisplayDb(ptaDb)} dB</strong></div>
        ${left  ? `<div><span class="muted" style="color:${EAR_LEFT};">Oreille gauche</span><br/><strong class="stat-value" style="color:${EAR_LEFT};">${toDisplayDb(left.avgDb)} dB</strong></div>`   : ''}
        ${right ? `<div><span class="muted" style="color:${EAR_RIGHT};">Oreille droite</span><br/><strong class="stat-value" style="color:${EAR_RIGHT};">${toDisplayDb(right.avgDb)} dB</strong></div>` : ''}
      </div>
      ${buildAudiogramSvg(earResults)}
      <table>
        <thead><tr>
          <th style="text-align:left;">Fréquence</th>
          <th style="color:${EAR_RIGHT};">Droite</th>
          <th style="color:${EAR_LEFT};">Gauche</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;
}

function buildHFRTCard(row: StoredHearingTestRow): string {
  const payload = row.payload as HFRTPayload;
  const result  = hfrtPayloadToResult(payload);

  if (result.noResponse) {
    return `
      <div class="card">
        <div class="card-head"><strong>${fullDate(row.created_at)}</strong></div>
        <p class="muted">Aucune réponse détectée — résultat non concluant, non retenu dans le score.</p>
      </div>`;
  }

  const band     = getHFRTQualityBand(result.maxAudibleFrequency);
  const catColor = getCategoryColor(band.category);
  const kHz = result.hitCeiling
    ? '≥ 20'
    : (result.maxAudibleFrequency / 1000).toFixed(result.maxAudibleFrequency >= 10_000 ? 1 : 2);

  return `
    <div class="card">
      <div class="card-head">
        <strong>${fullDate(row.created_at)}</strong>
        <span class="badge" style="background:${catColor}22;color:${catColor};">${band.label}</span>
      </div>
      <div class="stat-row">
        <div><span class="muted">Fréquence maximale perçue</span><br/><strong class="stat-value">${kHz} kHz</strong></div>
      </div>
      ${buildSpectrumSvg(result.maxAudibleFrequency)}
      <div class="row">
        <span>Fiabilité</span>
        <span style="color:${result.reliable ? '#15803D' : '#B45309'};font-weight:700;">${result.reliable ? 'Bonne' : 'À refaire'}</span>
      </div>
      <div class="row"><span>Durée du balayage</span><span>${Math.round(result.durationMs / 1000)}s</span></div>
    </div>`;
}

// ── Document shell ────────────────────────────────────────────────────────────

function buildHtml(opts: {
  username: string;
  startDate?: Date | null;
  endDate?:   Date | null;
  pttRows:  StoredHearingTestRow[];
  hfrtRows: StoredHearingTestRow[];
}): string {
  const { username, startDate, endDate, pttRows, hfrtRows } = opts;

  let body = '';

  if (pttRows.length > 0) {
    const points = pttRows.map(r => {
      const earResults = pttPayloadToEarResults(r.payload as PTTPayload);
      const left  = earResults.find(e => e.ear === 'left');
      const right = earResults.find(e => e.ear === 'right');
      const avg = left && right
        ? Math.round((left.avgDb + right.avgDb) / 2)
        : left?.avgDb ?? right?.avgDb ?? 0;
      return { date: r.created_at, value: toDisplayDb(avg) };
    });
    body += `<div class="section-title">Seuil auditif — ${pttRows.length} résultat${pttRows.length > 1 ? 's' : ''}</div>`;
    if (points.length >= 2) {
      body += `<div class="card">${buildEvolutionSvg(points, 'dB', false)}</div>`;
    }
    body += [...pttRows].reverse().map(buildPTTCard).join('');
  }

  if (hfrtRows.length > 0) {
    const points = hfrtRows
      .map(r => ({ row: r, result: hfrtPayloadToResult(r.payload as HFRTPayload) }))
      .filter(({ result }) => !result.noResponse)
      .map(({ row, result }) => ({ date: row.created_at, value: result.maxAudibleFrequency / 1000 }));
    body += `<div class="section-title">Hautes fréquences — ${hfrtRows.length} résultat${hfrtRows.length > 1 ? 's' : ''}</div>`;
    if (points.length >= 2) {
      body += `<div class="card">${buildEvolutionSvg(points, 'kHz', true)}</div>`;
    }
    body += [...hfrtRows].reverse().map(buildHFRTCard).join('');
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; background:#F8FAFC; color:#0B1220; margin:0; padding:28px; }
  .cover {
    background: linear-gradient(135deg, #0D8FA5, #0B7285, #064E5F);
    color:#fff; border-radius:16px; padding:24px; margin-bottom:24px;
  }
  .cover h1 { margin:0 0 4px; font-size:22px; letter-spacing:-0.3px; }
  .cover .sub { color: rgba(255,255,255,0.75); font-size:12px; margin-top:4px; }
  .section-title { font-size:16px; font-weight:700; margin: 26px 0 12px; }
  .card {
    background:#fff; border:1px solid #E5E7EB; border-radius:14px;
    padding:16px; margin-bottom:14px; page-break-inside: avoid;
  }
  .card-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:13px; }
  .badge { display:inline-block; padding:4px 10px; border-radius:10px; font-size:11px; font-weight:700; }
  .stat-row { display:flex; gap:24px; margin-bottom:12px; font-size:12px; }
  .stat-value { font-size:18px; }
  .muted { color:#475569; font-size:11px; }
  .row { display:flex; justify-content:space-between; padding:6px 0; border-top:1px solid #F0F4F8; font-size:12px; margin-top:4px; }
  .chart-caption { display:flex; justify-content:space-between; margin-top:4px; font-size:11px; color:#475569; font-weight:600; }
  table { width:100%; border-collapse:collapse; font-size:12px; margin-top:10px; }
  th, td { padding:6px 8px; text-align:center; border-bottom:1px solid #F0F4F8; }
  th { color:#475569; font-weight:700; }
  .footer { margin-top: 28px; font-size: 10px; color:#94A3B8; line-height:1.6; }
</style>
</head>
<body>
  <div class="cover">
    <h1>Export EarHealth — résultats des tests</h1>
    <div class="sub">${username} · généré le ${fullDate(new Date().toISOString())}</div>
    <div class="sub">Période : ${periodLabel(startDate, endDate)}</div>
  </div>

  ${body}

  <div class="footer">
    Dépistage indicatif réalisé sur appareil non calibré. Les valeurs servent au suivi personnel
    et ne remplacent pas un bilan audiologique réalisé par un professionnel de santé.
  </div>
</body>
</html>`;
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function exportHearingResultsPdf(
  userId: string,
  username: string,
  filter: ExportFilter,
): Promise<PdfExportResult> {
  const rows = await getHearingTestHistoryFiltered(userId, {
    testTypes: filter.testTypes,
    startDate: filter.startDate ? filter.startDate.toISOString() : undefined,
    endDate:   filter.endDate ? endOfDay(filter.endDate).toISOString() : undefined,
  });

  if (rows.length === 0) return { status: 'empty' };

  const pttRows  = rows.filter(r => r.test_type === 'ptt');
  const hfrtRows = rows.filter(r => r.test_type === 'hfrt');

  const html = buildHtml({
    username,
    startDate: filter.startDate,
    endDate:   filter.endDate,
    pttRows,
    hfrtRows,
  });

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const dateStr = new Date().toISOString().split('T')[0];
  const dest = new File(Paths.cache, `earhealth-resultats-${dateStr}.pdf`);
  if (dest.exists) dest.delete();
  new File(uri).copy(dest);

  if (!(await Sharing.isAvailableAsync())) {
    return { status: 'unavailable' };
  }

  await Sharing.shareAsync(dest.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Exporter mes résultats EarHealth',
    UTI: 'com.adobe.pdf',
  });

  return { status: 'shared' };
}
