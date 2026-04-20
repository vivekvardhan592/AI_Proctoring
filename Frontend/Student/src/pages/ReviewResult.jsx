import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function ReviewResult() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setSession(data.data);
        } else {
          setError(data.message || "Failed to load attempt details.");
        }
      } catch (err) {
        setError("Network error. Is the backend server running?");
      } finally {
        setLoading(false);
      }
    };

    if (token && sessionId) fetchSession();
  }, [sessionId, token]);

  const getStudentAnswer = (questionId) => {
    const ans = session.answers.find(a => a.questionId.toString() === questionId.toString());
    return ans ? ans.selectedOption : null;
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (error || !session) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
        <p className="text-gray-600 mb-6">{error || "Session not found."}</p>
        <button onClick={() => navigate('/MyResult')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Back to Results</button>
      </div>
    </div>
  );

  const exam = session.examId;
  const isPassed = session.score >= exam.passingMarks;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/MyResult')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
             </button>
             <h1 className="text-xl font-bold text-gray-900">Review Attempt: {exam.title}</h1>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
             {isPassed ? 'Passed' : 'Failed'}
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-6 md:p-10">
          {/* Summary Card */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 mb-10 flex flex-wrap gap-8 items-center justify-between">
             <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Final Performance</p>
                <div className="flex items-baseline gap-2">
                   <span className="text-5xl font-black text-gray-900">{session.score}</span>
                   <span className="text-gray-400 font-bold">/ {exam.totalMarks} Marks</span>
                </div>
             </div>
             
             <div className="flex gap-10">
                <div className="text-center">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Violations</p>
                   <p className={`text-xl font-black ${session.violationsCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{session.violationsCount}</p>
                </div>
                <div className="text-center">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Accuracy</p>
                   <p className="text-xl font-black text-indigo-600">{Math.round((session.score / exam.totalMarks) * 100)}%</p>
                </div>
             </div>
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-8 italic uppercase italic">Detailed Breakdown</h2>

          <div className="space-y-6">
            {exam.questions.map((q, idx) => {
              const studentChoice = getStudentAnswer(q._id);
              const isCorrect = studentChoice === q.correctAnswer;
              
              return (
                <div key={idx} className={`bg-white rounded-[2.5rem] p-8 md:p-10 border-2 transition-all ${isCorrect ? 'border-emerald-50' : 'border-rose-50'}`}>
                  <div className="flex justify-between items-start mb-6">
                     <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Question {idx + 1}</span>
                     <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isCorrect ? `+${q.marks} Marks` : '0 Marks'}
                     </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-8 leading-snug">{q.question}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = studentChoice === optIdx;
                      const isCorrectOpt = q.correctAnswer === optIdx;
                      
                      let borderColor = 'border-gray-100';
                      let bgColor = 'bg-white';
                      let textColor = 'text-gray-600';

                      if (isCorrectOpt) {
                         borderColor = 'border-emerald-500';
                         bgColor = 'bg-emerald-50/50';
                         textColor = 'text-emerald-700 font-bold';
                      } else if (isSelected && !isCorrectOpt) {
                         borderColor = 'border-rose-500';
                         bgColor = 'bg-rose-50/50';
                         textColor = 'text-rose-700 font-bold';
                      }

                      return (
                        <div key={optIdx} className={`p-5 rounded-2xl border-2 flex items-center gap-4 ${borderColor} ${bgColor} ${textColor}`}>
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm
                              ${isCorrectOpt ? 'bg-emerald-500 text-white' : isSelected ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                              {String.fromCharCode(65 + optIdx)}
                           </div>
                           <span className="flex-1">{opt}</span>
                           {isCorrectOpt && (
                              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                           )}
                           {isSelected && !isCorrectOpt && (
                              <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                           )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
