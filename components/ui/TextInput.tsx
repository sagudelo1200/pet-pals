import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput as RNTextInput, View, ViewStyle } from 'react-native';
import { COLOR } from '@/constants';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  label?: string;
  value: string;
  onChangeText: React.ComponentProps<typeof RNTextInput>['onChangeText'];
  placeholder?: string;
  secureTextEntry?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap; // Soporte simple Ionicons
  errorText?: string;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
  keyboardType?: React.ComponentProps<typeof RNTextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof RNTextInput>['autoCapitalize'];
}

const TextInput: React.FC<Props> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  iconName,
  errorText,
  style,
  testID,
  keyboardType,
  autoCapitalize = 'none',
}) => {
  const [focused, setFocused] = useState(false);

  const containerStyle: ViewStyle | ViewStyle[] = [
    styles.container,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ];

  const borderColor = useMemo(() => {
    if (errorText) return COLOR.ERROR;
    return focused ? COLOR.ENFASIS : COLOR.BORDE;
  }, [errorText, focused]);

  return (
    <View style={containerStyle} testID={testID}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrapper, { borderColor }] }>
        {iconName ? (
          <Ionicons name={iconName} size={18} color={COLOR.SUBTEXTO} style={styles.leftIcon} />
        ) : null}
        <RNTextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLOR.SUBTEXTO}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.BLOQUE,
    borderWidth: 1,
    borderRadius: 6,
    height: 44,
  },
  leftIcon: {
    marginLeft: 10,
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: COLOR.TEXTO,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    color: COLOR.SUBTEXTO,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    color: COLOR.ERROR,
    marginTop: 6,
    fontSize: 12,
  },
});

export default TextInput;
