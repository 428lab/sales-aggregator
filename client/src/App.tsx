import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import AppSidebar from "@/components/AppSidebar";
import LoginPage from "@/components/LoginPage";
import ItemManagementPage from "@/pages/ItemManagementPage";
import SalesChannelPage from "@/pages/SalesChannelPage";
import SalesInputPage from "@/pages/SalesInputPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import NotFound from "@/pages/not-found";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function Router() {
  return (
    <Switch>
      <Route path="/items" component={ItemManagementPage} />
      <Route path="/channels" component={SalesChannelPage} />
      <Route path="/sales" component={SalesInputPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/" component={ItemManagementPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  //todo: Replace with real Firebase authentication using onAuthStateChanged
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName] = useState("ユーザー"); //todo: Get from Firebase user.displayName
  const { toast } = useToast();

  const handleLogin = () => {
    //todo: Remove this mock login handler when Firebase is integrated
    console.log("Mock login");
    setIsLoggedIn(true);
  };

  const handleSignOut = () => {
    //todo: Replace with real Firebase signOut(auth)
    console.log("Mock logout");
    setIsLoggedIn(false);
    toast({
      title: "ログアウトしました",
      description: "またのご利用をお待ちしております",
    });
  };

  const style = {
    "--sidebar-width": "16rem",
  };

  if (!isLoggedIn) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LoginPage onLogin={handleLogin} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    {userName}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSignOut}
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    ログアウト
                  </Button>
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
