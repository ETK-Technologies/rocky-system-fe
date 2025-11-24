import ErrorPage from "@/components/Product/ErrorPage";
import ProductClientWrapper from "@/components/Product/ProductClientWrapper";
import { logger } from "@/utils/devLogger";
import { fetchProductBySlugFromBackend } from "@/lib/api/productApi";
import { transformBackendProductToWooCommerceFormat } from "@/lib/api/productAdapter";
import {
  ProductFactory,
  CategoryHandlerFactory,
  VariationManager,
  adaptForProductPage,
} from "@/lib/models";

// Add revalidation time (1 hour)
export const revalidate = 3600;

export async function generateMetadata({ params }) {
  try {
    const { slug } = await params;

    // Prevent processing of source map files
    if (slug.endsWith(".map")) {
      return {
        title: "Not Found",
        description: "The requested resource was not found.",
      };
    }

    // Fetch product data from backend API for all products
    const apiProduct = await fetchProductBySlugFromBackend(slug, false);

    if (!apiProduct) {
      return {
        title: "Product Not Found",
        description: "The product you are looking for does not exist.",
      };
    }

    return {
      title: apiProduct.name,
      description: apiProduct.shortDescription || apiProduct.description || "",
    };
  } catch (error) {
    logger.error("Error generating metadata", error);
    return {
      title: "Error",
      description: "There was an error loading the product.",
    };
  }
}

export default async function ProductPage({ params }) {
  const { slug } = await params;

  // Prevent processing of source map files
  if (slug.endsWith(".map")) {
    return <ErrorPage />;
  }

  if (!slug) {
    return <ErrorPage />;
  }

  try {
    // Fetch product data from new backend API for all products dynamically
    const apiProduct = await fetchProductBySlugFromBackend(slug, false);

    if (!apiProduct) {
      return <ErrorPage />;
    }

    // Transform the API response to WooCommerce-like format
    const productData = transformBackendProductToWooCommerceFormat(apiProduct);

    if (!productData) {
      return <ErrorPage />;
    }

    // Process the product data using existing models
    const product = ProductFactory(productData);
    const categoryHandler = CategoryHandlerFactory(product);
    const variationManager = new VariationManager(product, categoryHandler);
    const pageProps = adaptForProductPage(
      product,
      categoryHandler,
      variationManager
    );

    // Pass the pre-fetched data to the client component
    return <ProductClientWrapper slug={slug} initialData={pageProps} />;
  } catch (error) {
    logger.error("Error in ProductPage:", error);
    return <ErrorPage />;
  }
}
