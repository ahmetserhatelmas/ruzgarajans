import { actorExportSlug, buildActorExportZip, listingExportSlug } from "@/lib/export-actor";
import { APP_STATUS, formatDate, formatMoney } from "@/lib/labels";
import type { ActorProfile, Application, CastListing, GalleryPhoto, Profile, Video } from "@/lib/types";

type ListingInfo = Pick<
  CastListing,
  "id" | "project_name" | "role_name" | "role_description" | "deadline" | "option_date" | "payment_due_date" | "budget_amount" | "budget_currency"
> | null;

export function applicationExportSlug(profile: Profile, listing?: ListingInfo) {
  return `${actorExportSlug(profile)}-${listingExportSlug(listing?.project_name)}-basvuru`;
}

function budgetText(app: Application, listing?: ListingInfo) {
  if (app.accept_budget) return "Kabul etti";
  if (app.counter_budget != null) return formatMoney(app.counter_budget, listing?.budget_currency);
  return "—";
}

export function applicationExcelRow(
  app: Application,
  profile?: Pick<Profile, "full_name" | "email"> | null,
  listing?: Pick<CastListing, "project_name" | "role_name" | "budget_currency"> | null,
) {
  return [
    profile?.full_name || "",
    profile?.email || "",
    listing?.project_name || "",
    listing?.role_name || "",
    APP_STATUS[app.status] ?? app.status,
    app.accept_budget ? "Kabul" : formatMoney(app.counter_budget, listing?.budget_currency),
    app.note || "",
    formatDate(app.created_at),
  ];
}

export async function buildApplicationExportZip(input: {
  profile: Profile;
  actor: ActorProfile | null;
  photos: GalleryPhoto[];
  videos: Video[];
  app: Application;
  listing?: ListingInfo;
}): Promise<Buffer> {
  const { profile, actor, photos, videos, app, listing } = input;
  const fields = [
    { label: "Proje", value: listing?.project_name || "—" },
    { label: "Rol", value: listing?.role_name || "—" },
    { label: "Rol açıklaması", value: listing?.role_description || "—" },
    { label: "Durum", value: APP_STATUS[app.status] ?? app.status },
    { label: "Son başvuru", value: formatDate(listing?.deadline) },
    { label: "Opsiyon tarihi", value: formatDate(listing?.option_date) },
    { label: "Ödeme vadesi", value: formatDate(listing?.payment_due_date) },
    { label: "İlan bütçesi", value: formatMoney(listing?.budget_amount, listing?.budget_currency) },
    { label: "Oyuncu bütçesi", value: budgetText(app, listing) },
    { label: "Not", value: app.note || "—" },
    { label: "Başvuru tarihi", value: formatDate(app.created_at) },
  ];

  return buildActorExportZip({
    profile,
    actor,
    photos,
    videos,
    extraSections: [{ title: "Başvuru", fields }],
    extraFiles: [
      {
        path: "basvuru.txt",
        data: fields.map((field) => `${field.label}: ${field.value}`).join("\n"),
      },
    ],
  });
}
