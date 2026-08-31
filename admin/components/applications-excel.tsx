"use client";

import { Button } from "@/components/ui/button";
import { downloadXlsx } from "@/lib/export-table-xlsx";

const HEADERS = ["Oyuncu", "E-posta", "İlan", "Rol", "Durum", "Bütçe", "Not", "Tarih"];

export function ApplicationsExcelButton({
  filename,
  rows,
}: {
  filename: string;
  rows: string[][];
}) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={rows.length === 0}
      onClick={() => {
        void downloadXlsx(filename, HEADERS, rows, "Başvurular");
      }}
    >
      Excel indir
    </Button>
  );
}
