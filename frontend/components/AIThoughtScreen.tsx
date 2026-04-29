import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Search, FileText, Brain, Loader2, ChevronRight, Zap, CheckCircle2, Clock } from 'lucide-react';

interface AIThoughtScreenProps {
  isLoading: boolean;
  targetRole?: string;
  timelineMonths?: number;
  hasCV?: boolean;
  progressStep?: number;
  thinkingMessage?: string;
}

const thoughtSteps = [
  { key: 'analyzing', icon: Brain, label: 'Analyzing your profile...', labelVi: 'Đang phân tích hồ sơ của bạn...' },
  { key: 'research', icon: Search, label: 'Researching job market...', labelVi: 'Đang nghiên cứu thị trường việc làm...' },
  { key: 'generating', icon: Sparkles, label: 'Generating roadmap...', labelVi: 'Đang tạo lộ trình học tập...' },
  { key: 'resources', icon: FileText, label: 'Finding resources...', labelVi: 'Đang tìm kiếm tài nguyên...' },
  { key: 'complete', icon: CheckCircle2, label: 'Finalizing...', labelVi: 'Đang hoàn thiện...' },
];

const AIThoughtScreen: React.FC<AIThoughtScreenProps> = ({ 
  isLoading, 
  targetRole, 
  timelineMonths = 6, 
  hasCV = false,
  progressStep,
  thinkingMessage
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [animatedSteps, setAnimatedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (!isLoading) {
      setCurrentStepIndex(0);
      setAnimatedSteps([]);
      return;
    }

    if (progressStep !== undefined) {
      setCurrentStepIndex(progressStep);
      setAnimatedSteps(prev => {
        const newSteps = [...prev];
        for (let i = 0; i <= progressStep; i++) {
          if (!newSteps.includes(i)) newSteps.push(i);
        }
        return newSteps;
      });
      return;
    }

    setCurrentStepIndex(0);
    setAnimatedSteps([]);

    const animateSteps = async () => {
      for (let i = 0; i < thoughtSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
        setCurrentStepIndex(i);
        setAnimatedSteps(prev => [...prev, i]);
      }
    };

    animateSteps();
  }, [isLoading, progressStep]);

  const currentStep = thoughtSteps[currentStepIndex];
  const CurrentIcon = currentStep?.icon || Loader2;
  const isVi = true;

  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 z-10 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="relative mb-8">
          <div className="w-32 h-32 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-3xl rotate-3 opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-3xl -rotate-6 opacity-30"></div>
            <div className="absolute inset-0 bg-white rounded-3xl flex items-center justify-center shadow-xl">
              <Bot className="w-16 h-16 text-indigo-600" />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          AI is thinking...
        </h3>
        {thinkingMessage && (
          <div className="max-w-md text-center px-4 py-2 mb-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-indigo-700 italic">"{thinkingMessage}"</p>
          </div>
        )}
        <p className="text-slate-500 mb-8">
          Building your {targetRole || 'career'} roadmap
        </p>

        <div className="w-full max-w-sm space-y-3">
          {thoughtSteps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStepIndex;
            const isComplete = animatedSteps.includes(index);
            const isPending = !isActive && !isComplete;

            return (
              <div 
                key={step.key}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-indigo-100 border border-indigo-300 scale-105' :
                  isComplete ? 'bg-green-50 border border-green-200' :
                  'bg-slate-50 border border-slate-100 opacity-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive ? 'bg-indigo-500 animate-pulse' :
                  isComplete ? 'bg-green-500' :
                  'bg-slate-300'
                }`}>
                  {isActive ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <StepIcon className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <span className={`flex-1 text-sm ${
                  isActive ? 'text-indigo-700 font-medium' :
                  isComplete ? 'text-green-700' :
                  'text-slate-500'
                }`}>
                  {isVi ? step.labelVi : step.label}
                </span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-indigo-500 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          <span>Estimated time: {timelineMonths * 2}s</span>
        </div>
      </div>

      <div className="p-4 bg-white/50 border-t border-slate-100">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>Powered by Gemini 2.5 Pro</span>
        </div>
      </div>
    </div>
  );
};

export default AIThoughtScreen;