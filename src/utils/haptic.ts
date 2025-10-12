/**
 * Haptic feedback utilities for mobile interactions
 * Simulates native-like tactile feedback
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error'

/**
 * Trigger haptic feedback
 * Uses Vibration API on supported devices
 */
export const haptic = (style: HapticStyle = 'light') => {
  if (!('vibrate' in navigator)) return

  const patterns: Record<HapticStyle, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    selection: 5,
    success: [10, 50, 10],
    warning: [20, 100, 20],
    error: [30, 100, 30, 100, 30],
  }

  try {
    navigator.vibrate(patterns[style])
  } catch (error) {
    console.warn('Haptic feedback not supported', error)
  }
}

/**
 * Impact haptic for button presses
 */
export const hapticImpact = () => haptic('medium')

/**
 * Selection haptic for toggles/switches
 */
export const hapticSelection = () => haptic('selection')

/**
 * Success haptic for completions
 */
export const hapticSuccess = () => haptic('success')

/**
 * Error haptic for failures
 */
export const hapticError = () => haptic('error')
