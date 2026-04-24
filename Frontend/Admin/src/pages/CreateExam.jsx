import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, Clock, Users, Award, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

export default function CreateExam() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [examData, setExamData] = useState({
    title: "",
    subject: "",
    description: "Please complete this proctored examination carefully. AI monitoring is active.",
    duration: 60,
    totalMarks: 100,
    passingMarks: 40,
    startTime: "",
    endTime: "",
  });

  const [questions, setQuestions] = useState([
    {
      id: Date.now(),
      type: "mcq",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      marks: 5,
    }
  ]);

  const [showPreview, setShowPreview] = useState(false);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        type: "mcq",
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        marks: 5,
      }
    ]);
  };

  const removeQuestion = (id) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const updateOption = (qId, index, value) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOptions = [...q.options];
        newOptions[index] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    // Basic Validation
    if (!examData.title || !examData.subject || !examData.startTime || !examData.endTime) {
      setError("Please fill in all required exam details.");
      setLoading(false);
      return;
    }

    // Format data for backend
    const formattedQuestions = questions.map(q => ({
  type: q.type,
  question: q.question,
  options: q.type === 'mcq'
    ? q.options.map(o => String(o).trim())
    : q.type === 'truefalse'
    ? ['True', 'False']
    : [],
  correctAnswer: q.correctAnswer,
  marks: q.marks
}));

    const body = {
      ...examData,
      questions: formattedQuestions
    };

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + "/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create exam");
      }

      alert("✅ Exam published successfully!");
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || "Something went wrong while publishing the exam.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Create New Exam</h1>
          <p className="text-slate-500 mt-2">Build a proctored examination with AI monitoring</p>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={() => setShowPreview(true)} disabled={loading}>
            Preview Exam
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-5 h-5 mr-1" />
            {loading ? "Publishing..." : "Publish Exam"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Exam Settings */}
        <div className="lg:col-span-12 xl:col-span-5">
          <Card className="p-8 sticky top-8">
            <h2 className="text-2xl font-semibold mb-8">Exam Settings</h2>

            <div className="space-y-8">
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-2">Exam Title *</label>
                <input
                  type="text"
                  required
                  value={examData.title}
                  onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                  placeholder="Mid-Term Examination - Computer Science"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:border-indigo-500 text-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">Subject *</label>
                  <input
                    type="text"
                    required
                    value={examData.subject}
                    onChange={(e) => setExamData({ ...examData, subject: e.target.value })}
                    placeholder="Data Structures"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">Duration (minutes) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={examData.duration}
                    onChange={(e) => setExamData({ ...examData, duration: parseInt(e.target.value) || 0 })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">Total Marks *</label>
                  <input
                    type="number"
                    required
                    value={examData.totalMarks}
                    onChange={(e) => setExamData({ ...examData, totalMarks: parseInt(e.target.value) || 0 })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">Passing Marks *</label>
                  <input
                    type="number"
                    required
                    value={examData.passingMarks}
                    onChange={(e) => setExamData({ ...examData, passingMarks: parseInt(e.target.value) || 0 })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={examData.startTime}
                    onChange={(e) => setExamData({ ...examData, startTime: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={examData.endTime}
                    onChange={(e) => setExamData({ ...examData, endTime: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Question Builder */}
        <div className="lg:col-span-12 xl:col-span-7">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Questions ({questions.length})</h2>
            <Button onClick={addQuestion}>
              <Plus className="w-5 h-5 mr-1" />
              Add Question
            </Button>
          </div>

          <AnimatePresence>
            {questions.map((q, index) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-8"
              >
                <Card className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-semibold">
                        Q{index + 1}
                      </div>
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(q.id, "type", e.target.value)}
                        className="bg-slate-100 border-0 rounded-2xl px-5 py-2 text-sm font-medium"
                      >
                        <option value="mcq">Multiple Choice</option>
                        <option value="truefalse">True / False</option>
                        <option value="short">Short Answer</option>
                      </select>
                    </div>

                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="text-red-500 hover:text-red-600 p-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <textarea
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, "question", e.target.value)}
                    placeholder="Enter your question here..."
                    className="w-full h-28 px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:border-indigo-500 resize-y min-h-[110px] text-lg"
                  />

                  {/* MCQ / TrueFalse Options */}
                  {(q.type === "mcq" || q.type === "truefalse") && (
                    <div className="mt-8 space-y-4">
                      {(q.type === "mcq" ? q.options : ["True", "False"]).map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-4">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctAnswer === optIndex}
                            onChange={() => updateQuestion(q.id, "correctAnswer", optIndex)}
                            className="w-5 h-5 accent-indigo-600"
                          />
                          <input
                            type="text"
                            value={option}
                            readOnly={q.type === "truefalse"}
                            onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                            placeholder={`Option ${optIndex + 1}`}
                            className={`flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:border-indigo-500 ${q.type === "truefalse" ? "bg-slate-100 cursor-not-allowed" : ""}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-8 flex justify-end">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500">Marks</span>
                      <input
                        type="number"
                        min="1"
                        value={q.marks}
                        onChange={(e) => updateQuestion(q.id, "marks", parseInt(e.target.value) || 0)}
                        className="w-20 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Exam Preview"
        size="xl"
      >
        <div className="space-y-8">
          <div className="bg-slate-50 p-8 rounded-3xl">
            <h3 className="text-2xl font-semibold mb-2">{examData.title || "Untitled Exam"}</h3>
            <p className="text-slate-600">{examData.subject || "No Subject"}</p>
            <div className="flex flex-wrap gap-x-8 gap-y-4 mt-6 text-sm text-slate-500">
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {examData.duration} minutes</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Proctored</div>
              <div className="flex items-center gap-2"><Award className="w-4 h-4" /> {examData.totalMarks} marks</div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-semibold text-lg px-2">Question Samples</h4>
            {questions.map((q, i) => (
              <div key={q.id} className="p-6 border border-slate-100 rounded-3xl">
                <p className="font-medium text-slate-800">Q{i+1}: {q.question || "..."}</p>
                {q.type === 'mcq' && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={`px-4 py-2 rounded-xl text-sm border ${q.correctAnswer === oi ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-500'}`}>
                        {opt || `Option ${oi+1}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}