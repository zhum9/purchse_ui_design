import { createHashRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@layouts/AppLayout';
import { Result } from 'antd';
import { PageLoading } from '@shared/components/PageState';

export const router = createHashRouter([
  {
    path: '/', element: <AppLayout />, HydrateFallback: PageLoading, children: [
      { index: true, element: <Navigate to="/fulfillment/workbench" replace /> },
      { path: 'work/tasks', lazy: async () => ({ Component: (await import('@features/work/pages/MyWorkPage')).MyWorkPage }) },
      { path: 'planning/demands', lazy: async () => ({ Component: (await import('@features/procurement-planning')).ProcurementDemandListPage }) },
      { path: 'planning/aggregation', lazy: async () => ({ Component: (await import('@features/procurement-planning')).DemandAggregationPage }) },
      { path: 'planning/plans', lazy: async () => ({ Component: (await import('@features/procurement-planning')).ProcurementPlanListPage }) },
      { path: 'planning/plans/new', lazy: async () => ({ Component: (await import('@features/procurement-planning/pages/ProcurementPlanEditorPage')).ProcurementPlanEditorPage }) },
      { path: 'planning/plans/:id', lazy: async () => ({ Component: (await import('@features/procurement-planning')).ProcurementPlanDetailPage }) },
      { path: 'purchase-orders/new', lazy: async () => ({ Component: (await import('@features/purchase-order')).PurchaseOrderEditorPage }) },
      { path: 'purchase-orders/:id/edit', lazy: async () => ({ Component: (await import('@features/purchase-order')).PurchaseOrderEditorPage }) },
      { path: 'purchase-orders', lazy: async () => ({ Component: (await import('@features/purchase-order')).PurchaseOrderListPage }) },
      { path: 'purchase-orders/:id', lazy: async () => ({ Component: (await import('@features/purchase-order')).PurchaseOrderDetailPage }) },
      { path: 'fulfillment', element: <Navigate to="/fulfillment/workbench" replace /> },
      { path: 'fulfillment/workbench', lazy: async () => ({ Component: (await import('@features/fulfillment')).FulfillmentWorkbenchPage }) },
      { path: 'fulfillment/records', lazy: async () => ({ Component: (await import('@features/fulfillment')).FulfillmentRecordsPage }) },
      { path: 'fulfillment/service/:itemId', lazy: async () => ({ Component: (await import('@features/fulfillment')).ServiceAcceptancePage }) },
      { path: 'returns', lazy: async () => ({ Component: (await import('@features/return-reversal')).ReturnReversalPage }) },
      { path: 'sap/monitor', lazy: async () => ({ Component: (await import('@features/sap-integration')).SapMonitorPage }) },
      { path: 'sap/reconciliation', lazy: async () => ({ Component: (await import('@features/sap-integration')).SapReconciliationPage }) },
      { path: 'settings/execution-scenarios', lazy: async () => ({ Component: (await import('@features/execution-config')).ExecutionConfigPage }) },
      { path: 'settings/field-rules', lazy: async () => ({ Component: (await import('@features/execution-config')).DynamicFieldRulesPage }) },
      { path: '*', element: <Result status="404" title="页面不存在" subTitle="请从左侧导航选择需要处理的业务。" /> },
    ],
  },
]);
