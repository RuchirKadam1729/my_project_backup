import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, DollarSign } from "lucide-react";
import { toast } from "sonner";

const API = `/api`;

export default function Bills({ user, onLogout }) {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await axios.get(`${API}/bills`);
      setBills(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching bills:", error);
      toast.error("Failed to load bills");
      setLoading(false);
    }
  };

  const handlePayBill = async (billID) => {
    try {
      await axios.put(`${API}/bills/${billID}/pay`);
      toast.success("Bill paid successfully!");
      fetchBills();
    } catch (error) {
      console.error("Error paying bill:", error);
      toast.error(error.response?.data?.detail || "Failed to pay bill");
    }
  };

  const getTotalUnpaid = () => {
    return bills
      .filter((bill) => bill.status === "Unpaid")
      .reduce((sum, bill) => sum + bill.amount, 0);
  };

  const getTotalPaid = () => {
    return bills
      .filter((bill) => bill.status === "Paid")
      .reduce((sum, bill) => sum + bill.amount, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-lg text-slate-600">Loading bills...</div>
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
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">My Bills</h1>
                  <p className="text-xs text-slate-500">{bills.length} bill(s)</p>
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-600">Total Bills</CardDescription>
              <CardTitle className="text-3xl font-bold text-slate-900">{bills.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-red-600">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-600">Unpaid Amount</CardDescription>
              <CardTitle className="text-3xl font-bold text-slate-900">
                ${getTotalUnpaid().toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-green-600">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-600">Paid Amount</CardDescription>
              <CardTitle className="text-3xl font-bold text-slate-900">
                ${getTotalPaid().toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Bills List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">All Bills</CardTitle>
            <CardDescription className="text-slate-600">Your billing history</CardDescription>
          </CardHeader>
          <CardContent>
            {bills.length > 0 ? (
              <div className="space-y-4">
                {bills.map((bill) => (
                  <div
                    key={bill.billID}
                    className="border border-slate-200 rounded-lg p-4"
                    data-testid={`bill-item-${bill.billID}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900">Bill #{bill.billID.slice(0, 8)}</h3>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              bill.status === "Paid"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {bill.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">{bill.description}</p>
                        <p className="text-xs text-slate-500">
                          Generated on {new Date(bill.generatedDate).toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 text-2xl font-bold text-slate-900 mb-2">
                          <DollarSign className="w-5 h-5" />
                          {bill.amount.toFixed(2)}
                        </div>
                        {bill.status === "Unpaid" && (
                          <Button
                            size="sm"
                            data-testid={`pay-bill-${bill.billID}`}
                            onClick={() => handlePayBill(bill.billID)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No bills yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Bills will appear here when you view cases
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
