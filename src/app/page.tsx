import Link from 'next/link';
import { ArrowRight, Zap, Target, Mail, BarChart3 } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg" />
              <span className="font-bold text-xl">Tapflow</span>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/login" 
                className="text-gray-600 hover:text-gray-900 transition"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm mb-6">
            <Zap className="w-4 h-4" />
            AI-Powered Lead Generation
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Find & Convert Your
            <span className="text-violet-600"> Ideal Customers</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Tapflow discovers prospects, enriches their data, scores them by fit, 
            and generates personalized outreach—all on autopilot.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-violet-600 text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-violet-700 transition"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-8 py-4 rounded-xl text-lg font-medium hover:bg-gray-200 transition"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Your Complete Lead Gen Pipeline
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Target,
                title: 'Discovery',
                description: 'Find prospects from Google Maps, Yelp, Apollo, and more',
              },
              {
                icon: BarChart3,
                title: 'Enrichment',
                description: 'Get emails, phone numbers, tech stack, and company data',
              },
              {
                icon: Zap,
                title: 'AI Scoring',
                description: 'Automatically rank leads A/B/C based on fit',
              },
              {
                icon: Mail,
                title: 'Outreach',
                description: 'Generate and send personalized email sequences',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-2xl border hover:shadow-lg transition"
              >
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to 10x Your Pipeline?</h2>
          <p className="text-gray-600 mb-8">
            Join hundreds of sales teams using Tapflow to find their best customers.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-violet-600 text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-violet-700 transition"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p>© 2026 Tapflow. Built with ❤️ for sales teams.</p>
        </div>
      </footer>
    </main>
  );
}
