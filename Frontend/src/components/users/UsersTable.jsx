import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronDownIcon, SquarePenIcon, UserXIcon, Trash2Icon } from "lucide-react"

function roleBadgeClass(role) {
  if (role === "Admin") {
    return "bg-purple-500/20 text-purple-300 border-purple-400/40"
  }
  if (role === "Manager") {
    return "bg-blue-500/20 text-blue-300 border-blue-400/40"
  }
  return "bg-slate-700/40 text-slate-200 border-slate-500/40"
}

function statusBadgeClass(status) {
  if (status === "Active") {
    return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
  }
  if (status === "Pending") {
    return "bg-amber-500/20 text-amber-300 border-amber-400/40"
  }
  return "bg-rose-500/20 text-rose-300 border-rose-400/40"
}

export default function UsersTable({ users, onEdit, onSuspend, onDelete }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800/70 bg-slate-900/70">
      <Table>
        <TableHeader className="bg-slate-900/90">
          <TableRow className="border-slate-800/70 hover:bg-transparent">
            <TableHead className="px-4 py-3 text-slate-300">Name</TableHead>
            <TableHead className="px-4 py-3 text-slate-300">Email</TableHead>
            <TableHead className="px-4 py-3 text-slate-300">Role</TableHead>
            <TableHead className="px-4 py-3 text-slate-300">Manager</TableHead>
            <TableHead className="px-4 py-3 text-slate-300">Status</TableHead>
            <TableHead className="px-4 py-3 text-right text-slate-300">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow className="border-slate-800/70">
              <TableCell colSpan={6} className="py-12 text-center text-slate-400">
                No users match your search.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id} className="border-slate-800/70 hover:bg-slate-800/40">
                <TableCell className="px-4 py-3 font-medium text-slate-100">{user.name}</TableCell>
                <TableCell className="px-4 py-3 text-slate-300">{user.email}</TableCell>
                <TableCell className="px-4 py-3">
                  <Badge variant="outline" className={roleBadgeClass(user.role)}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3 text-slate-300">{user.managerName || "-"}</TableCell>
                <TableCell className="px-4 py-3">
                  <Badge variant="outline" className={statusBadgeClass(user.status)}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                      >
                        Actions
                        <ChevronDownIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 bg-slate-900 border-slate-700 text-slate-100">
                      <DropdownMenuItem onSelect={() => onEdit(user)} className="cursor-pointer focus:bg-slate-800">
                        <SquarePenIcon className="size-4" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onSuspend(user)} className="cursor-pointer focus:bg-slate-800">
                        <UserXIcon className="size-4" />
                        {user.status === "Suspended" ? "Reactivate User" : "Suspend User"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => onDelete(user)}
                        className="cursor-pointer focus:bg-rose-500/15"
                      >
                        <Trash2Icon className="size-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
