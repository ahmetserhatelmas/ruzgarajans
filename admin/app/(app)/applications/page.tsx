import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { AppStatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchApplications, fetchCasts } from "@/lib/queries";
import { APP_STATUS, formatDate, formatMoney } from "@/lib/labels";
import type { ApplicationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; cast?: string }>;
}) {
  const { q = "", status = "all", cast = "all" } = await searchParams;
  const [apps, casts] = await Promise.all([fetchApplications(), fetchCasts()]);
  const filtered = apps.filter((a) => {
    const hay = `${a.profiles?.full_name ?? ""} ${a.profiles?.email ?? ""} ${a.cast_listings?.project_name ?? ""} ${a.cast_listings?.role_name ?? ""}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (status !== "all" && a.status !== status) return false;
    if (cast !== "all" && a.cast_id !== cast) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Başvurular"
        description="Durum ve ilana göre filtrele, detayda audition videosunu izle."
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Oyuncu veya proje"
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="all">Tüm durumlar</option>
          {(Object.keys(APP_STATUS) as ApplicationStatus[]).map((s) => (
            <option key={s} value={s}>
              {APP_STATUS[s]}
            </option>
          ))}
        </select>
        <select
          name="cast"
          defaultValue={cast}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="all">Tüm ilanlar</option>
          {casts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.project_name} · {c.role_name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrele
        </Button>
      </form>
      <p className="mb-3 text-sm text-muted-foreground">{filtered.length} başvuru</p>
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Oyuncu</TableHead>
              <TableHead>İlan</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Bütçe</TableHead>
              <TableHead>Tarih</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/applications/${a.id}`} className="font-medium hover:underline">
                    {a.profiles?.full_name || a.profiles?.email}
                  </Link>
                </TableCell>
                <TableCell>
                  {a.cast_listings?.project_name} · {a.cast_listings?.role_name}
                </TableCell>
                <TableCell>
                  <AppStatusBadge status={a.status} />
                </TableCell>
                <TableCell>
                  {a.accept_budget
                    ? "Kabul"
                    : formatMoney(a.counter_budget)}
                </TableCell>
                <TableCell>{formatDate(a.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
