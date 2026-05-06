import { Navigate, useRoutes } from "react-router-dom";
import { ErrorState } from "@/components/common/ErrorState";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { RoleGuard } from "@/components/common/RoleGuard";
import { routes } from "@/config/routes";
import { AppointmentDetailPage } from "@/features/appointments/AppointmentDetailPage";
import { AppointmentFormPage } from "@/features/appointments/AppointmentFormPage";
import { AppointmentsPage } from "@/features/appointments/AppointmentsPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PayrollPage } from "@/features/dashboard/PayrollPage";
import { FeatureAccessPage } from "@/features/feature-access/FeatureAccessPage";
import { InvoiceDetailPage } from "@/features/invoices/InvoiceDetailPage";
import { InvoiceFormPage } from "@/features/invoices/InvoiceFormPage";
import { InvoicesPage } from "@/features/invoices/InvoicesPage";
import { CreateOwnerPage } from "@/features/owners/CreateOwnerPage";
import { QueueTokenDetailPage } from "@/features/queue-tokens/QueueTokenDetailPage";
import { QueueTokenFormPage } from "@/features/queue-tokens/QueueTokenFormPage";
import { QueueTokensPage } from "@/features/queue-tokens/QueueTokensPage";
import { ResourceDetailPage } from "@/features/resources/ResourceDetailPage";
import { ResourceFormPage } from "@/features/resources/ResourceFormPage";
import { ResourceListPage } from "@/features/resources/ResourceListPage";
import { getResource, type ResourceKey } from "@/features/resources/resourceDefinitions";
import { MySalonPage } from "@/features/salons/MySalonPage";
import { MyEarningsPage } from "@/features/staff-earnings/MyEarningsPage";
import { StaffEarningsPage } from "@/features/staff-earnings/StaffEarningsPage";

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <ErrorState
        title="Page not found"
        description="The page you are looking for does not exist or may have moved."
      />
    </div>
  );
}

function ResourceListRoute({ resourceKey }: { resourceKey: ResourceKey }) {
  return <ResourceListPage resource={getResource(resourceKey) as never} />;
}

function ResourceFormRoute({
  resourceKey,
  mode,
}: {
  resourceKey: ResourceKey;
  mode: "create" | "edit";
}) {
  return <ResourceFormPage resource={getResource(resourceKey) as never} mode={mode} />;
}

function ResourceDetailRoute({ resourceKey }: { resourceKey: ResourceKey }) {
  return <ResourceDetailPage resource={getResource(resourceKey) as never} />;
}

