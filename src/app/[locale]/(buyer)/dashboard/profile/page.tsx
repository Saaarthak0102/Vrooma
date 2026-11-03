import { redirect } from "@/i18n/navigation";

export default async function DashboardProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/profile", locale });
}
