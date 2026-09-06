'use client';

import { GoogleLogin } from '@react-oauth/google';

type Props = {
  onIdToken: (idToken: string) => void;
  onError: () => void;
};

/**
 * Uses @react-oauth/google's <GoogleLogin> component rather than the
 * useGoogleLogin() hook — GoogleLogin's onSuccess gives a `credential`,
 * which IS a Google ID token (a JWT), matching exactly what our backend's
 * /auth/google endpoint verifies. The hook's default flow instead returns
 * an OAuth access_token, which is a different, incompatible artifact.
 *
 * Left unstyled (Google's own rendered button) rather than reskinned —
 * same reasoning as the mobile app's GoogleSignInButton: Google's own
 * branding guidance expects this button to stay visually distinct from
 * the rest of the app's UI, not blend into your palette.
 */
export function GoogleSignInButton({ onIdToken, onError }: Props) {
  return (
    <div className="flex justify-center [&>div]:!w-full">
      <GoogleLogin
        onSuccess={(response) => {
          if (response.credential) {
            onIdToken(response.credential);
          } else {
            onError();
          }
        }}
        onError={onError}
        theme="outline"
        shape="rectangular"
        size="large"
        width="100%"
        text="continue_with"
      />
    </div>
  );
}
