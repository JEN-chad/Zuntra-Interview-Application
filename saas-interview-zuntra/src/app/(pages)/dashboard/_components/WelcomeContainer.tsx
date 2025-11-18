import { getSession } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/signout-button";
import { Sparkles, LayoutDashboard } from "lucide-react";

const WelcomeContainer = async () => {
  const session = await getSession();
  const user = session?.user;
  const firstLetter = user?.name?.[0].toUpperCase() || "U";
  const firstName = user?.name?.split(" ")[0] || "User";

  return (
    <div className="relative w-full md:w-[95%] mx-auto md:mr-3 overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Decorative Background Blobs */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 rounded-full bg-blue-50 blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 rounded-full bg-indigo-50 blur-3xl opacity-50 pointer-events-none"></div>

      <div className="relative flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6 z-10">
        {/* Left Section - Welcome Text */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
          
          {/* Small Badge */}
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium mb-1">
            <LayoutDashboard className="w-3 h-3 mr-1.5" />
            Recruiter Dashboard
          </div>

          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{firstName}</span>
          </h2>
          <p className="text-slate-500 text-sm md:text-base max-w-md">
            Manage your AI-driven interviews and track candidate progress all in one place.
          </p>
        </div>

        {/* Right Section - Profile Card */}
        <div className="flex items-center gap-4 bg-slate-50/80 backdrop-blur-sm p-2 pr-4 pl-3 rounded-xl border border-slate-200">
           {/* Avatar with Status Dot */}
           <div className="relative">
              <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-lg font-bold shadow-md shadow-blue-200/50">
                {firstLetter}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
              </span>
           </div>
           
           {/* User Details (Hidden on small screens for compactness) */}
           <div className="hidden sm:flex flex-col items-start mr-2">
              <span className="text-sm font-semibold text-slate-800 truncate max-w-[120px]">{user?.name}</span>
              <span className="text-xs text-slate-500 truncate max-w-[120px]">{user?.email}</span>
           </div>

           {/* Vertical Divider */}
           <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

           {/* Sign Out */}
           <div className="ml-1">
              <SignOutButton />
           </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeContainer;