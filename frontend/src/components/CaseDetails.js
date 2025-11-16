import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Edit, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CaseDetails({ user, onLogout }) {
  const { cin } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showHearingDialog, setShowHearingDialog] = useState(false);
  const [newHearingDate, setNewHearingDate] = useState("");
  const [editedCase, setEditedCase] = useState(null);

  useEffect(() => {
    fetchCaseDetails();
  }, [cin]);

  const fetchCaseDetails = async () => {
    try {
      const response = await axios.get(`${API}/cases/${cin}`);
      setCaseData(response.data);
      setEditedCase(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching case:", error);
      toast.error("Failed to load case details");
      navigate("/cases");
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API}/cases/${cin}`, editedCase);
      toast.success("Case updated successfully!");
      setEditMode(false);
      fetchCaseDetails();
    } catch (error) {
      console.error("Error updating case:", error);
      toast.error(error.response?.data?.detail || "Failed to update case");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this case?")) {
      try {
        await axios.delete(`${API}/cases/${cin}`);
        toast.success("Case deleted successfully!");
        navigate("/cases");
      } catch (error) {
        console.error("Error deleting case:", error);
        toast.error(error.response?.data?.detail || "Failed to delete case");
      }
    }
  };

  const handleScheduleHearing = async () => {
    if (!newHearingDate) {
      toast.error("Please select a hearing date");
      return;
    }

    try {
      await axios.post(`${API}/cases/${cin}/hearing`, {
        cin,
        hearingDate: newHearingDate,
      });
      toast.success("Hearing scheduled successfully!");
      setShowHearingDialog(false);
      setNewHearingDate("");
      fetchCaseDetails();
    } catch (error) {
      console.error("Error scheduling hearing:", error);
      toast.error(error.response?.data?.detail || "Failed to schedule hearing");
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

  if (loading || !caseData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-lg text-slate-600">Loading case details...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/cases")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-slate-900">{caseData.cin}</h1>
                <p className="text-xs text-slate-500">{caseData.defendantName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user.role === "registrar" && (
                <>
                  {editMode ? (
                    <>
                      <Button onClick={handleUpdate} size="sm" data-testid="save-case-button" className="bg-blue-600 hover:bg-blue-700">
                        Save Changes
                      </Button>
                      <Button onClick={() => setEditMode(false)} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => setEditMode(true)} size="sm" data-testid="edit-case-button" variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button onClick={handleDelete} size="sm" data-testid="delete-case-button" variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  )}
                </>
              )}
              <Button onClick={onLogout} variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Case Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-bold text-slate-900">{caseData.cin}</CardTitle>
                    <CardDescription className="text-slate-600 mt-1">
                      Created on {new Date(caseData.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <span className={`status-badge ${getStatusColor(caseData.status)}`} data-testid="case-status-badge">
                    {caseData.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Defendant Information */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Defendant Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-600">Name</Label>
                      {editMode ? (
                        <Input
                          value={editedCase.defendantName}
                          onChange={(e) => setEditedCase({ ...editedCase, defendantName: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium mt-1">{caseData.defendantName}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-slate-600">Address</Label>
                      {editMode ? (
                        <Input
                          value={editedCase.defendantAddress}
                          onChange={(e) => setEditedCase({ ...editedCase, defendantAddress: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium mt-1">{caseData.defendantAddress}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Crime Details */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Crime Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-600">Crime Type</Label>
                      {editMode ? (
                        <Input
                          value={editedCase.crimeType}
                          onChange={(e) => setEditedCase({ ...editedCase, crimeType: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium mt-1">{caseData.crimeType}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-600">Crime Date</Label>
                      {editMode ? (
                        <Input
                          type="date"
                          value={editedCase.crimeDate}
                          onChange={(e) => setEditedCase({ ...editedCase, crimeDate: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium mt-1">{caseData.crimeDate}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-600">Crime Location</Label>
                      {editMode ? (
                        <Input
                          value={editedCase.crimeLocation}
                          onChange={(e) => setEditedCase({ ...editedCase, crimeLocation: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium mt-1">{caseData.crimeLocation}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-600">Arresting Officer</Label>
                      {editMode ? (
                        <Input
                          value={editedCase.arrestingOfficer}
                          onChange={(e) => setEditedCase({ ...editedCase, arrestingOfficer: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium mt-1">{caseData.arrestingOfficer}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-600">Arrest Date</Label>
                      {editMode ? (
                        <Input
                          type="date"
                          value={editedCase.arrestDate}
                          onChange={(e) => setEditedCase({ ...editedCase, arrestDate: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium mt-1">{caseData.arrestDate}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Court Details */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Court Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-600">Presiding Judge</Label>
                      {editMode ? (
                        <Input
                          value={editedCase.presidingJudge}
                          onChange={(e) => setEditedCase({ ...editedCase, presidingJudge: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium mt-1">{caseData.presidingJudge}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-600">Public Prosecutor</Label>
                      {editMode ? (
                        <Input
                          value={editedCase.publicProsecutor}
                          onChange={(e) => setEditedCase({ ...editedCase, publicProsecutor: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium mt-1">{caseData.publicProsecutor}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-600">Start Date</Label>
                      {editMode ? (
                        <Input
                          type="date"
                          value={editedCase.startDate}
                          onChange={(e) => setEditedCase({ ...editedCase, startDate: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium mt-1">{caseData.startDate}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-600">Expected Completion</Label>
                      {editMode ? (
                        <Input
                          type="date"
                          value={editedCase.expectedCompletionDate}
                          onChange={(e) => setEditedCase({ ...editedCase, expectedCompletionDate: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-slate-900 font-medium mt-1">{caseData.expectedCompletionDate}</p>
                      )}
                    </div>
                    {editMode && (
                      <div>
                        <Label className="text-slate-600">Status</Label>
                        <Select
                          value={editedCase.status}
                          onValueChange={(value) => setEditedCase({ ...editedCase, status: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Judgement Information */}
                {(caseData.judgementInfo || editMode) && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Judgement Information</h3>
                    {editMode ? (
                      <Textarea
                        data-testid="judgement-info-input"
                        value={editedCase.judgementInfo || ""}
                        onChange={(e) => setEditedCase({ ...editedCase, judgementInfo: e.target.value })}
                        placeholder="Enter judgement details..."
                        rows={4}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-slate-900 mt-1 bg-slate-50 p-4 rounded-lg">
                        {caseData.judgementInfo}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Hearings */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-bold text-slate-900">Hearings</CardTitle>
                  {user.role === "registrar" && (
                    <Dialog open={showHearingDialog} onOpenChange={setShowHearingDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="schedule-hearing-button" variant="outline">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Schedule Hearing</DialogTitle>
                          <DialogDescription>Select a date for the hearing</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Hearing Date</Label>
                            <Input
                              type="date"
                              data-testid="hearing-date-input"
                              value={newHearingDate}
                              onChange={(e) => setNewHearingDate(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowHearingDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleScheduleHearing} data-testid="confirm-hearing-button" className="bg-blue-600 hover:bg-blue-700">
                              Schedule
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {caseData.hearing.length > 0 ? (
                  <div className="space-y-3">
                    {caseData.hearing.map((date, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            Hearing {index + 1}
                          </p>
                          <p className="text-xs text-slate-600">{date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No hearings scheduled</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
