/** One string table as recorded by the OE in the field register. */
export type TableRecord = {
  id: number;
  row: number;
  col: number;
  inverter: number;
  /** index into SiteData.postTypes, or -1 when the drawing carries none */
  postType: number;
  anchorsDate: string | null;
  structureDate: string | null;
  torqueDate: string | null;
  modulesDate: string | null;
  diag1: number | null;
  diag2: number | null;
  diagDelta: number | null;
  torqueOk: string | null;
  geomOk: string | null;
  rfi: string | null;
};

export type BaselineWeek = {
  week: number;
  date: string;
  blAnchors: number;
  blStructure: number;
  blModules: number;
  /** percent, 0-100 */
  blOverall: number;
};

export type SiteMeta = {
  project: string;
  document: string;
  revision: string;
  projectNo: string;
  client: string;
  epc: string;
  totalTables: number;
  modulesPerTable: number;
  anchorsPerTable: number;
  totalModules: number;
  totalAnchors: number;
  rows: number;
  cols: number;
  inverters: number;
  alertMm: number;
  rejectMm: number;
  weightAnchors: number;
  weightStructure: number;
  weightModules: number;
  requiredRateTablesPerDay: number;
  rollingWindowDays: number;
  milestoneMLS8890: string;
  /** set by the seed script on every upload */
  updatedAt?: string;
};

export type SiteData = {
  meta: SiteMeta;
  postTypes: string[];
  baseline: BaselineWeek[];
  tables: TableRecord[];
};

/** 0 not started · 1 anchors · 2 structure · 3 accepted · 4 modules */
export type Stage = 0 | 1 | 2 | 3 | 4;
