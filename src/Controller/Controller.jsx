import { useState, useEffect } from "react";
import axios from "axios";
import { FiCpu, FiRefreshCw, FiEdit2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo/photonic.png";
import profilephoto from "../assets/profile/profile.png";
import Swal from "sweetalert2";

export default function Controller() {
  const { username, password } = useAuth();
  const [controllers, setControllers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleControllerClick = (ctrl) => {
    navigate("/Dashboard", {
      state: { id: ctrl.id, name: ctrl.name, status: ctrl.status },
    });
  };

  const handleLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "Do you really want to logout?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Logout",
    }).then((r) => {
      if (r.isConfirmed) {
        localStorage.clear();
        window.location.href = "/";
      }
    });
  };

  const handleClientLogin = async () => {
    const u = username || localStorage.getItem("username");
    const p = password || localStorage.getItem("password");
    if (!u || !p) return;

    setLoading(true);
    setError("");

    try {
      const res = await axios.post("https://psdas-aqua-farming.onrender.com/login", {
        username: u,
        password: p,
      });
      setControllers(res.data.controllers || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
      setControllers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(handleClientLogin, 400);
    return () => clearTimeout(t);
  }, [username, password]);

  const softColors = [
    "bg-[#DFEDFF]",
    "bg-[#FFE7D1]",
    "bg-[#E6E2FF]",
    "bg-[#DFFFE8]",
    "bg-[#FFE0EB]",
    "bg-[#EBDFFF]",
    "bg-[#E3F3FF]",
    "bg-[#FFF4D6]",
  ];

  const handleRenameClick = async (e, ctrl) => {
    e.stopPropagation();

    const { value } = await Swal.fire({
      title: "Rename Controller",
      input: "text",
      inputValue: ctrl.name,
      showCancelButton: true,
    });

    if (!value?.trim()) return;

    const duplicate = controllers.some(
      (c) => c.name.toLowerCase() === value.toLowerCase() && c.id !== ctrl.id
    );

    if (duplicate) {
      Swal.fire("Name already used", "Choose another name", "warning");
      return;
    }

    try {
      await axios.post(
        `https://psdas-aqua-farming.onrender.com/controller/${ctrl.id}/rename`,
        { name: value },
        { headers: { Authorization: localStorage.getItem("token") } }
      );

      setControllers((prev) =>
        prev.map((c) => (c.id === ctrl.id ? { ...c, name: value } : c))
      );

      Swal.fire("Updated!", "Controller renamed", "success");
    } catch {
      Swal.fire("Error", "Rename failed", "error");
    }
  };

  return (
    <div className="relative min-h-screen font-poppins">
      {/* NAVBAR */}
      <nav className="w-full py-2 bg-[#01a0e2] shadow-md ">
        <div className="flex flex-col sm:flex-row justify-between items-center px-6 sm:px-10 gap-4">

          {/* LEFT SECTION */}
          <div className="flex flex-col sm:flex-row items-center gap-3">

            {/* Logo + Title */}
            <div className="flex flex-col items-center sm:items-start 
                border-2 border-white 
                rounded-2xl 
                px-5 py-3 
                bg-white/10">
              <img src={logo} alt="Logo" className="w-[90px] sm:w-[100px]" />
              <h2 className="text-white text-sm sm:text-base font-semibold mt-1 tracking-wide">
                Aqua Farming
              </h2>
            </div>

            {/* Welcome Text */}
            <h1 className="font-bold text-lg sm:text-xl lg:text-2xl text-white text-center sm:text-left leading-tight">
              Welcome{" "}
              <span className="text-black">
                {username || localStorage.getItem("username")}
              </span>
            </h1>
          </div>

          {/* RIGHT SECTION */}
          <div className="flex items-center gap-3">
            <img
              src={profilephoto}
              className="w-10 h-10 rounded-full border-2 border-white"
              alt="Profile"
            />
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>

        </div>
      </nav>


      {/* MAIN */}
      <div className="p-4 sm:p-5 w-full max-w-[1400px] mx-auto">
        <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-lg w-full">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-[#5874dc]">
              Controller List
            </h2>

            <button
              onClick={handleClientLogin}
              className="flex items-center justify-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 w-full sm:w-auto"
            >
              <FiRefreshCw />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border px-3 py-2 rounded-md mb-4">
              {error}
            </div>
          )}

          {/* CARDS */}
          <div className="flex flex-wrap gap-4 w-full justify-center sm:justify-start">
            {controllers.map((ctrl, index) => (
              <div
                key={ctrl.id}
                onClick={() => handleControllerClick(ctrl)}
                className={`relative p-4 rounded-xl shadow flex items-center gap-3 cursor-pointer
                  w-full sm:w-[48%] md:w-[31%] lg:w-[23%] xl:w-[20%] min-w-[260px]
                  hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition
                  ${softColors[index % softColors.length]}`}
              >
                <button
                  onClick={(e) => handleRenameClick(e, ctrl)}
                  className="absolute top-2 right-2 p-1 rounded-md hover:bg-white shadow-sm"
                >
                  <FiEdit2 size={16} />
                </button>

                <FiCpu size={24} className="text-[#5874dc]" />
                <div>
                  <p className="font-semibold">{ctrl.name}</p>
                  <p className="text-sm text-gray-600">ID: {ctrl.id}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
