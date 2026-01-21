import ProductCards from "@/components/utils/ProductCards";
import ProductSection from "@/components/utils/ProductSection";

const edProductCard = [
  {
    LeadingProductCard: {
      title: "Erectile Dysfunction",
      subtitle: "Get Confidence Back in Bed",
      link: "/sex",
      image:
        "bg-[url('https://myrocky.b-cdn.net/WP%20Images/Homepage/ed-leading.webp')]",
    },
    ProductCard: [
      {
        title: "Cialis (Tadalafil)",
        description: "Last up to 24-36 hours",
        link: "/ed-flow/?onboarding=1&showonly=cialis",
        image: "/popular-treatments/cialis.webp",
      },
      {
        title: "Viagra (Sildenafil)",
        description: "Last up to 8-12 hours",
        link: "/ed-flow/?onboarding=1&showonly=viagra",
        image: "/popular-treatments/viagra.webp",
      },
      // {
      //   title: "Chewalis",
      //   description: "Last up to 24-36 hours",
      //   link: "/ed-flow/?onboarding=1&showonly=chewalis",
      //   image: "/popular-treatments/chewalis.webp",
      // },
      {
        title: "Cialis + Viagra",
        description: "Last up to 8-36 hours",
        link: "/ed-flow/?onboarding=1&showonly=variety-pack",
        image: "/popular-treatments/combination.webp",
      },
    ],
  },
];

const wlProductCard = [
  {
    LeadingProductCard: {
      title: "Weight Loss",
      subtitle: "Better Wellness, Through Science",
      link: "/body-optimization",
      image:
        "bg-[url('https://myrocky.b-cdn.net/WP%20Images/Homepage/wl-section.webp')]",
    },
    ProductCard: [
      {
        title: "Ozempic®",
        description: "(semaglutide) injection",
        link: "/quiz/wlprecons",
        image:
          "https://myrocky.b-cdn.net/WP%20Images/Homepage/ozempic-cropped.webp",
      },
      {
        title: "Mounjaro®",
        description: "(tirzepatide)",
        link: "/quiz/wlprecons",
        image: "/products/monjaro.png",
      },
      {
        title: "Wegovy®",
        description: "(semaglutide) injection",
        link: "/quiz/wlprecons",
        image: "https://myrocky.b-cdn.net/WP%20Images/Homepage/wegovy.webp",
      },
      ,
      {
        title: "Rybelsus®",
        description: "(semaglutide) injection",
        link: "/quiz/wlprecons",
        image: "/products/rybelsus.png",
      },
    ],
  },
];

const hairProductCard = [
  {
    LeadingProductCard: {
      title: "Hair Loss",
      subtitle: "Hair Treatment Formulated for You",
      link: "/hairloss",
      image:
        "bg-[url('https://myrocky.b-cdn.net/WP%20Images/Homepage/hair-leading.webp')]",
    },
    ProductCard: [
      {
        title: "Finasteride & Minoxidil Topical Foam",
        description: "Prevents hair loss and helps regrow hair",
        link: "/hair-flow/?onboarding=1&showonly=2-in-1-growth-plan",
        image:
          "https://myrocky.b-cdn.net/WP%20Images/Homepage/minoxidil-spray.webp",
      },
      // {
      //   title: "Finasteride & Minoxidil",
      //   description: "Prevents hair loss & stimulates hair regrowth",
      //   link: "/hair-flow/?onboarding=1&showonly=finasteride-minoxidil",
      //   image: "/popular-treatments/combination-2.webp",
      // },
      // {
      //   title: "Minoxidil (Rogaine)",
      //   description: "Stimulates hair regrowth",
      //   link: "/hair-flow/?onboarding=1&showonly=minoxidil",
      //   image: "/popular-treatments/minoxidil-1.webp",
      // },
      // {
      //   title: "Finasteride (Propecia)",
      //   description: "Prevents hair loss",
      //   link: "/hair-flow/?onboarding=1&showonly=finasteride-propecia",
      //   image: "/popular-treatments/finasteride1.webp",
      // },
    ],
  },
];

// const smokingProductCard = [
//   {
//     LeadingProductCard: {
//       title: "Smoking Cessation",
//       subtitle: "A New Way to Quit",
//       link: "/zonnic",
//       image: "bg-[url('/zonic/zonnic-cover.png')]",
//     },
//     ProductCard: [
//       {
//         title: "Zonnic",
//         description: "Nicotine pouches",
//         link: "/zonnic",
//         image: "/zonic/zonnic-main.png",
//       },
//     ],
//   },
// ];

// const recoveryProductCard = [
//   {
//     LeadingProductCard: {
//       title: "Recovery",
//       subtitle: "A Smarter Way to Recover",
//       link: "/product/dhm-blend",
//       image:
//         "bg-[url('https://mycdn.myrocky.com/wp-content/uploads/20250306132419/DHM.jpg')] ",
//     },
//     ProductCard: [
//       {
//         title: "DHM Blend",
//         description: "Herbal Supplement",
//         link: "/product/dhm-blend",
//         image: "https://myrocky.b-cdn.net/WP%20Images/dhm/dhm-prod.webp",
//       },
//     ],
//   },
// ];

const HomeProducts = () => {
  return (
    <>
      <div className="md:mb-[-30px]">
        <h2 className="text-[32px] md:text-5xl font-[550] leading-[36.8px] md:leading-[55.2px] tracking-[-0.01em]  md:tracking-[-0.02em] mb-3 md:mb-4 headers-font">
          Most Popular Treatments
        </h2>
        <p className="text-lg md:text-xl font-[400] leading-[25.2px] md:leading-[28px] ">
          Our clinical team has put together effective treatments for you.
        </p>
      </div>
      <ProductSection>
        <div className="flex flex-nowrap gap-4">
          {edProductCard.map((card, index) => (
            <ProductCards key={index} cards={card} />
          ))}
        </div>
      </ProductSection>
      <ProductSection>
        <div className="flex flex-nowrap gap-4">
          {wlProductCard.map((card, index) => (
            <ProductCards key={index} cards={card} />
          ))}
        </div>
      </ProductSection>
      <ProductSection>
        <div className="flex flex-nowrap gap-4">
          {hairProductCard.map((card, index) => (
            <ProductCards key={index} cards={card} />
          ))}
        </div>
      </ProductSection>
      {/* <ProductSection>
        <div className="flex flex-nowrap gap-4">
          {smokingProductCard.map((card, index) => (
            <ProductCards key={index} cards={card} />
          ))}
        </div>
      </ProductSection>
      <ProductSection>
        <div className="flex flex-nowrap gap-4">
          {recoveryProductCard.map((card, index) => (
            <ProductCards key={index} cards={card} />
          ))}
        </div>
      </ProductSection> */}
    </>
  );
};

export default HomeProducts;
