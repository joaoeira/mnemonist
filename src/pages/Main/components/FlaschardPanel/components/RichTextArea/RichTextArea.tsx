import Mathematics from "@tiptap/extension-mathematics";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";
import "./RichTextArea.css";
import { cn } from "@/lib/utils";

type RichTextAreaProps = {
  placeholder?: string;
  value?: string;
  onChange?: (content: string) => void;
  onSubmit?: (content: string) => void;
  className?: string;
  disabled?: boolean;
};

const RichTextArea: React.FC<RichTextAreaProps> = ({
  placeholder = "Start typing...",
  value = "",
  onChange,
  onSubmit,
  className = "",
  disabled = false,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        dropcursor: false,
        gapcursor: false,
      }),
      Mathematics,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      if (onChange && !disabled) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: `rich-text-editor ${className}`,
      },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          if (onSubmit && editor) {
            onSubmit(editor.getText());
            editor.commands.setContent("");
          }
          return true;
        }
        return false;
      },
    },
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // Store current cursor position
      const { from, to } = editor.state.selection;

      // Update content
      editor.commands.setContent(value);

      // Restore cursor position if it's valid
      // We need to check if the position is still valid after content change
      const newDoc = editor.state.doc;
      const maxPos = newDoc.content.size;

      if (from <= maxPos && to <= maxPos) {
        // Position is still valid, restore it
        editor.commands.setTextSelection({ from, to });
      } else {
        // Position is invalid, place cursor at the end of the document
        editor.commands.setTextSelection(maxPos);
      }
    }
  }, [value, editor]);

  return (
    <div
      className={cn("rich-text-area", {
        "opacity-70": disabled,
      })}
    >
      <EditorContent
        editor={editor}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
};

export default RichTextArea;
