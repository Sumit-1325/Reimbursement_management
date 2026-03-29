import { Input } from "@/components/ui/input"
import { FiSearch } from "react-icons/fi"

export default function UsersSearchBar({ value, onChange, total }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-md">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search by name, email, role, or status"
          className="pl-10"
        />
      </div>
      <p className="text-sm text-slate-400">
        Showing <span className="font-semibold text-slate-200">{total}</span> users
      </p>
    </div>
  )
}
