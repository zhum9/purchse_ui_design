import type { ThemeConfig } from 'antd';

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#4d79ed',
    colorInfo: '#4d79ed',
    colorSuccess: '#2f8f57',
    colorWarning: '#d97706',
    colorError: '#cf3341',
    colorText: '#1f2937',
    colorTextSecondary: '#667085',
    colorBgLayout: '#f5f6f8',
    colorBorderSecondary: '#e5e9f0',
    borderRadius: 3,
    borderRadiusLG: 4,
    fontSize: 14,
    controlHeight: 34,
  },
  components: {
    Layout: { headerBg: '#376bd3', siderBg: '#ffffff', bodyBg: '#f5f6f8' },
    Menu: { itemBg: '#ffffff', subMenuItemBg: '#ffffff', itemSelectedBg: '#edf2ff', itemSelectedColor: '#376bd3', itemColor: '#475467', itemBorderRadius: 0, itemMarginInline: 0, itemHeight: 42 },
    Table: { headerBg: '#f6f8fa', headerColor: '#344054', headerSplitColor: '#e5e9f0', cellPaddingBlockSM: 10 },
    Card: { headerFontSize: 15 },
    Tabs: { horizontalMargin: '0 0 16px 0' },
  },
};
