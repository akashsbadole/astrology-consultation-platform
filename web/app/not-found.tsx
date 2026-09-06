export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-midnight to-midnight-deep px-6">
      <div className="text-center">
        <p className="font-display text-6xl font-semibold text-brass">404</p>
        <h1 className="mt-4 font-display text-2xl font-semibold text-parchment">Page not found</h1>
        <p className="mt-2 text-mist">The page you are looking for does not exist or has been moved.</p>
        <a
          href="/"
          className="mt-6 inline-block rounded-[10px] bg-gradient-to-br from-brass to-[#B08A44] px-6 py-3 text-sm font-bold text-midnight hover:opacity-90"
        >
          Go home
        </a>
      </div>
    </main>
  );
}
