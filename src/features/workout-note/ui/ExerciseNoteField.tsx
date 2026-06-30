import { useEffect, useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { spacing, useThemeColors } from '@shared/ui/theme';

interface ExerciseNoteFieldProps {
  dirty: boolean;
  editing: boolean;
  onChangeText: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
  value: string;
}

export const ExerciseNoteField = ({
  dirty,
  editing,
  onChangeText,
  onEdit,
  onSave,
  value,
}: ExerciseNoteFieldProps) => {
  const colors = useThemeColors();
  const inputRef = useRef<TextInput | null>(null);
  const saveActive = editing && dirty;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  return (
    <View
      style={{
        backgroundColor: editing ? colors.surface : colors.secondarySurface,
        borderColor: editing ? colors.primary : colors.border,
        borderRadius: 10,
        borderWidth: 1,
        minHeight: 88,
        position: 'relative',
      }}>
      <Text
        style={{
          color: colors.muted,
          fontSize: 13,
          fontWeight: '700',
          left: spacing.md,
          position: 'absolute',
          top: 10,
          zIndex: 1,
        }}>
        Exercise comment
      </Text>
      <Pressable
        accessibilityLabel={editing ? 'Save exercise comment' : 'Edit exercise comment'}
        accessibilityRole="button"
        onPress={editing ? onSave : onEdit}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: saveActive ? colors.primary : colors.secondarySurface,
          borderColor: saveActive ? colors.primary : colors.secondaryBorder,
          borderRadius: 18,
          borderWidth: 1,
          flexDirection: 'row',
          gap: 4,
          minHeight: 34,
          opacity: pressed ? 0.8 : 1,
          paddingHorizontal: 10,
          position: 'absolute',
          right: 8,
          top: 7,
          zIndex: 2,
        })}>
        <MaterialIcons
          color={saveActive ? colors.primaryText : colors.secondaryText}
          name={editing ? 'check' : 'edit'}
          size={16}
        />
        <Text
          style={{
            color: saveActive ? colors.primaryText : colors.secondaryText,
            fontSize: 13,
            fontWeight: '800',
          }}>
          {editing ? 'Save' : 'Edit'}
        </Text>
      </Pressable>
      <TextInput
        editable={editing}
        multiline
        onChangeText={onChangeText}
        placeholder="Technique, setup, how it felt..."
        placeholderTextColor={colors.muted}
        ref={inputRef}
        scrollEnabled={false}
        style={{
          color: colors.text,
          fontSize: 16,
          minHeight: 86,
          opacity: editing ? 1 : 0.82,
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingTop: 44,
          textAlignVertical: 'top',
        }}
        value={value}
      />
    </View>
  );
};
