"use client";

import { useState } from "react";
import { Download, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * 산출물 PDF 미리보기(같은 탭 iframe) + 다운로드.
 * url 은 inline PDF 엔드포인트. 다운로드는 ?download=1 을 붙인다.
 */
export function PdfButtons({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const downloadUrl = `${url}${url.includes("?") ? "&" : "?"}download=1`;

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Eye className="h-4 w-4" />
        미리보기
      </Button>
      <Button asChild size="sm">
        {/* 새 탭 다운로드 — 라우트가 attachment 로 응답 */}
        <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
          <Download className="h-4 w-4" />
          다운로드
        </a>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {open && (
            <iframe
              src={url}
              title={title}
              className="h-[70vh] w-full rounded-md border"
            />
          )}
          <div className="flex justify-end">
            <Button asChild>
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                다운로드
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
