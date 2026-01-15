import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import { randomBytes } from "crypto";
import https from "https";
import axios from "axios";
import {
  getUserIdFromCookies,
  getCookieValue,
  getDisplayNameFromCookies,
  getLastNameFromCookies,
  getUserEmailFromCookies,
  getPhoneFromCookies,
  getProvinceFromCookies,
} from "@/services/userDataService";

const crmApi = axios.create({
  baseURL: "https://crm.myrocky.com/api",
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  timeout: 60000,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
  },
});

async function getEntrykey() {
  try {
    const cookieStore = await cookies();
    const existingCookie = cookieStore.get("smoking_entrykey");
    return (
      existingCookie?.value || `smokingq-${randomBytes(8).toString("hex")}`
    );
  } catch (error) {
    logger.warn("Cookie reading error:", error);
    return `smokingq-${randomBytes(8).toString("hex")}`;
  }
}

// New helper function to get user ID from cookies
async function getUserId() {
  try {
    const cookieStore = await cookies();
    const userId = getUserIdFromCookies(cookieStore);
    return userId?.value ? parseInt(userId.value) : null;
  } catch (error) {
    logger.warn("Error getting user ID from cookies:", error);
    return null;
  }
}

async function getUserDataFromCookies() {
  try {
    const cookieStore = await cookies();
    const fName = getDisplayNameFromCookies(cookieStore)?.value || "";
    const lName = getLastNameFromCookies(cookieStore)?.value || "";
    const email = getUserEmailFromCookies(cookieStore)?.value
      ? decodeURIComponent(getUserEmailFromCookies(cookieStore).value)
      : "";
    const phone = getPhoneFromCookies(cookieStore)?.value || "";
    const dob = getCookieValue(cookieStore, "DOB") || getCookieValue(cookieStore, "dob") || "";
    const province = getProvinceFromCookies(cookieStore)?.value || "";

    return {
      fName,
      lName,
      email,
      phone,
      dob,
      province,
    };
  } catch (error) {
    logger.warn("Error getting user data from cookies:", error);
    return {
      fName: "",
      lName: "",
      email: "",
      phone: "",
      dob: "",
      province: "",
    };
  }
}

export async function GET() {
  const entrykey = await getEntrykey();

  const data = { message: "Success", entrykey };

  const response = NextResponse.json(data);
  response.cookies.set("smoking_entrykey", entrykey, {
    domain: "myrocky.com",
    path: "/",
    expires: new Date(Date.now() + 1800 * 1000),
    httpOnly: false,
    sameSite: "Lax",
  });

  return response;
}

