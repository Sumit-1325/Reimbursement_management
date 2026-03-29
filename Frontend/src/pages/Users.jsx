import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FiUserPlus, FiUsers } from "react-icons/fi"
import Navbar from "@/components/layout/Navbar"
import SideNavbar from "@/components/layout/SideNavbar"
import PageBreadcrumb from "@/components/layout/PageBreadcrumb"
import UsersSearchBar from "@/components/users/UsersSearchBar"
import UsersTable from "@/components/users/UsersTable"
import UserFormDialog from "@/components/users/UserFormDialog"
import { useUser } from "@/context/UserContext"

export default function UsersPage() {
  const { user } = useUser()
  const [search, setSearch] = useState("")
  const [users, setUsers] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState(null) // "add" or "edit"
  const [isLoading, setIsLoading] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "PARTICIPANT",
    status: "ACTIVE",
    bio: "",
  })

  const transformUsers = (rawUsers) =>
    rawUsers.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName || ""}`.trim(),
      email: u.email,
      role: u.role === "ADMIN" ? "Admin" : "Participant",
      status:
        u.status === "ACTIVE"
          ? "Active"
          : u.status === "SUSPENDED"
            ? "Suspended"
            : u.status === "INACTIVE"
              ? "Inactive"
              : u.status === "BANNED"
                ? "Banned"
                : "Pending",
      avatar: u.avatar,
      ...u,
    }))

  // Fetch users from backend (full list when search is empty, search endpoint otherwise)
  useEffect(() => {
    const delay = setTimeout(async () => {
      try {
        setLoading(true)

        const query = search.trim()
        const response = query
          ? await adminApi.searchUsers(query, 1, 100)
          : await adminApi.getAllUsers(1, 100)

        if (response.success) {
          setUsers(transformUsers(response.data.users))
          setTotalUsers(response.data.pagination?.total || response.data.users.length)
          setError(null)
        } else {
          throw new Error(response.message || "Failed to fetch users")
        }
      } catch (err) {
        console.error("Error fetching users:", err)
        setError(err.message)
        toast.error("Failed to load users", {
          description: err.message,
        })
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => clearTimeout(delay)
  }, [search])

  const handleOpenAddModal = () => {
    setModalMode("add")
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "PARTICIPANT",
      status: "ACTIVE",
      bio: "",
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (user) => {
    setModalMode("edit")
    setEditingUserId(user.id)
    setForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      password: "", // Not used in edit mode
      role: user.role || "PARTICIPANT",
      status: user.status || "ACTIVE",
      bio: user.bio || "",
    })
    setIsModalOpen(true)
  }

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)

      if (modalMode === "add") {
        // Validation for add mode
        if (!form.firstName.trim()) {
          toast.error("Validation Error", {
            description: "First name is required.",
          })
          return
        }

        if (!form.email.trim()) {
          toast.error("Validation Error", {
            description: "Email is required.",
          })
          return
        }

        if (!form.password.trim()) {
          toast.error("Validation Error", {
            description: "Password is required.",
          })
          return
        }

        if (form.password.trim().length < 6) {
          toast.error("Validation Error", {
            description: "Password must be at least 6 characters.",
          })
          return
        }

        const payload = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim() || null,
          email: form.email.trim(),
          password: form.password.trim(),
          role: form.role,
          status: form.status,
          bio: form.bio.trim() || null,
        }

        const response = await adminApi.createUser(payload)
        const createdUser = response?.data?.user

        if (!createdUser) {
          throw new Error("Created user data missing in response")
        }

        const normalizedNewUser = transformUsers([createdUser])[0]
        setUsers((prev) => [normalizedNewUser, ...prev])
        setTotalUsers((prev) => prev + 1)

        setIsModalOpen(false)

        toast.success("User added", {
          description: "New user has been created successfully.",
        })
      } else if (modalMode === "edit") {
        // Edit mode handler
        if (!editingUserId) return

        const payload = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          role: form.role,
          status: form.status,
          bio: form.bio.trim(),
        }

        const response = await adminApi.updateUser(editingUserId, payload)
        const updated = response?.data?.user

        if (!updated) {
          throw new Error("Updated user data missing in response")
        }

        const normalizedUpdatedUser = transformUsers([updated])[0]

        setUsers((prev) => prev.map((item) => (item.id === updated.id ? normalizedUpdatedUser : item)))
        setIsModalOpen(false)
        toast.success("User updated successfully")
      }
    } catch (err) {
      console.error("User operation error:", err)
      toast.error(modalMode === "add" ? "Failed to add user" : "Failed to update user", {
        description: err.response?.data?.message || err.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (user) => {
    handleOpenEditModal(user)
  }

  const handleSuspend = (user) => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === user.id
          ? { ...item, status: item.status === "Suspended" ? "Active" : "Suspended" }
          : item
      )
    )

    toast.success(
      user.status === "Suspended" ? `${user.name} reactivated` : `${user.name} suspended`
    )
  }

  const handleDelete = (user) => {
    toast.warning("Delete User", {
      description: `This will permanently remove ${user.name} from the system. This action cannot be undone.`,
      duration: Infinity,
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const response = await adminApi.deleteUser(user.id)
            
            if (response.success) {
              setUsers((prev) => prev.filter((item) => item.id !== user.id))
              setTotalUsers((prev) => prev - 1)
              toast.success(`${user.name} deleted successfully`)
            } else {
              throw new Error(response.message || "Failed to delete user")
            }
          } catch (err) {
            console.error("Delete user error:", err)
            toast.error("Failed to delete user", {
              description: err.response?.data?.message || err.message,
            })
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
    })
  }

  return (
    <div className="flex h-screen bg-slate-950">
      <SideNavbar hideUsers={user?.role !== 'ADMIN'} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar hideUsers={user?.role !== 'ADMIN'} />

        <main className="relative flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-6">
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 opacity-20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-purple-500/10 opacity-20 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-7xl space-y-6">
            <PageBreadcrumb
              items={[{ label: "Home", to: "/dashboard" }]}
              current="User Management"
            />

            <Card variant="professional" className="border-l-4 border-l-blue-600 bg-slate-900/80 border border-slate-800/70 backdrop-blur-sm">
              <CardHeader className="border-slate-800/70">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <FiUsers className="h-5 w-5" />
                      User Management
                    </CardTitle>
                    <CardDescription className="text-slate-400 mt-2">
                      Search, review, and manage user accounts from a centralized admin table.
                    </CardDescription>
                  </div>

                  <Button
                    onClick={handleOpenAddModal}
                    className="gap-2 bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <FiUserPlus className="h-4 w-4" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                      <p className="text-slate-400">Loading users...</p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {error && !loading && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                    <p className="text-red-400">
                      ⚠️ Failed to load users: {error}
                    </p>
                  </div>
                )}

                {/* Content - Show only when loaded */}
                {!loading && !error && (
                  <>
                    <UsersSearchBar value={search} onChange={setSearch} total={totalUsers} />
                    <UsersTable
                      users={users}
                      onEdit={handleEdit}
                      onSuspend={handleSuspend}
                      onDelete={handleDelete}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <UserFormDialog
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        isEdit={modalMode === "edit"}
        form={form}
        onFormChange={handleFormChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
