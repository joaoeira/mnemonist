import Mathematics from "@tiptap/extension-mathematics";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";
import "./RichTextArea.css";

interface RichTextAreaProps {
  placeholder?: string;
  value?: string;
  onChange?: (content: string) => void;
  className?: string;
}

const RichTextArea: React.FC<RichTextAreaProps> = ({
  placeholder = "Start typing...",
  value = "",
  onChange,
  className = "",
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
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: `rich-text-editor ${className}`,
      },
    },
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="rich-text-area">
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
};

export default RichTextArea;
