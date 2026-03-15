import { Outlet, Link, useLocation } from "react-router";
import { Home, Library, User, MessageCircle } from "lucide-react";

export function Layout() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-background">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-card border-t border-border/50">
        <div className="flex items-center justify-around px-6 py-3">
          <Link 
            to="/" 
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive("/") 
                ? "text-primary" 
                : "text-muted-foreground"
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs">Home</span>
          </Link>
          
          <Link 
            to="/library" 
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive("/library") 
                ? "text-primary" 
                : "text-muted-foreground"
            }`}
          >
            <Library className="w-6 h-6" />
            <span className="text-xs">Library</span>
          </Link>
          
          
          <Link 
            to="/chat" 
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive("/chat") 
                ? "text-primary" 
                : "text-muted-foreground"
            }`}
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs">Chat</span>
          </Link>

          <Link 
            to="/profile" 
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive("/profile") 
                ? "text-primary" 
                : "text-muted-foreground"
            }`}
          >
            <User className="w-6 h-6" />
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}