import React from 'react';

interface ZipUploadTabProps {
  uploadFile: File | null;
  setUploadFile: (file: File | null) => void;
}

export function ZipUploadTab({ uploadFile, setUploadFile }: ZipUploadTabProps) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1C1D21] flex items-center justify-center text-gray-600 dark:text-gray-400">
          <div className="i-ph:file-zip text-2xl" />
        </div>
        <div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">Upload Code / ZIP</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Upload your local codebase directly</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-16 px-8 border-2 border-dashed border-gray-300 dark:border-[#353538] hover:border-[#0099ff] dark:hover:border-[#0099ff] transition-colors rounded-xl bg-gray-50 dark:bg-[#1C1D21]/50 cursor-pointer relative group">
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".zip"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              setUploadFile(e.target.files[0]);
            }
          }}
        />
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-[#353538] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <div className="i-ph:upload-simple text-2xl text-gray-600 dark:text-gray-300" />
        </div>
        <p className="text-gray-900 dark:text-white font-medium mb-1">
          {uploadFile ? uploadFile.name : 'Click or drag ZIP file here'}
        </p>
        <p className="text-sm text-gray-500">
          Maximum file size: 50MB
        </p>
      </div>
    </div>
  );
}
