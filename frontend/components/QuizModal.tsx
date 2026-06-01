import React, { useState, useEffect } from 'react';
import { generateQuizForWeek } from '../services/geminiService';
import { X, CheckCircle, AlertCircle, Loader2, BrainCircuit } from 'lucide-react';

interface QuizModalProps {
  isOpen: boolean;
  theme: string;
  onPassed: () => void;
  onFailed: () => void;
  onClose: () => void;
}

const QuizModal: React.FC<QuizModalProps> = ({ isOpen, theme, onPassed, onFailed, onClose }) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Tự động gọi Gemini soạn đề khi Modal được mở lên
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setIsSubmitted(false);
      setScore(0);
      setAnswers([]);
      
      generateQuizForWeek(theme).then(q => {
        setQuestions(q);
        setAnswers(new Array(q.length).fill(-1));
        setLoading(false);
      });
    }
  }, [isOpen, theme]);

  if (!isOpen) return null;

  const handleSelect = (qIndex: number, optIndex: number) => {
    if (isSubmitted) return;
    const newAns = [...answers];
    newAns[qIndex] = optIndex;
    setAnswers(newAns);
  };

  const handleSubmit = () => {
    let currentScore = 0;
    answers.forEach((ans, i) => {
      if (ans === questions[i].correctIndex) currentScore++;
    });
    setScore(currentScore);
    setIsSubmitted(true);
  };

  const handleFinish = () => {
    // Yêu cầu đúng ít nhất 2/3 câu mới cho qua
    if (score >= 2) onPassed();
    else onFailed();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-scale-in">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Knowledge Check</h2>
              <p className="text-sm text-slate-500 line-clamp-1">{theme}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-indigo-600">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <p className="font-medium animate-pulse">AI Coach đang soạn đề kiểm tra riêng cho bạn...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="space-y-3">
                  <h3 className="font-bold text-slate-800 flex gap-2">
                    <span className="text-indigo-600">Câu {qIndex + 1}:</span> 
                    {q.question}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt: string, optIndex: number) => {
                      const isSelected = answers[qIndex] === optIndex;
                      const isCorrect = optIndex === q.correctIndex;
                      
                      let btnClass = "text-left p-3.5 rounded-xl border text-sm font-medium transition-all duration-200 ";
                      
                      if (!isSubmitted) {
                        btnClass += isSelected 
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700" 
                            : "border-slate-200 hover:border-indigo-300 text-slate-600 hover:bg-slate-50";
                      } else {
                        if (isCorrect) {
                            btnClass += "border-green-500 bg-green-50 text-green-700";
                        } else if (isSelected && !isCorrect) {
                            btnClass += "border-red-500 bg-red-50 text-red-700";
                        } else {
                            btnClass += "border-slate-100 bg-slate-50 text-slate-400 opacity-50";
                        }
                      }

                      return (
                        <button 
                            key={optIndex} 
                            disabled={isSubmitted} 
                            onClick={() => handleSelect(qIndex, optIndex)} 
                            className={btnClass}
                        >
                          <div className="flex items-center justify-between">
                            <span>{opt}</span>
                            {isSubmitted && isCorrect && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {isSubmitted && isSelected && !isCorrect && <AlertCircle className="w-4 h-4 text-red-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Box Báo Kết quả */}
              {isSubmitted && (
                <div className={`p-4 rounded-xl border flex items-center gap-4 animate-scale-in ${score >= 2 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  {score >= 2 ? <CheckCircle className="w-8 h-8 text-green-500" /> : <AlertCircle className="w-8 h-8 text-red-500" />}
                  <div>
                    <p className={`font-bold ${score >= 2 ? 'text-green-800' : 'text-red-800'}`}>
                      {score >= 2 ? 'Chúc mừng! Bạn đã vượt qua bài kiểm tra.' : 'Rất tiếc! Bạn cần đúng ít nhất 2 câu để qua môn.'}
                    </p>
                    <p className="text-sm opacity-80 mt-1">Điểm số của bạn: {score}/{questions.length}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl shrink-0">
            {!isSubmitted ? (
              <button 
                disabled={answers.includes(-1)} 
                onClick={handleSubmit} 
                className="px-6 py-2 bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Nộp bài
              </button>
            ) : (
              <button 
                onClick={handleFinish} 
                className={`px-6 py-2 font-medium rounded-lg text-white transition-colors shadow-sm ${score >= 2 ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-700'}`}
              >
                {score >= 2 ? 'Hoàn thành Tuần học' : 'Đóng & Ôn tập lại'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizModal;