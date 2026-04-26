import React, { useState } from 'react';
import { RoadmapWeek } from '../types';
import { CheckCircle2, Circle, BookOpen, Calendar, ChevronDown, ChevronUp, Clock, ExternalLink, StickyNote, Save } from 'lucide-react';

interface Props {
  roadmap: RoadmapWeek[];
  onSelectWeek: (week: number) => void;
  selectedWeek: number;
  startDate?: string;
  onGoToWeeklyView?: () => void;
  onUpdateNotes?: (weekNumber: number, notes: string) => void;
}

const RoadmapView: React.FC<Props> = ({ roadmap, onSelectWeek, selectedWeek, startDate, onGoToWeeklyView, onUpdateNotes }) => {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  
  // Local state for editing notes to avoid lag
  const [editingNote, setEditingNote] = useState<{week: number, text: string} | null>(null);

  // Calculate total progress
  const totalTasks = roadmap.reduce((acc, week) => acc + week.tasks.length, 0);
  const completedTasks = roadmap.reduce((acc, week) => acc + week.tasks.filter(t => t.completed).length, 0);
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getWeekDateRange = (weekNum: number) => {
    if (!startDate) return null;
    const start = new Date(startDate);
    // Add weeks (weekNum is 1-based, so subtract 1 for offset)
    start.setDate(start.getDate() + (weekNum - 1) * 7);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const handleToggleExpand = (e: React.MouseEvent, weekNum: number) => {
    e.stopPropagation();
    setExpandedWeek(expandedWeek === weekNum ? null : weekNum);
  };

  const handleViewDetails = (e: React.MouseEvent, weekNum: number) => {
      e.stopPropagation();
      setExpandedWeek(expandedWeek === weekNum ? null : weekNum);
  };

  const handleNoteChange = (weekNum: number, val: string) => {
      setEditingNote({ week: weekNum, text: val });
  };

  const saveNote = (weekNum: number) => {
      if (editingNote && editingNote.week === weekNum && onUpdateNotes) {
          onUpdateNotes(weekNum, editingNote.text);
          // Optional: Show a "Saved" toast logic here if needed, but simple blur/click is fine
      }
  };

  const renderDifficultyBadge = (difficulty?: string) => {
      // Map Beginner/Intermediate/Advanced to Easy/Medium/Hard logic
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

  const renderResourceLink = (resource: string) => {
    // Check if the resource string contains a URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = resource.match(urlRegex);
    
    let url = '';
    let text = resource;

    if (match) {
        url = match[0];
        // Clean text by removing the URL and common separators
        text = resource.replace(urlRegex, '').replace(/[\(\)\-\|\[\]]/g, '').trim();
        if (!text) text = url; // Fallback to URL if no text remains
    } else {
        // Fallback: Create a Google Search link
        url = `https://www.google.com/search?q=${encodeURIComponent(resource)}`;
    }

    // Clean up trailing punctuation
    text = text.replace(/[:\-]+$/, '').trim();

    return (
        <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-indigo-500 hover:text-indigo-700 hover:underline flex items-start gap-1 transition-colors"
            onClick={(e) => e.stopPropagation()}
        >
            <span>{text}</span>
            <ExternalLink className="w-3 h-3 mt-1 shrink-0 opacity-70" />
        </a>
    );
  };

  return (
    <div className="h-full overflow-y-auto px-1">
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-10">
            <div>
                <h3 className="text-lg font-bold text-slate-800">Your Journey</h3>
                <p className="text-xs text-slate-500">{completedTasks} of {totalTasks} tasks completed</p>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
                <span className="text-sm font-bold text-slate-700">{overallProgress}%</span>
            </div>
        </div>
        
        <div className="relative pl-6 border-l-2 border-slate-200 space-y-8">
          {roadmap.map((week) => {
             const isSelected = selectedWeek === week.weekNumber;
             const isPast = selectedWeek > week.weekNumber;
             const isExpanded = expandedWeek === week.weekNumber;
             
             // Week progress
             const weekTotal = week.tasks.length;
             const weekCompleted = week.tasks.filter(t => t.completed).length;
             const weekProgress = weekTotal > 0 ? (weekCompleted / weekTotal) * 100 : 0;
             const isWeekDone = weekCompleted === weekTotal && weekTotal > 0;
             const dateRange = getWeekDateRange(week.weekNumber);
             const hasNotes = week.notes && week.notes.length > 0;

             return (
              <div 
                key={week.weekNumber} 
                className={`relative group transition-all duration-300 ${isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
                onClick={() => onSelectWeek(week.weekNumber)}
              >
                {/* Timeline Dot */}
                <div 
                    className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 transition-colors duration-300
                    ${isWeekDone ? 'bg-green-500 border-green-500' : 
                      isSelected ? 'border-indigo-600 bg-white ring-4 ring-indigo-100' : 
                      isPast ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-white'}
                    `}
                >
                    {isWeekDone && <CheckCircle2 className="w-3.5 h-3.5 text-white absolute -top-[1px] -left-[1px]" />}
                </div>

                <div 
                    className={`p-5 rounded-xl border cursor-pointer transition-all shadow-sm
                    ${isSelected 
                        ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500' 
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'}
                    `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>
                        Week {week.weekNumber}
                        </span>
                        {dateRange && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {dateRange}
                            </span>
                        )}
                        {hasNotes && !isExpanded && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1" title={week.notes?.substring(0, 100)}>
                                <StickyNote className="w-2.5 h-2.5" /> Notes
                            </span>
                        )}
                    </div>
                    {weekProgress > 0 && (
                        <div className="text-xs font-medium text-slate-500">
                            {Math.round(weekProgress)}%
                        </div>
                    )}
                  </div>
                  
                  <h4 className="text-lg font-bold text-slate-800 mb-2">{week.theme}</h4>
                  <p className="text-slate-600 text-sm mb-4 leading-relaxed">{week.description}</p>

                  <div className="space-y-2">
                    {(isExpanded ? week.tasks : week.priorities.slice(0, 2)).map((item, i) => {
                      // Use task description if expanded, otherwise priority string
                      const text = isExpanded ? (item as any).description : (item as string);
                      const isTaskCompleted = isExpanded ? (item as any).completed : false;
                      const hours = isExpanded ? (item as any).estimatedHours : null;
                      const difficulty = isExpanded ? (item as any).difficulty : null;
                      
                      return (
                        <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                           {isExpanded ? (
                             <div className={`mt-1 min-w-[16px] w-4 h-4 rounded border flex items-center justify-center ${isTaskCompleted ? 'bg-indigo-100 border-indigo-300' : 'border-slate-300'}`}>
                               {isTaskCompleted && <CheckCircle2 className="w-3 h-3 text-indigo-600" />}
                             </div>
                           ) : (
                             (isPast || isWeekDone) ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> : <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                           )}
                           
                           <div className="flex-1">
                               <div className="flex justify-between gap-2 items-start">
                                    <span className={isTaskCompleted ? 'line-through text-slate-400' : ''}>{text}</span>
                                    {isExpanded && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            {difficulty && renderDifficultyBadge(difficulty)}
                                            {hours && (
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded whitespace-nowrap border border-slate-100">
                                                    <Clock className="w-3 h-3" /> {hours}h
                                                </span>
                                            )}
                                        </div>
                                    )}
                               </div>
                           </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Expanded Content: Resources & Notes */}
                  {isExpanded && (
                      <div className="mt-4 space-y-4">
                          {/* Resources */}
                          {week.suggestedResources && week.suggestedResources.length > 0 && (
                            <div className="pt-4 border-t border-slate-100">
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Resources</h5>
                                <ul className="space-y-1">
                                    {week.suggestedResources.map((res, idx) => (
                                        <li key={idx} className="text-xs text-indigo-600 flex items-start gap-2">
                                            <span className="mt-1 w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                                            {renderResourceLink(res)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                          )}

                          {/* Notes Section */}
                          <div className="pt-4 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                        <StickyNote className="w-3 h-3" /> Weekly Notes
                                    </h5>
                                    {editingNote?.week === week.weekNumber && (
                                        <span className="text-[10px] text-slate-400">
                                            {editingNote.text.length} / 500
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <textarea
                                        value={editingNote?.week === week.weekNumber ? editingNote.text : (week.notes || '')}
                                        onChange={(e) => handleNoteChange(week.weekNumber, e.target.value)}
                                        onBlur={() => saveNote(week.weekNumber)}
                                        placeholder="Track your progress, blockers, or insights for this week..."
                                        maxLength={500}
                                        rows={4}
                                        className="w-full text-sm p-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-y"
                                    />
                                    {editingNote?.week === week.weekNumber && editingNote.text !== (week.notes || '') && (
                                        <button 
                                            onClick={() => saveNote(week.weekNumber)}
                                            className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm"
                                            title="Save Note"
                                        >
                                            <Save className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                          </div>
                      </div>
                  )}

                  {/* Mini Progress Bar inside card */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                         <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${weekProgress}%` }} />
                      </div>
                      
                      {isSelected && (
                         <div className="flex items-center justify-end">
                            <button 
                                onClick={(e) => handleViewDetails(e, week.weekNumber)}
                                className="text-xs font-medium text-indigo-600 flex items-center gap-1 hover:text-indigo-800 transition-colors bg-indigo-50 px-2 py-1 rounded-lg"
                            >
                                {isExpanded ? (
                                    <>Hide Details <ChevronUp className="w-3 h-3"/></>
                                ) : (
                                    <>View Details <ChevronDown className="w-3 h-3"/></>
                                )}
                            </button>
                         </div>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoadmapView;