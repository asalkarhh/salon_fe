import { Navigate, useRoutes } from "react-router-dom";
import { ErrorState } from "@/components/common/ErrorState";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { RoleGuard } from "@/components/common/RoleGuard";
import { getResourceUiRoles, pageUiAccess } from "@/config/access";
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
import { OwnerDetailPage } from "@/features/owners/OwnerDetailPage";
import { OwnerFormPage } from "@/features/owners/OwnerFormPage";
import { OwnersPage } from "@/features/owners/OwnersPage";
import { PaymentsPage } from "@/features/payments/PaymentsPage";
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
import type { Role } from "@/types/enums";

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
  return (
    <RoleGuard roles={getResourceUiRoles(resourceKey, "list")}>
      <ResourceListPage resource={getResource(resourceKey) as never} />
    </RoleGuard>
  );
}

function ResourceFormRoute({
  resourceKey,
  mode,
}: {
  resourceKey: ResourceKey;
  mode: "create" | "edit";
}) {
  return (
    <RoleGuard roles={getResourceUiRoles(resourceKey, mode)}>
      <ResourceFormPage resource={getResource(resourceKey) as never} mode={mode} />
    </RoleGuard>
  );
}

function ResourceDetailRoute({ resourceKey }: { resourceKey: ResourceKey }) {
  return (
    <RoleGuard roles={getResourceUiRoles(resourceKey, "detail")}>
      <ResourceDetailPage resource={getResource(resourceKey) as never} />
    </RoleGuard>
  );
}

function guardElement(roles: readonly Role[], element: React.ReactNode) {
  return <RoleGuard roles={roles}>{element}</RoleGuard>;
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
                  path: routes.owners.slice(1),
                  element: <OwnersPage />,
                },
                {
                  path: `${routes.owners.slice(1)}/new`,
                  element: <OwnerFormPage mode="create" />,
                },
                {
                  path: `${routes.owners.slice(1)}/:id`,
                  element: <OwnerDetailPage />,
                },
                {
                  path: `${routes.owners.slice(1)}/:id/edit`,
                  element: <OwnerFormPage mode="edit" />,
                },
                {
                  path: routes.createOwner.slice(1),
                  element: <Navigate to={routes.owners} replace />,
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
                {
                  path: `${routes.plans.slice(1)}/:id/edit`,
                  element: <ResourceFormRoute resourceKey="plans" mode="edit" />,
                },
              ],
            },
            {
              path: routes.mySalon.slice(1),
              element: guardElement(pageUiAccess.mySalon, <MySalonPage />),
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
              path: `${routes.serviceCategories.slice(1)}/:id`,
              element: <ResourceDetailRoute resourceKey="serviceCategories" />,
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
              element: guardElement(pageUiAccess.payments, <PaymentsPage />),
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
              element: guardElement(pageUiAccess.staffEarnings, <StaffEarningsPage />),
            },
            {
              path: routes.myEarnings.slice(1),
              element: guardElement(pageUiAccess.myEarnings, <MyEarningsPage />),
            },
            {
              path: routes.payroll.slice(1),
              element: guardElement(pageUiAccess.payroll, <PayrollPage />),
            },
            {
              path: routes.featureAccess.slice(1),
              element: guardElement(pageUiAccess.featureAccess, <FeatureAccessPage />),
            },
            {
              path: `${routes.featureAccess.slice(1)}/:salonBusinessId`,
              element: guardElement(pageUiAccess.featureAccess, <FeatureAccessPage />),
            },
            {
              path: routes.queueTokens.slice(1),
              element: guardElement(pageUiAccess.queueTokens, <QueueTokensPage />),
            },
            {
              path: `${routes.queueTokens.slice(1)}/new`,
              element: guardElement(pageUiAccess.queueTokenCreate, <QueueTokenFormPage />),
            },
            {
              path: `${routes.queueTokens.slice(1)}/:id`,
              element: guardElement(pageUiAccess.queueTokenDetail, <QueueTokenDetailPage />),
            },
            {
              path: routes.appointments.slice(1),
              element: guardElement(pageUiAccess.appointments, <AppointmentsPage />),
            },
            {
              path: `${routes.appointments.slice(1)}/new`,
              element: guardElement(
                pageUiAccess.appointmentCreate,
                <AppointmentFormPage mode="create" />,
              ),
            },
            {
              path: `${routes.appointments.slice(1)}/:id`,
              element: guardElement(
                pageUiAccess.appointmentDetail,
                <AppointmentDetailPage />,
              ),
            },
            {
              path: `${routes.appointments.slice(1)}/:id/edit`,
              element: guardElement(
                pageUiAccess.appointmentEdit,
                <AppointmentFormPage mode="edit" />,
              ),
            },
            {
              path: routes.invoices.slice(1),
              element: guardElement(pageUiAccess.invoices, <InvoicesPage />),
            },
            {
              path: `${routes.invoices.slice(1)}/new`,
              element: guardElement(pageUiAccess.invoiceCreate, <InvoiceFormPage mode="create" />),
            },
            {
              path: `${routes.invoices.slice(1)}/:id`,
              element: guardElement(pageUiAccess.invoiceDetail, <InvoiceDetailPage />),
            },
            {
              path: `${routes.invoices.slice(1)}/:id/edit`,
              element: guardElement(pageUiAccess.invoiceEdit, <InvoiceFormPage mode="edit" />),
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
