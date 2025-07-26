import { useEffect, useState, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

interface UseAutoSaveOptions {
  onSave: (value: string) => Promise<void> | void;
  delay?: number;
  initialValue?: string;
}

export const useAutoSave = ({ onSave, delay = 1000, initialValue = '' }: UseAutoSaveOptions) => {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveInProgress = useRef(false);
  const mounted = useRef(true);
  
  const debouncedValue = useDebounce(value, delay);
  const initialValueRef = useRef(initialValue);

  // Update value when initialValue changes (e.g., when data loads or week changes)
  useEffect(() => {
    if (mounted.current && initialValue !== initialValueRef.current) {
      setValue(initialValue);
      initialValueRef.current = initialValue;
    }
  }, [initialValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  // Auto-save when debounced value changes
  useEffect(() => {
    if (!mounted.current || saveInProgress.current) {
      return;
    }

    // Only save if the value is different from the current initial value and not empty
    // This prevents saving old values when the initial value changes (e.g., week change)
    if (debouncedValue !== initialValueRef.current && debouncedValue.trim() !== '') {
      const saveAsync = async () => {
        if (!mounted.current || saveInProgress.current) {
          return;
        }
        
        // Double-check that we're still in the same context (initial value hasn't changed)
        if (initialValueRef.current !== initialValue) {
          console.log('Auto-save cancelled: context changed during debounce');
          return;
        }
        
        saveInProgress.current = true;
        
        try {
          if (mounted.current) {
            setIsSaving(true);
          }
          
          await Promise.resolve(onSave(debouncedValue));
          
          if (mounted.current) {
            setLastSaved(new Date());
          }
        } catch (error) {
          console.error('Auto-save failed:', error);
          // Don't throw - just log and continue
        } finally {
          saveInProgress.current = false;
          if (mounted.current) {
            setIsSaving(false);
          }
        }
      };
      
      // Use setTimeout to defer execution and prevent blocking
      const timeoutId = setTimeout(saveAsync, 0);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [debouncedValue, onSave, initialValue]);

  const handleChange = useCallback((newValue: string) => {
    if (mounted.current) {
      setValue(newValue);
    }
  }, []);

  const manualSave = useCallback(async () => {
    if (!mounted.current || saveInProgress.current || value.trim() === '') {
      return;
    }
    
    saveInProgress.current = true;
    
    try {
      setIsSaving(true);
      await Promise.resolve(onSave(value));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Manual save failed:', error);
    } finally {
      saveInProgress.current = false;
      if (mounted.current) {
        setIsSaving(false);
      }
    }
  }, [value, onSave]);

  return {
    value,
    setValue: handleChange,
    isSaving,
    lastSaved,
    manualSave,
    hasUnsavedChanges: value !== initialValueRef.current
  };
};