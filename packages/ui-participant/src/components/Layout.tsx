import { Outlet } from "react-router-dom";
import { PageLayout } from "ui-shared";

export function Layout() {
  return (
    <PageLayout>
      <Outlet />
    </PageLayout>
  );
}
