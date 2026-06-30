import { Document, Page, Text, View } from "@react-pdf/renderer";

import { DocFooter, DocHeader, SignatureRow, Watermark, WorkspaceInfo } from "../components";
import { styles } from "../styles";
import type { DocWorkspace } from "../types";

/**
 * 보조 서식 — 안전점검표 / 회의록 (KOSHA 공개 표준 참고).
 * ⚠️ 빈 서식을 제공할 뿐 적법성을 보증하지 않는다. 전문가 검수가 필요하다.
 */

const EMPTY_ROWS = Array.from({ length: 10 }, (_, i) => i + 1);

/** 안전점검표 — 점검 항목/결과/조치 빈칸 서식 */
export function SafetyChecklistDoc({
  workspace,
  watermark,
}: {
  workspace: DocWorkspace;
  watermark?: boolean;
}) {
  return (
    <Document title={`안전점검표 - ${workspace.name}`}>
      <Page size="A4" style={styles.page}>
        {watermark && <Watermark />}
        <DocHeader title="안전·보건 점검표" workspace={workspace} />
        <WorkspaceInfo workspace={workspace} />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.sectionTitle}>점검 결과</Text>
          <Text style={[styles.meta, { marginTop: 12 }]}>점검일: __________  점검자: __________</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.th, { width: 26 }]}>No</Text>
            <Text style={[styles.th, { flex: 1 }]}>점검 항목</Text>
            <Text style={[styles.th, { width: 70 }]}>양호/불량</Text>
            <Text style={[styles.th, { width: 160 }]}>조치 내용</Text>
          </View>
          {EMPTY_ROWS.map((n) => (
            <View key={n} style={styles.row}>
              <Text style={[styles.td, styles.center, { width: 26 }]}>{n}</Text>
              <Text style={[styles.td, { flex: 1, height: 20 }]}> </Text>
              <Text style={[styles.td, { width: 70 }]}> </Text>
              <Text style={[styles.td, { width: 160 }]}> </Text>
            </View>
          ))}
        </View>

        <SignatureRow label="확인(대표자)" name={workspace.representativeName} />
        <DocFooter />
      </Page>
    </Document>
  );
}

/** 안전보건 회의록 — 참석/안건/결정사항 빈칸 서식 */
export function MeetingMinutesDoc({
  workspace,
  watermark,
}: {
  workspace: DocWorkspace;
  watermark?: boolean;
}) {
  const lines = (label: string, count: number) => (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {Array.from({ length: count }, (_, i) => (
        <Text key={i} style={{ borderBottom: "0.5pt solid #ccc", height: 18 }}> </Text>
      ))}
    </View>
  );

  return (
    <Document title={`안전보건 회의록 - ${workspace.name}`}>
      <Page size="A4" style={styles.page}>
        {watermark && <Watermark />}
        <DocHeader title="안전·보건 회의록" workspace={workspace} />

        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>일시</Text>
            <Text style={styles.infoValue}> </Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>장소</Text>
            <Text style={styles.infoValue}> </Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>참석자</Text>
            <Text style={styles.infoValue}> </Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>작성자</Text>
            <Text style={styles.infoValue}> </Text>
          </View>
        </View>

        {lines("안건", 3)}
        {lines("논의 내용", 6)}
        {lines("결정 사항 및 조치 계획(담당·기한)", 5)}

        <SignatureRow label="작성자" name={null} />
        <SignatureRow label="확인(대표자)" name={workspace.representativeName} />
        <DocFooter />
      </Page>
    </Document>
  );
}
