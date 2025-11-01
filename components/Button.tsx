import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button } from 'galio-framework';

import { COLOR } from '../constants';

// Tipos para los colores disponibles
type ColorType = 
  | 'default'
  | 'primary'
  | 'secondary'
  | 'info'
  | 'error'
  | 'success'
  | 'warning';

// Props interface
interface ArButtonProps {
  small?: boolean;
  shadowless?: boolean;
  color?: string | ColorType;
  style?: ViewStyle | ViewStyle[];
  fontSize?: number;
  children: React.ReactNode;
  [key: string]: any; // Para permitir props adicionales
}

interface ArButtonState {}

class ArButton extends React.Component<ArButtonProps, ArButtonState> {
  render() {
    const { small, shadowless, children, color, style, fontSize, ...props } = this.props;

    const normalize = (c?: string | ColorType): string | undefined => {
      if (!c) return undefined;
      if (typeof c === 'string') {
        const key = c.toLowerCase();
        switch (key) {
          case 'default':
            return COLOR.BLOQUE;
          case 'primary':
            return COLOR.PRIMARIO;
          case 'secondary':
            return COLOR.SECUNDARIO;
          case 'info':
            return COLOR.INFO;
          case 'error':
            return COLOR.ERROR;
          case 'success':
            return COLOR.EXITO;
          case 'warning':
            return COLOR.ALERTA;
          case 'transparent':
            return 'transparent';
          default:
            return c; // Assume custom color string (e.g., hex)
        }
      }
      return undefined;
    };

    const colorStyle = normalize(color);

    const buttonStyles: ViewStyle = StyleSheet.flatten([
      small && styles.smallButton,
      color && { backgroundColor: colorStyle },
      !shadowless && styles.shadow,
      ...(Array.isArray(style) ? style : [style]),
    ]);

    const textStyle: TextStyle = { 
      fontSize: fontSize || 12, 
      fontWeight: '700' 
    };

    return (
      <Button
        style={buttonStyles}
        textStyle={textStyle}
        {...props}
      >
        {children}
      </Button>
    );
  }
}

const styles = StyleSheet.create({
  smallButton: {
    width: 75,
    height: 28,
  },
  shadow: {
    shadowColor: COLOR.BASE,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    shadowOpacity: 0.1,
    elevation: 2,
  },
});

export default ArButton;