import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Bot, Loader2, Sparkles, RotateCcw, Zap } from 'lucide-react';
import { agentService } from '../services/agentService';
import { RoadmapWeek } from '../types';

interface AgentMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

interface AgentPanelProps {
  currentWeek?: RoadmapWeek;
  targetRole?: string;
  userProfile?: any;
  roadmapState?: any[];
}

const AgentPanel: React.FC<AgentPanelProps> = ({
  currentWeek,
  targetRole,
  userProfile,
  roadmapState,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([
    { 
      role: 'model', 
      text: 'Hi! I\'m your AI coach powered by a LangGraph agent with web search and memory capabilities. I can research job markets, validate resources, and track your learning journey. What would you like help with?',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    agentService.checkHealth().then(health => {
      setAgentStatus(health ? 'ready' : 'unavailable');
    }).catch(() => {
      setAgentStatus('unavailable');
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg: AgentMessage = { role: 'user', text: inputValue, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await agentService.sendMessage({
        message: userMsg.text,
        user_profile: userProfile ? {
          target_role: targetRole || '',
          current_role: userProfile.currentRole || '',
          timeline_months: userProfile.timelineMonths || 6,
        } : undefined,
        roadmap_state: roadmapState,
        current_week: currentWeek?.weekNumber || 1,
        user_id: 'default',
      });

      setMessages(prev => [...prev, {
        role: 'model',
        text: response.response,
        timestamp: Date.now()
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: 'Sorry, I\'m having trouble connecting to the agent service. Make sure the backend server is running on port 8000.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    setMessages([{
      role: 'model',
      text: 'Conversation reset! I\'m ready to help you again.',
      timestamp: Date.now()
    }]);
    agentService.resetConversation();
  };

  const suggestedQuestions = [
    { q: "What's the demand for " + (targetRole || 'this role') + " in 2026?", icon: "📊" },
    { q: "How's my learning pace compared to my timeline?", icon: "⏱️" },
    { q: "Can you find better resources for this week's topic?", icon: "🔍" },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center ${isOpen ? 'hidden' : 'flex'}`}
      >
        <Sparkles className="w-7 h-7" />
      </button>

      <div 
        className={`fixed inset-y-0 right-0 z-[60] w-full sm:w-[440px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                AI Agent Coach
                {agentStatus === 'ready' && (
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                )}
              </h3>
              <p className="text-xs text-indigo-100 opacity-90">
                {agentStatus === 'ready' ? '9 tools available' : 'Connecting...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleReset}
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
              title="Reset conversation"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 custom-scrollbar">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div 
                  className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-md' 
                      : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          {messages.length < 3 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
              {suggestedQuestions.map((item, i) => (
                <button 
                  key={i}
                  onClick={() => { setInputValue(item.q); }}
                  className="text-xs whitespace-nowrap bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 px-3 py-2 rounded-full border border-indigo-200 transition-colors flex items-center gap-1"
                >
                  <span>{item.icon}</span>
                  <span className="max-w-[150px] truncate">{item.q}</span>
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about jobs, resources, pace..."
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all"
              disabled={agentStatus === 'unavailable'}
            />
            <button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping || agentStatus === 'unavailable'}
              className="absolute right-2 top-2 p-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          {agentStatus === 'unavailable' && (
            <p className="text-xs text-amber-600 mt-2">
              Agent service unavailable. Start backend: <code>cd backend && uvicorn main:app --port 8000</code>
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default AgentPanel;