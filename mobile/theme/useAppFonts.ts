import { useFonts, Fraunces_600SemiBold, Fraunces_500Medium } from '@expo-google-fonts/fraunces';
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';

/**
 * Fraunces (display) pairs a serif with real character — slight quirk in
 * its curves — against Manrope (body/UI), a clean geometric sans. Deliberately
 * not a default "Playfair + Inter" pairing; Fraunces has more warmth and
 * personality that suits an astronomy/almanac subject better than a
 * generic editorial serif.
 */
export function useAppFonts() {
  return useFonts({
    Fraunces_600SemiBold,
    Fraunces_500Medium,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
}
