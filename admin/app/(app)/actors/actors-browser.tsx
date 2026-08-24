"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActorStatusBadge } from "@/components/status-badge";
import { hasCompletedForm, hasRequiredMedia } from "@/lib/access";
import { downloadXlsx } from "@/lib/export-table-xlsx";
import { ACTOR_STATUS, ageFromBirth, DANCES, EYES, GENDER, HAIR, label, SPORTS } from "@/lib/labels";
import { setActorStatusAction } from "@/lib/actions";
import type { ActorRow, ActorStatus } from "@/lib/types";

function setParam(params: URLSearchParams, key: string, value: string) {
  if (!value || value === "all") params.delete(key);
  else params.set(key, value);
}

export function ActorsBrowser({ rows }: { rows: ActorRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const gender = searchParams.get("gender") ?? "all";
  const form = searchParams.get("form") ?? "all";
  const media = searchParams.get("media") ?? "all";
  const hair = searchParams.get("hair") ?? "all";
  const eyes = searchParams.get("eyes") ?? "all";
  const sport = searchParams.get("sport") ?? "all";
  const dance = searchParams.get("dance") ?? "all";
  const ageMin = searchParams.get("ageMin") ?? "";
  const ageMax = searchParams.get("ageMax") ?? "";
  const heightMin = searchParams.get("heightMin") ?? "";
  const heightMax = searchParams.get("heightMax") ?? "";

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) setParam(next, k, v);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const name = `${row.profile.full_name ?? ""} ${row.profile.email ?? ""} ${row.profile.phone ?? ""} ${row.actor?.national_id ?? ""} ${row.actor?.city ?? ""}`.toLowerCase();
      if (q && !name.includes(q.toLowerCase())) return false;
      if (status !== "all" && row.profile.actor_status !== status) return false;
      if (gender !== "all" && row.actor?.gender !== gender) return false;
      if (form === "complete" && !hasCompletedForm(row.actor)) return false;
      if (form === "missing" && hasCompletedForm(row.actor)) return false;
      const mediaOk = hasRequiredMedia(row.profile, row.actor, row.photoKinds);
      if (media === "complete" && !mediaOk) return false;
      if (media === "missing" && mediaOk) return false;
      if (hair !== "all" && row.actor?.hair_color !== hair) return false;
      if (eyes !== "all" && row.actor?.eye_color !== eyes) return false;
      if (sport !== "all" && !(row.actor?.sports ?? []).includes(sport)) return false;
      if (dance !== "all" && !(row.actor?.dances ?? []).includes(dance)) return false;
      const age = ageFromBirth(row.actor?.birth_date);
      if (ageMin && (age == null || age < Number(ageMin))) return false;
      if (ageMax && (age == null || age > Number(ageMax))) return false;
      const h = row.actor?.height_cm;
      if (heightMin && (h == null || h < Number(heightMin))) return false;
      if (heightMax && (h == null || h > Number(heightMax))) return false;
      return true;
    });
  }, [rows, q, status, gender, form, media, hair, eyes, sport, dance, ageMin, ageMax, heightMin, heightMax]);

  const exportExcel = () => {
    const headers = ["Ad", "E-posta", "Durum", "Yaş", "Cinsiyet", "Boy", "Saç", "Göz", "Form", "Medya"];
    const data = filtered.map((row) => {
      const mediaOk = hasRequiredMedia(row.profile, row.actor, row.photoKinds);
      return [
        row.profile.full_name || "",
        row.profile.email || "",
        ACTOR_STATUS[row.profile.actor_status] ?? row.profile.actor_status,
        ageFromBirth(row.actor?.birth_date)?.toString() ?? "",
        label(GENDER, row.actor?.gender),
        row.actor?.height_cm != null ? String(row.actor.height_cm) : "",
        label(HAIR, row.actor?.hair_color),
        label(EYES, row.actor?.eye_color),
        hasCompletedForm(row.actor) ? "Tamam" : "Eksik",
        mediaOk ? "Tamam" : "Eksik",
      ];
    });
    const today = new Date().toISOString().slice(0, 10);
    void downloadXlsx(`oyuncular-${today}.xlsx`, headers, data, "Oyuncular");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:grid-cols-4">
        <Field label="Ara">
          <Input
            placeholder="Ad, e-posta, telefon, TCKN, şehir"
            defaultValue={q}
            onChange={(e) => update({ q: e.target.value })}
          />
        </Field>
        <SelectField
          label="Durum"
          value={status}
          onChange={(v) => update({ status: v })}
          options={[
            ["all", "Tümü"],
            ["pending", "Onay bekliyor"],
            ["approved", "Onaylı"],
            ["rejected", "Reddedildi"],
          ]}
        />
        <SelectField
          label="Cinsiyet"
          value={gender}
          onChange={(v) => update({ gender: v })}
          options={[["all", "Tümü"], ...Object.entries(GENDER)]}
        />
        <SelectField
          label="Kayıt formu"
          value={form}
          onChange={(v) => update({ form: v })}
          options={[
            ["all", "Tümü"],
            ["complete", "Tamamlanmış"],
            ["missing", "Eksik"],
          ]}
        />
        <SelectField
          label="Medya"
          value={media}
          onChange={(v) => update({ media: v })}
          options={[
            ["all", "Tümü"],
            ["complete", "Zorunlular tam"],
            ["missing", "Eksik"],
          ]}
        />
        <SelectField
          label="Saç"
          value={hair}
          onChange={(v) => update({ hair: v })}
          options={[["all", "Tümü"], ...Object.entries(HAIR)]}
        />
        <SelectField
          label="Göz"
          value={eyes}
          onChange={(v) => update({ eyes: v })}
          options={[["all", "Tümü"], ...Object.entries(EYES)]}
        />
        <SelectField
          label="Spor"
          value={sport}
          onChange={(v) => update({ sport: v })}
          options={[["all", "Tümü"], ...Object.entries(SPORTS)]}
        />
        <SelectField
          label="Dans"
          value={dance}
          onChange={(v) => update({ dance: v })}
          options={[["all", "Tümü"], ...Object.entries(DANCES)]}
        />
        <Field label="Yaş min">
          <Input type="number" defaultValue={ageMin} onChange={(e) => update({ ageMin: e.target.value })} />
        </Field>
        <Field label="Yaş max">
          <Input type="number" defaultValue={ageMax} onChange={(e) => update({ ageMax: e.target.value })} />
        </Field>
        <Field label="Boy min">
          <Input type="number" defaultValue={heightMin} onChange={(e) => update({ heightMin: e.target.value })} />
        </Field>
        <Field label="Boy max">
          <Input type="number" defaultValue={heightMax} onChange={(e) => update({ heightMax: e.target.value })} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{filtered.length} oyuncu</p>
        <Button type="button" variant="outline" disabled={filtered.length === 0} onClick={exportExcel}>
          Excel indir
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Oyuncu</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Yaş / cinsiyet</TableHead>
              <TableHead>Boy / saç / göz</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Medya</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => {
              const mediaOk = hasRequiredMedia(row.profile, row.actor, row.photoKinds);
              return (
                <TableRow key={row.profile.id}>
                  <TableCell>
                    <Link href={`/actors/${row.profile.id}`} className="font-medium hover:underline">
                      {row.profile.full_name || "—"}
                    </Link>
                    <div className="text-xs text-muted-foreground">{row.profile.email}</div>
                  </TableCell>
                  <TableCell>
                    <ActorStatusBadge status={row.profile.actor_status} />
                  </TableCell>
                  <TableCell>
                    {ageFromBirth(row.actor?.birth_date) ?? "—"} / {label(GENDER, row.actor?.gender)}
                  </TableCell>
                  <TableCell>
                    {row.actor?.height_cm ?? "—"} · {label(HAIR, row.actor?.hair_color)} ·{" "}
                    {label(EYES, row.actor?.eye_color)}
                  </TableCell>
                  <TableCell>{hasCompletedForm(row.actor) ? "Tamam" : "Eksik"}</TableCell>
                  <TableCell>{mediaOk ? "Tamam" : "Eksik"}</TableCell>
                  <TableCell className="text-right">
                    {row.profile.actor_status === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          onClick={() =>
                            void setActorStatusAction(row.profile.id, "approved" as ActorStatus)
                          }
                        >
                          Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            void setActorStatusAction(row.profile.id, "rejected" as ActorStatus)
                          }
                        >
                          Reddet
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/actors/${row.profile.id}`}>Detay</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Bu filtrelere uyan oyuncu yok.
          </p>
        ) : null}
      </div>
    </div>
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

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <Field label={label}>
      <select
        className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </Field>
  );
}
