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

interface ShareConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSharing: boolean;
}

export const ShareConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  isSharing
}: ShareConfirmationDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Share Week with Community?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>Warning:</strong> Once you share your weekly progress, it becomes{" "}
            <span className="text-destructive font-semibold">permanent and uneditable</span>.
            <br />
            <br />
            You will not be able to:
            <ul className="list-disc ml-4 mt-2 space-y-1">
              <li>Edit your weekly objectives</li>
              <li>Modify your reflection text</li>
              <li>Change completion status</li>
            </ul>
            <br />
            Are you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={isSharing}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isSharing}
          >
            {isSharing ? "Sharing..." : "Share & Lock Week"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};