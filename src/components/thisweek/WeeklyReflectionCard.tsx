import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutoSave } from "@/hooks/useAutoSave";
import { AutoSaveIndicator } from "./AutoSaveIndicator";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';

interface WeeklyReflectionCardProps {
  initialNotes: string;
  onUpdateNotes: (notes: string) => void;
  isReadOnly: boolean;
}

export const WeeklyReflectionCard = ({
  initialNotes,
  onUpdateNotes,
  isReadOnly
}: WeeklyReflectionCardProps) => {
  const autoSave = useAutoSave({
    onSave: onUpdateNotes,
    delay: 2000,
    initialValue: initialNotes
  });

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Weekly Reflection</CardTitle>
          <AutoSaveIndicator
            isSaving={autoSave.isSaving}
            lastSaved={autoSave.lastSaved}
            hasUnsavedChanges={autoSave.hasUnsavedChanges}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="markdown-editor-container" data-color-mode="dark">
          <MDEditor
            value={autoSave.value || ''}
            onChange={(val) => autoSave.setValue(val || '')}
            preview="edit"
            hideToolbar={isReadOnly}
            height={200}
            data-color-mode="dark"
            textareaProps={{
              placeholder: "How did this week go? What did you learn? Any insights or challenges?",
              disabled: isReadOnly,
              style: {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};