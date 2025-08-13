import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        YTB Quiz System
      </h1>
      <p className="text-lg text-center text-gray-600 mb-12">
        リアルタイム早押しクイズシステム
      </p>
      
      <div className="flex justify-center gap-4 mb-12">
        <Link 
          href="/quiz" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          クイズに参加
        </Link>
        <Link 
          href="/host" 
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          クイズを主催
        </Link>
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">機能</h2>
          <ul className="space-y-2">
            <li>• リアルタイム早押し機能</li>
            <li>• WebSocket通信</li>
            <li>• 順位判定システム</li>
            <li>• 複数参加者対応</li>
          </ul>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">技術スタック</h2>
          <ul className="space-y-2">
            <li>• Next.js 14 (Frontend)</li>
            <li>• NestJS (Backend)</li>
            <li>• Socket.io (WebSocket)</li>
            <li>• TypeScript</li>
          </ul>
        </div>
      </div>
    </main>
  )
}