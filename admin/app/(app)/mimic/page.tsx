import { PageHeader } from "@/components/page-header";
import { MimicSettingsForm } from "@/components/mimic-settings-form";
import { activateMimicDefaults } from "@/lib/queries";
import { requireAdminPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const DEFAULT_TR = `Kameraya bakabilir misiniz?
Gülümseyebilir misiniz?
Şaşırmış gibi yapabilir misiniz?
Kızgın bir ifade verebilir misiniz?
Üzgün bir ifade verebilir misiniz?
Tekrar gülümseyebilir misiniz?`;

const DEFAULT_EN = `Could you look at the camera?
Could you smile?
Could you look surprised?
Could you show an angry face?
Could you show a sad face?
Could you smile again?`;

export default async function MimicSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireAdminPerm("announcements");
  const settings = await activateMimicDefaults();
  const { error, ok } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mimik rehberi"
        description="Oyuncu mimik videosu çekerken duyduğu cümleler. Her satır bir cümledir. Ses yavaş okur, cümleler arasında bekler."
      />
      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {decodeURIComponent(error)}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {decodeURIComponent(ok)}
        </p>
      ) : null}
      <MimicSettingsForm
        cuesTr={(settings?.mimic_cues_tr ?? []).join("\n") || DEFAULT_TR}
        cuesEn={(settings?.mimic_cues_en ?? []).join("\n") || DEFAULT_EN}
        rate={settings?.mimic_speech_rate ?? 1}
        pauseMs={settings?.mimic_pause_ms ?? 1500}
      />
    </div>
  );
}
