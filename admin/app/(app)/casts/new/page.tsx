import { PageHeader } from "@/components/page-header";
import { CastForm } from "@/components/cast-form";
import { requireAdminPerm } from "@/lib/permissions";

export default async function NewCastPage() {
  await requireAdminPerm("casts");
  return (
    <div>
      <PageHeader title="Yeni cast ilanı" description="Oyuncuların göreceği ilanı oluştur." />
      <CastForm />
    </div>
  );
}
