import { forwardRef } from "react";
import type { Message } from "@/domain/message/schema";

export const AssistantMessageViewer = forwardRef<
  HTMLDivElement,
  { message: Message } & React.HTMLAttributes<HTMLDivElement>
>(({ message, ...props }, ref) => {
  return (
    <div
      ref={ref}
      {...props}
      className="flex w-full flex-col gap-2 rounded-lg px-3 py-2 text-sm bg-muted mt-3"
    >
      {message.content.parts.map((part) => {
        if (part._tag === "TextPart") {
          return <div key={part.text}>{part.text}</div>;
        }
      })}
    </div>
  );
});

AssistantMessageViewer.displayName = "AssistantMessageViewer";
