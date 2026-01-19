import { Suspense } from "react";
import { notFound } from "next/navigation";
import QuizLoading from "@/components/Quiz/QuizLoading";
import QuizClient from "./QuizClient";

// Enable ISR - Revalidate every 60 seconds
export const revalidate = 60;

// Dynamic params handling
export const dynamicParams = true;

// Generate static paths at build time for known quizzes
export async function generateStaticParams() {
  // Static list of known quiz slugs for build-time generation
  const quizzes = [
    { slug: "ed-pre-consultation" },
    { slug: "hair-pre-consultation-quiz" },
    { slug: "wl-pre-consultation" },
    { slug: "wlprecons" },
    { slug: "wl-consultation-v1" },
    { slug: "ed-consultation" },
    { slug: "hair-consultation" },
  ];

  console.log(`Generating static params for ${quizzes.length} quizzes`);
  
  return quizzes.map((quiz) => ({
    slug: quiz.slug,
  }));
}

// Server Component - Fetches quiz data on server
export default async function QuizPage({ params }) {
  // Await params as it's a Promise in Next.js 15+
  const { slug } = await params;

  try {
    // Fetch directly from backend on server-side
    const apiUrl = process.env.BASE_URL || "https://rocky-be-production.up.railway.app";
    const backendUrl = `${apiUrl}/api/v1/runtime/quizzes/${slug}`;
    
    // Get the origin for the request - use the correct whitelisted domain
    const origin = process.env.NEXT_PUBLIC_SITE_URL 
      || process.env.SITE_URL 
      || process.env.NEXT_PUBLIC_APP_URL
      || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://www.myrocky.com");
    
    console.log(`[QuizPage] Fetching quiz runtime data for slug: ${slug} from ${backendUrl} with origin: ${origin}`);
    
    // Fetch quiz runtime data on the server with ISR caching
    const quizResponse = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "Origin": origin,
      },
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    if (!quizResponse.ok) {
      const errorText = await quizResponse.text();
      console.error(`Failed to fetch quiz: ${slug} (${quizResponse.status}) - ${errorText}`);
      notFound();
    }

    const quizData = await quizResponse.json();

    if (!quizData) {
      console.error("Invalid quiz data received");
      notFound();
    }

    // Pass pre-fetched quiz data to client component
    return (
      <Suspense fallback={<QuizLoading />}>
        <QuizClient initialQuizData={quizData} slug={slug} />
      </Suspense>
    );
  } catch (error) {
    console.error("Error loading quiz:", error);
    notFound();
  }
}
