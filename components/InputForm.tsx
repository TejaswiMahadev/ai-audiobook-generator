import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { processFile } from '../utils/fileProcessor';

interface InputFormProps {
  onGenerate: (text: string, image?: { data: string; mimeType: string }) => void;
  isLoading: boolean;
  initialText: string;
  setInitialText: (text: string) => void;
}

export const InputForm: React.FC<InputFormProps> = ({ onGenerate, isLoading, initialText, setInitialText }) => {
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: 'image' | 'text'; content: string; mimeType?: string; } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  
  const handleFileUpload = async (file: File) => {
    setFileError(null);
    try {
      const processed = await processFile(file);
      setUploadedFile(processed);
      if (processed.type === 'text') {
        setInitialText(processed.content);
      } else {
        // For images, clear text or add a default prompt.
        setInitialText("Describe this image and create a narration about it.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process file.';
      console.error(message);
      setFileError(message);
      setUploadedFile(null);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setInitialText('');
    setFileError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedFile?.type === 'image') {
      onGenerate(initialText, { data: uploadedFile.content, mimeType: uploadedFile.mimeType! });
    } else {
      onGenerate(initialText);
    }
  };

  const isTextFromImage = uploadedFile?.type === 'image';
  const canSubmit = !isLoading && (initialText.trim() || uploadedFile?.type === 'image');

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <label htmlFor="text-input" className="mb-2 text-lg font-semibold text-cyan-300">
        Your Content
      </label>
      <p className="text-sm text-gray-400 mb-4">
        {isTextFromImage ? "Edit the prompt for your image below, or" : "Paste your text, book chapter, a topic, or"} upload a file.
      </p>
      
      <FileUpload 
        onFileUpload={handleFileUpload} 
        isLoading={isLoading} 
        uploadedFileName={uploadedFile?.name || null}
        clearFile={clearFile}
      />
      
      {fileError && <div className="mt-2 text-red-400 text-sm">{fileError}</div>}

      <div className="relative mt-4">
        <textarea
          id="text-input"
          value={initialText}
          onChange={(e) => setInitialText(e.target.value)}
          placeholder={uploadedFile ? "Your file content is loaded." : "e.g., Explain the process of photosynthesis..."}
          className="flex-grow w-full p-4 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none transition duration-200 text-gray-200 min-h-[150px] sm:min-h-[200px] resize-y"
          disabled={isLoading || (uploadedFile?.type === 'text')}
        />
        {uploadedFile?.type === 'text' && (
          <div className="absolute inset-0 bg-slate-800/80 flex items-center justify-center text-center p-4 rounded-lg">
            <p className="text-slate-300">Content loaded from <strong>{uploadedFile.name}</strong>.<br />Clear the file to edit manually.</p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-6 w-full flex justify-center items-center gap-3 px-6 py-4 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-600/20"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          'Generate Narration'
        )}
      </button>
    </form>
  );
};