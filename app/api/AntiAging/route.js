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
  getUserNameFromCookies,
  getPhoneFromCookies,
  getProvinceFromCookies,
  getAuthTokenFromCookies,
} from "@/services/userDataService";

const crmApi = axios.create({
    baseURL: "https://crm.myrocky.com/api",
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
    }),
    timeout: 60000,
    headers: { "Content-Type": "application/json; charset=utf-8" },
});

async function getEntrykey() {
    try {
        const cookieStore = await cookies();
        const existingCookie = cookieStore.get("antiaging_entrykey");
        return (
            existingCookie?.value || `antiaging-${randomBytes(8).toString("hex")}`
        );
    } catch (error) {
        logger.warn("Cookie reading error:", error);
        return `antiaging-${randomBytes(8).toString("hex")}`;
    }
}

async function getUserId() {
    try {
        const cookieStore = await cookies();
        const userId = getUserIdFromCookies(cookieStore);
        return userId?.value ? parseInt(userId.value) : 887;
    } catch (error) {
        logger.warn("Error getting user ID from cookies:", error);
        return 887;
    }
}

async function getUserDataFromCookies() {
    try {
        const cookieStore = await cookies();

        // Get individual data from correct cookie keys
        const fName = getDisplayNameFromCookies(cookieStore)?.value || "";
        const email = getUserEmailFromCookies(cookieStore)?.value
            ? decodeURIComponent(getUserEmailFromCookies(cookieStore).value)
            : "";
        const phone = getPhoneFromCookies(cookieStore)?.value || "";
        const dob = getCookieValue(cookieStore, "DOB") || getCookieValue(cookieStore, "dob") || "";
        const province = getProvinceFromCookies(cookieStore)?.value || "";

        // Get full name from userName cookie and extract last name
        const userName = getUserNameFromCookies(cookieStore)?.value || "";
        let lName = "";
        if (userName) {
            // userName contains "FirstName LastName", extract last name
            const nameParts = userName.split(" ");
            if (nameParts.length > 1) {
                lName = nameParts.slice(1).join(" "); // Join in case of multiple last names
            }
        }

        // Log what we got from cookies
        logger.log("AntiAging API - Cookie data retrieved:", {
            fName, lName, email, phone, dob, province, userName
        });

        // Try to get gender from profile API
        let gender = "";
        try {
            const authToken = getAuthTokenFromCookies(cookieStore)?.value;
            const userId = getUserIdFromCookies(cookieStore)?.value;

            if (authToken && userId) {
                const BASE_URL = process.env.BASE_URL;
                const response = await fetch(`${BASE_URL}/wp-json/rockyhealth/v1/user-profile`, {
                    headers: {
                        Authorization: authToken,
                    },
                });

                if (response.ok) {
                    const profileData = await response.json();
                    if (profileData.success && profileData.custom_meta?.gender) {
                        gender = profileData.custom_meta.gender;
                    }
                }
            }
        } catch (genderError) {
            logger.warn("Could not fetch gender from profile:", genderError.message);
        }

        const userData = { fName, lName, email, phone, dob, province, gender };
        logger.log("AntiAging API - Final user data:", userData);
        return userData;

    } catch (error) {
        logger.warn("Error getting user data from cookies:", error);
        return { fName: "", lName: "", email: "", phone: "", dob: "", province: "", gender: "" };
    }
}

export async function GET() {
    const entrykey = await getEntrykey();
    const response = NextResponse.json({ message: "Success", entrykey });
    response.cookies.set("antiaging_entrykey", entrykey, {
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
            return NextResponse.json(
                { error: true, msg: "File uploads should be handled via frontend S3 upload" },
                { status: 400 }
            );
        }

        const rawData = await req.json();
        if (Object.keys(rawData).length === 0) {
            return NextResponse.json({ error: true, msg: "Blank Data" }, { status: 400 });
        }

        const data = {
            form: {},
            antiaging_entrykey: entrykey,
            timestamp: Math.floor(Date.now() / 1000),
            entry_saved: false,
            form_id: rawData.form_id || 10,
            error: false,
            id: rawData.id || "",
            token: rawData.token || "",
            stage: rawData.stage || "consultation-after-checkout",
            page_step: rawData.page_step || 1,
            completion_state: rawData.completion_state || "Partial",
            completion_percentage: rawData.completion_percentage || 10,
            source_site: rawData.source_site || "https://myrocky.com",
            wp_user_id: userId,
            created_by: userId,
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
            "antiaging_entrykey",
            "id",
            "token",
            "stage",
            "page_step",
            "completion_state",
            "source_site",
        ];

        for (const [key, value] of Object.entries(rawData)) {
            if (!excludedKeys.includes(key) && value !== undefined && value !== null) {
                data.form[key] = value;
            }
        }

        if (userData.fName) data.form["130_3"] = userData.fName;
        if (userData.lName) data.form["130_6"] = userData.lName;
        if (userData.email) data.form[131] = userData.email;
        if (userData.phone) data.form[132] = userData.phone;
        if (userData.dob) data.form[158] = userData.dob;
        if (userData.province) data.form["161_4"] = userData.province;
        if (userData.gender) data.form[1] = userData.gender;

        try {
            const crmResult = await postToCRM(data);
            Object.assign(data, crmResult);
        } catch (crmError) {
            logger.error("CRM Submission Error:", crmError);
            data.error = true;
            data.error_message = crmError.message || "CRM submission failed";
        }

        const response = NextResponse.json(data);
        response.cookies.set("antiaging_entrykey", entrykey, {
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
            { error: true, msg: "Internal server error", details: error.message },
            { status: 500 }
        );
    }
}

async function postToCRM(data) {
    const crmUrlCreate = "/get-wp-gravity-forms-data";
    const crmUrlPartial = "/get-wp-gravity-forms-partial-entry-data";

    let apiEndpoint = crmUrlCreate;
    if (data.id && data.token) {
        apiEndpoint = crmUrlPartial;
    }

    const postData = {
        timestamp: Math.floor(Date.now() / 1000),
        entry_saved: false,
        form_id: data.form_id || 10,
        error: false,
        stage: data.stage || "consultation-after-checkout",
        page_step: parseInt(data.page_step) || 1,
        completion_state: data.completion_state || "Partial",
        completion_percentage: parseInt(data.completion_percentage) || 10,
        source_site: data.source_site || "https://myrocky.com",
        wp_user_id: data.wp_user_id || (await getUserId()),
        created_by: data.created_by || (await getUserId()),
        antiaging_entrykey: data.antiaging_entrykey || "",
    };

    if (data.id) postData.id = data.id;
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
            validateStatus: (s) => s >= 200 && s < 300,
        });
        logger.log("CRM Response:", JSON.stringify(response.data, null, 2));
        if (response.data && response.data.success) {
            return {
                crm_db_id: response.data.data?.crm_db_id || null,
                entry_saved: true,
                id: response.data.data?.wp_entry_id || data.id || "",
                token: response.data.data?.token || data.token || "",
                antiaging_entrykey: data.antiaging_entrykey,
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