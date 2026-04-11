import Link from 'next/link';
import { Check, Cpu } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '€0',
    period: '/month',
    description: 'Explore and prototype',
    cta: 'Get API Key',
    ctaHref: '/dashboard',
    highlight: false,
    features: [
      '100 API calls/month',
      '1 concurrent agent',
      '10 MB memory storage',
      'Claude Haiku model',
      'Community support',
      'Public API docs',
    ],
  },
  {
    name: 'Pro',
    price: '€79',
    period: '/month',
    description: 'For production applications',
    cta: 'Start Free Trial',
    ctaHref: '/dashboard?plan=pro',
    highlight: true,
    badge: 'Most Popular',
    features: [
      '10,000 API calls/month',
      '10 concurrent agents',
      '1 GB memory storage',
      'All models (Claude, GPT-4o, Gemini)',
      'Webhooks & streaming',
      'Priority support (SLA 24h)',
      'Advanced analytics',
      'Custom tool plugins',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For teams at scale',
    cta: 'Contact Sales',
    ctaHref: 'mailto:sales@skyapp.dev',
    highlight: false,
    features: [
      'Unlimited API calls',
      'Unlimited agents',
      'Unlimited memory storage',
      'All models + fine-tuning',
      'Dedicated infrastructure',
      'On-premises deployment',
      'SLA 99.9% uptime',
      'Custom integrations',
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <Cpu className="w-6 h-6 text-violet-400" />
          <span className="font-bold text-lg tracking-tight">SkyApp</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/docs" className="text-sm text-neutral-400 hover:text-white transition-colors">Docs</Link>
          <Link href="/dashboard" className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors">
            Get Started
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black mb-4">API Pricing</h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Pay only for what you use. Scale instantly. No infrastructure to manage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 flex flex-col gap-6 ${
                plan.highlight
                  ? 'border-violet-500/50 bg-violet-500/5 shadow-2xl shadow-violet-500/10 scale-105'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-violet-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div>
                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <p className="text-sm text-neutral-400">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">{plan.price}</span>
                {plan.period && <span className="text-neutral-400">{plan.period}</span>}
              </div>

              <Link
                href={plan.ctaHref}
                className={`w-full text-center py-3 rounded-xl font-semibold transition-all ${
                  plan.highlight
                    ? 'bg-violet-600 text-white hover:bg-violet-500'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    <span className="text-neutral-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-8">
            {[
              { q: 'What counts as an API call?', a: 'Each request to /agents/run or /agents/orchestrate counts as one call per agent spawned. Memory queries and tool calls are free.' },
              { q: 'Can I switch plans?', a: 'Yes, upgrade or downgrade at any time. Changes apply immediately. Unused credits are prorated.' },
              { q: 'What happens if I exceed my quota?', a: 'API calls return a 429 response with a clear error. You can upgrade instantly from your dashboard.' },
              { q: 'Is there a free trial for Pro?', a: '14-day free trial included. No credit card required to start.' },
              { q: 'Can I use my own AI API keys?', a: 'Pro and Enterprise plans support BYOK (Bring Your Own Key) for all supported providers.' },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-white/10 pb-8">
                <h3 className="font-semibold mb-2">{q}</h3>
                <p className="text-neutral-400 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
