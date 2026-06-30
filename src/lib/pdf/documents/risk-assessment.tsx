import { Document, Page, Text, View } from "@react-pdf/renderer";

import { DocFooter, DocHeader, SignatureRow, Watermark, WorkspaceInfo } from "../components";
import { ASSESSMENT_COLS, styles } from "../styles";
import type { RiskAssessmentDocData } from "../types";

/**
 * 위험성평가표 (KOSHA 공개 표준 서식 참고).
 * ★ 가능성·중대성·위험성은 사용자가 직접 선택한 값을 그대로 표기한다(시스템 산정 아님).
 * ⚠️ 양식의 법적 정확성은 출시 전 산업안전 전문가 검수가 필요하다.
 */
export function RiskAssessmentDoc({
  data,
  watermark,
}: {
  data: RiskAssessmentDocData;
  watermark?: boolean;
}) {
  const c = ASSESSMENT_COLS;
  const v = (n: number | null) => (n != null ? String(n) : "");

  return (
    <Document title={`위험성평가표 - ${data.workspace.name}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {watermark && <Watermark />}
        <DocHeader title="위험성평가표" workspace={data.workspace} />
        <WorkspaceInfo workspace={data.workspace} />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.sectionTitle}>
            작업장소·공정: {data.worksiteName} ({data.typeLabel})
          </Text>
          <Text style={[styles.meta, { marginTop: 12 }]}>
            평가일 {data.assessedOn ?? "—"} · 다음 예정 {data.nextDueOn ?? "—"} · 상태{" "}
            {data.statusLabel}
          </Text>
        </View>

        {/* 표 헤더 */}
        <View style={styles.table}>
          <View style={styles.row} fixed>
            <Text style={[styles.th, { width: c.no }]}>번호</Text>
            <Text style={[styles.th, { width: c.category }]}>분류</Text>
            <Text style={[styles.th, { width: c.hazard }]}>유해·위험요인</Text>
            <Text style={[styles.th, { width: c.lk }]}>가능성</Text>
            <Text style={[styles.th, { width: c.sv }]}>중대성</Text>
            <Text style={[styles.th, { width: c.risk }]}>위험성</Text>
            <Text style={[styles.th, { width: c.measure }]}>감소대책</Text>
            <Text style={[styles.th, { width: c.owner }]}>담당</Text>
            <Text style={[styles.th, { width: c.due }]}>기한</Text>
          </View>

          {data.rows.length === 0 ? (
            <View style={styles.row}>
              <Text style={[styles.td, styles.center, { flex: 1 }]}>
                작성된 평가항목이 없습니다.
              </Text>
            </View>
          ) : (
            data.rows.map((r) => (
              <View key={r.no} style={styles.row} wrap={false}>
                <Text style={[styles.td, styles.center, { width: c.no }]}>{r.no}</Text>
                <Text style={[styles.td, { width: c.category }]}>{r.category}</Text>
                <Text style={[styles.td, { width: c.hazard }]}>{r.hazard}</Text>
                <Text style={[styles.td, styles.center, { width: c.lk }]}>{v(r.likelihood)}</Text>
                <Text style={[styles.td, styles.center, { width: c.sv }]}>{v(r.severity)}</Text>
                <Text style={[styles.td, styles.center, { width: c.risk }]}>{v(r.riskLevel)}</Text>
                <Text style={[styles.td, { width: c.measure }]}>{r.measure}</Text>
                <Text style={[styles.td, styles.center, { width: c.owner }]}>{r.owner}</Text>
                <Text style={[styles.td, styles.center, { width: c.due }]}>{r.dueOn}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={[styles.meta, { marginTop: 6 }]}>
          ※ 가능성·중대성·위험성은 사업주가 직접 선택한 값입니다. 본 도구는 산정·판정하지 않습니다.
        </Text>

        <SignatureRow label="평가자" name={data.assessorName} />
        <SignatureRow label="대표자" name={data.workspace.representativeName} />

        <DocFooter />
      </Page>
    </Document>
  );
}
