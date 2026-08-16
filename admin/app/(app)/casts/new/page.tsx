import { PageHeader } from "@/components/page-header";
import { CastForm } from "@/components/cast-form";

export default function NewCastPage() {
  return (
    <div>
      <PageHeader title="Yeni cast ilanı" description="Oyuncuların göreceği ilanı oluştur." />
      <CastForm />
    </div>
  );
}
