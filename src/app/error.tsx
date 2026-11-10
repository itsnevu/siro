"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="font-serif text-[120px] md:text-[200px] leading-none text-faint mb-4">500</div>
        <h1 className="font-serif text-[36px] md:text-[48px] mb-4">Something went wrong</h1>
        <p className="text-muted text-lg mb-8 max-w-md mx-auto">
          An unexpected error occurred. Please try again.
        </p>
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
      </div>
    </main>
  );
}
