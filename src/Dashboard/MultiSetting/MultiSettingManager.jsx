import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiTrash2, FiCopy } from "react-icons/fi";
import Swal from "sweetalert2";

export default function MultiSettingManager({
  settings = [],
  updateSettings,
  onClose,
  lastSetting = null, // optional: Dashboard can pass Date / epoch / ISO string
}) {
  const [local, setLocal] = useState([]);
  const [editingIndex] = useState(null); // no inline edit now

  // SweetAlert2 toast
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
    toast.fire({
      icon: type,
      title,
      text: text || undefined,
    });
  };

  // -----------------------------
  // Helpers for date parsing/formatting
  // -----------------------------
  const safeParseISO = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d) ? null : d;
  };

  const parseLastSettingProp = (v) => {
    if (v == null) return null;
    if (v instanceof Date) return isNaN(v) ? null : v;
    if (typeof v === "number") {
      const d = new Date(Number(v) * 1000);
      return isNaN(d) ? null : d;
    }
    if (typeof v === "string") {
      if (/^\d+$/.test(v)) {
        const asNum = Number(v);
        if (String(asNum).length === 10) {
          const d = new Date(asNum * 1000);
          return isNaN(d) ? null : d;
        }
        if (String(asNum).length === 13) {
          const d = new Date(asNum);
          return isNaN(d) ? null : d;
        }
      }
      const d = new Date(v);
      return isNaN(d) ? null : d;
    }
    return null;
  };

  // Format like "06 Dec 2025, 09:46 AM"
  const formatDateTime = (isoOrDate) => {
    if (!isoOrDate) return "-";
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (isNaN(d)) return "-";
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const buildLocalFromHHMM = (hhmmStr, baseDate = null) => {
    if (!hhmmStr) return null;
    const [hStr, mStr] = String(hhmmStr).split(":");
    const hh = Number(hStr) || 0;
    const mm = Number(mStr) || 0;
    const now = baseDate ? new Date(baseDate) : new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
  };

  // -----------------------------
  // Normalize incoming settings
  // -----------------------------
  useEffect(() => {
    if (!Array.isArray(settings)) {
      setLocal([]);
      return;
    }

    const normalized = settings.map((s, i) => {
      const st = s.startTime ?? s.value ?? "";

      return {
        id: s.id ?? i + 1,
        label: s.label ?? `Setting ${i + 1}`,
        startTime: st, // HH:MM for UI
        fullStartISO: s.fullStartISO || null, // full timestamp from backend when available
        feedLevel: s.feedLevel != null ? String(s.feedLevel) : "",
        dispatch: s.dispatch ?? 250,
        timeGap: s.timeGap ?? 180,
        feedDuration: s.feedDuration ?? s.duration ?? "",
        raw: s,
      };
    });

    setLocal(normalized);
  }, [settings]);

  // Reindex ids after delete
  const reindex = (arr) =>
    arr.map((s, i) => ({
      ...s,
      id: i + 1,
      label: s.label ?? `Setting ${i + 1}`,
    }));

  // -----------------------------
  // Compute cycles / run / end time
  // -----------------------------
  const computeRowInfo = (s) => {
    const feed = Number(s.feedLevel || 0);
    const dispatch = Number(s.dispatch || 250);
    const gap = Number(s.timeGap || 180);

    let cycles = 0;
    let totalSeconds = 0;
    let totalText = "0h 0m";
    let endTime = "-";

    if (feed > 0 && dispatch > 0 && gap > 0) {
      cycles = Math.floor((feed * 1000) / dispatch);
      totalSeconds = cycles * gap;

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      totalText = `${hours}h ${minutes}m`;

      let startDate = null;

      // Preferred: ISO timestamp from backend
      if (s.fullStartISO) {
        const d = safeParseISO(s.fullStartISO);
        if (d) startDate = d;
      }

      // Fallback: today's date + HH:MM
      if (!startDate && s.startTime) {
        startDate = buildLocalFromHHMM(s.startTime);
      }

      if (startDate) {
        const endDate = new Date(startDate.getTime() + totalSeconds * 1000);
        const pad = (n) => String(n).padStart(2, "0");

        const sameDay =
          startDate.getFullYear() === endDate.getFullYear() &&
          startDate.getMonth() === endDate.getMonth() &&
          startDate.getDate() === endDate.getDate();

        const hh = pad(endDate.getHours());
        const mm = pad(endDate.getMinutes());

        // endTime = sameDay
        //   ? `${hh}:${mm}`
        //   : `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(
        //       endDate.getDate()
        //     )} ${hh}:${mm}`;
        endTime = `${hh}:${mm}`;
      }
    }

    return { cycles, totalText, endTime };
  };

  // DELETE row
  const removeAt = async (index) => {
    const result = await Swal.fire({
      title: "Remove this saved setting?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, remove",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    const updated = local.filter((_, i) => i !== index);
    const re = reindex(updated);
    setLocal(re);
    if (typeof updateSettings === "function") updateSettings(re);
    showToast("success", "Setting removed.");
  };

  // CLEAR ALL rows
  const handleClearAll = async () => {
    if (!local.length) {
      showToast("info", "No settings to clear.");
      return;
    }

    const result = await Swal.fire({
      title: "Clear all saved settings?",
      text: "This will remove all saved settings for this controller.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, clear all",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    const empty = [];
    setLocal(empty);
    if (typeof updateSettings === "function") updateSettings(empty);
    showToast("success", "All settings cleared.");
  };

  // -----------------------------
  // Payload preview
  // -----------------------------
  const toHHMMNoColon = (t) =>
    t ? t.toString().replace(":", "").padStart(4, "0") : "0000";

  const payloadPreview = useMemo(() => {
    if (!local || local.length === 0) return "";
    const as1 = local.map((s) => toHHMMNoColon(s.startTime)).join(":");
    const as2 = local
      .map((s) => String(Math.round(Number(s.feedLevel) || 0)).padStart(4, "0"))
      .join(":");
    const as3 = local.map(() => "0000").join(":");
    const as4 = local
      .map((s) => String(Number(s.timeGap) || 180).padStart(4, "0"))
      .join(":");
    const as9 = local
      .map((s) => String(Number(s.dispatch || 250)).padStart(4, "0"))
      .join(":");
    const as10 = local
      .map((s) => {
        const cycles = Math.floor(
          (Number(s.feedLevel || 0) * 1000) / Number(s.dispatch || 250)
        );
        return String(cycles).padStart(4, "0");
      })
      .join(":");

    return `c0=212&as1=${as1}&as2=${as2}&as3=${as3}&as4=${as4}&as9=${as9}&as10=${as10}`;
  }, [local]);

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(payloadPreview);
      showToast("success", "Payload copied to clipboard");
    } catch (e) {
      console.error(e);
      showToast("error", "Copy failed — please select & copy manually.");
    }
  };

  // Find the most recent fullStartISO (for fallback)
  const latestFullStart = useMemo(() => {
    if (!local || local.length === 0) return null;
    const dates = local
      .map((s) => safeParseISO(s.fullStartISO))
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime());
    return dates.length ? dates[0] : null;
  }, [local]);

  // prefer the external lastSetting prop if provided, otherwise fall back to latestFullStart
  const headerDate = useMemo(() => {
    const p = parseLastSettingProp(lastSetting);
    if (p) return p;
    return latestFullStart;
  }, [lastSetting, latestFullStart]);

  return (
    <div className="p-4 w-full flex justify-center">
      <div className="w-full max-w-5xl p-6 bg-white rounded-2xl shadow-xl border border-white/40">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            {/* LEFT: Title + Date */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800">
                Multi Settings
              </h2>

              {/* Date box */}
              <div
                className="w-full sm:w-auto sm:min-w-[260px] h-10
                          border border-gray-200 rounded-md
                          flex items-center px-3 bg-white"
                style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.02)" }}
              >
                <div className="text-sm text-gray-700 truncate">
                  {headerDate ? (
                    <span className="font-medium">
                      {formatDateTime(headerDate)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleClearAll}
                className="px-4 py-2 w-full sm:w-auto
                          bg-red-100 text-red-600 rounded-md
                          hover:bg-red-200 text-sm font-medium"
              >
                Clear All
              </button>

              <button
                onClick={() => {
                  if (typeof updateSettings === "function") {
                    updateSettings(reindex(local));
                  }
                  if (onClose) onClose();
                }}
                className="px-4 py-2 w-full sm:w-auto
                          bg-green-600 text-white rounded-md
                          hover:bg-green-700"
              >
                Done
              </button>
            </div>

          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block">
          {local.length === 0 ? (
            <div className="text-sm text-gray-500">No saved settings.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl shadow-sm border border-gray-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-indigo-500 text-white">
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Start</th>
                    <th className="px-4 py-3 text-left font-semibold">Feed (KG)</th>
                    <th className="px-4 py-3 text-left font-semibold">Dispatch (g)</th>
                    <th className="px-4 py-3 text-left font-semibold">Gap (s)</th>
                    <th className="px-4 py-3 text-left font-semibold">End</th>
                    <th className="px-4 py-3 text-left font-semibold">Run</th>
                    <th className="px-4 py-3 text-left font-semibold">Cycles</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {local.map((s, idx) => {
                    const { cycles, totalText, endTime } = computeRowInfo(s);

                    return (
                      <tr
                        key={s.id ?? idx}
                        className="border-t border-gray-200 hover:bg-indigo-50/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{s.label}</div>
                          <div className="text-xs text-gray-400">#{s.id}</div>
                        </td>

                        <td className="px-4 py-3 text-gray-800">{s.startTime || "-"}</td>

                        <td className="px-4 py-3 text-gray-800">
                          {s.feedLevel || "-"} <span className="text-xs text-gray-500">KG</span>
                        </td>

                        <td className="px-4 py-3 text-gray-800">
                          {s.dispatch || 250} <span className="text-xs text-gray-500">g</span>
                        </td>

                        <td className="px-4 py-3 text-gray-800">
                          {s.timeGap || 180} <span className="text-xs text-gray-500">s</span>
                        </td>

                        <td className="px-4 py-3 text-gray-800 font-bold">{endTime}</td>

                        <td className="px-4 py-3 text-gray-800 font-bold">{totalText}</td>

                        <td className="px-4 py-3 text-gray-800 font-bold">{cycles || 0}</td>

                        <td className="px-4 py-3 text-gray-400">{" "}</td>

                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removeAt(idx)}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600"
                            title="Delete"
                          >
                            <FiTrash2 className="mr-1" size={14} /> Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MOBILE CARDS */}
        <div className="md:hidden space-y-3">
          <AnimatePresence>
            {local.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-500">
                No saved settings.
              </motion.div>
            )}

            {local.map((s, idx) => {
              const { cycles, totalText, endTime } = computeRowInfo(s);

              return (
                <motion.div
                  key={s.id ?? idx}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="p-3 bg-white border rounded-lg shadow-sm"
                >
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{s.label}</div>
                      <div className="text-xs text-gray-500">#{s.id}</div>
                    </div>
                    <button
                      onClick={() => removeAt(idx)}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-1"
                    >
                      <FiTrash2 size={12} /> Delete
                    </button>
                  </div>

                  <div className="mt-2 text-xs text-gray-700 space-y-1">
                    <div>
                      <span className="font-medium ">Start:</span> {s.startTime || "-"}
                    </div>

                    <div>
                      <span className="font-medium">Feed:</span> {s.feedLevel || "-"} KG
                    </div>

                    <div>
                      <span className="font-medium">Dispatch:</span> {s.dispatch || 250} g
                    </div>

                    <div>
                      <span className="font-medium">Gap:</span> {s.timeGap || 180} s
                    </div>

                    <div>
                      <span className="font-medium">End:</span> {endTime}
                    </div>

                    <div>
                      <span className="font-medium">Run:</span> {totalText}
                    </div>

                    <div>
                      <span className="font-medium">Cycles:</span> {cycles || 0}
                    </div>

                    <div>
                      <span className="font-medium">Status:</span> {/* empty for now */}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
