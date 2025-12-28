import { useState, useEffect, useCallback, useRef } from 'react';

interface UseObjectiveSaveProps {
  onSave: (text: string) => Promise<void>;
}

export const useObjectiveAutoSave = ({ onSave }: UseObjectiveSaveProps) => {
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true);

  // Reset mounted ref on mount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
    if (!mountedRef.current) return;
    setValue(newValue);
    if (newValue.trim()) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, []);

  const saveObjective = useCallback(async (): Promise<boolean> => {
    if (!value.trim() || isSaving) return false;
    
    if (mountedRef.current) {
      setIsSaving(true);
    }
    
    try {
      await onSave(value.trim());
      if (mountedRef.current) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        setValue('');
      }
      return true;
    } catch (error) {
      console.error('Error saving objective:', error);
      return false;
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [value, isSaving, onSave]);

  const clearForm = useCallback(() => {
    if (!mountedRef.current) return;
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
