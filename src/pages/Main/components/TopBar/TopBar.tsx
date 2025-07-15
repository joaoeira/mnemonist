import { useAtom } from "@xstate/store/react";
import { Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { documentIdAtom } from "../../atoms/documentIdAtom";
import { DocumentSettingsModal } from "./DocumentSettingsModal";

export function TopBar() {
  const documentId = useAtom(documentIdAtom);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  if (!documentId) return null;

  return (
    <>
      <div className="flex items-center justify-between px-4 py-0.5 bg-background/70 border-b border-border">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold text-foreground">Mnemonist</h1>
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsModalOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DocumentSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
}
