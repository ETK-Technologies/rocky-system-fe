import { logger } from "@/utils/devLogger";
import { fetchProductBySlugFromBackend } from "@/lib/api/productApi";
import { transformBackendProductToWooCommerceFormat } from "@/lib/api/productAdapter";
import {
  ProductFactory,
  CategoryHandlerFactory,
  VariationManager,
  adaptForProductPage,
} from "@/lib/models";

export async function GET(request, { params }) {
  try {
    // Properly await params before accessing slug
    const { slug } = await params;

    if (!slug) {
      return Response.json({ error: "No slug provided" }, { status: 400 });
    }

    // Fetch product data from new backend API for all products dynamically
    const apiProduct = await fetchProductBySlugFromBackend(slug, false);

    if (!apiProduct) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    // Transform the API response to WooCommerce-like format
    const productData = transformBackendProductToWooCommerceFormat(apiProduct);

    if (!productData) {
      return Response.json({ error: "Failed to transform product data" }, { status: 500 });
    }

    // Process the product data using the same flow as the page component
    const product = ProductFactory(productData);
    const categoryHandler = CategoryHandlerFactory(product);
    const variationManager = new VariationManager(product, categoryHandler);
    const pageProps = adaptForProductPage(
      product,
      categoryHandler,
      variationManager
    );

    return Response.json(pageProps);
  } catch (error) {
    logger.error("Error fetching product:", error);
    return Response.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}
