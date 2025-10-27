import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Input } from 'galio-framework';

import { argonTheme } from '../constants';

// Props interface
interface ArInputProps {
  shadowless?: boolean;
  success?: boolean;
  error?: boolean;
  style?: ViewStyle | ViewStyle[];
  placeholder?: string;
  placeholderTextColor?: string;
  color?: string;
  [key: string]: any; // Para permitir props adicionales del Input de Galio
}

interface ArInputState {}

class ArInput extends React.Component<ArInputProps, ArInputState> {
  static defaultProps: Partial<ArInputProps> = {
    shadowless: false,
    success: false,
    error: false,
  };

  render(): React.ReactNode {
    const { shadowless, success, error, style, ...otherProps } = this.props;

    const inputStyles: ViewStyle = StyleSheet.flatten([
      styles.input,
      !shadowless && styles.shadow,
      success && styles.success,
      error && styles.error,
      style,
    ]);

    return (
      <Input
        placeholder='write something here'
        placeholderTextColor={argonTheme.COLORS.MUTED}
        style={inputStyles}
        color={argonTheme.COLORS.HEADER}
        icon='link'
        family='AntDesign'
        iconProps={{
          size: 14,
          color: argonTheme.COLORS.ICON,
        }}
        {...otherProps}
      />
    );
  }
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 4,
    borderColor: argonTheme.COLORS.BORDER,
    height: 44,
    backgroundColor: '#FFFFFF',
  },
  success: {
    borderColor: argonTheme.COLORS.INPUT_SUCCESS,
  },
  error: {
    borderColor: argonTheme.COLORS.INPUT_ERROR,
  },
  shadow: {
    shadowColor: argonTheme.COLORS.BLACK,
    shadowOffset: { width: 0, height: 0.5 },
    shadowRadius: 1,
    shadowOpacity: 0.13,
    elevation: 2,
  },
});

export default ArInput;