import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { EmailPreviewClient } from "./_components/email-preview-client";

export const metadata = {
  title: "Preview de E-mails | DEV",
};

export default async function EmailPreviewPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (String(session.usuario?.permissao ?? "") !== "DEV") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-xl text-muted-foreground text-center">
          Esta página é exclusiva para DEV.
        </p>
      </div>
    );
  }

  return (
    <AppPageShell
      title="Preview de E-mails"
      breadcrumbs={[{ label: "Ferramentas DEV" }, { label: "Preview de E-mails" }]}
    >
      <EmailPreviewClient />
    </AppPageShell>
  );
}
