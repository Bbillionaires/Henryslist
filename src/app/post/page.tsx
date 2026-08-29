import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";
import { getCategoriesWithSubcategories } from "@/lib/categories";
import { PostStepOne } from "./post-step-one";

export const metadata = { title: "Post a Listing — $1" };

export default async function PostPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/post");

  const categories = await getCategoriesWithSubcategories();
  return <PostStepOne categories={categories} />;
}
