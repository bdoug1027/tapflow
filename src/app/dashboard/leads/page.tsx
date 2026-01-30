'use client';

import { trpc } from '@/lib/trpc/client';
import { Users, Search, Filter, ExternalLink, Mail, Phone } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function LeadsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('');
  
  const { data: campaigns } = trpc.campaigns.list.useQuery(undefined, { retry: false });
  
  const { data: leadsData, isLoading } = trpc.leads.list.useQuery(
    {
      campaign_id: selectedCampaign,
      tier: tierFilter as 'A' | 'B' | 'C' | undefined,
      page: 1,
      limit: 50,
    },
    { enabled: !!selectedCampaign, retry: false }
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">View and manage your discovered prospects</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
          >
            <option value="">Select a campaign</option>
            {campaigns?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
          >
            <option value="">All Tiers</option>
            <option value="A">A - Hot</option>
            <option value="B">B - Warm</option>
            <option value="C">C - Cold</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border">
        {!selectedCampaign ? (
          <div className="p-12 text-center">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Select a campaign to view leads</p>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading leads...</div>
        ) : leadsData?.prospects?.length ? (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leadsData.prospects.map((prospect: any) => {
                  const primaryContact = prospect.contacts?.find((c: any) => c.is_primary) || prospect.contacts?.[0];
                  const score = prospect.lead_scores;
                  
                  return (
                    <tr key={prospect.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{prospect.company_name}</p>
                          {prospect.website && (
                            <a
                              href={prospect.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-violet-600 hover:underline flex items-center gap-1"
                            >
                              {new URL(prospect.website).hostname}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {primaryContact ? (
                          <div>
                            <p className="text-sm font-medium">{primaryContact.name || 'Unknown'}</p>
                            {primaryContact.email && (
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {primaryContact.email}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No contact</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {score ? (
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              score.tier === 'A' ? 'bg-green-100 text-green-700' :
                              score.tier === 'B' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {score.tier}
                            </span>
                            <span className="text-sm text-gray-500">{score.score}/100</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not scored</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          prospect.status === 'replied' ? 'bg-green-100 text-green-700' :
                          prospect.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                          prospect.status === 'scored' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {prospect.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                        {prospect.source?.replace('_', ' ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t text-sm text-gray-500">
              Showing {leadsData.prospects.length} of {leadsData.total} leads
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No leads found for this campaign</p>
          </div>
        )}
      </div>
    </div>
  );
}
