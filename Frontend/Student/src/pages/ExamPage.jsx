  // src/pages/ExamPage.jsx
  import React, { useState, useEffect, useRef } from 'react';
  import { useParams, useNavigate } from 'react-router-dom';
  import * as tf from '@tensorflow/tfjs';
  import { io } from 'socket.io-client';
  // ─────────────────────────────────────────────────────────────────
  //  FACE-API.JS CDN loader (loads once, cached on window)
  // ─────────────────────────────────────────────────────────────────
  const FACE_API_CDN = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js";
  // FIX 1: Changed to jsDelivr CDN — more reliable than raw GitHub URLs
  const FACE_API_MODELS = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

  let faceApiReady = false;
  let faceApiLoading = null;

  const loadFaceApi = () => {
    if (faceApiReady) return Promise.resolve();
    if (faceApiLoading) return faceApiLoading;

    faceApiLoading = new Promise((resolve, reject) => {
      if (window.faceapi) { faceApiReady = true; resolve(); return; }

      const script = document.createElement("script");
      script.src = FACE_API_CDN;
      script.onload = async () => {
        try {
          if (!window.faceapi && window.vladmandic_faceapi) {
            window.faceapi = window.vladmandic_faceapi;
          }
          await Promise.all([
            window.faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODELS),
            window.faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_API_MODELS),
            window.faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODELS),
          ]);
          faceApiReady = true;
          console.log("✅ face-api.js models loaded");
          resolve();
        } catch (e) { reject(e); }
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return faceApiLoading;
  };

  // ─────────────────────────────────────────────────────────────────
  //  Get 128-D face descriptor
  // ─────────────────────────────────────────────────────────────────
