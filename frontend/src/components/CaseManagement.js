import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, FileText, Plus, Search, Filter, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CaseManagement({ user, onLogout }) {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [crimeTypeFilter, setCrimeTypeFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newCase, setNewCase] = useState({
    defendantName: "",
    defendantAddress: "",
    crimeType: "",
    crimeDate: "",
    crimeLocation: "",
    arrestingOfficer: "",
    arrestDate: "",
    presidingJudge: "",
    publicProsecutor: "",
    startDate: "",
    expectedCompletionDate: "",
  });

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    filterCases();
  }, [cases, searchKeyword, statusFilter, crimeTypeFilter]);

  const fetchCases = async () => {
    try {
      const response = await axios.get(`${API}/cases`);
      setCases(response.data);
    } catch (error) {
      console.error("Error fetching cases:", error);
      toast.error("Failed to load cases");
    }
  };

  const filterCases = () => {
    let filtered = [...cases];

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.cin.toLowerCase().includes(keyword) ||
          c.defendantName.toLowerCase().includes(keyword) ||
          c.crimeType.toLowerCase().includes(keyword) ||
          c.crimeLocation.toLowerCase().includes(keyword)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (crimeTypeFilter !== "all") {
      filtered = filtered.filter((c) => c.crimeType === crimeTypeFilter);
    }

    setFilteredCases(filtered);
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/cases`, newCase);
      toast.success("Case created successfully!");
      setShowCreateDialog(false);
      setNewCase({
        defendantName: "",
        defendantAddress: "",
        crimeType: "",
        crimeDate: "",
        crimeLocation: "",
        arrestingOfficer: "",
        arrestDate: "",
        presidingJudge: "",
        publicProsecutor: "",
        startDate: "",
        expectedCompletionDate: "",
      });
      fetchCases();
    } catch (error) {
      console.error("Error creating case:", error);
      toast.error(error.response?.data?.detail || "Failed to create case");
    } finally {
      setLoading(false);
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

  const crimeTypes = [...new Set(cases.map((c) => c.crimeType))];

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
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">Case Management</h1>
                  <p className="text-xs text-slate-500">{filteredCases.length} cases</p>
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
        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <Label htmlFor="search" className="text-slate-700 mb-2 block">
                  Search Cases
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="search"
                    data-testid="case-search-input"
                    placeholder="Search by CIN, defendant, crime type, location..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <Label className="text-slate-700 mb-2 block">Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3">
                <Label className="text-slate-700 mb-2 block">Crime Type Filter</Label>
                <Select value={crimeTypeFilter} onValueChange={setCrimeTypeFilter}>
                  <SelectTrigger data-testid="crime-type-filter">
                    <SelectValue placeholder="All Crime Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Crime Types</SelectItem>
                    {crimeTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {user.role === "registrar" && (
                <div className="md:col-span-1 flex items-end">
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button data-testid="create-case-button" className="w-full bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Case</DialogTitle>
                        <DialogDescription>Enter the details for the new case</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateCase} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Defendant Name *</Label>
                            <Input
                              data-testid="defendant-name-input"
                              required
                              value={newCase.defendantName}
                              onChange={(e) => setNewCase({ ...newCase, defendantName: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Crime Type *</Label>
                            <Input
                              data-testid="crime-type-input"
                              required
                              value={newCase.crimeType}
                              onChange={(e) => setNewCase({ ...newCase, crimeType: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Defendant Address *</Label>
                          <Input
                            required
                            value={newCase.defendantAddress}
                            onChange={(e) => setNewCase({ ...newCase, defendantAddress: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Crime Date *</Label>
                            <Input
                              type="date"
                              required
                              value={newCase.crimeDate}
                              onChange={(e) => setNewCase({ ...newCase, crimeDate: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Crime Location *</Label>
                            <Input
                              required
                              value={newCase.crimeLocation}
                              onChange={(e) => setNewCase({ ...newCase, crimeLocation: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Arresting Officer *</Label>
                            <Input
                              required
                              value={newCase.arrestingOfficer}
                              onChange={(e) => setNewCase({ ...newCase, arrestingOfficer: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Arrest Date *</Label>
                            <Input
                              type="date"
                              required
                              value={newCase.arrestDate}
                              onChange={(e) => setNewCase({ ...newCase, arrestDate: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Presiding Judge *</Label>
                            <Input
                              required
                              value={newCase.presidingJudge}
                              onChange={(e) => setNewCase({ ...newCase, presidingJudge: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Public Prosecutor *</Label>
                            <Input
                              required
                              value={newCase.publicProsecutor}
                              onChange={(e) => setNewCase({ ...newCase, publicProsecutor: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start Date *</Label>
                            <Input
                              type="date"
                              required
                              value={newCase.startDate}
                              onChange={(e) => setNewCase({ ...newCase, startDate: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Expected Completion Date *</Label>
                            <Input
                              type="date"
                              required
                              value={newCase.expectedCompletionDate}
                              onChange={(e) => setNewCase({ ...newCase, expectedCompletionDate: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" data-testid="submit-case-button" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? "Creating..." : "Create Case"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cases List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredCases.length > 0 ? (
            filteredCases.map((caseItem) => (
              <Card
                key={caseItem.cin}
                onClick={() => navigate(`/cases/${caseItem.cin}`)}
                className="case-card cursor-pointer border-slate-200 hover:border-blue-300"
                data-testid={`case-card-${caseItem.cin}`}
              >
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{caseItem.cin}</h3>
                      <p className="text-slate-600">{caseItem.defendantName}</p>
                    </div>
                    <span className={`status-badge ${getStatusColor(caseItem.status)}`}>
                      {caseItem.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Crime Type</p>
                      <p className="text-slate-900 font-medium">{caseItem.crimeType}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Crime Date</p>
                      <p className="text-slate-900 font-medium">{caseItem.crimeDate}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Presiding Judge</p>
                      <p className="text-slate-900 font-medium">{caseItem.presidingJudge}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Next Hearing</p>
                      <p className="text-slate-900 font-medium">
                        {caseItem.hearing.length > 0
                          ? caseItem.hearing[caseItem.hearing.length - 1]
                          : "Not scheduled"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No cases found matching your criteria</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
