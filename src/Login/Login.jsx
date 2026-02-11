import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo/photonic.png";
import Swal from "sweetalert2";

export default function Login() {
  const [isActive, setIsActive] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState(""); // 👈 error message

  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");

  const navigate = useNavigate();

  const { setUsername, setPassword } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(""); // clear old error

    // basic validation
    if (!loginUser.trim() || !loginPass.trim()) {
      setLoginError("Enter username and password.");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUser,
          password: loginPass,
        }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (_) {
        data = null;
      }

      if (!res.ok) {
        // show FB-style inline message instead of alert
        setLoginError("Username or password incorrect");
        return;
      }

      // success
      Swal.fire({
        icon: "success",
        title: `Hello ${loginUser}`,
        showConfirmButton: false,
        timer: 1500,
      });

      if (data?.access_token) {
        localStorage.setItem("token", data.access_token);
      }

      // 🔹 store username & password so Controller can use them after refresh
      localStorage.setItem("username", loginUser.trim());
      localStorage.setItem("password", loginPass.trim());
      localStorage.setItem("token", data.access_token);
      // localStorage.setItem("user", loginUser.trim());


      // keep context in sync
      setUsername(loginUser.trim());
      setPassword(loginPass.trim());
      setLoggedInUser(loginUser.trim());
      navigate("/Controller");
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Server not reachable. Please try again.",
      });
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!regUser.trim() || !regEmail.trim() || !regPass.trim()) {
      alert("Fill all fields");
      return;
    }
    alert("Registered Successfully!");
    setIsActive(false);
  };

  const handleLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "Do you really want to logout?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Logout",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        setLoggedInUser(null);
        setLoginUser("");
        setLoginPass("");
      }
    });
  };

  return (
    <div
      className="flex justify-center items-center min-h-screen bg-gradient-to-r from-[#e2e2e2] to-[#c9d6ff]"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      {/* Logged-in welcome screen */}
      {loggedInUser ? (
        <div className="w-[400px] p-10 bg-white rounded-2xl shadow-xl text-center">
          <h1 className="text-3xl font-semibold mb-3">
            Welcome, {loggedInUser} 👋
          </h1>
          <button
            onClick={handleLogout}
            className="mt-5 bg-[#01a0e2] text-white px-6 py-2 rounded-full hover:bg-[#4060d0] transition"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="relative w-[850px] h-[550px] bg-white rounded-[30px] shadow-[0_0_30px_rgba(0,0,0,0.2)] overflow-hidden">
          {/* BIG BLUE ANIMATION SHAPE */}
          <div
            className="absolute top-0 left-[-250%] w-[300%] h-full rounded-[150px] bg-[#01a0e2] z-20 transition-all duration-[1800ms] ease-in-out"
            style={{ left: isActive ? "50%" : "-250%" }}
          ></div>

          {/* TEXT PANELS OVER THE BLUE SHAPE */}
          <div className="absolute inset-0 z-30 pointer-events-none">
            {/* LEFT PANEL */}
            <div
              className="absolute left-0 top-0 w-1/2 h-full flex flex-col justify-center items-center text-white p-10 transition-all duration-[600ms] ease-in-out"
              style={{
                transform: isActive ? "translateX(-100%)" : "translateX(0)",
                transitionDelay: isActive ? "0.6s" : "1.2s",
                pointerEvents: isActive ? "none" : "auto",
              }}
            >
              <h1 className="text-[36px] font-semibold">Hello, Welcome!</h1>
              <p className="text-[14.5px] mt-3">Don't have an account?</p>
              <button
                onClick={() => setIsActive(true)}
                className="pointer-events-auto mt-4 bg-transparent border border-white px-8 py-2 rounded-full text-white hover:bg-white hover:text-[#7494ec] transition"
              >
                Register
              </button>
            </div>

            {/* RIGHT PANEL */}
            <div
              className="absolute right-0 top-0 w-1/2 h-full flex flex-col justify-center items-center text-white p-10 transition-all duration-[600ms] ease-in-out"
              style={{
                transform: isActive ? "translateX(0)" : "translateX(100%)",
                transitionDelay: isActive ? "1.2s" : "0.6s",
                pointerEvents: isActive ? "auto" : "none",
              }}
            >
              <h1 className="text-[36px] font-semibold">Welcome Back!</h1>
              <p className="text-[14.5px] mt-3">Already have an account?</p>
              <button
                onClick={() => setIsActive(false)}
                className="pointer-events-auto mt-4 bg-transparent border border-white px-8 py-2 rounded-full text-white hover:bg-white hover:text-[#7494ec] transition"
              >
                Login
              </button>
            </div>
          </div>

          {/* LOGIN FORM */}
          <form
            onSubmit={handleLogin}
            className="absolute right-0 w-1/2 h-full flex flex-col justify-center items-center p-10 text-center bg-white z-10 transition-all duration-700"
            style={{
              opacity: isActive ? 0 : 1,
              transform: isActive ? "translateX(120%)" : "translateX(0)",
            }}
          >
            {/* Logo */}
            <div className="flex justify-center items-center w-full ">
              <img src={logo} alt="Photonic Logo" className="w-40 h-auto z-50" />
            </div>

            {/* Error message bar */}
            {loginError && (
              <div className="w-full mt-4 mb-2 flex items-start justify-between gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                <span>{loginError}</span>
                <button
                  type="button"
                  onClick={() => setLoginError("")}
                  className="ml-2 text-red-500 hover:text-red-700 font-semibold leading-none"
                >
                  ×
                </button>
              </div>
            )}

            <div className="w-full flex flex-col gap-4 mt-2">
              {/* Username */}
              <div className="w-full bg-[#eee] rounded-full flex items-center px-5 py-2">
                <i className="bx bxs-user text-[18px] mr-2"></i>
                <input
                  type="text"
                  placeholder="Username"
                  className="bg-transparent outline-none w-full"
                  value={loginUser}
                  onChange={(e) => {
                    if (loginError) setLoginError("");
                    setLoginUser(e.target.value);
                  }}
                />
              </div>

              {/* Password */}
              <div className="w-full bg-[#eee] rounded-full flex items-center px-5 py-2">
                <i className="bx bxs-lock-alt text-[18px] mr-2"></i>
                <input
                  type="password"
                  placeholder="Password"
                  className="bg-transparent outline-none w-full"
                  value={loginPass}
                  onChange={(e) => {
                    if (loginError) setLoginError("");
                    setLoginPass(e.target.value);
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-7 w-[150px] py-2 rounded-full bg-[#01a0e2] text-white hover:bg-[#4664d7] transition"
            >
              Login
            </button>
          </form>

          {/* REGISTER FORM */}
          <form
            onSubmit={handleRegister}
            className="absolute left-0 w-1/2 h-full flex flex-col justify-center items-center p-10 text-center bg-white z-10 transition-all duration-700"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? "translateX(0)" : "translateX(-120%)",
            }}
          >
            <h1 className="text-[36px] font-semibold mb-5">Register</h1>

            <div className="w-full flex flex-col gap-4 mt-2">
              <div className="w-full bg-[#eee] rounded-full flex items-center px-5 py-2">
                <i className="bx bxs-user text-[18px] mr-2"></i>
                <input
                  type="text"
                  placeholder="Username"
                  className="bg-transparent outline-none w-full"
                  value={regUser}
                  onChange={(e) => setRegUser(e.target.value)}
                />
              </div>

              <div className="w-full bg-[#eee] rounded-full flex items-center px-5 py-2">
                <i className="bx bxs-envelope text-[18px] mr-2"></i>
                <input
                  type="email"
                  placeholder="Email"
                  className="bg-transparent outline-none w-full"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>

              <div className="w-full bg-[#eee] rounded-full flex items-center px-5 py-2">
                <i className="bx bxs-lock-alt text-[18px] mr-2"></i>
                <input
                  type="password"
                  placeholder="Password"
                  className="bg-transparent outline-none w-full"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-7 w-[150px] py-2 rounded-full bg-[#01a0e2] text-white hover:bg-[#4664d7] transition"
            >
              Register
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
