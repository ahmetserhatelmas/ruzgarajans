"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadXlsx } from "@/lib/export-table-xlsx";

export type AcceptedProjectRow = {
  id: string;
  yapim: string;
  proje: string;
  tarih: string;
  ucret: string;
  odeme: string;
};

const HEADERS = ["Yapım", "Proje", "Tarih", "Ücret", "Aldığı ödeme"] as const;

export function AcceptedProjectsTable({
  actorName,
  rows,
}: {
  actorName: string;
  rows: AcceptedProjectRow[];
}) {
  const exportExcel = () => {
    const slug = (actorName || "oyuncu").replace(/[^\wğüşıöçĞÜŞİÖÇ-]+/g, "-").slice(0, 40);
    const today = new Date().toISOString().slice(0, 10);
    void downloadXlsx(
      `${slug}-kabul-projeler-${today}.xlsx`,
      [...HEADERS],
      rows.map((r) => [r.yapim, r.proje, r.tarih, r.ucret, r.odeme]),
      "Kabul projeler",
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Kabul edildiği projeler</CardTitle>
        <Button type="button" variant="outline" disabled={rows.length === 0} onClick={exportExcel}>
          Excel indir
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Kabul edildiği proje yok.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {HEADERS.map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.yapim || "—"}</TableCell>
                  <TableCell>{row.proje || "—"}</TableCell>
                  <TableCell>{row.tarih || "—"}</TableCell>
                  <TableCell>{row.ucret || "—"}</TableCell>
                  <TableCell>{row.odeme || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
