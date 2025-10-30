import React from 'react';
import { TouchableWithoutFeedback, Keyboard, StatusBar, ImageBackground, Dimensions } from 'react-native';
import { Block, Text } from 'galio-framework';

const { width, height } = Dimensions.get('screen');

interface DismissKeyboardProps {
  children: React.ReactNode;
}

const DismissKeyboard: React.FC<DismissKeyboardProps> = ({ children }) => (
  <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
    {children}
  </TouchableWithoutFeedback>
);

const Ingresar: React.FC = () => {
  return (
    <DismissKeyboard>
      <Block flex middle>
        <StatusBar hidden />
        <ImageBackground
            source={require('../assets/imgs/register-bg.png')}
            style={{ width, height, zIndex: 1 }}
        >
            <Block flex middle>
                <Text>Bienvenido a la pantalla de Ingresar</Text>
            </Block>
        </ImageBackground>
      </Block>
    </DismissKeyboard>
  );
};

export default Ingresar;
