import type { ReactNode } from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import locale from 'antd/locale/zh_CN';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { appTheme } from './theme';

export function AppProviders({ children }: { children: ReactNode }) {
  return <ConfigProvider locale={locale} theme={appTheme}><AntdApp><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></AntdApp></ConfigProvider>;
}
