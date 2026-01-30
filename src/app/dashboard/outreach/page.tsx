'use client';

import { trpc } from '@/lib/trpc/client';
import { Mail, Check, X, Clock, Send, Eye } from 'lucide-react';
import { useState } from 'react';

export default function OutreachPage() {
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  
  const { data: pendingMessages, isLoading, refetch } = trpc.outreach.pendingApproval.useQuery(
    {},
    { retry: false }
  );
  
  const { data: stats } = trpc.outreach.stats.useQuery({}, { retry: false });
  
  const approveMutation = trpc.outreach.approve.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedMessage(null);
    },
  });
  
  const rejectMutation = trpc.outreach.reject.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedMessage(null);
    },
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate({ id });
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate({ id });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach</h1>
          <p className="text-gray-600">Review and approve AI-generated emails</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pending', value: stats?.pending_approval || 0, icon: Clock, color: 'yellow' },
          { label: 'Sent', value: stats?.sent || 0, icon: Send, color: 'blue' },
          { label: 'Opened', value: `${stats?.open_rate || 0}%`, icon: Eye, color: 'green' },
          { label: 'Replied', value: `${stats?.reply_rate || 0}%`, icon: Mail, color: 'violet' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Approval Queue */}
        <div className="bg-white rounded-xl border">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold">Approval Queue</h2>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : pendingMessages?.length ? (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {pendingMessages.map((message: any) => (
                <div
                  key={message.id}
                  onClick={() => setSelectedMessage(message)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                    selectedMessage?.id === message.id ? 'bg-violet-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {message.contact?.prospect?.company_name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        To: {message.contact?.email || 'No email'}
                      </p>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {message.subject}
                      </p>
                    </div>
                    {message.contact?.prospect?.lead_scores?.tier && (
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        message.contact.prospect.lead_scores.tier === 'A' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {message.contact.prospect.lead_scores.tier}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Check className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <p className="text-gray-600">All caught up! No pending emails.</p>
            </div>
          )}
        </div>

        {/* Message Preview */}
        <div className="bg-white rounded-xl border">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold">Message Preview</h2>
          </div>
          
          {selectedMessage ? (
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-500">To:</p>
                <p className="font-medium">{selectedMessage.contact?.email}</p>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500">Subject:</p>
                <p className="font-medium">{selectedMessage.subject}</p>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Body:</p>
                <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                  {selectedMessage.body}
                </div>
              </div>
              
              {selectedMessage.personalization_data?.notes && (
                <div className="mb-6 p-3 bg-violet-50 rounded-lg">
                  <p className="text-xs text-violet-600 font-medium mb-1">Personalization:</p>
                  <p className="text-sm text-violet-700">{selectedMessage.personalization_data.notes}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(selectedMessage.id)}
                  disabled={approveMutation.isLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Approve & Send
                </button>
                <button
                  onClick={() => handleReject(selectedMessage.id)}
                  disabled={rejectMutation.isLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Select a message to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
