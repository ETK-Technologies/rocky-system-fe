import PageCover from "@/components/PageCover";
const items = [
  {
    icon: "https://myrocky.b-cdn.net/WP%20Images/Hair%20Loss/ibm--lpa 1.png",
    alt: "See-results",
    text: "See results in 3-4 months",
  },
  {
    icon: "https://myrocky.b-cdn.net/WP%20Images/Hair%20Loss/hospital 1.png",
    alt: "Health",
    text: "FDA-Authorized Treatments",
  },
  {
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/Pre%20Sell/delivery--parcel%201.png",
    alt: "Visits",
    text: "100% online process and ongoing follow-up",
  },
];
const HairCoverData = {
  title: "Hair growth",
  subtitle: "Rocky Makes </br> regrowing hair easy",
  image:
    "https://myrocky.b-cdn.net/WP%20Images/Hair%20Loss/hair-page-cover.jpeg",

  buttons: [
    {
      text: "Take the quiz",
      href: "/quiz/hair-pre-consultation-quiz",
      primary: true,
      ariaLabel: "Opt1",
      width: "w-full md:w-[170px]",
    },
    // {
    //   text: "I know what I want",
    //   href: "/hair-products",
    //   primary: false,
    //   ariaLabel: "Opt2",
    //   width: "w-full md:w-[208px]",
    // },
  ],

  proudPartner: true,
};

const HairCover = () => {
  return (
    <>
      <PageCover data={HairCoverData} items={items} />
    </>
  );
};

export default HairCover;
