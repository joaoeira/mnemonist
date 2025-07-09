import { useAtom } from "@xstate/store/react";
import { useState } from "react";
import type { Document as DocumentType } from "../../domain/document/schema";
import { fileAtom } from "./atoms/fileAtom";
import DocumentViewer from "./components/DocumentViewer/DocumentViewer";
// import FlashcardPanel from "./components/FlaschardPanel/components/RichTextArea/FlashcardPanel";
import SelectFile from "./components/SelectFile";
import SessionManager from "./components/SessionManager/SessionManager";

const Main = () => {
  const [documentId, setDocumentId] = useState<DocumentType["id"] | null>(null);
  const file = useAtom(fileAtom);

  if (!file) {
    return <SelectFile onFileSelected={setDocumentId} />;
  }

  if (!documentId) {
    console.error("No document id");
    return null;
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/2">
        <DocumentViewer />
      </div>
      <div className="w-1/2 h-full overflow-y-auto">
        {/* <FlashcardPanel /> */}
        <SessionManager documentId={documentId} />
      </div>
    </div>
  );
};

export default Main;
