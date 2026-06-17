"use client";

import { useState } from "react";
import { Chat } from "@/components/chat";
import { ComparePanel } from "@/components/compare-panel";

/** Mentor screen: single-model (or Auto) chat, or a two-model comparison. */
export function Mentor() {
  const [mode, setMode] = useState<"chat" | "compare">("chat");

  return (
    <div>
      <div className="flex gap-1 mb-5">
        <Tab active={mode === "chat"} onClick={() => setMode("chat")}>
          Chat
        </Tab>
        <Tab active={mode === "compare"} onClick={() => setMode("compare")}>
          Compare two models
        </Tab>
      </div>
      {mode === "chat" ? <Chat /> : <ComparePanel />}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-lg text-sm " +
        (active ? "bg-slate text-parchment border border-temper/60" : "text-steel hover:bg-slate")
      }
    >
      {children}
    </button>
  );
}
