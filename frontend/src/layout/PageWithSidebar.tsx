import { PageWithSidebarProps } from "@/layout/types";

export function PageWithSidebar({
  children,
  sidebar,
  showSidebar = true,
  sidebarClassName = "",
  contentClassName = "",
}: PageWithSidebarProps) {
  const containerClass = showSidebar
    ? "page-with-sidebar"
    : "page-with-sidebar page-with-sidebar--sidebar-hidden";
  const sidebarClass = `page-with-sidebar__sidebar ${sidebarClassName}`.trim();
  const contentClass = `page-with-sidebar__content ${contentClassName}`.trim();

  return (
    <section className={containerClass}>
      <aside className={sidebarClass}>{sidebar}</aside>
      <div className={contentClass}>{children}</div>
    </section>
  );
}
