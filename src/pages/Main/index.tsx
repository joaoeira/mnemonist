import { useAtom } from "@xstate/store/react";
import { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../components/ui/resizable";
import type { Document as DocumentType } from "../../domain/document/schema";
import { fileAtom } from "./atoms/fileAtom";
import DocumentViewer from "./components/DocumentViewer/DocumentViewer";
import SelectFile from "./components/SelectFile";
import SessionManager from "./components/SessionManager/SessionManager";

const Main = () => {
  const [documentId, setDocumentId] = useState<DocumentType["id"] | null>(null);
  const file = useAtom(fileAtom);

  if (!file) {
    return <SelectFile onFileSelected={setDocumentId} />;
  }

  if (!documentId) return null;

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      <ResizablePanel defaultSize={50} minSize={20}>
        <DocumentViewer />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        defaultSize={50}
        minSize={20}
        className="h-full overflow-y-auto"
      >
        <SessionManager documentId={documentId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default Main;
