import { useState, useEffect, useRef } from "react";
import { FiCpu, FiPlay, FiRefreshCcw, FiMoreVertical } from "react-icons/fi";
import api from "../../api/axios.js";

export default function TestController({ controllerId ,controllerName}) {
  const [responseMsg, setResponseMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState("unknown");
  const [signalValue, setSignalValue] = useState(0);
  const [dateTime, setDateTime] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // menu state + ref for click outside
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  // ------------------------------------
  // HELPER: parse a3 = DDMMYYHHMMSS → "DD-MM-20YY HH:MM:SS"
  // ------------------------------------
  const formatA3DateTime = (a3) => {
    if (!a3 || a3.length < 10) return null;
    const d = a3.replace(/\D/g, "");
    if (d.length < 10) return null;

    const day = d.slice(0, 2);
    const month = d.slice(2, 4);
    const year = d.slice(4, 6);
    const hh = d.slice(6, 8);
    const mm = d.slice(8, 10);
    const ss = d.slice(10, 12) || "00";

    return `${day}-${month}-20${year} ${hh}:${mm}:${ss}`;
  };

  // ------------------------------------
  // POLL CONTROLLER TELEMETRY (used by auto + refresh)
  // ------------------------------------
  const pullStatus = async (id, { updateMsg = false } = {}) => {
    if (!id) return;
    try {
      const res = await api.get(`https://psdas-aqua-farming.onrender.com/controller/${id}/telemetry?limit=1`);
      // console.log("telemetryjjjjjjjjjjjjj", res.data);

      const items = res.data?.items || [];
      const latest = items[0];

      if (!latest) {
        setDeviceStatus("offline");
        if (updateMsg) setResponseMsg("No telemetry received");
        return;
      }

      const a4Value = latest.a4;
      const a3Value = latest.a3;

      // signal
      // setSignalValue(a4Value ? Number(a4Value) : 0);
      // signal - update ONLY if a4 exists
      if (a4Value !== undefined && a4Value !== null && a4Value !== "") {
        setSignalValue(Number(a4Value));
      }

      // time
      let formatted = formatA3DateTime(a3Value);
      if (!formatted && latest.received_at) {
        const dt = new Date(latest.received_at * 1000);
        formatted = dt.toLocaleString();
      }
      if (formatted) setDateTime(formatted);

      setDeviceStatus("online");
      if (updateMsg) {
        setResponseMsg(`Date/Time: ${formatted || "No time data"}`);
      }
    } catch (err) {
      console.error("Error pulling status:", err);
      setDeviceStatus("offline");
      if (updateMsg) {
        setResponseMsg("Device did not respond");
      }
    }
  };

  // ------------------------------------
  // AUTO UPDATE FROM TELEMETRY (every 12s for now)
  // ------------------------------------
  useEffect(() => {
    if (!controllerId) return;

    // initial fetch once
    pullStatus(controllerId);

    // auto-poll
    const timer = setInterval(() => {
      pullStatus(controllerId);
    }, 12000); // 12s for testing; use 120000 for 2 minutes

    return () => clearInterval(timer);
  }, [controllerId]);

  // ------------------------------------
  // TEST BUTTON (c0=203) - menu action
  // ------------------------------------
  const handleTestButton = async (id) => {
    setLoading(true);
    try {
      const res = await api.post(`/controller/${id}/command`, {
        payload: "c0=203",
      });
      console.log("Response Received:", res.data);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
      setMenuOpen(false); // close menu after action
    }
  };

  // ------------------------------------
  // REFRESH TEST (c0=201 + then telemetry)
  // ------------------------------------
  const handleTest = async (id) => {
    if (!id) return;
    try {
      setResponseMsg("");
      setDeviceStatus("waiting");

      const timeout = setTimeout(() => {
        setDeviceStatus("offline");
        setResponseMsg("Device did not respond (Timeout)");
      }, 4000);

      // send test command
      await api.post(`/controller/${id}/command`, {
        payload: "c0=201",
      });

      // small delay then pull latest telemetry
      await new Promise((res) => setTimeout(res, 1500));
      await pullStatus(id, { updateMsg: true });

      clearTimeout(timeout);
    } catch (err) {
      setDeviceStatus("offline");
      console.log("Test error:", err);
    } finally {
      setLoading(false);
      setMenuOpen(false); // close menu
    }
  };

  // -----------------------------
  // SIGNAL BAR UI (3/4 LINE TOWER)
  // -----------------------------
  const renderSignalBar = () => {
    let level = 0;
    if (!signalValue) level = 0;
    else if (signalValue >= 80) level = 4;
    else if (signalValue >= 60) level = 3;
    else if (signalValue >= 50) level = 2;
    else level = 1;

    const color =
      level >= 3 ? "bg-green-600" : level === 2 ? "bg-yellow-500" : "bg-red-600";

    return (
      <div className="flex flex-col items-center mr-3">
        <div className="flex items-end gap-[3px]">
          <div className={`w-1 h-2 ${level >= 1 ? color : "bg-gray-300"}`} />
          <div className={`w-1 h-3 ${level >= 2 ? color : "bg-gray-300"}`} />
          <div className={`w-1 h-4 ${level >= 3 ? color : "bg-gray-300"}`} />
          <div className={`w-1 h-5 ${level >= 4 ? color : "bg-gray-300"}`} />
        </div>
        <p className="text-xs mt-1 text-gray-600">{signalValue || 0}%</p>
      </div>
    );
  };



  // close menu on outside click & escape
  useEffect(() => {
    function handleDocClick(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    }
    function handleEsc(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <div className="w-full p-4 sm:p-5 bg-white shadow-md rounded-xl relative">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-3 relative">
        
        {/* LEFT: Title */}
        <div className="flex items-center gap-2 justify-center md:justify-start">
          <FiCpu className="text-blue-600" size={20} />
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 text-center md:text-left">
            Controller Name :{" "}
            <span className="font-bold">{controllerName}</span>
          </h2>
        </div>

        {/* CENTER: BRAND NAME */}
        <div className="md:absolute md:left-1/2 md:-translate-x-1/2 text-center">
          <h1 className="font-bold text-blue-600 tracking-wide
                        text-1xl sm:text-xl md:text-2xl lg:text-3xl">
            PSDAS Aqua Farming
          </h1>
        </div>

        {/* RIGHT: Status + Actions */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 font-semibold">
          <p className="text-sm">Signal</p>

          {/* Signal Bars */}
          {renderSignalBar()}

          {/* Refresh Button */}
          <button
            onClick={async () => {
              setRefreshing(true);
              await handleTest(controllerId);
              setRefreshing(false);
            }}
            className="p-2 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            aria-label="Refresh"
          >
            <FiRefreshCcw
              size={18}
              className={`text-gray-700 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* 3-Dot Menu */}
          <div className="relative">
            <button
              ref={menuButtonRef}
              onClick={() => setMenuOpen((s) => !s)}
              className="p-2 rounded-full hover:bg-gray-100 flex items-center"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <FiMoreVertical size={18} className="text-gray-700" />
            </button>

            {menuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border z-50"
              >
                <div className="px-2 py-2">
                  <button
                    onClick={() => handleTestButton(controllerId)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-blue-400"
                  >
                    <FiPlay size={14} />
                    <span>{loading ? "..." : "Test"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Last update */}
      <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Last Update:
        </p>
        <p className="text-base sm:text-lg font-semibold text-gray-700">
          {dateTime || "—"}
        </p>
      </div>
    </div>
  );
}