export async function POST(req) {
  try {
    const entrykey = await getEntrykey();
    const userId = await getUserId();
    const userData = await getUserDataFromCookies();

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      return handleFileUpload(req, entrykey);
    }

    const rawData = await req.json();

    if (Object.keys(rawData).length === 0) {
      return NextResponse.json(
        { error: true, msg: "Blank Data" },
        { status: 400 }
      );
    }
    const data = {
      form: {},
      smoking_entrykey: entrykey,
      timestamp: Math.floor(Date.now() / 1000),
      entry_saved: false,
      form_id: rawData.form_id || 7,
      error: false,
      id: rawData.id || "",
      token: rawData.token || "",
      stage: rawData.stage || "consultation-after-checkout",
      page_step: rawData.page_step || 0,
      completion_state: rawData.completion_state || "Partial",
      completion_percentage: rawData.completion_percentage || 0,
      source_site: rawData.source_site || "https://myrocky.com",
      wp_user_id: userId || "",
      created_by: userId || "",
    };

    if (
      (data.stage === "consultation-after-checkout" ||
        data.stage === "consultation-before-checkout") &&
      !data.id &&
      !data.token
    ) {
      data.id = generateUniqueId();
    }

    const excludedKeys = [
      "form_id",
      "action",
      "smoking_entrykey",
      "id",
      "token",
      "stage",
      "page_step",
      "completion_state",
      "source_site",
    ];

    for (const [key, value] of Object.entries(rawData)) {
      if (
        !excludedKeys.includes(key) &&
        value !== undefined &&
        value !== null
      ) {
        data.form[key] = value;
      }
    }

    if (userData.fName) data.form["130_3"] = userData.fName;
    if (userData.lName) data.form["130_6"] = userData.lName;
    if (userData.email) data.form[131] = userData.email;
    if (userData.phone) data.form[132] = userData.phone;
    if (userData.dob) data.form[158] = userData.dob;
    if (userData.province) data.form["161_4"] = userData.province;

    try {
      const crmResult = await postSmokingQuestionnaireDataToCRM(data);
      Object.assign(data, crmResult);
    } catch (crmError) {
      logger.error("CRM Submission Error:", crmError);
      data.error = true;
      data.error_message = crmError.message || "CRM submission failed";
    }

    const response = NextResponse.json(data);
    response.cookies.set("smoking_entrykey", entrykey, {
      domain: "myrocky.com",
      path: "/",
      expires: new Date(Date.now() + 1800 * 1000),
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    logger.error("API route error:", error);
    return NextResponse.json(
      {
        error: true,
        msg: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

async function handleFileUpload(req, entrykey) {
  try {
    const formData = await req.formData();

    return NextResponse.json(
      {
        error: true,
        msg: "File uploads should now be handled via frontend S3 upload. Please use the uploadFileToS3WithProgress function from frontend-upload.js instead.",
      },
      { status: 400 }
    );
  } catch (error) {
    logger.error("File upload error:", error);
    return NextResponse.json(
      {
        error: true,
        msg: "File upload failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

async function postSmokingQuestionnaireDataToCRM(data) {
  const crmUrlCreate = "/get-wp-gravity-forms-data";
  const crmUrlPartial = "/get-wp-gravity-forms-partial-entry-data";

  let apiEndpoint = crmUrlCreate;
  if (data.id && data.token) {
    apiEndpoint = crmUrlPartial;
  }

  const postData = {
    timestamp: Math.floor(Date.now() / 1000),
    entry_saved: false,
    form_id: data.form_id || 7,
    error: false,
    stage: data.stage || "consultation-after-checkout",
    page_step: parseInt(data.page_step) || 0,
    completion_state: data.completion_state || "Partial",
    completion_percentage: parseInt(data.completion_percentage) || 0,
    source_site: data.source_site || "https://myrocky.com",
    wp_user_id:
      data.wp_user_id !== undefined
        ? data.wp_user_id
        : (await getUserId()) || "",
    created_by:
      data.created_by !== undefined
        ? data.created_by
        : (await getUserId()) || "",
    smoking_entrykey: data.smoking_entrykey || "",
  };

  if (data.id) {
    postData.id = data.id;
  }

  if (data.id && data.token) {
    postData.token = data.token;
    postData.sync = "Partial";
  } else {
    postData.sync = "Create";
  }

  if (data.form) {
    for (const [key, value] of Object.entries(data.form)) {
      const transformedKey = key.replace(/_/g, ".");

      if (value !== undefined && value !== null && value !== "") {
        postData[transformedKey] = value;
      }
    }
  }

  try {
    logger.log("CRM Submission Payload:", JSON.stringify(postData, null, 2));

    const response = await crmApi.post(apiEndpoint, postData, {
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      },
    });

    logger.log("CRM Response:", JSON.stringify(response.data, null, 2));

    if (response.data && response.data.success) {
      return {
        crm_db_id: response.data.data?.crm_db_id || null,
        entry_saved: true,
        id: response.data.data?.wp_entry_id || data.id || "",
        token: response.data.data?.token || data.token || "",
        smoking_entrykey: data.smoking_entrykey,
        crm_post_response_message:
          response.data.message || "Submission successful",
      };
    }

    throw new Error(response.data?.message || "Unknown CRM submission error");
  } catch (error) {
    logger.error("CRM API fetch error:", {
      message: error.message,
      name: error.name,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
    });

    throw new Error(`CRM Submission Failed: ${error.message}`);
  }
}

function generateUniqueId() {
  const OFFSET = 182000000000;
  let id = (Date.now() + OFFSET).toString();

  if (id.length < 16) {
    id =
      id +
      Math.floor(Math.random() * Math.pow(10, 16 - id.length))
        .toString()
        .padStart(16 - id.length, "0");
  } else if (id.length > 16) {
    id = id.slice(0, 16);
  }

  return id;
}
