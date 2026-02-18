import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { InputSection } from './components/InputSection';
import { OutputSection } from './components/OutputSection';
import { generateStrategyPack } from './services/geminiService';
import { ResearchResponse, FileData } from './types';
import { AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    if (!process.env.API_KEY) {
      setApiKeyMissing(true);
    }
  }, []);

  const handleGenerate = async (inputData: string, fileData?: FileData) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await generateStrategyPack(inputData, fileData);
      setResult(data);
    } catch (err: any) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (apiKeyMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center border-l-4 border-red-500">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Configuration Error</h1>
          <p className="text-gray-600">
            The <code>API_KEY</code> environment variable is missing. 
            Please configure your environment to include a valid Google Gemini API key.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl font-extrabold text-flow-charcoal tracking-tight sm:text-4xl mb-4">
            Market Research & <span className="text-flow-purple">Insights</span>
          </h1>
          <p className="text-lg text-gray-600">
            Turn onboarding reports into evidence-based research packs, competitor analysis, and campaign foundations.
            Powered by Gemini with Google Search.
          </p>
        </div>

        <InputSection onSubmit={handleGenerate} isLoading={loading} />

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Generation Failed</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {result && (
            <div className="animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-flow-charcoal">Research Foundation Pack</h2>
                    <span className="text-sm text-gray-500">Generated successfully</span>
                </div>
                <OutputSection data={result} />
            </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
