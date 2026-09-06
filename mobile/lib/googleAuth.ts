import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

/**
 * Uses @react-native-google-signin/google-signin rather than the generic
 * expo-auth-session flow — this is what Expo's own current docs recommend
 * for Google specifically, since it uses Android Credential Manager (the
 * legacy Google Sign-In SDK it replaces is deprecated) and gives the
 * native account-picker UX on both platforms.
 *
 * REQUIRES a custom dev client (EAS Build) — this library cannot run
 * inside Expo Go, because it includes native code.
 *
 * webClientId below is the SAME client ID the backend verifies tokens
 * against (GOOGLE_WEB_CLIENT_ID in the backend .env) — this is what lets
 * the backend confirm a given token was actually issued for this app.
 */
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
}

export class GoogleSignInCancelled extends Error {}

export async function signInWithGoogle(): Promise<string> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      throw new GoogleSignInCancelled('Sign-in was cancelled');
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      throw new Error('Google did not return an ID token');
    }
    return idToken;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleSignInCancelled('Sign-in was cancelled');
    }
    throw error;
  }
}
