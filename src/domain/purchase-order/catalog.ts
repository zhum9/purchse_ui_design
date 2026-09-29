/** Prototype reference directory. Replace through pur_reference/pur_org/pur_user APIs in production. */
export const catalog = {
  companies: [{ id: '100', name: '北方粮食集团' }],
  organizations: [{ id: '110', name: '原料采购中心' }, { id: '120', name: '生产采购部' }, { id: '130', name: '间接采购部' }, { id: '140', name: '设备采购部' }],
  groups: [{ id: '111', name: '粮食采购组' }, { id: '121', name: '包材采购组' }, { id: '131', name: 'IT采购组' }, { id: '132', name: '维修服务组' }, { id: '141', name: '机械设备组' }],
  suppliers: [
    { id: '201', name: '辽宁丰禾粮食有限公司' }, { id: '202', name: '华信数智科技有限公司' },
    { id: '203', name: '北方机电维修服务有限公司' }, { id: '204', name: '中粮包装科技有限公司' },
    { id: '205', name: '精工自动化设备有限公司' }, { id: '206', name: '安衡检测认证有限公司' },
  ],
  units: [{ id: '301', name: '吨' }, { id: '302', name: '件' }, { id: '303', name: '批' }, { id: '304', name: '台' }, { id: '305', name: '月' }, { id: '306', name: '工时' }, { id: '307', name: '项' }],
  materials: [{ id: '401', name: '一级玉米', code: 'MAT00001' }, { id: '402', name: '食品级复合包装袋', code: 'MAT00326' }, { id: '403', name: '输送线驱动电机', code: 'MAT00881' }],
  categories: [{ id: '501', name: '原粮' }, { id: '502', name: '包装材料' }, { id: '503', name: '维修耗材' }, { id: '504', name: 'IT服务' }, { id: '505', name: '维修服务' }, { id: '506', name: '检测服务' }],
  plants: [{ id: '601', name: '沈阳工厂（1000）' }, { id: '602', name: '大连工厂（1200）' }],
  locations: [{ id: '611', name: '原粮一库（1001）' }, { id: '612', name: '包材库（1201）' }, { id: '613', name: '备件库（1010）' }],
  paymentTerms: [{ id: '701', name: '验收后30天付款' }, { id: '702', name: '验收后60天付款' }, { id: '703', name: '按约定阶段结算' }],
  deliveryTerms: [{ id: '711', name: '送货至指定地点' }, { id: '712', name: '现场交付服务成果' }],
  users: [{ id: '801', name: '张敏（采购员）' }, { id: '802', name: '周建国（采购主管）' }, { id: '803', name: '赵强（验收负责人）' }],
};
export type CatalogGroup = keyof typeof catalog;
export const refName = (group: CatalogGroup, id?: string) => catalog[group].find((entry) => entry.id === id)?.name ?? '待补充';
export const refId = (group: CatalogGroup, name?: string) => catalog[group].find((entry) => entry.name === name)?.id;
export const refOptions = (group: CatalogGroup) => catalog[group].map((entry) => ({ value: entry.id, label: entry.name }));
