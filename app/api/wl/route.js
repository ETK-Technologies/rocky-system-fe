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
    const existingCookie = cookieStore.get("wl_entrykey");
    return existingCookie?.value || `wlq-${randomBytes(8).toString("hex")}`;
  } catch (error) {
    logger.warn("Cookie reading error:", error);
    return `wlq-${randomBytes(8).toString("hex")}`;
  }
}

// New helper function to get user ID from cookies
async function getUserId() {
  try {
    const cookieStore = await cookies();
    const userId = getUserIdFromCookies(cookieStore);
    return userId?.value ? parseInt(userId.value) : 887; // Fallback to 887 if no user ID in cookies
  } catch (error) {
    logger.warn("Error getting user ID from cookies:", error);
    return 887; // Fallback to 887 if there's an error
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
  response.cookies.set("wl_entrykey", entrykey, {
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
    const cookieStore = await cookies();
    const ttlMs = 1800 * 1000;
    const now = Date.now();
    let entrykey = cookieStore.get("wl_entrykey")?.value;
    let id = cookieStore.get("wl_id")?.value;
    let token = cookieStore.get("wl_token")?.value;
    let entrykeyExpires = cookieStore.get("wl_entrykey_expires")?.value;
    let idExpires = cookieStore.get("wl_id_expires")?.value;
    let tokenExpires = cookieStore.get("wl_token_expires")?.value;
    if (!(entrykey && entrykeyExpires && now < parseInt(entrykeyExpires))) {
      entrykey = `wlq-${randomBytes(8).toString("hex")}`;
    }

    const userId = await getUserId();
    const userData = await getUserDataFromCookies();
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          error: true,
          msg: "File uploads should be handled via frontend S3 upload",
        },
        { status: 400 }
      );
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
      entrykey: entrykey,
      timestamp: Math.floor(Date.now() / 1000),
      entry_saved: false,
      form_id: rawData.form_id || 6,
      error: false,
      id: rawData.id || id || "",
      token: rawData.token || token || "",
      stage: rawData.stage || "consultation-before-checkout",
      page_step: rawData.page_step || 1,
      completion_state: rawData.completion_state || "Partial",
      completion_percentage: rawData.completion_percentage || 10,
      source_site: rawData.source_site || "https://myrocky.com",
      wp_user_id: userId,
      created_by: userId,
    };
    if (
      (rawData.stage === "body-photos-upload" ||
        data.stage === "body-photos-upload") &&
      ((rawData["197"] && rawData["198"]) ||
        (data.form && data.form["197"] && data.form["198"]))
    ) {
      data.completion_percentage = 100;
      data.completion_state = "Full";
    }
    if (
      (data.stage === "consultation-before-checkout" ||
        data.stage === "consultation-after-checkout") &&
      !data.id &&
      !data.token
    ) {
      data.id = generateUniqueId();
    }
    const excludedKeys = [
      "form_id",
      "action",
      "entrykey",
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
      const crmResult = await postWeightLossQuestionnaireDataToCRM(data);
      Object.assign(data, crmResult);
      if (data.id && data.token) {
        const expires = new Date(now + ttlMs).getTime().toString();
        const response = NextResponse.json(data);
        response.cookies.set("wl_entrykey", entrykey, {
          domain: "myrocky.com",
          path: "/",
          expires: new Date(now + ttlMs),
          httpOnly: false,
          sameSite: "lax",
        });
        response.cookies.set("wl_id", data.id, {
          domain: "myrocky.com",
          path: "/",
          expires: new Date(now + ttlMs),
          httpOnly: false,
          sameSite: "lax",
        });
        response.cookies.set("wl_token", data.token, {
          domain: "myrocky.com",
          path: "/",
          expires: new Date(now + ttlMs),
          httpOnly: false,
          sameSite: "lax",
        });
        response.cookies.set("wl_entrykey_expires", (now + ttlMs).toString(), {
          domain: "myrocky.com",
          path: "/",
          expires: new Date(now + ttlMs),
          httpOnly: false,
          sameSite: "lax",
        });
        response.cookies.set("wl_id_expires", (now + ttlMs).toString(), {
          domain: "myrocky.com",
          path: "/",
          expires: new Date(now + ttlMs),
          httpOnly: false,
          sameSite: "lax",
        });
        response.cookies.set("wl_token_expires", (now + ttlMs).toString(), {
          domain: "myrocky.com",
          path: "/",
          expires: new Date(now + ttlMs),
          httpOnly: false,
          sameSite: "lax",
        });
        return response;
      }
    } catch (crmError) {
      logger.error("CRM Submission Error:", crmError);
      data.error = true;
      data.error_message = crmError.message || "CRM submission failed";
    }
    const response = NextResponse.json(data);
    response.cookies.set("wl_entrykey", entrykey, {
      domain: "myrocky.com",
      path: "/",
      expires: new Date(now + ttlMs),
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

async function postWeightLossQuestionnaireDataToCRM(data) {
  const crmUrlCreate = "/get-wp-gravity-forms-data";
  const crmUrlPartial = "/get-wp-gravity-forms-partial-entry-data";
  const crmUrlGet = "/get-wp-gravity-forms-entry-data";

  let apiEndpoint = crmUrlCreate;
  if (data.id && data.token) {
    apiEndpoint = crmUrlPartial;
  }

  const postData = {
    timestamp: Math.floor(Date.now() / 1000),
    entry_saved: false,
    form_id: data.form_id || 6,
    error: false,
    stage: data.stage || "consultation-before-checkout",
    page_step: parseInt(data.page_step) || 1,
    completion_state: data.completion_state || "Partial",
    completion_percentage: parseInt(data.completion_percentage) || 10,
    source_site: data.source_site || "https://myrocky.com",
    wp_user_id: data.wp_user_id || (await getUserId()),
    created_by: data.created_by || (await getUserId()),
    entrykey: data.entrykey || "",
  };

  if (data.id) {
    postData.id = data.id;
  }

  if (data.id && data.token) {
    postData.token = data.token;
    postData.sync = "Partial";
    try {
      const getResponse = await crmApi.get(`${crmUrlGet}/${data.id}`, {
        params: {
          token: data.token,
          form_id: data.form_id || 6,
        },
      });

      if (
        getResponse.data &&
        getResponse.data.success &&
        getResponse.data.data
      ) {
        const existingData = getResponse.data.data;
        Object.entries(existingData).forEach(([key, value]) => {
          if (
            !key.startsWith("_") &&
            value !== undefined &&
            value !== null &&
            value !== ""
          ) {
            postData[key] = value;
          }
        });

        logger.log("Successfully retrieved existing data for entry:", data.id);
      }
    } catch (error) {
      logger.warn("Error retrieving existing entry data:", error.message);
      try {
        const fs = require("fs").promises;
        const path = require("path");
        const cacheFile = path.join(
          process.cwd(),
          "tmp",
          `form-cache-${data.id}.json`
        );

        const cachedData = await fs.readFile(cacheFile, "utf8");
        const parsedCache = JSON.parse(cachedData);

        Object.entries(parsedCache).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            postData[key] = value;
          }
        });

        logger.log("Using cached data for entry:", data.id);
      } catch (cacheError) {
        logger.warn("No cached data available:", cacheError.message);
      }
    }
  } else {
    postData.sync = "Create";
  }

  if (data.form) {
    for (const [key, value] of Object.entries(data.form)) {
      if (key.includes("_textarea")) {
        if (key.match(/^\d+_textarea$/)) {
          const questionId = key.split("_")[0];
          postData[`l-${questionId}.1-textarea`] = value;
        } else if (key.match(/^\d+_\d+_textarea$/)) {
          const [questionId, optionIndex] = key.split("_");
          postData[`l-${questionId}.${optionIndex}-textarea`] = value;
        } else if (key.includes("-textarea")) {
          const parts = key.split("-");
          const questionPart = parts[0];

          if (questionPart.includes("_")) {
            const [questionId, optionIndex] = questionPart.split("_");
            postData[`l-${questionId}.${optionIndex}-textarea`] = value;
          } else {
            postData[`l-${questionPart}.1-textarea`] = value;
          }
        } else {
          postData[key] = value;
        }
      } else {
        const transformedKey = key.replace(/_/g, ".");
        postData[transformedKey] = value;
        postData[key] = value;
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

    if (response.data && response.data.success && data.id) {
      try {
        const fs = require("fs").promises;
        const path = require("path");
        const dir = path.join(process.cwd(), "tmp");

        await fs.mkdir(dir, { recursive: true });

        const cacheFile = path.join(dir, `form-cache-${data.id}.json`);
        let existingCache = {};
        try {
          const existingData = await fs.readFile(cacheFile, "utf8");
          existingCache = JSON.parse(existingData);
        } catch (readError) {
          logger.log("No existing cache found or couldn't read it");
        }
        const fieldsToKeep = { ...existingCache };
        if (data.form) {
          Object.entries(data.form).forEach(([key, value]) => {
            const isExplicitlyEmptyValue =
              value === "" || value === null || value === undefined;

            if (key.match(/^\d+_\d+$/) && isExplicitlyEmptyValue) {
              const [fieldId, optionIndex] = key.split("_");
              const dotNotationKey = `${fieldId}.${optionIndex}`;

              delete fieldsToKeep[key];
              delete fieldsToKeep[dotNotationKey];

              const textareaKeyUnderscoreFormat = `${key}_textarea`;
              const textareaKeyDotFormat = `l-${dotNotationKey}-textarea`;

              delete fieldsToKeep[textareaKeyUnderscoreFormat];
              delete fieldsToKeep[textareaKeyDotFormat];
            } else if (
              key.match(/^\d+_\d+_textarea$/) ||
              key.match(/^\d+_textarea$/)
            ) {
              let fieldId, optionIndex;
              let textareaBackendKey;

              if (key.match(/^\d+_\d+_textarea$/)) {
                [fieldId, optionIndex] = key.split("_", 2);
                textareaBackendKey = `l-${fieldId}.${optionIndex}-textarea`;
              } else if (key.match(/^\d+_textarea$/)) {
                fieldId = key.split("_")[0];
                textareaBackendKey = `l-${fieldId}.1-textarea`;
              }

              if (isExplicitlyEmptyValue) {
                delete fieldsToKeep[key];
                delete fieldsToKeep[textareaBackendKey];
              } else {
                fieldsToKeep[key] = value;
                fieldsToKeep[textareaBackendKey] = value;
              }
            } else if (key.match(/^\d+_\d+$/) && !isExplicitlyEmptyValue) {
              const [fieldId, optionIndex] = key.split("_");
              const dotNotationKey = `${fieldId}.${optionIndex}`;

              fieldsToKeep[key] = value;
              fieldsToKeep[dotNotationKey] = value;
            } else {
              if (isExplicitlyEmptyValue) {
                delete fieldsToKeep[key];
                const dotKey = key.replace(/_/g, ".");
                if (dotKey !== key) {
                  delete fieldsToKeep[dotKey];
                }
              } else {
                fieldsToKeep[key] = value;
                const dotKey = key.replace(/_/g, ".");
                if (dotKey !== key) {
                  fieldsToKeep[dotKey] = value;
                }
              }
            }
          });
        }

        [
          "131",
          "601",
          "602",
          "603",
          "617",
          "completion.percentage",
          "130.3",
          "161.4",
        ].forEach((key) => {
          if (postData[key]) fieldsToKeep[key] = postData[key];
        });
        Object.keys(fieldsToKeep).forEach((key) => {
          if (key.endsWith("-textarea")) {
            const basePart = key.replace("-textarea", "");
            if (basePart.startsWith("l-")) {
              const [_, fieldPart] = basePart.split("-");
              const [fieldId, optionIndex] = fieldPart.split(".");

              const checkboxUnderscoreKey = `${fieldId}_${optionIndex}`;
              const checkboxDotKey = `${fieldId}.${optionIndex}`;

              if (
                !fieldsToKeep[checkboxUnderscoreKey] &&
                !fieldsToKeep[checkboxDotKey]
              ) {
                delete fieldsToKeep[key];
              }
            }
          }
        });

        await fs.writeFile(cacheFile, JSON.stringify(fieldsToKeep, null, 2));
      } catch (cacheError) {
        logger.warn("Failed to update form cache:", cacheError.message);
      }
    }

    if (response.data && response.data.success) {
      return {
        crm_db_id: response.data.data?.crm_db_id || null,
        entry_saved: true,
        id: response.data.data?.wp_entry_id || data.id || "",
        token: response.data.data?.token || data.token || "",
        entrykey: data.entrykey,
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
