import * as XLSX from "xlsx";

export type AnalyticsKind = "linkedin_single_post" | "linkedin_aggregate" | "unknown";

const AGGREGATE_SHEETS = new Set(["DISCOVERY", "ENGAGEMENT", "FOLLOWERS"]);
const SINGLE_POST_KEYS = new Set([
  "post url",
  "post date",
  "impressions",
  "members reached",
  "reactions",
]);

/**
 * Sniffs a LinkedIn analytics export to determine which parser should handle it.
 *
 * Detection rules:
 *  - Aggregate exports include at least one of the DISCOVERY / ENGAGEMENT / FOLLOWERS sheets.
 *  - Single-post exports have a single sheet whose first column contains rows like
 *    "Post URL", "Post Date", "Impressions", … in column A.
 */
export async function sniffAnalyticsFile(file: File): Promise<AnalyticsKind> {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
    return "unknown";
  }
  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });

    // Aggregate detection: sheet names
    const upperNames = wb.SheetNames.map((s) => s.toUpperCase().trim());
    if (upperNames.some((n) => AGGREGATE_SHEETS.has(n))) {
      return "linkedin_aggregate";
    }

    // Single-post detection: scan column A of the first sheet for known label keys
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    if (firstSheet) {
      const rows = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1 });
      let hits = 0;
      for (const row of rows.slice(0, 40)) {
        if (!Array.isArray(row) || row.length === 0) continue;
        const key = String(row[0] ?? "").toLowerCase().trim();
        if (SINGLE_POST_KEYS.has(key)) hits++;
        if (hits >= 2) return "linkedin_single_post";
      }
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

export interface GroupedFiles {
  singlePost: File[];
  aggregate: File[];
  unknown: File[];
}

export async function groupFilesByKind(files: File[]): Promise<GroupedFiles> {
  const results = await Promise.all(files.map(async (f) => ({ f, kind: await sniffAnalyticsFile(f) })));
  const out: GroupedFiles = { singlePost: [], aggregate: [], unknown: [] };
  for (const { f, kind } of results) {
    if (kind === "linkedin_single_post") out.singlePost.push(f);
    else if (kind === "linkedin_aggregate") out.aggregate.push(f);
    else out.unknown.push(f);
  }
  return out;
}
