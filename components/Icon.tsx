import React from 'react'
import * as Font from 'expo-font'
import { createIconSetFromIcoMoon } from '@expo/vector-icons'
import { Icon } from 'galio-framework'

import argonConfig from '../assets/config/argon.json'

const ArgonExtra = require('../assets/font/argon.ttf')
const IconArgonExtra = createIconSetFromIcoMoon(
  argonConfig,
  'ArgonExtra',
  '../assets/font/argon.ttf'
)

// Props interface
interface IconExtraProps {
  name?: string
  family?: string
  size?: number
  color?: string
  [key: string]: any // Para permitir props adicionales
}

// State interface
interface IconExtraState {
  fontLoaded: boolean
}

class IconExtra extends React.Component<IconExtraProps, IconExtraState> {
  state: IconExtraState = {
    fontLoaded: false,
  }

  async componentDidMount(): Promise<void> {
    try {
      await Font.loadAsync({ ArgonExtra: ArgonExtra })
      this.setState({ fontLoaded: true })
    } catch (error) {
      console.warn('Error loading ArgonExtra font:', error)
    }
  }

  render(): React.ReactNode {
    const { name, family, ...rest } = this.props

    if (name && family && this.state.fontLoaded) {
      if (family === 'ArgonExtra') {
        return <IconArgonExtra name={name} family={family} {...rest} />
      }
      return <Icon name={name} family={family} {...rest} />
    }

    return null
  }
}

export default IconExtra
