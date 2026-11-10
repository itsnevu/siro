import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="font-serif text-[120px] md:text-[200px] leading-none text-faint mb-4">404</div>
        <h1 className="font-serif text-[36px] md:text-[48px] mb-4">Page not found</h1>
        <p className="text-muted text-lg mb-8 max-w-md mx-auto">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
      </div>
    </main>
  );
}
