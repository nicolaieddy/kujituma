import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useCheckInCustomQuestions } from '@/hooks/useCheckInCustomQuestions';

const PRESET_SUGGESTIONS = [
  "What's one thing I'm grateful for today?",
  "What's my biggest challenge right now?",
  "What would make today a success?",
  "What did I learn yesterday?",
  "How am I taking care of myself today?",
];

export const InlineCheckInSettings = () => {
  const { questions, isLoading, addQuestion, updateQuestion, deleteQuestion, isAdding } =
    useCheckInCustomQuestions();
  const [newPrompt, setNewPrompt] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleAdd = () => {
    const trimmed = newPrompt.trim();
    if (!trimmed) return;
    addQuestion(trimmed);
    setNewPrompt('');
  };

  const handleEditSave = (id: string) => {
    const trimmed = editingText.trim();
    if (trimmed) updateQuestion({ id, prompt: trimmed });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Built-in questions (read-only display) */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Built-in (always on)
        </p>
        {['How are you feeling today?', 'Energy level?', "What's your #1 focus today?", "What's on your mind? (journal)"].map(
          (q) => (
            <div
              key={q}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground"
            >
              <GripVertical className="h-4 w-4 opacity-30 flex-shrink-0" />
              <span>{q}</span>
            </div>
          )
        )}
      </div>

      {/* Custom questions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Your questions ({questions.length})
        </p>
        {isLoading ? (
          [...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
        ) : questions.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-2">
            No custom questions yet. Add one below!
          </p>
        ) : (
          questions.map((q) => (
            <div
              key={q.id}
              className="flex items-start gap-2 p-3 rounded-lg border border-border bg-background"
            >
              <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                {editingId === q.id ? (
                  <Input
                    value={editingText}
                    autoFocus
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={() => handleEditSave(q.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave(q.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="h-8 text-sm"
                  />
                ) : (
                  <p
                    className="text-sm cursor-pointer hover:text-primary transition-colors"
                    onClick={() => {
                      setEditingId(q.id);
                      setEditingText(q.prompt);
                    }}
                  >
                    {q.prompt}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Click to edit</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                  checked={q.is_enabled}
                  onCheckedChange={(checked) => updateQuestion({ id: q.id, is_enabled: checked })}
                  aria-label="Enable question"
                />
                <button
                  onClick={() => deleteQuestion(q.id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add new question */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Add a question
        </Label>
        <div className="flex gap-2">
          <Input
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="e.g. What am I grateful for?"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 text-sm"
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!newPrompt.trim() || isAdding}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Suggestions */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Suggestions:</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_SUGGESTIONS.filter(
              (s) => !questions.some((q) => q.prompt.toLowerCase() === s.toLowerCase())
            ).map((s) => (
              <button
                key={s}
                onClick={() => setNewPrompt(s)}
                className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-colors"
              >
                {s.length > 40 ? s.slice(0, 40) + '…' : s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
