import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "@xstate/store/react";
import { Effect } from "effect";
import { useEffect, useReducer } from "react";
import { cn } from "@/lib/utils";
import { OPENAI_API_LOCALSTORAGE_KEY } from "@/services/AIService/AIService";
import { Button } from "../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Separator } from "../../../../components/ui/separator";
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

function saveApiKeyEffect(apiKey: string) {
  const program = Effect.gen(function* () {
    if (apiKey.trim())
      yield* Effect.sync(() =>
        localStorage.setItem(OPENAI_API_LOCALSTORAGE_KEY, apiKey.trim())
      );
    else
      yield* Effect.sync(() =>
        localStorage.removeItem(OPENAI_API_LOCALSTORAGE_KEY)
      );

    return apiKey;
  });

  return program;
}

interface FormState {
  title: string;
  author: string;
  year: string;
  apiKey: string;
}

type FormAction =
  | { type: "SET_TITLE"; payload: string }
  | { type: "SET_AUTHOR"; payload: string }
  | { type: "SET_YEAR"; payload: string }
  | { type: "SET_API_KEY"; payload: string }
  | {
      type: "RESET_DOCUMENT_FIELDS";
      payload: { title?: string; author?: string; year?: string };
    }
  | { type: "RESET_API_KEY"; payload: string }
  | {
      type: "RESET_ALL";
      payload: {
        title?: string;
        author?: string;
        year?: string;
        apiKey: string;
      };
    };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_TITLE":
      return { ...state, title: action.payload };
    case "SET_AUTHOR":
      return { ...state, author: action.payload };
    case "SET_YEAR":
      return { ...state, year: action.payload };
    case "SET_API_KEY":
      return { ...state, apiKey: action.payload };
    case "RESET_DOCUMENT_FIELDS":
      return {
        ...state,
        title: action.payload.title || "",
        author: action.payload.author || "",
        year: action.payload.year || "",
      };
    case "RESET_API_KEY":
      return { ...state, apiKey: action.payload };
    case "RESET_ALL":
      return {
        title: action.payload.title || "",
        author: action.payload.author || "",
        year: action.payload.year || "",
        apiKey: action.payload.apiKey,
      };
    default:
      return state;
  }
}

export function DocumentSettingsModal({
  isOpen,
  onClose,
}: DocumentSettingsModalProps) {
  const documentId = useAtom(documentIdAtom);
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(formReducer, {
    title: "",
    author: "",
    year: "",
    apiKey: "",
  });

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

  const { data: storedApiKey } = useQuery({
    queryKey: ["apiKey"],
    queryFn: () =>
      Promise.resolve(localStorage.getItem(OPENAI_API_LOCALSTORAGE_KEY)),
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

  const { mutate: saveApiKey, isPending: isApiKeySaving } = useMutation({
    mutationFn: (key: string) => Effect.runPromise(saveApiKeyEffect(key)),
    onError: (error) => {
      console.error("Failed to save API key:", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKey"] });
    },
  });

  useEffect(() => {
    if (document) {
      dispatch({
        type: "RESET_DOCUMENT_FIELDS",
        payload: {
          title: document.title,
          author: document.author,
          year: document.year?.toString(),
        },
      });
    }
  }, [document]);

  useEffect(() => {
    if (storedApiKey) {
      dispatch({ type: "RESET_API_KEY", payload: storedApiKey });
    }
  }, [storedApiKey]);

  const documentHasNoFields =
    !document?.title && !document?.author && !document?.year;

  const currentValuesEmpty =
    !state.title.trim() && !state.author.trim() && !state.year.trim();

  const apiKeyMissing = !storedApiKey;

  const handleSave = () => {
    saveApiKey(state.apiKey);

    const updates: Partial<DocumentType> = {
      title: state.title.trim() || undefined,
      author: state.author.trim() || undefined,
      year: state.year.trim() ? parseInt(state.year, 10) : undefined,
    };

    updateDocument(updates);
  };

  const handleCancel = () => {
    // Reset form to original values
    dispatch({
      type: "RESET_ALL",
      payload: {
        title: document?.title,
        author: document?.author,
        year: document?.year?.toString(),
        apiKey: storedApiKey || "",
      },
    });
    onClose();
  };

  if (isLoading) return null;

  // show the modal always if the document has no fields so the user is forced to fill in the fields
  // (otherwise will just forget and the cards wont have that context)
  return (
    <Dialog
      open={isOpen || documentHasNoFields || apiKeyMissing}
      onOpenChange={onClose}
    >
      <DialogContent className="sm:max-w-[525px]">
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="apiKey" className="text-right">
              OpenAI API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={state.apiKey}
              onChange={(e) =>
                dispatch({ type: "SET_API_KEY", payload: e.target.value })
              }
              className={cn(
                "col-span-3",
                state.apiKey.length === 0 && "ring-1 ring-destructive"
              )}
              placeholder="Enter your OpenAI API key"
            />
            {state.apiKey.length === 0 && (
              <p className="text-destructive text-sm col-span-3">
                An OpenAI API key is required to continue.
              </p>
            )}
          </div>

          <Separator className="my-2" />

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={state.title}
              onChange={(e) =>
                dispatch({ type: "SET_TITLE", payload: e.target.value })
              }
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
              value={state.author}
              onChange={(e) =>
                dispatch({ type: "SET_AUTHOR", payload: e.target.value })
              }
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
              value={state.year}
              onChange={(e) =>
                dispatch({ type: "SET_YEAR", payload: e.target.value })
              }
              className="col-span-3"
              placeholder="Enter publication year"
            />
          </div>
          {currentValuesEmpty && (
            <p className="text-destructive text-sm">
              At least one field is required to continue. This will be added to
              the front of flashcards to provide context about the source.
            </p>
          )}
        </div>
        <DialogFooter>
          {!documentHasNoFields && !apiKeyMissing && (
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={
              isPending ||
              isApiKeySaving ||
              (documentHasNoFields && currentValuesEmpty) ||
              (apiKeyMissing && !state.apiKey.trim())
            }
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
