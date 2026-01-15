import HairConsultation from "@/components/HairQuestionnaire/HairConsultationQuiz";
import { cookies } from "next/headers";
import {
  getPhoneFromCookies,
  getUserNameFromCookies,
  getUserEmailFromCookies,
  getProvinceFromCookies,
  getCookieValue,
} from "@/services/userDataService";

export default async function HairConsultationPage() {
  const cookieStore = await cookies();
  const pn = getPhoneFromCookies(cookieStore)?.value;
  const userName = getUserNameFromCookies(cookieStore)?.value;
  const userEmail = getUserEmailFromCookies(cookieStore)?.value;
  const province = getProvinceFromCookies(cookieStore)?.value;
  const dob = getCookieValue(cookieStore, "dob") || getCookieValue(cookieStore, "DOB");

  return (
    <main className="min-h-screen">
      <HairConsultation
        pn={pn}
        userName={userName}
        userEmail={userEmail}
        province={province}
        dob={dob}
      />
    </main>
  );
}
