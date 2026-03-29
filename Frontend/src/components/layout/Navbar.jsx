import { useEffect, useState, memo } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  NavigationMenu, 
  NavigationMenuItem, 
  NavigationMenuLink, 
  NavigationMenuList, 
  navigationMenuTriggerStyle 
} from "@/components/ui/navigation-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { FiMenu, FiX, FiHome, FiUsers, FiBarChart2, FiSettings, FiLogOut, FiUser } from "react-icons/fi"
import { useUser } from "@/context/UserContext"
import { authApi } from "@/api/authApi"

function Navbar({ hideUsers = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [cachedAvatar, setCachedAvatar] = useState("")
  const [isAvatarReady, setIsAvatarReady] = useState(false)
  const { user, loading, logout } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.avatar) {
      setCachedAvatar(user.avatar)
    }
  }, [user?.avatar])

  const avatarSrc = user?.avatar || cachedAvatar || undefined

  useEffect(() => {
    if (loading) {
      setIsAvatarReady(false)
      return
    }

    if (!avatarSrc) {
      setIsAvatarReady(true)
      return
    }

    let isCancelled = false
    const img = new Image()

    img.onload = () => {
      if (!isCancelled) setIsAvatarReady(true)
    }

    img.onerror = () => {
      if (!isCancelled) setIsAvatarReady(true)
    }

    img.src = avatarSrc

    return () => {
      isCancelled = true
    }
  }, [loading, avatarSrc])

  const handleLogout = () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    // Optimistic logout for instant UX.
    logout()
    navigate("/login", { replace: true })

    // Best-effort server logout in background.
    authApi.logout().catch((err) => {
      console.error("Logout API error:", err)
    })
  }

  const getInitials = () => {
    if (!user) return "U"
    return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
  }

  if (loading || !isAvatarReady) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950 border-b border-purple-500/20 backdrop-blur-md shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo Section */}
          <button
            onClick={() => {
              navigate("/dashboard")
            }}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg">Management</p>
              <p className="text-purple-400 text-xs font-semibold">System</p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavigationMenu>
              <NavigationMenuList className="gap-2">
                <NavigationMenuItem>
                  <button 
                    onClick={() => {
                      navigate("/dashboard")
                    }}
                    className={`${navigationMenuTriggerStyle()} text-white hover:text-purple-400 transition-colors gap-2 flex items-center cursor-pointer`}
                  >
                    <FiHome className="w-4 h-4" />
                    Dashboard
                  </button>
                </NavigationMenuItem>
                {!hideUsers && (
                  <NavigationMenuItem>
                    <button 
                      className={`${navigationMenuTriggerStyle()} text-white hover:text-purple-400 transition-colors gap-2 flex items-center cursor-pointer opacity-50`}
                      disabled
                    >
                      <FiUsers className="w-4 h-4" />
                      Users
                    </button>
                  </NavigationMenuItem>
                )}
                <NavigationMenuItem>
                  <button 
                    className={`${navigationMenuTriggerStyle()} text-white hover:text-purple-400 transition-colors gap-2 flex items-center cursor-pointer opacity-50`}
                    disabled
                  >
                    <FiBarChart2 className="w-4 h-4" />
                    Analytics
                  </button>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <button 
                    className={`${navigationMenuTriggerStyle()} text-white hover:text-purple-400 transition-colors gap-2 flex items-center cursor-pointer opacity-50`}
                    disabled
                  >
                    <FiSettings className="w-4 h-4" />
                    Settings
                  </button>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </nav>

          {/* Right Side: Avatar + Dropdown Menu */}
          <div className="flex items-center gap-4">
            {/* Desktop My Profile Button */}
            <div className="hidden md:block">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  navigate("/dashboard")
                }}
                className="gap-2 text-purple-400 hover:text-purple-300 hover:bg-purple-600/10 border-purple-600/30 hover:border-purple-600/50"
              >
                <FiUser className="w-4 h-4" />
                Dashboard
              </Button>
            </div>

            {/* Desktop Logout Button */}
            <div className="hidden md:block">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-600/10 border-red-600/30 hover:border-red-600/50"
              >
                <FiLogOut className="w-4 h-4" />
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </Button>
            </div>

            {/* Desktop User Menu */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Avatar className="h-9 w-9 border-2 border-purple-600 cursor-pointer hover:border-purple-400 transition-all">
                      <AvatarImage src={avatarSrc} alt="Profile" />
                      <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">
                        {user ? `${user.firstName} ${user.lastName}` : loading ? "Loading..." : "Guest"}
                      </p>
                      <p className="text-xs text-purple-400">{user?.role || "---"}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-purple-500/30">
                  <DropdownMenuItem
                    onSelect={() => {
                      navigate("/dashboard")
                    }}
                    className="text-white hover:bg-purple-600/20 cursor-pointer"
                  >
                    <FiHome className="w-4 h-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={isLoggingOut ? undefined : handleLogout}
                    disabled={isLoggingOut}
                    className="text-red-400 hover:bg-red-600/20 cursor-pointer"
                  >
                    <FiLogOut className="w-4 h-4 mr-2" />
                    {isLoggingOut ? "Logging out..." : "Log Out"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-purple-500/20" />
                  <DropdownMenuItem className="text-white hover:bg-purple-600/20 cursor-pointer">
                    <FiSettings className="w-4 h-4 mr-2" />
                    Account Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Menu Trigger */}
            <div className="lg:hidden">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-white hover:bg-purple-600/20 hover:text-purple-400"
                  >
                    <FiMenu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="right"
                  className="bg-gradient-to-b from-slate-950 to-blue-950 border-purple-500/20"
                >
                  <div className="flex flex-col gap-6 mt-8">
                    <h2 className="text-white font-bold text-lg">Menu</h2>
                    <Button 
                      className="gap-2 text-purple-400 hover:text-purple-300 hover:bg-purple-600/20 border-purple-600/30 hover:border-purple-600/50 justify-start"
                      variant="outline"
                      onClick={() => {
                        navigate("/dashboard")
                        setIsOpen(false)
                      }}
                    >
                      <FiUser className="w-4 h-4" />
                      Dashboard
                    </Button>
                    
                    {/* Mobile Navigation Links */}
                    <nav className="flex flex-col gap-3">
                      <button 
                        onClick={() => {
                          navigate("/dashboard")
                          setIsOpen(false)
                        }}
                        className="text-white hover:text-purple-400 transition-colors font-medium flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-purple-600/10"
                      >
                        <FiHome className="w-5 h-5" />
                        Dashboard
                      </button>
                      {!hideUsers && (
                        <button 
                          disabled
                          className="text-white hover:text-purple-400 transition-colors font-medium flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-purple-600/10 opacity-50"
                        >
                          <FiUsers className="w-5 h-5" />
                          Users
                        </button>
                      )}
                      <button 
                        disabled
                        className="text-white hover:text-purple-400 transition-colors font-medium flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-purple-600/10 opacity-50"
                      >
                        <FiBarChart2 className="w-5 h-5" />
                        Analytics
                      </button>
                      <button 
                        disabled
                        className="text-white hover:text-purple-400 transition-colors font-medium flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-purple-600/10 opacity-50"
                      >
                        <FiSettings className="w-5 h-5" />
                        Settings
                      </button>
                    </nav>

                    {/* Mobile User Section */}
                    <div className="border-t border-purple-500/20 pt-4 mt-4">
                      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-purple-600/10">
                        <Avatar className="h-10 w-10 border-2 border-purple-600">
                          <AvatarImage src={avatarSrc} alt="Profile" />
                          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                            {getInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
                          </p>
                          <p className="text-xs text-purple-400">{user?.role}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          navigate("/dashboard")
                          setIsOpen(false)
                        }}
                        className="text-white hover:text-purple-400 transition-colors font-medium flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-purple-600/10 mb-2"
                      >
                        <FiHome className="w-5 h-5" />
                        Dashboard
                      </button>
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full text-red-400 hover:text-red-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-red-600/10"
                      >
                        <FiLogOut className="w-5 h-5" />
                        {isLoggingOut ? "Logging out..." : "Log Out"}
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-px bg-gradient-to-r from-purple-600/0 via-purple-600/50 to-purple-600/0"></div>
    </header>
  )
}

export default memo(Navbar)
