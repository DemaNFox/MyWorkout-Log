import { ActivityIndicator, Modal, Text, View } from 'react-native';

import { Button } from './Button';
import { spacing, useThemeColors } from './theme';

export type OperationStatus = 'loading' | 'success' | 'error';

interface OperationStatusModalProps {
  status: OperationStatus;
  title: string;
  message: string;
  visible: boolean;
  onClose: () => void;
}

export const OperationStatusModal = ({
  status,
  title,
  message,
  visible,
  onClose,
}: OperationStatusModalProps) => {
  const colors = useThemeColors();
  const isLoading = status === 'loading';
  const statusColor = status === 'error' ? colors.danger : colors.success;

  return (
    <Modal
      animationType="fade"
      onRequestClose={isLoading ? undefined : onClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View
        accessibilityViewIsModal
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.58)',
          padding: spacing.xl,
        }}>
        <View
          style={{
            width: '100%',
            maxWidth: 420,
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: 16,
            borderWidth: 1,
            gap: spacing.md,
            padding: spacing.xl,
          }}>
          {isLoading ? (
            <ActivityIndicator accessibilityLabel="Operation in progress" color={colors.primary} size="large" />
          ) : (
            <View
              style={{
                width: 56,
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  status === 'error' ? colors.badgeDangerBackground : colors.badgeSuccessBackground,
                borderRadius: 28,
              }}>
              <Text style={{ color: statusColor, fontSize: 30, fontWeight: '900' }}>
                {status === 'error' ? '!' : '✓'}
              </Text>
            </View>
          )}
          <Text
            accessibilityRole="header"
            style={{ color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
            {title}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
            {message}
          </Text>
          {!isLoading ? (
            <View style={{ alignSelf: 'stretch', marginTop: spacing.xs }}>
              <Button onPress={onClose}>{status === 'error' ? 'Close' : 'Done'}</Button>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};
