import * as XLSX from 'xlsx';
import { ColumnProfile, ColumnType, DatasetInfo, ProblemType } from '../types/ml';

const MISSING_TOKENS = new Set([
  '',
  'na',
  'n/a',
  'null',
  'none',
  'nan',
  'undefined',
  '?',
  '-',
]);

function normalizeCell(raw: unknown): string | number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  const str = String(raw).trim();
  if (MISSING_TOKENS.has(str.toLowerCase())) {
    return null;
  }
  // Check numeric representation (supports standard dot decimal or clean integers)
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    const num = Number(str);
    return Number.isFinite(num) ? num : str;
  }
  // Support comma-decimal numbers if they look like 12,34 without thousands confusion
  if (/^-?\d+,\d{1,4}$/.test(str)) {
    const num = Number(str.replace(',', '.'));
    return Number.isFinite(num) ? num : str;
  }
  return str;
}

function detectDelimiter(text: string): string {
  const firstLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (firstLines.length === 0) return ',';
  const candidates = [',', ';', '\t', '|'];
  let bestDelim = ',';
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = firstLines.map((line) => splitDelimitedLine(line, delim).length);
    const first = counts[0];
    if (first <= 1) continue;
    const consistent = counts.every((c) => c === first);
    const score = (consistent ? 100 : 0) + first;
    if (score > bestScore) {
      bestScore = score;
      bestDelim = delim;
    }
  }
  return bestDelim;
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDelimitedText(text: string): Record<string, string | number | null>[] {
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('El archivo debe contener al menos una fila de encabezados y una fila de datos.');
  }
  const delimiter = detectDelimiter(cleanText);
  const rawHeaders = splitDelimitedLine(lines[0], delimiter);
  const headers = rawHeaders.map((h, idx) => (h.trim() ? h.trim() : `Columna_${idx + 1}`));

  const rows: Record<string, string | number | null>[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitDelimitedLine(lines[r], delimiter);
    if (cells.length === 1 && cells[0] === '') continue;
    const rowObj: Record<string, string | number | null> = {};
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c]] = normalizeCell(cells[c] ?? null);
    }
    rows.push(rowObj);
  }
  return rows;
}

export function profileColumns(
  rows: Record<string, string | number | null>[]
): { columns: ColumnProfile[]; totalMissing: number } {
  if (rows.length === 0) {
    return { columns: [], totalMissing: 0 };
  }
  const headers = Object.keys(rows[0]);
  let totalMissing = 0;

  const columns: ColumnProfile[] = headers.map((name) => {
    let missingCount = 0;
    let numericCount = 0;
    let nonNullCount = 0;
    const freqMap: Record<string, number> = {};
    const sampleSet: string[] = [];

    for (const row of rows) {
      const val = row[name];
      if (val === null || val === undefined || val === '') {
        missingCount++;
      } else {
        nonNullCount++;
        if (typeof val === 'number') {
          numericCount++;
        }
        const key = String(val);
        freqMap[key] = (freqMap[key] || 0) + 1;
        if (sampleSet.length < 4 && !sampleSet.includes(key)) {
          sampleSet.push(key);
        }
      }
    }

    totalMissing += missingCount;
    const uniqueCount = Object.keys(freqMap).length;
    const isNumeric = nonNullCount > 0 && numericCount / nonNullCount >= 0.85;
    const type: ColumnType = isNumeric ? 'numeric' : 'categorical';

    // Determine suitability as a classification target
    const lowerName = name.toLowerCase();
    const looksLikeId =
      lowerName === 'id' ||
      lowerName.endsWith('_id') ||
      lowerName.startsWith('id_') ||
      lowerName === 'codigo' ||
      lowerName === 'registro';

    let targetCandidate = false;
    let targetReason = '';

    if (looksLikeId || (uniqueCount > rows.length * 0.8 && rows.length > 20)) {
      targetCandidate = false;
      targetReason = 'Identificador único o demasiados valores distintos.';
    } else if (uniqueCount === 2) {
      targetCandidate = true;
      targetReason = 'Excelente candidata: 2 clases definidas (clasificación binaria).';
    } else if (uniqueCount >= 3 && uniqueCount <= 10 && (!isNumeric || uniqueCount <= 6)) {
      targetCandidate = true;
      targetReason = `Buena candidata: ${uniqueCount} clases discretas (multiclase).`;
    } else if (isNumeric && uniqueCount > 10) {
      targetCandidate = false;
      targetReason = 'Variable numérica continua (>10 valores distintos).';
    } else if (uniqueCount < 2) {
      targetCandidate = false;
      targetReason = 'Columna constante (solo 1 valor único).';
    } else {
      targetCandidate = false;
      targetReason = `Alta cardinalidad (${uniqueCount} categorías distintas).`;
    }

    return {
      name,
      type,
      missingCount,
      uniqueCount,
      sampleValues: sampleSet,
      targetCandidate,
      targetReason,
      classDistribution: uniqueCount <= 12 ? freqMap : undefined,
    };
  });

  return { columns, totalMissing };
}

