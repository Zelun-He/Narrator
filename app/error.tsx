"use client";
export default function StudioError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-lg px-6 py-16"><h1 className="font-serif text-3xl">Your studio is temporarily unavailable.</h1><p className="mt-4 text-muted-foreground">The account server couldn’t be reached. Your saved books remain on the backend. Please try again shortly.</p><button onClick={reset} className="mt-6 rounded-lg bg-primary px-5 py-3 text-primary-foreground">Try again</button></main>;
}
