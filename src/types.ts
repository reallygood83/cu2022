export type SchoolLevel = "elementary" | "middle" | "high" | "all";

export type StandardQuality = "ok" | "truncated_suspect" | "repaired";

export interface Standard {
  code: string;
  text: string;
  schoolLevel: "elementary" | "middle" | "high";
  subject: string;
  domain?: string;
  gradeBand?: string;
  sourceFile: string;
  /** 추출 품질 플래그 — truncated_suspect면 검색 감점·인용 시 경고 */
  quality?: "truncated_suspect" | string;
  /** 복구 출처: wiki_complete | official_md_join | pdf_multiline */
  repair?: string;
}

export interface DatasetMeta {
  builtAt: string;
  sourceRoot: string;
  total: number;
  byLevel: Record<string, number>;
  subjectCount: number;
  version: string;
  note: string;
  repairedAt?: string;
  repair?: Record<string, unknown>;
  quality?: {
    elementaryTruncated?: number;
    middleTruncated?: number;
    highTruncated?: number;
    highCompletePct?: number;
    highGeneralCompletePct?: number;
    note?: string;
    [k: string]: unknown;
  };
}

export interface Dataset {
  meta: DatasetMeta;
  standards: Standard[];
}