export function detectProblemType(column: ColumnProfile | undefined): ProblemType {
  if (!column) return 'invalid';
  if (column.uniqueCount === 2) return 'binary';
  if (column.uniqueCount >= 3 && column.uniqueCount <= 15) return 'multiclass';
  return 'invalid';
}

export function suggestDefaultTarget(columns: ColumnProfile[]): string {
  const candidates = columns.filter((c) => c.targetCandidate);
  if (candidates.length > 0) {
    // Prefer the last candidate column (classic tabular ML convention) or one with target-like name
    const namedTarget = candidates.find((c) =>
      /(target|clase|class|label|etiqueta|diagnostico|fraude|churn|abandono|compra|defecto|accidente|riesgo|resultado|estado)/i.test(
        c.name
      )
    );
    return (namedTarget ?? candidates[candidates.length - 1]).name;
  }
  // Fallback to column with fewest unique >= 2
  const valid = columns
    .filter((c) => c.uniqueCount >= 2)
    .sort((a, b) => a.uniqueCount - b.uniqueCount);
  return valid[0]?.name ?? columns[columns.length - 1]?.name ?? '';
}

export function suggestDefaultFeatures(columns: ColumnProfile[], targetName: string): string[] {
  return columns
    .filter((c) => {
      if (c.name === targetName) return false;
      const lower = c.name.toLowerCase();
      const isObviousId =
        lower === 'id' ||
        lower.endsWith('_id') ||
        lower.startsWith('id_') ||
        (c.type === 'categorical' && c.uniqueCount > 40);
      return !isObviousId && c.uniqueCount >= 2;
    })
    .map((c) => c.name);
}

export async function parseUploadedFile(file: File): Promise<DatasetInfo> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  let rows: Record<string, string | number | null>[] = [];

  if (ext === 'csv' || ext === 'txt') {
    const text = await file.text();
    rows = parseDelimitedText(text);
  } else if (ext === 'xls' || ext === 'xlsx') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('El libro de Excel no contiene hojas válidas.');
    }
    const sheet = workbook.Sheets[firstSheetName];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });
    if (jsonRows.length === 0) {
      throw new Error('La primera hoja del archivo Excel está vacía.');
    }
    const headers = Object.keys(jsonRows[0]);
    rows = jsonRows.map((raw) => {
      const obj: Record<string, string | number | null> = {};
      for (const h of headers) {
        obj[h] = normalizeCell(raw[h]);
      }
      return obj;
    });
  } else {
    throw new Error('Formato no compatible. Usa archivos CSV, TXT, XLS o XLSX.');
  }

  if (rows.length < 10) {
    throw new Error(
      `El archivo solo tiene ${rows.length} registros. Se necesitan al menos 10 registros para dividir entrenamiento y prueba.`
    );
  }

  const { columns, totalMissing } = profileColumns(rows);

  return {
    id: `custom_${Date.now()}`,
    name: file.name.replace(/\.[^/.]+$/, ''),
    sector: 'Datos propios del usuario',
    description: `Conjunto cargado desde ${file.name} (${rows.length} registros y ${columns.length} variables).`,
    fileName: file.name,
    rows,
    columns,
    totalMissing,
  };
}

export function datasetToCsv(dataset: DatasetInfo): string {
  const headers = dataset.columns.map((c) => c.name);
  const escape = (val: string | number | null) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(',')];
  for (const row of dataset.rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}
