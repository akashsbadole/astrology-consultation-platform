import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme/tokens';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthTextInput({ label, error, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          style,
        ]}
        placeholderTextColor={colors.brassDim}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...type.label,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.parchmentDim,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.sm,
    paddingVertical: 13,
    ...type.body,
    color: colors.ink,
  },
  inputFocused: {
    borderColor: colors.brass,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...type.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
