import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import {
  Camera,
  Search,
  Filter,
  Calendar,
  User,
  ExternalLink,
  Maximize2,
  X,
  Download,
  AlertCircle,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/ui/Modal";

export default function ViolationGallery() {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filterType, setFilterType] = useState("all");

  const deleteImage = async (img, index) => {
    if (!window.confirm("Delete this violation image?")) return;
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL}/api/sessions/${img.sessionId}/violation/${index}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setImages(prev => prev.filter(item => item !== img));
    } catch (err) {
      alert("Failed to delete image.");
    }
  };

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch(import.meta.env.VITE_API_URL + "/api/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          // Extract all violation logs with evidence images from all sessions
          const allCapturedImages = [];
          data.data.forEach((session) => {
            if (session.violationLogs && session.violationLogs.length > 0) {
              session.violationLogs.forEach((log, logIndex) => {
                if (log.evidence && log.evidence.startsWith("http")) {
                  allCapturedImages.push({
                    ...log,
                    logIndex, // ✅ ADD THIS
                    sessionId: session._id,
                    studentName: session.studentId?.name || "Unknown",
                    studentEmail: session.studentId?.email || "N/A",
                    examTitle: session.examId?.title || "Unknown",
                  });
                }
              });
            }
          });

          // Sort by timestamp descending (newest first)
          allCapturedImages.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
          );
          setImages(allCapturedImages);
        }
      } catch (err) {
        console.error("Failed to fetch images", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchImages();
    }
  }, [token]);

  useEffect(() => {
  const socket = io(import.meta.env.VITE_API_URL);

  socket.on("violation-alert", (data) => {
    const newLogs = data.violationLogs
      .filter(log => log.evidence && log.evidence.startsWith("http"))
      .map((log, logIndex) => ({
        ...log,
        logIndex,
        sessionId: data._id,
        studentName: data.studentId?.name || "Unknown",
        studentEmail: data.studentId?.email || "N/A",
        examTitle: data.examId?.title || "Unknown",
      }));

    setImages(prev => {
  const existingKeys = new Set(
    prev.map(item => `${item.sessionId}-${item.logIndex}`)
  );

  const filteredNewLogs = newLogs.filter(
    item => !existingKeys.has(`${item.sessionId}-${item.logIndex}`)
  );

  return [...filteredNewLogs, ...prev];
});
  });

  return () => socket.disconnect();
}, [token]);
  const filteredImages = images.filter((img) => {
    const matchesSearch =
      img.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.examTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || img.type === filterType;

    return matchesSearch && matchesType;
  });

  const violationTypes = ["all", ...new Set(images.map((img) => img.type))];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 flex items-center gap-4">
            <Camera className="w-10 h-10 text-indigo-600" />
            Violation Evidence Gallery
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Visual proof of AI-detected proctoring violations during exams.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            className="px-6 py-2 text-sm border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200"
            onClick={async () => {
              if (
                window.confirm(
                  "Are you sure you want to permanently clear ALL captured images from EVERY session? This action cannot be undone.",
                )
              ) {
                try {
                  const res = await fetch(
                    import.meta.env.VITE_API_URL + "/api/sessions/clear-images",
                    {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` },
                    },
                  );
                  const data = await res.json();
                  if (data.success) {
                    setImages([]); // Instantly clear gallery without page reload
                    alert(data.message);
                  }
                } catch (err) {
                  alert("Failed to clear images.");
                }
              }
            }}
          >
            <X className="w-4 h-4 mr-2" />
            Clear All Evidence
          </Button>
          <Badge variant="indigo" className="px-4 py-2 text-sm">
            {images.length} Captured Instances
          </Badge>
        </div>
      </div>

      <Card className="p-6 mb-10 overflow-visible">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by student, exam, or violation type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-6 py-4 bg-white border border-slate-200 rounded-3xl focus:outline-none focus:border-indigo-500 text-lg placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <Filter className="text-slate-400 w-5 h-5 ml-2" />
            <div className="flex flex-wrap gap-2">
              {violationTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
                    filterType === type
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {type === "all" ? "All Types" : type.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-[2.5rem] h-80 animate-pulse border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="h-48 bg-slate-100"></div>
              <div className="p-6 space-y-3">
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredImages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredImages.map((img, index) => (
              <motion.div
                key={`${img.sessionId}-${index}`}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="group overflow-hidden border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 rounded-[2.5rem] bg-white">
                  <div
                    className="relative aspect-video overflow-hidden bg-slate-100 cursor-pointer"
                    onClick={() => setSelectedImage(img)}
                  >
                    <img
                      src={img.evidence}
                      alt="Violation Evidence"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30">
                        <Maximize2 className="text-white w-8 h-8" />
                      </div>
                    </div>
                    <div className="absolute top-4 left-4">
                      <Badge
                        variant="red"
                        className="shadow-lg backdrop-blur-md bg-red-600/90 text-white border-none px-4 py-2"
                      >
                        {img.type.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl italic uppercase">
                        {img.studentName[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 tracking-tight">
                          {img.studentName}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {img.studentEmail}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-slate-500">
                        <AlertCircle className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold uppercase tracking-widest leading-none">
                          {img.examTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium">
                          {new Date(img.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                      <Button
                        variant="secondary"
                        className="flex-1 text-xs py-3 rounded-2xl"
                        onClick={() => setSelectedImage(img)}
                      >
                        Details
                      </Button>
                      <Button
                        className="bg-red-600 text-white p-3 rounded-2xl hover:bg-red-700"
                        onClick={() => deleteImage(img, img.logIndex)}
                        title="Delete this image"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                      <Button
                        className="bg-slate-900 text-white p-3 rounded-2xl hover:bg-slate-800"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = img.evidence;
                          link.download = `violation-${img.studentName}-${img.type}.jpg`;
                          link.click();
                        }}
                      >
                        <Download className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <div className="w-24 h-24 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <Camera className="w-12 h-12" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900 italic italic">
            Evidence Vault Empty
          </h3>
          <p className="text-slate-500 mt-4 text-lg font-medium">
            No captured violation images match your current filters.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setFilterType("all");
            }}
            className="mt-8 px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:scale-105 transition-all"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Image Detail Modal */}
      <Modal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        title="Evidence Analysis"
        size="lg"
      >
        {selectedImage && (
          <div className="space-y-8">
            <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-slate-100 shadow-2xl bg-black">
              <img
                src={selectedImage.evidence}
                alt="Full Resolution Evidence"
                className="w-full h-auto"
              />
              <div className="absolute top-6 left-6">
                <Badge
                  variant="red"
                  className="text-sm px-6 py-2 shadow-2xl scale-125 origin-left"
                >
                  {selectedImage.type.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
                  Subject Information
                </h4>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                  <div className="flex items-center gap-4">
                    <User className="w-5 h-5 text-indigo-500" />
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Student
                      </p>
                      <p className="font-bold text-slate-900">
                        {selectedImage.studentName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <AlertCircle className="w-5 h-5 text-indigo-500" />
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Exam Module
                      </p>
                      <p className="font-bold text-slate-900">
                        {selectedImage.examTitle}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
                  Temporal Data
                </h4>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                  <div className="flex items-center gap-4">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Capture Timestamp
                      </p>
                      <p className="font-bold text-slate-900">
                        {new Date(selectedImage.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <ExternalLink className="w-5 h-5 text-indigo-500" />
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Session ID reference
                      </p>
                      <p className="font-mono text-[10px] text-slate-500">
                        {selectedImage.sessionId}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <Button
                className="flex-1 bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = selectedImage.evidence;
                  link.download = `evidence-${selectedImage.studentName}.jpg`;
                  link.click();
                }}
              >
                <Download className="mr-2" /> Download Evidence Image
              </Button>
              <Button
                variant="secondary"
                className="px-8 rounded-3xl border-2 border-slate-200"
                onClick={() => setSelectedImage(null)}
              >
                Close Analysis
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
