import Image from "next/image";
import Link from "next/link";
import { ProductImage } from "@/components/Product";
import PropTypes from "prop-types";
// import CustomImage from "@/components/utils/CustomImage";

const ProductDisplay = ({ product, productSlug }) => {
  const productImageSrc = product?.images?.[0]?.src || product?.image;
  const productName = product?.name || "";
  const productPrice = product?.price || "$395";
  const isRybelsus = productSlug?.toLowerCase().includes("rybelsus");
  // const productDescription =
  //   product?.short_description ||
  //   "A weekly semaglutide shot to improve insulin sensitivity, reduce appetite, and regulate blood sugar.*";
  const productDescription = isRybelsus
    ? "A once-daily tablet designed to support weight loss by helping reduce appetite and increase feelings of fullness. Rybelsus® contains semaglutide, a clinically proven ingredient that can aid in long-term weight management when combined with a healthy diet and lifestyle."
    : product?.short_description ||
      "A weekly semaglutide shot to improve insulin sensitivity, reduce appetite, and regulate blood sugar.*";

  const getActiveIngredient = (slug) => {
    if (!slug) return "";

    const slugLower = slug.toLowerCase();

    if (slugLower.includes("ozempic") || slugLower.includes("wegovy"))
      return "Semaglutide";
    if (slugLower.includes("mounjaro")) return "Tirzepatide";
    if (slugLower.includes("rybelsus")) return "Semaglutide";

    return "";
  };

  const activeIngredient = getActiveIngredient(productSlug);
  return (
    <div className="max-w-[1184px] mx-auto mb-16">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-20">
        <div className="w-full lg:w-1/2 flex justify-center">
          <ProductImage src={productImageSrc} alt={productName} priority />
        </div>

        {/* Right Column - Product Info */}
        <div className="w-full lg:w-1/2">
          <div className="flex flex-col h-full justify-between">
            <div>
              <h1 className="text-5xl text-[#000000] font-[450] mb-2 headers-font">
                {productName}
              </h1>
              {/* <p className="text-sm text-[#000000] mb-4">
                ({activeIngredient}) injection
              </p> */}
              <p className="text-sm text-[#000000] mb-4">
                ({activeIngredient}) {isRybelsus ? "tablets" : "injection"}
              </p>

              <p className="text-lg font-medium mb-4">${productPrice}</p>

              <p className="text-base mb-6 text-[#212121]">
                {productDescription}
              </p>
              {!isRybelsus && (
                <ul className="flex flex-col gap-2">
                  <li className="flex items-start gap-2">
                    <Image
                      src="/body-optimization-products/checkmark.svg"
                      alt="Info Icon"
                      width={20}
                      height={20}
                    />
                    <span>
                      {productName} is the brand name medication for the active
                      ingredient {activeIngredient}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Image
                      src="/body-optimization-products/checkmark.svg"
                      alt="Info Icon"
                      width={20}
                      height={20}
                    />
                    <span>{productName} is taken as a weekly injection</span>
                  </li>
                </ul>
              )}
              <div className="mt-6 md:mt-8">
                <Link
                  href="/quiz/wlprecons"
                  className="w-full md:w-auto bg-black text-white py-4 px-8 rounded-full font-medium flex items-center justify-center text-center hover:bg-gray-800 transition-colors"
                >
                  Get Started
                </Link>

                <p className="text-xs text-[#212121] mt-3 text-center mx-auto">
                  Only available if prescribed after an online consultation with
                  a healthcare provider.
                </p>
              </div>
            </div>
            {/* <div className="relative mx-auto  w-[335px] md:w-full h-[100px]">
              <CustomImage src="/OCP-IMGS.webp" fill />
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

ProductDisplay.propTypes = {
  product: PropTypes.shape({
    images: PropTypes.arrayOf(
      PropTypes.shape({
        src: PropTypes.string,
      })
    ),
    image: PropTypes.string,
    name: PropTypes.string,
    price: PropTypes.string,
    short_description: PropTypes.string,
  }).isRequired,
  productSlug: PropTypes.string.isRequired,
};

export default ProductDisplay;
