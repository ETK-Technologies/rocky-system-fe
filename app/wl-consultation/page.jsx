import WeightLossConsultationQuiz from "@/components/WeightQuestionnaire/WeightConsultationQuiz";
import { cookies } from "next/headers";
import {
  getPhoneFromCookies,
  getUserNameFromCookies,
  getUserEmailFromCookies,
  getProvinceFromCookies,
  getCookieValue,
} from "@/services/userDataService";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export default async function WeightConsultationPage() {
  const cookieStore = await cookies();
  const pn = getPhoneFromCookies(cookieStore)?.value;
  const userName = getUserNameFromCookies(cookieStore)?.value;
  const userEmail = getUserEmailFromCookies(cookieStore)?.value;
  const province = getProvinceFromCookies(cookieStore)?.value;
  const dob = getCookieValue(cookieStore, "dob") || getCookieValue(cookieStore, "DOB");

  return (
    <main className="min-h-screen">
      <WeightLossConsultationQuiz
        pn={pn}
        userName={userName}
        userEmail={userEmail}
        province={province}
        dob={dob}
      />
    </main>
  );
}
