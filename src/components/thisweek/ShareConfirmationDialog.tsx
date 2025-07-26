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
      <AlertDialogContent className="bg-gray-800 border-gray-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Share Week with Community?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300">
            <strong>Warning:</strong> Once you share your weekly progress, it becomes{" "}
            <span className="text-yellow-400 font-semibold">permanent and uneditable</span>.
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
            className="bg-gray-700 text-white hover:bg-gray-600"
            disabled={isSharing}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isSharing}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
          >
            {isSharing ? "Sharing..." : "Share & Lock Week"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};