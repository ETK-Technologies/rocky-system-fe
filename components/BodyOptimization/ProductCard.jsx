import Link from "next/link";
import CustomImage from "../utils/CustomImage";

const ProductCard = ({ product, btnColor = null }) => {
  return (
    <div className="relative rounded-[16px] overflow-hidden min-w-[284px] h-[400px] border border-solid border-[#E2E2E1] bg-white shadow-md">
      <div className="relative overflow-hidden w-full h-full">
        <CustomImage src={product.image} alt={product.name} fill />
      </div>
      <div className="absolute w-full flex justify-between p-4 top-4 left-0">
        <div>
          <h3 className="text-3xl w-fit mb-5 relative">
            {product.name}
            {product.prescription && product.prescription ? (
              <span className="text-lg font-bold absolute right-[-25px] top-[-7px]">
                ℞
              </span>
            ) : (
              <span className="text-[40px] font-bold absolute right-[-25px] top-[-7px]">
                ®
              </span>
            )}
          </h3>
          <div className="flex flex-col gap-2 text-[#444]">
            <div className="bg-[#c5b9ab] px-4 py-2 rounded-full flex items-center">
              <span className="text-sm">{product.supplyStatus}</span>
            </div>
            <div className="bg-[#f2f2f2] px-4 py-2 rounded-full flex items-center">
              <span className="text-sm">{product.ingredient}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 w-full justify-center items-center absolute bottom-5">
        <Link
          href="/quiz/wlprecons"
          prefetch={true}
          className={`${
            btnColor || "bg-black"
          } text-white py-3 px-3 rounded-full flex items-center justify-center text-sm cursor-pointer`}
        >
          <span>Get Started</span>
        </Link>
        <Link
          href={product.link}
          className="bg-white border border-[#ccc] py-3 px-3 rounded-full flex items-center justify-center text-sm cursor-pointer"
          prefetch={true}
        >
          <span>Learn More</span>
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;
