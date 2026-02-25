import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Link2,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Check,
  Star,
} from 'lucide-react'

const features = [
  {
    icon: Link2,
    title: 'Smart Links',
    description:
      'Create trackable links that capture UTM parameters and attribute every conversion back to the exact ad.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time ROAS',
    description:
      'See your return on ad spend instantly. Know which campaigns are profitable before you burn through budget.',
  },
  {
    icon: Zap,
    title: 'Meta CAPI Integration',
    description:
      'Send conversion events directly to Meta for better optimization and lower CPAs through server-side tracking.',
  },
  {
    icon: TrendingUp,
    title: 'Landing Page Builder',
    description:
      'Build high-converting landing pages optimized for adult traffic with our drag-and-drop editor.',
  },
  {
    icon: Shield,
    title: 'OnlyFans API Direct',
    description:
      'Direct integration with OnlyFans via the official API. No scrapers, no bans, just reliable data.',
  },
  {
    icon: Users,
    title: 'Multi-Creator Management',
    description:
      'Manage unlimited creators from one dashboard. Track performance across your entire portfolio.',
  },
]

const pricing = [
  {
    name: 'Starter',
    price: 97,
    description: 'Perfect for solo media buyers getting started',
    features: [
      'Up to 3 creators',
      '10,000 clicks/month',
      'Smart link tracking',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Pro',
    price: 297,
    description: 'For growing agencies managing multiple creators',
    features: [
      'Up to 15 creators',
      '100,000 clicks/month',
      'Advanced ROAS analytics',
      'Meta CAPI integration',
      'Landing page builder',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Agency',
    price: 597,
    description: 'For large agencies with high-volume traffic',
    features: [
      'Unlimited creators',
      'Unlimited clicks',
      'White-label landing pages',
      'Custom integrations',
      'Dedicated account manager',
      'API access',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

const testimonials = [
  {
    quote:
      "Subflo changed everything for us. We went from guessing which ads worked to knowing exactly where every dollar goes. Our ROAS improved 40% in the first month.",
    author: 'Marcus T.',
    role: 'Agency Owner',
    avatar: 'M',
  },
  {
    quote:
      "Finally, real attribution for adult traffic. The Meta CAPI integration alone paid for itself 10x over. We're getting way better optimization now.",
    author: 'Sarah K.',
    role: 'Media Buyer',
    avatar: 'S',
  },
  {
    quote:
      "Managing 20+ creators used to be chaos. Now I have one dashboard that shows me exactly who's profitable and which campaigns to scale.",
    author: 'David R.',
    role: 'Agency Founder',
    avatar: 'D',
  },
]

export default function LandingPage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-violet-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-8">
              <span className="text-violet-400 text-sm font-medium">
                Built for OnlyFans Media Buyers
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
              Finally know which ads{' '}
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                make money
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
              The attribution platform that tracks every click, every conversion, and every
              dollar. Stop guessing. Start scaling what actually works.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium text-white gradient-accent rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/25"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium text-zinc-300 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                See How It Works
              </a>
            </div>

            {/* Social Proof Mini */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {['bg-violet-500', 'bg-purple-500', 'bg-pink-500'].map((color, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full ${color} border-2 border-zinc-950 flex items-center justify-center text-white text-xs font-medium`}
                    >
                      {['M', 'S', 'D'][i]}
                    </div>
                  ))}
                </div>
                <span>500+ media buyers</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                ))}
                <span className="ml-1">4.9/5 rating</span>
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="glass rounded-2xl border border-zinc-800/50 p-2 shadow-2xl shadow-violet-500/10">
              <div className="bg-zinc-900 rounded-xl overflow-hidden">
                {/* Mock Dashboard */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Campaign Performance</h3>
                      <p className="text-sm text-zinc-500">Last 7 days</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="px-3 py-1 rounded-lg bg-green-500/10 text-green-400">
                        +127% ROAS
                      </div>
                    </div>
                  </div>
                  {/* Mock Chart */}
                  <div className="h-64 flex items-end justify-between gap-2">
                    {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div
                          className="w-full gradient-accent rounded-t-lg transition-all duration-500"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-zinc-500">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Everything you need to scale
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Built from the ground up for OnlyFans media buyers. No more spreadsheets, no more
              guessing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="card card-hover p-6"
              >
                <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Start with a 14-day free trial. No credit card required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricing.map((plan, i) => (
              <div
                key={i}
                className={`relative card p-8 ${
                  plan.popular ? 'border-violet-500 ring-1 ring-violet-500' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 gradient-accent rounded-full text-sm font-medium text-white">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                  <p className="text-sm text-zinc-500">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-zinc-500">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-zinc-300">
                      <Check className="w-5 h-5 text-violet-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === 'Agency' ? '#' : '/signup'}
                  className={`block w-full py-3 text-center font-medium rounded-lg transition-all ${
                    plan.popular
                      ? 'gradient-accent text-white hover:opacity-90'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Trusted by top media buyers
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              See what agencies and media buyers are saying about Subflo.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="card p-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-zinc-300 mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-white font-medium">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{testimonial.author}</p>
                    <p className="text-sm text-zinc-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative card p-12 text-center overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/10" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to see your real ROAS?
              </h2>
              <p className="text-lg text-zinc-400 mb-8 max-w-xl mx-auto">
                Join 500+ media buyers who finally know which ads make money. Start your free
                trial today.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium text-white gradient-accent rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/25"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="mt-4 text-sm text-zinc-500">
                14-day free trial · No credit card required
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
