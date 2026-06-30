import { Image, Text, View } from "@react-pdf/renderer";

import { APP_NAME, DOCUMENT_FOOTER_NOTE } from "@/lib/constants";
import { styles } from "./styles";
import type { DocWorkspace } from "./types";

/** 문서 머리글 — 로고(선택) + 제목 + 사업장명 */
export function DocHeader({ title, workspace }: { title: string; workspace: DocWorkspace }) {
  return (
    <View style={styles.header}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {workspace.logoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image 는 alt 미지원
          <Image style={styles.logo} src={workspace.logoUrl} />
        ) : null}
        <View>
          <Text style={styles.docTitle}>{title}</Text>
          <Text style={styles.wsName}>{workspace.name}</Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {APP_NAME}로 작성{"\n"}
        {today()}
      </Text>
    </View>
  );
}

/** 사업장 기본 정보 그리드 */
export function WorkspaceInfo({ workspace }: { workspace: DocWorkspace }) {
  const rows: [string, string][] = [
    ["사업장명", workspace.name],
    ["대표자", workspace.representativeName ?? "—"],
    ["사업자등록번호", workspace.businessNo ?? "—"],
    ["업종", workspace.industry ?? "—"],
    ["상시근로자수", workspace.workerCount != null ? `${workspace.workerCount}명` : "—"],
  ];
  return (
    <View style={styles.infoGrid}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.infoCell}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

/** 서명란 (평가자/대표) */
export function SignatureRow({ label, name }: { label: string; name: string | null }) {
  return (
    <View style={styles.signRow}>
      <View style={styles.signBox}>
        <Text style={styles.signLabel}>{label}</Text>
        <Text style={styles.signLine}>{name ?? ""}</Text>
        <Text style={styles.signLabel}>(서명)</Text>
      </View>
    </View>
  );
}

/** ★ 모든 산출물 하단 고정 주석 + 페이지 번호 */
export function DocFooter() {
  return (
    <>
      <Text style={styles.footer} fixed>
        {DOCUMENT_FOOTER_NOTE}
      </Text>
      <Text
        style={styles.pageNo}
        fixed
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </>
  );
}

/** 무료 플랜 산출물 워터마크 (모든 페이지) */
export function Watermark() {
  return (
    <Text style={styles.watermark} fixed>
      무료 플랜
    </Text>
  );
}

export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}
