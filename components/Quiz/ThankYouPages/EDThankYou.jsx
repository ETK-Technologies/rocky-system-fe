import { FaCheckCircle, FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";

export default function EDThankYou() {
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4EF] px-4">
        <div id="submit-message" className="py-4 text-center max-w-2xl w-full">
          <h1 className="text-[#814B00] text-2xl text-center font-semibold mb-6">
            Thank You!
          </h1>

        <div className="mb-8">
          {" "}
          <FaCheckCircle className="block h-auto mx-auto my-6 max-w-[150px] text-6xl text-green-700" />
          <h2 className="text-center text-xl text-bold mb-4">
            Your form has been successfully submitted!
          </h2>
          <p className="text-center text-md text-gray-600 mb-6">
            We will review your information and be in touch shortly.
          </p>
        </div>

        <div className="text-center max-w-[300px] mx-auto mt-6">
          <h3 className="text-[#814B00] text-xl text-center font-medium">
            Follow us
          </h3>
        </div>

        <div className="flex justify-center gap-6 mt-4">
          <a
            href="https://www.facebook.com/people/Rocky-Health-Inc/100084461297628/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#814B00]"
          >
            <FaFacebook />
          </a>

          <a
            href="https://www.instagram.com/myrocky/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#814B00]"
          >
            <FaInstagram />
          </a>

          <a
            href="https://twitter.com/myrockyca"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#814B00]"
          >
            <FaTwitter />
          </a>
        </div>

        <div id="go-home" className="text-center mx-auto mt-10 hidden">
          <a
            className="mt-3 py-2 px-10 h-[40px] rounded-md border border-[#814B00] bg-[#814B00] text-[#fefefe] font-medium text-md hover:bg-white hover:text-[#814B00]"
            href="https://myrocky.com/"
          >
            Back Home
          </a>
        </div>
      </div>
    </div>
    </>
  );
}
