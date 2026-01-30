'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft, ArrowRight, Loader2, Target, MapPin, Users } from 'lucide-react';
import Link from 'next/link';

const steps = [
  { id: 1, name: 'Campaign Info', icon: Target },
  { id: 2, name: 'Target Location', icon: MapPin },
  { id: 3, name: 'Ideal Customer', icon: Users },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    business_type: '',
    target_location: '',
    search_radius_miles: 25,
    ideal_customer_profile: {
      industries: [] as string[],
      keywords: [] as string[],
    },
  });

  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/campaigns/${data.id}`);
    },
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    createCampaign.mutate(formData);
  };

  const canContinue = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.business_type;
      case 2:
        return formData.target_location;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Link */}
      <Link
        href="/dashboard/campaigns"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Campaigns
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Campaign</h1>
        <p className="text-gray-600">Set up a new lead generation campaign</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                currentStep === step.id
                  ? 'bg-violet-100 text-violet-700'
                  : currentStep > step.id
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <step.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{step.name}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 ${currentStep > step.id ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl border p-6">
        {/* Step 1: Campaign Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., SF Restaurants Q1 2026"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Business Type
              </label>
              <input
                type="text"
                value={formData.business_type}
                onChange={(e) => updateField('business_type', e.target.value)}
                placeholder="e.g., restaurants, dental clinics, law firms"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
              />
              <p className="text-sm text-gray-500 mt-1">
                This determines what types of businesses we'll find for you
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Target Location */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Location
              </label>
              <input
                type="text"
                value={formData.target_location}
                onChange={(e) => updateField('target_location', e.target.value)}
                placeholder="e.g., San Francisco, CA or 94102"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Radius: {formData.search_radius_miles} miles
              </label>
              <input
                type="range"
                min="5"
                max="100"
                value={formData.search_radius_miles}
                onChange={(e) => updateField('search_radius_miles', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5 mi</span>
                <span>50 mi</span>
                <span>100 mi</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Ideal Customer Profile */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keywords (optional)
              </label>
              <input
                type="text"
                placeholder="e.g., organic, fine dining, italian (comma separated)"
                onBlur={(e) => {
                  const keywords = e.target.value.split(',').map((k) => k.trim()).filter(Boolean);
                  updateField('ideal_customer_profile', {
                    ...formData.ideal_customer_profile,
                    keywords,
                  });
                }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
              />
              <p className="text-sm text-gray-500 mt-1">
                These keywords help us find better-matched prospects
              </p>
            </div>

            <div className="bg-violet-50 rounded-lg p-4">
              <h4 className="font-medium text-violet-900 mb-2">Campaign Summary</h4>
              <ul className="text-sm text-violet-700 space-y-1">
                <li>• Finding: <strong>{formData.business_type}</strong></li>
                <li>• Location: <strong>{formData.target_location}</strong></li>
                <li>• Radius: <strong>{formData.search_radius_miles} miles</strong></li>
                {formData.ideal_customer_profile.keywords.length > 0 && (
                  <li>• Keywords: <strong>{formData.ideal_customer_profile.keywords.join(', ')}</strong></li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <button
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canContinue()}
              className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createCampaign.isLoading}
              className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
            >
              {createCampaign.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Campaign
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

        {createCampaign.isError && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm">
            Error: {createCampaign.error.message}
          </div>
        )}
      </div>
    </div>
  );
}
