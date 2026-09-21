import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export function MediaSourceButtons({
  loading,
  onTake,
  onLibrary,
}: {
  loading?: boolean;
  onTake: () => void;
  onLibrary: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Button label={t('media.takeNow')} onPress={onTake} loading={loading} />
      <Button
        label={t('media.pickFromGallery')}
        variant="secondary"
        onPress={onLibrary}
        loading={loading}
      />
    </>
  );
}
