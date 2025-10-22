import React from 'react';
import { StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Block, Text } from 'galio-framework';

import Icon from './Icon';
import argonTheme from '../constants/Theme';

interface DrawerItemProps {
    title: string;
    focused?: boolean;
    navigation: any;
    navigateTo: string;
}

const DrawerItem: React.FC<DrawerItemProps> = ({ 
  title, 
  focused = false, 
  navigation, 
  navigateTo 
}) => {
  const renderIcon = (): React.ReactElement | null => {
    switch (title) {
      case 'Inicio':
        return (
          <Icon
            name='shop'
            family='ArgonExtra'
            size={14}
            color={focused ? 'white' : argonTheme.COLORS.PRIMARY}
          />
        );
      case 'Mis Mascotas':
        return (
          <Icon
            name='spaceship'
            family='ArgonExtra'
            size={14}
            color={focused ? 'white' : argonTheme.COLORS.ERROR}
          />
        );
      case 'Sobre Nosotros':
        return (
          <Icon
            name='spaceship'
            family='ArgonExtra'
            size={14}
            color={focused ? 'white' : 'rgba(0,0,0,0.5)'}
          />
        );
      default:
        return null;
    }
  };

  const handlePress = (): void => {
    if (title === 'Getting Started') {
      Linking.openURL(
        'https://demos.creative-tim.com/argon-pro-react-native/docs/'
      ).catch((err) => console.error('An error occurred', err));
    } else {
      navigation.navigate(navigateTo);
    }
  };

  return (
    <TouchableOpacity
      style={{ height: 60 }}
      onPress={handlePress}
    >
      <Block 
        flex 
        row 
        style={Object.assign(
          {},
          styles.defaultStyle,
          focused ? styles.activeStyle : {},
          focused ? styles.shadow : {}
        )}
      >
        <Block middle flex={0.1} style={{ marginRight: 5 }}>
          {renderIcon()}
        </Block>
        <Block row center flex={0.9}>
          <Text
            style={{ fontFamily: 'open-sans-regular' }}
            size={15}
            bold={focused}
            color={focused ? 'white' : 'rgba(0,0,0,0.5)'}
          >
            {title}
          </Text>
        </Block>
      </Block>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  defaultStyle: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  activeStyle: {
    backgroundColor: argonTheme.COLORS.ACTIVE,
    borderRadius: 4,
  },
  shadow: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 8,
    shadowOpacity: 0.1,
  },
});

export default DrawerItem;