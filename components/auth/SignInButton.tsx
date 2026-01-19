"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";

export function SignInButton() {
  return (
    <Button
      onClick={() => signIn("google", { callbackUrl: "/" })}
      variant="outline"
      className="w-full"
    >
      <FcGoogle className="mr-2 h-5 w-5" />
      Google로 로그인
    </Button>
  );
}
