import { useAtom } from "@xstate/store/react";
import { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../components/ui/resizable";
import type { Document as DocumentType } from "../../domain/document/schema";
import { fileAtom } from "./atoms/fileAtom";
import { AnkiNoticeModal } from "./components/AnkiNoticeModal/AnkiNoticeModal";
import DocumentViewer from "./components/DocumentViewer/DocumentViewer";
import SelectFile from "./components/SelectFile";
import SessionManager from "./components/SessionManager/SessionManager";
import { TopBar } from "./components/TopBar/TopBar";

const Main = () => {
  const [documentId, setDocumentId] = useState<DocumentType["id"] | null>(null);
  const file = useAtom(fileAtom);

  if (!file) {
    return (
      <>
        <SelectFile onFileSelected={setDocumentId} />
        <AnkiNoticeModal />
      </>
    );
  }

  if (!documentId) return null;

  return (
    <div className="h-screen flex flex-col">
      <TopBar documentId={documentId} />
      <ResizablePanelGroup direction="horizontal" className="flex-1">
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
      <AnkiNoticeModal />
    </div>
  );
};

export default Main;
