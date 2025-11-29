"use client";

import { useState } from "react";
import { Loader2, FileUp, Download } from "lucide-react"; // Assuming you use lucide-react

export default function ConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Conversion failed");
      }

      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(".pdf", ".docx");
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err) {
      setError("Something went wrong. Please ensure the Python backend is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-md space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          PDF to Word Converter
        </h1>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center text-center hover:bg-gray-50 transition">
          <FileUp className="w-10 h-10 text-gray-400 mb-2" />
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          <p className="mt-2 text-xs text-gray-500">Only .pdf files supported</p>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          onClick={handleConvert}
          disabled={!file || loading}
          className={`w-full py-3 px-4 rounded-lg flex items-center justify-center text-white font-medium transition-colors
            ${!file || loading 
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-blue-600 hover:bg-blue-700 shadow-lg"
            }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Converting...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Convert to Word
            </>
          )}
        </button>
      </div>
    </div>
  );
}