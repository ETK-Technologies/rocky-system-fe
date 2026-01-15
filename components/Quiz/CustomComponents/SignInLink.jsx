import Link from "next/link";

export default function SignInLink({quizSlug}) {
    var returnUrl = quizSlug ? `?redirect_to=/quiz/${quizSlug}` : '';
  return (
    <>
      <div className="text-center mt-6">
        <p className="text-sm font-normal">
          Already have an account?{" "}
          <Link
            href={`/login-register?viewshow=login${returnUrl}`}
            className="font-[400] text-[#C19A6B] underline ml-1"
          >
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
