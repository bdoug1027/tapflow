'use client';

import { trpc } from '@/lib/trpc/client';
import { Plus, Target, MoreVertical, Trash2, Pause, Play } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function CampaignsPage() {
  const { data: campaigns, isLoading, refetch } = trpc.campaigns.list.useQuery(
    undefined,
    { retry: false }
  );
  
  const updateCampaign = trpc.campaigns.update.useMutation({
    onSuccess: () => refetch(),
  });
  
  const deleteCampaign = trpc.campaigns.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const toggleStatus = (id: string, currentStatus: string) => {
    updateCampaign.mutate({
      id,
      status: currentStatus === 'active' ? 'paused' : 'active',
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      deleteCampaign.mutate({ id });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600">Manage your lead generation campaigns</p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-xl border">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : campaigns?.length ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Campaign</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Prospects</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {campaigns.map((campaign: any) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/campaigns/${campaign.id}`} className="hover:text-violet-600">
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-gray-500">{campaign.business_type}</p>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{campaign.target_location}</td>
                  <td className="px-6 py-4 text-gray-600">{campaign.prospects?.[0]?.count || 0}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : campaign.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === campaign.id ? null : campaign.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                    {menuOpen === campaign.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                        <button
                          onClick={() => {
                            toggleStatus(campaign.id, campaign.status);
                            setMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50"
                        >
                          {campaign.status === 'active' ? (
                            <>
                              <Pause className="w-4 h-4" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" /> Resume
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            handleDelete(campaign.id);
                            setMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-500 mb-4">Create your first campaign to start finding leads</p>
            <Link
              href="/dashboard/campaigns/new"
              className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
