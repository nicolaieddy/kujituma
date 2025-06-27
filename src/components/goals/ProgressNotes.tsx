
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface ProgressNotesProps {
  initialNotes: string;
  onSaveNotes: (notes: string) => void;
  isSaving: boolean;
}

export const ProgressNotes = ({ 
  initialNotes, 
  onSaveNotes, 
  isSaving 
}: ProgressNotesProps) => {
  const [progressNotes, setProgressNotes] = useState(initialNotes);

  useEffect(() => {
    setProgressNotes(initialNotes);
  }, [initialNotes]);

  const handleSaveNotes = () => {
    onSaveNotes(progressNotes);
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-white text-lg">Progress Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={progressNotes}
          onChange={(e) => setProgressNotes(e.target.value)}
          placeholder="Reflect on your week... What went well? What challenges did you face? What did you learn?"
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[120px]"
        />
        <Button
          onClick={handleSaveNotes}
          disabled={isSaving}
          className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
        >
          {isSaving ? "Saving..." : "Save Notes"}
        </Button>
      </CardContent>
    </Card>
  );
};
