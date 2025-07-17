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
    // Only update if editor exists and is not currently being typed in
    if (editor && !editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value);
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
