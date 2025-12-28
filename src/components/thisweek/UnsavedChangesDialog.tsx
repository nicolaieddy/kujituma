import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export const UnsavedChangesDialog = ({
  isOpen,
  onClose,
  onDiscard,
  onSave,
  isSaving = false,
}: UnsavedChangesDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have an unsaved objective. Would you like to save it before leaving?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose} disabled={isSaving}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={isSaving}
          >
            Discard
          </Button>
          <AlertDialogAction onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save & Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
