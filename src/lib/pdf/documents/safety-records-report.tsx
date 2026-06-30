import { Document, Page, Text, View } from "@react-pdf/renderer";

import { DocFooter, DocHeader, SignatureRow, Watermark, WorkspaceInfo } from "../components";
import { styles } from "../styles";
import type { SafetyReportDocData } from "../types";

/**
 * 안전활동 기록부 (기간별 내보내기 — 점검 대비 자료 묶음).
 * ★ 기록은 사업주가 입력한 사실의 보관이며, 그 적정성을 보증하지 않는다.
 */
export function SafetyRecordsReportDoc({
  data,
  watermark,
}: {
  data: SafetyReportDocData;
  watermark?: boolean;
}) {
  return (
    <Document title={`안전활동 기록부 - ${data.workspace.name}`}>
      <Page size="A4" style={styles.page}>
        {watermark && <Watermark />}
        <DocHeader title="안전활동 기록부" workspace={data.workspace} />
        <WorkspaceInfo workspace={data.workspace} />

        <Text style={styles.sectionTitle}>
          대상 기간: {data.fromDate} ~ {data.toDate} (총 {data.rows.length}건)
        </Text>

        <View style={styles.table}>
          <View style={styles.row} fixed>
            <Text style={[styles.th, { width: 56 }]}>일자</Text>
            <Text style={[styles.th, { width: 50 }]}>유형</Text>
            <Text style={[styles.th, { flex: 1 }]}>제목 / 내용</Text>
            <Text style={[styles.th, { width: 70 }]}>작업장소</Text>
            <Text style={[styles.th, { width: 36 }]}>첨부</Text>
          </View>
          {data.rows.length === 0 ? (
            <View style={styles.row}>
              <Text style={[styles.td, styles.center, { flex: 1 }]}>해당 기간 기록이 없습니다.</Text>
            </View>
          ) : (
            data.rows.map((r, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text style={[styles.td, styles.center, { width: 56 }]}>{r.recordedOn}</Text>
                <Text style={[styles.td, styles.center, { width: 50 }]}>{r.typeLabel}</Text>
                <View style={[styles.td, { flex: 1 }]}>
                  <Text style={{ fontWeight: "bold" }}>{r.title}</Text>
                  {r.participants ? (
                    <Text style={styles.meta}>참석자: {r.participants}</Text>
                  ) : null}
                  {r.memo ? <Text style={{ marginTop: 2 }}>{r.memo}</Text> : null}
                </View>
                <Text style={[styles.td, styles.center, { width: 70 }]}>{r.worksiteName}</Text>
                <Text style={[styles.td, styles.center, { width: 36 }]}>
                  {r.attachmentCount > 0 ? `${r.attachmentCount}` : "—"}
                </Text>
              </View>
            ))
          )}
        </View>

        <Text style={[styles.meta, { marginTop: 6 }]}>
          ※ 첨부 파일(사진·문서)은 앱에서 확인할 수 있습니다. 본 문서는 기록 목록 요약입니다.
        </Text>

        <SignatureRow label="확인(대표자)" name={data.workspace.representativeName} />
        <DocFooter />
      </Page>
    </Document>
  );
}
