import { Document, Page, Text, View } from "@react-pdf/renderer";

import { DocFooter, DocHeader, SignatureRow, today } from "../components";
import { styles } from "../styles";
import type { DocWorkspace } from "../types";

/**
 * 안전보건 목표·경영방침 (표준 문구 기반).
 * ⚠️ 아래 문구는 KOSHA 공개 자료를 참고한 '표준 예시'다. 대괄호[ ] 플레이스홀더를
 *    사업장 실정에 맞게 채우고, 출시/사용 전 산업안전 전문가의 검수를 받아야 한다.
 */
export function SafetyPolicyDoc({ workspace }: { workspace: DocWorkspace }) {
  const name = workspace.name;
  return (
    <Document title={`안전보건 경영방침 - ${name}`}>
      <Page size="A4" style={styles.page}>
        <DocHeader title="안전보건 목표 및 경영방침" workspace={workspace} />

        <Text style={styles.para}>
          「{name}」(이하 “우리 사업장”)의 대표자는 근로자의 안전과 보건을 경영의 최우선 가치로
          삼으며, 모든 구성원이 안전하고 건강하게 일할 수 있는 일터를 만들기 위해 다음과 같이
          안전보건 경영방침을 정하고 이를 성실히 실천한다.
        </Text>

        <Text style={styles.sectionTitle}>1. 경영방침</Text>
        {[
          "안전보건을 경영활동의 최우선 순위에 두고, 관련 법규와 기준을 준수한다.",
          "사업주가 직접 위험성평가를 실시하고, 유해·위험요인을 찾아 지속적으로 개선한다.",
          "근로자의 의견을 듣고 안전보건 활동에 참여하도록 보장한다.",
          "안전보건 목표를 정하고 정기적으로 점검하여 재해 없는 일터를 만든다.",
        ].map((t, i) => (
          <Text key={i} style={styles.para}>
            • {t}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>2. 안전보건 목표</Text>
        {[
          "중대재해 [0]건 달성",
          "위험성평가 연 [1]회 이상 실시 및 기록 보관",
          "안전보건 교육 [   ]회/연 실시",
          "유해·위험요인 개선 완료율 [   ]% 이상",
        ].map((t, i) => (
          <Text key={i} style={styles.para}>
            • <Text style={styles.placeholder}>{t}</Text>
          </Text>
        ))}

        <View style={styles.note}>
          <Text>
            ※ 위 문구는 표준 예시입니다. 대괄호[ ] 안의 값과 목표는 사업장 실정에 맞게 직접
            작성하세요. 본 방침의 적법성·적정성은 산업안전 전문가의 검수가 필요합니다.
          </Text>
        </View>

        <Text style={[styles.para, { marginTop: 18, textAlign: "center" }]}>
          {today()}
        </Text>
        <SignatureRow label="대표자" name={workspace.representativeName} />

        <DocFooter />
      </Page>
    </Document>
  );
}
