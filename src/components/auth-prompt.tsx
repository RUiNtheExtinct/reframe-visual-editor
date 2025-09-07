"use client";

import { LockIcon, LogInIcon, UserPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export const AuthPrompt = ({
  showAuthPrompt,
  setShowAuthPrompt,
}: {
  showAuthPrompt: boolean;
  setShowAuthPrompt: (show: boolean) => void;
}) => {
  const router = useRouter();
  return (
    <Dialog open={showAuthPrompt} onOpenChange={setShowAuthPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LockIcon className="size-5" />
          </div>
          <DialogTitle>Sign in to save</DialogTitle>
          <DialogDescription>
            You need an account to save changes. Sign in or create one now.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setShowAuthPrompt(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const callbackUrl =
                typeof window !== "undefined"
                  ? `${window.location.pathname}${window.location.search}`
                  : "/";
              router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
            }}
            className="cursor-pointer"
          >
            <LogInIcon className="mr-1.5" />
            Sign in
          </Button>
          <Button
            onClick={() => {
              const callbackUrl =
                typeof window !== "undefined"
                  ? `${window.location.pathname}${window.location.search}`
                  : "/";
              router.push(`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`);
            }}
            className="cursor-pointer"
          >
            <UserPlusIcon className="mr-1.5" />
            Create account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
