import { Text, TextInput, View } from 'react-native';

import { spacing, useThemeColors } from './theme';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
  placeholder?: string;
}

export const TextField = ({ label, value, onChangeText, keyboardType = 'default', placeholder }: TextFieldProps) => {
  const colors = useThemeColors();

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={{
          minHeight: 48,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 8,
          borderWidth: 1,
          color: colors.text,
          fontSize: 16,
          paddingHorizontal: spacing.md,
        }}
        value={value}
      />
    </View>
  );
};
