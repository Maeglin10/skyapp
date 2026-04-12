'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Cpu, Copy, Check, ChevronRight, Play, Loader2,
  Bot, Brain, Zap, GitBranch, Shield, Globe, Terminal,
  BookOpen, Code2, Lock, AlertCircle
} from 'lucide-react';

const API_URL = 'https://aevia-app-api.onrender.com';
const DEMO_KEY = 'sk_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

// ─── Types ───────────────────────────────────────────────────────────────────

type Method = 'POST' | 'GET' | 'SSE';
type Endpoint = {
  id: string;
  method: Method;
  path: string;
  title: string;
  description: string;
  auth: boolean;
  body?: object;
  response?: object;
  section: string;
};

// ─── API reference ───────────────────────────────────────────────────────────

const ENDPOINTS: Endpoint[] = [
  {
    id: 'agents-run',
    method: 'POST',
    path: '/agents/run',
    title: 'Run an agent',
    section: 'Agents',
    auth: true,
    description: 'Execute a single agent on a task. The agent will use the configured LLM provider, available tools, and memory to complete the objective.',
    body: {
      objective: 'Summarise the top 3 pricing strategies for B2B SaaS in 2025',
      provider: 'claude-haiku',
      memory: true,
      tools: ['http_request'],
    },
    response: {
      agentId: 'agt_01JXYZ',
      status: 'COMPLETED',
      result: 'Based on analysis of 50+ SaaS companies...',
      tokensUsed: 1842,
      costUsd: 0.0009,
      durationMs: 3420,
    },
  },
  {
    id: 'agents-orchestrate',
    method: 'POST',
    path: '/agents/orchestrate',
    title: 'Orchestrate (DAG)',
    section: 'Agents',
    auth: true,
    description: 'Run a directed acyclic graph of agents. Parallel agents execute concurrently; dependent agents wait. Results flow automatically through the dependency chain.',
    body: {
      objective: 'Research competitors and write an executive report',
      agents: [
        { id: 'researcher', task: 'Search web for SaaS pricing trends', tools: ['http_request'] },
        { id: 'analyst', task: 'Analyse the findings', depends_on: ['researcher'] },
        { id: 'writer', task: 'Write executive report', depends_on: ['analyst'] },
      ],
      memory: true,
    },
    response: {
      orchestrationId: 'orch_01JXYZ',
      status: 'COMPLETED',
      agents: [
        { id: 'researcher', status: 'COMPLETED', durationMs: 2100 },
        { id: 'analyst', status: 'COMPLETED', durationMs: 1850 },
        { id: 'writer', status: 'COMPLETED', durationMs: 2400 },
      ],
      finalOutput: 'Executive report: Q2 2025 SaaS Pricing Landscape...',
      totalTokens: 5210,
      totalCostUsd: 0.0026,
    },
  },
  {
    id: 'agents-status',
    method: 'GET',
    path: '/agents/:id/status',
    title: 'Agent status',
    section: 'Agents',
    auth: true,
    description: 'Get the execution status and token usage for a specific agent run.',
    response: {
      agentId: 'agt_01JXYZ',
      steps: [{ type: 'llm_call', tokensIn: 420, tokensOut: 312, durationMs: 1200 }],
      totalTokens: 732,
      totalCostUsd: 0.00036,
    },
  },
  {
    id: 'memory-store',
    method: 'POST',
    path: '/memory/store',
    title: 'Store memory',
    section: 'Memory',
    auth: true,
    description: 'Store a memory with automatic pgvector embedding. The memory becomes available for semantic retrieval by any agent.',
    body: {
      content: 'User prefers JSON responses. Always use camelCase keys.',
      agentId: 'agt_01JXYZ',
      metadata: { type: 'user_preference', importance: 'high' },
    },
    response: {
      id: 'mem_01JXYZ',
      content: 'User prefers JSON responses...',
      embeddingDims: 1536,
      createdAt: '2026-04-12T10:00:00Z',
    },
  },
  {
    id: 'memory-query',
    method: 'POST',
    path: '/memory/query',
    title: 'Semantic search',
    section: 'Memory',
    auth: true,
    description: 'Search memories using vector similarity. Returns the most semantically relevant results to your query.',
    body: {
      query: 'What are the user formatting preferences?',
      topK: 5,
      threshold: 0.75,
    },
    response: {
      results: [
        { id: 'mem_01JXYZ', content: 'User prefers JSON responses...', similarity: 0.94 },
      ],
    },
  },
  {
    id: 'tools-list',
    method: 'GET',
    path: '/tools',
    title: 'List tools',
    section: 'Tools',
    auth: true,
    description: 'List all tools available to agents. Tools are validated with Zod schemas and execute in a sandboxed context.',
    response: {
      tools: [
        { name: 'http_request', description: 'Make HTTP calls to external APIs', parameters: ['url', 'method', 'headers', 'body'] },
        { name: 'file_read', description: 'Read file from working directory', parameters: ['path'] },
        { name: 'file_write', description: 'Write file to working directory', parameters: ['path', 'content'] },
        { name: 'shell_exec', description: 'Execute whitelisted shell commands', parameters: ['command'] },
      ],
    },
  },
  {
    id: 'tools-execute',
    method: 'POST',
    path: '/tools/execute',
    title: 'Execute a tool',
    section: 'Tools',
    auth: true,
    description: 'Execute a tool directly without running a full agent. Useful for testing tool integrations.',
    body: {
      toolName: 'http_request',
      input: { url: 'https://api.github.com/repos/Maeglin10/skyapp', method: 'GET' },
      permissions: ['http_request'],
    },
    response: {
      success: true,
      output: { status: 200, data: { stargazers_count: 42 } },
      durationMs: 310,
    },
  },
  {
    id: 'admin-budget',
    method: 'GET',
    path: '/admin/budget',
    title: 'Budget & usage',
    section: 'Admin',
    auth: true,
    description: 'Get current AI spend, token usage, and budget limits. Includes per-provider breakdown.',
    response: {
      totalSpendUsd: 1.24,
      monthlyBudgetUsd: 50,
      remaining: 48.76,
      byProvider: {
        'claude-haiku': { calls: 312, tokens: 248000, costUsd: 0.89 },
        'gpt-4o-mini': { calls: 44, tokens: 31000, costUsd: 0.35 },
      },
    },
  },
  {
    id: 'health',
    method: 'GET',
    path: '/health',
    title: 'Health check',
    section: 'Admin',
    auth: false,
    description: 'Check API health and dependency status. No auth required.',
    response: { status: 'ok', version: '1.0.0', db: 'connected', vector: 'ready' },
  },
];

