import React from 'react';
import * as LucideIcons from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';
import { Lock } from 'lucide-react';

export const ICON_LEVELS: Record<string, number> = {
  'Activity': 1, 'Star': 1, 'Heart': 1, 'Book': 1, 'Dumbbell': 1,
  'Droplets': 2, 'Coffee': 2, 'Moon': 2, 'Sun': 2, 'Music': 2,
  'Briefcase': 3, 'Code': 3, 'PenTool': 3, 'Palette': 3, 'Flame': 3,
  'Target': 4, 'Zap': 4, 'Smile': 4, 'CheckCircle': 4, 'Clock': 4,
  'Trophy': 5, 'Crown': 5, 'Diamond': 5, 'Rocket': 5, 'Sword': 5
};

export const AVAILABLE_ICONS = Object.keys(ICON_LEVELS);

interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ selectedIcon, onSelectIcon }) => {
  const { level } = useHabitStore();

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Ikon Habit</label>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {AVAILABLE_ICONS.map((iconName) => {
          const IconComponent = (LucideIcons as any)[iconName];
          if (!IconComponent) return null;
          
          const requiredLevel = ICON_LEVELS[iconName];
          const isLocked = level < requiredLevel;
          
          return (
            <button
              key={iconName}
              type="button"
              onClick={() => {
                if (!isLocked) onSelectIcon(iconName);
              }}
              disabled={isLocked}
              className={`p-2 rounded-lg flex items-center justify-center transition-colors relative ${
                isLocked 
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50'
                  : selectedIcon === iconName 
                    ? 'bg-blue-100 text-blue-600 border-2 border-blue-500' 
                    : 'bg-gray-50 text-gray-500 border-2 border-transparent hover:bg-gray-100 hover:text-gray-700'
              }`}
              title={isLocked ? `Terbuka di Level ${requiredLevel}` : iconName}
            >
              <IconComponent className="w-5 h-5" />
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
                  <Lock className="w-3 h-3 text-gray-500" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const getIconComponent = (iconName?: string) => {
  if (!iconName) return LucideIcons.Activity; // Default icon
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent || LucideIcons.Activity;
};
