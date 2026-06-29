import "server-only";

import path from "node:path";

import { Font } from "@react-pdf/renderer";

/**
 * 한글 폰트(나눔고딕, SIL OFL) 임베드.
 * public/fonts 의 TTF 를 @react-pdf 에 등록한다. 한 번만 등록되도록 가드한다.
 * (라이선스: public/fonts/LICENSE-NanumGothic.txt)
 */
let registered = false;

export function registerPdfFonts(): void {
  if (registered) return;
  const dir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "Nanum",
    fonts: [
      { src: path.join(dir, "NanumGothic.ttf") },
      { src: path.join(dir, "NanumGothicBold.ttf"), fontWeight: "bold" },
    ],
  });
  // 줄바꿈(hyphenation)으로 한글이 깨지지 않도록 비활성화
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

export const PDF_FONT_FAMILY = "Nanum";
