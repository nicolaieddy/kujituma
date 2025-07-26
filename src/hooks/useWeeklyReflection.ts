import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

interface UseWeeklyReflectionOptions {
  weekStart: string;
  initialNotes: string;
  onSave: (notes: string) => Promise<void> | void;
  delay?: number;
  isReadOnly?: boolean;
}

export const useWeeklyReflection = ({
  weekStart,
  initialNotes,
  onSave,
  delay = 2000,
  isReadOnly = false
}: UseWeeklyReflectionOptions) => {
  // Use weekStart as part of the state key to ensure complete isolation
  const [reflectionState, setReflectionState] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const currentWeekRef = useRef(weekStart);
  const saveInProgress = useRef(false);
  
  // Get current value for this specific week
  const currentValue = reflectionState[weekStart] ?? initialNotes;
  
  // Debounce the current week's value
  const debouncedValue = useDebounce(currentValue, delay);
  
  // Update state when week changes or initial notes change
  useEffect(() => {
    console.log('useWeeklyReflection: Week or initial notes changed', { 
      weekStart, 
      initialNotes, 
      currentValue: reflectionState[weekStart] 
    });
    
    // If we don't have data for this week yet, initialize it
    if (!(weekStart in reflectionState)) {
      setReflectionState(prev => ({
        ...prev,
        [weekStart]: initialNotes || ''
      }));
    }
    
    // Update current week reference
    currentWeekRef.current = weekStart;
    
    // Reset saving state when week changes
    if (weekStart !== currentWeekRef.current) {
      setIsSaving(false);
      setLastSaved(null);
    }
  }, [weekStart, initialNotes, reflectionState]);
  
  // Auto-save when debounced value changes
  useEffect(() => {
    if (isReadOnly || saveInProgress.current) {
      return;
    }
    
    const weekValue = reflectionState[weekStart];
    
    // Only save if:
    // 1. We have a value for this week
    // 2. The debounced value matches current week's value (user is actively editing this week)
    // 3. The value is different from initial notes
    // 4. The value is not empty
    if (
      weekValue !== undefined && 
      debouncedValue === weekValue && 
      debouncedValue !== initialNotes && 
      debouncedValue.trim() !== ''
    ) {
      console.log('useWeeklyReflection: Auto-saving for week', weekStart, debouncedValue);
      
      const saveAsync = async () => {
        if (saveInProgress.current || currentWeekRef.current !== weekStart) {
          return;
        }
        
        saveInProgress.current = true;
        setIsSaving(true);
        
        try {
          await Promise.resolve(onSave(debouncedValue));
          setLastSaved(new Date());
          console.log('useWeeklyReflection: Save successful for week', weekStart);
        } catch (error) {
          console.error('useWeeklyReflection: Save failed for week', weekStart, error);
        } finally {
          saveInProgress.current = false;
          setIsSaving(false);
        }
      };
      
      const timeoutId = setTimeout(saveAsync, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [debouncedValue, weekStart, initialNotes, onSave, isReadOnly, reflectionState]);
  
  // Update value for the current week
  const setValue = useCallback((newValue: string) => {
    if (isReadOnly) return;
    
    console.log('useWeeklyReflection: Setting value for week', weekStart, newValue);
    setReflectionState(prev => ({
      ...prev,
      [weekStart]: newValue
    }));
  }, [weekStart, isReadOnly]);
  
  // Manual save function
  const manualSave = useCallback(async () => {
    if (isReadOnly || saveInProgress.current) {
      return;
    }
    
    const valueToSave = reflectionState[weekStart] || '';
    if (!valueToSave.trim()) {
      return;
    }
    
    saveInProgress.current = true;
    setIsSaving(true);
    
    try {
      await Promise.resolve(onSave(valueToSave));
      setLastSaved(new Date());
      console.log('useWeeklyReflection: Manual save successful for week', weekStart);
    } catch (error) {
      console.error('useWeeklyReflection: Manual save failed for week', weekStart, error);
    } finally {
      saveInProgress.current = false;
      setIsSaving(false);
    }
  }, [weekStart, reflectionState, onSave, isReadOnly]);
  
  return {
    value: currentValue,
    setValue,
    isSaving,
    lastSaved,
    manualSave,
    hasUnsavedChanges: currentValue !== initialNotes
  };
};