import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/recommend/catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchCatalog(query, 12);
    return NextResponse.json(results);
  } catch (error) {
    console.error("search-anime failed", error);
    return NextResponse.json(
      {
        message: "Unable to search anime right now.",
      },
      {
        status: 500,
      },
    );
  }
}
