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
    // Use absolute URL for server-side fetching
    const baseUrl = "https://rocky-be-production.up.railway.app";
    
    // Fetch quiz runtime data on the server with ISR caching
    const quizResponse = await fetch(
      `${baseUrl}/api/quizzes/runtime/${slug}`,
      {
        next: { revalidate: 60 }, // Revalidate every 60 seconds
      }
    );

    if (!quizResponse.ok) {
      console.error(`Failed to fetch quiz: ${slug} (${quizResponse.status})`);
      notFound();
    }

    const quizResult = await quizResponse.json();

    if (!quizResult.success || !quizResult.data) {
      console.error("Invalid quiz data received");
      notFound();
    }

    const quizData = quizResult.data;

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
