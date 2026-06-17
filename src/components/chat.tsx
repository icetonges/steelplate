"use client";

import { useChat } from "ai/react";
import { useState } from "react";
import { useChild } from "@/components/app-shell";
import { ModelSelect } from "@/components/model-select";

export function Chat() {
  const { child } = useChild();
  const [modelId, setModelId] = useState(""); // "" = Auto (chain + critic)
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: { childId: child.id },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSubmit(e, { body: { childId: child.id, modelId: modelId || undefined } });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-steel uppercase tracking-wide">Model</span>
        <ModelSelect value={modelId} onChange={setModelId} includeAuto />
      </div>

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

      <form onSubmit={onSubmit} className="sticky bottom-4 flex gap-2">
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
