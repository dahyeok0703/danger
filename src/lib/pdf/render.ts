import "server-only";

import type { ReactElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";

import { registerPdfFonts } from "./font";

/**
 * 산출물 PDF 렌더 (서버 전용).
 * 한글 폰트를 등록한 뒤 @react-pdf 로 버퍼를 생성한다.
 */
export async function renderPdf(element: ReactElement): Promise<Uint8Array> {
  registerPdfFonts();
  // @react-pdf 타입은 DocumentProps 엘리먼트를 기대 — Document 컴포넌트를 넘긴다.
  return renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
}
