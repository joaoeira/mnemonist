import { useMutation } from "@tanstack/react-query";
import { Effect } from "effect";
import type { documentId } from "../../../domain/document/schema";
import { DocumentService } from "../../../domain/document/service";
import { PDFService } from "../../../services/PDFService";
import { fileAtom } from "../atoms/fileAtom";

const createDocumentEffect = (file: File) =>
  Effect.gen(function* () {
    const documentService = yield* DocumentService;

    const document = yield* documentService.create(file, {
      title: "",
      author: "",
      year: undefined,
      sessions: [],
    });

    return document;
  });

export default function SelectFile({
  onFileSelected,
}: {
  onFileSelected: (id: typeof documentId.Type) => void;
}) {
  const { mutate: createDocument } = useMutation({
    mutationFn: (file: File) => {
      return Effect.runPromise(
        createDocumentEffect(file).pipe(
          Effect.provide(DocumentService.Default),
          Effect.provide(PDFService.Default)
        )
      );
    },
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof createDocumentEffect>>
    ) => {
      console.error(error);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      createDocument(file, {
        onSuccess: (document) => {
          onFileSelected(document.id);
          fileAtom.set({
            file,
            url: URL.createObjectURL(file),
          });
        },
      });
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "400px",
          padding: "40px",
          border: "2px dashed #ccc",
          borderRadius: "8px",
          background: "#fafafa",
        }}
      >
        <h2 style={{ marginBottom: "20px", color: "#333" }}>
          Select a PDF Document
        </h2>
        <p style={{ marginBottom: "30px", color: "#666" }}>
          Choose a PDF file to view and annotate
        </p>
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          style={{
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            background: "white",
            cursor: "pointer",
            width: "100%",
          }}
        />
      </div>
    </div>
  );
}
