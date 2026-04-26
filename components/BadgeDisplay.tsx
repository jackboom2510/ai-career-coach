import React from 'react';
import { Badge, UnlockedBadge } from '../types';
import { Lock } from 'lucide-react';
import { BADGE_DEFINITIONS } from '../services/engagementService';

interface Props {
  unlockedBadges: UnlockedBadge[];
}

const BadgeDisplay: React.FC<Props> = ({ unlockedBadges }) => {
  const unlockedIds = new Set(unlockedBadges.map(b => b.id));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Achievements</h3>
      <div className="grid grid-cols-4 gap-2">
        {BADGE_DEFINITIONS.map((badge) => {
          const isUnlocked = unlockedIds.has(badge.id);
          return (
            <div key={badge.id} className="flex flex-col items-center group relative">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all duration-300
                  ${isUnlocked 
                    ? 'bg-yellow-50 border-yellow-200 grayscale-0 scale-100' 
                    : 'bg-slate-50 border-slate-100 grayscale opacity-40 scale-90'}
                `}
              >
                {isUnlocked ? badge.icon : <Lock className="w-4 h-4 text-slate-400" />}
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 w-max max-w-[150px] bg-slate-800 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-center">
                <p className="font-bold">{badge.name}</p>
                <p className="font-normal text-slate-300">{badge.description}</p>
                {isUnlocked && <p className="text-green-400 mt-1">Unlocked!</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BadgeDisplay;