const SECTIONS = ['Agents', 'Memory', 'Tools', 'Admin'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function methodBadge(method: Method) {
  const colors: Record<Method, string> = {
    POST: 'bg-green-500/15 text-green-400 border-green-500/20',
    GET: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    SSE: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  };
  return (
    <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded border ${colors[method]} uppercase tracking-wider`}>
      {method}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-neutral-500 hover:text-white transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <div className="relative rounded-xl bg-zinc-950 border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-xs text-neutral-500 font-mono">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-sm text-neutral-300 overflow-x-auto leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────────────────────

function Playground({ endpoint }: { endpoint: Endpoint }) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState(
    endpoint.body ? JSON.stringify(endpoint.body, null, 2) : ''
  );

  const run = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    // If GET or no body, use mock response immediately (no real server)
    if (endpoint.method === 'GET' || !endpoint.body) {
      await new Promise(r => setTimeout(r, 600));
      setResponse(JSON.stringify(endpoint.response, null, 2));
      setLoading(false);
      return;
    }

    // For POST endpoints, try real API then fall back to mock
    try {
      const res = await fetch(`${API_URL}${endpoint.path.replace('/:id', '/demo')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEMO_KEY}`,
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch {
      // Server unreachable — show mock response
      await new Promise(r => setTimeout(r, 800));
      setResponse(JSON.stringify({ ...endpoint.response, _note: 'Demo response — API server at aevia-app-api.onrender.com' }, null, 2));
    }
    setLoading(false);
  };

  const curlExample = endpoint.method === 'GET'
    ? `curl -H "Authorization: Bearer ${DEMO_KEY}" \\\n  ${API_URL}${endpoint.path}`
    : `curl -X POST ${API_URL}${endpoint.path} \\\n  -H "Authorization: Bearer ${DEMO_KEY}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(endpoint.body, null, 2)}'`;

  const jsExample = endpoint.method === 'GET'
    ? `const res = await fetch('${API_URL}${endpoint.path}', {\n  headers: { Authorization: 'Bearer YOUR_API_KEY' },\n});\nconst data = await res.json();`
    : `const res = await fetch('${API_URL}${endpoint.path}', {\n  method: 'POST',\n  headers: {\n    Authorization: 'Bearer YOUR_API_KEY',\n    'Content-Type': 'application/json',\n  },\n  body: JSON.stringify(${JSON.stringify(endpoint.body, null, 2)}),\n});\nconst data = await res.json();`;

  const [codeTab, setCodeTab] = useState<'curl' | 'js'>('curl');

  return (
    <div className="space-y-6">
      {/* Code examples */}
      <div>
        <div className="flex gap-2 mb-3">
          {(['curl', 'js'] as const).map(t => (
            <button
              key={t}
              onClick={() => setCodeTab(t)}
              className={`text-xs px-3 py-1.5 rounded-lg font-mono transition-colors ${codeTab === t ? 'bg-violet-600 text-white' : 'bg-white/5 text-neutral-400 hover:text-white'}`}
            >
              {t === 'js' ? 'JavaScript' : 'cURL'}
            </button>
          ))}
        </div>
        <CodeBlock code={codeTab === 'curl' ? curlExample : jsExample} lang={codeTab === 'curl' ? 'bash' : 'javascript'} />
      </div>

      {/* Interactive playground */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
          <Terminal className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium">Try it live</span>
          <span className="ml-auto text-xs text-neutral-500">Demo key pre-loaded</span>
        </div>

        <div className="p-4 space-y-4">
          {endpoint.body && (
            <div>
              <label className="block text-xs text-neutral-500 mb-2 font-medium uppercase tracking-wider">Request body</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={Math.min(body.split('\n').length + 1, 14)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm font-mono text-neutral-300 focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>
          )}

          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</> : <><Play className="w-4 h-4" /> Send request</>}
          </button>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {response && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Response</span>
                <CopyButton text={response} />
              </div>
              <pre className="p-3 rounded-lg bg-zinc-950 border border-white/10 text-xs text-green-300 font-mono overflow-x-auto leading-relaxed max-h-64 overflow-y-auto">{response}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Endpoint detail ─────────────────────────────────────────────────────────

function EndpointDetail({ ep }: { ep: Endpoint }) {
  return (
    <div id={ep.id} className="scroll-mt-24 pb-16 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 mb-3">
        {methodBadge(ep.method)}
        <code className="text-violet-300 font-mono text-base font-medium">{ep.path}</code>
        {!ep.auth && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-neutral-500/10 text-neutral-400 border-neutral-500/20 uppercase tracking-wider">
            No auth
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold mb-3">{ep.title}</h3>
      <p className="text-neutral-400 text-sm leading-relaxed mb-8">{ep.description}</p>
      <Playground endpoint={ep} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('Agents');

  const sectionIcons: Record<string, React.ReactNode> = {
    Agents: <Bot className="w-4 h-4" />,
    Memory: <Brain className="w-4 h-4" />,
    Tools: <Globe className="w-4 h-4" />,
    Admin: <Shield className="w-4 h-4" />,
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-violet-400" />
          <span className="font-bold tracking-tight">AeviaApp</span>
          <ChevronRight className="w-4 h-4 text-neutral-600" />
          <span className="text-neutral-400 text-sm">Docs</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors flex items-center gap-2">
            <Zap className="w-4 h-4" /> Try API
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto pt-8 pr-6 pb-8">
          {/* Getting started */}
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-3">Overview</p>
            <div className="space-y-1">
              {[
                { href: '#quickstart', label: 'Quick start', icon: <BookOpen className="w-3.5 h-3.5" /> },
                { href: '#authentication', label: 'Authentication', icon: <Lock className="w-3.5 h-3.5" /> },
                { href: '#errors', label: 'Errors', icon: <AlertCircle className="w-3.5 h-3.5" /> },
              ].map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 text-sm transition-colors"
                >
                  <span className="text-neutral-600">{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Sections */}
          {SECTIONS.map(section => (
            <div key={section} className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-2 px-3">{section}</p>
              <div className="space-y-0.5">
                {ENDPOINTS.filter(ep => ep.section === section).map(ep => (
                  <a
                    key={ep.id}
                    href={`#${ep.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 text-sm transition-colors group"
                  >
                    {methodBadge(ep.method)}
                    <span className="truncate group-hover:text-white">{ep.title}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 px-8 py-12">
          {/* Quick start */}
          <div id="quickstart" className="scroll-mt-24 mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-medium mb-6">
              <Code2 className="w-3 h-3" /> API Reference
            </div>
            <h1 className="text-4xl font-black mb-4">Documentation</h1>
            <p className="text-neutral-400 text-lg leading-relaxed mb-8 max-w-2xl">
              Everything you need to build with AeviaApp. Run agents, orchestrate multi-step workflows, and persist memory — all via REST.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
              {[
                { icon: <Zap className="w-5 h-5 text-violet-400" />, title: 'Base URL', value: 'aevia-app-api.onrender.com' },
                { icon: <Code2 className="w-5 h-5 text-green-400" />, title: 'Format', value: 'JSON (application/json)' },
                { icon: <Lock className="w-5 h-5 text-amber-400" />, title: 'Auth', value: 'Bearer token (sk_*)' },
              ].map(item => (
                <div key={item.title} className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    {item.icon}
                    <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">{item.title}</span>
                  </div>
                  <code className="text-sm text-white font-mono">{item.value}</code>
                </div>
              ))}
            </div>

            <h2 className="text-2xl font-bold mb-4">Quick start</h2>
            <p className="text-neutral-400 mb-4">Run your first agent in under a minute:</p>
            <CodeBlock
              lang="bash"
              code={`# 1. Get your API key from the dashboard
curl https://aevia-app-api.onrender.com/health

# 2. Run your first agent
curl -X POST https://aevia-app-api.onrender.com/agents/run \\
  -H "Authorization: Bearer sk_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "objective": "What is the current time in Tokyo?",
    "tools": ["http_request"],
    "memory": false
  }'`}
            />
          </div>

          {/* Authentication */}
          <div id="authentication" className="scroll-mt-24 mb-16 pb-16 border-b border-white/5">
            <h2 className="text-2xl font-bold mb-4">Authentication</h2>
            <p className="text-neutral-400 mb-6">
              All endpoints (except <code className="text-violet-300">/health</code>) require a Bearer token in the <code className="text-violet-300">Authorization</code> header.
              Keys start with <code className="text-violet-300">sk_live_</code> for production or <code className="text-violet-300">sk_demo_</code> for testing.
            </p>
            <CodeBlock lang="bash" code={`Authorization: Bearer sk_live_your_key_here`} />
            <div className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">Keep your API keys secret. Never expose them in client-side code or public repos.</p>
            </div>
          </div>

          {/* Errors */}
          <div id="errors" className="scroll-mt-24 mb-16 pb-16 border-b border-white/5">
            <h2 className="text-2xl font-bold mb-4">Errors</h2>
            <p className="text-neutral-400 mb-6">AeviaApp uses standard HTTP status codes. Error bodies always include a <code className="text-violet-300">message</code> field.</p>
            <div className="rounded-xl border border-white/10 overflow-hidden">
              {[
                { code: '400', label: 'Bad Request', desc: 'Missing or invalid parameters' },
                { code: '401', label: 'Unauthorized', desc: 'Invalid or missing API key' },
                { code: '402', label: 'Payment Required', desc: 'Free tier limit reached' },
                { code: '429', label: 'Rate Limited', desc: 'Too many requests — back off and retry' },
                { code: '500', label: 'Server Error', desc: 'Something went wrong on our end' },
              ].map((item, i) => (
                <div key={item.code} className={`flex items-center gap-4 px-5 py-3 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                  <code className="text-sm font-mono font-bold text-red-400 w-12">{item.code}</code>
                  <span className="text-sm font-medium text-white w-36">{item.label}</span>
                  <span className="text-sm text-neutral-400">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Endpoint sections */}
          {SECTIONS.map(section => (
            <div key={section} className="mb-4">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
                  {sectionIcons[section]}
                </div>
                <h2 className="text-2xl font-bold">{section}</h2>
              </div>
              <div className="space-y-16">
                {ENDPOINTS.filter(ep => ep.section === section).map(ep => (
                  <EndpointDetail key={ep.id} ep={ep} />
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
