import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import type { ExerciseCommentEntry } from '@entities/exercise-comment/model/types';
import { Card } from '@shared/ui/Card';
import { useLayoutMetrics } from '@shared/ui/layout';
import { spacing, useThemeColors } from '@shared/ui/theme';

interface ExerciseCommentHistoryModalProps {
  entries: ExerciseCommentEntry[];
  exerciseName: string;
  loading: boolean;
  onClose: () => void;
  visible: boolean;
}

export const ExerciseCommentHistoryModal = ({
  entries,
  exerciseName,
  loading,
  onClose,
  visible,
}: ExerciseCommentHistoryModalProps) => {
  const colors = useThemeColors();
  const layout = useLayoutMetrics();

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <ScrollView
        contentContainerStyle={{
          backgroundColor: colors.background,
          flexGrow: 1,
          gap: spacing.lg,
          padding: layout.screenPadding,
          paddingBottom: 48,
        }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>Comment history</Text>
            <Text style={{ color: colors.muted }}>{exerciseName}</Text>
          </View>
          <Pressable
            accessibilityLabel="Close comment history"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => ({
              alignItems: 'center',
              borderColor: colors.secondaryBorder,
              borderRadius: 22,
              borderWidth: 1,
              height: 44,
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
              width: 44,
            })}>
            <MaterialIcons color={colors.secondaryText} name="close" size={24} />
          </Pressable>
        </View>
        {loading ? <Text style={{ color: colors.muted }}>Loading comments…</Text> : null}
        {!loading && entries.length === 0 ? (
          <Card>
            <Text style={{ color: colors.muted }}>No comments have been saved for this exercise yet.</Text>
          </Card>
        ) : null}
        {entries.map(entry => (
          <Card key={entry.id}>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>
              {entry.createdAt.slice(0, 10)}
            </Text>
            <Text style={{ color: colors.text, fontSize: 16 }}>
              {entry.text || 'Comment cleared'}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </Modal>
  );
};
