export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-2">AI Agent Tracker</h1>
          <p className="text-lg text-gray-500">
            Discover trending open-source AI Agent repositories on GitHub
          </p>
        </header>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Trending Today</h2>
          <div className="grid gap-4">
            <div className="border rounded-lg p-6 text-center text-gray-400">
              Loading repositories...
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
