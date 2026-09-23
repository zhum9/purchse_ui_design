import { createHashRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@layouts/AppLayout';
import { Result } from 'antd';
import { PageLoading } from '@shared/components/PageState';
import { PurchaseOrderDetailPage, PurchaseOrderEditorPage, PurchaseOrderListPage } from '@features/purchase-order';
import { DemandAggregationPage, ProcurementDemandListPage, ProcurementPlanDetailPage, ProcurementPlanListPage } from '@features/procurement-planning';
import { FulfillmentRecordsPage, FulfillmentWorkbenchPage, ServiceAcceptancePage } from '@features/fulfillment';
import { ReturnReversalPage } from '@features/return-reversal';
import { SapMonitorPage, SapReconciliationPage } from '@features/sap-integration';
import { DynamicFieldRulesPage, ExecutionConfigPage } from '@features/execution-config';

export const router = createHashRouter([
  {
    path: '/', element: <AppLayout />, HydrateFallback: PageLoading, children: [
      { index: true, element: <Navigate to="/fulfillment/workbench" replace /> },
      { path: 'planning/demands', element: <ProcurementDemandListPage /> },
      { path: 'planning/aggregation', element: <DemandAggregationPage /> },
      { path: 'planning/plans', element: <ProcurementPlanListPage /> },
      { path: 'planning/plans/:id', element: <ProcurementPlanDetailPage /> },
      { path: 'purchase-orders/new', element: <PurchaseOrderEditorPage /> },
      { path: 'purchase-orders/:id/edit', element: <PurchaseOrderEditorPage /> },
      { path: 'purchase-orders', element: <PurchaseOrderListPage /> },
      { path: 'purchase-orders/:id', element: <PurchaseOrderDetailPage /> },
      { path: 'fulfillment', element: <Navigate to="/fulfillment/workbench" replace /> },
      { path: 'fulfillment/workbench', element: <FulfillmentWorkbenchPage /> },
      { path: 'fulfillment/records', element: <FulfillmentRecordsPage /> },
      { path: 'fulfillment/service/:itemId', element: <ServiceAcceptancePage /> },
      { path: 'returns', element: <ReturnReversalPage /> },
      { path: 'sap/monitor', element: <SapMonitorPage /> },
      { path: 'sap/reconciliation', element: <SapReconciliationPage /> },
      { path: 'settings/execution-scenarios', element: <ExecutionConfigPage /> },
      { path: 'settings/field-rules', element: <DynamicFieldRulesPage /> },
      { path: '*', element: <Result status="404" title="页面不存在" subTitle="请从左侧导航选择需要处理的业务。" /> },
    ],
  },
]);
