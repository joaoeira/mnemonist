import type { Message } from "@/domain/message/schema";
import { MessageContextMenu } from "./MessageContextMenu";

export function AssistantMessageViewer({
  message,
  onDelete,
}: {
  message: Message;
  onDelete: () => void;
}) {
  return (
    <MessageContextMenu message={message} onDelete={onDelete}>
      <div className="flex w-full flex-col gap-2 rounded-lg px-3 py-2 text-sm bg-muted mt-3">
        {message.content.parts.map((part) => {
          if (part._tag === "TextPart") {
            return <div key={part.text}>{part.text}</div>;
          }
        })}
      </div>
    </MessageContextMenu>
  );
}
