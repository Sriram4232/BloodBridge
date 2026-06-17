import { useState, useEffect } from 'react';
import { API_URL } from '../context/AuthContext';
import aboutBg from '../assets/about.mp4';

function About() {
  const [stats, setStats] = useState({
    totalDonations: 14,
    totalDonors: 42,
    activeRequests: 5,
    criticalResolved: 8
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to load stats on About page:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="relative min-h-screen text-slate-200 flex flex-col items-center pt-28 pb-16 px-4 md:px-8">
      {/* Background Video */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
      >
        <source src={aboutBg} type="video/mp4" />
      </video>
      
      {/* Dark overlay for contrast */}
      <div className="fixed inset-0 bg-black/65 z-0"></div>

      {/* Main Glass Content Card */}
      <div className="relative z-10 max-w-4xl w-full p-8 md:p-12 backdrop-blur-xl bg-slate-950/60 border border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] space-y-8">
        
        {/* Header Section */}
        <div className="text-center border-b border-white/10 pb-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-red-400 via-rose-500 to-red-600 bg-clip-text text-transparent mb-4">
            About BloodBridge
          </h1>
          <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            BloodBridge is an integrated Blood Health & Supply Intelligence Platform designed to transform India's blood healthcare ecosystem from a fragmented, reactive system into a connected, intelligent, and life-saving network.
          </p>
        </div>

        {/* Live Platform Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl shadow-md backdrop-blur-md transition hover:border-red-500/30">
            <p className="text-3xl font-black text-red-500">{stats.totalDonations}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">Total Donations</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl shadow-md backdrop-blur-md transition hover:border-emerald-500/30">
            <p className="text-3xl font-black text-emerald-400">{stats.totalDonors}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">Registered Donors</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl shadow-md backdrop-blur-md transition hover:border-amber-500/30">
            <p className="text-3xl font-black text-amber-500">{stats.activeRequests}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">Active Demands</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl shadow-md backdrop-blur-md transition hover:border-rose-500/30">
            <p className="text-3xl font-black text-rose-500">{stats.criticalResolved}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">Critical Saved</p>
          </div>
        </div>

        {/* Mission statement callout */}
        <div className="p-5 bg-red-950/20 border-l-4 border-red-500 rounded-r-xl">
          <p className="text-sm font-medium text-red-200 uppercase tracking-wider mb-1">Our Mission</p>
          <p className="text-lg font-bold text-slate-100">
            "Ensure that no patient suffers due to the unavailability of blood and no blood unit goes to waste."
          </p>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed">
          The platform connects blood donors, patients, hospitals, blood banks, laboratories, healthcare workers, and emergency responders through a single digital ecosystem powered by Artificial Intelligence.
        </p>

        {/* Grid Sections: What We Do & Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* What We Do */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span className="text-red-500">⚙️</span> What We Do
            </h2>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {[
                "Provide real-time blood inventory visibility across hospitals and blood banks.",
                "Enable instant donor-recipient matching based on compatibility, location, and urgency.",
                "Support chronic patients with transfusion scheduling and continuity of care.",
                "Offer AI-assisted blood health monitoring and report interpretation.",
                "Predict future blood demand using data analytics and forecasting models.",
                "Optimize blood transportation and cold-chain logistics.",
                "Ensure trust through verified hospitals, donors, and emergency requests.",
                "Provide multilingual and low-bandwidth support for rural accessibility."
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Features */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span className="text-red-500">⭐</span> Key Features
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              {[
                { icon: "🩸", title: "Real-Time Inventory Tracking" },
                { icon: "🚑", title: "Emergency Request System" },
                { icon: "🤝", title: "Smart Donor Matching" },
                { icon: "❤️", title: "Chronic Disease Management" },
                { icon: "🧪", title: "Blood Health Monitoring" },
                { icon: "📈", title: "AI demand Forecasting" },
                { icon: "🚚", title: "Logistics & Cold Chain" },
                { icon: "🛡️", title: "Secure Verification" },
                { icon: "🌐", title: "Rural & Multilingual Support" }
              ].map((feat, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                  <span className="text-lg">{feat.icon}</span>
                  <span className="text-xs font-semibold text-slate-350">{feat.title}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Rewarding Our Heroes */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span className="text-red-500">🏆</span> Rewarding Our Heroes
          </h2>
          <p className="text-slate-400 text-xs">
            BloodLink AI encourages voluntary donations through a reward-based ecosystem:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: "🎁", text: "Reward points for emergency donations" },
              { icon: "🩺", text: "Free or discounted health checkups" },
              { icon: "👨‍⚕️", text: "Free digital doctor consultations" },
              { icon: "🏥", text: "Priority appointments in partner hospitals" },
              { icon: "🏅", text: "Bronze, Silver, Gold, and Emergency Hero badges" },
              { icon: "📜", text: "Digital certificates and leaderboards" }
            ].map((reward, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                <span className="text-lg">{reward.icon}</span>
                <span className="text-xs text-slate-350">{reward.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vision & Mission Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/10">
          <div>
            <h3 className="font-bold text-slate-100 text-sm mb-2">Our Vision</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              To build India's national digital backbone for blood health, creating a future where every blood unit is traceable, every emergency receives immediate support, and every citizen has equal access to life-saving blood services.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm mb-2">Our Values</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-bold italic">
              Connecting Donors. Empowering Hospitals. Supporting Patients. Saving Lives.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default About;
