const React = require('react')
const { View, TextInput } = require('react-native')

module.exports = {
  theme: {
    SIZES: { BASE: 8 },
    COLORS: {},
  },
  // Dummy Input component for backward compatibility
  Input: React.forwardRef((props, ref) => <TextInput ref={ref} {...props} />),
  // Export Text from react-native
  Text: View,
  // Export Block from react-native
  Block: View,
  // Export GalioProvider as a no-op
  GalioProvider: ({ children }) => children,
}
