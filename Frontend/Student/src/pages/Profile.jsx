import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { motion } from 'framer-motion';
import { Shield, Camera, Loader, AlertCircle, Fingerprint, Mail, Calendar } from 'lucide-react';

export default function Profile() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Face Registration states
  const [isCapturing, setIsCapturing] = useState(false);
  const [faceImage, setFaceImage] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null); // FIX: track active stream for cleanup
  const token = localStorage.getItem('token');

  // FIX: Stop camera stream on component unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
     const fetchProfile = async () => {
        try {
           const res = await fetch(import.meta.env.VITE_API_URL + "/api/auth/me", {
              headers: { "Authorization": `Bearer ${token}` }
           });
           const data = await res.json();
           if (data.success) {
              setUser(data.data);
              setFaceImage(data.data.faceImage || "");
           }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
     };
     if (token) fetchProfile();
  }, [token]);

  const startCamera = async () => {
     setIsCapturing(true);
     try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream; // FIX: store reference for cleanup
        if (videoRef.current) videoRef.current.srcObject = stream;
     } catch (err) { alert("Camera access denied"); setIsCapturing(false); }
  };

  const captureImage = () => {
     if (!videoRef.current) return;
     const canvas = document.createElement("canvas");
     canvas.width = videoRef.current.videoWidth;
     canvas.height = videoRef.current.videoHeight;
     const ctx = canvas.getContext("2d");
     ctx.drawImage(videoRef.current, 0, 0);
     const base64 = canvas.toDataURL("image/jpeg", 0.7);
     setFaceImage(base64);
     
     // Stop stream
     if (streamRef.current) {
       streamRef.current.getTracks().forEach(t => t.stop());
       streamRef.current = null;
     }
     setIsCapturing(false);
  };

  const handleFaceSubmit = async () => {
     setRegLoading(true);
     try {
        const res = await fetch(import.meta.env.VITE_API_URL + "/api/auth/update-face", {
           method: "PUT",
           headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
           body: JSON.stringify({ faceImage })
        });
        const data = await res.json();
        if (data.success) {
           alert("Face registered successfully! Please wait for Admin Verification before accessing exams.");
           setUser(data.data); // Update local state
           localStorage.setItem('user', JSON.stringify(data.data));
        }
     } catch (err) { alert("Registration failed."); }
     finally { setRegLoading(false); }
  };

  if (loading || !user) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-10 text-center">
       <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
       <h2 className="text-2xl font-black uppercase tracking-[0.3em] animate-pulse italic">Initializing Identity Module...</h2>
       <p className="text-slate-500 mt-4 font-bold">Establishing secure biometric uplink</p>
       { !loading && !user && (
         <button onClick={() => window.location.href = import.meta.env.VITE_LOGIN_URL} className="mt-8 px-8 py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest">Session Expired - Re-Login</button>
       )}
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex font-sans overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
            <div className="text-xl font-bold text-indigo-600 lg:hidden">ProctorAI</div>
            <div className="flex items-center gap-5 ml-auto">
              <span className="text-slate-600 text-sm hidden sm:block font-bold">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-6 py-10 lg:py-12">
          <motion.section 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="pb-10"
          >
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter mb-3 flex items-center gap-4">
              <Shield size={36} className="text-indigo-600" />
              Identity Profile
            </h1>
            <p className="text-slate-500 text-lg font-medium max-w-2xl">
              Manage your biometric facial profile and secure access credentials.
            </p>
          </motion.section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="xl:col-span-1 space-y-8">
              <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="flex flex-col items-center text-center mb-8">
                  <img
                    src={`https://ui-avatars.com/api/?name=${user.name}&background=6366f1&color=fff&size=128&bold=true`}
                    alt={user.name}
                    className="w-32 h-32 rounded-full border-4 border-indigo-50 shadow-md mb-4"
                  />
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{user.name}</h2>
                  <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mt-1 bg-indigo-50 px-3 py-1 rounded-full">{user.role?.toUpperCase()}</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="p-3 bg-white rounded-xl shadow-sm"><Mail size={18} className="text-indigo-400" /></div>
                    <div className="text-left overflow-hidden">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Connection</p>
                      <p className="font-bold text-slate-700 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="p-3 bg-white rounded-xl shadow-sm"><Calendar size={18} className="text-emerald-400" /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined Phase</p>
                      <p className="font-bold text-slate-700">{new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="xl:col-span-2">
              <section className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-6 tracking-tight flex items-center gap-2 uppercase">
                  <Fingerprint size={20} className="text-indigo-500" />
                  Biometric Face Authentication
                </h2>
                
                {isCapturing ? (
                   <div className="space-y-6">
                      <div className="relative rounded-[2rem] overflow-hidden bg-black aspect-video border border-slate-200 shadow-inner group">
                         <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                         <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-600/90 text-[10px] text-white font-black rounded-full backdrop-blur-sm animate-pulse">
                            <span className="w-2 h-2 bg-white rounded-full"></span> LIVE SENSOR
                         </div>
                      </div>
                      <button onClick={captureImage} className="w-full py-5 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-transform uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                        <Camera size={18} /> INITIALIZE IDENTITY CAPTURE
                      </button>
                   </div>
                ) : (
                   <div className="flex flex-col md:flex-row items-start gap-10">
                      <div className="w-full md:w-64 shrink-0 aspect-square bg-slate-50 rounded-[2.5rem] border border-slate-200 shadow-inner flex items-center justify-center overflow-hidden relative group">
                         {faceImage ? (
                            <img src={faceImage} alt="Identity" className="w-full h-full object-cover grayscale brightness-110" />
                         ) : (
                            <div className="text-center p-6 text-slate-300 group-hover:text-indigo-400 transition-colors">
                               <Fingerprint size={64} className="mx-auto mb-4 opacity-50" />
                               <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Identity Profile Not Registered</p>
                            </div>
                         )}
                             {/* Overlay for verification status */}
                             {user.verificationStatus === 'pending' && faceImage && user.faceImage === faceImage && (
                                <div className="absolute inset-0 bg-yellow-500/90 flex items-center justify-center flex-col text-white backdrop-blur-sm">
                                  <Loader className="w-8 h-8 animate-spin mb-3" />
                                  <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">Pending Admin Approval</p>
                                </div>
                             )}
                             {user.verificationStatus === 'verified' && faceImage && (
                                <div className="absolute top-4 right-4 bg-emerald-500 text-white px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
                                  <Shield size={10} /> Verified
                                </div>
                             )}
                             {user.verificationStatus === 'rejected' && faceImage && user.faceImage === faceImage && (
                                <div className="absolute inset-0 bg-red-600/90 flex items-center justify-center flex-col text-white backdrop-blur-sm">
                                  <AlertCircle size={32} className="mb-3 opacity-90" />
                                  <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">Rejected - Recapture</p>
                                </div>
                             )}
                          </div>
                          
                          <div className="flex-1 space-y-6">
                             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <p className="text-slate-600 font-medium leading-relaxed">Enroll your biometric facial data to enable AI-powered proctoring verification. An Administrator must verify your identity before dashboard access is granted.</p>
                             </div>
                             <div className="flex flex-col sm:flex-row gap-4">
                                <button onClick={startCamera} disabled={user.verificationStatus === 'pending' || user.verificationStatus === 'verified'} className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                  <Camera size={16} /> Register Face
                                </button>
                                {faceImage && user.faceImage !== faceImage && (
                                   <button onClick={handleFaceSubmit} disabled={regLoading} className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-500 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                      {regLoading ? <Loader className="animate-spin" size={16} /> : <Shield size={16} />}
                                      {regLoading ? 'Validating...' : 'Submit for Approval'}
                                   </button>
                                )}
                             </div>
                          </div>
                       </div>
                    )}
                  </section>
            </motion.div>
          </div>
        </main>

        <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-white mt-auto">
          © {new Date().getFullYear()} ProctorAI — Secure Examination Framework
        </footer>
      </div>
    </div>
  );
}