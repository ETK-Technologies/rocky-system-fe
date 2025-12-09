import { fetchProductBySlugFromBackend } from "@/lib/api/productApi";
import { logger } from "@/utils/devLogger";

export async function GET(request, { params }) {
  try {
    // Properly await params before accessing slug
    const { slug } = await params;

    if (!slug) {
      return Response.json({ error: "No slug provided" }, { status: 400 });
    }

    // Fetch product data from new backend API
    // Pass request to include X-Client-Domain header
    const apiProduct = await fetchProductBySlugFromBackend(slug, false, request);

    if (!apiProduct) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    // Extract only the basic product information needed for initial rendering
    const basicProductInfo = {
      id: apiProduct.id,
      name: apiProduct.name,
      price: apiProduct.salePrice || apiProduct.basePrice || "0",
      image:
        apiProduct.images && apiProduct.images.length > 0
          ? apiProduct.images[0].url || apiProduct.images[0].src
          : null,
      shortDescription: apiProduct.shortDescription || "",
      categories: (apiProduct.categories || []).map((cat) => ({
        id: cat.category?.id || cat.categoryId,
        name: cat.category?.name || "",
        slug: cat.category?.slug || "",
      })),
    };

    return Response.json(basicProductInfo);
  } catch (error) {
    logger.error("Error fetching basic product info:", error);
    return Response.json(
      { error: "Failed to fetch basic product info" },
      { status: 500 }
    );
  }
}
