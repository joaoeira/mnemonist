import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsAnkiAvailable } from "@/hooks/use-is-anki-available";

export const AnkiNoticeModal = () => {
  const { isConnected } = useIsAnkiAvailable();

  if (isConnected === null) return null;

  return (
    <Dialog open={!isConnected}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Anki Not Available
          </DialogTitle>
          <DialogDescription>
            Anki is not currently running or available. Please ensure Anki is
            open and the AnkiConnect add-on is installed and enabled to use this
            application.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
