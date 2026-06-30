import { Text, TextInput, View } from 'react-native';

import { useLayoutMetrics } from './layout';
import { spacing, useThemeColors } from './theme';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
  placeholder?: string;
  editable?: boolean;
  multiline?: boolean;
  onBlur?: () => void;
}

export const TextField = ({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  placeholder,
  editable = true,
  multiline = false,
  onBlur,
}: TextFieldProps) => {
  const colors = useThemeColors();
  const layout = useLayoutMetrics();

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>{label}</Text> : null}
      <TextInput
        keyboardType={keyboardType}
        editable={editable}
        multiline={multiline}
        onBlur={onBlur}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={{
          minHeight: layout.controlMinHeight,
          maxHeight: multiline ? 120 : undefined,
          backgroundColor: editable ? colors.surface : colors.secondarySurface,
          borderColor: colors.border,
          borderRadius: 8,
          borderWidth: 1,
          color: colors.text,
          fontSize: 16,
          opacity: editable ? 1 : 0.78,
          paddingHorizontal: spacing.md,
        }}
        value={value}
      />
    </View>
  );
};
