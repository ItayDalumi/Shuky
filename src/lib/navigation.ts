import type { Href, router as Router } from 'expo-router';

/** Go back if there is history (e.g. a deep link opened this screen), otherwise replace with a fallback. */
export function goBack(router: typeof Router, fallback: Href) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}

/**
 * Leave onboarding for the main app. The (onboarding) and (app) groups are separate entries of the
 * root stack, so replacing swaps the whole onboarding stack out of history.
 */
export function finishOnboarding(router: typeof Router) {
  router.replace('/home');
}

/** Back to the welcome screen with a clean history (after signing out or deleting the account). */
export function resetToWelcome(router: typeof Router) {
  router.replace('/welcome');
}
