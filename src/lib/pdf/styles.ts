import { StyleSheet } from "@react-pdf/renderer";

import { PDF_FONT_FAMILY } from "./font";

/** 산출물 공통 스타일 (KOSHA 표준 서식을 단순화한 표 기반 레이아웃) */
export const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 9,
    paddingTop: 36,
    paddingBottom: 56, // 하단 고정 주석 공간
    paddingHorizontal: 36,
    color: "#1a1a1a",
    lineHeight: 1.4,
  },
  // 머리글
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1.5pt solid #1f5f44",
    paddingBottom: 8,
    marginBottom: 12,
  },
  logo: { width: 48, height: 48, objectFit: "contain", marginRight: 10 },
  docTitle: { fontSize: 16, fontWeight: "bold", color: "#1f5f44" },
  wsName: { fontSize: 11, fontWeight: "bold", marginTop: 2 },
  meta: { fontSize: 8, color: "#555" },

  // 정보 박스 (사업장 정보)
  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  infoCell: {
    width: "50%",
    flexDirection: "row",
    borderBottom: "0.5pt solid #ddd",
    paddingVertical: 3,
  },
  infoLabel: { width: 80, color: "#666" },
  infoValue: { flex: 1, fontWeight: "bold" },

  sectionTitle: { fontSize: 11, fontWeight: "bold", marginTop: 10, marginBottom: 6 },

  // 표
  table: { borderTop: "1pt solid #333", borderLeft: "1pt solid #333" },
  row: { flexDirection: "row" },
  th: {
    backgroundColor: "#eef3f0",
    fontWeight: "bold",
    borderRight: "1pt solid #333",
    borderBottom: "1pt solid #333",
    padding: 4,
    textAlign: "center",
  },
  td: {
    borderRight: "1pt solid #333",
    borderBottom: "1pt solid #333",
    padding: 4,
  },
  center: { textAlign: "center" },

  // 본문 문단(정책/회의록 등)
  para: { marginBottom: 6 },
  placeholder: { color: "#888" },
  note: {
    marginTop: 10,
    padding: 6,
    backgroundColor: "#fff8e1",
    border: "0.5pt solid #e0c060",
    fontSize: 8,
    color: "#6b5300",
  },

  // 서명란
  signRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 18 },
  signBox: { width: 220, flexDirection: "row", justifyContent: "space-between" },
  signLabel: { color: "#444" },
  signLine: { borderBottom: "0.5pt solid #333", flex: 1, marginLeft: 8, marginRight: 4 },

  // 하단 고정 주석 (★ 모든 산출물 공통)
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    borderTop: "0.5pt solid #ccc",
    paddingTop: 6,
    fontSize: 7,
    color: "#888",
    textAlign: "center",
  },
  pageNo: { position: "absolute", bottom: 12, right: 36, fontSize: 7, color: "#aaa" },

  // 무료 플랜 워터마크 (대각선, 옅게)
  watermark: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 54,
    color: "#1f5f44",
    opacity: 0.08,
    transform: "rotate(-28deg)",
  },
});

/** 위험성평가표 열 너비(합 100) */
export const ASSESSMENT_COLS = {
  no: 22,
  category: 48,
  hazard: 120,
  lk: 34,
  sv: 34,
  risk: 34,
  measure: 130,
  owner: 50,
  due: 50,
} as const;
