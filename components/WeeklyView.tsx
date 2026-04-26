import React, { useMemo, useEffect, useState, useRef } from 'react';
import { RoadmapWeek, StudyPlan, TimeAvailability } from '../types';
import { Calendar as CalendarIcon, Clock, Target, ArrowRight, Lightbulb, CheckSquare, Zap, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Download, AlertTriangle, Quote as QuoteIcon, BarChart, Users, TrendingUp, StickyNote, Save, Check } from 'lucide-react';
import { getRandomQuote } from '../services/engagementService';

interface Props {
  weekData: RoadmapWeek;
  strategy: StudyPlan['weeklyStrategy'];
  roadmap: RoadmapWeek[];
  currentWeekIndex: number; // Index in the roadmap array (0-based)
  onToggleTask: (taskIndex: number) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  onNavigateWeek: (weekIndex: number) => void;
  userAvailability?: TimeAvailability;
  startDate?: string;
  onUpdateNotes?: (weekNumber: number, notes: string) => void;
}

const WeeklyView: React.FC<Props> = ({ 
  weekData, 
  strategy, 
  roadmap, 
  currentWeekIndex,
  onToggleTask, 
  onRegenerate, 
  isRegenerating,
  onNavigateWeek,
  userAvailability,
  startDate,
  onUpdateNotes
}) => {
  
  const [quote, setQuote] = useState<{text: string, author: string} | null>(null);
  
  // Note State
  const [noteText, setNoteText] = useState(weekData.notes || '');
  const [isNoteSaved, setIsNoteSaved] = useState(false);
  const noteSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuote(getRandomQuote());
  }, [weekData.weekNumber]);

  // Sync note text when switching weeks
  useEffect(() => {
      setNoteText(weekData.notes || '');
      setIsNoteSaved(false);
  }, [weekData.weekNumber, weekData.notes]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNoteText(e.target.value);
      setIsNoteSaved(false);
  };

  const handleNoteBlur = () => {
      if (noteText !== (weekData.notes || '')) {
          if (onUpdateNotes) {
              onUpdateNotes(weekData.weekNumber, noteText);
              setIsNoteSaved(true);
              if (noteSaveTimeoutRef.current) clearTimeout(noteSaveTimeoutRef.current);
              noteSaveTimeoutRef.current = setTimeout(() => setIsNoteSaved(false), 2000);
          }
      }
  };

  const completedCount = weekData.tasks.filter(t => t.completed).length;
  const progress = weekData.tasks.length > 0 ? (completedCount / weekData.tasks.length) * 100 : 0;
  const totalWeeks = roadmap.length;

  // Progress Color Logic
  const getProgressColor = (pct: number) => {
      if (pct < 30) return 'bg-red-500';
      if (pct < 70) return 'bg-yellow-500';
      return 'bg-green-500';
  };
  const getProgressTextColor = (pct: number) => {
    if (pct < 30) return 'text-red-600';
    if (pct < 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Workload Calculation
  const totalHours = weekData.tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
  const completedHours = weekData.tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const remainingHours = totalHours - completedHours;

  // Next Milestone Logic
  const milestones = [
    { week: Math.ceil(totalWeeks / 4), label: "Quarter Way" },
    { week: Math.ceil(totalWeeks / 2), label: "Halfway" },
    { week: Math.ceil(totalWeeks * 0.75), label: "Final Sprint" },
    { week: totalWeeks, label: "Completion" }
  ];
  const nextMilestone = milestones.find(m => m.week >= weekData.weekNumber);
  const weeksUntilMilestone = nextMilestone ? nextMilestone.week - weekData.weekNumber : 0;
  
  // Parse user availability to get max hours
  const maxAvailableHours = useMemo(() => {
    if (!userAvailability) return 20;
    if (userAvailability.includes('5-10')) return 10;
    if (userAvailability.includes('10-20')) return 20;
    if (userAvailability.includes('20+')) return 40;
    return 20;
  }, [userAvailability]);

  const isOverloaded = totalHours > maxAvailableHours;

  // Date Range Calculation
  const dateRangeString = useMemo(() => {
    if (!startDate) return "";
    const start = new Date(startDate);
    start.setDate(start.getDate() + (weekData.weekNumber - 1) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`;
  }, [startDate, weekData.weekNumber]);

  // Memoize random tip selection
  const randomTip = useMemo(() => {
    if (!strategy.tips || strategy.tips.length === 0) return "Stay consistent!";
    return strategy.tips[Math.floor(Math.random() * strategy.tips.length)];
  }, [strategy.tips]);

  const handlePrev = () => {
    if (currentWeekIndex > 0) onNavigateWeek(currentWeekIndex - 1);
  };

  const handleNext = () => {
    if (currentWeekIndex < totalWeeks - 1) onNavigateWeek(currentWeekIndex + 1);
  };

  const renderDifficultyBadge = (difficulty?: string) => {
      let color = 'bg-slate-100 text-slate-600';
      let label = difficulty || 'Medium';
      let icon = '⚪';

      if (difficulty === 'Beginner') {
          color = 'bg-green-100 text-green-700 border-green-200';
          label = 'Easy';
          icon = '🟢';
      } else if (difficulty === 'Intermediate') {
          color = 'bg-yellow-100 text-yellow-700 border-yellow-200';
          label = 'Medium';
          icon = '🟡';
      } else if (difficulty === 'Advanced') {
          color = 'bg-red-100 text-red-700 border-red-200';
          label = 'Hard';
          icon = '🔴';
      }

      return (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap flex items-center gap-1 ${color}`}>
             {icon} {label}
          </span>
      );
  };

  const handleAddToCalendar = () => {
    if (!startDate) return;
    
    const start = new Date(startDate);
    start.setDate(start.getDate() + (weekData.weekNumber - 1) * 7);
    start.setHours(9, 0, 0, 0);
    
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "").split("Z")[0];
    
    const event = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `DTSTART:${formatDate(start)}`,
        `SUMMARY:Week ${weekData.weekNumber}: ${weekData.theme}`,
        `DESCRIPTION:${weekData.description}\\n\\nTasks:\\n${weekData.tasks.map(t => `- ${t.description} (${t.estimatedHours}h)`).join('\\n')}`,
        "DURATION:PT1H",
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\n");

    const blob = new Blob([event], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `career-coach-week-${weekData.weekNumber}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full overflow-y-auto px-1 space-y-6">
      
      {/* Motivational Quote Banner */}
      {quote && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-4 shadow-sm">
            <div className="bg-white p-2 rounded-full shadow-sm text-indigo-500">
                <QuoteIcon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-slate-700 italic font-medium leading-relaxed">"{quote.text}"</p>
                <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-wider">— {quote.author}</p>
            </div>
        </div>
      )}

      {/* Header Banner with Navigation */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                
                {/* Week Navigation Controls */}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-lg p-1 self-start md:self-auto">
                    <button 
                        onClick={handlePrev}
                        disabled={currentWeekIndex === 0}
                        className="p-1.5 rounded-md hover:bg-white/20 disabled:opacity-30 transition-colors"
                        aria-label="Previous Week"
                    >
                        <ChevronLeft className="w-5 h-5 text-indigo-100" />
                    </button>
                    
                    <div className="relative group px-1 border-x border-white/10">
                        <div className="flex items-center gap-2 cursor-pointer py-1">
                            <CalendarIcon className="w-4 h-4 text-indigo-200" />
                            <span className="text-sm font-bold text-white whitespace-nowrap">
                                Week {weekData.weekNumber}
                            </span>
                            <ChevronDown className="w-3 h-3 text-indigo-200 opacity-70" />
                        </div>
                        
                        <select 
                            value={currentWeekIndex}
                            onChange={(e) => onNavigateWeek(parseInt(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        >
                            {roadmap.map((week, idx) => (
                                <option key={idx} value={idx} className="text-slate-800">
                                    Week {week.weekNumber} - {week.theme.length > 30 ? week.theme.substring(0, 30) + '...' : week.theme}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={handleNext}
                        disabled={currentWeekIndex === totalWeeks - 1}
                        className="p-1.5 rounded-md hover:bg-white/20 disabled:opacity-30 transition-colors"
                        aria-label="Next Week"
                    >
                        <ChevronRight className="w-5 h-5 text-indigo-100" />
                    </button>
                </div>

                <div className="flex gap-2 self-start md:self-auto">
                     {startDate && (
                        <button 
                            onClick={handleAddToCalendar}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold backdrop-blur-sm transition-colors"
                        >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            Add to Cal
                        </button>
                    )}
                    <button 
                        onClick={onRegenerate}
                        disabled={isRegenerating}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold backdrop-blur-sm transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                        {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                    </button>
                </div>
            </div>
            
            <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl md:text-3xl font-bold">{weekData.theme}</h2>
                {dateRangeString && (
                     <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-indigo-50 font-medium">
                        {dateRangeString}
                     </span>
                )}
            </div>
            <p className="text-indigo-100 leading-relaxed max-w-2xl text-sm md:text-base">{weekData.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Tasks */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Action Checklist */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-indigo-500" />
                        This Week's Checklist
                    </h3>
                    <div className="flex items-center gap-3">
                         <span className={`text-sm font-bold ${getProgressTextColor(progress)}`}>
                            {Math.round(progress)}% Complete
                         </span>
                    </div>
                </div>
                
                {isOverloaded && (
                    <div className="mb-4 bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                        <p className="text-xs text-amber-800">
                            <strong>Heads up:</strong> This week's estimated workload ({totalHours}h) exceeds your typical availability ({userAvailability}). Consider moving some tasks to next week.
                        </p>
                    </div>
                )}

                {/* Detailed Progress Bar */}
                <div className="relative pt-1 mb-6">
                    <div className="overflow-hidden h-3 mb-2 text-xs flex rounded-full bg-slate-100">
                        <div style={{ width: `${progress}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${getProgressColor(progress)}`}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>{completedCount} of {weekData.tasks.length} tasks</span>
                        <span>{completedHours} hrs done</span>
                    </div>
                </div>

                <div className="space-y-3">
                    {weekData.tasks.map((task, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => onToggleTask(idx)}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer group
                                ${task.completed ? 'bg-slate-50 border-slate-200' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}
                            `}
                        >
                            <div className="mt-0.5 min-w-[20px] relative">
                                <input 
                                    type="checkbox" 
                                    checked={task.completed} 
                                    readOnly
                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer" 
                                />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <span className={`text-sm md:text-base leading-relaxed transition-colors ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                        {task.description}
                                    </span>
                                    <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
                                        {task.difficulty && renderDifficultyBadge(task.difficulty)}
                                        {task.estimatedHours && (
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap flex items-center gap-1
                                                ${task.completed ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}
                                            `}>
                                                <Clock className="w-3 h-3" /> {task.estimatedHours}h
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Weekly Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold">Total Tasks</p>
                    <p className="text-xl font-bold text-slate-800">{weekData.tasks.length}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold">Completed</p>
                    <p className="text-xl font-bold text-green-600">{completedCount}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold">Rem. Hours</p>
                    <p className="text-xl font-bold text-indigo-600">{Math.round(remainingHours * 10) / 10}h</p>
                </div>
                 <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold">Next Milestone</p>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                        {nextMilestone ? nextMilestone.label : 'Done!'}
                        {weeksUntilMilestone > 0 && <span className="block text-slate-400 font-normal">in {weeksUntilMilestone} wks</span>}
                    </p>
                </div>
            </div>

            {/* Resources (if available) */}
            {weekData.suggestedResources && weekData.suggestedResources.length > 0 && (
                 <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Recommended Resources</h3>
                    <ul className="space-y-2">
                        {weekData.suggestedResources.map((res, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                <ArrowRight className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                                <span>{res}</span>
                            </li>
                        ))}
                    </ul>
                 </div>
            )}
        </div>

        {/* Right Col: Strategy & Time */}
        <div className="space-y-6">
             <div className="bg-indigo-900 rounded-xl p-5 text-white text-center shadow-lg relative overflow-hidden">
                {/* Background decorative element */}
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-indigo-800 rounded-full opacity-50"></div>
                
                <Target className="w-8 h-8 mx-auto mb-2 text-indigo-300 relative z-10" />
                <h4 className="font-bold mb-1 relative z-10">Weekly Goal</h4>
                <p className="text-xs text-indigo-200 relative z-10">Complete 80% of tasks to stay on track for your transition.</p>
                
                <div className="mt-4 pt-4 border-t border-indigo-800 relative z-10">
                     <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">Time Remaining</p>
                     <p className="text-lg font-bold">{Math.round(remainingHours)} hours</p>
                     <p className="text-[10px] text-indigo-400">At your {userAvailability} pace</p>
                </div>
             </div>

            {/* Community Progress Benchmark */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                 <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-blue-500" />
                    <h4 className="font-bold text-slate-800">Community Stats</h4>
                 </div>
                 
                 <p className="text-xs text-slate-600 mb-3">
                    You: <span className="font-bold text-indigo-600">{Math.round(progress)}%</span> | Avg: <span className="font-bold text-slate-500">45%</span> at Week {weekData.weekNumber}
                 </p>
                 
                 {/* Simulated Chart */}
                 <div className="space-y-3 mb-3">
                    <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                            <span>You</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div style={{ width: `${progress}%` }} className="h-full bg-indigo-500 rounded-full"></div>
                        </div>
                    </div>
                     <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                            <span>Community Avg</span>
                            <span>45%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div style={{ width: '45%' }} className="h-full bg-slate-300 rounded-full"></div>
                        </div>
                    </div>
                 </div>
                 
                 <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 p-2 rounded">
                    <TrendingUp className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>Faster than 50% of learners with similar backgrounds</span>
                 </div>
            </div>

            {/* Weekly Journal / Notes */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <StickyNote className="w-5 h-5 text-indigo-500" />
                        This Week's Notes
                    </h3>
                    {isNoteSaved && (
                        <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium animate-fade-in">
                            <Check className="w-3 h-3" /> Saved
                        </span>
                    )}
                 </div>
                 <textarea
                    value={noteText}
                    onChange={handleNoteChange}
                    onBlur={handleNoteBlur}
                    placeholder="Capture your thoughts, blockers, or quick wins for this week..."
                    rows={6}
                    maxLength={500}
                    className="w-full text-sm p-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-y"
                 />
                 <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-slate-400">Auto-saves on blur</span>
                    <span className="text-[10px] text-slate-400">{noteText.length}/500</span>
                 </div>
            </div>

            {/* Quick Tip */}
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-5">
                <div className="flex items-center gap-2 text-yellow-700 font-bold mb-2">
                    <Lightbulb className="w-5 h-5" />
                    <span>Focus Tip</span>
                </div>
                <p className="text-sm text-yellow-800 leading-relaxed italic">
                    "{randomTip}"
                </p>
            </div>

            {/* Time Blocking Strategy */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    Time Strategy
                </h3>
                <p className="text-sm text-slate-600 mb-4">{strategy.summary}</p>
                
                <div className="space-y-3">
                    {strategy.timeBlocks.map((block, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                             <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-slate-700 text-sm">{block.blockName}</span>
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{block.durationMinutes}m</span>
                             </div>
                             <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                                <Zap className="w-3 h-3" />
                                <span className="uppercase tracking-wide">{block.activityType}</span>
                             </div>
                             <p className="text-xs text-slate-600 leading-snug">{block.description}</p>
                        </div>
                    ))}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default WeeklyView;