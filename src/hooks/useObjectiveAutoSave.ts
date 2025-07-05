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

  const save = useCallback(async (textToSave: string, goalToSave: string) => {
    if (!textToSave.trim()) return;
    
    setIsSaving(true);
    try {
      const goalIdToSave = goalToSave === 'none' ? undefined : goalToSave;
      await onSave(textToSave.trim(), goalIdToSave);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      // Clear the form after successful save
      setValue('');
      setGoalId('none');
    } catch (error) {
      console.error('Error saving objective:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  useEffect(() => {
    if (debouncedValue.trim() && hasUnsavedChanges) {
      save(debouncedValue, debouncedGoalId);
    }
  }, [debouncedValue, debouncedGoalId, hasUnsavedChanges, save]);

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

  return {
    value,
    goalId,
    setValue: handleValueChange,
    setGoalId: handleGoalChange,
    isSaving,
    hasUnsavedChanges,
    lastSaved,
  };
};