import { logger } from "@/utils/devLogger";
import axios from "axios";
import { getClientDomain } from "@/lib/utils/getClientDomain";

const BASE_URL = process.env.BASE_URL;

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id || id === "undefined") {
      return Response.json({ error: "No product ID provided" }, { status: 400 });
    }

    // Get client domain for X-Client-Domain header (required for backend domain whitelist)
    const clientDomain = getClientDomain(request);

    // Fetch product from new backend API
    const response = await axios.get(`${BASE_URL}/api/v1/products/${id}`, {
      headers: {
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "X-Client-Domain": clientDomain,
      },
    });

    const product = response.data;
    if (!product || !product.id) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    // Map backend product structure to expected format
    const productInfo = {
      id: product.id,
      name: product.name,
      categories: Array.isArray(product.categories)
        ? product.categories.map((c) => ({ 
            id: c.id || c.wordpressId, 
            name: c.name, 
            slug: c.slug 
          }))
        : [],
      slug: product.slug,
      sku: product.sku,
    };

    return Response.json(productInfo);
  } catch (error) {
    logger.error("Error fetching product by ID:", error.response?.data || error.message);
    
    // If product not found, return 404
    if (error.response?.status === 404) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }
    
    return Response.json(
      { 
        error: "Failed to fetch product", 
        details: error.response?.data?.message || error.message 
      },
      { status: error.response?.status || 500 }
    );
  }
}
