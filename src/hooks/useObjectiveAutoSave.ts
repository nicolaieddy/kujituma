import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';

interface UseObjectiveAutoSaveProps {
  onSave: (text: string) => Promise<void>;
  delay?: number;
}

export const useObjectiveAutoSave = ({ onSave, delay = 2000 }: UseObjectiveAutoSaveProps) => {
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const debouncedValue = useDebounce(value, delay);


  useEffect(() => {
    console.log('Auto-save: useEffect triggered', { 
      debouncedValue: debouncedValue.slice(0, 20), 
      hasUnsavedChanges,
      shouldSave: debouncedValue.trim() && hasUnsavedChanges 
    });
    
    if (debouncedValue.trim() && hasUnsavedChanges) {
      const saveObjective = async () => {
        if (!debouncedValue.trim()) return;
        
        console.log('Auto-save: Saving objective:', debouncedValue);
        setIsSaving(true);
        try {
          await onSave(debouncedValue.trim());
          console.log('Auto-save: Successfully saved objective');
          setLastSaved(new Date());
          setHasUnsavedChanges(false);
          // Clear the form after successful save
          setValue('');
        } catch (error) {
          console.error('Auto-save: Error saving objective:', error);
        } finally {
          setIsSaving(false);
        }
      };
      
      saveObjective();
    }
  }, [debouncedValue, hasUnsavedChanges]);

  const handleValueChange = useCallback((newValue: string) => {
    setValue(newValue);
    setHasUnsavedChanges(true);
  }, []);

  const clearForm = useCallback(() => {
    setValue('');
    setHasUnsavedChanges(false);
    setLastSaved(null);
  }, []);

  return {
    value,
    setValue: handleValueChange,
    clearForm,
    isSaving,
    hasUnsavedChanges,
    lastSaved,
  };
};