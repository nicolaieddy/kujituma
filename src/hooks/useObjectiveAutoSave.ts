import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';

interface UseObjectiveAutoSaveProps {
  onSave: (text: string, goalId?: string) => Promise<void>;
  delay?: number;
}

export const useObjectiveAutoSave = ({ onSave, delay = 2000 }: UseObjectiveAutoSaveProps) => {
  const [value, setValue] = useState('');
  const [goalId, setGoalId] = useState<string>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const debouncedValue = useDebounce(value, delay);
  const debouncedGoalId = useDebounce(goalId, delay);


  useEffect(() => {
    console.log('Auto-save: useEffect triggered', { 
      debouncedValue: debouncedValue.slice(0, 20), 
      hasUnsavedChanges,
      shouldSave: debouncedValue.trim() && hasUnsavedChanges 
    });
    
    if (debouncedValue.trim() && hasUnsavedChanges) {
      const saveObjective = async () => {
        if (!debouncedValue.trim()) return;
        
        console.log('Auto-save: Saving objective:', debouncedValue, 'with goal:', debouncedGoalId);
        setIsSaving(true);
        try {
          const goalIdToSave = debouncedGoalId === 'none' ? undefined : debouncedGoalId;
          await onSave(debouncedValue.trim(), goalIdToSave);
          console.log('Auto-save: Successfully saved objective');
          setLastSaved(new Date());
          setHasUnsavedChanges(false);
          // Clear the form after successful save
          setValue('');
          setGoalId('none');
        } catch (error) {
          console.error('Auto-save: Error saving objective:', error);
        } finally {
          setIsSaving(false);
        }
      };
      
      saveObjective();
    }
  }, [debouncedValue, debouncedGoalId, hasUnsavedChanges, onSave]);

  const handleValueChange = useCallback((newValue: string) => {
    setValue(newValue);
    setHasUnsavedChanges(true);
  }, []);

  const handleGoalChange = useCallback((newGoalId: string) => {
    setGoalId(newGoalId);
    if (value.trim()) {
      setHasUnsavedChanges(true);
    }
  }, [value]);

  const clearForm = useCallback(() => {
    setValue('');
    setGoalId('none');
    setHasUnsavedChanges(false);
    setLastSaved(null);
  }, []);

  return {
    value,
    goalId,
    setValue: handleValueChange,
    setGoalId: handleGoalChange,
    clearForm,
    isSaving,
    hasUnsavedChanges,
    lastSaved,
  };
};