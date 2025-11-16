import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Download, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Reports({ user, onLogout }) {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [reportType, setReportType] = useState("pending");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cin, setCin] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API}/reports`);
      setReports(response.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { reportType };

      if (reportType === "resolved" && startDate && endDate) {
        payload.startDate = startDate;
        payload.endDate = endDate;
      } else if (reportType === "status" && cin) {
        payload.cin = cin;
      }

      await axios.post(`${API}/reports`, payload);
      toast.success("Report generated successfully!");
      fetchReports();
      
      // Reset form
      setStartDate("");
      setEndDate("");
      setCin("");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error(error.response?.data?.detail || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (report) => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-${report.reportID}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded successfully!");
  };

  const getReportTypeLabel = (type) => {
    const labels = {
      pending: "Pending Cases Report",
      resolved: "Resolved Cases Report",
      status: "Case Status Report",
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">Reports</h1>
                  <p className="text-xs text-slate-500">Generate and view reports</p>
                </div>
              </div>
            </div>

            <Button onClick={onLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Generate Report Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900">Generate Report</CardTitle>
                <CardDescription className="text-slate-600">Create a new report</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateReport} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Report Type</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger data-testid="report-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending Cases</SelectItem>
                        <SelectItem value="resolved">Resolved Cases</SelectItem>
                        <SelectItem value="status">Case Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {reportType === "resolved" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-slate-700">Start Date</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700">End Date</Label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {reportType === "status" && (
                    <div className="space-y-2">
                      <Label className="text-slate-700">Case ID (CIN)</Label>
                      <Input
                        data-testid="cin-input"
                        placeholder="Enter CIN"
                        value={cin}
                        onChange={(e) => setCin(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    data-testid="generate-report-button"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? "Generating..." : "Generate Report"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Reports List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900">Generated Reports</CardTitle>
                <CardDescription className="text-slate-600">
                  {reports.length} report(s) available
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length > 0 ? (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div
                        key={report.reportID}
                        className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                        data-testid={`report-item-${report.reportID}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {getReportTypeLabel(report.reportType)}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              Generated on {new Date(report.generatedDate).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadReport(report)}
                            data-testid={`download-report-${report.reportID}`}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-3">
                          {report.reportType === "pending" && (
                            <div>
                              <p className="text-sm text-slate-600 mb-1">Summary</p>
                              <p className="text-slate-900 font-medium">
                                Total Pending Cases: {report.content.totalPendingCases}
                              </p>
                            </div>
                          )}

                          {report.reportType === "resolved" && (
                            <div>
                              <p className="text-sm text-slate-600 mb-1">Summary</p>
                              <p className="text-slate-900 font-medium">
                                Total Resolved Cases: {report.content.totalResolvedCases}
                              </p>
                              {report.content.dateRange && (
                                <p className="text-xs text-slate-600 mt-1">
                                  Period: {report.content.dateRange.start} to {report.content.dateRange.end}
                                </p>
                              )}
                            </div>
                          )}

                          {report.reportType === "status" && report.content.case && (
                            <div>
                              <p className="text-sm text-slate-600 mb-1">Case Information</p>
                              <p className="text-slate-900 font-medium">
                                {report.content.case.cin} - {report.content.case.defendantName}
                              </p>
                              <p className="text-xs text-slate-600 mt-1">
                                Status: {report.content.case.status}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500">No reports generated yet</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Use the form to generate your first report
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
