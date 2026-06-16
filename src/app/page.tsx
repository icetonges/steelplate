import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <div>
      <h1 className="font-display text-3xl leading-tight mb-2">Steel is shaped under heat.</h1>
      <p className="text-mist max-w-xl mb-5">
        Tell me about today — a conflict, a proud moment, a worry. I track it over years,
        follow up on what you tried, and re-baseline as your child grows.
      </p>
      <div className="forge-rule mb-6" />
      <Chat />
    </div>
  );
}
