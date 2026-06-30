/** 산출물 PDF 에 넘기는 데이터 형태 (서버에서 조립) */

export interface DocWorkspace {
  name: string;
  businessNo: string | null;
  industry: string | null;
  workerCount: number | null;
  representativeName: string | null;
  logoUrl: string | null;
}

export interface RiskAssessmentRow {
  no: number;
  category: string;
  hazard: string;
  /** 가능성·중대성·위험성: 사용자가 직접 선택한 값(없으면 빈칸) */
  likelihood: number | null;
  severity: number | null;
  riskLevel: number | null;
  measure: string;
  owner: string;
  dueOn: string;
  done: boolean;
}

export interface RiskAssessmentDocData {
  workspace: DocWorkspace;
  worksiteName: string;
  typeLabel: string;
  statusLabel: string;
  assessedOn: string | null;
  nextDueOn: string | null;
  assessorName: string | null;
  rows: RiskAssessmentRow[];
}

export type AuxDocKind = "policy" | "checklist" | "meeting";

export interface SafetyReportRow {
  recordedOn: string;
  typeLabel: string;
  title: string;
  worksiteName: string;
  participants: string;
  memo: string;
  attachmentCount: number;
}

export interface SafetyReportDocData {
  workspace: DocWorkspace;
  fromDate: string;
  toDate: string;
  rows: SafetyReportRow[];
}
