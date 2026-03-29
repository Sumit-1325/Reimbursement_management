import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function UserFormDialog({
  isOpen,
  onOpenChange,
  isEdit = false,
  form,
  managers = [],
  onFormChange,
  onSubmit,
  isLoading = false,
}) {
  const isEmployeeRole = String(form.role || "").toUpperCase() === "EMPLOYEE"
  const isManagerRole = String(form.role || "").toUpperCase() === "MANAGER"

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-slate-900 border border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {isEdit ? "Update account details for this user." : "Create a new user from admin panel."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input
              value={form.firstName}
              onChange={(e) => onFormChange("firstName", e.target.value)}
              className="bg-slate-950 border-slate-700"
              autoComplete="off"
              placeholder="Enter first name"
            />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input
              value={form.lastName}
              onChange={(e) => onFormChange("lastName", e.target.value)}
              className="bg-slate-950 border-slate-700"
              autoComplete="off"
              placeholder="Enter last name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => onFormChange("email", e.target.value)}
            className="bg-slate-950 border-slate-700"
            autoComplete="off"
            placeholder={isEdit ? "" : "Enter email address"}
          />
        </div>

        {!isEdit && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => onFormChange("password", e.target.value)}
                className="bg-slate-950 border-slate-700"
                autoComplete="new-password"
                placeholder="Enter password (min. 6 characters)"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={form.confirmPassword || ""}
                onChange={(e) => onFormChange("confirmPassword", e.target.value)}
                className="bg-slate-950 border-slate-700"
                autoComplete="new-password"
                placeholder="Confirm password"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <select
              value={form.role}
              onChange={(e) => onFormChange("role", e.target.value)}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
            >
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Designation</Label>
            {isEmployeeRole ? (
              <Input
                value="EMPLOYEE"
                disabled
                className="bg-slate-950 border-slate-700"
              />
            ) : (
              <select
                value={form.designation}
                onChange={(e) => onFormChange("designation", e.target.value)}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
              >
                {isManagerRole && <option value="MANAGER">Manager</option>}
                <option value="FINANCE">Finance</option>
                <option value="DIRECTOR">Director</option>
                <option value="CFO">CFO</option>
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Department</Label>
            <Input
              value={form.department}
              onChange={(e) => onFormChange("department", e.target.value)}
              className="bg-slate-950 border-slate-700"
              autoComplete="off"
              placeholder="Department (optional)"
            />
          </div>
          {isEmployeeRole ? (
            <div className="space-y-2">
              <Label>Manager</Label>
              <select
                value={form.managerId || ""}
                onChange={(e) => onFormChange("managerId", e.target.value)}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
              >
                <option value="">Select manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {`${manager.firstName || ""} ${manager.lastName || ""}`.trim() || manager.email}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div />
          )}
        </div>

        <DialogFooter className="bg-transparent border-t border-slate-700 pt-6 px-6 py-4 gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-slate-700 px-6 py-2 min-w-24 text-base"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-500 px-6 py-2 min-w-24 text-base"
          >
            {isLoading ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save Changes" : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
