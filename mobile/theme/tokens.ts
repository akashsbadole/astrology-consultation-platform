/**
 * Design direction: an astronomical instrument at night, not a "mystical"
 * cliché. The palette comes from indigo night sky + brass/gold measuring
 * instruments (astrolabes, armillary spheres) — precision and observation,
 * not swirling purple smoke. Avoid: gradients-as-decoration, drop-shadow
 * card soup, all-caps labels.
 */

export const colors = {
  midnight: '#12132B',      // primary background
  midnightDeep: '#0A0B1D',  // gradient depth / admin surface
  parchment: '#F6F1E7',     // form panel surface
  parchmentDim: '#EAE3D3',  // input fill on parchment
  brass: '#C6A15B',         // primary accent — buttons, active states
  brassDim: '#8C7239',      // secondary accent — dividers, icons
  ink: '#1B1C2E',           // body text on parchment
  mist: 'rgba(246, 241, 231, 0.64)', // secondary text on midnight
  mistFaint: 'rgba(246, 241, 231, 0.28)', // hairline borders on midnight
  error: '#C1584B',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 6,
  sm: 12,
  md: 20,
  lg: 32,
  xl: 48,
  xxl: 64,
} as const;

export const radius = {
  sm: 10,
  md: 20, // deliberate — not the generic 8/full-round default
  pill: 999,
} as const;

export const type = {
  display: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  subhead: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  body: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    lineHeight: 21,
  },
  button: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
} as const;
