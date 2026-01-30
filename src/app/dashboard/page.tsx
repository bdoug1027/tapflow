'use client';

import { trpc } from '@/lib/trpc/client';
import { Target, Users, Mail, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  // These will error until Supabase is connected - that's expected
  const { data: campaigns, isLoading: loadingCampaigns } = trpc.campaigns.list.useQuery(
    undefined,
    { retry: false }
  );

  // Mock stats for demo
  const stats = [
    { name: 'Active Campaigns', value: campaigns?.length || 0, icon: Target, color: 'violet' },
    { name: 'Total Leads', value: 0, icon: Users, color: 'blue' },
    { name: 'Emails Sent', value: 0, icon: Mail, color: 'green' },
    { name: 'Reply Rate', value: '0%', icon: TrendingUp, color: 'amber' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your pipeline overview.</p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl p-6 border">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Recent Campaigns</h2>
        </div>
        <div className="p-6">
          {loadingCampaigns ? (
            <div className="text-center py-8 text-gray-500">Loading campaigns...</div>
          ) : campaigns?.length ? (
            <div className="space-y-4">
              {campaigns.slice(0, 5).map((campaign: any) => (
                <Link
                  key={campaign.id}
                  href={`/dashboard/campaigns/${campaign.id}`}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-gray-600">
                      {campaign.business_type} • {campaign.target_location}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    campaign.status === 'active' 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {campaign.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No campaigns yet</p>
              <Link
                href="/dashboard/campaigns/new"
                className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700"
              >
                <Plus className="w-4 h-4" />
                Create your first campaign
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Setup Guide (for new users) */}
      <div className="mt-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="font-semibold text-lg mb-2">🚀 Getting Started</h3>
        <p className="text-violet-100 mb-4">
          To start finding leads, you'll need to connect your Supabase database and add your API keys.
        </p>
        <div className="flex gap-4">
          <Link
            href="/dashboard/settings"
            className="bg-white text-violet-600 px-4 py-2 rounded-lg font-medium hover:bg-violet-50 transition"
          >
            Configure Settings
          </Link>
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white underline hover:no-underline"
          >
            Create Supabase Project →
          </a>
        </div>
      </div>
    </div>
  );
}
