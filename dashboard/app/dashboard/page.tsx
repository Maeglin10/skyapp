'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cpu, Activity, Copy, Check, RefreshCw, Zap, Brain, Shield } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://skyapp-api.onrender.com';

function ApiKeyCard() {
  const [copied, setCopied] = useState(false);
  const demoKey = 'sk_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  const copy = () => {
    navigator.clipboard.writeText(demoKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Shield className="w-4 h-4 text-violet-400" /> API Key
      </h3>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-white/10">
        <code className="text-sm text-violet-300 flex-1 font-mono truncate">{demoKey}</code>
        <button onClick={copy} className="text-neutral-400 hover:text-white transition-colors">
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-xs text-neutral-500 mt-2">Demo key — add your Stripe key to generate production keys.</p>
    </div>
  );
}

function UsageCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-violet-400" /> Usage this month
      </h3>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-neutral-400">API calls</span>
            <span className="font-mono">0 / 100</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full">
            <div className="h-2 bg-violet-500 rounded-full" style={{ width: '0%' }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-neutral-400">Memory storage</span>
            <span className="font-mono">0 MB / 10 MB</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full">
            <div className="h-2 bg-cyan-500 rounded-full" style={{ width: '0%' }} />
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-neutral-500">Plan: Free</span>
        <Link href="/pricing" className="text-xs text-violet-400 hover:underline">Upgrade →</Link>
      </div>
    </div>
  );
}

function HealthCard() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    setStatus('checking');
    try {
      const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(5000) });
      setStatus(res.ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { check(); }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" /> API Status
        </h3>
        <button onClick={check} disabled={loading} className="text-neutral-400 hover:text-white transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${
          status === 'online' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' :
          status === 'offline' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
        }`} />
        <div>
          <p className="font-medium text-sm">
            {status === 'online' ? 'Operational' : status === 'offline' ? 'Unavailable' : 'Checking...'}
          </p>
          <p className="text-xs text-neutral-500">{API_URL}</p>
        </div>
      </div>
    </div>
  );
}

function TryItCard() {
  const [task, setTask] = useState('Analyze the security posture of example.com and provide recommendations');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult('');
    // Simulated demo response
    await new Promise(r => setTimeout(r, 1500));
    setResult(JSON.stringify({
      id: 'exec_demo_' + Math.random().toString(36).slice(2, 9),
      status: 'completed',
      agent: 'claude-haiku-4-5',
      output: 'Demo mode — connect a real API key to execute actual agents.',
      tokens_used: 0,
      duration_ms: 0,
    }, null, 2));
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 col-span-full">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Brain className="w-4 h-4 text-violet-400" /> Try the API
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Task</label>
          <textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-neutral-600 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
        <button
          onClick={run}
          disabled={loading || !task}
          className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-all flex items-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? 'Running...' : 'Run Agent'}
        </button>
        {result && (
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Response</label>
            <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-xs text-neutral-300 overflow-x-auto font-mono">{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <Cpu className="w-6 h-6 text-violet-400" />
          <span className="font-bold text-lg tracking-tight">SkyApp</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/docs" className="text-sm text-neutral-400 hover:text-white transition-colors">Docs</Link>
          <Link href="/pricing" className="text-sm text-neutral-400 hover:text-white transition-colors">Pricing</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-neutral-400 text-sm">Manage your API access and monitor usage.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <HealthCard />
          <UsageCard />
          <ApiKeyCard />
          <TryItCard />
        </div>
      </div>
    </div>
  );
}
