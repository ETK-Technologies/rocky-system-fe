"use client";

import { Suspense } from "react";
import LayoutDetector from "./LayoutDetector";
import BugHerdProvider from "./BugHerdProvider";
import AttributionTracker from "./AttributionTracker";
import PatientPortalLogoutHandler from "@/components/utils/PatientPortalLogoutHandler";

/**
 * ClientLayoutProvider serves as a client component wrapper
 * that can be imported into server components.
 * It includes client-side functionality like the LayoutDetector
 * and AttributionTracker without affecting server-side rendering.
 */
const ClientLayoutProvider = ({ children }) => {
  return (
    <BugHerdProvider>
      <LayoutDetector />
      <Suspense fallback={null}>
        <AttributionTracker />
        <PatientPortalLogoutHandler />
      </Suspense>
      {children}
    </BugHerdProvider>
  );
};

export default ClientLayoutProvider;
