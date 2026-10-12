'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClientSidebar } from '~/components/sidebar/ClientSidebar';
import { createAgent, updateAgent, getAgentById } from '~/lib/actions/agent';
import { classNames } from '~/utils/classNames';
import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';
import { toast } from 'react-toastify';

const PREDEFINED_ROLES = [
  { label: 'Research Agent', value: 'Researcher' },
  { label: 'Marketing Agent', value: 'Marketing Opportunity Finder' },
  { label: 'Sales Agent', value: 'Lead Finder' },
  { label: 'Coding Agent', value: 'Bug Fixer' },
  { label: 'Analyst Agent', value: 'Results Analyst' },
  { label: 'Chief of Staff', value: 'Task Delegator' },
];

const AVAILABLE_TOOLS = ['Web Search Browser', 'MCP'];
const AVAILABLE_PERMISSIONS = ['Read Files', 'Write Files', 'Execute Code', 'Send Messages'];

export default function CreateAgentPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={null}>
      <CreateAgentForm params={params} />
    </Suspense>
  );
}

function CreateAgentForm({ params }: { params: { id: string } }) {

  const router = useRouter();
  const searchParams = useSearchParams();
  const editAgentId = searchParams.get('editAgent');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingAgent, setFetchingAgent] = useState(!!editAgentId);
  
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    customRole: '',
    goal: '',
    instructions: '',
    memory: '',
    knowledge: '',
    model: 'gpt-5-6',
    avatarUrl: ''
  });

  const [selectedTools, setSelectedTools] = useState<string[]>(['Web Search Browser', 'MCP']);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['Read Files', 'Write Files']);
  
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!editAgentId) return;
    async function loadAgent() {
      try {
        const agent = await getAgentById(params.id, editAgentId!);
        if (agent) {
          const isPredefined = PREDEFINED_ROLES.some(r => r.value === agent.role);
          setIsCustomRole(!isPredefined && !!agent.role);
          setFormData({
            name: agent.name || '',
            role: isPredefined ? agent.role || '' : '',
            customRole: !isPredefined ? agent.role || '' : '',
            goal: agent.goal || '',
            instructions: agent.instructions || '',
            memory: agent.memory || '',
            knowledge: Array.isArray(agent.knowledge) ? (agent.knowledge as string[]).join(', ') : '',
            model: agent.model || 'gpt-5-6',
            avatarUrl: agent.avatarUrl || '',
          });
          if (agent.avatarUrl) setAvatarPreview(agent.avatarUrl);
          if (Array.isArray(agent.tools)) setSelectedTools(agent.tools as string[]);
          if (Array.isArray(agent.permissions)) setSelectedPermissions(agent.permissions as string[]);
        }
      } catch (err) {
        console.error('Failed to load agent for editing:', err);
      } finally {
        setFetchingAgent(false);
      }
    }
    loadAgent();
  }, [editAgentId, params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'Custom') {
      setIsCustomRole(true);
      setFormData({ ...formData, role: '' });
    } else {
      setIsCustomRole(false);
      setFormData({ ...formData, role: val });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarPreview(base64String);
        setFormData({ ...formData, avatarUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTool = (tool: string) => {
    setSelectedTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]);
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        role: isCustomRole ? formData.customRole : formData.role,
        tools: selectedTools,
        knowledge: formData.knowledge.split(',').map(k => k.trim()).filter(Boolean),
        permissions: selectedPermissions,
      };

      if (editAgentId) {
        const updated = await updateAgent(params.id, editAgentId, payload);
        if (updated) {
          toast.success("Agent successfully updated!");
          router.push(`/workspace/${params.id}/agent`);
        }
      } else {
        const res: any = await createAgent(params.id, payload);
        if (res?.error) {
          toast.error(res.error);
          if (res.requiresUpgrade) {
            router.push(`/workspace/${params.id}/upgrade`);
          }
        } else if (res?.agent) {
          toast.success("Agent successfully created!");
          router.push(`/workspace/${params.id}/agent`);
        }
      }
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error("Failed to save agent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-row h-screen w-full overflow-hidden bg-falbor-elements-background">
      <ClientSidebar />
      <div className="flex-1 p-4 h-full min-w-0 bg-[#f7f7f8] dark:bg-[#111114] overflow-hidden">
        <div className="flex flex-col h-full w-full relative rounded-md border border-gray-300 dark:border-gray-800/80 bg-white dark:bg-[#080808] overflow-y-auto custom-scrollbar">
          
          <div className="flex flex-col w-full p-8 max-w-3xl mx-auto mt-4 mb-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{editAgentId ? 'Edit Agent' : 'Create New Agent'}</h1>
                <p className="text-gray-500 mt-2">{editAgentId ? 'Update your agent settings and configuration.' : 'Configure a specialized agent to assist your workspace.'}</p>
              </div>
              <button onClick={() => router.push(`/workspace/${params.id}/agent`)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                Cancel
              </button>
            </div>


            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-4 p-6 bg-[#F9F9FA] dark:bg-[#1C1D21] border border-gray-100 dark:border-[#353538] rounded-xl">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">Basic Info</h2>
                
                <div className="flex gap-6 items-center">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-hidden group-hover:border-purple-500 transition-colors">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="i-ph:camera w-6 h-6 text-gray-400 group-hover:text-purple-500" />
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent Name *</label>
                    <input required type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Marketing Researcher" className="w-full bg-white dark:bg-[#080808] border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model Selection</label>
                  <div className="w-full">
                    <Dropdown
                      align="start"
                      className="w-[300px]"
                      trigger={
                        <button type="button" className="flex items-center justify-between w-full bg-white dark:bg-[#080808] border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="i-ph:brain text-lg text-purple-500" />
                            <span>{formData.model === 'gpt-5-6' ? 'GPT 5.6' : formData.model === 'claude-sonnet-4-5' ? 'Cloud Sonnet 4.5' : 'Cloud Haki 4.5'}</span>
                          </div>
                          <div className="i-ph:caret-down text-gray-400" />
                        </button>
                      }
                    >
                      <DropdownItem 
                        onSelect={() => setFormData({ ...formData, model: 'gpt-5-6' })} 
                        className={classNames("flex items-center justify-between w-full p-2 cursor-pointer", formData.model === 'gpt-5-6' && 'bg-gray-100 dark:bg-gray-800')}
                      >
                        <div className="flex items-center gap-2"><img src="/icons/OpenAI.svg" className="w-4 h-4" /><span>GPT 5.6</span></div>
                        {formData.model === 'gpt-5-6' && <div className="i-ph:check text-green-500 ml-auto" />}
                      </DropdownItem>
                      <DropdownItem 
                        onSelect={() => setFormData({ ...formData, model: 'claude-sonnet-4-5' })} 
                        className={classNames("flex items-center justify-between w-full p-2 cursor-pointer", formData.model === 'claude-sonnet-4-5' && 'bg-gray-100 dark:bg-gray-800')}
                      >
                        <div className="flex items-center gap-2"><img src="/icons/claude-color.svg" className="w-4 h-4" /><span>Cloud Sonnet 4.5</span></div>
                        {formData.model === 'claude-sonnet-4-5' && <div className="i-ph:check text-green-500 ml-auto" />}
                      </DropdownItem>
                      <DropdownItem 
                        onSelect={() => setFormData({ ...formData, model: 'claude-haiku-4-5' })} 
                        className={classNames("flex items-center justify-between w-full p-2 cursor-pointer", formData.model === 'claude-haiku-4-5' && 'bg-gray-100 dark:bg-gray-800')}
                      >
                        <div className="flex items-center gap-2"><img src="/icons/claude-color.svg" className="w-4 h-4" /><span>Cloud Haki 4.5</span></div>
                        {formData.model === 'claude-haiku-4-5' && <div className="i-ph:check text-green-500 ml-auto" />}
                      </DropdownItem>
                    </Dropdown>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6 bg-[#F9F9FA] dark:bg-[#1C1D21] border border-gray-100 dark:border-[#353538] rounded-xl">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">Behavior & Identity</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Predefined Role</label>
                    <select value={isCustomRole ? 'Custom' : formData.role} onChange={handleRoleChange} className="w-full bg-white dark:bg-[#080808] border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-500 outline-none">
                      <option value="">Select a role...</option>
                      {PREDEFINED_ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label} → {r.value}</option>
                      ))}
                      <option value="Custom">Custom Role</option>
                    </select>
                  </div>
                  {isCustomRole && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Role Description</label>
                      <input type="text" name="customRole" value={formData.customRole} onChange={handleChange} placeholder="Enter custom role..." className="w-full bg-white dark:bg-[#080808] border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-500 outline-none" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal</label>
                  <input type="text" name="goal" value={formData.goal} onChange={handleChange} placeholder="e.g. Find 20 relevant communities where we can reach target users" className="w-full bg-white dark:bg-[#080808] border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructions</label>
                  <textarea name="instructions" value={formData.instructions} onChange={handleChange} rows={4} placeholder="Specific guidelines on how it should operate, what to do, and what not to do." className="w-full bg-white dark:bg-[#080808] border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none"></textarea>
                </div>
              </div>

              <div className="space-y-4 p-6 bg-[#F9F9FA] dark:bg-[#1C1D21] border border-gray-100 dark:border-[#353538] rounded-xl">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">Capabilities</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tools (MCP & Browsing)</label>
                    <div className="w-full">
                      <Dropdown
                        align="start"
                        className="w-[300px]"
                        trigger={
                          <button type="button" className="flex items-center justify-between w-full bg-white dark:bg-[#080808] border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                            <span>{selectedTools.length > 0 ? `${selectedTools.length} tools selected` : 'Select Tools...'}</span>
                            <div className="i-ph:caret-down text-gray-400" />
                          </button>
                        }
                      >
                        {AVAILABLE_TOOLS.map(tool => (
                          <DropdownItem 
                            key={tool} 
                            onSelect={(e) => { e.preventDefault(); toggleTool(tool); }} 
                            className="flex items-center justify-between w-full p-2 cursor-pointer"
                          >
                            <span>{tool}</span>
                            {selectedTools.includes(tool) && <div className="i-ph:check text-purple-500 ml-auto" />}
                          </DropdownItem>
                        ))}
                      </Dropdown>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Permissions</label>
                    <div className="w-full">
                      <Dropdown
                        align="start"
                        className="w-[300px]"
                        trigger={
                          <button type="button" className="flex items-center justify-between w-full bg-white dark:bg-[#080808] border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                            <span>{selectedPermissions.length > 0 ? `${selectedPermissions.length} permissions selected` : 'Select Permissions...'}</span>
                            <div className="i-ph:caret-down text-gray-400" />
                          </button>
                        }
                      >
                        {AVAILABLE_PERMISSIONS.map(perm => (
                          <DropdownItem 
                            key={perm} 
                            onSelect={(e) => { e.preventDefault(); togglePermission(perm); }} 
                            className="flex items-center justify-between w-full p-2 cursor-pointer"
                          >
                            <span>{perm}</span>
                            {selectedPermissions.includes(perm) && <div className="i-ph:check text-purple-500 ml-auto" />}
                          </DropdownItem>
                        ))}
                      </Dropdown>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Knowledge (comma separated files/topics)</label>
                  <input type="text" name="knowledge" value={formData.knowledge} onChange={handleChange} placeholder="e.g. marketing_guidelines.pdf, user_personas" className="w-full bg-white dark:bg-[#080808] border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Memory</label>
                  <textarea name="memory" value={formData.memory} onChange={handleChange} rows={2} placeholder="Information the agent needs to remember for future tasks." className="w-full bg-white dark:bg-[#080808] border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none"></textarea>
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button 
                  type="submit" 
                  disabled={loading || !formData.name}
                  className="flex items-center gap-2 px-8 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (editAgentId ? 'Saving...' : 'Creating...') : (editAgentId ? 'Save Changes' : 'Create Agent')}
                  <div className="i-ph:arrow-right w-4 h-4" />
                </button>
              </div>

            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
