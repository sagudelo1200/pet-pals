import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { BottomSheet } from '@/components/ui'
import { COLOR } from '@/constants'

interface Props {
  visible: boolean
  onClose: () => void
  title?: string
}

const DetallePaseoBottomSheet: React.FC<Props> = ({
  visible,
  onClose,
  title,
}) => {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{title || ''}</Text>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
})

export default DetallePaseoBottomSheet
