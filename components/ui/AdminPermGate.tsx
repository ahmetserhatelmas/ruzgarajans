import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { canAdmin, type AdminPerm } from '@/lib/adminAccess';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export function AdminPermGate({
  perm,
  children,
}: {
  perm: AdminPerm;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  if (!canAdmin(profile, perm)) {
    return (
      <View style={{ padding: Spacing.lg }}>
        <Text
          style={{
            fontFamily: Fonts.bodyMedium,
            color: Colors.textMuted,
            fontSize: 15,
          }}
        >
          {t('admin.noAccess')}
        </Text>
      </View>
    );
  }
  return children;
}
