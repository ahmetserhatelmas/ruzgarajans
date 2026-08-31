import { NextResponse } from "next/server";
import { fetchActorDetail, requireAdmin } from "@/lib/queries";
import { canAdmin } from "@/lib/admin-perms";
import { actorExportSlug, buildActorExportZip } from "@/lib/export-actor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { profile: admin } = await requireAdmin();
  if (!admin || admin.role !== "admin" || !canAdmin(admin, "export_actors")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { profile, actor, photos, videos } = await fetchActorDetail(id);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const zip = await buildActorExportZip({ profile, actor, photos, videos });
  const filename = `${actorExportSlug(profile)}-profil.zip`;

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
