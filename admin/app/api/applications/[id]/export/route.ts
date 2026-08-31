import { NextResponse } from "next/server";
import { canAdmin } from "@/lib/admin-perms";
import { applicationExportSlug, buildApplicationExportZip } from "@/lib/export-application";
import { fetchApplicationDetail, requireAdmin } from "@/lib/queries";
import type { CastListing } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { profile: admin } = await requireAdmin();
  if (
    !admin ||
    admin.role !== "admin" ||
    !canAdmin(admin, "export_applications")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { app, actor, videos } = await fetchApplicationDetail(id);
  if (!app || !actor?.profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const listing = (app.cast_listings ?? null) as Pick<
    CastListing,
    | "id"
    | "project_name"
    | "role_name"
    | "role_description"
    | "deadline"
    | "option_date"
    | "payment_due_date"
    | "budget_amount"
    | "budget_currency"
  > | null;
  const mergedVideos = [...(actor.videos ?? []), ...videos].filter(
    (video, index, list) => list.findIndex((item) => item.id === video.id) === index
  );

  try {
    const zip = await buildApplicationExportZip({
      profile: actor.profile,
      actor: actor.actor,
      photos: actor.photos,
      videos: mergedVideos,
      app,
      listing,
    });
    const filename = `${applicationExportSlug(actor.profile, listing)}.zip`;

    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("application export failed", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
