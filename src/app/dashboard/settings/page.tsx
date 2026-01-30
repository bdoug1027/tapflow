'use client';

import { useState } from 'react';
import { Key, Database, Mail, Brain, Check, ExternalLink } from 'lucide-react';

const apiKeys = [
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Database and authentication',
    icon: Database,
    required: true,
    envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    docsUrl: 'https://supabase.com/docs',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'AI scoring and content generation',
    icon: Brain,
    required: true,
    envVars: ['ANTHROPIC_API_KEY'],
    docsUrl: 'https://console.anthropic.com/',
  },
  {
    id: 'hunter',
    name: 'Hunter.io',
    description: 'Email finding and verification',
    icon: Mail,
    required: false,
    envVars: ['HUNTER_API_KEY'],
    docsUrl: 'https://hunter.io/api-documentation',
  },
  {
    id: 'instantly',
    name: 'Instantly',
    description: 'Cold email sending',
    icon: Mail,
    required: false,
    envVars: ['INSTANTLY_API_KEY'],
    docsUrl: 'https://developer.instantly.ai/',
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('api-keys');

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure your Tapflow integrations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b mb-6">
        {[
          { id: 'api-keys', name: 'API Keys' },
          { id: 'account', name: 'Account' },
          { id: 'billing', name: 'Billing' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 -mb-px border-b-2 transition ${
              activeTab === tab.id
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* API Keys Tab */}
      {activeTab === 'api-keys' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">🔐 Environment Variables</h3>
            <p className="text-sm text-blue-700">
              API keys are configured via environment variables in your <code className="bg-blue-100 px-1 rounded">.env.local</code> file.
              This keeps them secure and out of your codebase.
            </p>
          </div>

          <div className="bg-white rounded-xl border">
            {apiKeys.map((api, index) => (
              <div
                key={api.id}
                className={`p-6 ${index !== apiKeys.length - 1 ? 'border-b' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <api.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{api.name}</h3>
                      {api.required && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{api.description}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {api.envVars.map((envVar) => (
                        <code
                          key={envVar}
                          className="text-xs bg-gray-100 px-2 py-1 rounded font-mono"
                        >
                          {envVar}
                        </code>
                      ))}
                    </div>
                    <a
                      href={api.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700"
                    >
                      Get API Key
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Example .env.local */}
          <div className="bg-gray-900 rounded-xl p-6 text-white">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Example .env.local
            </h3>
            <pre className="text-sm font-mono text-gray-300 overflow-x-auto">
{`# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI
ANTHROPIC_API_KEY=sk-ant-api03-...

# Email Finding
HUNTER_API_KEY=...

# Email Sending
INSTANTLY_API_KEY=...`}
            </pre>
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-medium mb-4">Account Settings</h3>
          <p className="text-gray-600">Account settings will be available once authentication is configured.</p>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-medium mb-4">Billing</h3>
          <p className="text-gray-600">Billing integration with Stripe will be configured in Week 4.</p>
        </div>
      )}
    </div>
  );
}
