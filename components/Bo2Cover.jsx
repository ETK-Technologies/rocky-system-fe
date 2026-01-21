import PageCover from "@/components/PageCover";
const items = [
  {
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/chart-average.png",
    alt: "Hospital",
    text: "Lose 15-20% of your body weight in a year*",
  },
  {
    icon: "https://myrocky.b-cdn.net/WP%20Images/Weight%20Loss/dns-services.webp",
    alt: "Services",
    text: "Access the right medication for you, with your GLP-1 prescription.",
  },
  {
    icon: "https://myrocky.b-cdn.net/WP%20Images/Weight%20Loss/stethoscope.webp",
    alt: "Visits",
    text: "Personalized treatments with ongoing clinical support.",
  },
];
const wlCoverData = {
  proudPartner: true,
  title: "Trusted by 300,000+ Users",
  subtitle: "Your Health Journey Simplified with a Prescription",
  image: "https://myrocky.b-cdn.net/Other%20Images/bo2-tt.png",
  imageHeight: "md:h-[520px]",
  note: "<strong>Money-back Guarantee:</strong> Transform your body or we'll fully refund all your consultation costs.<sup>2</sup>",

  buttons: [
    {
      text: "Am I Eligible?",
      href: "/quiz/wlprecons/",
      primary: true,
      ariaLabel: "Opt1",
      width: "md:w-[310px]",
      color: "bg-black",
    },
  ],
};

const Bo2Cover = ({ btnColor = null }) => {
  if (btnColor) wlCoverData.buttons[0].color = btnColor;
  return (
    <>
      <PageCover data={wlCoverData} items={items} />
    </>
  );
};

export default Bo2Cover;
