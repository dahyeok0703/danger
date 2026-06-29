import "server-only";

/** PDF 바이트를 inline(미리보기) 또는 attachment(다운로드)로 응답 */
export function pdfResponse(bytes: Uint8Array, filename: string, download: boolean): Response {
  const disposition = download ? "attachment" : "inline";
  // 한글 파일명은 RFC 5987 filename* 로 인코딩
  const encoded = encodeURIComponent(filename);
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="document.pdf"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
