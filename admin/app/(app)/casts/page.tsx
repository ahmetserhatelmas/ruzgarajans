import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchCasts } from "@/lib/queries";
import { formatDate, formatMoney, GENDER, label } from "@/lib/labels";
import { displayImageUrl } from "@/lib/media";
import { requireAdminPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function CastsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; published?: string }>;
}) {
  await requireAdminPerm("casts");
  const { q = "", published = "all" } = await searchParams;
  const casts = await fetchCasts();
  const filtered = casts.filter((c) => {
    const hay = `${c.project_name} ${c.role_name} ${c.shoot_location ?? ""}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (published === "yes" && !c.is_published) return false;
    if (published === "no" && c.is_published) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Cast ilanları"
        description="Yayınla, düzenle, başvuruları gör."
        actions={
          <Button asChild>
            <Link href="/casts/new">Yeni ilan</Link>
          </Button>
        }
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Proje, rol, lokasyon"
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm"
        />
        <select
          name="published"
          defaultValue={published}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="all">Tümü</option>
          <option value="yes">Yayında</option>
          <option value="no">Taslak</option>
        </select>
        <Button type="submit" variant="outline">
          Filtrele
        </Button>
      </form>
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proje</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Yaş / cinsiyet</TableHead>
              <TableHead>Son tarih</TableHead>
              <TableHead>Opsiyon</TableHead>
              <TableHead>Ödeme vadesi</TableHead>
              <TableHead>Bütçe</TableHead>
              <TableHead>Başvuru</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/casts/${c.id}`} className="flex items-center gap-3 font-medium hover:underline">
                    {c.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={displayImageUrl(c.cover_image_url, 96) ?? c.cover_image_url}
                        alt=""
                        className="size-12 shrink-0 rounded-full object-cover ring-1 ring-foreground/10"
                      />
                    ) : (
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                        Logo
                      </span>
                    )}
                    {c.project_name}
                  </Link>
                </TableCell>
                <TableCell>{c.role_name}</TableCell>
                <TableCell>
                  {c.age_min ?? "—"}–{c.age_max ?? "—"} / {label(GENDER, c.gender)}
                </TableCell>
                <TableCell>{formatDate(c.deadline)}</TableCell>
                <TableCell>{formatDate(c.option_date)}</TableCell>
                <TableCell>{formatDate(c.payment_due_date)}</TableCell>
                <TableCell>{formatMoney(c.budget_amount, c.budget_currency)}</TableCell>
                <TableCell>
                  {(c as { application_count?: number }).application_count ?? c.applications?.length ?? 0}
                </TableCell>
                <TableCell>
                  <Badge variant={c.is_published ? "default" : "secondary"}>
                    {c.is_published ? "Yayında" : "Taslak"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
