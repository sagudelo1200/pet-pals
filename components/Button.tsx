import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button } from 'galio-framework';

import argonTheme from '../constants/Theme';

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

    const colorStyle = color && argonTheme.COLORS[color.toUpperCase() as keyof typeof argonTheme.COLORS];

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
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    shadowOpacity: 0.1,
    elevation: 2,
  },
});

export default ArButton;