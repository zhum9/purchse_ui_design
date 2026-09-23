import type { ThemeConfig } from 'antd';

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#165dff',
    colorInfo: '#165dff',
    colorSuccess: '#2f8f57',
    colorWarning: '#d97706',
    colorError: '#cf3341',
    colorText: '#1f2937',
    colorTextSecondary: '#667085',
    colorBgLayout: '#f3f5f8',
    colorBorderSecondary: '#e5e9f0',
    borderRadius: 6,
    borderRadiusLG: 8,
    fontSize: 14,
    controlHeight: 34,
  },
  components: {
    Layout: { headerBg: '#ffffff', siderBg: '#10254a', bodyBg: '#f3f5f8' },
    Menu: { darkItemBg: '#10254a', darkSubMenuItemBg: '#0b1d3a', darkItemSelectedBg: '#165dff' },
    Table: { headerBg: '#f6f8fa', headerColor: '#344054', headerSplitColor: '#e5e9f0', cellPaddingBlockSM: 10 },
    Card: { headerFontSize: 15 },
    Tabs: { horizontalMargin: '0 0 16px 0' },
  },
};
