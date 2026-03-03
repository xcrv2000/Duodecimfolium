import React, { useState } from 'react';
import { Trash2, RefreshCw } from 'lucide-react';

const SettingsView: React.FC = () => {
  const [confirmText, setConfirmText] = useState('');
  
  // Hard reset should clear localStorage.

  const handleHardReset = () => {
    // Double check logic just in case, though button should be disabled
    if (confirmText === 'Duodecimfolium') {
      // Clear all local storage
      localStorage.clear();
      // Reload page
      window.location.reload();
    }
  };

  const isConfirmValid = confirmText === 'Duodecimfolium';

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-emerald-400">Settings</h1>
      
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h2 className="text-xl font-bold mb-4 text-red-400 flex items-center gap-2">
            <Trash2 /> Danger Zone
        </h2>
        
        <p className="text-slate-400 mb-4">
            If you encounter bugs or want to start over completely, this will wipe all save data.
        </p>
        
        <p className="text-slate-500 text-sm mb-4">
            Please type <span className="font-mono text-emerald-400 font-bold select-all">Duodecimfolium</span> below to confirm.
        </p>

        <input 
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type 'Duodecimfolium'"
            className="w-full bg-slate-900 border border-slate-700 rounded p-3 mb-4 text-white focus:border-red-500 outline-none transition-colors"
        />

        <button 
            onClick={handleHardReset}
            disabled={!isConfirmValid}
            className={`px-6 py-3 rounded font-bold flex items-center gap-2 w-full justify-center transition-all ${
                isConfirmValid 
                ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
            }`}
        >
            <RefreshCw size={20} />
            Hard Reset (Wipe Save)
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
