import * as Papa from 'papaparse';
import * as ExcelJS from 'exceljs';
import type { Analysis } from '@/types';

/**
 * Exporta a tabela de eventos (uma linha por evento) em CSV.
 * Uma linha por evento. Colunas: time, timestamp, code, name, category.
 */
export function exportEventsCsv(analysis: Analysis): string {
  const rows = analysis.events.map((ev) => {
    const def = analysis.eventDefinitions[ev.code];
    return {
      time: ev.time,
      timestamp: ev.timestamp,
      code: ev.code,
      name: def?.name ?? '',
      category: def?.category ?? '',
    };
  });
  return Papa.unparse(rows);
}

/**
 * Exporta TUDO (header + eventos + definições + customAnalysis) em JSON.
 */
export function exportAnalysisJson(analysis: Analysis): string {
  return JSON.stringify(analysis, null, 2);
}

/**
 * Exporta para um .xlsx com 4 abas:
 *  - Header
 *  - Events
 *  - Event Definitions
 *  - Custom Analyses
 */
export async function exportAnalysisXlsx(analysis: Analysis): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MED-PC Analyzer';
  wb.created = new Date();

  // Sheet 1 — Header
  const headerSheet = wb.addWorksheet('Header');
  headerSheet.columns = [
    { header: 'Field', key: 'field', width: 20 },
    { header: 'Value', key: 'value', width: 40 },
  ];
  for (const [k, v] of Object.entries(analysis.header)) {
    headerSheet.addRow({ field: k, value: v });
  }

  // Sheet 2 — Events
  const evSheet = wb.addWorksheet('Events');
  evSheet.columns = [
    { header: 'Time (s)', key: 'time', width: 12 },
    { header: 'Timestamp', key: 'timestamp', width: 12 },
    { header: 'Code', key: 'code', width: 8 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Category', key: 'category', width: 16 },
  ];
  for (const ev of analysis.events) {
    const def = analysis.eventDefinitions[ev.code];
    evSheet.addRow({
      time: ev.time,
      timestamp: ev.timestamp,
      code: ev.code,
      name: def?.name ?? '',
      category: def?.category ?? '',
    });
  }

  // Sheet 3 — Event Definitions
  const defSheet = wb.addWorksheet('Event Definitions');
  defSheet.columns = [
    { header: 'Code', key: 'code', width: 8 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Color', key: 'color', width: 10 },
    { header: 'Count', key: 'count', width: 8 },
    { header: 'First (s)', key: 'first', width: 12 },
    { header: 'Last (s)', key: 'last', width: 12 },
  ];
  const codeSet = new Set<number>(analysis.events.map((e) => e.code));
  for (const code of Array.from(codeSet)) {
    const list = analysis.events.filter((e) => e.code === code);
    const def = analysis.eventDefinitions[code];
    defSheet.addRow({
      code,
      name: def?.name ?? '',
      category: def?.category ?? '',
      color: def?.color ?? '',
      count: list.length,
      first: list[0]?.time ?? '',
      last: list[list.length - 1]?.time ?? '',
    });
  }

  // Sheet 4 — Custom Analyses
  const caSheet = wb.addWorksheet('Custom Analyses');
  caSheet.columns = [
    { header: 'Name', key: 'name', width: 24 },
    { header: 'From Codes', key: 'fromCodes', width: 16 },
    { header: 'To Codes', key: 'toCodes', width: 16 },
    { header: 'Direction', key: 'direction', width: 12 },
    { header: 'Operation', key: 'operation', width: 16 },
    { header: 'Sample Size', key: 'sampleSize', width: 12 },
    { header: 'Result', key: 'result', width: 12 },
    { header: 'Created At', key: 'createdAt', width: 20 },
  ];
  for (const ca of analysis.customAnalysis) {
    caSheet.addRow({
      name: ca.name,
      fromCodes: ca.from.codes.join(', '),
      toCodes: ca.to.codes.join(', '),
      direction: ca.directionAfter,
      operation: ca.operation,
      sampleSize: ca.sampleSize ?? 0,
      result: ca.result ?? '',
      createdAt: ca.createdAt,
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Helper: baixa conteúdo como arquivo. */
export function triggerDownload(filename: string, content: BlobPart, mime: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
