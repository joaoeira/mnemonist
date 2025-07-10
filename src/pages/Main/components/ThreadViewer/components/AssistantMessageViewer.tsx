import type { Message } from "@/domain/message/schema";

export function AssistantMessageViewer({ message }: { message: Message }) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-lg px-3 py-2 text-sm bg-muted mt-3">
      {message.content.parts.map((part) => {
        if (part._tag === "TextPart") {
          return <div key={part.text}>{part.text}</div>;
        }
      })}
    </div>
  );
}
