import React, { useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text } from 'galio-framework'
import { Icon, Card, BottomSheet } from '@/components/ui'
import { useTranslation } from 'react-i18next'
import { setLanguage, getCurrentLanguage } from '@/services/i18n'
import { LinearGradient } from 'expo-linear-gradient'
import { COLOR } from '@/constants'

const labels: Record<string, string> = {
  es: 'Español',
  en: 'English',
}

const LanguageSwitcher: React.FC = () => {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const current = getCurrentLanguage() || 'es'

  const open = () => setVisible(true)
  const close = () => setVisible(false)

  const handleSelect = (lang: string) => {
    setLanguage(lang)
    close()
  }

  return (
    <>
      <Card style={styles.card} onPress={open}>
        <LinearGradient
          colors={[COLOR.PRIMARIO, COLOR.ENFASIS]}
          start={[0, 0]}
          end={[1, 1]}
          style={styles.gradient}
        >
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Icon name="globe" size={18} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titleLight}>
                {t('comun:idioma') || 'Language'}
              </Text>
              <Text style={styles.subtitleLight}>
                {labels[current] ?? current}
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color="#FFF" />
          </View>
        </LinearGradient>
      </Card>

      <BottomSheet visible={visible} onClose={close}>
        <Text style={styles.sheetTitle}>{t('comun:idioma') || 'Language'}</Text>
        <Text style={styles.sheetSubtitle}>
          {t('comun:idioma_subtitulo') || 'Choose app language'}
        </Text>

        <View style={{ marginTop: 16 }}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => handleSelect('es')}
          >
            <Text style={styles.flag}>🇨🇴</Text>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Español</Text>
            </View>
            {current === 'es' && (
              <Icon name="check" size={18} color={COLOR.PRIMARIO} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => handleSelect('en')}
          >
            <View style={{ marginRight: 12 }}>
              <Icon name="globe" size={22} color={COLOR.PRIMARIO} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>English</Text>
            </View>
            {current === 'en' && (
              <Icon name="check" size={18} color={COLOR.PRIMARIO} />
            )}
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: COLOR.BLOQUE,
  },
  gradient: {
    padding: 12,
    borderRadius: 12,
  },
  titleLight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  subtitleLight: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  flag: {
    fontSize: 22,
    marginRight: 12,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  optionSubtitle: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
  },
})

export default LanguageSwitcher
