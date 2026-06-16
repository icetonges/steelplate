"use client";

import { useChat } from "ai/react";

// Single-tenant scaffold: replace with the real child id after seeding.
const CHILD_ID = process.env.NEXT_PUBLIC_CHILD_ID ?? "";

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: { childId: CHILD_ID },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 min-h-[40vh]">
        {messages.length === 0 && (
          <p className="text-steel italic">
            Tell me about today. A conflict, a proud moment, a worry — a sentence or two is enough.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "self-end bg-slate rounded-2xl rounded-br-sm px-4 py-3 max-w-[85%]"
                : "self-start border-l-2 border-temper pl-4 max-w-[90%]"
            }
          >
            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="sticky bottom-4 flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Today with my child…"
          className="flex-1 bg-slate border border-steel/40 rounded-xl px-4 py-3 outline-none focus:border-temper"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-temper text-gunmetal font-medium rounded-xl px-5 py-3 disabled:opacity-50"
        >
          {isLoading ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
