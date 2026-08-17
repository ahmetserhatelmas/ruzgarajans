import { upsertCastAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSearchSelect } from "@/components/multi-search-select";
import { countryOptions, languageOptions } from "@/lib/geo";
import type { CastListing } from "@/lib/types";

export function CastForm({ cast }: { cast?: CastListing }) {
  return (
    <form action={upsertCastAction} className="grid max-w-3xl gap-4">
      {cast ? <input type="hidden" name="id" value={cast.id} /> : null}
      <Field label="Proje">
        <Input name="project_name" required defaultValue={cast?.project_name} />
      </Field>
      <Field label="Rol">
        <Input name="role_name" required defaultValue={cast?.role_name} />
      </Field>
      <Field label="Rol açıklaması">
        <Textarea name="role_description" required rows={5} defaultValue={cast?.role_description} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Yaş min">
          <Input name="age_min" type="number" defaultValue={cast?.age_min ?? ""} />
        </Field>
        <Field label="Yaş max">
          <Input name="age_max" type="number" defaultValue={cast?.age_max ?? ""} />
        </Field>
        <Field label="Boy min">
          <Input name="height_min_cm" type="number" defaultValue={cast?.height_min_cm ?? ""} />
        </Field>
        <Field label="Boy max">
          <Input name="height_max_cm" type="number" defaultValue={cast?.height_max_cm ?? ""} />
        </Field>
        <Field label="Cinsiyet">
          <select
            name="gender"
            defaultValue={cast?.gender ?? "any"}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="any">Fark etmez</option>
            <option value="female">Kadın</option>
            <option value="male">Erkek</option>
            <option value="non_binary">Non-binary</option>
          </select>
        </Field>
        <Field label="Çekim yeri">
          <Input name="shoot_location" defaultValue={cast?.shoot_location ?? ""} />
        </Field>
        <Field label="Çekim tarihi">
          <Input name="shoot_date" type="date" defaultValue={cast?.shoot_date ?? ""} />
        </Field>
        <Field label="Son başvuru">
          <Input name="deadline" type="date" defaultValue={cast?.deadline ?? ""} />
        </Field>
        <Field label="Bütçe (TRY)">
          <Input name="budget_amount" type="number" defaultValue={cast?.budget_amount ?? ""} />
        </Field>
      </div>
      <Field label="Uyruk">
        <MultiSearchSelect
          name="nationalities"
          options={countryOptions()}
          defaultValue={cast?.nationalities ?? []}
          placeholder="Ülke ara — boşsa fark etmez"
        />
      </Field>
      <Field label="Konuştuğu dil">
        <MultiSearchSelect
          name="languages"
          options={languageOptions()}
          defaultValue={cast?.languages ?? []}
          placeholder="Dil ara — boşsa fark etmez"
        />
      </Field>
      <p className="text-sm text-muted-foreground">
        Cinsiyet, yaş, uyruk veya dil doldurulursa yalnızca uyan onaylı oyunculara
        “Size uygun bir rol var” bildirimi gider. Hepsi boşsa bildirim gitmez; ilan
        yine herkese görünür.
      </p>
      <Field label="Diyalog / senaryo">
        <Textarea name="dialogue_script" rows={4} defaultValue={cast?.dialogue_script ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="allow_budget_counter"
          defaultChecked={cast?.allow_budget_counter ?? true}
        />
        Karşı bütçe teklifine izin ver
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_published" defaultChecked={cast?.is_published ?? true} />
        Yayınla
      </label>
      <Button type="submit">{cast ? "Kaydet" : "İlan oluştur"}</Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
