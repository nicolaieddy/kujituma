import { useEffect, useState, useCallback } from 'react';
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
  
  const debouncedValue = useDebounce(value, delay);

  // Update value when initialValue changes (e.g., when data loads)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Auto-save when debounced value changes
  useEffect(() => {
    // Only save if the value is different from initial and not empty
    if (debouncedValue !== initialValue && debouncedValue.trim() !== '') {
      const saveAsync = async () => {
        setIsSaving(true);
        try {
          await onSave(debouncedValue);
          setLastSaved(new Date());
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setIsSaving(false);
        }
      };
      saveAsync();
    }
  }, [debouncedValue, onSave, initialValue]);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  const manualSave = useCallback(async () => {
    if (value.trim() !== '') {
      setIsSaving(true);
      try {
        await onSave(value);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Manual save failed:', error);
      } finally {
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
    hasUnsavedChanges: value !== initialValue
  };
};