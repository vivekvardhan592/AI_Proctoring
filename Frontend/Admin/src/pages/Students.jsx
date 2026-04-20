import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Search, UserX, AlertTriangle, UserCircle, Mail, Calendar, ShieldAlert } from 'lucide-react';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // For Status Updates
  const [studentToVerify, setStudentToVerify] = useState(null);
  
  // For Delete Confirmation Modal
  const [studentToDelete, setStudentToDelete] = useState(null);

  const token = localStorage.getItem('token');

  const fetchStudents = async () => {
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
      } else {
        setError(data.message || 'Failed to fetch students.');
      }
    } catch (err) {
      setError('Network error connecting to the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [token]);

  const handleDelete = async () => {
    if (!studentToDelete) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/student/${studentToDelete._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setStudents(students.filter(s => s._id !== studentToDelete._id));
        setStudentToDelete(null);
      } else {
        alert(data.message || 'Failed to delete student');
      }
    } catch (err) {
      alert('Error connecting to server to delete student');
    }
  };

  const handleVerify = async (status) => {
    if (!studentToVerify) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/student/${studentToVerify._id}/verify`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      
      if (data.success) {
        setStudents(students.map(s => s._id === studentToVerify._id ? { ...s, verificationStatus: status, faceImage: status === 'rejected' ? '' : s.faceImage } : s));
        setStudentToVerify(null);
      } else {
        alert(data.message || 'Failed to update student verification status');
      }
    } catch (err) {
      alert('Error connecting to server');
    }
  };

  const filteredStudents = students.filter(student => 
    student.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-[1400px] mx-auto min-h-screen text-slate-800 bg-slate-50 font-sans">
      
      {/* Header Section */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ duration: 0.4 }}
        className="mb-12 border-b border-slate-200 pb-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">
              Student Directory
            </h1>
            <p className="text-slate-500 font-medium max-w-xl text-lg">
              Monitor active students and manage system access privileges within the main platform.
            </p>
          </div>
          
          <div className="w-full md:w-80">
            <div className="relative flex items-center bg-white border border-slate-200 shadow-sm rounded-xl transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100/50 hover:shadow-md">
              <Search className="absolute left-4 text-indigo-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-transparent border-none
                text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-5">
           <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
           <p className="mt-4 text-indigo-600 font-bold uppercase tracking-widest text-sm animate-pulse">Loading Records...</p>
        </div>
      ) : error ? (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="p-8 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4 text-left shadow-sm"
        >
          <ShieldAlert className="text-red-500 flex-shrink-0" size={32} />
          <div>
            <h2 className="text-base font-bold text-red-800 mb-1">Retrieval Failed</h2>
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  key={student._id} 
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-indigo-50/50 rounded-xl text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                        <UserCircle size={28} strokeWidth={2} />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100">
                          STUDENT
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border
                          ${student.verificationStatus === 'verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            student.verificationStatus === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            student.verificationStatus === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                            'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                          {student.verificationStatus || 'unregistered'}
                        </span>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-xl font-bold text-slate-900 truncate tracking-tight">{student.name}</h3>
                      <p className="text-[11px] font-mono font-bold text-slate-400 truncate mt-1">
                        ID_{student._id}
                      </p>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-3 text-slate-500 font-medium">
                        <Mail size={16} className="text-slate-400" />
                        <span className="text-sm truncate">{student.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 font-medium">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-sm">
                          {new Date(student.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2">
                    {student.verificationStatus === 'pending' && (
                      <button
                        onClick={() => setStudentToVerify(student)}
                        className="w-full justify-center py-2.5 rounded-xl text-[11px] font-black tracking-widest uppercase
                        bg-amber-100 border border-amber-200 text-amber-700 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                      >
                        REVIEW FACE IMAGE
                      </button>
                    )}
                    <button
                      onClick={() => setStudentToDelete(student)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black tracking-widest uppercase
                      bg-white border border-red-100 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm"
                    >
                      <Trash2 size={16} />
                      <span>Remove Access</span>
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-[3rem] bg-white text-center shadow-sm"
              >
                <div className="p-5 bg-slate-100 rounded-full mb-5">
                  <UserX size={36} className="text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Results Match</h3>
                <p className="text-slate-500 font-medium max-w-sm">We couldn't find any students matching your search criteria.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* TERMINATE CONFIRMATION MODAL */}
      <AnimatePresence>
        {studentToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setStudentToDelete(null)}
            />
            
            {/* Modal */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100"
            >
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center border border-red-100 mb-6 shadow-inner">
                  <AlertTriangle size={36} />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900 mb-3">Delete Account</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Are you sure you want to completely remove <strong className="text-slate-900">{studentToDelete.name}</strong>? 
                  This will permanently drop their account and all accumulated exam histories.
                </p>
              </div>
              
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setStudentToDelete(null)}
                  className="flex-1 py-4 text-[11px] font-black tracking-widest text-slate-500 uppercase hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-4 text-[11px] font-black tracking-widest text-white uppercase bg-red-600 hover:bg-red-500 rounded-2xl transition-all shadow-lg shadow-red-200"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REVIEW CONFIRMATION MODAL */}
      <AnimatePresence>
        {studentToVerify && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setStudentToVerify(null)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <h3 className="text-2xl font-black tracking-tight text-slate-900 mb-2">Identity Verification</h3>
                <p className="text-slate-500 font-medium">
                  Review the face capture submitted by <strong className="text-slate-900">{studentToVerify.name}</strong>.
                </p>
              </div>

              {studentToVerify.faceImage ? (
                <div className="bg-slate-100 p-2 rounded-2xl border border-slate-200 mb-8 max-h-[300px] overflow-hidden flex justify-center items-center">
                  <img src={studentToVerify.faceImage} alt="Identity Proof" className="max-w-full rounded-xl object-contain" />
                </div>
              ) : (
                <div className="bg-slate-100 p-8 rounded-2xl border border-slate-200 mb-8 text-center text-slate-500">
                  No image provided.
                </div>
              )}
              
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => handleVerify('rejected')}
                  className="flex-1 py-4 text-[11px] font-black tracking-widest text-white uppercase bg-red-600 hover:bg-red-500 rounded-2xl transition-all shadow-lg shadow-red-200"
                >
                  Reject & Re-request
                </button>
                <button
                  onClick={() => handleVerify('verified')}
                  className="flex-1 py-4 text-[11px] font-black tracking-widest text-white uppercase bg-emerald-600 hover:bg-emerald-500 rounded-2xl transition-all shadow-lg shadow-emerald-200"
                >
                  Verify Access
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
