import CustomImage from "@/components/utils/CustomImage";

export default function AllIncluded() {
 
  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">What's included:</h3>
        <ul className="space-y-4">
          <li className="flex items-center gap-3 border-b border-[#E2E2E1] pt-4 pb-4">
            {/* Icon placeholder */}
            <span className="text-[#B4845A]">
              <CustomImage
                src="https://myrocky.b-cdn.net/WP%20Images/bo3/reminder_medical_1.png"
                width="35"
                height="35"
              />
            </span>
            <div>
              <div className="font-medium text-[14px]">
                Virtual appointment upon request
              </div>
            </div>
          </li>
          <li className="flex items-center  gap-3 border-b border-[#E2E2E1] pt-4 pb-4">
            <span className="text-[#B4845A]">
              <CustomImage
                src="https://myrocky.b-cdn.net/WP%20Images/bo3/chat1.png"
                width="24"
                height="24"
              />
            </span>
            <div>
              <div className="font-medium text-[14px]">
                24/7 Medical Support
              </div>
            </div>
          </li>
          <li className="flex items-center gap-3 border-b border-[#E2E2E1] pt-4 pb-4">
            <span className="text-[#B4845A]">
              <CustomImage
                src="https://myrocky.b-cdn.net/WP%20Images/bo3/microscope1.png"
                width="40"
                height="40"
              />
            </span>
            <div>
              <div className="font-medium text-[14px]">Review of Lab Work</div>
            </div>
          </li>
          <li className="flex items-center gap-3 border-b border-[#E2E2E1] pt-4 pb-4">
            <span className="text-[#B4845A]">
              <CustomImage
                src="https://myrocky.b-cdn.net/WP%20Images/bo3/stethoscope2.png"
                width="30"
                height="30"
              />
            </span>
            <div>
              <div className="font-medium text-[14px]">
                Health Canada Approved Treatments
              </div>
            </div>
          </li>
          <li className="flex items-center gap-3 border-b border-[#E2E2E1] pt-4 pb-4">
            <span className="text-[#B4845A]">
              <CustomImage
                src="https://myrocky.b-cdn.net/WP%20Images/bo3/ibm1.png"
                width="30"
                height="30"
              />
            </span>
            <div>
              <div className="font-medium text-[14px]">
                Health Coaching by Licensed Clinicians
              </div>
            </div>
          </li>
          <li className="flex items-center gap-3 border-b border-[#E2E2E1] pt-4 pb-4">
            <span className="text-[#B4845A]">
              <CustomImage
                src="https://myrocky.b-cdn.net/WP%20Images/bo3/ibm.png"
                width="24"
                height="24"
              />
            </span>
            <div>
              <div className="font-medium">Nutrition and lifestyle tips</div>
            </div>
          </li>
        </ul>
      </div>
    </>
  );
}
