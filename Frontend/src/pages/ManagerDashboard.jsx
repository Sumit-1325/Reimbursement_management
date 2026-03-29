import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import SideNavbar from "@/components/layout/SideNavbar";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";
import { useUser } from "@/context/UserContext";
import { managerApi } from "@/api/managerApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [approvals, setApprovals] = useState([]);
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

  useEffect(() => {
    loadApprovals();
  }, []);

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
              <p className="text-slate-400 mt-1">Approvals to review</p>
            </div>

            <Card className="bg-slate-900/80 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Approvals to review</CardTitle>
                <CardDescription className="text-slate-300">
                  Employee manager must approve first. Other managers only see requests after that.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-slate-300">Loading approvals...</p>
                ) : approvals.length === 0 ? (
                  <p className="text-slate-400">No approvals available to review.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-900/80 text-slate-200">
                        <tr>
                          <th className="px-3 py-3 border-b border-slate-800">Approval Subject</th>
                          <th className="px-3 py-3 border-b border-slate-800">Request Owner</th>
                          <th className="px-3 py-3 border-b border-slate-800">Category</th>
                          <th className="px-3 py-3 border-b border-slate-800">Request Status</th>
                          <th className="px-3 py-3 border-b border-slate-800">Total amount (company currency)</th>
                          <th className="px-3 py-3 border-b border-slate-800">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvals.map((approval) => {
                          const isDone = approval.requestStatus === "APPROVED" || approval.requestStatus === "REJECTED";
                          const isBusy = actingExpenseId === approval.expenseId;

                          return (
                            <tr key={approval.approvalRequestId} className="text-slate-200">
                              <td className="px-3 py-3 border-b border-slate-800">{approval.subject || "none"}</td>
                              <td className="px-3 py-3 border-b border-slate-800">{approval.requestOwner}</td>
                              <td className="px-3 py-3 border-b border-slate-800">{String(approval.category || "OTHER").replaceAll("_", " ")}</td>
                              <td className="px-3 py-3 border-b border-slate-800">{approval.requestStatus}</td>
                              <td className="px-3 py-3 border-b border-slate-800">{formatAmount(approval.amountInBaseCurrency)}</td>
                              <td className="px-3 py-3 border-b border-slate-800">
                                {isDone ? (
                                  <span className="text-slate-400">Action completed</span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      className="bg-emerald-600 text-white hover:bg-emerald-500"
                                      disabled={isBusy}
                                      onClick={() => handleAction(approval, "APPROVED")}
                                    >
                                      {isBusy ? "Working..." : "Approve"}
                                    </Button>
                                    <Button
                                      type="button"
                                      className="bg-red-600 text-white hover:bg-red-500"
                                      disabled={isBusy}
                                      onClick={() => handleAction(approval, "REJECTED")}
                                    >
                                      {isBusy ? "Working..." : "Reject"}
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
          </div>
        </main>
      </div>
    </div>
  );
}
