'use client';
import { useState } from 'react';
import stayup from 'falbor-stayup-sdk';

export default function Home() {
  const [projectId, setProjectId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [initialized, setInitialized] = useState(false);

  const initStayUp = () => {
    if (!projectId || !apiKey) {
      alert('Please enter Project ID and API Key');
      return;
    }
    stayup.init({
      projectId,
      apiKey,
      environment: 'development',
      endpoint: 'http://localhost:3000/api/stayup/ingest'
    });
    setInitialized(true);
    alert('SDK Initialized!');
  };

  const triggerError = () => {
    if (!initialized) {
      alert('Please initialize the SDK first.');
      return;
    }
    const user = null;
    // @ts-ignore
    console.log(user.profile.name); // This will crash
  };

  const throwError = () => {
    if (!initialized) {
      alert('Please initialize the SDK first.');
      return;
    }
    throw new Error('This is a manual throw error from the test site');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center text-black">Test StayUp SDK Integration</h1>
        
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto w-full border border-gray-200">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Project ID</label>
            <input 
              type="text" 
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={initialized}
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">API Key</label>
            <input 
              type="text" 
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={initialized}
            />
          </div>
          
          <button 
            onClick={initStayUp}
            disabled={initialized}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full mb-6 disabled:opacity-50"
          >
            {initialized ? 'Initialized ✅' : 'Initialize SDK'}
          </button>

          <div className="border-t pt-6 flex flex-col gap-4">
            <button 
              onClick={triggerError}
              disabled={!initialized}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:opacity-50"
            >
              Trigger TypeError (Cannot read properties of null)
            </button>
            <button 
              onClick={throwError}
              disabled={!initialized}
              className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:opacity-50"
            >
              Throw new Error()
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
