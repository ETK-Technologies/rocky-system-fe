import EDConsultationQuiz from "@/components/EdQuestionnaire/EDConsultationQuiz";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import {
  getPhoneFromCookies,
  getUserNameFromCookies,
  getUserEmailFromCookies,
  getProvinceFromCookies,
  getCookieValue,
} from "@/services/userDataService";

export default async function EDConsultationQuizPage() {
  const cookieStore = await cookies();
  const pn = getPhoneFromCookies(cookieStore)?.value;
  const userName = getUserNameFromCookies(cookieStore)?.value;
  const userEmail = getUserEmailFromCookies(cookieStore)?.value;
  const province = getProvinceFromCookies(cookieStore)?.value;
  const dosageRaw = getCookieValue(cookieStore, "dosages");
  const dob = getCookieValue(cookieStore, "dob") || getCookieValue(cookieStore, "DOB");
  let dosage = null;
  if (dosageRaw) {
    try {
      const dosageObj = JSON.parse(decodeURIComponent(dosageRaw));
      if (typeof dosageObj === "object" && dosageObj !== null) {
        dosage = Object.values(dosageObj)[0];
      } else {
        dosage = dosageObj;
      }
    } catch (error) {
      logger.error("Error parsing dosage cookie:", error);
      dosage = null;
    }
  }
  return (
    <main className="min-h-screen">
      <EDConsultationQuiz
        pn={pn}
        userName={userName}
        userEmail={userEmail}
        province={province}
        dosage={dosage}
        dob={dob}
      />
    </main>
  );
}
