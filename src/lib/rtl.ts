import { I18nManager, Platform } from 'react-native';

/**
 * Force the whole app into right-to-left (Hebrew) layout.
 *
 * - Native: `I18nManager.forceRTL` (plus `forcesRTL` in app.json for the first launch).
 * - Web: react-native-web ignores I18nManager and follows the DOM `dir` attribute,
 *   so we set it on <html> (public/index.html sets it too, to avoid a flash).
 */
export function setupRTL() {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'he';
    }
    return;
  }
  I18nManager.allowRTL(true);
  if (!I18nManager.isRTL) {
    I18nManager.forceRTL(true);
  }
}

/**
 * Wrap a left-to-right snippet (numbers with units, "+20 XP", phone numbers) in Unicode
 * directional isolates so it renders in the right order inside Hebrew text.
 */
export function ltr(text: string) {
  return `⁦${text}⁩`;
}

/**
 * react-native-web resolves `start`/`end`, text alignment and input direction from a `dir`
 * prop on the nearest View/Text/TextInput (its default context is LTR). Spread this on the
 * app root, on modal roots (portals) and on inputs. No-op on native, where I18nManager rules.
 */
export function webDir(dir: 'rtl' | 'ltr'): { dir?: 'rtl' | 'ltr' } {
  return Platform.OS === 'web' ? { dir } : {};
}
