'use client';

import { TtsDemo } from '@/components/tts-demo';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎙️ Piper TTS Demo
          </h1>
          <p className="text-xl text-slate-300">
            Dynamic text-to-speech generation for your audiobook application
          </p>
        </div>

        <TtsDemo />

        <div className="mt-12 bg-slate-800/50 rounded-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-6">📚 Getting Started</h2>
          
          <div className="space-y-4 text-slate-300">
            <div>
              <h3 className="font-semibold text-white mb-2">1. Try the Demo Above</h3>
              <p>Enter any text, select streaming or persistent mode, and generate audio instantly.</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">2. API Endpoints</h3>
              <div className="bg-slate-900 p-4 rounded font-mono text-sm space-y-2">
                <p>POST <span className="text-green-400">/api/tts</span> - Generate audio</p>
                <p>GET <span className="text-green-400">/api/audio/list</span> - List files</p>
                <p>DELETE <span className="text-green-400">/api/audio/delete</span> - Delete file</p>
                <p>POST <span className="text-green-400">/api/audio/cleanup</span> - Cleanup old</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">3. Documentation</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><a href="https://github.com" className="text-blue-400 hover:text-blue-300">TTS_API.md</a> - Complete API reference</li>
                <li><a href="https://github.com" className="text-blue-400 hover:text-blue-300">IMPLEMENTATION_EXAMPLES.md</a> - Code examples</li>
                <li><a href="https://github.com" className="text-blue-400 hover:text-blue-300">SETUP_GUIDE.md</a> - Installation guide</li>
                <li><a href="https://github.com" className="text-blue-400 hover:text-blue-300">TESTING_GUIDE.md</a> - Testing procedures</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">4. Features</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>✅ Streaming mode - Direct binary audio response</li>
                <li>✅ Persistent mode - Save to /public/audio</li>
                <li>✅ Error handling - Comprehensive validation</li>
                <li>✅ File management - List, delete, cleanup</li>
                <li>✅ Production-ready - Timeout, cleanup, security</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-slate-400 text-sm">
          <p>Piper TTS Integration • Production Ready • Full Source Code Included</p>
        </div>
      </div>
    </div>
  );
}
