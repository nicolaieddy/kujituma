import { useState, useEffect, useCallback } from 'react';

interface UseObjectiveSaveProps {
  onSave: (text: string) => Promise<void>;
}

export const useObjectiveAutoSave = ({ onSave }: UseObjectiveSaveProps) => {
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Warn user about unsaved changes when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && value.trim()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, value]);

  const handleValueChange = useCallback((newValue: string) => {
    setValue(newValue);
    if (newValue.trim()) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, []);

  const saveObjective = useCallback(async (): Promise<boolean> => {
    if (!value.trim() || isSaving) return false;
    
    setIsSaving(true);
    try {
      await onSave(value.trim());
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setValue('');
      return true;
    } catch (error) {
      console.error('Error saving objective:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [value, isSaving, onSave]);

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
    saveObjective,
  };
};
