import React from 'react'
import { TextInput, TextInputProps, TextStyle } from 'react-native'
import { scaleFont } from '../../utils/typography'

type Props = TextInputProps & {
  size?: number
  style?: TextStyle | TextStyle[]
}

export const AppTextInput: React.FC<Props> = ({
  size = 14,
  style,
  ...rest
}) => {
  const fontSize = scaleFont(size)
  return (
    <TextInput
      allowFontScaling={true}
      {...rest}
      style={[{ fontSize }, style]}
    />
  )
}

export default AppTextInput
