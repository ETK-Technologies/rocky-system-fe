import PageCover from "@/components/PageCover";
const items = [
  {
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/Pre%20Sell/hospital%201.png",
    alt: "Hospital",
    text: "FDA-Approved medication",
  },
  {
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/Pre%20Sell/dns-services%201.png",
    alt: "Services",
    text: "Generic & Brand name available",
  },
  {
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/Pre%20Sell/delivery--parcel%201.png",
    alt: "Visits",
    text: "100% online—no doctor visits",
  },
  {
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/Pre%20Sell/stethoscope%201.png",
    alt: "No-doctor",
    text: "No doctor visit needed",
  },
];
const SexCoverData = {
  proudPartner: true,
  title: "Sexual Health",
  subtitle: "Sexual Health Products Online, Shipped to You.",
  image:
    "https://myrocky.b-cdn.net/WP%20Images/Sexual%20Health/new-ed-cover-adjusted.webp",

  buttons: [
    {
      text: "I Know What I Want",
      href: "/ed-flow/",
      primary: true,
      ariaLabel: "Opt1",
      width: "170px",
    },
    {
      text: "Find What's Best For Me",
      href: "/quiz/ed-pre-consultation/",
      primary: false,
      ariaLabel: "Opt2",
      width: "208px",
    },
  ],
};

const SexCover = () => {
  return (
    <>
      <PageCover data={SexCoverData} items={items} />
    </>
  );
};

export default SexCover;
