"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { toast } = useToast();
  const { loginWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      toast({
        title: "ログイン成功",
        description: "ようこそ",
      });
    } catch (error) {
      console.error("Google login error", error);
      toast({
        title: "ログインに失敗しました",
        description: "時間をおいて再度お試しください",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">イベント販売集計システム</CardTitle>
          <CardDescription>Googleアカウントでログインしてください</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGoogleSignIn}
            className="w-full"
            size="lg"
            data-testid="button-google-login"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Googleでログイン
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-4">
            アカウントが無い場合は自動的に作成されます
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

