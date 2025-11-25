import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/* ------------------------------------------------------ */
/* DATE UTILITIES — SAFE, NO TIMEZONE SHIFT */
/* ------------------------------------------------------ */

// Parse "YYYY-MM-DD"
function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return new Date();
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Construct date from Y/M/D
function makeDate(y, m, d) {
  return new Date(y, m, d);
}

// Format YYYY-MM-DD (LOCAL, NO UTC)
function toLocalKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/* ------------------------------------------------------ */

export default function JudgeCalendar({ user }) {
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [cases, setCases] = useState([]);
  const [hearingsByDate, setHearingsByDate] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJudgeCases();
  }, [user.name]);

  useEffect(() => {
    const interval = setInterval(fetchJudgeCases, 30000);
    return () => clearInterval(interval);
  }, [user.name]);

  const fetchJudgeCases = async () => {
    try {
      const response = await axios.get(`${API}/cases`);

      const judgeCases = response.data.filter((c) => {
        if (!c.presidingJudge || !user?.name) return false;

        const cleanCaseJudge = c.presidingJudge
          .toLowerCase()
          .replace(/^hon\.\s*/, "");
        const cleanUser = user.name.toLowerCase();

        return (
          cleanCaseJudge === cleanUser ||
          cleanCaseJudge.includes(cleanUser) ||
          cleanUser.includes(cleanCaseJudge)
        );
      });

      setCases(judgeCases);
      organizeHearings(judgeCases);
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load calendar");
    }
  };

  const organizeHearings = (caseList) => {
    const grouped = {};

    caseList.forEach((caseItem) => {
      if (!Array.isArray(caseItem.hearing)) return;

      caseItem.hearing.forEach((rawDate) => {
        const dateObj = parseDateString(rawDate);
        if (isNaN(dateObj)) return;

        const key = toLocalKey(dateObj);

        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(caseItem);
      });
    });

    setHearingsByDate(grouped);
  };

  const getMonthInfo = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = makeDate(year, month, 1);
    const lastDay = makeDate(year, month + 1, 0);

    return {
      year,
      month,
      daysInMonth: lastDay.getDate(),
      startDay: firstDay.getDay(),
    };
  };

  // THIS WAS THE BUG — FIXED
  const formatDateKey = (year, month, day) => {
    const d = makeDate(year, month, day);
    return toLocalKey(d);
  };

  const navigateMonth = (dir) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + dir);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const isToday = (y, m, d) => {
    const t = new Date();
    return (
      t.getFullYear() === y &&
      t.getMonth() === m &&
      t.getDate() === d
    );
  };

  const getStatusColor = (s) =>
    ({
      Pending: "bg-yellow-100 text-yellow-800",
      "In Progress": "bg-blue-100 text-blue-800",
      Resolved: "bg-green-100 text-green-800",
      Closed: "bg-slate-100 text-slate-800",
    }[s] || "bg-slate-100 text-slate-800");

  const renderCalendar = () => {
    const { year, month, daysInMonth, startDay } = getMonthInfo(currentDate);
    const weeks = [];

    const headers = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
      (day) => (
        <div
          key={day}
          className="text-center text-xs py-2 font-semibold text-slate-600"
        >
          {day}
        </div>
      )
    );

    for (let i = 0; i < startDay; i++) {
      weeks.push(<div key={`empty-${i}`} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = makeDate(year, month, d);
      const key = formatDateKey(year, month, d);
      const has = hearingsByDate[key]?.length > 0;
      const isSelected = selectedDate === key;

      weeks.push(
        <div
          key={d}
          onClick={() => has && setSelectedDate(key)}
          className={`
            p-2 min-h-[60px] border cursor-pointer
            ${
              isToday(year, month, d)
                ? "bg-blue-50 border-blue-300"
                : "bg-white"
            }
            ${isSelected ? "ring-2 ring-blue-500" : ""}
            ${has ? "hover:border-blue-400" : ""}
          `}
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium mb-1">{d}</span>

            {has && (
              <div className="flex flex-col gap-1">
                {hearingsByDate[key].slice(0, 2).map((caseItem, idx) => (
                  <div
                    key={idx}
                    className="text-xs bg-blue-100 text-blue-700 rounded px-1 py-0.5 truncate"
                  >
                    {caseItem.cin}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <>
        {headers}
        {weeks}
      </>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-slate-500">
          Loading calendar…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Calendar className="w-5 h-5" />
                My Court Schedule
              </CardTitle>
              <CardDescription>Cases scheduled for hearings</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="font-semibold w-[140px] text-center">
                {currentDate.toLocaleString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </div>

              <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>

          {selectedDate && hearingsByDate[selectedDate] && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold mb-3">
                Cases on{" "}
                {parseDateString(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                <span className="ml-2 text-blue-600">
                  ({hearingsByDate[selectedDate].length} hearing
                  {hearingsByDate[selectedDate].length > 1 ? "s" : ""})
                </span>
              </h3>

              {hearingsByDate[selectedDate].map((caseItem) => (
                <div
                  key={caseItem.cin}
                  className="p-3 mb-2 border rounded-lg hover:border-blue-300 cursor-pointer"
                  onClick={() => navigate(`/cases/${caseItem.cin}`)}
                >
                  <div className="flex justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{caseItem.cin}</h4>
                      <p className="text-sm text-slate-600">{caseItem.defendantName}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${getStatusColor(
                        caseItem.status
                      )}`}
                    >
                      {caseItem.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 text-xs text-slate-600">
                    <div>
                      <strong>Crime:</strong> {caseItem.crimeType}
                    </div>
                    <div>
                      <strong>Prosecutor:</strong> {caseItem.publicProsecutor}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Case Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Summary label="Total Cases" value={cases.length} color="text-blue-600" />
            <Summary
              label="Pending"
              value={cases.filter((c) => c.status === "Pending").length}
              color="text-yellow-600"
            />
            <Summary
              label="In Progress"
              value={cases.filter((c) => c.status === "In Progress").length}
              color="text-blue-500"
            />
            <Summary
              label="Scheduled Hearings"
              value={Object.keys(hearingsByDate).length}
              color="text-slate-600"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-600">{label}</div>
    </div>
  );
}
