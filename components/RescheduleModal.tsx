import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, ArrowRight, Check, Clock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentStartDate?: string;
  onConfirm: (newStartDate: string) => void;
}

const RescheduleModal: React.FC<Props> = ({ isOpen, onClose, currentStartDate, onConfirm }) => {
  const [mode, setMode] = useState<'shift' | 'delay'>('shift');
  const [newDate, setNewDate] = useState<string>('');
  
  // Delay State
  const [delayType, setDelayType] = useState<'days' | 'weeks'>('days');
  const [delayAmount, setDelayAmount] = useState<number>(1);
  
  const [previewDate, setPreviewDate] = useState<string>('');

  useEffect(() => {
    if (isOpen && currentStartDate) {
      setNewDate(currentStartDate);
      setPreviewDate(currentStartDate);
      // Reset defaults when opening
      setMode('shift');
      setDelayType('days');
      setDelayAmount(1);
    }
  }, [isOpen, currentStartDate]);

  useEffect(() => {
    if (!currentStartDate) return;

    if (mode === 'shift') {
        setPreviewDate(newDate);
    } else {
        // Calculate delay
        const date = new Date(currentStartDate);
        const daysToAdd = delayType === 'weeks' ? delayAmount * 7 : delayAmount;
        
        // Handle timezone/DST issues by setting to noon before adding
        date.setHours(12, 0, 0, 0); 
        date.setDate(date.getDate() + daysToAdd);
        setPreviewDate(date.toISOString().split('T')[0]);
    }
  }, [mode, newDate, delayType, delayAmount, currentStartDate]);

  const handleConfirm = () => {
    onConfirm(previewDate);
  };

  const formatDate = (dateStr: string) => {
      if (!dateStr) return '...';
      const date = new Date(dateStr);
      // Add timezone offset to prevent "off by one day" display errors
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
      
      if (isNaN(date.getTime())) return 'Invalid Date';
      return adjustedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const getWeekEndDate = (startDateStr: string) => {
      if (!startDateStr) return '...';
      const date = new Date(startDateStr);
      if (isNaN(date.getTime())) return '';
      // Add timezone offset
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
      
      adjustedDate.setDate(adjustedDate.getDate() + 6);
      return adjustedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isPastDate = () => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const selected = new Date(previewDate);
      // Adjust comparison for timezone
      const userTimezoneOffset = selected.getTimezoneOffset() * 60000;
      const adjustedSelected = new Date(selected.getTime() + userTimezoneOffset);
      
      return adjustedSelected < today;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-3 mb-6 flex-shrink-0">
            <div className="bg-indigo-100 p-2 rounded-lg">
                <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-slate-800">Adjust Your Timeline</h3>
                <p className="text-sm text-slate-500">Life happens. Let's get you back on track.</p>
            </div>
        </div>

        <div className="overflow-y-auto pr-2 custom-scrollbar">
            <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Schedule</h4>
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Calendar className="w-4 h-4" />
                    <span>Start Date: {formatDate(currentStartDate || '')}</span>
                </div>
            </div>

            <div className="space-y-4 mb-6">
                <div 
                    onClick={() => setMode('shift')}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${mode === 'shift' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mode === 'shift' ? 'border-indigo-600' : 'border-slate-400'}`}>
                            {mode === 'shift' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                        </div>
                        <span className="font-bold text-slate-800">Shift entire timeline</span>
                    </div>
                    <p className="text-sm text-slate-600 ml-6 mb-3">Pick a new start date. All weeks will shift accordingly.</p>
                    
                    {mode === 'shift' && (
                        <div className="ml-6">
                            <input 
                                type="date" 
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    )}
                </div>

                <div 
                    onClick={() => setMode('delay')}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${mode === 'delay' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mode === 'delay' ? 'border-indigo-600' : 'border-slate-400'}`}>
                            {mode === 'delay' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                        </div>
                        <span className="font-bold text-slate-800">Add delay (Pause)</span>
                    </div>
                    <p className="text-sm text-slate-600 ml-6 mb-3">Push everything back to accommodate breaks.</p>
                    
                    {mode === 'delay' && (
                        <div className="ml-6 space-y-3 mt-4 border-t border-indigo-200 pt-3">
                            {/* Quick Delay (Days) */}
                            <div 
                                onClick={(e) => { e.stopPropagation(); setDelayType('days'); setDelayAmount(1); }}
                                className={`flex items-start gap-3 p-3 rounded-lg transition-colors border ${delayType === 'days' ? 'bg-white border-indigo-200 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100 hover:bg-white/50'}`}
                            >
                                <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${delayType === 'days' ? 'border-indigo-600' : 'border-slate-400'}`}>
                                    {delayType === 'days' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                </div>
                                <div className="flex-1">
                                    <span className="text-sm font-bold text-slate-800 block">Quick delay (days)</span>
                                    <span className="text-xs text-slate-500 block mb-2">Use for: Short breaks, weekends, illness</span>
                                    {delayType === 'days' && (
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="number" 
                                                min="1"
                                                max="30"
                                                value={delayAmount}
                                                onChange={(e) => setDelayAmount(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                                                className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                            <span className="text-sm text-slate-600 font-medium">days</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Extended Delay (Weeks) */}
                            <div 
                                onClick={(e) => { e.stopPropagation(); setDelayType('weeks'); setDelayAmount(1); }}
                                className={`flex items-start gap-3 p-3 rounded-lg transition-colors border ${delayType === 'weeks' ? 'bg-white border-indigo-200 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100 hover:bg-white/50'}`}
                            >
                                 <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${delayType === 'weeks' ? 'border-indigo-600' : 'border-slate-400'}`}>
                                    {delayType === 'weeks' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                </div>
                                <div className="flex-1">
                                    <span className="text-sm font-bold text-slate-800 block">Extended delay (weeks)</span>
                                    <span className="text-xs text-slate-500 block mb-2">Use for: Vacation, projects, major life events</span>
                                    {delayType === 'weeks' && (
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="number" 
                                                min="1"
                                                max="12"
                                                value={delayAmount}
                                                onChange={(e) => setDelayAmount(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                                                className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                            <span className="text-sm text-slate-600 font-medium">weeks</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Section */}
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                 <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">New Schedule Preview</h4>
                 {mode === 'delay' && (
                     <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-indigo-800 bg-indigo-100/50 p-2 rounded w-fit">
                        <Clock className="w-3.5 h-3.5" />
                        Pushing timeline by {delayAmount} {delayType}
                     </div>
                 )}
                 <div className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                        <span className="text-slate-500">New Start Date</span>
                        <span className="font-bold text-indigo-700">{formatDate(previewDate)}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-indigo-300" />
                    <div className="flex flex-col text-right">
                        <span className="text-slate-500">Week 1 Range</span>
                        <span className="font-bold text-indigo-700">{formatDate(previewDate)} - {getWeekEndDate(previewDate)}</span>
                    </div>
                 </div>
                 
                 {isPastDate() && (
                     <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                         <AlertTriangle className="w-4 h-4 shrink-0" />
                         <span>Start date is in the past. We assume you are catching up on missed weeks.</span>
                     </div>
                 )}
            </div>
            
            <div className="space-y-2 mb-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">What stays the same?</h4>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-green-500" />
                    All your progress (checked tasks)
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-green-500" />
                    Your complete roadmap content & projects
                </div>
            </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-auto">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all"
          >
            Confirm Reschedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;