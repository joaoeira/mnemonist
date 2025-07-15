import { Button, Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import {
  highlightPlugin,
  type RenderHighlightTargetProps,
} from "@react-pdf-viewer/highlight";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAtom } from "@xstate/store/react";
import { Effect } from "effect";
import { useState } from "react";
import browser from "webextension-polyfill";
import type { Document as DocumentType } from "@/domain/document/schema";
import { DocumentService } from "@/domain/document/service";
import { PDFService } from "@/services/PDFService";
import { fileAtom } from "../../atoms/fileAtom";
import { pageAtom } from "../../atoms/pageAtom";
import { FlashcardSuggestedFlashcardModal } from "./components/SuggestedFlashcardsModal/SuggestedFlashcardsModal";

const getDocumentEffect = () => {
  return Effect.gen(function* () {
    const pdfService = yield* PDFService;

    const fingerprint = yield* pdfService.fingerprint(
      yield* Effect.promise(async () => {
        const buffer = await fileAtom.get()?.file.arrayBuffer();
        if (!buffer) {
          throw new Error("No file selected");
        }
        const uint8Array = new Uint8Array(buffer);

        return uint8Array;
      })
    );

    const documentService = yield* DocumentService;
    const document = yield* documentService.findByFingerprint(fingerprint);
    return document;
  });
};

const updateDocumentLastViewedPageEffect = (
  documentId: DocumentType["id"],
  lastViewedPage: number
) => {
  return Effect.gen(function* () {
    const documentService = yield* DocumentService;
    yield* documentService.update(documentId, {
      lastViewedPage,
    });
  });
};

interface DocumentViewerWithModalProps {
  document: DocumentType;
  file: { url: string };
  onPageChange: (page: number) => void;
}

const DocumentViewerWithModal = ({
  document,
  file,
  onPageChange,
}: DocumentViewerWithModalProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  const renderHighlightTarget = (props: RenderHighlightTargetProps) => (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ccc",
        borderRadius: "4px",
        display: "flex",
        position: "absolute",
        left: `${props.selectionRegion.left}%`,
        top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
        transform: "translate(0, 8px)",
        zIndex: 1000,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <Button
        onClick={() => {
          setSelectedText(props.selectedText);
          setIsModalOpen(true);
          props.cancel();
        }}
      >
        💡 Suggest Flashcards
      </Button>
    </div>
  );

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget: renderHighlightTarget,
  });

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  return (
    <>
      <div style={{ height: "100vh", position: "relative" }}>
        <Worker
          workerUrl={browser.runtime.getURL(
            "node_modules/pdfjs-dist/build/pdf.worker.min.js"
          )}
        >
          <Viewer
            fileUrl={file.url}
            plugins={[highlightPluginInstance, defaultLayoutPluginInstance]}
            onPageChange={(event) => {
              pageAtom.set(event.currentPage);
              onPageChange(event.currentPage);
            }}
            initialPage={document?.lastViewedPage ?? 0}
          />
        </Worker>
      </div>
      <FlashcardSuggestedFlashcardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selection={selectedText}
      />
    </>
  );
};

const DocumentViewer = () => {
  const file = useAtom(fileAtom);

  const { data: document, isLoading } = useQuery({
    queryKey: ["document"],
    queryFn: () =>
      Effect.runPromise(
        getDocumentEffect().pipe(
          Effect.provide(DocumentService.Default),
          Effect.provide(PDFService.Default)
        )
      ),
  });

  const { mutate: updateDocumentLastViewedPage } = useMutation({
    mutationFn: (lastViewedPage: number) => {
      if (!document) {
        return Promise.reject(new Error("Document not found"));
      }

      return Effect.runPromise(
        updateDocumentLastViewedPageEffect(document.id, lastViewedPage).pipe(
          Effect.provide(DocumentService.Default)
        )
      );
    },
  });

  if (!file || isLoading || !document) return null;

  return (
    <DocumentViewerWithModal
      document={document}
      file={file}
      onPageChange={(page) => {
        if (document) {
          updateDocumentLastViewedPage(page);
        }
      }}
    />
  );
};

export default DocumentViewer;
