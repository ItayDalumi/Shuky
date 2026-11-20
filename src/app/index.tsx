import { Redirect } from 'expo-router';

/** Phase 1 always starts at onboarding. Phase 2: redirect to /home when a Supabase session exists. */
export default function Index() {
  return <Redirect href="/welcome" />;
}
