"use client";

import { useState } from "react";
import { CalendarRange } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PdfButtons } from "@/components/pdf-buttons";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function ExportControls() {
  const [from, setFrom] = useState(isoDaysAgo(365));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const url = `/api/documents/safety-records/pdf?from=${from}&to=${to}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4" />
          기간별 내보내기 (점검 대비 자료)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="from">시작일</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">종료일</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <PdfButtons url={url} title={`안전활동 기록부 (${from} ~ ${to})`} />
        <p className="text-xs text-muted-foreground">
          선택한 기간의 안전활동을 한 문서로 묶어 PDF로 내보냅니다.
        </p>
      </CardContent>
    </Card>
  );
}
