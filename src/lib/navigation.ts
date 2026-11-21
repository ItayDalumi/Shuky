import type { Href, router as Router } from 'expo-router';

/** Go back if there is history (e.g. a deep link opened this screen), otherwise replace with a fallback. */
export function goBack(router: typeof Router, fallback: Href) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}

/** Leave onboarding for the main app without keeping the onboarding screens in history. */
export function finishOnboarding(router: typeof Router) {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/home');
}

/** Back to the welcome screen with a clean history. Phase 2: also supabase.auth.signOut(). */
export function signOut(router: typeof Router) {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/welcome');
}
