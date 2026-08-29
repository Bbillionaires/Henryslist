import { NextResponse } from "next/server";
import { getCategoriesWithSubcategories } from "@/lib/categories";

export async function GET() {
  const categories = await getCategoriesWithSubcategories();
  return NextResponse.json({ categories });
}
