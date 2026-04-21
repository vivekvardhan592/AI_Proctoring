import React, { useState } from "react";
import "../App.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faEnvelope, faEye, faEyeSlash, faBuilding } from "@fortawesome/free-solid-svg-icons";

const Auth = () => {
  const [toggled, setToggled] = useState(false);
  const [showForgot, setShowForgot] = useState(false);



  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRole, setLoginRole] = useState("student"); // default: student
  const [loginInstitution, setLoginInstitution] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");

  // ── Register state ──
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState("student"); // default: student
  const [regInstitution, setRegInstitution] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  // ── Forgot password state ──
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [resetStep, setResetStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // ── Password Visibility Toggles ──
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // ✅ Regex patterns
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nameRegex = /^[A-Za-z ]{3,30}$/;

  // ✅ Validators
  const validateEmail = (email) => emailRegex.test(email);
  const validatePassword = (password) =>
    /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password);
  const validateName = (name) => nameRegex.test(name);
  const sanitizeInput = (input) => input.replace(/[<>]/g, "");
  // ══════════════════════════════════════════
  //  HANDLE LOGIN
  // ══════════════════════════════════════════
  // ✅ Sanitize

  const handleLogin = async (e) => {
    e.preventDefault();

    // ✅ Reset states
    setLoginError("");
    setLoginSuccess("");
    if (loginLoading) return;
    setLoginLoading(true);

    // ✅ Prevent multiple clicks

    // ✅ Sanitize + Trim
    const email = sanitizeInput(loginEmail.trim());
    const password = sanitizeInput(loginPassword.trim());
    const institution = sanitizeInput(loginInstitution.trim());

    // ✅ Validation
    if (!email || !password || !institution) {
      setLoginError("All fields are required");
      setLoginLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setLoginError("Invalid email format");
      setLoginLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setLoginError("Password must be at least 6 characters");
      setLoginLoading(false);
      return;
    }
    if (email.length > 50) {
      setLoginError("Email too long");
      setLoginLoading(false);
      return;
    }

    if (password.length > 50) {
      setLoginError("Password too long");
      setLoginLoading(false);
      return;
    }

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          password: password,
          role: loginRole,
          institution: institution,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.message || "Login failed. Please try again.");
      } else {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data));
        setLoginSuccess(`Welcome back, ${data.data.name}! Redirecting...`);

        setLoginEmail("");
        setLoginPassword("");
        setLoginInstitution("");

        setTimeout(() => {
          const authParams = `?token=${encodeURIComponent(data.data.token)}&user=${encodeURIComponent(JSON.stringify(data.data))}`;
          window.location.href =
            data.data.role === "admin"
              ? import.meta.env.VITE_ADMIN_URL + authParams
              : import.meta.env.VITE_STUDENT_URL + authParams;
        }, 300);
      }
    } catch (err) {
      setLoginError("Network error. Is the backend running?");
    } finally {
      setLoginLoading(false);
    }
  };
  // ══════════════════════════════════════════
  //  HANDLE REGISTER
  // ══════════════════════════════════════════

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");

    // Enforce strong passwords (min 8 chars, at least one letter and one number)
    if (regPassword.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(regPassword)) {
      return setRegError("Password must be at least 8 characters and include both letters and numbers.");
    }

    setRegLoading(true);

    // ✅ Sanitize + Trim
    const name = sanitizeInput(regName.trim());
    const email = sanitizeInput(regEmail.trim());
    const password = sanitizeInput(regPassword.trim());
    const institution = sanitizeInput(regInstitution.trim());

    // ✅ Validation
    if (!name || !email || !password || !institution) {
      setRegError("All fields are required");
      setRegLoading(false);
      return;
    }

    if (!validateName(name)) {
      setRegError("Name must be 3-30 letters only");
      setRegLoading(false);
      return;
    }
    if (name.length > 30) {
      setRegError("Name too long");
      setRegLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setRegError("Invalid email format");
      setRegLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setRegError("Password must be at least 6 characters");
      setRegLoading(false);
      return;
    }
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          email: email,
          password: password,
          role: regRole,
          institution: institution,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRegError(data.message || "Registration failed. Please try again.");
      } else {
        setRegSuccess("Account created! Redirecting to login...");
        setRegName("");
        setRegEmail("");
        setRegPassword("");
        setRegInstitution("");
        // Switch back to login panel after a short delay
        setTimeout(() => {
          setToggled(false);
          setRegSuccess("");
          setRegRole("student"); // Reset role after successful registration
        }, 300);
      }
    } catch (err) {
      setRegError("Network error. Is the backend server running?");
    } finally {
      setRegLoading(false);
    }
  };

  // ══════════════════════════════════════════
  //  HANDLE FORGOT PASSWORD (unchanged)
  // ══════════════════════════════════════════
  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotMsg("");
    setForgotError("");
    setForgotLoading(true);

    if (!validateEmail(forgotEmail.trim())) {
      setForgotError("Enter a valid email");
      setForgotLoading(false);
      return;
    }
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + "/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.message || "Failed to send OTP.");
      } else {
        setForgotMsg("OTP sent to your email!");
        setResetStep(2);
      }
    } catch (err) {
      setForgotError("Network error. Is the backend server running?");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotMsg("");
    setForgotError("");
    if (!/^\d{6}$/.test(resetOtp)) {
      setForgotError("OTP must be 6 digits");
      return;
    }

    if (resetNewPassword.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(resetNewPassword)) {
      setForgotError("Password must be at least 8 characters and include both letters and numbers.");
      return;
    }

    if (resetNewPassword !== confirmNewPassword) {
      return setForgotError("Passwords do not match");
    }

    setForgotLoading(true);

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + "/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: resetOtp, newPassword: sanitizeInput(resetNewPassword.trim()) }),
      });

      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.message || "Failed to reset password.");
      } else {
        setForgotMsg("Password reset successful! You can now log in.");
        setTimeout(() => {
          setShowForgot(false);
          setResetStep(1);
          setForgotEmail("");
          setResetOtp("");
          setResetNewPassword("");
          setConfirmNewPassword("");
          setForgotMsg("");
        }, 800);
      }
    } catch (err) {
      setForgotError("Network error. Is the backend server running?");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className={`auth-wrapper ${toggled ? "toggled" : ""}`}>
      <div className="background-shape"></div>
      <div className="secondary-shape"></div>

      {/* ═══════════ LOGIN PANEL ═══════════ */}
      <div className="credentials-panel signin">
        <h2 className="slide-element">Login</h2>
        <form onSubmit={handleLogin} autoComplete="off">

          {/* Role Selection Dropdown - Added here */}
          <div className="field-wrapper slide-element">
            <select
              value={loginRole}
              onChange={(e) => setLoginRole(e.target.value)}
              className="role-select"
              required
            >
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="field-wrapper slide-element">
            <input
              type="email"
              required
              autoComplete="off"
              placeholder="Enter your email"
              value={loginEmail}
              onChange={(e) => {
                const value = e.target.value;
                setLoginEmail(value);

                if (value && !validateEmail(value)) {
                  setLoginError("Invalid email format");
                } else {
                  setLoginError("");
                }
              }}
            />
            <FontAwesomeIcon icon={faEnvelope} className="icon-main" />
          </div>

          <div className="field-wrapper slide-element">
            <input
              type="text"
              required
              autoComplete="new-password"
              placeholder="Enter Institution / Company"
              value={loginInstitution}
              onChange={(e) => setLoginInstitution(e.target.value)}
            />
            <FontAwesomeIcon icon={faBuilding} className="icon-main" />
          </div>

          <div className="field-wrapper slide-element">
            <input
              type={showLoginPwd ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="Enter your password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            <FontAwesomeIcon icon={faLock} className="icon-main" />
            <FontAwesomeIcon
              icon={showLoginPwd ? faEyeSlash : faEye}
              className="icon-eye pw-toggle"
              onClick={() => setShowLoginPwd(!showLoginPwd)}
            />
          </div>

          <div className="switch-link slide-element">
            <p>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  setLoginError("");
                  setLoginSuccess("");
                  setShowForgot(true);
                  setResetStep(1);
                  setForgotMsg("");
                  setForgotError("");
                }}
              >
                Forgot Password?
              </a>
            </p>
          </div>

          {/* Feedback messages */}
          {loginError && <p className="auth-msg error-msg">{loginError}</p>}
          {loginSuccess && <p className="auth-msg success-msg">{loginSuccess}</p>}

          <div className="field-wrapper slide-element">
            <button className="submit-button" type="submit" disabled={loginLoading}>
              {loginLoading ? "Logging in..." : "Login"}
            </button>
          </div>

          <div className="switch-link slide-element">
            <p>
              Don't have an account? <br />
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  setToggled(true);
                  setLoginError("");
                  setLoginSuccess("");
                }}
              >
                Sign Up
              </a>
            </p>
          </div>
        </form>
      </div>

      {/* ═══════════ FORGOT PASSWORD OVERLAY ═══════════ */}
      {showForgot && (
        <div className="forgot-overlay">
          <div className="forgot-card">
            <h2>Reset Password</h2>

            {resetStep === 1 ? (
              <form onSubmit={handleForgot}>
                <div className="field-wrapper">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                  <FontAwesomeIcon icon={faEnvelope} className="icon-main" />
                </div>
                <br />

                {forgotError && <p className="auth-msg error-msg">{forgotError}</p>}
                {forgotMsg && <p className="auth-msg success-msg">{forgotMsg}</p>}

                <button className="submit-button" type="submit" disabled={forgotLoading}>
                  {forgotLoading ? "Sending OTP..." : "Send Reset OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className="field-wrapper">
                  <input
                    type="text"
                    required
                    placeholder="Enter 6-digit OTP"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                  />
                  <FontAwesomeIcon icon={faLock} className="icon-main" />
                </div>
                <br />
                <div className="field-wrapper">
                  <input
                    type={showResetPwd ? "text" : "password"}
                    required
                    placeholder="New Password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                  />
                  <FontAwesomeIcon icon={faLock} className="icon-main" />
                  <FontAwesomeIcon
                    icon={showResetPwd ? faEyeSlash : faEye}
                    className="icon-eye pw-toggle"
                    onClick={() => setShowResetPwd(!showResetPwd)}
                  />
                </div>
                <br />
                <div className="field-wrapper">
                  <input
                    type={showConfirmPwd ? "text" : "password"}
                    required
                    placeholder="Confirm New Password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                  <FontAwesomeIcon icon={faLock} className="icon-main" />
                  <FontAwesomeIcon
                    icon={showConfirmPwd ? faEyeSlash : faEye}
                    className="icon-eye pw-toggle"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  />
                </div>
                <br />

                {forgotError && <p className="auth-msg error-msg">{forgotError}</p>}
                {forgotMsg && <p className="auth-msg success-msg">{forgotMsg}</p>}

                <button className="submit-button" type="submit" disabled={forgotLoading}>
                  {forgotLoading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}

            <p className="back-login">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  setShowForgot(false);
                  setResetStep(1);
                  setForgotMsg("");
                  setForgotError("");
                  setForgotEmail("");
                }}
              >
                Back to Login
              </a>
            </p>
          </div>
        </div>
      )}

      {/* ═══════════ LOGIN WELCOME ═══════════ */}
      <div className="welcome-section signin">
        <h2 className="slide-element">WELCOME BACK!</h2>
      </div>

      {/* ═══════════ SIGNUP PANEL ═══════════ */}
      <div className="credentials-panel signup">
        <h2 className="slide-element">Register</h2>
        <form onSubmit={handleRegister} autoComplete="off">

          <div className="form-row slide-element">
            <div className="field-wrapper">
              <input
                type="text"
                required
                autoComplete="off"
                placeholder="Username"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
              <FontAwesomeIcon icon={faUser} className="icon-main" />
            </div>

            <div className="field-wrapper">
              <input
                type="email"
                required
                autoComplete="off"
                placeholder="Email address"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
              <FontAwesomeIcon icon={faEnvelope} className="icon-main" />
            </div>
          </div>

          <div className="field-wrapper slide-element">
            <input
              type={showRegPwd ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="Create a password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
            />
            <FontAwesomeIcon icon={faLock} className="icon-main" />
            <FontAwesomeIcon
              icon={showRegPwd ? faEyeSlash : faEye}
              className="icon-eye pw-toggle"
              onClick={() => setShowRegPwd(!showRegPwd)}
            />
          </div>

          <div className="form-row slide-element">
            <div className="field-wrapper">
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                className="role-select"
                required
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
              <FontAwesomeIcon icon={faUser} className="icon-main" />
            </div>

            <div className="field-wrapper">
              <input
                type="text"
                required
                autoComplete="new-password"
                placeholder="Institution"
                value={regInstitution}
                onChange={(e) => setRegInstitution(e.target.value)}
              />
              <FontAwesomeIcon icon={faBuilding} className="icon-main" />
            </div>
          </div>

          {/* Feedback messages */}
          {regError && <p className="auth-msg error-msg">{regError}</p>}
          {regSuccess && <p className="auth-msg success-msg">{regSuccess}</p>}

          <div className="field-wrapper slide-element">
            <button className="submit-button" type="submit" disabled={regLoading}>
              {regLoading ? "Registering..." : "Register"}
            </button>
          </div>

          <div className="switch-link slide-element">
            <p>
              Already have an account? <br />
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  setToggled(false);
                  setRegError("");
                  setRegSuccess("");
                }}
              >
                Sign In
              </a>
            </p>
          </div>
        </form>
      </div>

      {/* ═══════════ SIGNUP WELCOME ═══════════ */}
      <div className="welcome-section signup">
        <h2 className="slide-element">WELCOME!</h2>
      </div>
    </div>
  );
};

export default Auth;