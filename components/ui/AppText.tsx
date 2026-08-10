import React from 'react'
import { Text, TextProps, TextStyle } from 'react-native'
import { scaleFont } from '../../utils/typography'

type Props = TextProps & {
  size?: number
  style?: TextStyle | TextStyle[]
}

export const AppText: React.FC<Props> = ({
  size = 14,
  style,
  children,
  ...rest
}) => {
  const fontSize = scaleFont(size)
  return (
    <Text allowFontScaling={true} {...rest} style={[{ fontSize }, style]}>
      {children}
    </Text>
  )
}

export default AppText
