import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchAnnouncements } from "@/lib/queries";
import { deleteAnnouncementAction, upsertAnnouncementAction } from "@/lib/actions";
import { formatDate } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const items = await fetchAnnouncements();

  return (
    <div className="space-y-8">
      <PageHeader title="Duyurular" description="Uygulama ana sayfasında görünen metinler." />

      <form action={upsertAnnouncementAction} className="grid max-w-2xl gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <p className="font-medium">Yeni duyuru</p>
        <div className="grid gap-1.5">
          <Label>Başlık (TR)</Label>
          <Input name="title_tr" required />
        </div>
        <div className="grid gap-1.5">
          <Label>Title (EN)</Label>
          <Input name="title_en" />
        </div>
        <div className="grid gap-1.5">
          <Label>Metin (TR)</Label>
          <Textarea name="body_tr" required rows={4} />
        </div>
        <div className="grid gap-1.5">
          <Label>Body (EN)</Label>
          <Textarea name="body_en" rows={4} />
        </div>
        <Button type="submit">Yayınla</Button>
      </form>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="font-medium">{item.title_tr}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.body_tr}</p>
            <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
            <form action={deleteAnnouncementAction.bind(null, item.id)} className="mt-3">
              <Button type="submit" variant="destructive" size="sm">
                Sil
              </Button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
