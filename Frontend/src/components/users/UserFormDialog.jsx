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
import { Textarea } from "@/components/ui/textarea"

export default function UserFormDialog({
  isOpen,
  onOpenChange,
  isEdit = false,
  form,
  onFormChange,
  onSubmit,
  isLoading = false,
}) {
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
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <select
              value={form.role}
              onChange={(e) => onFormChange("role", e.target.value)}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
            >
              <option value="ADMIN">Admin</option>
              <option value="PARTICIPANT">Participant</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              value={form.status}
              onChange={(e) => onFormChange("status", e.target.value)}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea
            value={form.bio}
            onChange={(e) => onFormChange("bio", e.target.value)}
            className="bg-slate-950 border-slate-700 min-h-20"
            autoComplete="off"
            placeholder="Enter user bio (optional)"
          />
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
