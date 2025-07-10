import type { Message } from "@/domain/message/schema";

export function UserMessageViewer({ message }: { message: Message }) {
  return (
    <div className="flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground mt-3 mr-auto">
      {message.content.parts.map((part) => {
        if (part._tag === "TextPart") {
          return <div key={part.text}>{part.text}</div>;
        }
      })}
    </div>
  );
}
