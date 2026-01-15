import ZonnicConsultationQuiz from "@/components/ZonnicQuestionnaire/ZonicQuestionnaire";
import { cookies } from "next/headers";
import {
  getPhoneFromCookies,
  getDisplayNameFromCookies,
  getLastNameFromCookies,
  getUserEmailFromCookies,
  getProvinceFromCookies,
  getCookieValue,
} from "@/services/userDataService";

export default async function ZonnicConsultationPage() {
  const cookieStore = await cookies();
  const phone = getPhoneFromCookies(cookieStore)?.value;
  const displayName = getDisplayNameFromCookies(cookieStore)?.value;
  const lastName = getLastNameFromCookies(cookieStore)?.value;
  const userEmail = getUserEmailFromCookies(cookieStore)?.value;
  const DOB = getCookieValue(cookieStore, "dob") || getCookieValue(cookieStore, "DOB");
  const province = getProvinceFromCookies(cookieStore)?.value;

  return (
    <main className="min-h-screen">
      <ZonnicConsultationQuiz
        phone={phone}
        firstName={displayName}
        lastName={lastName}
        userEmail={userEmail}
        dob={DOB}
        province={province}
      />
    </main>
  );
}
