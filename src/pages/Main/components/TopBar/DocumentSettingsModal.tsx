import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "@xstate/store/react";
import { Effect } from "effect";
import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import type { Document as DocumentType } from "../../../../domain/document/schema";
import { DocumentService } from "../../../../domain/document/service";
import { documentIdAtom } from "../../atoms/documentIdAtom";

interface DocumentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getDocumentEffect(documentId: DocumentType["id"]) {
  const program = Effect.gen(function* () {
    const documentService = yield* DocumentService;
    const document = yield* documentService.findById(documentId);
    return document;
  });

  return program;
}

function updateDocumentEffect(
  id: DocumentType["id"],
  document: Partial<DocumentType>
) {
  const program = Effect.gen(function* () {
    const documentService = yield* DocumentService;
    const result = yield* documentService.update(id, document);
    return result;
  });

  return program;
}

export function DocumentSettingsModal({
  isOpen,
  onClose,
}: DocumentSettingsModalProps) {
  const documentId = useAtom(documentIdAtom);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");

  const { data: document, isLoading } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => {
      if (!documentId)
        return Promise.reject(new Error("Document ID not found"));
      return Effect.runPromise(
        getDocumentEffect(documentId).pipe(
          Effect.provide(DocumentService.Default)
        )
      );
    },
  });

  const { mutate: updateDocument, isPending } = useMutation({
    mutationFn: (updates: Partial<DocumentType>) => {
      if (!documentId)
        return Promise.reject(new Error("Document ID not found"));
      return Effect.runPromise(
        updateDocumentEffect(documentId, updates).pipe(
          Effect.provide(DocumentService.Default)
        )
      );
    },
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof updateDocumentEffect>>
    ) => {
      console.error("Failed to update document:", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document"] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      onClose();
    },
  });

  useEffect(() => {
    if (document) {
      setTitle(document.title || "");
      setAuthor(document.author || "");
      setYear(document.year?.toString() || "");
    }
  }, [document]);

  const documentHasNoFields =
    !document?.title && !document?.author && !document?.year;

  const currentValuesEmpty = !title.trim() && !author.trim() && !year.trim();

  const handleSave = () => {
    const updates: Partial<DocumentType> = {
      title: title.trim() || undefined,
      author: author.trim() || undefined,
      year: year.trim() ? parseInt(year, 10) : undefined,
    };

    updateDocument(updates);
  };

  const handleCancel = () => {
    // Reset form to original values
    setTitle(document?.title || "");
    setAuthor(document?.author || "");
    setYear(document?.year?.toString() || "");
    onClose();
  };

  if (isLoading) return null;

  // show the modal always if the document has no fields so the user is forced to fill in the fields
  // (otherwise will just forget and the cards wont have that context)
  return (
    <Dialog open={isOpen || documentHasNoFields} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder="Enter document title"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="author" className="text-right">
              Author
            </Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="col-span-3"
              placeholder="Enter author name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="year" className="text-right">
              Year
            </Label>
            <Input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="col-span-3"
              placeholder="Enter publication year"
            />
          </div>
        </div>
        <DialogFooter>
          {!documentHasNoFields && (
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isPending || (documentHasNoFields && currentValuesEmpty)}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
