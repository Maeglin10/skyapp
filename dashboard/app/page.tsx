import Link from 'next/link';
import { Bot, Brain, Zap, GitBranch, Database, Shield, ArrowRight, Code2, Cpu, Globe } from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: Bot,
      title: 'Multi-Agent Orchestration',
      description: 'Run complex tasks as directed acyclic graphs (DAGs) with parallel agent execution and automatic dependency resolution.',
    },
    {
      icon: Brain,
      title: 'Semantic Memory',
      description: 'pgvector-powered long-term memory. Agents recall past context via semantic search — no hallucinations from forgotten state.',
    },
    {
      icon: Zap,
      title: 'Multi-Provider AI',
      description: 'Use Claude Haiku, GPT-4o-mini, or Gemini Flash per agent. Automatic fallback and cost optimization built-in.',
    },
    {
      icon: GitBranch,
      title: 'Task DAG Scheduler',
      description: 'Define complex workflows as task graphs. The orchestrator handles parallelism, retries, and dependency chains.',
    },
    {
      icon: Shield,
      title: 'AI Governance',
      description: 'Budget limits, spend tracking, kill switch, and permission layers. Full control over what your agents can do.',
    },
    {
      icon: Globe,
      title: 'Tool System',
      description: 'Agents call validated Zod tools: file_read, file_write, http_request, shell_exec (whitelisted). Extensible via plugins.',
    },
  ];

  const endpoints = [
    { method: 'POST', path: '/agents/run', description: 'Run a single agent on a task' },
    { method: 'POST', path: '/agents/orchestrate', description: 'Multi-agent DAG for complex objectives' },
    { method: 'SSE', path: '/agents/stream', description: 'Stream agent output in real-time' },
    { method: 'POST', path: '/memory/store', description: 'Store memory with vector embedding' },
    { method: 'POST', path: '/memory/query', description: 'Semantic search across memories' },
    { method: 'GET', path: '/tools', description: 'List available tools' },
    { method: 'GET', path: '/admin/budget', description: 'AI spend and budget status' },
    { method: 'GET', path: '/health', description: 'Health check' },
  ];

  const methodColors: Record<string, string> = {
    POST: 'bg-green-500/10 text-green-400',
    GET: 'bg-blue-500/10 text-blue-400',
    SSE: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Cpu className="w-6 h-6 text-violet-400" />
          <span className="font-bold text-lg tracking-tight">SkyApp</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="text-sm text-neutral-400 hover:text-white transition-colors">Pricing</Link>
          <Link href="/docs" className="text-sm text-neutral-400 hover:text-white transition-colors">Docs</Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors"
          >
            Try API
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-medium mb-8">
          <Zap className="w-3 h-3" /> Multi-Agent AI Orchestration API
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
          Build AI agents that<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
            actually remember
          </span>
        </h1>
        <p className="text-xl text-neutral-400 max-w-3xl mx-auto mb-10">
          SkyApp is a production-grade AI orchestration API. Run parallel agent DAGs, persist memory with semantic search,
          and control costs — all via a single REST API.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold transition-all hover:scale-105"
          >
            Try the API <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/docs"
            className="flex items-center gap-2 px-8 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 font-semibold transition-all"
          >
            <Code2 className="w-4 h-4" /> View Docs
          </Link>
        </div>
      </section>

      {/* Code example */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="text-xs text-neutral-500 ml-2">Example: multi-agent orchestration</span>
          </div>
          <pre className="p-6 text-sm text-neutral-300 overflow-x-auto"><code>{`curl -X POST https://skyapp-api.onrender.com/agents/orchestrate \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "objective": "Research competitors for SaaS pricing and write a report",
    "agents": [
      { "id": "researcher", "task": "Search web for SaaS pricing trends" },
      { "id": "analyst", "task": "Analyze findings", "depends_on": ["researcher"] },
      { "id": "writer", "task": "Write executive report", "depends_on": ["analyst"] }
    ],
    "memory": true
  }'`}</code></pre>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-4">Everything you need to ship AI agents</h2>
        <p className="text-neutral-400 text-center mb-16 max-w-2xl mx-auto">
          Production-ready from day one. No boilerplate. No LangChain complexity.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* API Reference preview */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">API Reference</h2>
          <Link href="/docs" className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1">
            Full docs <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          {endpoints.map((ep, i) => (
            <div key={ep.path} className={`flex items-center gap-4 px-6 py-4 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} hover:bg-white/5 transition-colors`}>
              <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${methodColors[ep.method] || 'bg-neutral-500/10 text-neutral-400'} min-w-[50px] text-center`}>
                {ep.method}
              </span>
              <code className="text-sm text-violet-300 font-mono min-w-[240px]">{ep.path}</code>
              <span className="text-sm text-neutral-400">{ep.description}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <div className="p-12 rounded-3xl border border-violet-500/20 bg-violet-500/5">
          <h2 className="text-3xl font-bold mb-4">Start building in 5 minutes</h2>
          <p className="text-neutral-400 mb-8">Free tier includes 100 API calls/month. No credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              Get API Key <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 rounded-xl border border-white/10 hover:bg-white/5 font-semibold transition-all flex items-center justify-center gap-2"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Cpu className="w-4 h-4" />
          <span>SkyApp © 2026 — Built by <a href="https://github.com/Maeglin10" className="text-violet-400 hover:underline">Valentin Milliand</a></span>
        </div>
        <div className="flex gap-6 text-sm text-neutral-500">
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <a href="https://github.com/Maeglin10/skyapp" className="hover:text-white transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
