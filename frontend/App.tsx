import React, { useState, useEffect, useRef } from 'react';
import OnboardingForm from './components/OnboardingForm';
import RoadmapView from './components/RoadmapView';
import WeeklyView from './components/WeeklyView';
import ProjectIdeasView from './components/ProjectIdeasView';
import RescheduleModal from './components/RescheduleModal';
import ChatAssistant from './components/ChatAssistant';
import AgentPanel from './components/AgentPanel';
import LanguageSelector from './components/LanguageSelector';
import Confetti from './components/Confetti';
import AIThoughtScreen from './components/AIThoughtScreen';
import BadgeDisplay from './components/BadgeDisplay';
import { generateStudyPlan, regenerateWeekPlan } from './services/geminiService';
import { updateStreak, checkNewBadges, calculateTimeEstimation } from './services/engagementService';
import { UserProfile, StudyPlan, UnlockedBadge } from './types';
import { Map, Calendar, Briefcase, AlertCircle, Menu, X, Edit3, Trash2, RefreshCcw, CheckCircle2, Download, Copy, FileText, ChevronDown, Flame, Trophy } from 'lucide-react';
import { jsPDF } from "jspdf";

const STORAGE_KEY = 'ai-career-coach-v1';

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [regeneratingWeek, setRegeneratingWeek] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'weekly' | 'projects'>('roadmap');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Engagement State
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Modals state
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showResetProgressConfirm, setShowResetProgressConfirm] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [badgeToast, setBadgeToast] = useState<UnlockedBadge | null>(null);
  
  // Export Menu State
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load from local storage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (parsed.profile) setProfile(parsed.profile);
            
            // Restore study plan and merge notes from profile if needed (for safety)
            if (parsed.studyPlan) {
                const hydratedPlan = { ...parsed.studyPlan };
                if (parsed.profile?.weekNotes) {
                    hydratedPlan.roadmap = hydratedPlan.roadmap.map((week: any) => ({
                        ...week,
                        notes: parsed.profile.weekNotes[week.weekNumber] || week.notes || ''
                    }));
                }
                setStudyPlan(hydratedPlan);
                if (parsed.studyPlan) setActiveTab('roadmap');
            }
            if (parsed.selectedWeek) setSelectedWeek(parsed.selectedWeek);
        } catch (e) {
            console.error("Failed to parse saved data", e);
        }
    }
  }, []);

  // Save to local storage on changes
  useEffect(() => {
    if (profile && studyPlan) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            profile,
            studyPlan,
            selectedWeek
        }));
    }
  }, [profile, studyPlan, selectedWeek]);

  // Toast helper
  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
  };

  const showBadgeToast = (badge: UnlockedBadge) => {
      setBadgeToast(badge);
      setShowConfetti(true);
      setTimeout(() => {
          setShowConfetti(false);
          setBadgeToast(null);
      }, 4000);
  };

  // Handle Edit Profile Logic
  const handleEditRequest = () => {
    // Show confirmation modal before allowing edit which resets progress
    setShowEditConfirm(true);
  };

  const confirmEdit = () => {
     setStudyPlan(null); // Clear plan to show form
     setError(null);
     setShowEditConfirm(false);
     setMobileMenuOpen(false); // Close mobile menu if open
  };

  const handleResetAllData = () => {
      if (window.confirm("Are you sure you want to delete ALL saved data (profile and roadmap)? This cannot be undone.")) {
          localStorage.removeItem(STORAGE_KEY);
          // Small delay to make UI feel responsive
          setTimeout(() => {
              setProfile(undefined);
              setStudyPlan(null);
              setSelectedWeek(1);
              setMobileMenuOpen(false);
          }, 300);
      }
  };

  const handleResetProgressRequest = () => {
      setShowResetProgressConfirm(true);
  };

  const confirmResetProgress = () => {
      if (!studyPlan) return;
      
      const newRoadmap = studyPlan.roadmap.map(week => ({
          ...week,
          tasks: week.tasks.map(t => ({ ...t, completed: false }))
      }));

      setStudyPlan({ ...studyPlan, roadmap: newRoadmap });
      if (profile) {
        setProfile({ ...profile, badges: [], streak: { currentStreak: 0, longestStreak: 0, lastActivityDate: '' } });
      }
      setShowResetProgressConfirm(false);
      setMobileMenuOpen(false);
      showToast("Progress reset. Good luck on your fresh start!");
  };

  const handleRescheduleRequest = () => {
      setShowRescheduleModal(true);
  };

  const confirmReschedule = (newStartDate: string) => {
      if (!profile) return;
      
      const updatedProfile = {
          ...profile,
          startDate: newStartDate,
          originalStartDate: profile.originalStartDate || profile.startDate,
          rescheduleCount: (profile.rescheduleCount || 0) + 1
      };
      
      setProfile(updatedProfile);
      setShowRescheduleModal(false);
      setMobileMenuOpen(false);
      showToast("✓ Timeline rescheduled! Week dates updated.");
  };

  const handleSubmit = async (userProfile: UserProfile) => {
    setLoading(true);
    setError(null);
    setProfile(userProfile);
    setMobileMenuOpen(false);

    try {
      const plan = await generateStudyPlan(userProfile);
      setStudyPlan(plan);
      setSelectedWeek(1);
      setActiveTab('roadmap');
    } catch (err) {
      console.error(err);
      setError("Failed to generate plan. Please check your API key and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWeekSelect = (week: number) => {
      setSelectedWeek(week);
  };

  // Navigating inside This Week view
  const handleNavigateWeek = (weekIndex: number) => {
      // weekIndex is 0-based, selectedWeek is 1-based usually
      const newWeekNum = weekIndex + 1;
      setSelectedWeek(newWeekNum);
  };

  const handleToggleTask = (weekIndex: number, taskIndex: number) => {
    if (!studyPlan || !profile) return;
    
    // 1. Update Task Completion
    const newPlan = { ...studyPlan };
    const week = newPlan.roadmap[weekIndex];
    
    if (week && week.tasks[taskIndex]) {
        week.tasks[taskIndex].completed = !week.tasks[taskIndex].completed;
        
        // Check for week completion (Celebration!)
        const isWeekComplete = week.tasks.every(t => t.completed);
        const wasWeekComplete = studyPlan.roadmap[weekIndex].tasks.every(t => t.completed);
        
        if (isWeekComplete && !wasWeekComplete) {
            setShowConfetti(true);
            showToast(`🎉 Week ${week.weekNumber} Complete! You're crushing it!`);
            setTimeout(() => setShowConfetti(false), 3000);
        }

        setStudyPlan(newPlan);

        // 2. Update Streak
        const updatedStreak = updateStreak(profile);
        const updatedProfile = { ...profile, streak: updatedStreak };
        
        // 3. Check for Badges
        const newBadges = checkNewBadges(updatedProfile, newPlan);
        if (newBadges.length > 0) {
            updatedProfile.badges = [...(updatedProfile.badges || []), ...newBadges];
            // Show badge toast for the first new badge
            showBadgeToast(newBadges[0]);
        }

        setProfile(updatedProfile);
    }
  };

  const handleRegenerateWeek = async () => {
      if (!studyPlan || !profile) return;
      
      const weekIndex = studyPlan.roadmap.findIndex(w => w.weekNumber === selectedWeek);
      if (weekIndex === -1) return;
      
      const currentWeek = studyPlan.roadmap[weekIndex];
      setRegeneratingWeek(true);
      
      try {
          const newWeekData = await regenerateWeekPlan(selectedWeek, currentWeek, profile);
          
          const newPlan = { ...studyPlan };
          // Preserve existing notes when regenerating
          newWeekData.notes = currentWeek.notes;
          
          newPlan.roadmap[weekIndex] = newWeekData;
          setStudyPlan(newPlan);
      } catch (err) {
          console.error(err);
      } finally {
          setRegeneratingWeek(false);
      }
  };
  
  const handleUpdateNotes = (weekNumber: number, notes: string) => {
      if (!studyPlan || !profile) return;

      // 1. Update Profile (Persistence)
      const updatedWeekNotes = { ...(profile.weekNotes || {}), [weekNumber]: notes };
      setProfile({ ...profile, weekNotes: updatedWeekNotes });

      // 2. Update Study Plan (View)
      const newPlan = { ...studyPlan };
      const weekIndex = newPlan.roadmap.findIndex(w => w.weekNumber === weekNumber);
      if (weekIndex !== -1) {
          newPlan.roadmap[weekIndex].notes = notes;
          setStudyPlan(newPlan);
      }
  };

  // EXPORT HANDLERS
  const getPlanAsText = () => {
      if (!studyPlan || !profile) return "";
      let text = `# Career Roadmap: ${profile.targetRole}\n`;
      text += `Current Role: ${profile.currentRole} | Timeline: ${profile.timelineMonths} months\n\n`;
      
      studyPlan.roadmap.forEach(week => {
          text += `## Week ${week.weekNumber}: ${week.theme}\n`;
          text += `${week.description}\n`;
          week.tasks.forEach(task => {
              text += `- [${task.completed ? 'x' : ' '}] ${task.description} (${task.estimatedHours}h) [${task.difficulty || 'Medium'}]\n`;
          });
          
          if (week.notes) {
              text += `\n**Notes:**\n${week.notes}\n`;
          }
          text += `\n`;
      });

      text += `## Portfolio Projects\n`;
      studyPlan.projectIdeas.forEach(proj => {
          text += `### ${proj.title} (${proj.difficulty})\n`;
          text += `${proj.problem}\n\n`;
      });
      return text;
  };

  const handleExportMarkdown = () => {
      const text = getPlanAsText();
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `career-roadmap-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportMenuOpen(false);
  };

  const handleCopyToClipboard = async () => {
      try {
          await navigator.clipboard.writeText(getPlanAsText());
          showToast("Roadmap copied to clipboard!");
      } catch (err) {
          showToast("Failed to copy");
      }
      setExportMenuOpen(false);
  };

  const handleExportPDF = () => {
      if (!studyPlan || !profile) return;
      
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(22);
      doc.setTextColor(79, 70, 229); // Indigo 600
      doc.text(`Career Roadmap: ${profile.targetRole}`, 20, 20);
      
      // Subtitle
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Generated by AI Career Coach | ${profile.timelineMonths} Month Plan`, 20, 30);
      
      let yPos = 45;

      // Iterate Weeks
      studyPlan.roadmap.forEach(week => {
          // Check for page break
          if (yPos > 250) {
              doc.addPage();
              yPos = 20;
          }

          doc.setFontSize(14);
          doc.setTextColor(0);
          doc.setFont("helvetica", "bold");
          doc.text(`Week ${week.weekNumber}: ${week.theme}`, 20, yPos);
          yPos += 7;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(80);
          
          const splitDesc = doc.splitTextToSize(week.description, 170);
          doc.text(splitDesc, 20, yPos);
          yPos += (splitDesc.length * 5) + 5;

          week.tasks.forEach(task => {
              if (yPos > 270) {
                 doc.addPage();
                 yPos = 20;
              }
              doc.text(`• ${task.description} (${task.estimatedHours}h) - ${task.difficulty || 'Medium'}`, 25, yPos);
              yPos += 5;
          });
          
          if (week.notes) {
              if (yPos > 260) {
                 doc.addPage();
                 yPos = 20;
              }
              yPos += 2;
              doc.setFont("helvetica", "italic");
              doc.setTextColor(100);
              const splitNotes = doc.splitTextToSize(`Notes: ${week.notes}`, 170);
              doc.text(splitNotes, 25, yPos);
              yPos += (splitNotes.length * 5);
              doc.setTextColor(80);
              doc.setFont("helvetica", "normal");
          }

          yPos += 10;
      });

      doc.save("career-roadmap.pdf");
      setExportMenuOpen(false);
  };

  const currentWeekData = studyPlan?.roadmap.find(w => w.weekNumber === selectedWeek);
  const currentWeekIndex = studyPlan?.roadmap.findIndex(w => w.weekNumber === selectedWeek) ?? -1;

  // Estimation Calculation for Profile View
  const estimation = studyPlan && profile ? calculateTimeEstimation(studyPlan, profile) : { totalRemainingHours: 0, hoursPerWeek: 10 };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row overflow-hidden font-sans">
      
      {showConfetti && <Confetti />}

      {/* Toast Notification */}
      {toastMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[70] bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-fade-in-down">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">{toastMessage}</span>
          </div>
      )}

      {/* Badge Unlock Notification */}
      {badgeToast && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[80] bg-white border-2 border-yellow-400 text-slate-800 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-scale-in">
              <div className="text-4xl">{badgeToast.icon}</div>
              <div>
                <p className="text-xs font-bold text-yellow-600 uppercase tracking-wider">Badge Unlocked!</p>
                <p className="text-lg font-bold">{badgeToast.name}</p>
                <p className="text-sm text-slate-500">{badgeToast.description}</p>
              </div>
          </div>
      )}

      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <h1 className="text-lg font-bold text-slate-800">AI Career Coach</h1>
        </div>
        <div className="flex items-center gap-2">
            {studyPlan && (
                 <button onClick={handleEditRequest} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <Edit3 className="w-5 h-5" />
                 </button>
            )}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600">
                {mobileMenuOpen ? <X /> : <Menu />}
            </button>
        </div>
      </div>

      {/* Confirmation Modal: Edit Profile */}
      {showEditConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl animate-scale-in">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Edit Profile & Regenerate?</h3>
                <p className="text-slate-600 mb-6 text-sm">
                    This will delete your current roadmap and progress. You'll get a fresh plan based on your new preferences.
                </p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setShowEditConfirm(false)}
                        className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmEdit}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                    >
                        Confirm & Restart
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Confirmation Modal: Reset Progress */}
      {showResetProgressConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl animate-scale-in">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Reset All Progress?</h3>
                <p className="text-slate-600 mb-6 text-sm">
                    This will clear all completed tasks, streaks, badges, and weekly progress. Your roadmap will remain, but you'll start from 0%. <br/><br/>
                    <strong>This action cannot be undone.</strong>
                </p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setShowResetProgressConfirm(false)}
                        className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmResetProgress}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700"
                    >
                        Reset Progress
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Reschedule Modal */}
      <RescheduleModal 
          isOpen={showRescheduleModal} 
          onClose={() => setShowRescheduleModal(false)}
          currentStartDate={profile?.startDate}
          onConfirm={confirmReschedule}
      />

      {/* Left Panel: Onboarding / Settings */}
      <div className={`
        fixed lg:static inset-0 z-40 bg-white lg:bg-transparent transform transition-transform duration-300 ease-in-out lg:transform-none lg:w-96 lg:flex-shrink-0 flex flex-col border-r border-slate-200
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
         <div className="h-full bg-white p-6 shadow-sm overflow-hidden flex flex-col custom-scrollbar overflow-y-auto">
            {!studyPlan ? (
                 <OnboardingForm onSubmit={handleSubmit} isLoading={loading} initialData={profile} />
            ) : (
                <div className="flex flex-col h-full">
                    {/* Header with Edit Button (Desktop) */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                          <h2 className="text-xl font-bold text-slate-800">Your Profile</h2>
                          <div className="mt-2"><LanguageSelector /></div>
                        </div>
                        <button 
                            onClick={handleEditRequest}
                            className="text-xs flex items-center gap-1 text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                        >
                            <Edit3 className="w-3 h-3" /> Edit
                        </button>
                    </div>

                    {/* Engagement Widget */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                            <div className="flex items-center gap-1 text-orange-600 font-bold mb-1">
                                <Flame className="w-4 h-4 fill-orange-600" />
                                <span>Streak</span>
                            </div>
                            <span className="text-2xl font-black text-slate-800">{profile?.streak?.currentStreak || 0}</span>
                            <span className="text-[10px] text-slate-500">Days Active</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                             <div className="flex items-center gap-1 text-blue-600 font-bold mb-1">
                                <Trophy className="w-4 h-4 fill-blue-600" />
                                <span>Badges</span>
                            </div>
                             <span className="text-2xl font-black text-slate-800">{profile?.badges?.length || 0}</span>
                            <span className="text-[10px] text-slate-500">Unlocked</span>
                        </div>
                    </div>

                    <div className="space-y-3 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                             <div className="flex flex-col">
                                <span className="text-xs uppercase font-bold text-slate-400">Current</span>
                                <span className="font-medium text-slate-900">{profile?.currentRole}</span>
                             </div>
                             <div className="flex flex-col">
                                <span className="text-xs uppercase font-bold text-slate-400">Target</span>
                                <span className="font-medium text-slate-900">{profile?.targetRole}</span>
                             </div>
                             <div className="flex flex-col">
                                <span className="text-xs uppercase font-bold text-slate-400">Timeline</span>
                                <span className="font-medium text-slate-900">{profile?.timelineMonths} Months</span>
                             </div>
                             {profile?.startDate && (
                                <div className="flex flex-col">
                                    <span className="text-xs uppercase font-bold text-slate-400">Start Date</span>
                                    <span className="font-medium text-slate-900">{new Date(profile.startDate).toLocaleDateString()}</span>
                                </div>
                             )}
                    </div>
                    
                    {/* Time Estimation */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
                         <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Completion Estimate</h4>
                         <div className="flex justify-between items-end">
                            <div>
                                <p className="text-xl font-bold text-indigo-900">{estimation.totalRemainingHours} hrs</p>
                                <p className="text-[10px] text-indigo-600">Remaining workload</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-indigo-900">~{Math.ceil(estimation.totalRemainingHours / estimation.hoursPerWeek)} weeks</p>
                                <p className="text-[10px] text-indigo-600">at {estimation.hoursPerWeek}h/week pace</p>
                            </div>
                         </div>
                    </div>

                    {/* Badge Display */}
                    <div className="mb-4">
                        <BadgeDisplay unlockedBadges={profile?.badges || []} />
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-100 space-y-2">
                        <button 
                            onClick={handleResetProgressRequest}
                            className="w-full flex items-center justify-start gap-3 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 p-2 rounded-lg transition-colors font-medium"
                        >
                            <RefreshCcw className="w-4 h-4 text-slate-400" />
                            Reset Progress Only
                        </button>

                        <button 
                            onClick={handleRescheduleRequest}
                            className="w-full flex items-center justify-start gap-3 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 p-2 rounded-lg transition-colors font-medium"
                        >
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>Reschedule Timeline</span>
                            {profile?.rescheduleCount && profile.rescheduleCount > 0 && (
                                <span className="ml-auto text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                                    {profile.rescheduleCount}x
                                </span>
                            )}
                        </button>

                        <button 
                            onClick={handleResetAllData}
                            className="w-full flex items-center justify-start gap-3 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors font-medium"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Profile & Plan
                        </button>
                    </div>
                </div>
            )}
         </div>
      </div>

      {/* Right Panel: Content */}
      <main className="flex-1 flex flex-col h-[calc(100vh-64px)] lg:h-screen overflow-hidden relative">
        
        {loading && !studyPlan && (
            <AIThoughtScreen 
              isLoading={loading}
              targetRole={profile?.targetRole}
              timelineMonths={profile?.timelineMonths}
              hasCV={!!profile?.cvText}
            />
        )}

        {!studyPlan && !loading && (
             <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
                 <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6 text-indigo-500">
                        <Map className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Ready to switch careers?</h2>
                    <p className="text-slate-500">Fill out the form on the left to generate your personalized AI study plan.</p>
                 </div>
             </div>
        )}

        {error && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-white/90">
                <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 max-w-md shadow-lg flex flex-col items-center text-center">
                    <AlertCircle className="w-10 h-10 mb-3" />
                    <h3 className="text-lg font-bold mb-2">Something went wrong</h3>
                    <p className="mb-4 text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="px-4 py-2 bg-white border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50">Dismiss</button>
                </div>
            </div>
        )}

        {studyPlan && (
            <>
                {/* Tabs */}
                <div className="bg-white border-b border-slate-200 px-6 pt-4 flex-none shadow-sm z-20 flex justify-between items-center">
                    <div className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab('roadmap')}
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                activeTab === 'roadmap' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Map className="w-4 h-4" />
                            Roadmap
                        </button>
                        <button
                            onClick={() => setActiveTab('weekly')}
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                activeTab === 'weekly' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Calendar className="w-4 h-4" />
                            This Week <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px] ml-1">W{selectedWeek}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                activeTab === 'projects' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Briefcase className="w-4 h-4" />
                            Project Ideas
                        </button>
                    </div>

                    {/* Export Dropdown */}
                    <div className="relative mb-2" ref={exportMenuRef}>
                        <button 
                            onClick={() => setExportMenuOpen(!exportMenuOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>

                        {exportMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-scale-in origin-top-right">
                                <button onClick={handleExportPDF} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> PDF
                                </button>
                                <button onClick={handleExportMarkdown} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2">
                                    <Download className="w-4 h-4" /> Markdown
                                </button>
                                <button onClick={handleCopyToClipboard} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2">
                                    <Copy className="w-4 h-4" /> Copy to Clipboard
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden p-4 md:p-6 lg:p-8 bg-slate-50/50 relative">
                     <div className="max-w-5xl mx-auto h-full">
                        {activeTab === 'roadmap' && (
                            <RoadmapView 
                                roadmap={studyPlan.roadmap} 
                                onSelectWeek={(week) => {
                                    handleWeekSelect(week);
                                }}
                                selectedWeek={selectedWeek}
                                startDate={profile?.startDate}
                                onUpdateNotes={handleUpdateNotes}
                            />
                        )}
                        {activeTab === 'weekly' && currentWeekData && (
                            <WeeklyView 
                                weekData={currentWeekData}
                                strategy={studyPlan.weeklyStrategy}
                                roadmap={studyPlan.roadmap}
                                currentWeekIndex={currentWeekIndex}
                                onToggleTask={(idx) => handleToggleTask(currentWeekIndex, idx)}
                                onRegenerate={handleRegenerateWeek}
                                isRegenerating={regeneratingWeek}
                                onNavigateWeek={handleNavigateWeek}
                                userAvailability={profile?.availability}
                                startDate={profile?.startDate}
                                onUpdateNotes={handleUpdateNotes}
                            />
                        )}
                        {activeTab === 'projects' && (
                            <ProjectIdeasView projects={studyPlan.projectIdeas} />
                        )}
                     </div>
                </div>
            </>
        )}
      </main>
      
      {/* AI Chat Assistant / Agent */}
      <ChatAssistant 
        currentWeek={currentWeekData} 
        targetRole={profile?.targetRole}
      />
      
      {/* New Agent Panel (LangGraph powered) */}
      <AgentPanel 
        currentWeek={currentWeekData} 
        targetRole={profile?.targetRole}
        userProfile={profile}
        roadmapState={studyPlan?.roadmap}
      />
    </div>
  );
};

export default App;