const getFaceDescriptor = async (imgSrc) => {
  await loadFaceApi();

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    // ✅ FIX HERE
    if (imgSrc instanceof Blob) {
      img.src = URL.createObjectURL(imgSrc);
    } else {
      img.src = imgSrc;
    }

    img.onload = async () => {
      try {
        const detection = await window.faceapi
          .detectSingleFace(
            img,
            new window.faceapi.TinyFaceDetectorOptions({
  scoreThreshold: 0.25,
  inputSize: 320
})
          )
          .withFaceLandmarks(true)
          .withFaceDescriptor();

        resolve(detection ? detection.descriptor : null);

        // ✅ cleanup memory
        if (imgSrc instanceof Blob) {
          URL.revokeObjectURL(img.src);
        }

      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
  });
};

  // Euclidean distance — < 0.5 same person, > 0.6 different
  const faceDistance = (d1, d2) => {
    if (!d1 || !d2) return 1;
    let sum = 0;
    for (let i = 0; i < d1.length; i++) sum += (d1[i] - d2[i]) ** 2;
    return Math.sqrt(sum);
  };

  // ─────────────────────────────────────────────────────────────────
  //  HEAD POSE DETECTION using face landmarks
  //  FIX 2: Now awaits loadFaceApi() directly instead of checking flag
  //  Returns: "forward" | "left" | "right" | "up" | "down" | null
  // ─────────────────────────────────────────────────────────────────
  const detectHeadPose = async (videoEl) => {
    if (!videoEl || videoEl.readyState !== 4 || videoEl.videoWidth === 0) return null;

    // FIX 2: await loadFaceApi() directly — eliminates race condition
    try {
      await loadFaceApi();
    } catch {
      return null;
    }

    if (!window.faceapi) return null;

    try {
      const detection = await window.faceapi
        .detectSingleFace(videoEl, new window.faceapi.TinyFaceDetectorOptions({
  scoreThreshold: 0.25,
  inputSize: 320
}))
        .withFaceLandmarks(true);

      if (!detection) return null;

      const lm = detection.landmarks;
      const nose = lm.getNose();
      const jaw = lm.getJawOutline();
      const leftEye = lm.getLeftEye();
      const rightEye = lm.getRightEye();

      // ── Yaw (left/right turn) ──────────────────────────────────
      const noseTip = nose[3];
      const jawLeft = jaw[0];
      const jawRight = jaw[16];

      const distLeft = Math.abs(noseTip.x - jawLeft.x);
      const distRight = Math.abs(noseTip.x - jawRight.x);
      const total = distLeft + distRight;

      const yawRatio = distLeft / total;

      // ── Pitch (up/down tilt) ───────────────────────────────────
      const eyeMidY = (leftEye[0].y + rightEye[3].y) / 2;
      const chinY = jaw[8].y;
      const faceHeight = chinY - eyeMidY;
      const nosePitchRatio = (noseTip.y - eyeMidY) / faceHeight;

      if (yawRatio < 0.38) return "right";
      if (yawRatio > 0.62) return "left";
      if (nosePitchRatio < 0.30) return "up";
      if (nosePitchRatio > 0.70) return "down";

      return "forward";
    } catch {
      return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────────────
  const formatTime = (seconds) => {
    if (seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ─────────────────────────────────────────────────────────────────
  //  Component
  // ─────────────────────────────────────────────────────────────────
  export default function ExamPage() {
  const [audioViolationCount, setAudioViolationCount] = useState(0);
    // 🎤 AUDIO STATES (INSIDE COMPONENT)
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);

  const audioTimerRef = useRef(null);
  const isAudioActiveRef = useRef(false);

    const { examId } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const examContainerRef = useRef(null);
    const socketRef = useRef(null);
    const peerRef = useRef(null);

    const token = localStorage.getItem('token');

    // Exam & Session
    const [exam, setExam] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Exam progress
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [switchCount, setSwitchCount] = useState(0);
    const [lastAIAction, setLastAIAction] = useState("");
    const [showWarning, setShowWarning] = useState(false);
    const [examCancelled, setExamCancelled] = useState(false);

    // FIX 3: Refs to avoid stale closures in intervals
    const isSubmittedRef = useRef(false);
    const examCancelledRef = useRef(false);

    // FIX 5: Ref for handleSubmit to avoid stale closure in intervals
    const handleSubmitRef = useRef(null);

    // YOLO refs
    const modelRef = useRef(null);
    const lastViolationLogRef = useRef({ type: "", timestamp: 0 });
    const missingFaceCountRef = useRef(0);
    const mobileBufferRef = useRef(0);
    const multiPersonBufferRef = useRef(0);

    // Face verification
    const registeredDescriptorRef = useRef(null);
    const impersonationBufferRef = useRef(0);
    const [faceVerifyStatus, setFaceVerifyStatus] = useState("idle");
    const [verifyMessage, setVerifyMessage] = useState("");

    // ── HEAD POSE refs ───────────────────────────────────────────────
    const headTurnStartRef = useRef(null);
    const headPoseViolationCountRef = useRef(0);
    const headPoseIntervalRef = useRef(null);

    // FIX 4: State variable for head violation count so JSX re-renders
    const [headViolationCount, setHeadViolationCount] = useState(0);

    // Pre-exam
    const [isPreCheckDone, setIsPreCheckDone] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [hasConfirmedCheck, setHasConfirmedCheck] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Camera stream ref
    const streamRef = useRef(null);
    // Session ID ref for use inside intervals/closures
    const sessionIdRef = useRef(null);
    // Offline State
    const unsubmittedSyncQueueRef = useRef([]);
    const pendingSubmitRef = useRef(false);

    // ─────────────────────────────────────────────────────────────────
    //  1. Socket + fetch exam
    // ─────────────────────────────────────────────────────────────────
    useEffect(() => {
      socketRef.current = io(import.meta.env.VITE_API_URL, { 
          transports: ["websocket"]
      });

      const fetchExam = async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/exams/${examId}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            setExam(data.data);
            setTimeLeft(data.data.duration * 60);
          } else {
            setError(data.message || "Failed to load exam.");
          }
        } catch { setError("Network error. Backend down?"); }
        finally { setLoading(false); }
      };

      // ✅ ICE candidate buffer — holds candidates that arrive before remote description is set
      const iceCandidateQueue = [];

      // ✅ ANSWER HANDLER (registered HERE to avoid race with socket creation)
      const handleAnswer = async ({ answer, sessionId }) => {
        if (sessionId !== sessionIdRef.current) return;
        if (!peerRef.current) return;

        if (peerRef.current.signalingState !== "have-local-offer") {
          console.log("⚠️ Skipping duplicate/stale answer");
          return;
        }

        try {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("✅ Remote description set — flushing", iceCandidateQueue.length, "buffered ICE candidates");

          // Flush buffered ICE candidates
          while (iceCandidateQueue.length > 0) {
            const queued = iceCandidateQueue.shift();
            if (peerRef.current && queued) {
              await peerRef.current.addIceCandidate(new RTCIceCandidate(queued)).catch(() => {});
            }
          }
        } catch (err) {
          console.error("❌ setRemoteDescription error:", err);
        }
      };

      // ✅ ICE HANDLER with buffering
      const handleICE = async ({ candidate, sessionId }) => {
        if (sessionId !== sessionIdRef.current) return;
        if (!peerRef.current || !candidate) return;

        if (peerRef.current.remoteDescription) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        } else {
          // Buffer the candidate until remote description is ready
          iceCandidateQueue.push(candidate);
        }
      };

      socketRef.current.on('webrtc-answer', handleAnswer);
      socketRef.current.on('webrtc-ice-candidate', handleICE);

      if (token && examId) fetchExam();
      return () => { 
        if (socketRef.current) {
          socketRef.current.off('webrtc-answer', handleAnswer);
          socketRef.current.off('webrtc-ice-candidate', handleICE);
          socketRef.current.disconnect();
        }
      };
    }, [examId, token]);

  // ✅ NEW LISTENER FOR LATE-JOIN ADMINS
  useEffect(() => {
    if (!socketRef.current) return;

    const handleAdminRequest = () => {
      if (sessionIdRef.current && streamRef.current) {
         console.log("Admin requested stream, renegotiating...");
         startStreaming();
      }
    };

    socketRef.current.on('request-webrtc-offer', handleAdminRequest);
    return () => socketRef.current.off('request-webrtc-offer', handleAdminRequest);
  }, []);

    // Admin termination
    useEffect(() => {
      if (sessionId && socketRef.current) {
        socketRef.current.on(`terminate-session-${sessionId}`, () => {
          setExamCancelled(true);
          examCancelledRef.current = true; // FIX 3: sync ref
          document.exitFullscreen?.().catch(() => { });
        });
      }
    }, [sessionId]);

    // ─────────────────────────────────────────────────────────────────
    //  2. Camera setup
    // ─────────────────────────────────────────────────────────────────
    useEffect(() => {
      const setupMedia = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch { setCameraError("Proctored exams require camera permission."); }
      };
      setupMedia();
      startAudioDetection(); // 🎤 START AUDIO

      // Preload face-api models in background
      loadFaceApi().catch(err => console.warn("Face-api preload failed:", err));

      const handleOnlineRecovery = async () => {
        // Drain offline violation cache
        while (unsubmittedSyncQueueRef.current.length > 0) {
          const item = unsubmittedSyncQueueRef.current.shift();
          syncProctoring(item.vCount, item.vType, item.evidence);
        }
        
        // Execute pending submit
        if (pendingSubmitRef.current) {
          pendingSubmitRef.current = false;
          handleSubmitRef.current?.();
        }
      };

      window.addEventListener('online', handleOnlineRecovery);

      return () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
          // 🎤 CLEAN AUDIO
          if (audioContextRef.current) {
            audioContextRef.current.close();
          }
          clearTimeout(audioTimerRef.current);
        }
        window.removeEventListener('online', handleOnlineRecovery);
      };
    }, []);

    // Re-attach stream when screen switches
    useEffect(() => {
      if (streamRef.current && videoRef.current && !videoRef.current.srcObject) {
        videoRef.current.srcObject = streamRef.current;
      }
    }, [isPreCheckDone]);

    // ─────────────────────────────────────────────────────────────────
    //  3. YOLO + continuous face check — only after exam starts
    // ─────────────────────────────────────────────────────────────────
    useEffect(() => {
      if (!isPreCheckDone) return;

      let aiInterval;

      (async () => {
        try {
          await tf.ready();
          const modelUrl = "https://cdn.jsdelivr.net/gh/hyuto/yolov8-tfjs@master/public/yolov8n_web_model/model.json";
          modelRef.current = await tf.loadGraphModel(modelUrl);
          console.log("🚀 Proctoring Engine: YOLO READY");
        } catch (err) { console.error("YOLO load failed:", err); }
      })();

      aiInterval = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState !== 4 || videoRef.current.videoWidth === 0) return;

        // YOLO detections
        let rawOutput = null;
        try {
          if (modelRef.current) {
            const inputTensor = tf.tidy(() =>
              tf.browser.fromPixels(videoRef.current)
                .resizeBilinear([640, 640])
                .div(255.0)
                .expandDims(0)
            );
            rawOutput = modelRef.current.execute(inputTensor);
            inputTensor.dispose();

            const transposed = rawOutput.transpose([0, 2, 1]).squeeze();
            const rawBoxes = transposed.slice([0, 0], [-1, 4]);
            const classScores = transposed.slice([0, 4], [-1, 80]);
            const maxScores = classScores.max(1);
            const classIds = classScores.argMax(1);

            const boxes = tf.tidy(() => {
              const [cx, cy, w, h] = tf.split(rawBoxes, 4, 1);
              return tf.concat([
                tf.sub(cy, tf.div(h, 2)),
                tf.sub(cx, tf.div(w, 2)),
                tf.add(cy, tf.div(h, 2)),
                tf.add(cx, tf.div(w, 2))
              ], 1);
            });

            const [scoresData, classData] = await Promise.all([maxScores.data(), classIds.data()]);
            const selectedIndices = await tf.image.nonMaxSuppressionAsync(boxes, maxScores, 15, 0.45, 0.40);
            const indices = await selectedIndices.data();

            const detections = [];
            for (let i = 0; i < indices.length; i++) {
              const idx = indices[i];
              const clsId = classData[idx];
              const score = scoresData[idx];
              let name = "";
              if (clsId === 0) name = "person";
              else if (clsId === 67) name = "cell phone";
              else if (clsId === 63) name = "laptop";
              if (name) detections.push({ class: name, score });
            }

            [transposed, rawBoxes, boxes, classScores, maxScores, classIds, selectedIndices].forEach(t => t.dispose());
            handleAIDetections(detections);
          }
        } catch (err) {
          console.error("YOLO error:", err);
        } finally {
          if (rawOutput) rawOutput.dispose();
        }

        // Continuous face identity check
        runContinuousFaceCheck();

      }, 3000);

      return () => { if (aiInterval) clearInterval(aiInterval); };
    }, [isPreCheckDone]);

    // ─────────────────────────────────────────────────────────────────
    //  HEAD POSE DETECTION interval — runs every 500ms
    //  FIX 2 + FIX 3: uses await loadFaceApi() and refs for stale closures
    // ─────────────────────────────────────────────────────────────────
    useEffect(() => {
      if (!isPreCheckDone) return;

      let isDetecting = false;

      headPoseIntervalRef.current = setInterval(async () => {
        if (isSubmittedRef.current || examCancelledRef.current) return;
        if (isDetecting) return;

        isDetecting = true;

        let pose = null;

        try {
          pose = await detectHeadPose(videoRef.current);
        } catch (err) {
          console.error("Head pose detection error:", err);
        } finally {
          isDetecting = false;
        }

        if (!pose) return;

        if (pose === "forward") {
          headTurnStartRef.current = null;
          return;
        }

        const now = Date.now();

        if (!headTurnStartRef.current) {
          headTurnStartRef.current = now;
          console.log(`👀 Head turned: ${pose}`);
          return;
        }

        const turnDuration = (now - headTurnStartRef.current) / 1000;

        if (turnDuration >= 3) {
          const vType = "Head Turn Detected";
          const evidence = await takeSnapshot();

          const shouldLog =
            lastViolationLogRef.current.type !== vType ||
            (now - lastViolationLogRef.current.timestamp) > 8000;

          if (!shouldLog) return;

          headTurnStartRef.current = null;

          lastViolationLogRef.current = { type: vType, timestamp: now };
          headPoseViolationCountRef.current += 1;

          setHeadViolationCount(headPoseViolationCountRef.current);

          const currentHeadViolationCount = headPoseViolationCountRef.current;

          setSwitchCount(prev => {
            const next = prev + 1;
            syncProctoring(next, vType, evidence);
            return next;
          });

          setLastAIAction("Head Turn Detected");
          setShowWarning(true);

          if (currentHeadViolationCount >= 5) {
            setTimeout(() => {
              handleSubmitRef.current?.();
            }, 1500);
          }
        }
      }, 500);

      return () => {
        if (headPoseIntervalRef.current) clearInterval(headPoseIntervalRef.current);
      };
    }, [isPreCheckDone]);

    // ─────────────────────────────────────────────────────────────────
    //  Continuous face verification (called during exam)
    // ─────────────────────────────────────────────────────────────────
    const runContinuousFaceCheck = async () => {
      if (!registeredDescriptorRef.current) return;

      const snapshot = await takeSnapshot(); 

      if (!snapshot) return;

      try {
        const liveDescriptor = await getFaceDescriptor(snapshot);
        if (!liveDescriptor) return;

        const dist = faceDistance(registeredDescriptorRef.current, liveDescriptor);
        console.log(`🔍 Face identity check — distance: ${dist.toFixed(3)}`);

        if (dist > 0.55) {
          impersonationBufferRef.current += 1;
          if (impersonationBufferRef.current >= 3) {
            impersonationBufferRef.current = 0;
            const vType = "Impersonation Detected";
            const now = Date.now();
            const shouldLog =
              lastViolationLogRef.current.type !== vType ||
              (now - lastViolationLogRef.current.timestamp) > 15000;

            if (shouldLog) {
              lastViolationLogRef.current = { type: vType, timestamp: now };
              setSwitchCount(prev => {
                const next = prev + 1;
                syncProctoring(next, vType, snapshot);
                if (next > 10) {
                  setExamCancelled(true);
                  examCancelledRef.current = true; // FIX 3: sync ref
                  document.exitFullscreen?.().catch(() => { });
                  setTimeout(() => navigate('/'), 3000);
                }
                return next;
              });
              setLastAIAction("Impersonation Detected");
              setShowWarning(true);
            }
          }
        } else {
          impersonationBufferRef.current = 0;
          setLastAIAction(prev => prev === "Impersonation Detected" ? "" : prev);
        }
      } catch (err) {
        console.error("Face identity check error:", err);
      }
    };

    // ─────────────────────────────────────────────────────────────────
    //  YOLO detections handler
    // ─────────────────────────────────────────────────────────────────
    const handleAIDetections = (predictions) => {
      const allPersons = predictions.filter(p => p.class === 'person');
      const personsPresence = allPersons.filter(p => p.score > 0.30);
      const personsViolation = allPersons.filter(p => p.score > 0.65);
      const mobiles = predictions.filter(p =>
        (p.class === 'cell phone' || p.class === 'laptop') && p.score > 0.50
      );

      const now = Date.now();
      const shouldSnapshot = (vType) =>
        lastViolationLogRef.current.type !== vType ||
        (now - lastViolationLogRef.current.timestamp) > 12000;

      const triggerViolation = async (vType) => {
        const evidence = await takeSnapshot();
        setSwitchCount(prev => {
          const next = prev + 1;
          syncProctoring(next, vType, evidence);
          if (next > 10) {
            setExamCancelled(true);
            examCancelledRef.current = true; // FIX 3: sync ref
            document.exitFullscreen?.().catch(() => { });
            setTimeout(() => navigate('/'), 3000);
          }
          return next;
        });
        lastViolationLogRef.current = { type: vType, timestamp: now };
        setLastAIAction(vType);
        setShowWarning(true);
      };

      if (personsPresence.length === 0) {
        missingFaceCountRef.current += 1;
        if (missingFaceCountRef.current >= 3 && shouldSnapshot("No Face Detected")) {
          triggerViolation("No Face Detected");
        } else if (missingFaceCountRef.current >= 3) {
          setLastAIAction("No Face Detected");
          setShowWarning(true);
        }
        mobileBufferRef.current = 0;
        multiPersonBufferRef.current = 0;

      } else if (mobiles.length > 0) {
        mobileBufferRef.current += 1;
        multiPersonBufferRef.current = 0;
        missingFaceCountRef.current = 0;
        if (mobileBufferRef.current >= 1 && shouldSnapshot("Mobile Phone Detected")) {
          triggerViolation("Mobile Phone Detected");
        }

      } else if (personsViolation.length > 1 && personsPresence.length > 1) {
        multiPersonBufferRef.current += 1;
        mobileBufferRef.current = 0;
        missingFaceCountRef.current = 0;
        if (multiPersonBufferRef.current >= 2 && shouldSnapshot("Multiple Persons Detected")) {
          triggerViolation("Multiple Persons Detected");
        }

      } else if (personsPresence.length === 1) {
        missingFaceCountRef.current = 0;
        mobileBufferRef.current = 0;
        multiPersonBufferRef.current = 0;
        setLastAIAction(prevAction => {
          if (prevAction === "No Face Detected" || prevAction === "Multiple Persons Detected") {
            setShowWarning(false);
            return "";
          }
          return prevAction;
        });
      }
    };

    // ─────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────
  //  🎤 AUDIO DETECTION
  // ─────────────────────────────────────────────────────────────────
  const startAudioDetection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      microphone.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;

      detectAudioLoop();
    } catch (error) {
      console.error("Microphone access denied:", error);
    }
  };

  const detectAudioLoop = () => {
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkAudio = () => {
      if (!analyser) return;

      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      if (volume > 25) { // 🎯 threshold
        let speechEnergy = dataArray.some(v => v > 60); // detect spikes

    if (speechEnergy) {
        if (!isAudioActiveRef.current) {
          isAudioActiveRef.current = true;

          audioTimerRef.current = setTimeout(() => {
            triggerAudioViolation();
          }, 3000); // ⏱ 3 sec
        }
      }
      } else {
        isAudioActiveRef.current = false;
        clearTimeout(audioTimerRef.current);
      }

      requestAnimationFrame(checkAudio);
    };

    checkAudio();
  };

  const triggerAudioViolation = async () => {
    const vType = "Audio Detected";
    const evidence = await takeSnapshot();
    const now = Date.now();

    // Prevent spam (same as your other logic)
    const shouldLog =
      lastViolationLogRef.current.type !== vType ||
      (now - lastViolationLogRef.current.timestamp) > 8000;

    if (!shouldLog) return;

    lastViolationLogRef.current = { type: vType, timestamp: now };

    setAudioViolationCount(prev => {
      const newCount = prev + 1;

      // 🔥 MAIN INTEGRATION (same pattern as others)
      setSwitchCount(prevSwitch => {
        const next = prevSwitch + 1;
        syncProctoring(next, vType, evidence);
        return next;
      });

      setLastAIAction("Audio Detected");
      setShowWarning(true);

      console.log(`🎤 Audio violation ${newCount}/5`);

      // 🚨 AUTO SUBMIT (same logic as head pose)
      if (newCount >= 5) {
        setTimeout(() => {
          handleSubmitRef.current?.();
        }, 1500);
      }

      return newCount;
    });
  };

    //  Snapshot helper
    // ─────────────────────────────────────────────────────────────────
    const takeSnapshot = () => {
    return new Promise((resolve) => {
      if (!videoRef.current || videoRef.current.videoWidth === 0) {
        return resolve(null);
      }

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return resolve(null);
        resolve(blob);
      }, "image/jpeg", 0.6);
    });
  };
    // ─────────────────────────────────────────────────────────────────
    //  Proctoring sync
    // ─────────────────────────────────────────────────────────────────
  const syncProctoring = async (vCount, vType = null, evidence = null) => {
    const sid = sessionIdRef.current;
    if (!sid) return;

    if (!navigator.onLine) {
        unsubmittedSyncQueueRef.current.push({ vCount, vType, evidence });
        setShowWarning(true);
        setLastAIAction("Connection Lost");
        return;
    }

    try {
      const formData = new FormData();
      formData.append("violationsCount", vCount);
      formData.append("violationType", vType);

      if (evidence) {
        formData.append("image", evidence); // 🔥 important
      }

      await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/update-proctoring/${sid}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

    } catch (err) {
      console.error("Sync error:", err);
      // Cache for later
      unsubmittedSyncQueueRef.current.push({ vCount, vType, evidence });
    }
  };

    // ─────────────────────────────────────────────────────────────────
    //  Fullscreen helper
    // ─────────────────────────────────────────────────────────────────
    const requestFullScreen = async () => {
      const elem = examContainerRef.current || document.documentElement;
      try {
        if (elem.requestFullscreen) await elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
      } catch { }
    };

    // ─────────────────────────────────────────────────────────────────
    //  Pre-check face verification
    // ─────────────────────────────────────────────────────────────────
    const verifyFacePreCheck = async () => {
      setFaceVerifyStatus("loading");
      setVerifyMessage("Loading face recognition models...");

      try {
        await loadFaceApi();

        setVerifyMessage("Fetching your registered identity...");
        const resProfile = await fetch(import.meta.env.VITE_API_URL + "/api/auth/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const dataProfile = await resProfile.json();
        const registeredFaceImg = dataProfile.data?.faceImage;

        if (!registeredFaceImg) {
          setFaceVerifyStatus("error");
          setVerifyMessage("No registered face found. Please register your biometric profile first.");
          return;
        }

        setVerifyMessage("Analyzing registered face...");
        const regDescriptor = await getFaceDescriptor(registeredFaceImg);

        if (!regDescriptor) {
          setFaceVerifyStatus("error");
          setVerifyMessage("Could not read face from your registered photo. Please contact admin.");
          return;
        }

        setVerifyMessage("Scanning your face from camera...");
        const snapshot = await takeSnapshot();
        if (!snapshot) {
          setFaceVerifyStatus("no_face");
          setVerifyMessage("Camera not ready. Please wait and try again.");
          return;
        }

        // --- HARDWARE INTEGRITY CHECK ---
        if (window.screen && window.screen.isExtended) {
          setFaceVerifyStatus("error");
          setVerifyMessage("Integrity check failed: Multiple monitors detected. Please disconnect any external displays and refresh to proceed.");
          return;
        }

        const liveDescriptor = await getFaceDescriptor(snapshot);
        if (!liveDescriptor) {
          setFaceVerifyStatus("no_face");
          setVerifyMessage("No face detected in camera. Please look directly at the camera with good lighting.");
          return;
        }

        const dist = faceDistance(regDescriptor, liveDescriptor);
        console.log(`Pre-check face distance: ${dist.toFixed(3)}`);

        if (dist <= 0.5) {
          registeredDescriptorRef.current = regDescriptor;
          setFaceVerifyStatus("matched");
          setVerifyMessage(`Identity confirmed! (confidence: ${((1 - dist) * 100).toFixed(1)}%)`);
        } else {
          setFaceVerifyStatus("mismatch");
          setVerifyMessage(
            dist > 0.7
              ? "Identity mismatch — face does not match registered profile. This attempt has been logged."
              : "Partial mismatch — poor lighting or angle. Improve conditions and try again."
          );
          const formData = new FormData();
          formData.append("studentId", JSON.parse(localStorage.getItem('user'))?._id || "");
          formData.append("examId", examId);
          formData.append("violationType", "Pre-Exam Impersonation Attempt");
          // Use the standard violations endpoint (pre-check-violation route doesn't exist)
          await fetch(import.meta.env.VITE_API_URL + "/api/sessions/update-proctoring/pre-check", {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
          }).catch(() => { }); // Silently fail — this is just logging, not critical
        }
      } catch (err) {
        console.error("Face verify error:", err);
        setFaceVerifyStatus("error");
        setVerifyMessage("Verification system error. Please refresh and try again.");
      }
    };

    // ─────────────────────────────────────────────────────────────────
    //  Start exam session
    // ─────────────────────────────────────────────────────────────────
    const startSession = async () => {
      if (faceVerifyStatus !== "matched") {
        alert("Please complete face verification first.");
        return;
      }
      try {
        const res = await fetch(import.meta.env.VITE_API_URL + "/api/sessions/start", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ examId })
        });
        const data = await res.json();
        if (data.success) {
          setSessionId(data.data._id);
          sessionIdRef.current = data.data._id; // sync ref immediately
          // ✅ JOIN ROOM AFTER SESSION CREATED
  socketRef.current.emit('join', {
    role: 'student',
    sessionId: data.data._id
  });
          setIsPreCheckDone(true);
          startStreaming(); // 📡 START LIVE STREAM
          requestFullScreen();
        } else {
          alert(data.message);
        }
      } catch { alert("Network error during session start."); }
    };
  // 

  // 📡 WEBRTC STREAMING (student → admin)
  const startStreaming = async () => {
    try {
      const stream = streamRef.current; // 🔥 Re-use the existing camera stream to avoid browser locks!
      if (!stream) {
         console.warn("Cannot start streaming without an active camera stream.");
         return;
      }

      // Close previous connection if this is a renegotiation (Admin joined late)
      if (peerRef.current) {
          peerRef.current.close();
      }

      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      peerRef.current = peer;

      stream.getTracks().forEach(track => {
        peer.addTrack(track, stream);
      });

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('webrtc-ice-candidate', {
            candidate: event.candidate,
            sessionId: sessionIdRef.current
          });
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socketRef.current.emit('webrtc-offer', {
        sessionId: sessionIdRef.current,
        offer
      });

    } catch (err) {
      console.error("Streaming error:", err);
    }
  };
    // ─────────────────────────────────────────────────────────────────
    //  Submit
    //  FIX 5: handleSubmitRef is updated every render so intervals always
    //         call the latest version with correct sessionId, exam, answers
    // ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
      if (isSubmittedRef.current) return;

      const sid = sessionIdRef.current;
      if (!sid) {
        alert("Session not found. Please refresh and try again.");
        return;
      }

      if (!navigator.onLine) {
         pendingSubmitRef.current = true;
         setShowWarning(true);
         setLastAIAction("Connection Lost");
         return;
      }

      setIsSubmitted(true);
      isSubmittedRef.current = true; // FIX 3: sync ref immediately

      try {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          await document.exitFullscreen?.();
        }
      } catch { }

      if (headPoseIntervalRef.current) {
        clearInterval(headPoseIntervalRef.current);
      }

      setLoading(true);

      const formatted = Object.entries(answers).map(([qId, value]) => {
        const question = exam.questions.find(q => q._id === qId);
        const isShort = question?.type === 'short';
        return {
          questionId: qId,
          selectedOption: isShort ? undefined : Number(value),
          textAnswer: isShort ? value : undefined
        };
      });

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/end/${sid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ answers: formatted, violationsCount: switchCount })
        });
        const data = await res.json();
        if (data.success) {
          navigate('/MyResult');
        } else {
          alert("Submission error: " + (data.message || "Unknown error"));
          setIsSubmitted(false);
          isSubmittedRef.current = false; // FIX 3: sync ref back
        }
      } catch (err) {
        console.error("Submit failed:", err);
        alert("Network error during submission.");
        setIsSubmitted(false);
        isSubmittedRef.current = false; // FIX 3: sync ref back
      } finally {
        setLoading(false);
      }
    };

    // FIX 5: Keep handleSubmitRef always pointing to latest handleSubmit
    useEffect(() => {
      handleSubmitRef.current = handleSubmit;
    });

    // ─────────────────────────────────────────────────────────────────
    //  4. Timer + visibility + fullscreen + copy-paste guards
    // ─────────────────────────────────────────────────────────────────
    useEffect(() => {
      if (!isPreCheckDone || isSubmitted || examCancelled) return;

      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timer); handleSubmitRef.current?.(); return 0; }
          return prev - 1;
        });
      }, 1000);

      const handleVisibility = async () => {
        if (document.hidden) {
          const evidence = await takeSnapshot();
          setSwitchCount(prev => {
            const next = prev + 1;
            syncProctoring(next, "Tab Switch / Window Blur", evidence);
            setShowWarning(true);
            setLastAIAction("Tab switch");
            if (next >= 10) {
              setExamCancelled(true);
              examCancelledRef.current = true; // FIX 3: sync ref
              setTimeout(() => navigate('/'), 4000);
            }
            return next;
          });
        }
      };

      const handleFullScreenChange = () => {
        const isNowFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
        setIsFullScreen(isNowFull);
        if (!isNowFull && !isSubmittedRef.current && !examCancelledRef.current) {
          setTimeout(() => requestFullScreen(), 300);
        }
      };

      const handleCopyPaste = (e) => {
        if (e.ctrlKey && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (e.key === 'PrintScreen') e.preventDefault();
      };

      const handleRightClick = (e) => e.preventDefault();
      const handlePaste = (e) => e.preventDefault();
      const handleCopy = (e) => e.preventDefault();
      const handleCut = (e) => e.preventDefault();

      const handleKeyDown = (e) => {
        if (e.key === 'F11') e.preventDefault();
        if (e.key === 'Escape') { e.preventDefault(); requestFullScreen(); }
      };

      const fullscreenGuard = setInterval(async () => {
        const isNowFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (!isNowFull && !isSubmittedRef.current && !examCancelledRef.current) requestFullScreen();

        // 🚨 Anti-Dual Monitor Check
        if (window.screen && window.screen.isExtended && !examCancelledRef.current && !isSubmittedRef.current) {
          const now = Date.now();
          if (lastViolationLogRef.current.type !== "External Display Attached" || (now - lastViolationLogRef.current.timestamp) > 10000) {
             const evidence = await takeSnapshot();
             setSwitchCount(prev => {
                const next = prev + 1;
                syncProctoring(next, "External Display Attached", evidence);
                setShowWarning(true);
                setLastAIAction("External Display Attached");
                if (next >= 10) {
                  setExamCancelled(true);
                  examCancelledRef.current = true;
                  setTimeout(() => navigate('/'), 4000);
                }
                return next;
             });
             lastViolationLogRef.current = { type: "External Display Attached", timestamp: now };
          }
        }
      }, 1000);

      document.addEventListener('visibilitychange', handleVisibility);
      document.addEventListener('fullscreenchange', handleFullScreenChange);
      document.addEventListener('keydown', handleCopyPaste);
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('contextmenu', handleRightClick);
      document.addEventListener('paste', handlePaste);
      document.addEventListener('copy', handleCopy);
      document.addEventListener('cut', handleCut);

      return () => {
        clearInterval(timer);
        clearInterval(fullscreenGuard);
        document.removeEventListener('visibilitychange', handleVisibility);
        document.removeEventListener('fullscreenchange', handleFullScreenChange);
        document.removeEventListener('keydown', handleCopyPaste);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('contextmenu', handleRightClick);
        document.removeEventListener('paste', handlePaste);
        document.removeEventListener('copy', handleCopy);
        document.removeEventListener('cut', handleCut);
      };
    }, [isPreCheckDone, isSubmitted, examCancelled, sessionId]);

    // ─────────────────────────────────────────────────────────────────
    //  Answer handlers
    // ─────────────────────────────────────────────────────────────────
    const handleOptionSelect = (qId, i) => setAnswers(prev => ({ ...prev, [qId]: i }));

    // ─────────────────────────────────────────────────────────────────
    //  RENDERS
    // ─────────────────────────────────────────────────────────────────
    if (loading && !exam) return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center font-black text-indigo-500 uppercase tracking-[0.3em] animate-pulse">
        Initializing Secured Environment...
      </div>
    );

    if (error || !exam) return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center text-center p-10">
        <h1 className="text-2xl font-black text-red-500 uppercase">{error || "Exam Unavailable"}</h1>
      </div>
    );

    if (examCancelled) return (
      <div className="min-h-screen bg-red-950 flex items-center justify-center p-6">
        <div className="bg-white rounded-[3rem] p-16 max-w-xl text-center shadow-2xl border-b-[12px] border-red-600">
          <h1 className="text-5xl font-black text-red-600 mb-6 italic uppercase">SESSION TERMINATED</h1>
          <p className="text-slate-500 font-bold text-lg mb-10">
            Unauthorized behavior detected. Your session has been flagged and suspended for review.
          </p>
          <button onClick={() => navigate('/')} className="px-12 py-5 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-200">
            EXIT MODULE
          </button>
        </div>
      </div>
    );

    // ── PRE-CHECK SCREEN ─────────────────────────────────────────────
    if (!isPreCheckDone) {
      const statusConfig = {
        idle: { color: "text-slate-400", bg: "bg-slate-800/50", border: "border-slate-700", icon: "👁️" },
        loading: { color: "text-indigo-400", bg: "bg-indigo-900/30", border: "border-indigo-500/40", icon: "⏳" },
        matched: { color: "text-emerald-400", bg: "bg-emerald-900/30", border: "border-emerald-500/40", icon: "✅" },
        mismatch: { color: "text-red-400", bg: "bg-red-900/30", border: "border-red-500/40", icon: "❌" },
        no_face: { color: "text-amber-400", bg: "bg-amber-900/30", border: "border-amber-500/40", icon: "⚠️" },
        error: { color: "text-orange-400", bg: "bg-orange-900/30", border: "border-orange-500/40", icon: "🔧" },
      };
      const sc = statusConfig[faceVerifyStatus];

      return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-gray-900 rounded-[3rem] p-12 lg:p-16 text-center border border-white/5 shadow-2xl">
            <h1 className="text-5xl font-black mb-2 italic uppercase tracking-tighter">Identity Verification</h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-8">Biometric Security Gate</p>

            <div className="bg-indigo-600/10 p-6 rounded-3xl mb-8 border border-indigo-500/20">
              <h2 className="text-xl font-black text-indigo-400 uppercase tracking-widest">{exam.title}</h2>
            </div>

            <div className="relative mb-6 rounded-[2rem] overflow-hidden border-4 border-indigo-500/30 bg-black aspect-video flex items-center justify-center shadow-2xl shadow-indigo-500/10">
              <video ref={videoRef} 
              autoPlay 
              playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              {faceVerifyStatus === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="w-48 h-48 border-4 border-indigo-500 rounded-full animate-ping opacity-30"></div>
                  <div className="absolute w-32 h-32 border-2 border-indigo-400 rounded-full animate-pulse"></div>
                </div>
              )}
              {faceVerifyStatus === "matched" && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-900/30">
                  <div className="text-6xl">✅</div>
                </div>
              )}
              {faceVerifyStatus === "mismatch" && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-900/40">
                  <div className="text-6xl">❌</div>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-8 text-red-500 font-black uppercase tracking-widest">
                  {cameraError}
                </div>
              )}
            </div>

            <div className={`${sc.bg} ${sc.border} border rounded-2xl p-4 mb-6 flex items-center gap-3`}>
              <span className="text-2xl">{sc.icon}</span>
              <p className={`${sc.color} font-bold text-sm text-left`}>
                {verifyMessage || "Click 'Verify Face' to scan your identity before starting the exam."}
              </p>
            </div>

            {faceVerifyStatus !== "matched" && (
              <button
                onClick={verifyFacePreCheck}
                disabled={!!cameraError || faceVerifyStatus === "loading"}
                className={`w-full py-5 text-lg font-black rounded-3xl transition-all uppercase tracking-widest mb-4
                  ${(!cameraError && faceVerifyStatus !== "loading")
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
              >
                {faceVerifyStatus === "loading" ? "Scanning..." : "🔍 Verify My Face"}
              </button>
            )}

            {faceVerifyStatus === "matched" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4 bg-white/5 p-5 rounded-2xl">
                  <input
                    type="checkbox"
                    id="check"
                    checked={hasConfirmedCheck}
                    onChange={e => setHasConfirmedCheck(e.target.checked)}
                    className="w-7 h-7 rounded-xl accent-indigo-500"
                  />
                  <label htmlFor="check" className="text-sm text-gray-400 font-bold uppercase tracking-wider text-left">
                    I confirm my environment is secured and I am ready to begin.
                  </label>
                </div>
                <button
                  onClick={startSession}
                  disabled={!hasConfirmedCheck}
                  className={`w-full py-6 text-2xl font-black rounded-3xl transition-all uppercase tracking-widest
                    ${hasConfirmedCheck
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
                >
                  Begin Exam →
                </button>
              </div>
            )}

            {(faceVerifyStatus === "mismatch" || faceVerifyStatus === "no_face") && (
              <p className="text-slate-600 text-xs mt-4 font-bold uppercase tracking-widest">
                Ensure good lighting · Face camera directly · Remove glasses if needed
              </p>
            )}
          </div>
        </div>
      );
    }

    // ── EXAM SCREEN ──────────────────────────────────────────────────
    const q = exam.questions[currentQuestionIndex];

    return (
      <div ref={examContainerRef} className="min-h-screen bg-white flex flex-col text-slate-800">

        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black italic uppercase">EP</div>
              <div>
                <h1 className="font-black text-xl text-slate-900 tracking-tight">{exam.title}</h1>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{exam.subject} — SECURED</p>
              </div>
            </div>

            <div className="flex items-center gap-10">
              {lastAIAction && (
                <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 flex items-center gap-2 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-600"></div>
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">AI ALERT: {lastAIAction}</span>
                </div>
              )}
              {!lastAIAction && (
                <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">AI Monitoring Active</span>
                </div>
              )}
              {/* FIX 4: Use state variable headViolationCount instead of ref for re-renders */}
              {headViolationCount > 0 && (
                <div className="bg-orange-50 px-3 py-2 rounded-xl border border-orange-100 flex items-center gap-2">
                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
                    Head Turns: {headViolationCount}/5
                  </span>
                </div>
              )}
              <div className="text-right">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Session Expiring</p>
                <p className={`text-4xl font-black tracking-tighter ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-900'}`}>
                  {formatTime(timeLeft)}
                </p>
              </div>
              <button
                onClick={() => window.confirm("Final submission?") && handleSubmit()}
                className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:scale-105 transition-transform uppercase tracking-widest text-xs"
              >
                Terminate & Submit
              </button>
            </div>
          </div>
        </header>

        {/* Floating Video */}
        <div className="fixed bottom-10 right-10 z-50 group">
          <div className={`relative w-64 aspect-video rounded-[2.5rem] overflow-hidden border-4 shadow-2xl bg-black transform group-hover:scale-105 transition-all duration-500
            ${lastAIAction === "Impersonation Detected" ? 'border-red-500' : lastAIAction === "Head Turn Detected" ? 'border-orange-500' : 'border-indigo-600'}`}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <div className={`absolute top-4 right-4 w-3 h-3 rounded-full animate-pulse
              ${lastAIAction ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'}`}>
            </div>
            {lastAIAction === "Impersonation Detected" && (
              <div className="absolute inset-0 border-4 border-red-500 rounded-[2.5rem] animate-ping opacity-40 pointer-events-none"></div>
            )}
            {lastAIAction === "Head Turn Detected" && (
              <div className="absolute inset-0 border-4 border-orange-500 rounded-[2.5rem] animate-ping opacity-40 pointer-events-none"></div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-[9px] font-black text-white/50 uppercase tracking-widest text-center">
                {lastAIAction === "Impersonation Detected" ? "⚠️ IDENTITY MISMATCH"
                  : lastAIAction === "Head Turn Detected" ? "⚠️ LOOK FORWARD"
                    : "PROCTORING ACTIVE"}
              </p>
            </div>
          </div>
        </div>

        {/* Warning Modal */}
        {showWarning && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
            <div className="bg-white rounded-[3.5rem] p-16 max-w-lg w-full text-center shadow-2xl border-b-[12px] border-amber-500">
              <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 text-5xl font-black shadow-xl shadow-amber-100">!</div>
              <h2 className="text-4xl font-black text-slate-900 mb-6 italic uppercase">Integrity Alert</h2>
              <p className="text-slate-500 mb-10 font-bold text-lg">
                {lastAIAction === "Multiple Persons Detected" && "Multiple persons detected in secured module. Monitoring will continue."}
                {lastAIAction === "No Face Detected" && "Identity absent. Please return to your seat immediately."}
                {lastAIAction === "Mobile Phone Detected" && "Unauthorized device detected. All data has been logged for review."}
                {lastAIAction === "Impersonation Detected" && "Face identity mismatch detected. This incident has been recorded and flagged for admin review."}
                {lastAIAction === "Head Turn Detected" && `Head turned away from screen for more than 3 seconds. Please keep your eyes on the screen. Warning ${headViolationCount}/5 — exam auto-submits at 5.`}
                {lastAIAction === "External Display Attached" && "Strict Single-Screen Policy: An external or secondary monitor was detected. Please unplug it immediately to continue."}
                {lastAIAction === "Connection Lost" && "Internet connectivity lost. Your data has been securely saved locally. Please reconnect to WiFi—exam will strictly resume or submit automatically once connection is restored."}
                {!["Multiple Persons Detected", "No Face Detected", "Mobile Phone Detected", "Impersonation Detected", "Head Turn Detected", "External Display Attached", "Connection Lost"].includes(lastAIAction)
                  && "Suspicious behavior detected. Continued violations will result in automatic termination."}
              </p>
              {!["Multiple Persons Detected", "No Face Detected", "Connection Lost"].includes(lastAIAction) && (
                <button
                  onClick={() => { setShowWarning(false); setLastAIAction(""); mobileBufferRef.current = 0; }}
                  className="w-full py-5 bg-amber-500 text-white font-black rounded-3xl shadow-xl shadow-amber-200 uppercase tracking-widest"
                >
                  Acknowledge
                </button>
              )}
              {["Multiple Persons Detected", "No Face Detected"].includes(lastAIAction) && (
                <div className="py-5 bg-amber-50 text-amber-600 font-black rounded-3xl uppercase tracking-widest animate-pulse border-2 border-amber-200">
                  Awaiting Re-Detection...
                </div>
              )}
              {lastAIAction === "Connection Lost" && (
                <div className="py-5 bg-amber-50 text-amber-600 font-black rounded-3xl uppercase tracking-widest animate-pulse border-2 border-amber-200">
                  Awaiting Network Reconnection...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main exam body */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-8 py-16">
          <div className="mb-16">
            <div className="flex justify-between items-end mb-5">
              <span className="text-xs font-black text-slate-300 uppercase tracking-widest">
                Phase {currentQuestionIndex + 1} / {exam.questions.length}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-widest">
                  {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'truefalse' ? 'True / False' : 'Short Answer'}
                </span>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl uppercase tracking-widest">
                  {q.marks} Logic Weight
                </span>
              </div>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-700 ease-out shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                style={{ width: `${((currentQuestionIndex + 1) / exam.questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-[3.5rem] p-16 shadow-2xl shadow-slate-200/50 border border-slate-50 mb-12">
            <h2 className="text-4xl font-black text-slate-900 mb-16 leading-tight tracking-tight text-center italic uppercase">
              {q.question}
            </h2>

            {/* SHORT ANSWER */}
            {(q.type === 'short' || q.type === 'short answer' || q.type === 'Short') ? (
              <div className="w-full">
                <textarea
                  rows={5}
                  placeholder="Type your answer here..."
                  value={answers[q._id] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [q._id]: e.target.value }))}
                  className="w-full p-6 text-lg font-medium text-slate-800 border-4 border-slate-100 rounded-[2rem] focus:outline-none focus:border-indigo-500 resize-none transition-all placeholder:text-slate-300"
                />
                <p className="text-xs text-slate-300 font-black uppercase tracking-widest mt-3 text-right">
                  {(answers[q._id] || '').length} characters
                </p>
              </div>
            ) : (
              /* MCQ / TRUE-FALSE */
              <div className={`grid gap-6 ${q.type === 'truefalse' || (q.options && q.options.length === 2)
                ? 'grid-cols-1 max-w-lg mx-auto w-full'
                : 'grid-cols-1 md:grid-cols-2'
                }`}>
                {(q.type === 'truefalse' ? ['True', 'False'] : (q.options || [])).map((opt, i) => {
                  const optionText = typeof opt === 'object'
                    ? (opt.text || opt.value || opt.label || JSON.stringify(opt))
                    : String(opt || '');

                  return (
                    <button
                      key={i}
                      onClick={() => handleOptionSelect(q._id, i)}
                      className={`group relative p-8 rounded-[2rem] border-4 transition-all text-left overflow-hidden
                        ${answers[q._id] === i
                          ? 'border-indigo-600 bg-indigo-50/30'
                          : 'border-slate-50 hover:border-slate-200 hover:bg-slate-50/50 scale-95 opacity-80 hover:scale-100 hover:opacity-100'}`}
                    >
                      <div className="flex items-center gap-8 relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl transition-all
                          ${answers[q._id] === i ? 'bg-indigo-600 text-white rotate-12 scale-110 shadow-lg shadow-indigo-300' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                          {q.type === 'truefalse' ? (i === 0 ? '✓' : '✗') : String.fromCharCode(65 + i)}
                        </div>
                        <span className={`text-xl font-bold transition-all ${answers[q._id] === i ? 'text-indigo-900 translate-x-1' : 'text-slate-500'}`}>
                          {optionText}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(i => i - 1)}
              className="px-10 py-5 text-slate-300 font-black uppercase tracking-widest hover:text-indigo-600 disabled:opacity-0 transition-all"
            >
              ← Back
            </button>
            {currentQuestionIndex === exam.questions.length - 1 ? (
              <button
                onClick={() => window.confirm("Finalize logic sequence?") && handleSubmit()}
                className="px-16 py-6 bg-emerald-600 text-white font-black rounded-[2rem] shadow-2xl shadow-emerald-200 hover:scale-105 transition-transform uppercase tracking-widest italic"
              >
                Submit Final Decision
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex(i => i + 1)}
                className="px-16 py-6 bg-slate-900 text-white font-black rounded-[2rem] hover:scale-105 transition-transform shadow-2xl shadow-slate-300 uppercase tracking-[0.2em] italic"
              >
                Next Phase →
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }