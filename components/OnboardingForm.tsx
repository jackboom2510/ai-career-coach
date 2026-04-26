import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserProfile, TimeAvailability, LearningStyle, CVAnalysisResult } from '../types';
import { Loader2, Sparkles, ChevronRight, Upload, FileText, X, CheckCircle2, AlertTriangle, ScanEye, Calendar } from 'lucide-react';
import { Globe } from 'lucide-react';
import { analyzeCV } from '../services/geminiService';

const languages = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

const OnboardingForm: React.FC<Props> = ({ onSubmit, isLoading, initialData }) => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState<UserProfile>(
    initialData || {
      currentRole: '',
      targetRole: '',
      currentSkills: '',
      weakAreas: '',
      availability: TimeAvailability.Medium,
      learningStyle: LearningStyle.HandsOn,
      timelineMonths: 3,
      cvText: '',
      startDate: new Date().toISOString().split('T')[0]
    }
  );
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  
  // CV Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cvAnalysis, setCvAnalysis] = useState<CVAnalysisResult | null>(null);

  useEffect(() => {
    if (initialData?.cvText && !fileName) {
        setFileName("Uploaded CV.txt");
    }
  }, [initialData, fileName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const runAnalysis = async (text: string, targetRole: string) => {
    if (!text || !targetRole) return;
    setIsAnalyzing(true);
    try {
        const result = await analyzeCV(text, targetRole);
        setCvAnalysis(result);
    } catch (e) {
        console.error("Failed to analyze CV", e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setFormData(prev => ({ ...prev, cvText: text }));
        
        if (formData.targetRole) {
            runAnalysis(text, formData.targetRole);
        }
      };
      reader.readAsText(file);
    }
  };

  const clearFile = () => {
    setFileName('');
    setFormData(prev => ({ ...prev, cvText: '' }));
    setCvAnalysis(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <Globe className="w-3 h-3" />
            {i18n.language === 'vi' ? 'EN' : 'VI'}
          </button>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-600" />
          {t('onboarding.title')}
        </h2>
        <p className="text-slate-600 mt-2 text-sm">
          {t('onboarding.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.currentRole')}</label>
          <input
            type="text"
            name="currentRole"
            required
            value={formData.currentRole}
            onChange={handleChange}
            placeholder={t('onboarding.currentRolePlaceholder')}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.targetRole')}</label>
          <input
            type="text"
            name="targetRole"
            required
            value={formData.targetRole}
            onChange={handleChange}
            onBlur={() => {
                if (formData.cvText && !cvAnalysis && !isAnalyzing) {
                    runAnalysis(formData.cvText, formData.targetRole);
                }
            }}
            placeholder={t('onboarding.targetRolePlaceholder')}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* CV Upload Section */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 border-dashed">
            <label className="block text-sm font-medium text-slate-700 mb-2">Upload CV (Optional)</label>
            <p className="text-xs text-slate-500 mb-3">Upload a text-based file (.txt, .md) to help Gemini align the roadmap with your specific skill gaps.</p>
            
            {!fileName ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer flex items-center justify-center gap-2 p-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 text-sm font-medium"
                >
                    <Upload className="w-4 h-4" />
                    Select File
                </div>
            ) : (
                <div className="flex items-center justify-between p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <div className="flex items-center gap-2 text-indigo-700 text-sm overflow-hidden">
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{fileName}</span>
                    </div>
                    <button type="button" onClick={clearFile} className="text-slate-400 hover:text-slate-600 p-1">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.md,.json,.csv"
                className="hidden"
            />
        </div>

        {/* CV Analysis Result Card */}
        {isAnalyzing && (
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-center gap-3 animate-pulse">
                <ScanEye className="w-5 h-5 text-indigo-500 animate-pulse" />
                <span className="text-sm text-indigo-700 font-medium">Analyzing your CV against target role...</span>
            </div>
        )}

        {cvAnalysis && !isAnalyzing && (
            <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm border-b border-slate-100 pb-2">
                    <Sparkles className="w-4 h-4" />
                    CV Analysis Summary
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <span className="text-xs font-bold text-slate-500 uppercase">Detected</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {cvAnalysis.detectedSkills.slice(0, 4).map((skill, i) => (
                                <span key={i} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 flex items-center gap-1">
                                    <CheckCircle2 className="w-2 h-2" /> {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 uppercase">Missing</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                             {cvAnalysis.missingSkills.slice(0, 4).map((skill, i) => (
                                <span key={i} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 flex items-center gap-1">
                                    <AlertTriangle className="w-2 h-2" /> {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
                <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded">
                    "{cvAnalysis.gapAnalysisSummary}"
                </p>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Skills</label>
            <textarea
              name="currentSkills"
              required
              value={formData.currentSkills}
              onChange={handleChange}
              rows={3}
              placeholder="Python, Excel, SQL..."
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Weak Areas</label>
            <textarea
              name="weakAreas"
              required
              value={formData.weakAreas}
              onChange={handleChange}
              rows={3}
              placeholder="Math, Deep Learning theory..."
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
          <div className="relative">
             <input
                type="date"
                name="startDate"
                required
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-4 py-2 pl-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
             />
             <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Weekly Availability</label>
          <select
            name="availability"
            value={formData.availability}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          >
            {Object.values(TimeAvailability).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Learning Style</label>
          <select
            name="learningStyle"
            value={formData.learningStyle}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          >
            {Object.values(LearningStyle).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Timeline (Months)</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              name="timelineMonths"
              min="1"
              max="12"
              value={formData.timelineMonths}
              onChange={handleChange}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-sm font-semibold text-indigo-600 min-w-[3rem] text-center">
              {formData.timelineMonths} mo
            </span>
          </div>
        </div>
      </form>
      
      <div className="pt-6 mt-auto">
         <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Plan...
              </>
            ) : (
              <>
                Generate Career Roadmap
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
      </div>
    </div>
  );
};

export default OnboardingForm;