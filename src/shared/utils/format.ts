import dayjs from 'dayjs';

export const formatMoney = (value: number, currency = 'CNY') =>
  new Intl.NumberFormat('zh-CN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);

export const formatQuantity = (value: number, unit: string) =>
  `${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 3 }).format(value)} ${unit}`;

export const formatDate = (value: string) => dayjs(value).format('YYYY-MM-DD');
export const formatDateTime = (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm');
