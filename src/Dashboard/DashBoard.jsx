// ===================== PART 1 START =====================

import React, { useEffect, useMemo, useState } from "react";
import aquafarming from "../assets/Aqua_farming.jpg";
import axios from "axios";
import TestController from "./Testing/TestController";
import { useLocation } from "react-router-dom";
import { FiEdit, FiRefreshCcw } from "react-icons/fi";
import api from "../api/axios.js";
import MultiSettingManager from "./MultiSetting/MultiSettingManager.jsx";
import Swal from "sweetalert2";

/* Full Version B:
   - Universal validation logic
   - Overlap checking
   - Duplicate checking
   - Edit/Save/Cancel protection
   - Set cleanup logic
*/

export default function Dashboard() {

  // Toast generator
  const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (t) => {
      t.addEventListener("mouseenter", Swal.stopTimer);
      t.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });

  const showToast = (type = "info", title = "", text = "") => {
    toast.fire({ icon: type, title, text: text || undefined });
  };

  // -----------------------
  // STATES
  // -----------------------
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [feedLevel, setFeedLevel] = useState("");
  const [timeGap, setTimeGap] = useState(180);
  const [dispatch, setDispatch] = useState(250);
  const [feedDuration, setFeedDuration] = useState("");

  const [settingsList, setSettingsList] = useState([]);
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [showMultiSetting, setShowMultiSetting] = useState(false);
  const [currentAck, setCurrentAck] = useState("");
  const [lastSettingDate, setLastSettingDate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const location = useLocation();
  const { id, name } = location.state || {};

  const selectedSettingStr = selectedSetting ? String(selectedSetting) : "";

  // For blink
  const [blinkLoop, setBlinkLoop] = useState(false);

  // LocalStorage
  const storageKey = id ? `settings_${id}` : null;

  // -----------------------
  // HELPER: reindex
  // -----------------------
  const reindex = (arr) =>
    arr.map((s, i) => ({ ...s, id: i + 1, label: `Setting ${i + 1}` }));

  // -----------------------
  // CLOCK (unchanged)
  // -----------------------
  useEffect(() => {
    const t = setInterval(() => {}, 1000);
    return () => clearInterval(t);
  }, []);

  // -----------------------
  // Inject blink CSS once
  // -----------------------
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes greenBlinkLoop {
        0% { box-shadow: 0 0 0 rgba(16,185,129,0); }
        50% { box-shadow: 0 0 16px rgba(16,185,129,0.95); }
        100% { box-shadow: 0 0 0 rgba(16,185,129,0); }
      }
      .blink-loop {
        animation: greenBlinkLoop 800ms ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Blink when list not empty
  useEffect(() => {
    setBlinkLoop(settingsList.length > 0);
  }, [settingsList]);

  // -----------------------
  // LOAD from localStorage OR from backend
  // -----------------------
  // useEffect(() => {
  //   if (!id) return;

  //   if (storageKey) {
  //     const raw = localStorage.getItem(storageKey);
  //     if (raw) {
  //       try {
  //         const parsed = JSON.parse(raw);
  //         if (Array.isArray(parsed) && parsed.length) {
  //           setSettingsList(parsed);
  //           return;
  //         }
  //       } catch {}
  //     }
  //   }

  //   fetchSettings();
  // }, [id]);

  // Save to localStorage
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(settingsList));
    } catch {}
  }, [settingsList, storageKey]);

  // When selecting a saved setting
  useEffect(() => {
    if (!selectedSetting) {
      setStartTime("");
      setEndTime("");
      setFeedLevel("");
      setFeedDuration("");
      setIsEditing(false);
      return;
    }

    const s = settingsList.find((x) => x.id === Number(selectedSetting));
    if (!s) return;

    setStartTime(s.startTime || s.value || "");
    setEndTime(s.endTime || "");
    setFeedLevel(s.feedLevel || "");
    setFeedDuration(s.feedDuration || "");
    setTimeGap(Number(s.timeGap || 180));
    setDispatch(Number(s.dispatch || 250));
  }, [selectedSetting, settingsList]);

  // -----------------------
  // UNIVERSAL VALIDATION
  // -----------------------

  const toMinutes = (t) => {
    if (!t || !t.includes(":")) return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  // Check duplicate START TIME
  const hasStartTimeDuplicate = (newStart, list, ignoreId = null) => {
    return list.some(
      (s) =>
        s.startTime === newStart &&
        (ignoreId === null || s.id !== ignoreId)
    );
  };

  // Check exact same setting (all fields equal)
  const isExactDuplicate = (newItem, list, ignoreId = null) => {
    return list.some(
      (s) =>
        (ignoreId === null || s.id !== ignoreId) &&
        s.startTime === newItem.startTime &&
        String(s.feedLevel) === String(newItem.feedLevel) &&
        Number(s.timeGap) === Number(newItem.timeGap) &&
        Number(s.dispatch) === Number(newItem.dispatch)
    );
  };

  // Check overlap
  const hasOverlap = (newItem, list, ignoreId = null) => {
    const newStart = toMinutes(newItem.startTime);
    const newEnd = newStart + Math.floor(
      ((newItem.feedLevel * 1000) / newItem.dispatch) *
      newItem.timeGap / 60
    );

    return list.some((s) => {
      if (ignoreId !== null && s.id === ignoreId) return false;

      const start = toMinutes(s.startTime);
      const end =
        start +
        Math.floor(((s.feedLevel * 1000) / s.dispatch) * s.timeGap / 60);

      return newStart < end && newEnd > start;
    });
  };

  // Main validator used everywhere
  const validateSetting = (candidate, list, ignoreId = null) => {
    if (!candidate.startTime) return "Start time is required.";

    if (hasStartTimeDuplicate(candidate.startTime, list, ignoreId))
      return "Another setting already uses this start time.";

    if (isExactDuplicate(candidate, list, ignoreId))
      return "This exact setting already exists.";

    if (hasOverlap(candidate, list, ignoreId))
      return "This setting overlaps with another setting.";

    return null;
  };

// ===================== PART 1 END =====================
// ===================== PART 2 START =====================

// Add a new setting
const addSetting = () => {
  if (settingsList.length >= 10) {
    showToast("error", "You can only add up to 10 settings.");
    return;
  }

  if (isEditing) {
    showToast("error", "Finish editing before adding a new setting.");
    return;
  }

  if (!startTime) {
    showToast("error", "Please enter a Start Time.");
    return;
  }

  const candidate = {
    startTime: startTime.trim(),
    feedLevel: Number(feedLevel || 0),
    timeGap: Number(timeGap || 180),
    dispatch: Number(dispatch || 250),
  };

  // Validate with universal validator
  const err = validateSetting(candidate, settingsList);
  if (err) {
    showToast("error", err);
    return;
  }

  // Append
  const newList = [
    ...settingsList,
    {
      id: settingsList.length + 1,
      label: `Setting ${settingsList.length + 1}`,
      startTime: candidate.startTime,
      endTime: "",
      feedLevel: candidate.feedLevel,
      timeGap: candidate.timeGap,
      dispatch: candidate.dispatch,
      feedDuration: feedDuration || "",
      value: candidate.startTime
    }
  ];

  setSettingsList(reindex(newList));

  // Clear UI
  setSelectedSetting(null);
  setStartTime("");
  setEndTime("");
  setFeedLevel("");
  setFeedDuration("");

  setShowMultiSetting(true);
  showToast("success", "Setting added.");
};


// Save edited setting
const saveEditedSetting = () => {
  if (!selectedSetting) {
    showToast("warning", "No setting selected to save.");
    return;
  }

  const candidate = {
    startTime: startTime.trim(),
    feedLevel: Number(feedLevel || 0),
    timeGap: Number(timeGap || 180),
    dispatch: Number(dispatch || 250),
  };

  const err = validateSetting(candidate, settingsList, selectedSetting);
  if (err) {
    showToast("error", err);
    return;
  }

  const updated = settingsList.map((s) =>
    s.id === Number(selectedSetting)
      ? {
          ...s,
          startTime: candidate.startTime,
          endTime: endTime || "",
          feedLevel: candidate.feedLevel,
          timeGap: candidate.timeGap,
          dispatch: candidate.dispatch,
          feedDuration: feedDuration || "",
          value: candidate.startTime,
        }
      : s
  );

  setSettingsList(reindex(updated));
  setIsEditing(false);
  showToast("success", "Changes saved.");
};


// Cancel editing
const cancelEdit = () => {
  if (!selectedSetting) {
    setIsEditing(false);
    return;
  }

  const s = settingsList.find((x) => x.id === Number(selectedSetting));
  if (s) {
    setStartTime(s.startTime || s.value || "");
    setEndTime(s.endTime || "");
    setFeedLevel(s.feedLevel || "");
    setFeedDuration(s.feedDuration || "");
    setTimeGap(Number(s.timeGap || 180));
    setDispatch(Number(s.dispatch || 250));
  }

  setIsEditing(false);
  showToast("info", "Edit cancelled.");
};


// Fetch settings from server
const fetchSettings = async () => {
  if (!id) return;

  try {
    const res = await axios.get(`/api/controller/${id}/settings`);
    const data = res.data;
    let formatted = [];

    if (typeof data === "string" && data.startsWith("ACK")) {
      const parts = data.split(",");
      const times = parts[2]?.split("|") || [];
      formatted = times.map((t, i) => ({
        id: i + 1,
        label: `Setting ${i + 1}`,
        startTime: t.trim(),
        endTime: "",
        feedLevel: "",
        feedDuration: "",
        value: t.trim(),
        timeGap: 180,
        dispatch: 250,
      }));
    } else if (Array.isArray(data)) {
      formatted = data.map((t, i) => ({
        id: i + 1,
        label: `Setting ${i + 1}`,
        startTime: t.startTime || t.value || "",
        endTime: t.endTime || "",
        feedLevel: t.feedLevel || "",
        feedDuration: t.feedDuration || "",
        value: t.value || t.startTime || "",
        timeGap: t.timeGap || 180,
        dispatch: t.dispatch || 250,
      }));
    } else if (data?.items) {
      formatted = data.items.map((t, i) => ({
        id: i + 1,
        label: `Setting ${i + 1}`,
        startTime: t,
        endTime: "",
        feedLevel: "",
        feedDuration: "",
        value: t,
        timeGap: 180,
        dispatch: 250,
      }));
    }

    setSettingsList(reindex(formatted));
    setSelectedSetting(null);

    showToast("success", "Settings loaded.");
  } catch (err) {
    console.error("Failed to load settings", err);
    showToast("error", "Failed to load settings.");
  }
};

// ===================== PART 2 END =====================
// ===================== PART 3 START =====================

// Convert HH:MM → HHMM
const toHHMM = (t) => (t ? t.replace(":", "").padStart(4, "0") : "0000");

// Convert no-colon HHMM
const toHHMMNoColon = (t) =>
  t ? t.toString().replace(":", "").padStart(4, "0") : "0000";


// Build single payload string
const buildSinglePayloadString = () => {
  const startHHMM = toHHMM(startTime);

  const cycles = Number(totalCycles) || 0;
  const gap = Number(timeGap) || 0;

  let as3 = "0000";
  if (cycles > 0 && gap > 0) {
    const totalSeconds = cycles * gap;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    as3 = `${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}`;
  }

  const as2 = String(Math.round(Number(feedLevel) || 0)).padStart(4, "0");
  const as4 = String(Number(timeGap) || 180).padStart(4, "0");
  const as9 = String(Number(dispatch) || 250).padStart(4, "0");
  const as10 = String(Number(totalCycles) || 0).padStart(4, "0");

  return `c0=212&as1=${startHHMM}&as2=${as2}&as3=${as3}&as4=${as4}&as9=${as9}&as10=${as10}`;
};


// Build MULTI payload string
const buildMultiPayloadString = (list) => {
  const as1 = list.map((s) => toHHMMNoColon(s.startTime)).join(":");

  const as2 = list
    .map((s) => String(Math.round(Number(s.feedLevel) || 0)).padStart(4, "0"))
    .join(":");

  const as3 = list
    .map((s) => {
      const feed = Number(s.feedLevel || 0);
      const dispatchVal = Number(s.dispatch || 250);
      const gap = Number(s.timeGap || 180);

      const cycles = dispatchVal > 0 ? Math.floor((feed * 1000) / dispatchVal) : 0;
      const totalSeconds = cycles * gap;

      if (totalSeconds <= 0) return "0000";

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}`;
    })
    .join(":");

  const as4 = list
    .map((s) => String(Number(s.timeGap) || 180).padStart(4, "0"))
    .join(":");

  const as9 = list
    .map((s) => String(Number(s.dispatch || 250)).padStart(4, "0"))
    .join(":");

  const as10 = list
    .map((s) => {
      const cycles = Math.floor(
        (Number(s.feedLevel || 0) * 1000) / Number(s.dispatch || 250)
      );
      return String(cycles).padStart(4, "0");
    })
    .join(":");

  return `c0=212&as1=${as1}&as2=${as2}&as3=${as3}&as4=${as4}&as9=${as9}&as10=${as10}`;
};


// Send SET command to controller
const [isLoading, setIsLoading] = useState(false);

const handleSet = async () => {
  try {
    const payload =
      settingsList.length > 0
        ? buildMultiPayloadString(settingsList)
        : buildSinglePayloadString();

    console.log("Sending payload:", payload);

    const res = await api.post(`/controller/${id}/command`, { payload });
    const { ack, ack_payload } = res.data || {};

    if (ack === "received") {
      showToast("success", "Settings applied! ACK received from controller.");

      if (ack_payload) console.log("ACK payload:", ack_payload);

      // Clear settings (as per Version B)
      setSettingsList([]);

      if (storageKey) localStorage.removeItem(storageKey);

      setStartTime("");
      setEndTime("");
      setFeedLevel("");
      setFeedDuration("");

      setSelectedSetting(null);
      setIsEditing(false);
      setShowMultiSetting(false);
    } else if (ack === "not_received") {
      showToast("warning", "NO ACK from controller. Check device/MQTT.");
    } else {
      showToast("info", "Unexpected response received.");
    }
  } catch (e) {
    console.error("Error sending settings:", e);
    showToast("error", "Failed to send settings.");
  }
};


// Read PREVIOUS settings from controller
const handlePreviousSet = async () => {
  try {
    const res = await api.get(`/controller/${id}/last-setting`);
    const ack = res.data?.sent_settings || "";

    setCurrentAck(ack);

    // Parse controller DDMMYYHHMMSS format
    function parseControllerTime(raw) {
      if (!raw) return null;

      const cleaned = String(raw).replace(/\D/g, "");

      if (cleaned.length < 10) return null;

      const day = parseInt(cleaned.slice(0, 2), 10);
      const month = parseInt(cleaned.slice(2, 4), 10) - 1;
      const year = 2000 + parseInt(cleaned.slice(4, 6), 10);
      const hour = parseInt(cleaned.slice(6, 8), 10);
      const min = parseInt(cleaned.slice(8, 10), 10);
      const sec = cleaned.length >= 12 ? parseInt(cleaned.slice(10, 12), 10) : 0;

      return new Date(year, month, day, hour, min, sec);
    }

    const rawDate = res.data?.set_time_raw;
    const baseDateObj = parseControllerTime(rawDate) || new Date();

    setLastSettingDate(baseDateObj);

    const pad = (n) => n.toString().padStart(2, "0");
    const baseDateStr = `${baseDateObj.getFullYear()}-${pad(
      baseDateObj.getMonth() + 1
    )}-${pad(baseDateObj.getDate())}`;

    if (!ack) {
      showToast("info", "No previous settings found.");
      return;
    }

    // Parse ACK arrays
    const parts = ack.split("&");
    const as1 = parts.find((p) => p.startsWith("as1="))?.split("=")[1];
    const as2 = parts.find((p) => p.startsWith("as2="))?.split("=")[1];
    const as4 = parts.find((p) => p.startsWith("as4="))?.split("=")[1];
    const as9 = parts.find((p) => p.startsWith("as9="))?.split("=")[1];

    const splitList = (s) =>
      s.includes("|") ? s.split("|") : s.includes(":") ? s.split(":") : [s];

    const as1List = splitList(as1).map((t) => {
      const cleaned = (t || "").replace(/\D/g, "");
      return cleaned.length === 4
        ? `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`
        : cleaned;
    });

    const as2List = as2 ? splitList(as2) : [];
    const as4List = as4 ? splitList(as4) : [];
    const as9List = as9 ? splitList(as9) : [];

    const formatted = as1List.map((st, i) => {
      let fullISO = null;

      if (/^\d{1,2}:\d{2}$/.test(st)) {
        const [hh, mm] = st.split(":").map((x) => x.padStart(2, "0"));
        fullISO = `${baseDateStr}T${hh}:${mm}:00`;
      }

      return {
        id: i + 1,
        label: `Setting ${i + 1}`,
        startTime: st,
        fullStartISO: fullISO,
        endTime: "",
        feedLevel: as2List[i] ? String(Number(as2List[i]) || 0) : "",
        feedDuration: "",
        timeGap: as4List[i] ? Number(as4List[i]) : 180,
        dispatch: as9List[i] ? Number(as9List[i]) : 250,
        value: st,
      };
    });

    setSettingsList(reindex(formatted));
    setSelectedSetting(null);
    setShowMultiSetting(true);
    showToast("success", "Previous settings loaded.");
  } catch (err) {
    console.error("Failed to fetch previous settings:", err);
    showToast("error", "Could not fetch previous settings.");
  }
};

// ===================== CALCULATIONS BLOCK (REQUIRED) =====================

// total cycles
const totalCycles = useMemo(() => {
  const level = Number(feedLevel) || 0;
  const disp = Number(dispatch) || 0;
  if (!level || !disp) return 0;
  return Math.floor((level * 1000) / disp);
}, [feedLevel, dispatch]);

// total running hours
const totalRunningHours = useMemo(() => {
  if (!totalCycles || !timeGap) return "0h 0m";
  const totalSeconds = totalCycles * Number(timeGap);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}, [totalCycles, timeGap]);

// ========================================================================


// ===================== PART 3 END =====================
// ===================== PART 4 START =====================

// Gauge math
const gaugeMaxKg = 2000;
const feedValueNumber = Number(feedLevel) || 0;
const feedPercent = Math.max(0, Math.min(100, (feedValueNumber / gaugeMaxKg) * 100));
const gaugeRadius = 90;
const gaugeCirc = Math.PI * gaugeRadius;
const gaugeOffset = (1 - feedPercent / 100) * gaugeCirc;
const needleAngle = -90 + (feedPercent / 100) * 180;

// Clock formatter
const formatClock = (d) =>
  d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });


const updateCurrentSettingInSaved = (key, value) => {
  if (!selectedSetting) return;

  setSettingsList((prev) =>
    prev.map((s) =>
      s.id === Number(selectedSetting)
        ? { ...s, [key]: value }
        : s
    )
  );
};



// ===================== JSX START =====================

return (
    <div className="relative min-h-screen px-10 py-6">
      <div>
        <TestController controllerId={id} controllerName={name}/>
      </div>
            <div>
        {showMultiSetting && (
          <MultiSettingManager
            settings={settingsList}
            updateSettings={(newArr) => {
              const re = reindex(newArr || []);
              setSettingsList(re);
              setSelectedSetting(null);
              setIsEditing(false);
              if (!re.length) setShowMultiSetting(false);
            }}
            onClose={() => setShowMultiSetting(false)}
            lastSetting={lastSettingDate} // ⭐ pass controller time here
          />
        )}
      </div>

      <div className="relative z-10 flex justify-center px-6 py-6">
        <div className="w-full max-w-[1000px] bg-white backdrop-blur-md rounded-2xl shadow-xl border border-white/30 p-6 transition-all ">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Feeder Dashboard</h2>

            <div className="flex items-center gap-3">
              <div>
                <select
                  className={`w-full px-3 py-2 border rounded-md ${blinkLoop ? "blink-loop" : ""}`}
                  value={selectedSettingStr}
                  onChange={(e) => {
                    const idVal =
                      e.target.value === "" ? null : Number(e.target.value);
                    setSelectedSetting(idVal);
                    setIsEditing(false); // disable edit whenever a new selection is made
                  }}
                >
                  <option value="">-- New --</option>
                  {settingsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* EDIT / SAVE / CANCEL controls */}
              <div className="flex items-center gap-2">
                {/* Edit toggle */}
                <button
                  onClick={() => {
                    if (!selectedSetting) {
                      showToast(
                        "error",
                        "Select a saved setting from dropdown to edit it."
                      );
                      return;
                    }
                    setIsEditing(true);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    isEditing
                      ? "bg-gray-200 text-black"
                      : "text-black hover:bg-orange-300"
                  }`}
                  title="Edit selected saved setting"
                >
                  <FiEdit size={18} />
                  Edit
                </button>

                {/* Save (visible only during editing) */}
                {isEditing && (
                  <>
                    <button
                      onClick={saveEditedSetting}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {/* Set (send to controller) */}
                <button
                  onClick={handleSet}
                  className="flex items-center gap-2 px-4 py-2 text-black rounded-lg hover:bg-green-500 transition"
                >
                  Set
                </button>
              </div>
            </div>
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-12 gap-4 items-center mb-6">
            <div className="col-span-12 md:col-span-3 p-3.5 bg-white/60 rounded-lg border border-white/40 flex flex-col gap-3 transition-transform hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <div className="text-xs text-gray-500">Local</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStartTime(val);
                      if (isEditing && selectedSetting)
                        updateCurrentSettingInSaved("startTime", val);
                    }}
                    className="px-3 py-2 rounded-md border w-40"
                    disabled={!!selectedSetting && !isEditing}
                  />
                </div>
              </div>
            </div>

            {/* Feeding Level */}
            <div className="col-span-12 md:col-span-3 p-4 bg-white/60 rounded-lg border border-white/40 flex flex-col gap-3 transition-transform hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Feeding Level (KG)
                </label>
              </div>

              <div className="flex gap-3 items-center ">
                <input
                  type="number"
                  min="0"
                  max={gaugeMaxKg}
                  value={feedLevel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFeedLevel(val);
                    if (isEditing && selectedSetting)
                      updateCurrentSettingInSaved("feedLevel", val);
                  }}
                  placeholder={`0 - ${gaugeMaxKg} KG`}
                  className="px-3 py-2 rounded-md border w-full"
                  disabled={!!selectedSetting && !isEditing}
                />
                <div className="text-sm text-gray-600">KG</div>
              </div>
            </div>

            {/* Dispatch */}
            <div className="col-span-12 md:col-span-3 p-4 bg-white/60 rounded-lg border border-white/40 flex flex-col gap-3 transition-transform hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Dispatch
                </label>
                <div className="text-xs text-gray-500">Grams</div>
              </div>

              <select
                className="px-3 py-2 rounded-md border w-full text-gray-700"
                value={dispatch}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDispatch(val);
                  if (isEditing && selectedSetting)
                    updateCurrentSettingInSaved("dispatch", val);
                }}
                disabled={!!selectedSetting && !isEditing}
              >
                <option value={250}>250 g (Default)</option>
                <option value={500}>500 g</option>
              </select>
            </div>

            {/* Time Gap */} 
            <div className="col-span-12 md:col-span-3 p-4 bg-white/60 rounded-lg border border-white/40 flex flex-col gap-3 transition-transform hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Time Gap
                </label>
                <div className="text-xs text-gray-500">Interval</div>
              </div>

              <select
                value={timeGap}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTimeGap(val);
                  if (isEditing && selectedSetting)
                    updateCurrentSettingInSaved("timeGap", val);
                }}
                className="px-3 py-2 rounded-md border w-full"
                disabled={!!selectedSetting && !isEditing}
              >
                <option value={180}>3 minutes (Default)</option>
                <option value={240}>4 minutes </option>
                <option value={300}>5 minutes </option>
                <option value={360}>6 minutes</option>
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-12 md:col-span-3 p-4 bg-white/60 rounded-lg border border-white/40 flex flex-col gap-3 transition-transform hover:scale-[1.01]">
              <label className="text-sm font-medium text-gray-700">
                Total Cycles
              </label>
              <input
                type="text"
                readOnly
                value={totalCycles ? totalCycles : ""}
                className="px-3 py-2 rounded-md border bg-gray-100"
              />
              <div className="text-xs text-gray-500">Auto-calculated</div>
            </div>

            <div className="col-span-12 md:col-span-6 flex justify-center p-4">
              <div className="bg-white/60 rounded-lg border border-white/40 p-6 w-full max-w-md flex flex-col items-center transition-transform hover:scale-[1.01]">
                <div className="w-full flex justify-center mb-3">
                  <svg
                    width={gaugeRadius * 2 + 20}
                    height={gaugeRadius + 40}
                    viewBox={`0 0 ${gaugeRadius * 2 + 20} ${gaugeRadius + 40}`}
                    className="overflow-visible"
                  >
                    <defs>
                      <linearGradient id="g1" x1="0" x2="1">
                        <stop offset="0%" stopColor="#66b3ff" />
                        <stop offset="100%" stopColor="#5874dc" />
                      </linearGradient>
                    </defs>

                    <path
                      d={describeSemiCirclePath(gaugeRadius)}
                      fill="none"
                      stroke="#e6e7ee"
                      strokeWidth="16"
                      strokeLinecap="round"
                      transform={`translate(10,10)`}
                    />

                    <path
                      d={describeSemiCirclePath(gaugeRadius)}
                      fill="none"
                      stroke="url(#g1)"
                      strokeWidth="16"
                      strokeLinecap="round"
                      transform={`translate(10,10)`}
                      strokeDasharray={gaugeCirc}
                      strokeDashoffset={gaugeOffset}
                      style={{ transition: "stroke-dashoffset 800ms ease" }}
                    />

                    <g
                      transform={`translate(${gaugeRadius + 10}, ${
                        gaugeRadius + 10
                      })`}
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2={-gaugeRadius + 8}
                        stroke="#222"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        transform={`rotate(${needleAngle})`}
                        style={{ transition: "transform 800ms ease" }}
                      />
                      <circle r="4" fill="#222" />
                    </g>

                    <text
                      x={gaugeRadius + 10}
                      y={gaugeRadius + 32}
                      textAnchor="middle"
                      fontSize="14"
                      fill="#333"
                    >
                      {feedValueNumber} KG
                    </text>
                  </svg>
                </div>

                <div className="text-sm text-gray-600">Feeding Level</div>
                <div className="text-lg font-semibold mt-2">
                  {feedValueNumber} / {gaugeMaxKg} KG
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Animated semi-circle gauge
                </div>
              </div>
            </div>

            <div className="col-span-12 md:col-span-3 p-4 bg-white/60 rounded-lg border border-white/40 flex flex-col gap-3 transition-transform hover:scale-[1.01]">
              <label className="text-sm font-medium text-gray-700">
                Total Running Hours
              </label>

              <input
                type="text"
                readOnly
                value={totalRunningHours ? totalRunningHours : ""}
                className="px-3 py-2 rounded-md border bg-gray-100"
              />

              <div className="text-xs text-gray-500">
                Based on cycle × time gap
              </div>
              <div className="mt-auto">
                <button
                  onClick={addSetting}
                  className="w-full bg-green-600 text-white p-3 rounded-lg font-medium hover:bg-green-700"
                  disabled={isEditing}
                >
                  Add Setting
                </button>

                <button
                  onClick={() => setShowMultiSetting(true)}
                  className="w-full mt-3 py-3 bg-gray-200 text-black p-2 rounded-lg"
                >
                  View Saved
                </button>
                <button
                  className="flex items-center justify-center py-3 mt-3 gap-2 w-full rounded-lg text-black bg-blue-400 hover:bg-blue-300 transition"
                  onClick={async () => {
                    setRefreshing(true);
                    await handlePreviousSet();
                    setRefreshing(false);
                  }}
                >
                  <FiRefreshCcw
                    size={18}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  Current Setting
                </button>
              </div>
            </div>
          </div>

          {/* <div className="mt-6 text-sm text-gray-500">
            Tip: use the Run For unit selector to enter seconds/minutes/hours.
            Time Gap defaults to 180 seconds.
          </div> */}
        </div>
      </div>

    </div>
  );
}

/* ---------- helper to create a semicircle path ---------- */
function describeSemiCirclePath(radius) {
  const r = radius;
  const x1 = 0;
  const y = r;
  const x2 = 2 * r;
  return `M ${x1} ${y} A ${r} ${r} 0 0 1 ${x2} ${y}`;
}
