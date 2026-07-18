export type SchoolLevel = "elementary" | "middle" | "high" | "all";

export interface Standard {
  code: string;
  text: string;
  schoolLevel: "elementary" | "middle" | "high";
  subject: string;
  domain?: string;
  gradeBand?: string;
  sourceFile: string;
}

export interface DatasetMeta {
  builtAt: string;
  sourceRoot: string;
  total: number;
  byLevel: Record<string, number>;
  subjectCount: number;
  version: string;
  note: string;
}

export interface Dataset {
  meta: DatasetMeta;
  standards: Standard[];
}