export function AppRouter() {
  const element = useRoutes([
    {
      path: routes.login,
      element: <LoginPage />,
    },
    {
      path: "/",
      element: <ProtectedRoute />,
      children: [
        {
          element: <AppLayout />,
          children: [
            {
              index: true,
              element: <Navigate to="/dashboard" replace />,
            },
            {
              path: routes.dashboard.slice(1),
              element: <DashboardPage />,
            },
            {
              element: <RoleGuard roles={["SUPER_ADMIN"]} />,
              children: [
                {
                  path: routes.salons.slice(1),
                  element: <ResourceListRoute resourceKey="salons" />,
                },
                {
                  path: `${routes.salons.slice(1)}/:id`,
                  element: <ResourceDetailRoute resourceKey="salons" />,
                },
                {
                  path: `${routes.salons.slice(1)}/:id/edit`,
                  element: <ResourceFormRoute resourceKey="salons" mode="edit" />,
                },
                {
                  path: routes.createOwner.slice(1),
                  element: <CreateOwnerPage />,
                },
                {
                  path: routes.plans.slice(1),
                  element: <ResourceListRoute resourceKey="plans" />,
                },
                {
                  path: `${routes.plans.slice(1)}/new`,
                  element: <ResourceFormRoute resourceKey="plans" mode="create" />,
                },
                {
                  path: `${routes.plans.slice(1)}/:id`,
                  element: <ResourceDetailRoute resourceKey="plans" />,
                },
              ],
            },
            {
              path: routes.mySalon.slice(1),
              element: <MySalonPage />,
            },
            {
              path: routes.subscriptions.slice(1),
              element: <ResourceListRoute resourceKey="subscriptions" />,
            },
            {
              path: `${routes.subscriptions.slice(1)}/new`,
              element: <ResourceFormRoute resourceKey="subscriptions" mode="create" />,
            },
            {
              path: `${routes.subscriptions.slice(1)}/:id`,
              element: <ResourceDetailRoute resourceKey="subscriptions" />,
            },
            {
              path: `${routes.subscriptions.slice(1)}/:id/edit`,
              element: <ResourceFormRoute resourceKey="subscriptions" mode="edit" />,
            },
            {
              path: routes.branches.slice(1),
              element: <ResourceListRoute resourceKey="branches" />,
            },
            {
              path: `${routes.branches.slice(1)}/new`,
              element: <ResourceFormRoute resourceKey="branches" mode="create" />,
            },
            {
              path: `${routes.branches.slice(1)}/:id`,
              element: <ResourceDetailRoute resourceKey="branches" />,
            },
            {
              path: `${routes.branches.slice(1)}/:id/edit`,
              element: <ResourceFormRoute resourceKey="branches" mode="edit" />,
            },
            {
              path: routes.serviceCategories.slice(1),
              element: <ResourceListRoute resourceKey="serviceCategories" />,
            },
            {
              path: `${routes.serviceCategories.slice(1)}/new`,
              element: <ResourceFormRoute resourceKey="serviceCategories" mode="create" />,
            },
            {
              path: `${routes.serviceCategories.slice(1)}/:id/edit`,
              element: <ResourceFormRoute resourceKey="serviceCategories" mode="edit" />,
            },
            {
              path: routes.services.slice(1),
              element: <ResourceListRoute resourceKey="services" />,
            },
            {
              path: `${routes.services.slice(1)}/new`,
              element: <ResourceFormRoute resourceKey="services" mode="create" />,
            },
            {
              path: `${routes.services.slice(1)}/:id`,
              element: <ResourceDetailRoute resourceKey="services" />,
            },
            {
              path: `${routes.services.slice(1)}/:id/edit`,
              element: <ResourceFormRoute resourceKey="services" mode="edit" />,
            },
            {
              path: routes.customers.slice(1),
              element: <ResourceListRoute resourceKey="customers" />,
            },
            {
              path: `${routes.customers.slice(1)}/new`,
              element: <ResourceFormRoute resourceKey="customers" mode="create" />,
            },
            {
              path: `${routes.customers.slice(1)}/:id`,
              element: <ResourceDetailRoute resourceKey="customers" />,
            },
            {
              path: `${routes.customers.slice(1)}/:id/edit`,
              element: <ResourceFormRoute resourceKey="customers" mode="edit" />,
            },
            {
              path: routes.staff.slice(1),
              element: <ResourceListRoute resourceKey="staff" />,
            },
            {
              path: `${routes.staff.slice(1)}/new`,
              element: <ResourceFormRoute resourceKey="staff" mode="create" />,
            },
            {
              path: `${routes.staff.slice(1)}/:id`,
              element: <ResourceDetailRoute resourceKey="staff" />,
            },
            {
              path: `${routes.staff.slice(1)}/:id/edit`,
              element: <ResourceFormRoute resourceKey="staff" mode="edit" />,
            },
            {
              path: routes.payments.slice(1),
              element: <ResourceListRoute resourceKey="payments" />,
            },
            {
              path: `${routes.payments.slice(1)}/new`,
              element: <ResourceFormRoute resourceKey="payments" mode="create" />,
            },
            {
              path: `${routes.payments.slice(1)}/:id`,
              element: <ResourceDetailRoute resourceKey="payments" />,
            },
            {
              path: `${routes.payments.slice(1)}/:id/edit`,
              element: <ResourceFormRoute resourceKey="payments" mode="edit" />,
            },
            {
              path: routes.staffEarnings.slice(1),
              element: <StaffEarningsPage />,
            },
            {
              path: routes.myEarnings.slice(1),
              element: <MyEarningsPage />,
            },
            {
              path: routes.payroll.slice(1),
              element: <PayrollPage />,
            },
            {
              path: routes.featureAccess.slice(1),
              element: <FeatureAccessPage />,
            },
            {
              path: `${routes.featureAccess.slice(1)}/:salonBusinessId`,
              element: <FeatureAccessPage />,
            },
            {
              path: routes.queueTokens.slice(1),
              element: <QueueTokensPage />,
            },
            {
              path: `${routes.queueTokens.slice(1)}/new`,
              element: <QueueTokenFormPage />,
            },
            {
              path: `${routes.queueTokens.slice(1)}/:id`,
              element: <QueueTokenDetailPage />,
            },
            {
              path: routes.appointments.slice(1),
              element: <AppointmentsPage />,
            },
            {
              path: `${routes.appointments.slice(1)}/new`,
              element: <AppointmentFormPage mode="create" />,
            },
            {
              path: `${routes.appointments.slice(1)}/:id`,
              element: <AppointmentDetailPage />,
            },
            {
              path: `${routes.appointments.slice(1)}/:id/edit`,
              element: <AppointmentFormPage mode="edit" />,
            },
            {
              path: routes.invoices.slice(1),
              element: <InvoicesPage />,
            },
            {
              path: `${routes.invoices.slice(1)}/new`,
              element: <InvoiceFormPage mode="create" />,
            },
            {
              path: `${routes.invoices.slice(1)}/:id`,
              element: <InvoiceDetailPage />,
            },
            {
              path: `${routes.invoices.slice(1)}/:id/edit`,
              element: <InvoiceFormPage mode="edit" />,
            },
            {
              path: "*",
              element: <NotFoundPage />,
            },
          ],
        },
      ],
    },
    {
      path: "*",
      element: <NotFoundPage />,
    },
  ]);

  return element;
}
