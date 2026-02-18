import React, { useState, useRef } from 'react';
import { Upload, FileText, Sparkles, X, Paperclip } from 'lucide-react';

interface InputSectionProps {
  onSubmit: (text: string, fileData?: { mimeType: string; data: string }) => void;
  isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ onSubmit, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ mimeType: string; data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    // Check for text-based files
    const textTypes = ['application/json', 'text/plain', 'text/markdown', 'text/x-markdown'];
    const textExtensions = ['.json', '.txt', '.md'];
    const isTextType = textTypes.includes(file.type);
    const isTextExt = textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (isTextType || isTextExt) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setInputText(text);
        setAttachment(null); // Clear binary attachment as we are using text input
      };
      reader.readAsText(file);
    } else {
      // Handle PDF and Images as binary attachments
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Extract base64 data (remove "data:mime/type;base64," prefix)
        const base64Data = result.split(',')[1];
        setAttachment({
          mimeType: file.type,
          data: base64Data
        });
        // We do NOT overwrite inputText here, allowing mixed context (text + file)
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setFileName(null);
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Note: We don't clear inputText here as user might have edited it after upload
    // or if it was a binary upload, the text might be separate instructions.
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() || attachment) {
      onSubmit(inputText, attachment || undefined);
    }
  };

  const hasContent = inputText.trim().length > 0 || attachment !== null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8 transition-all duration-200 hover:shadow-md">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-flow-charcoal mb-1">Client Onboarding Data</h2>
        <p className="text-sm text-gray-500">Paste the report text or upload a file (JSON, PDF, Image) to generate the strategy pack.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            className="w-full h-48 p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-flow-purple focus:border-transparent resize-y font-mono text-sm bg-white text-gray-900 placeholder-gray-400"
            placeholder={fileName ? "Add any additional context or instructions here..." : '{ "client_name": "Acme Corp", "goals": [...] }'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
          />
          {fileName && (
             <div className="absolute top-2 right-2 flex items-center bg-flow-purple text-white text-xs px-2 py-1 rounded shadow-sm z-10">
                {attachment ? <Paperclip className="w-3 h-3 mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
                <span className="max-w-[150px] truncate" title={fileName}>{fileName}</span>
                <button 
                    type="button" 
                    onClick={clearFile}
                    className="ml-2 hover:bg-white/20 rounded p-0.5"
                >
                    <X className="w-3 h-3" />
                </button>
             </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".json,.txt,.md,.pdf,image/*"
              onChange={handleFileUpload}
              className="hidden"
              ref={fileInputRef}
              id="file-upload"
              disabled={isLoading}
            />
            <label
              htmlFor="file-upload"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 cursor-pointer transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload className="w-4 h-4" />
              Upload File
            </label>
            <span className="text-xs text-gray-400">Supported: PDF, Images, JSON, TXT</span>
          </div>

          <button
            type="submit"
            disabled={!hasContent || isLoading}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 text-white font-semibold rounded-md transition-all duration-200 shadow-sm
              ${
                !hasContent || isLoading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-flow-purple hover:bg-[#4a4485] hover:shadow-md active:transform active:scale-95'
              }`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-flow-yellow" />
                Generate Strategy Pack
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
