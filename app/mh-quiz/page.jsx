import MentalHealthQuestionnaire from "@/components/MentalHealthQuestionnaire/MentalHealthQuestionnaire";
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

export default async function MHConsultationPage() {
  const cookieStore = await cookies();
  const pn = getPhoneFromCookies(cookieStore)?.value;
  const userName = getUserNameFromCookies(cookieStore)?.value;
  const userEmail = getUserEmailFromCookies(cookieStore)?.value;
  const province = getProvinceFromCookies(cookieStore)?.value;

  return (
    <main className="min-h-screen">
      <MentalHealthQuestionnaire
        pn={pn}
        userName={userName}
        userEmail={userEmail}
        province={province}
        dob={getCookieValue(cookieStore, "dob") || getCookieValue(cookieStore, "DOB")}
      />
    </main>
  );
}
