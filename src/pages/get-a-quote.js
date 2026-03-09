import GetAQuote from '@/components/GetAQuote';

/**
 * Developer-centric quote tool page. Set your rate and experience, select app
 * type and features, adjust timeline — see dynamic price and breakdown.
 */
export default function GetAQuotePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
      <div className="container mx-auto px-4 max-w-4xl relative">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-cyan-800 dark:text-cyan-200 mb-3">
            Developer quote tool
          </h1>
          <p className="text-lg text-cyan-700 dark:text-cyan-300 max-w-2xl mx-auto">
            Set your hourly rate and years of experience, select the features
            that apply to your app or website, and adjust the timeline. You get
            an estimated scope, time, and cost driven by your inputs. Export the
            quote when you&apos;re done.
          </p>
        </header>

        <GetAQuote />

        <section className="mt-14 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Customize
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Edit <code className="bg-muted px-1 rounded">src/config/config.js</code> for
            multipliers and formulas, and <code className="bg-muted px-1 rounded">src/config/pricing/</code> for
            app and website features. See README for deployment (e.g. Vercel, Netlify).
          </p>
        </section>
      </div>
    </div>
  );
}
