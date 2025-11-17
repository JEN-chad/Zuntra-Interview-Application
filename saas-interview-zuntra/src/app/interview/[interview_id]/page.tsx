import { Building2, Clock, Video, Volume2 } from "lucide-react";
import Image from "next/image";

export default function InterviewUI() {
  return (
    <div className="h-screen flex justify-center items-center bg-gray-100 p-4 overflow-hidden">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-2xl p-6 border flex flex-row items-center gap-6">
        
        {/* LEFT SIDE – Logo + Illustration */}
        <div className="flex-1 flex flex-col justify-center items-center text-center p-4 border-r border-gray-200">
          <Image
            src="/logo.png"
            width={200}
            height={100}
            alt="Logo"
            className="w-[100px] mx-auto"
          />
          <p className="text-gray-500 text-sm mt-1">
            AI-Powered Interview Platform
          </p>

          <Image
            src="/interview.png"
            width={500}
            height={500}
            alt="Interview pic"
            className="w-[280px] mt-4"
          />
        </div>

        {/* RIGHT SIDE – Interview Details */}
        <div className="flex-1 p-6 flex flex-col justify-center">
          <h2 className="text-lg font-semibold">Full Stack Developer Interview</h2>

          <div className="flex items-center gap-4 text-gray-500 text-xs mt-2">
            <span>
              <Building2 className="inline w-3.5 h-3.5 mr-1" /> Google Inc.
            </span>
            <span>
              <Clock className="inline w-3.5 h-3.5 mr-1" /> 30 Minutes
            </span>
          </div>

          <div className="text-left mt-4">
            <label className="text-xs font-medium">Enter your full name</label>
            <input
              type="text"
              placeholder="e.g., John Smith"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 text-left text-xs">
            <p className="font-semibold text-blue-600 mb-1">Before you begin</p>
            <ul className="list-disc ml-4 space-y-1 text-gray-700">
              <li>Ensure you have a stable internet connection</li>
              <li>Test your camera and microphone</li>
              <li>Find a quiet place for the interview</li>
            </ul>
          </div>

          <button className="w-full bg-blue-600 text-white py-2.5 rounded-lg mt-5 font-medium hover:bg-blue-700 transition text-sm">
            <Video className="inline w-4 h-4 mr-1" /> Join Interview
          </button>

          <button className="w-full border py-2.5 rounded-lg mt-2 text-gray-700 hover:bg-gray-50 transition text-sm">
            <Volume2 className="inline w-4 h-4 mr-1" /> Test Audio & Video
          </button>
        </div>
      </div>
    </div>
  );
}
