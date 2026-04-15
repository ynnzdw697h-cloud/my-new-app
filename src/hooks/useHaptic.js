/**
 * useHaptic — lightweight vibration feedback for kitchen touch screens.
 * Usage: const haptic = useHaptic(); haptic();
 * Customize duration: haptic(30) for a longer pulse.
 */
export function useHaptic() {
  return (ms = 15) => {
    window.navigator?.vibrate?.(ms);
  };
}
