import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main className="min-h-screen max-w-3xl mx-auto px-5 py-10">
      <header className="mb-8">
        <p className="text-temper text-xs tracking-[0.3em] uppercase mb-2">steelplate</p>
        <h1 className="font-display text-4xl leading-tight mb-3">
          Steel is shaped under heat.
        </h1>
        <p className="text-mist max-w-xl">
          A mentor that tracks your child over years, follows up on what you tried,
          and re-baselines as they grow — built to strengthen character, not chase grades.
        </p>
        <div className="forge-rule mt-6" />
      </header>
      <Chat />
    </main>
  );
}
