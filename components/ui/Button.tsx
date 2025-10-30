import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { COLOR } from '@/constants';

export type ButtonVariant =
  | 'primario'
  | 'secundario'
  | 'info'
  | 'error'
  | 'exito'
  | 'alerta'
  | 'bloque'
  | 'enfasis'
  | 'base'
  | 'inactivo';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: any;
  testID?: string;
}

const Button: React.FC<Props> = ({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primario',
  fullWidth,
  style,
  textStyle,
  testID,
}) => {
  const bgColor = useMemo(() => {
    switch (variant) {
      case 'primario':
        return COLOR.PRIMARIO;
      case 'secundario':
        return COLOR.SECUNDARIO;
      case 'info':
        return COLOR.INFO;
      case 'error':
        return COLOR.ERROR;
      case 'exito':
        return COLOR.EXITO;
      case 'alerta':
        return COLOR.ALERTA;
      case 'enfasis':
        return COLOR.ENFASIS;
      case 'base':
        return COLOR.BASE;
      case 'inactivo':
        return COLOR.INACTIVO;
      case 'bloque':
      default:
        return COLOR.BLOQUE;
    }
  }, [variant]);

  const buttonStyles: ViewStyle | ViewStyle[] = [
    styles.button,
    { backgroundColor: bgColor, opacity: disabled || loading ? 0.6 : 1 },
    fullWidth ? styles.fullWidth : undefined,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyles}
    >
      {loading ? (
        <ActivityIndicator size='small' color={COLOR.TEXTO} />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch' as const,
  },
  text: {
    color: COLOR.TEXTO,
    fontWeight: '700',
  },
});

export default Button;
