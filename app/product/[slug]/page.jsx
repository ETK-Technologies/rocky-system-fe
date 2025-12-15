import ErrorPage from "@/components/Product/ErrorPage";
import ProductClientWrapper from "@/components/Product/ProductClientWrapper";
import { logger } from "@/utils/devLogger";
import { fetchProductBySlugFromBackend } from "@/lib/api/productApi";
import { transformBackendProductToWooCommerceFormat } from "@/lib/api/productAdapter";
import { headers } from "next/headers";
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

    // Get headers to pass client domain
    const headersList = await headers();

    // Fetch product data from backend API for all products
    const apiProduct = await fetchProductBySlugFromBackend(slug, false, headersList);

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
    // Get headers to pass client domain
    const headersList = await headers();

    // Fetch product data from new backend API for all products dynamically
    const apiProduct = await fetchProductBySlugFromBackend(slug, false, headersList);

    if (!apiProduct) {
      logger.error(`[ProductPage] Product not found or failed to fetch for slug: ${slug}`);
      return <ErrorPage />;
    }

    // Transform the API response to WooCommerce-like format
    let productData;
    try {
      productData = transformBackendProductToWooCommerceFormat(apiProduct);
    } catch (transformError) {
      logger.error(`[ProductPage] Error transforming product data for slug "${slug}":`, transformError);
      return <ErrorPage />;
    }

    if (!productData) {
      logger.error(`[ProductPage] Product transformation returned null for slug: ${slug}`);
      return <ErrorPage />;
    }

    // Process the product data using existing models
    let pageProps;
    try {
      const product = ProductFactory(productData);
      const categoryHandler = CategoryHandlerFactory(product);
      const variationManager = new VariationManager(product, categoryHandler);
      pageProps = adaptForProductPage(
        product,
        categoryHandler,
        variationManager
      );
    } catch (modelError) {
      logger.error(`[ProductPage] Error processing product models for slug "${slug}":`, modelError);
      return <ErrorPage />;
    }

    // Pass the pre-fetched data to the client component
    return <ProductClientWrapper slug={slug} initialData={pageProps} />;
  } catch (error) {
    logger.error(`[ProductPage] Unexpected error for slug "${slug}":`, error);
    return <ErrorPage />;
  }
}
