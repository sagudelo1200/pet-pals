import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Dimensions,
  Image,
  Linking,
} from 'react-native';
import { Block, Text, theme } from 'galio-framework';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import Images from '../constants/Images';
import { DrawerItem as DrawerCustomItem } from '../components';
import { RootDrawerParamList } from './Screens';

const { width } = Dimensions.get('screen');

type ScreenItem = {
  title: string;
  navigateTo: keyof RootDrawerParamList;
};

const screens: ScreenItem[] = [
  { title: 'Home', navigateTo: 'HomeDrawer' },
  { title: 'Mascotas', navigateTo: 'MascotasDrawer' },
  { title: 'Profile', navigateTo: 'ProfileDrawer' },
  { title: 'Account', navigateTo: 'AccountDrawer' },
  { title: 'Elements', navigateTo: 'ElementsDrawer' },
  { title: 'Articles', navigateTo: 'ArticlesDrawer' },
  { title: 'Settings', navigateTo: 'SettingsDrawer' },
];

export default function CustomDrawerContent(
  props: DrawerContentComponentProps
): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { state, navigation } = props;

  return (
    <Block style={[styles.container, { paddingTop: insets.top }]}>
      <Block flex={0.06} style={styles.header}>
        <Image source={Images.Logo} style={styles.logo} />
      </Block>
      <Block flex style={{ paddingHorizontal: 14 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {screens.map((item, index) => (
            <DrawerCustomItem
              key={index}
              title={item.title}
              navigation={navigation}
              focused={state.index === index}
              navigateTo={item.navigateTo}
            />
          ))}
          <Block
            flex
            style={{
              marginTop: 24,
              marginVertical: 8,
              paddingHorizontal: 8,
            }}
          >
            <Block
              style={{
                borderColor: 'rgba(0,0,0,0.2)',
                width: '100%',
                borderWidth: StyleSheet.hairlineWidth,
              }}
            />
            <Text
              color='#8898AA'
              style={{
                marginTop: 16,
                marginLeft: 8,
                fontFamily: 'open-sans-regular',
              }}
              onPress={() =>
                Linking.openURL('https://your-docs-url.com')
              }
            >
              DOCUMENTATION
            </Text>
          </Block>
          <DrawerCustomItem
            title='Getting Started'
            navigation={navigation}
            navigateTo='HomeDrawer'
          />
        </ScrollView>
      </Block>
    </Block>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 28,
    paddingBottom: theme.SIZES.BASE,
    paddingTop: theme.SIZES.BASE * 3,
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.5,
    height: width * 0.15,
    resizeMode: 'contain',
  },
});