import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, FileText, Briefcase, TrendingUp, LogOut, Menu, X } from "lucide-react";
import { toast } from "sonner";
import JudgeCalendar from "./JudgeCalendar";

const API = `/api`;

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, casesRes] = await Promise.all([
        axios.get(`${API}/statistics`),
        axios.get(`${API}/cases`),
      ]);

      setStats(statsRes.data);
      setRecentCases(casesRes.data.slice(0, 5));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dashboard data");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Pending: "status-pending",
      "In Progress": "status-in-progress",
      Resolved: "status-resolved",
      Closed: "status-closed",
    };
    return colors[status] || "status-pending";
  };

  const navItems = [
    { label: "Dashboard", path: "/", icon: Scale },
    { label: "Cases", path: "/cases", icon: FileText },
  ];

  if (user.role === "registrar") {
    navItems.push({ label: "Reports", path: "/reports", icon: TrendingUp });
  }
  if (user.role === "lawyer") {
    navItems.push({ label: "My Bills", path: "/bills", icon: Briefcase });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-900">JIS</h1>
                <p className="text-xs text-slate-500">Judiciary System</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    onClick={() => navigate(item.path)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                data-testid="logout-button"
                className="hidden md:flex items-center gap-2 border-slate-300"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200 py-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    onClick={() => {
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                onClick={onLogout}
                className="w-full justify-start gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, {user.name}</h2>
          <p className="text-slate-600">Here's what's happening in the judiciary system today.</p>
        </div>

        {/* Show Calendar for Judges */}
        {user.role === "judge" && (
          <div className="mb-8">
            <JudgeCalendar user={user} />
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-l-4 border-l-blue-600">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-600">Total Cases</CardDescription>
                <CardTitle className="text-3xl font-bold text-slate-900">
                  {stats.totalCases}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="border-l-4 border-l-yellow-600">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-600">Pending Cases</CardDescription>
                <CardTitle className="text-3xl font-bold text-slate-900">
                  {stats.pendingCases}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-600">In Progress</CardDescription>
                <CardTitle className="text-3xl font-bold text-slate-900">
                  {stats.inProgressCases}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-600">Resolved Cases</CardDescription>
                <CardTitle className="text-3xl font-bold text-slate-900">
                  {stats.resolvedCases}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Recent Cases */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Recent Cases</CardTitle>
                <CardDescription className="text-slate-600">Latest case updates</CardDescription>
              </div>
              <Button onClick={() => navigate("/cases")} variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentCases.length > 0 ? (
              <div className="space-y-4">
                {recentCases.map((caseItem) => (
                  <div
                    key={caseItem.cin}
                    onClick={() => navigate(`/cases/${caseItem.cin}`)}
                    className="case-card p-4 border border-slate-200 rounded-lg hover:border-blue-300 cursor-pointer bg-white"
                    data-testid={`case-item-${caseItem.cin}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-900">{caseItem.cin}</h3>
                        <p className="text-sm text-slate-600">{caseItem.defendantName}</p>
                      </div>
                      <span className={`status-badge ${getStatusColor(caseItem.status)}`}>
                        {caseItem.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="font-medium">Crime:</span> {caseItem.crimeType}
                      </div>
                      <div>
                        <span className="font-medium">Judge:</span> {caseItem.presidingJudge}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No cases available</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}