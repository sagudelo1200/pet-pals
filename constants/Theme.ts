export const COLORS = {
  // Dark Green Palette
  DEFAULT: '#0A1411',      // Very dark green, almost black (Background)
  PRIMARY: '#3DD598',      // Vibrant mint green (Main actions)
  SECONDARY: '#1A2F2B',    // Dark green (Secondary surfaces, headers)
  BLOCK: '#142520',        // Slightly darker green (Cards, blocks)
  TEXT: '#E1EFE6',          // Light green-tinted white (Main text)
  MUTED: '#809D8E',        // Muted green-gray (Subdued text)
  INPUT: '#244036',        // Dark green for input backgrounds
  INPUT_SUCCESS: '#57A773', // Success green
  INPUT_ERROR: '#F44336',   // Error red
  BORDER: '#244036',       // For borders
  
  // Standard Colors
  LABEL: '#FE2472',         // Kept for high visibility labels if needed
  INFO: '#3B8EA5',          // Calming blue-green
  ERROR: '#F44336',         // Standard red for errors
  SUCCESS: '#57A773',       // A solid, positive green
  WARNING: '#F5B700',       // Noticeable yellow/orange
  
  // Component-specific
  ACTIVE: '#3DD598',        // Same as primary
  BUTTON_COLOR: '#9C26B0',  // wtf (kept as is)
  PLACEHOLDER: '#809D8E',   // Same as muted
  SWITCH_ON: '#3DD598',     // Same as primary
  SWITCH_OFF: '#244036',    // Same as input/border
  GRADIENT_START: '#3DD598',
  GRADIENT_END: '#3B8EA5',
  PRICE_COLOR: '#EAD5FB',
  BORDER_COLOR: '#244036',  // Same as border
  ICON: '#E1EFE6',          // Same as text
  HEADER: '#1A2F2B',        // Same as secondary

  // Inversions for dark mode
  WHITE: '#E1EFE6',         // Represents the main background
  BLACK: '#0A1411',         // Represents the main text color

  // Social Colors (kept as is)
  TWITTER: '#1DA1F2',
  FACEBOOK: '#3B5999',
  DRIBBBLE: '#EA4C89',
} as const;

export default {
  colors: COLORS,
  COLORS,
};
