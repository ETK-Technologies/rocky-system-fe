import ResetPassword from "@/components/LoginRegisterPage/ResetPassword";
import { Suspense } from "react";

export default async function ResetPasswordPage({ params }) {
  const { token } = await params;

  return (
    <Suspense fallback={<></>}>
      <ResetPassword token={token} />
    </Suspense>
  );
}
