export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        YTB Quiz Frontend
      </h1>
      <p className="text-lg text-center text-gray-600">
        Welcome to the YouTube Quiz application frontend built with Next.js 14
      </p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul className="space-y-2">
            <li>• Next.js 14 with App Router</li>
            <li>• TypeScript support</li>
            <li>• Shared packages integration</li>
            <li>• Modern React patterns</li>
          </ul>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Development</h2>
          <ul className="space-y-2">
            <li>• Hot reload enabled</li>
            <li>• ESLint configuration</li>
            <li>• TypeScript checking</li>
            <li>• Monorepo workspace</li>
          </ul>
        </div>
      </div>
    </main>
  )
}