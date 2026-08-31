import { NextResponse } from "next/server";
import { fetchActorRows, requireAdmin } from "@/lib/queries";
import { canAdmin } from "@/lib/admin-perms";
import { buildSelectedActorsXlsx } from "@/lib/export-selected-actors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const { profile: admin } = await requireAdmin();
  if (!admin || admin.role !== "admin" || !canAdmin(admin, "export_actors")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ids: string[] = [];
  try {
    const body = (await request.json()) as { ids?: unknown };
    ids = Array.isArray(body.ids)
      ? body.ids.map((id) => String(id)).filter((id) => ID_RE.test(id))
      : [];
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  ids = [...new Set(ids)].slice(0, 80);
  if (ids.length === 0) {
    return NextResponse.json({ error: "Oyuncu seç" }, { status: 400 });
  }

  const all = await fetchActorRows();
  const byId = new Map(all.map((row) => [row.profile.id, row]));
  const rows = ids.map((id) => byId.get(id)).filter((row): row is NonNullable<typeof row> => Boolean(row));
  if (rows.length === 0) {
    return NextResponse.json({ error: "Oyuncu bulunamadı" }, { status: 404 });
  }

  const bytes = await buildSelectedActorsXlsx(rows);
  const today = new Date().toISOString().slice(0, 10);
  const filename = `oyuncular-secili-${today}.xlsx`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
