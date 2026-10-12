import React, { useEffect, useState } from 'react';
import { getBudgetPlan, saveGoogleAdsCampaign } from '~/lib/actions/budget';
import { useSearchParams } from 'next/navigation';
import { Input, Button, Badge, ConfirmationDialog } from '~/components/ui';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { sendAgentMessage } from '~/lib/actions/agentChat';

export function WorkspaceBudgetMarketResultView({ workspaceId, marketId }: { workspaceId: string, marketId: string }) {
  const searchParams = useSearchParams();
  const successParam = searchParams?.get('success');
  const [results, setResults] = useState<any>({});
  const [setupMode, setSetupMode] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isFillingAI, setIsFillingAI] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State for Google Ads Campaign Setup (Starts blank until user or AI fills it)
  const [campaignName, setCampaignName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sitePage, setSitePage] = useState('');
  const [adLanguage, setAdLanguage] = useState('English');
  const [sitelinks, setSitelinks] = useState<string[]>([]);
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [descriptions, setDescriptions] = useState<string[]>([]);

  // Media file states
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedLogos, setUploadedLogos] = useState<string[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);

  // Step 2 & 3 state
  const [budgetOption, setBudgetOption] = useState<'preset' | 'custom'>('preset');
  const [dailyBudget, setDailyBudget] = useState<string>('50');
  const [planAmount, setPlanAmount] = useState<number | null>(null);

  // Step 3 Targeting & Payment State
  const [targetLocations, setTargetLocations] = useState<string>('United States, Worldwide');
  const [biddingStrategy, setBiddingStrategy] = useState<string>('Maximize Conversions');
  const [conversionTracking, setConversionTracking] = useState<boolean>(true);

  // Payment Modal & PayPal Client ID State
  const [paymentMethod, setPaymentMethod] = useState<'connected_google' | 'paypal'>('connected_google');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paypalClientIdInput, setPaypalClientIdInput] = useState(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '');
  const [paypalConnected, setPaypalConnected] = useState(false);

  // Inline Editing Inputs for Assets
  const [newSitelinkText, setNewSitelinkText] = useState('');
  const [newHeadlineText, setNewHeadlineText] = useState('');
  const [newDescriptionText, setNewDescriptionText] = useState('');


  useEffect(() => {
    if (workspaceId) {
      aiSidebarStore.currentWorkspaceId.set(workspaceId);
    }

    async function loadData() {
      const plan = await getBudgetPlan(marketId);
      if (plan) {
        if (plan.amount) {
          setPlanAmount(plan.amount);
          const computedDaily = (plan.amount / 30).toFixed(2);
          setDailyBudget(computedDaily);
        }
        if (plan.results) {
          const res = plan.results as any;
          setResults(res);
          if (res.googleAdsCampaign) {
            const saved = res.googleAdsCampaign;
            if (saved.campaignName) setCampaignName(saved.campaignName);
            if (saved.businessName) setBusinessName(saved.businessName);
            if (saved.phoneNumber) setPhoneNumber(saved.phoneNumber);
            if (saved.dailyBudget) setDailyBudget(saved.dailyBudget);
            if (saved.uploadedImages) setUploadedImages(saved.uploadedImages);
            if (saved.uploadedLogos) setUploadedLogos(saved.uploadedLogos);
            if (saved.uploadedVideos) setUploadedVideos(saved.uploadedVideos);
          }
        }
      }
    }
    loadData();

    const handleAiFillEvent = (e: any) => {
      const data = e.detail;
      if (!data) return;
      if (data.campaignName) setCampaignName(data.campaignName);
      if (data.businessName) setBusinessName(data.businessName);
      if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
      if (data.sitePage) setSitePage(data.sitePage);
      if (data.adLanguage) setAdLanguage(data.adLanguage);
      if (Array.isArray(data.sitelinks)) setSitelinks(data.sitelinks);
      if (Array.isArray(data.headlines)) setHeadlines(data.headlines);
      if (Array.isArray(data.descriptions)) setDescriptions(data.descriptions);
      if (data.dailyBudget) setDailyBudget(data.dailyBudget);
      if (data.targetLocations) setTargetLocations(data.targetLocations);
      if (data.biddingStrategy) setBiddingStrategy(data.biddingStrategy);
      setSetupMode(true);
    };

    window.addEventListener('google_ads_fill', handleAiFillEvent);
    return () => window.removeEventListener('google_ads_fill', handleAiFillEvent);
  }, [marketId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'logo' | 'video') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newUrls = Array.from(files).map(f => URL.createObjectURL(f));
    if (type === 'image') setUploadedImages(prev => [...prev, ...newUrls].slice(0, 20));
    if (type === 'logo') setUploadedLogos(prev => [...prev, ...newUrls].slice(0, 5));
    if (type === 'video') setUploadedVideos(prev => [...prev, ...newUrls].slice(0, 5));
  };


  const handleFinalLaunch = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const campaignPayload = {
      campaignName,
      businessName,
      phoneNumber,
      sitePage,
      adLanguage,
      sitelinks,
      headlines,
      descriptions,
      dailyBudget,
      paymentMethod,
      uploadedImages,
      uploadedLogos,
      uploadedVideos,
      marketId,
      workspaceId,
      createdAt: new Date().toISOString()
    };


    const res = await saveGoogleAdsCampaign(marketId, campaignPayload);
    setIsSaving(false);

    if (res.success) {
      setSuccessMessage('Campaign successfully published to Google Ads & saved to database!');
      setSetupMode(false);
    } else {
      setErrorMessage(res.error || 'Failed to create campaign in Google Ads. Please check credentials.');
    }
  };

  const setupId = `SET-${marketId.slice(0, 8).toUpperCase()}`;

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-8">
      <div className="max-w-6xl mx-auto w-full pb-20 mt-6">
        <div className="mb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-gray-300 p-5 rounded-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[#0099ff]/20 text-[#0099ff] flex items-center justify-center font-bold">
                <i className="i-ph:google-logo-bold text-xl" />
              </div>
              <div>
                <div className="font-bold text-gray-900 dark:text-white text-base">Google Ads Integration</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Connected & ready to launch campaigns directly inside this Market ID</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSetupMode(true);
                  if (workspaceId) {
                    aiSidebarStore.currentWorkspaceId.set(workspaceId);
                  }

                  if (results) {
                    setCampaignName(results.campaignName || `${results.businessName || 'Product'} Search Campaign`);
                    setBusinessName(results.businessName || 'Falbor Business');
                    if (results.phoneNumber) setPhoneNumber(results.phoneNumber);
                    if (results.sitePage) setSitePage(results.sitePage);
                    if (Array.isArray(results.sitelinks) && results.sitelinks.length > 0) setSitelinks(results.sitelinks);
                    else setSitelinks(['Free Trial', 'Features', 'Pricing', 'Contact Us']);
                    if (Array.isArray(results.headlines) && results.headlines.length > 0) setHeadlines(results.headlines);
                    else setHeadlines(['AI Powered Platform', 'Boost Conversion Rates', 'Automate Growth']);
                    if (Array.isArray(results.descriptions) && results.descriptions.length > 0) setDescriptions(results.descriptions);
                    else setDescriptions(['Optimize campaign targeting and scale ROI effortlessly.', 'Join thousands of businesses using automated marketing algorithms.']);
                  }

                  aiSidebarStore.open();
                  sendAgentMessage(
                    `Fill out the Google Ads for me for Market ID ${marketId}. Use product details, headlines, descriptions, sitelinks, and business info to configure the Google Ads setup.`
                  );
                }}
                disabled={isFillingAI}
                className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-md transition-all flex items-center gap-2 text-sm font-medium"
              >
                <i className="i-ph:sparkle-bold" />
                <span>Fill with AI</span>
              </button>
            </div>
          </div>
        </div>
        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <i className="i-ph:warning-circle-fill text-lg" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-xs font-semibold hover:underline">Dismiss</button>
          </div>
        )}

        {/* Global Success Banner */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <i className="i-ph:check-circle-fill text-lg" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-xs font-semibold hover:underline">Dismiss</button>
          </div>
        )}

        {/* Standard Market Result Mode */}
        {!setupMode ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <div className="bg-white dark:bg-[#111114] p-6 rounded-md border border-gray-300 dark:border-gray-800/80">
                <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm font-medium">
                  <i className="i-ph:users-three" /> Est. Reach
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {typeof results.estReach === 'object' ? JSON.stringify(results.estReach).replace(/["{}]/g, ' ') : (results.estReach || 'Calculating...')}
                </div>
                <div className="text-xs text-green-500 font-medium mt-1">+ Impressions across all channels</div>
              </div>
              <div className="bg-white dark:bg-[#111114] p-6 rounded-md border border-gray-300 dark:border-gray-800/80">
                <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm font-medium">
                  <i className="i-ph:money" /> Est. Cost Per Click
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {typeof results.costPerClick === 'object' ? JSON.stringify(results.costPerClick).replace(/["{}]/g, ' ') : (results.costPerClick || 'Analyzing...')}
                </div>
                <div className="text-xs text-gray-400 mt-1">Averaged across selected platforms</div>
              </div>
              <div className="bg-white dark:bg-[#111114] p-6 rounded-md border border-gray-300 dark:border-gray-800/80">
                <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm font-medium">
                  <i className="i-ph:target" /> Recommended Channels
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white truncate">
                  {Array.isArray(results.recommendedChannels)
                    ? results.recommendedChannels.join(', ')
                    : (typeof results.recommendedChannels === 'object'
                      ? Object.keys(results.recommendedChannels).join(', ')
                      : (results.recommendedChannels || 'Scouting Platforms...'))}
                </div>
                <div className="text-xs text-blue-500 mt-1">Selected by AI for best ROI</div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111114] p-8 rounded-md border border-gray-300 dark:border-gray-800/80">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <i className="i-ph:file-text-duotone text-blue-500" />
                Comprehensive Breakdown
              </h2>
              <div className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                {results.comprehensiveBreakdown ? (
                  <div>
                    {typeof results.comprehensiveBreakdown === 'object' ? JSON.stringify(results.comprehensiveBreakdown, null, 2) : results.comprehensiveBreakdown}
                  </div>
                ) : (
                  <p className="italic text-gray-400">
                    The AI Agent is finalizing your strategy. You can proceed with Google Ads setup below.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          /* 3-Step Google Ads Setup Workflow Mode */
          <div className="bg-white dark:bg-[#111114] p-8 rounded-2xl border border-gray-200 dark:border-gray-800/80 shadow-sm">

            {/* Step Wizard Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-6 mb-8">
              {[
                { step: 1, title: '1. Review assets' },
                { step: 2, title: '2. Set daily budget' },
                { step: 3, title: '3. Targeting & tracking' },
              ].map((s) => {
                const canNavigate = s.step === 1 || (s.step === 2 && campaignName.trim()) || (s.step === 3 && campaignName.trim() && parseFloat(dailyBudget) > 0);
                return (
                  <button
                    key={s.step}
                    disabled={!canNavigate}
                    onClick={() => {
                      if (!campaignName.trim()) {
                        setErrorMessage('Please enter a Campaign name in Step 1 before proceeding.');
                        return;
                      }
                      if (s.step === 3 && (!dailyBudget || parseFloat(dailyBudget) <= 0)) {
                        setErrorMessage('Please set a valid daily budget in Step 2 before proceeding.');
                        return;
                      }
                      setErrorMessage(null);
                      setActiveStep(s.step as any);
                    }}
                    className={`flex items-center gap-2 text-sm font-semibold pb-2 border-b-2 transition-all ${activeStep === s.step
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : canNavigate
                        ? 'border-transparent text-gray-700 dark:text-gray-300 hover:text-blue-500'
                        : 'border-transparent text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      }`}
                  >
                    <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${activeStep === s.step ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      }`}>
                      {s.step}
                    </span>
                    <span>{s.title}</span>
                  </button>
                );
              })}
            </div>

            {/* STEP 1: Review assets */}
            {activeStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <i className="i-ph:paint-brush-broad-duotone text-blue-500" />
                  Campaign & Asset Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Campaign name <span className="text-red-500">*</span></label>
                    <Input
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g. Search Campaign"
                      className="rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Business name</label>
                      <span className="text-[10px] text-gray-400">17/25</span>
                    </div>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      maxLength={25}
                      placeholder="Your Business Name"
                      className="rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone number</label>
                    <Input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (800) 000-0000"
                      className="rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Site page that your ad will lead to</label>
                    <Input
                      value={sitePage}
                      onChange={(e) => setSitePage(e.target.value)}
                      placeholder="Main page"
                      className="rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Ad language</label>
                    <select
                      value={adLanguage}
                      onChange={(e) => setAdLanguage(e.target.value)}
                      className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-lg p-2.5 text-sm"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Hebrew">Hebrew</option>
                    </select>
                  </div>
                </div>

                {/* Sitelinks */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Sitelinks</label>
                    <button
                      onClick={() => setSitelinks([...sitelinks, 'New Sitelink'])}
                      className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                    >
                      <i className="i-ph:plus-bold" /> Add sitelink
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sitelinks.map((link, idx) => (
                      <span key={idx} className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-lg text-xs flex items-center gap-2 border border-gray-200 dark:border-gray-700">
                        <input
                          type="text"
                          value={link}
                          onChange={(e) => {
                            const updated = [...sitelinks];
                            updated[idx] = e.target.value;
                            setSitelinks(updated);
                          }}
                          className="bg-transparent focus:outline-none border-b border-transparent focus:border-blue-500 text-xs w-auto"
                        />
                        <button onClick={() => setSitelinks(sitelinks.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Headlines & Descriptions - Fully Editable */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Short headlines</span>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/10 text-blue-600 font-mono text-[10px]">{headlines.length}/15</Badge>
                        <button
                          onClick={() => setHeadlines([...headlines, 'New Headline'])}
                          className="text-[11px] text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {headlines.map((h, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            value={h}
                            onChange={(e) => {
                              const updated = [...headlines];
                              updated[i] = e.target.value;
                              setHeadlines(updated);
                            }}
                            className="text-xs rounded p-1 h-7 flex-1"
                          />
                          <button onClick={() => setHeadlines(headlines.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 text-xs font-bold">×</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Descriptions</span>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/10 text-blue-600 font-mono text-[10px]">{descriptions.length}/5</Badge>
                        <button
                          onClick={() => setDescriptions([...descriptions, 'New description for campaign target audience.'])}
                          className="text-[11px] text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {descriptions.map((d, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <textarea
                            value={d}
                            onChange={(e) => {
                              const updated = [...descriptions];
                              updated[i] = e.target.value;
                              setDescriptions(updated);
                            }}
                            className="text-xs rounded p-1.5 flex-1 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 resize-none h-12"
                          />
                          <button onClick={() => setDescriptions(descriptions.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 text-xs font-bold mt-1">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Media upload inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111114]">
                    <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                      <span>Images</span>
                      <span className="font-mono text-blue-500">{uploadedImages.length}/20</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">Read image guidelines</p>
                    <label className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer">
                      + Add / Upload Images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'image')}
                      />
                    </label>
                    {uploadedImages.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {uploadedImages.map((src, i) => (
                          <img key={i} src={src} className="w-8 h-8 object-cover rounded border" alt="Uploaded" />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111114]">
                    <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                      <span>Logo</span>
                      <span className="font-mono text-blue-500">{uploadedLogos.length}/5</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">Read logo guidelines</p>
                    <label className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer">
                      + Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                      />
                    </label>
                    {uploadedLogos.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {uploadedLogos.map((src, i) => (
                          <img key={i} src={src} className="w-8 h-8 object-cover rounded border" alt="Uploaded Logo" />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111114]">
                    <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                      <span>Video</span>
                      <span className="font-mono text-blue-500">{uploadedVideos.length}/5</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">Optional video assets</p>
                    <label className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer">
                      + Upload Video
                      <input
                        type="file"
                        accept="video/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'video')}
                      />
                    </label>
                    {uploadedVideos.length > 0 && (
                      <div className="text-[10px] text-green-500 mt-2 font-medium">
                        {uploadedVideos.length} Video file(s) attached
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      if (!campaignName.trim()) {
                        setErrorMessage('Please enter a Campaign name before proceeding.');
                        return;
                      }
                      setErrorMessage(null);
                      setActiveStep(2);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all shadow-md"
                  >
                    <span>Next: Set daily budget</span>
                    <i className="i-ph:arrow-right-bold" />
                  </button>
                </div>
              </div>
            )}
            {activeStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <i className="i-ph:currency-dollar-duotone text-green-500" />
                  Set Daily Budget
                </h2>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Select Budget Option</label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => {
                        setBudgetOption('preset');
                        if (planAmount) {
                          setDailyBudget((planAmount / 30).toFixed(2));
                        }
                      }}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all ${budgetOption === 'preset'
                        ? 'border-blue-600 bg-blue-500/5 dark:bg-blue-500/10'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-base text-gray-900 dark:text-gray-100">Pre-set Recommendation</span>
                        {budgetOption === 'preset' && <i className="i-ph:check-circle-fill text-blue-600 text-lg" />}
                      </div>
                      <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mb-1">
                        ${planAmount ? (planAmount / 30).toFixed(2) : dailyBudget} / day
                      </div>
                      <p className="text-xs text-gray-500">Calculated directly from your total allocated budget (${planAmount || 1500} / 30 days).</p>
                    </div>

                    <div
                      onClick={() => setBudgetOption('custom')}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all ${budgetOption === 'custom'
                        ? 'border-blue-600 bg-blue-500/5 dark:bg-blue-500/10'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-base text-gray-900 dark:text-gray-100">Custom Daily Budget</span>
                        {budgetOption === 'custom' && <i className="i-ph:check-circle-fill text-blue-600 text-lg" />}
                      </div>
                      <div className="mt-2">
                        <Input
                          type="number"
                          value={dailyBudget}
                          onChange={(e) => setDailyBudget(e.target.value)}
                          placeholder="Enter daily amount"
                          className="rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => setActiveStep(1)}
                    className="text-xs font-semibold px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300"
                  >
                    ← Back to Review Assets
                  </button>
                  <button
                    onClick={() => {
                      if (!dailyBudget || parseFloat(dailyBudget) <= 0) {
                        setErrorMessage('Please specify a valid daily budget greater than $0.');
                        return;
                      }
                      setErrorMessage(null);
                      setActiveStep(3);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all shadow-md"
                  >
                    <span>Next: Targeting & tracking</span>
                    <i className="i-ph:arrow-right-bold" />
                  </button>
                </div>
              </div>
            )}
            {activeStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <i className="i-ph:crosshair-duotone text-purple-500" />
                  Targeting & Tracking Setup
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Editable Location & Targeting */}
                  <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111114]">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <i className="i-ph:globe-duotone text-blue-500" /> Location & Audience Targeting
                    </h3>
                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="block text-gray-500 mb-1">Target Locations:</label>
                        <Input
                          value={targetLocations}
                          onChange={(e) => setTargetLocations(e.target.value)}
                          className="rounded-lg text-xs"
                          placeholder="e.g. United States, Worldwide"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-500 mb-1">Bidding Strategy:</label>
                        <select
                          value={biddingStrategy}
                          onChange={(e) => setBiddingStrategy(e.target.value)}
                          className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-xs"
                        >
                          <option value="Maximize Conversions">Maximize Conversions</option>
                          <option value="Maximize Clicks">Maximize Clicks</option>
                          <option value="Target CPA">Target CPA</option>
                          <option value="Target ROAS">Target ROAS</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-gray-500">Conversion Tracking:</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={conversionTracking}
                            onChange={(e) => setConversionTracking(e.target.checked)}
                            className="rounded text-blue-600"
                          />
                          <span className="font-medium text-green-600 dark:text-green-400">Google Tag Active</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Integration (Google Profile vs PayPal Client ID) */}
                  <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111114]">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <i className="i-ph:credit-card-duotone text-green-500" /> Payment Method Integration
                    </h3>
                    <div className="space-y-3">
                      <label
                        onClick={() => setPaymentMethod('connected_google')}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-xs ${paymentMethod === 'connected_google'
                          ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-300 font-semibold'
                          : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'
                          }`}
                      >
                        <i className="i-ph:check-circle-fill text-lg" />
                        <div>
                          <div>Connected Google Ads Account Billing</div>
                          <div className="text-[10px] font-normal text-gray-400">Charges existing Google Ads payment profile</div>
                        </div>
                      </label>

                      <div
                        onClick={() => {
                          setPaymentMethod('paypal');
                          setShowPaymentModal(true);
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs ${paymentMethod === 'paypal'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <i className="i-ph:paypal-logo-bold text-lg text-blue-500" />
                          <div>
                            <div>PayPal Account Payment</div>
                            <div className="text-[10px] font-normal text-gray-400">
                              {paypalConnected ? 'Connected via PayPal Secure Gateway' : 'Click to connect PayPal account'}
                            </div>
                          </div>
                        </div>
                        <button className="text-[11px] bg-blue-600 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-blue-700">
                          {paypalConnected ? 'Connected' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => setActiveStep(2)}
                    className="text-xs font-semibold px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300"
                  >
                    ← Back to Budget
                  </button>

                  <button
                    onClick={handleFinalLaunch}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg"
                  >
                    {isSaving ? (
                      <>
                        <i className="i-ph:spinner animate-spin text-lg" />
                        <span>Publishing to Google Ads...</span>
                      </>
                    ) : (
                      <>
                        <i className="i-ph:rocket-launch-bold text-lg" />
                        <span>Launch & Save Google Ads Campaign</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PayPal Connection Confirmation Dialog using existing UI component */}
        <ConfirmationDialog
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={() => {
            setPaypalConnected(true);
            setPaymentMethod('paypal');
            setShowPaymentModal(false);
          }}
          title="Connect PayPal Account"
          description="Do you want to connect your PayPal account for campaign billing using the configured PayPal Client ID?"
          confirmLabel="Connect PayPal"
          cancelLabel="Cancel"
        />
      </div>
    </div>
  );
}


