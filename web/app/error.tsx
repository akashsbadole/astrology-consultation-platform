'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-midnight to-midnight-deep px-6">
      <div className="text-center">
        <p className="font-display text-6xl font-semibold text-error">!</p>
        <h1 className="mt-4 font-display text-2xl font-semibold text-parchment">Something went wrong</h1>
        <p className="mt-2 text-mist">{error.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={reset}
          className="mt-6 inline-block rounded-[10px] bg-gradient-to-br from-brass to-[#B08A44] px-6 py-3 text-sm font-bold text-midnight hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
