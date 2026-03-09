import Link from 'next/link';

/**
 * Landing: link to the quote tool. Optional; you can redirect or replace with a full landing.
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold text-cyan-800 dark:text-cyan-200 mb-4">
        Developer quote tool
      </h1>
      <p className="text-cyan-700 dark:text-cyan-300 mb-8 max-w-md text-center">
        Price app and website projects using your hourly rate and experience.
        Select features, adjust timeline, and export your quote.
      </p>
      <Link
        href="/get-a-quote"
        className="rounded-md bg-cyan-600 px-6 py-3 text-white font-medium hover:bg-cyan-700 transition-colors"
      >
        Get a quote →
      </Link>
    </div>
  );
}
