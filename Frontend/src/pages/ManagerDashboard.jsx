import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import SideNavbar from "@/components/layout/SideNavbar";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";
import { useUser } from "@/context/UserContext";
import { managerApi } from "@/api/managerApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

function formatAmount(amount) {
  return Number(amount || 0).toLocaleString("en-IN");
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export default function ManagerDashboard() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("approvals");
  const [approvals, setApprovals] = useState([]);
  const [history, setHistory] = useState([]);
  const [actingExpenseId, setActingExpenseId] = useState("");

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const response = await managerApi.getApprovalsToReview();
      setApprovals(response?.data?.approvals || []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load approvals to review"));
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await managerApi.getApprovalHistory();
      setHistory(response?.data?.history || []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load approval history"));
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  useEffect(() => {
    if (activeTab === "history" && history.length === 0) {
      loadHistory();
    }
  }, [activeTab]);

  const handleAction = async (approval, action) => {
    setActingExpenseId(approval.expenseId);
    try {
      await managerApi.actOnApproval(approval.expenseId, {
        action,
      });

      setApprovals((previous) =>
        previous.map((item) =>
          item.approvalRequestId === approval.approvalRequestId
            ? {
                ...item,
                requestStatus: action,
              }
            : item
        )
      );

      toast.success(action === "APPROVED" ? "Request approved" : "Request rejected");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to process approval action"));
    } finally {
      setActingExpenseId("");
    }
  };

  return (
    <div className="flex h-screen bg-slate-950">
      <SideNavbar hideUsers={true} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar hideUsers={true} />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            <PageBreadcrumb
              items={[{ label: "Home", to: "/manager-dashboard" }]}
              current="Manager Dashboard"
            />

            <div>
              <h1 className="text-3xl font-bold text-white">Manager&apos;s View</h1>
              <p className="text-slate-400 mt-1">Manage approvals and view history</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 p-1">
                <TabsTrigger 
                  value="approvals"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-slate-200 font-semibold px-6 py-2.5 transition-all duration-200"
                >
                  📋 Approvals to Review
                </TabsTrigger>
                <TabsTrigger 
                  value="history"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-slate-200 font-semibold px-6 py-2.5 transition-all duration-200"
                >
                  📜 Approval History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="approvals" className="space-y-6">

                <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-900/50 to-slate-900/50 border-b border-slate-700 pb-4">
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                      📋 Pending Approvals
                    </CardTitle>
                    <CardDescription className="text-slate-300 mt-2 text-sm">
                      {approvals.length} request{approvals.length !== 1 ? 's' : ''} awaiting your decision
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading ? (
                      <p className="text-slate-300">Loading approvals...</p>
                    ) : approvals.length === 0 ? (
                      <p className="text-slate-400">No approvals available to review.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/50">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gradient-to-r from-blue-950 to-slate-900 text-slate-200 font-semibold">
                            <tr>
                              <th className="px-4 py-4 border-b border-slate-700">Approval Subject</th>
                              <th className="px-4 py-4 border-b border-slate-700">Request Owner</th>
                              <th className="px-4 py-4 border-b border-slate-700">Category</th>
                              <th className="px-4 py-4 border-b border-slate-700">Status</th>
                              <th className="px-4 py-4 border-b border-slate-700">Amount</th>
                              <th className="px-4 py-4 border-b border-slate-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {approvals.map((approval) => {
                              const isDone = approval.requestStatus === "APPROVED" || approval.requestStatus === "REJECTED";
                              const isBusy = actingExpenseId === approval.expenseId;
                              const statusColor = approval.requestStatus === "APPROVED" ? "text-emerald-400" : approval.requestStatus === "REJECTED" ? "text-red-400" : "text-yellow-400";

                              return (
                                <tr key={approval.approvalRequestId} className="text-slate-200 hover:bg-slate-800/80 transition-colors border-b border-slate-700 last:border-b-0">
                                  <td className="px-4 py-4">{approval.subject || "—"}</td>
                                  <td className="px-4 py-4 font-medium">{approval.requestOwner}</td>
                                  <td className="px-4 py-4 text-xs uppercase text-slate-400">{String(approval.category || "OTHER").replaceAll("_", " ")}</td>
                                  <td className={`px-4 py-4 font-semibold ${statusColor}`}>{approval.requestStatus}</td>
                                  <td className="px-4 py-4 font-semibold text-slate-100">₹{formatAmount(approval.amountInBaseCurrency)}</td>
                                  <td className="px-4 py-4">
                                    {isDone ? (
                                      <Badge variant="default" className={approval.requestStatus === "APPROVED" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}>
                                        {approval.requestStatus}
                                      </Badge>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="bg-emerald-600 text-white hover:bg-emerald-500 font-semibold shadow-md hover:shadow-lg transition-all"
                                          disabled={isBusy}
                                          onClick={() => handleAction(approval, "APPROVED")}
                                        >
                                          {isBusy ? "..." : "✓ Approve"}
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="bg-red-600 text-white hover:bg-red-500 font-semibold shadow-md hover:shadow-lg transition-all"
                                          disabled={isBusy}
                                          onClick={() => handleAction(approval, "REJECTED")}
                                        >
                                          {isBusy ? "..." : "✗ Reject"}
                                        </Button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-emerald-900/50 to-slate-900/50 border-b border-slate-700 pb-4">
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                      📜 Approval History
                    </CardTitle>
                    <CardDescription className="text-slate-300 mt-2 text-sm">
                      {history.length} action{history.length !== 1 ? 's' : ''} in your approval record
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {historyLoading ? (
                      <p className="text-slate-300">Loading history...</p>
                    ) : history.length === 0 ? (
                      <p className="text-slate-400">No approval history available.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/50">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gradient-to-r from-emerald-950 to-slate-900 text-slate-200 font-semibold">
                            <tr>
                              <th className="px-4 py-4 border-b border-slate-700">Expense ID</th>
                              <th className="px-4 py-4 border-b border-slate-700">Employee</th>
                              <th className="px-4 py-4 border-b border-slate-700">Description</th>
                              <th className="px-4 py-4 border-b border-slate-700">Amount</th>
                              <th className="px-4 py-4 border-b border-slate-700">Action</th>
                              <th className="px-4 py-4 border-b border-slate-700">Date & Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.map((item) => {
                              const badgeVariant = item.statusType === "success" ? "default" : item.statusType === "error" ? "destructive" : "outline";
                              const badgeClass = item.statusType === "success" ? "bg-emerald-600 text-white" : item.statusType === "error" ? "bg-red-600 text-white" : "bg-slate-700 text-slate-200";
                              const date = new Date(item.actedAt);
                              const formattedDate = date.toLocaleDateString();
                              const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                              return (
                                <tr key={item.id} className="text-slate-200 hover:bg-slate-800/80 transition-colors border-b border-slate-700 last:border-b-0">
                                  <td className="px-4 py-4 font-mono text-xs text-slate-400">{item.expenseId.slice(0, 8)}...</td>
                                  <td className="px-4 py-4 font-medium">{item.employeeName}</td>
                                  <td className="px-4 py-4 text-slate-300">{item.description || "—"}</td>
                                  <td className="px-4 py-4 font-semibold text-slate-100">₹{formatAmount(item.amount)}</td>
                                  <td className="px-4 py-4">
                                    <Badge variant="default" className={badgeClass}>
                                      {item.action === "approved" ? "✓ APPROVED" : "✗ REJECTED"}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-4 text-xs text-slate-400">
                                    <div>{formattedDate}</div>
                                    <div className="text-slate-500">{formattedTime}</div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
