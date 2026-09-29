-- 采购执行中心核心业务 V1.1
-- 目标：KingbaseES V8 / Oracle 兼容模式；UTF-8。
-- 仅用于新建空 schema；由 DBA 先选择目标 schema，并将客户端配置为遇错停止。
-- 不创建或切换数据库、用户、schema；不包含删除/清库/覆盖语句；不支持盲目重复执行。
-- 全部表、序列、索引和约束采用 pur_ 前缀，不设置物理外键或级联删除。
-- 未在用户数据库执行；具体补丁/驱动需隔离库核验。参见 README.md。
-- 表间归属、状态流转、并发额度、JSON结构及正式历史不可变由业务服务在事务内校验。
-- 时间由应用显式传入 UTC；业务 DATE 归一到自然日零时。
-- 主键不设置隐式自增默认值：应用统一取序列值或使用经确认的ID服务，禁止混用。
-- 技术主键有间断正常，不用它保证业务单号连续；不得使用 MAX(id)+1。
-- 公共审计字段：业务服务填写操作者、时间；row_version 从0开始且受控递增。
-- 本脚本不初始化演示业务、不写默认账户、不设置任何数据库密码。


CREATE SEQUENCE pur_core_id_seq
    INCREMENT BY 1
    START WITH 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 100
    NOCYCLE;

COMMENT ON SEQUENCE pur_core_id_seq IS '采购执行中心统一技术ID序列，应用显式取值；不保证号码连续';

-- 组织参考目录
CREATE TABLE pur_org (
    id NUMBER(19,0) NOT NULL,
    org_type VARCHAR2(64 CHAR) NOT NULL,
    org_code VARCHAR2(64 CHAR) NOT NULL,
    name VARCHAR2(200 CHAR) NOT NULL,
    parent_id NUMBER(19,0),
    company_id NUMBER(19,0),
    active NUMBER(1,0) DEFAULT 1 NOT NULL,
    external_system VARCHAR2(64 CHAR),
    external_code VARCHAR2(64 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_org_pk PRIMARY KEY (id),
    CONSTRAINT pur_org_u01 UNIQUE (org_type, org_code),
    CONSTRAINT pur_org_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (parent_id BETWEEN 1 AND 9223372036854775807) AND (company_id BETWEEN 1 AND 9223372036854775807) AND (active IN (0,1)) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_org_c02 CHECK (org_type IN ('COMPANY', 'PURCHASE_ORG', 'PURCHASE_GROUP', 'DEPARTMENT', 'PLANT')),
    CONSTRAINT pur_org_c03 CHECK (parent_id <> id)
);

COMMENT ON TABLE pur_org IS '组织参考目录';
COMMENT ON COLUMN pur_org.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_org.org_type IS '组织类型：法人、采购组织、采购组、部门、工厂';
COMMENT ON COLUMN pur_org.org_code IS '组织业务编码';
COMMENT ON COLUMN pur_org.name IS '组织名称';
COMMENT ON COLUMN pur_org.parent_id IS '上级组织ID，逻辑关联';
COMMENT ON COLUMN pur_org.company_id IS '所属法人组织ID';
COMMENT ON COLUMN pur_org.active IS '是否有效';
COMMENT ON COLUMN pur_org.external_system IS '外部来源系统';
COMMENT ON COLUMN pur_org.external_code IS '外部组织编码';
COMMENT ON COLUMN pur_org.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_org.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_org.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_org.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_org.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_org_i01 ON pur_org (parent_id);

CREATE INDEX pur_org_i02 ON pur_org (company_id, active);

-- 用户身份映射，不保存密码
CREATE TABLE pur_user (
    id NUMBER(19,0) NOT NULL,
    identity_subject VARCHAR2(200 CHAR) NOT NULL,
    display_name VARCHAR2(200 CHAR) NOT NULL,
    department_id NUMBER(19,0),
    active NUMBER(1,0) DEFAULT 1 NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_user_pk PRIMARY KEY (id),
    CONSTRAINT pur_user_u01 UNIQUE (identity_subject),
    CONSTRAINT pur_user_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (department_id BETWEEN 1 AND 9223372036854775807) AND (active IN (0,1)) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0))
);

COMMENT ON TABLE pur_user IS '用户身份映射，不保存密码';
COMMENT ON COLUMN pur_user.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_user.identity_subject IS '外部身份系统唯一主体';
COMMENT ON COLUMN pur_user.display_name IS '显示姓名';
COMMENT ON COLUMN pur_user.department_id IS '所属部门ID';
COMMENT ON COLUMN pur_user.active IS '是否有效';
COMMENT ON COLUMN pur_user.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_user.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_user.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_user.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_user.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_user_i01 ON pur_user (department_id, active);

-- 业务角色
CREATE TABLE pur_role (
    id NUMBER(19,0) NOT NULL,
    role_code VARCHAR2(64 CHAR) NOT NULL,
    name VARCHAR2(200 CHAR) NOT NULL,
    active NUMBER(1,0) DEFAULT 1 NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_role_pk PRIMARY KEY (id),
    CONSTRAINT pur_role_u01 UNIQUE (role_code),
    CONSTRAINT pur_role_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (active IN (0,1)) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0))
);

COMMENT ON TABLE pur_role IS '业务角色';
COMMENT ON COLUMN pur_role.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_role.role_code IS '角色编码';
COMMENT ON COLUMN pur_role.name IS '角色名称';
COMMENT ON COLUMN pur_role.active IS '是否有效';
COMMENT ON COLUMN pur_role.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_role.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_role.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_role.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_role.row_version IS '乐观锁版本，更新时递增';

-- 角色与产品权限目录映射
CREATE TABLE pur_role_permission (
    role_id NUMBER(19,0) NOT NULL,
    permission_code VARCHAR2(64 CHAR) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_role_permission_pk PRIMARY KEY (role_id, permission_code),
    CONSTRAINT pur_role_permission_c01 CHECK ((role_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0))
);

COMMENT ON TABLE pur_role_permission IS '角色与产品权限目录映射';
COMMENT ON COLUMN pur_role_permission.role_id IS '角色ID';
COMMENT ON COLUMN pur_role_permission.permission_code IS '产品权限编码';
COMMENT ON COLUMN pur_role_permission.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_role_permission.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_role_permission.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_role_permission.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_role_permission.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_role_permission_i01 ON pur_role_permission (permission_code);

-- 用户角色及组织授权范围
CREATE TABLE pur_user_role_scope (
    id NUMBER(19,0) NOT NULL,
    user_id NUMBER(19,0) NOT NULL,
    role_id NUMBER(19,0) NOT NULL,
    scope_type VARCHAR2(64 CHAR) NOT NULL,
    scope_key VARCHAR2(64 CHAR) NOT NULL,
    org_id NUMBER(19,0),
    valid_from TIMESTAMP(6) NOT NULL,
    valid_to TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_user_role_scope_pk PRIMARY KEY (id),
    CONSTRAINT pur_user_role_scope_u01 UNIQUE (user_id, role_id, scope_type, scope_key),
    CONSTRAINT pur_user_role_scope_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (user_id BETWEEN 1 AND 9223372036854775807) AND (role_id BETWEEN 1 AND 9223372036854775807) AND (org_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_user_role_scope_c02 CHECK (scope_type IN ('COMPANY', 'PURCHASE_ORG', 'PURCHASE_GROUP', 'DEPARTMENT', 'PLANT', 'SELF', 'ALL')),
    CONSTRAINT pur_user_role_scope_c03 CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

COMMENT ON TABLE pur_user_role_scope IS '用户角色及组织授权范围';
COMMENT ON COLUMN pur_user_role_scope.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_user_role_scope.user_id IS '被授权用户ID';
COMMENT ON COLUMN pur_user_role_scope.role_id IS '角色ID';
COMMENT ON COLUMN pur_user_role_scope.scope_type IS '授权范围类型，不默认ALL';
COMMENT ON COLUMN pur_user_role_scope.scope_key IS '规范化且非空的范围键';
COMMENT ON COLUMN pur_user_role_scope.org_id IS '对应组织ID';
COMMENT ON COLUMN pur_user_role_scope.valid_from IS '授权开始时间，UTC';
COMMENT ON COLUMN pur_user_role_scope.valid_to IS '授权结束时间，UTC';
COMMENT ON COLUMN pur_user_role_scope.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_user_role_scope.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_user_role_scope.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_user_role_scope.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_user_role_scope.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_user_role_scope_i01 ON pur_user_role_scope (role_id);

CREATE INDEX pur_user_role_scope_i02 ON pur_user_role_scope (org_id);

-- 供应商、物料、单位等外部参考目录
CREATE TABLE pur_reference (
    id NUMBER(19,0) NOT NULL,
    ref_type VARCHAR2(64 CHAR) NOT NULL,
    ref_code VARCHAR2(64 CHAR) NOT NULL,
    name VARCHAR2(200 CHAR) NOT NULL,
    company_id NUMBER(19,0),
    active NUMBER(1,0) DEFAULT 1 NOT NULL,
    source_system VARCHAR2(64 CHAR) NOT NULL,
    external_id VARCHAR2(64 CHAR),
    attributes CLOB,
    synced_at TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_reference_pk PRIMARY KEY (id),
    CONSTRAINT pur_reference_u01 UNIQUE (ref_type, source_system, ref_code),
    CONSTRAINT pur_reference_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (company_id BETWEEN 1 AND 9223372036854775807) AND (active IN (0,1)) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0))
);

COMMENT ON TABLE pur_reference IS '供应商、物料、单位等外部参考目录';
COMMENT ON COLUMN pur_reference.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_reference.ref_type IS '目录类型，由应用验证具体业务类型';
COMMENT ON COLUMN pur_reference.ref_code IS '目录业务编码';
COMMENT ON COLUMN pur_reference.name IS '显示名称';
COMMENT ON COLUMN pur_reference.company_id IS '适用法人ID，可为空表示共享目录';
COMMENT ON COLUMN pur_reference.active IS '是否有效';
COMMENT ON COLUMN pur_reference.source_system IS '来源系统';
COMMENT ON COLUMN pur_reference.external_id IS '外部记录标识';
COMMENT ON COLUMN pur_reference.attributes IS '经应用校验的扩展属性JSON';
COMMENT ON COLUMN pur_reference.synced_at IS '最近同步时间，UTC';
COMMENT ON COLUMN pur_reference.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_reference.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_reference.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_reference.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_reference.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_reference_i01 ON pur_reference (company_id, ref_type, active);

-- 有依据的单位换算关系
CREATE TABLE pur_unit_conversion (
    id NUMBER(19,0) NOT NULL,
    item_ref_id NUMBER(19,0),
    from_uom_id NUMBER(19,0) NOT NULL,
    to_uom_id NUMBER(19,0) NOT NULL,
    numerator NUMBER(24,10) NOT NULL,
    denominator NUMBER(24,10) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE,
    source_ref VARCHAR2(80 CHAR) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_unit_conversion_pk PRIMARY KEY (id),
    CONSTRAINT pur_unit_conversion_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (item_ref_id BETWEEN 1 AND 9223372036854775807) AND (from_uom_id BETWEEN 1 AND 9223372036854775807) AND (to_uom_id BETWEEN 1 AND 9223372036854775807) AND (numerator >= 0) AND (denominator >= 0) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_unit_conversion_c02 CHECK (numerator > 0),
    CONSTRAINT pur_unit_conversion_c03 CHECK (denominator > 0),
    CONSTRAINT pur_unit_conversion_c04 CHECK (from_uom_id <> to_uom_id),
    CONSTRAINT pur_unit_conversion_c05 CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

COMMENT ON TABLE pur_unit_conversion IS '有依据的单位换算关系';
COMMENT ON COLUMN pur_unit_conversion.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_unit_conversion.item_ref_id IS '适用物料参考ID';
COMMENT ON COLUMN pur_unit_conversion.from_uom_id IS '来源单位ID';
COMMENT ON COLUMN pur_unit_conversion.to_uom_id IS '目标单位ID';
COMMENT ON COLUMN pur_unit_conversion.numerator IS '换算分子';
COMMENT ON COLUMN pur_unit_conversion.denominator IS '换算分母';
COMMENT ON COLUMN pur_unit_conversion.valid_from IS '有效起始日';
COMMENT ON COLUMN pur_unit_conversion.valid_to IS '有效终止日';
COMMENT ON COLUMN pur_unit_conversion.source_ref IS '换算依据编号';
COMMENT ON COLUMN pur_unit_conversion.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_unit_conversion.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_unit_conversion.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_unit_conversion.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_unit_conversion.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_unit_conversion_i01 ON pur_unit_conversion (item_ref_id, from_uom_id, to_uom_id, valid_from);

-- 业务单据稳定身份
CREATE TABLE pur_document (
    id NUMBER(19,0) NOT NULL,
    document_type VARCHAR2(64 CHAR) NOT NULL,
    document_no VARCHAR2(80 CHAR) NOT NULL,
    company_id NUMBER(19,0) NOT NULL,
    owner_id NUMBER(19,0) NOT NULL,
    lifecycle_status VARCHAR2(64 CHAR) DEFAULT 'DRAFT' NOT NULL,
    effective_revision_id NUMBER(19,0),
    working_revision_id NUMBER(19,0),
    hold_reason VARCHAR2(2000 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_document_pk PRIMARY KEY (id),
    CONSTRAINT pur_document_u01 UNIQUE (document_no),
    CONSTRAINT pur_document_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (company_id BETWEEN 1 AND 9223372036854775807) AND (owner_id BETWEEN 1 AND 9223372036854775807) AND (effective_revision_id BETWEEN 1 AND 9223372036854775807) AND (working_revision_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_document_c02 CHECK (document_type IN ('DEMAND', 'PLAN', 'ORDER', 'EXECUTION')),
    CONSTRAINT pur_document_c03 CHECK (lifecycle_status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED'))
);

COMMENT ON TABLE pur_document IS '业务单据稳定身份';
COMMENT ON COLUMN pur_document.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_document.document_type IS '单据类型';
COMMENT ON COLUMN pur_document.document_no IS '唯一业务单号';
COMMENT ON COLUMN pur_document.company_id IS '所属法人ID';
COMMENT ON COLUMN pur_document.owner_id IS '当前业务负责人ID';
COMMENT ON COLUMN pur_document.lifecycle_status IS '单据生命周期';
COMMENT ON COLUMN pur_document.effective_revision_id IS '当前正式版本ID，服务端校验属于本单';
COMMENT ON COLUMN pur_document.working_revision_id IS '唯一工作或在途版本ID，服务端校验属于本单';
COMMENT ON COLUMN pur_document.hold_reason IS '整单冻结原因';
COMMENT ON COLUMN pur_document.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_document.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_document.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_document.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_document.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_document_i01 ON pur_document (company_id, document_type, lifecycle_status, updated_at, id);

CREATE INDEX pur_document_i02 ON pur_document (owner_id, updated_at, id);

CREATE INDEX pur_document_i03 ON pur_document (effective_revision_id);

CREATE INDEX pur_document_i04 ON pur_document (working_revision_id);

-- 单据内容版本及审批进度
CREATE TABLE pur_document_revision (
    id NUMBER(19,0) NOT NULL,
    document_id NUMBER(19,0) NOT NULL,
    revision_no NUMBER(10,0) NOT NULL,
    base_revision_id NUMBER(19,0),
    revision_status VARCHAR2(64 CHAR) DEFAULT 'WORKING' NOT NULL,
    approval_status VARCHAR2(64 CHAR) DEFAULT 'NOT_SUBMITTED' NOT NULL,
    rule_bundle_id NUMBER(19,0),
    change_reason VARCHAR2(2000 CHAR),
    submitted_at TIMESTAMP(6),
    authorized_at TIMESTAMP(6),
    effective_at TIMESTAMP(6),
    content_hash VARCHAR2(64 CHAR),
    snapshot CLOB,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_document_revision_pk PRIMARY KEY (id),
    CONSTRAINT pur_document_revision_u01 UNIQUE (document_id, revision_no),
    CONSTRAINT pur_document_revision_u02 UNIQUE (document_id, id),
    CONSTRAINT pur_document_revision_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (document_id BETWEEN 1 AND 9223372036854775807) AND (revision_no >= 0) AND (base_revision_id BETWEEN 1 AND 9223372036854775807) AND (rule_bundle_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_document_revision_c02 CHECK (revision_no > 0),
    CONSTRAINT pur_document_revision_c03 CHECK (base_revision_id <> id),
    CONSTRAINT pur_document_revision_c04 CHECK (revision_status IN ('WORKING', 'SUBMITTED', 'AUTHORIZED', 'EFFECTIVE', 'SUPERSEDED', 'REJECTED', 'WITHDRAWN')),
    CONSTRAINT pur_document_revision_c05 CHECK (approval_status IN ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED'))
);

COMMENT ON TABLE pur_document_revision IS '单据内容版本及审批进度';
COMMENT ON COLUMN pur_document_revision.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_document_revision.document_id IS '所属稳定单据ID';
COMMENT ON COLUMN pur_document_revision.revision_no IS '单据内版本号，从1开始';
COMMENT ON COLUMN pur_document_revision.base_revision_id IS '变更基线版本ID，必须属于同单据';
COMMENT ON COLUMN pur_document_revision.revision_status IS '版本状态';
COMMENT ON COLUMN pur_document_revision.approval_status IS '审批状态';
COMMENT ON COLUMN pur_document_revision.rule_bundle_id IS '冻结的规则版本包ID';
COMMENT ON COLUMN pur_document_revision.change_reason IS '变更原因';
COMMENT ON COLUMN pur_document_revision.submitted_at IS '提交时间，UTC';
COMMENT ON COLUMN pur_document_revision.authorized_at IS '内部批准时间，UTC';
COMMENT ON COLUMN pur_document_revision.effective_at IS '正式生效时间，UTC';
COMMENT ON COLUMN pur_document_revision.content_hash IS '冻结业务内容摘要';
COMMENT ON COLUMN pur_document_revision.snapshot IS '经应用校验的业务内容快照JSON';
COMMENT ON COLUMN pur_document_revision.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_document_revision.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_document_revision.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_document_revision.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_document_revision.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_document_revision_i01 ON pur_document_revision (base_revision_id);

CREATE INDEX pur_document_revision_i02 ON pur_document_revision (rule_bundle_id);

-- 跨版本稳定业务行身份
CREATE TABLE pur_document_line (
    id NUMBER(19,0) NOT NULL,
    document_id NUMBER(19,0) NOT NULL,
    line_no VARCHAR2(20 CHAR) NOT NULL,
    line_kind VARCHAR2(64 CHAR) NOT NULL,
    retired_at TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_document_line_pk PRIMARY KEY (id),
    CONSTRAINT pur_document_line_u01 UNIQUE (document_id, line_no),
    CONSTRAINT pur_document_line_u02 UNIQUE (document_id, id),
    CONSTRAINT pur_document_line_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (document_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0))
);

COMMENT ON TABLE pur_document_line IS '跨版本稳定业务行身份';
COMMENT ON COLUMN pur_document_line.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_document_line.document_id IS '所属稳定单据ID';
COMMENT ON COLUMN pur_document_line.line_no IS '单据内行号，保留前导零';
COMMENT ON COLUMN pur_document_line.line_kind IS '行业务类型，由应用按单据类型校验';
COMMENT ON COLUMN pur_document_line.retired_at IS '停止使用时间，UTC；历史身份保留';
COMMENT ON COLUMN pur_document_line.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_document_line.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_document_line.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_document_line.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_document_line.row_version IS '乐观锁版本，更新时递增';

-- 采购需求单版本内容
CREATE TABLE pur_demand_header (
    revision_id NUMBER(19,0) NOT NULL,
    title VARCHAR2(200 CHAR),
    requester_id NUMBER(19,0),
    department_id NUMBER(19,0),
    purpose VARCHAR2(2000 CHAR),
    priority VARCHAR2(64 CHAR) DEFAULT 'NORMAL' NOT NULL,
    default_required_date DATE,
    currency_code VARCHAR2(3 CHAR),
    notes VARCHAR2(2000 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_demand_header_pk PRIMARY KEY (revision_id),
    CONSTRAINT pur_demand_header_c01 CHECK ((revision_id BETWEEN 1 AND 9223372036854775807) AND (requester_id BETWEEN 1 AND 9223372036854775807) AND (department_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_demand_header_c02 CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
);

COMMENT ON TABLE pur_demand_header IS '采购需求单版本内容';
COMMENT ON COLUMN pur_demand_header.revision_id IS '需求单版本ID';
COMMENT ON COLUMN pur_demand_header.title IS '需求主题';
COMMENT ON COLUMN pur_demand_header.requester_id IS '申请人ID';
COMMENT ON COLUMN pur_demand_header.department_id IS '申请部门ID';
COMMENT ON COLUMN pur_demand_header.purpose IS '用途';
COMMENT ON COLUMN pur_demand_header.priority IS '优先级';
COMMENT ON COLUMN pur_demand_header.default_required_date IS '默认需求日期';
COMMENT ON COLUMN pur_demand_header.currency_code IS '估算币种';
COMMENT ON COLUMN pur_demand_header.notes IS '补充说明';
COMMENT ON COLUMN pur_demand_header.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_demand_header.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_demand_header.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_demand_header.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_demand_header.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_demand_header_i01 ON pur_demand_header (requester_id);

CREATE INDEX pur_demand_header_i02 ON pur_demand_header (department_id);

-- 采购需求行版本内容
CREATE TABLE pur_demand_line (
    revision_id NUMBER(19,0) NOT NULL,
    line_id NUMBER(19,0) NOT NULL,
    document_id NUMBER(19,0) NOT NULL,
    product_kind VARCHAR2(64 CHAR) NOT NULL,
    identification_mode VARCHAR2(64 CHAR) NOT NULL,
    item_ref_id NUMBER(19,0),
    content VARCHAR2(200 CHAR),
    category_id NUMBER(19,0),
    specification VARCHAR2(2000 CHAR),
    control_dimension VARCHAR2(64 CHAR) NOT NULL,
    authorized_qty NUMBER(20,6),
    uom_id NUMBER(19,0),
    authorized_amount NUMBER(20,6),
    currency_code VARCHAR2(3 CHAR),
    amount_basis VARCHAR2(64 CHAR),
    estimated_unit_price NUMBER(24,10),
    price_quantity NUMBER(24,10),
    price_uom_id NUMBER(19,0),
    price_input_basis VARCHAR2(64 CHAR),
    conversion_numerator NUMBER(24,10),
    conversion_denominator NUMBER(24,10),
    conversion_source_id NUMBER(19,0),
    tax_code_id NUMBER(19,0),
    tax_rate NUMBER(18,10),
    tax_confirmed NUMBER(1,0) DEFAULT 0 NOT NULL,
    estimated_net NUMBER(20,6),
    estimated_tax NUMBER(20,6),
    estimated_gross NUMBER(20,6),
    estimate_source VARCHAR2(2000 CHAR),
    required_date DATE,
    delivery_location_id NUMBER(19,0),
    using_department_id NUMBER(19,0),
    project_ref_id NUMBER(19,0),
    service_start DATE,
    service_end DATE,
    suggested_supplier_id NUMBER(19,0),
    suggested_supplier_text VARCHAR2(200 CHAR),
    supplier_reason VARCHAR2(2000 CHAR),
    acceptance_criteria VARCHAR2(2000 CHAR),
    acceptor_id NUMBER(19,0),
    closed_qty NUMBER(20,6) DEFAULT 0 NOT NULL,
    closed_amount NUMBER(20,6) DEFAULT 0 NOT NULL,
    closure_reason VARCHAR2(2000 CHAR),
    master_snapshot CLOB,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_demand_line_pk PRIMARY KEY (revision_id, line_id),
    CONSTRAINT pur_demand_line_c01 CHECK ((revision_id BETWEEN 1 AND 9223372036854775807) AND (line_id BETWEEN 1 AND 9223372036854775807) AND (document_id BETWEEN 1 AND 9223372036854775807) AND (item_ref_id BETWEEN 1 AND 9223372036854775807) AND (category_id BETWEEN 1 AND 9223372036854775807) AND (authorized_qty >= 0) AND (uom_id BETWEEN 1 AND 9223372036854775807) AND (authorized_amount >= 0) AND (estimated_unit_price >= 0) AND (price_quantity >= 0) AND (price_uom_id BETWEEN 1 AND 9223372036854775807) AND (conversion_numerator >= 0) AND (conversion_denominator >= 0) AND (conversion_source_id BETWEEN 1 AND 9223372036854775807) AND (tax_code_id BETWEEN 1 AND 9223372036854775807) AND (tax_rate BETWEEN 0 AND 1) AND (tax_confirmed IN (0,1)) AND (estimated_net >= 0) AND (estimated_tax >= 0) AND (estimated_gross >= 0) AND (delivery_location_id BETWEEN 1 AND 9223372036854775807) AND (using_department_id BETWEEN 1 AND 9223372036854775807) AND (project_ref_id BETWEEN 1 AND 9223372036854775807) AND (suggested_supplier_id BETWEEN 1 AND 9223372036854775807) AND (acceptor_id BETWEEN 1 AND 9223372036854775807) AND (closed_qty >= 0) AND (closed_amount >= 0) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_demand_line_c02 CHECK (product_kind IN ('GOODS', 'SERVICE')),
    CONSTRAINT pur_demand_line_c03 CHECK (identification_mode IN ('CODED', 'FREE_TEXT')),
    CONSTRAINT pur_demand_line_c04 CHECK (control_dimension IN ('QTY', 'AMOUNT')),
    CONSTRAINT pur_demand_line_c05 CHECK (amount_basis IN ('NET', 'GROSS')),
    CONSTRAINT pur_demand_line_c06 CHECK (price_input_basis IN ('NET', 'GROSS')),
    CONSTRAINT pur_demand_line_c07 CHECK (price_quantity > 0),
    CONSTRAINT pur_demand_line_c08 CHECK (conversion_numerator > 0),
    CONSTRAINT pur_demand_line_c09 CHECK (conversion_denominator > 0),
    CONSTRAINT pur_demand_line_c10 CHECK (service_end IS NULL OR service_start IS NULL OR service_end >= service_start),
    CONSTRAINT pur_demand_line_c11 CHECK (estimated_net + estimated_tax = estimated_gross),
    CONSTRAINT pur_demand_line_c12 CHECK (closed_qty <= authorized_qty),
    CONSTRAINT pur_demand_line_c13 CHECK (closed_amount <= authorized_amount)
);

COMMENT ON TABLE pur_demand_line IS '采购需求行版本内容';
COMMENT ON COLUMN pur_demand_line.revision_id IS '所属内容版本ID';
COMMENT ON COLUMN pur_demand_line.line_id IS '所属稳定业务行ID';
COMMENT ON COLUMN pur_demand_line.document_id IS '所属稳定单据ID';
COMMENT ON COLUMN pur_demand_line.product_kind IS '采购对象：货物或服务';
COMMENT ON COLUMN pur_demand_line.identification_mode IS '编码或自由描述标识方式';
COMMENT ON COLUMN pur_demand_line.item_ref_id IS '物料参考ID，可空';
COMMENT ON COLUMN pur_demand_line.content IS '采购内容描述';
COMMENT ON COLUMN pur_demand_line.category_id IS '采购品类参考ID';
COMMENT ON COLUMN pur_demand_line.specification IS '规格或服务范围说明';
COMMENT ON COLUMN pur_demand_line.control_dimension IS '来源授权控制维度：数量或金额';
COMMENT ON COLUMN pur_demand_line.authorized_qty IS '授权需求数量';
COMMENT ON COLUMN pur_demand_line.uom_id IS '业务单位ID';
COMMENT ON COLUMN pur_demand_line.authorized_amount IS '授权需求金额';
COMMENT ON COLUMN pur_demand_line.currency_code IS '币种';
COMMENT ON COLUMN pur_demand_line.amount_basis IS '金额控制含税或未税口径';
COMMENT ON COLUMN pur_demand_line.estimated_unit_price IS '估算单价，空表示未知';
COMMENT ON COLUMN pur_demand_line.price_quantity IS '计价基数';
COMMENT ON COLUMN pur_demand_line.price_uom_id IS '计价单位参考ID';
COMMENT ON COLUMN pur_demand_line.price_input_basis IS '单价含税或未税口径';
COMMENT ON COLUMN pur_demand_line.conversion_numerator IS '业务单位到计价单位换算分子';
COMMENT ON COLUMN pur_demand_line.conversion_denominator IS '业务单位到计价单位换算分母';
COMMENT ON COLUMN pur_demand_line.conversion_source_id IS '单位换算依据ID';
COMMENT ON COLUMN pur_demand_line.tax_code_id IS '税码参考ID';
COMMENT ON COLUMN pur_demand_line.tax_rate IS '税率，0到1；空表示未知';
COMMENT ON COLUMN pur_demand_line.tax_confirmed IS '税口径是否已确认';
COMMENT ON COLUMN pur_demand_line.estimated_net IS '估算未税金额';
COMMENT ON COLUMN pur_demand_line.estimated_tax IS '估算税额';
COMMENT ON COLUMN pur_demand_line.estimated_gross IS '估算含税金额';
COMMENT ON COLUMN pur_demand_line.estimate_source IS '估算依据';
COMMENT ON COLUMN pur_demand_line.required_date IS '原始要求日期';
COMMENT ON COLUMN pur_demand_line.delivery_location_id IS '交付地点参考ID';
COMMENT ON COLUMN pur_demand_line.using_department_id IS '使用部门ID';
COMMENT ON COLUMN pur_demand_line.project_ref_id IS '项目参考ID';
COMMENT ON COLUMN pur_demand_line.service_start IS '服务开始日';
COMMENT ON COLUMN pur_demand_line.service_end IS '服务结束日';
COMMENT ON COLUMN pur_demand_line.suggested_supplier_id IS '建议供应商参考ID，完全可选';
COMMENT ON COLUMN pur_demand_line.suggested_supplier_text IS '未进入目录的建议供应商名称，可选';
COMMENT ON COLUMN pur_demand_line.supplier_reason IS '供应商建议理由';
COMMENT ON COLUMN pur_demand_line.acceptance_criteria IS '验收要求';
COMMENT ON COLUMN pur_demand_line.acceptor_id IS '建议验收人ID';
COMMENT ON COLUMN pur_demand_line.closed_qty IS '不再采购的已关闭数量';
COMMENT ON COLUMN pur_demand_line.closed_amount IS '不再采购的已关闭金额';
COMMENT ON COLUMN pur_demand_line.closure_reason IS '关闭原因';
COMMENT ON COLUMN pur_demand_line.master_snapshot IS '目录名称、编码等展示快照JSON';
COMMENT ON COLUMN pur_demand_line.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_demand_line.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_demand_line.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_demand_line.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_demand_line.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_demand_line_i01 ON pur_demand_line (document_id, line_id);

CREATE INDEX pur_demand_line_i02 ON pur_demand_line (line_id);

CREATE INDEX pur_demand_line_i03 ON pur_demand_line (revision_id, required_date, line_id);

-- 执行采购计划版本内容
CREATE TABLE pur_plan_header (
    revision_id NUMBER(19,0) NOT NULL,
    name VARCHAR2(200 CHAR),
    purchase_org_id NUMBER(19,0),
    purchase_group_id NUMBER(19,0),
    buyer_id NUMBER(19,0),
    procurement_method VARCHAR2(64 CHAR),
    planned_order_date DATE,
    target_delivery_date DATE,
    currency_code VARCHAR2(3 CHAR),
    basis_note VARCHAR2(2000 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_plan_header_pk PRIMARY KEY (revision_id),
    CONSTRAINT pur_plan_header_c01 CHECK ((revision_id BETWEEN 1 AND 9223372036854775807) AND (purchase_org_id BETWEEN 1 AND 9223372036854775807) AND (purchase_group_id BETWEEN 1 AND 9223372036854775807) AND (buyer_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0))
);

COMMENT ON TABLE pur_plan_header IS '执行采购计划版本内容';
COMMENT ON COLUMN pur_plan_header.revision_id IS '计划版本ID';
COMMENT ON COLUMN pur_plan_header.name IS '计划名称';
COMMENT ON COLUMN pur_plan_header.purchase_org_id IS '采购组织ID';
COMMENT ON COLUMN pur_plan_header.purchase_group_id IS '采购组ID';
COMMENT ON COLUMN pur_plan_header.buyer_id IS '采购员ID';
COMMENT ON COLUMN pur_plan_header.procurement_method IS '采购方式';
COMMENT ON COLUMN pur_plan_header.planned_order_date IS '预计下单日';
COMMENT ON COLUMN pur_plan_header.target_delivery_date IS '目标交付日';
COMMENT ON COLUMN pur_plan_header.currency_code IS '估算币种';
COMMENT ON COLUMN pur_plan_header.basis_note IS '独立计划依据说明';
COMMENT ON COLUMN pur_plan_header.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_plan_header.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_plan_header.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_plan_header.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_plan_header.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_plan_header_i01 ON pur_plan_header (buyer_id);

CREATE INDEX pur_plan_header_i02 ON pur_plan_header (purchase_org_id, planned_order_date);

-- 执行采购计划行版本内容
CREATE TABLE pur_plan_line (
    revision_id NUMBER(19,0) NOT NULL,
    line_id NUMBER(19,0) NOT NULL,
    document_id NUMBER(19,0) NOT NULL,
    origin_mode VARCHAR2(64 CHAR) NOT NULL,
    product_kind VARCHAR2(64 CHAR) NOT NULL,
    identification_mode VARCHAR2(64 CHAR) NOT NULL,
    item_ref_id NUMBER(19,0),
    content VARCHAR2(200 CHAR),
    category_id NUMBER(19,0),
    specification VARCHAR2(2000 CHAR),
    control_dimension VARCHAR2(64 CHAR) NOT NULL,
    planned_qty NUMBER(20,6),
    uom_id NUMBER(19,0),
    planned_amount NUMBER(20,6),
    currency_code VARCHAR2(3 CHAR),
    amount_basis VARCHAR2(64 CHAR),
    estimated_unit_price NUMBER(24,10),
    price_quantity NUMBER(24,10),
    price_uom_id NUMBER(19,0),
    price_input_basis VARCHAR2(64 CHAR),
    conversion_numerator NUMBER(24,10),
    conversion_denominator NUMBER(24,10),
    conversion_source_id NUMBER(19,0),
    tax_code_id NUMBER(19,0),
    tax_rate NUMBER(18,10),
    tax_confirmed NUMBER(1,0) DEFAULT 0 NOT NULL,
    estimated_net NUMBER(20,6),
    estimated_tax NUMBER(20,6),
    estimated_gross NUMBER(20,6),
    estimate_source VARCHAR2(2000 CHAR),
    required_date DATE,
    delivery_location_id NUMBER(19,0),
    using_department_id NUMBER(19,0),
    project_ref_id NUMBER(19,0),
    service_start DATE,
    service_end DATE,
    acceptance_criteria VARCHAR2(2000 CHAR),
    acceptor_id NUMBER(19,0),
    independent_reason VARCHAR2(2000 CHAR),
    closed_qty NUMBER(20,6) DEFAULT 0 NOT NULL,
    closed_amount NUMBER(20,6) DEFAULT 0 NOT NULL,
    closure_reason VARCHAR2(2000 CHAR),
    master_snapshot CLOB,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_plan_line_pk PRIMARY KEY (revision_id, line_id),
    CONSTRAINT pur_plan_line_c01 CHECK ((revision_id BETWEEN 1 AND 9223372036854775807) AND (line_id BETWEEN 1 AND 9223372036854775807) AND (document_id BETWEEN 1 AND 9223372036854775807) AND (item_ref_id BETWEEN 1 AND 9223372036854775807) AND (category_id BETWEEN 1 AND 9223372036854775807) AND (planned_qty >= 0) AND (uom_id BETWEEN 1 AND 9223372036854775807) AND (planned_amount >= 0) AND (estimated_unit_price >= 0) AND (price_quantity >= 0) AND (price_uom_id BETWEEN 1 AND 9223372036854775807) AND (conversion_numerator >= 0) AND (conversion_denominator >= 0) AND (conversion_source_id BETWEEN 1 AND 9223372036854775807) AND (tax_code_id BETWEEN 1 AND 9223372036854775807) AND (tax_rate BETWEEN 0 AND 1) AND (tax_confirmed IN (0,1)) AND (estimated_net >= 0) AND (estimated_tax >= 0) AND (estimated_gross >= 0) AND (delivery_location_id BETWEEN 1 AND 9223372036854775807) AND (using_department_id BETWEEN 1 AND 9223372036854775807) AND (project_ref_id BETWEEN 1 AND 9223372036854775807) AND (acceptor_id BETWEEN 1 AND 9223372036854775807) AND (closed_qty >= 0) AND (closed_amount >= 0) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_plan_line_c02 CHECK (product_kind IN ('GOODS', 'SERVICE')),
    CONSTRAINT pur_plan_line_c03 CHECK (identification_mode IN ('CODED', 'FREE_TEXT')),
    CONSTRAINT pur_plan_line_c04 CHECK (control_dimension IN ('QTY', 'AMOUNT')),
    CONSTRAINT pur_plan_line_c05 CHECK (amount_basis IN ('NET', 'GROSS')),
    CONSTRAINT pur_plan_line_c06 CHECK (price_input_basis IN ('NET', 'GROSS')),
    CONSTRAINT pur_plan_line_c07 CHECK (price_quantity > 0),
    CONSTRAINT pur_plan_line_c08 CHECK (conversion_numerator > 0),
    CONSTRAINT pur_plan_line_c09 CHECK (conversion_denominator > 0),
    CONSTRAINT pur_plan_line_c10 CHECK (service_end IS NULL OR service_start IS NULL OR service_end >= service_start),
    CONSTRAINT pur_plan_line_c11 CHECK (estimated_net + estimated_tax = estimated_gross),
    CONSTRAINT pur_plan_line_c12 CHECK (origin_mode IN ('DEMAND', 'INDEPENDENT')),
    CONSTRAINT pur_plan_line_c13 CHECK (closed_qty <= planned_qty),
    CONSTRAINT pur_plan_line_c14 CHECK (closed_amount <= planned_amount)
);

COMMENT ON TABLE pur_plan_line IS '执行采购计划行版本内容';
COMMENT ON COLUMN pur_plan_line.revision_id IS '所属内容版本ID';
COMMENT ON COLUMN pur_plan_line.line_id IS '所属稳定业务行ID';
COMMENT ON COLUMN pur_plan_line.document_id IS '所属稳定单据ID';
COMMENT ON COLUMN pur_plan_line.origin_mode IS '来源需求或独立计划';
COMMENT ON COLUMN pur_plan_line.product_kind IS '采购对象：货物或服务';
COMMENT ON COLUMN pur_plan_line.identification_mode IS '编码或自由描述标识方式';
COMMENT ON COLUMN pur_plan_line.item_ref_id IS '物料参考ID，可空';
COMMENT ON COLUMN pur_plan_line.content IS '采购内容描述';
COMMENT ON COLUMN pur_plan_line.category_id IS '采购品类参考ID';
COMMENT ON COLUMN pur_plan_line.specification IS '规格或服务范围说明';
COMMENT ON COLUMN pur_plan_line.control_dimension IS '来源授权控制维度：数量或金额';
COMMENT ON COLUMN pur_plan_line.planned_qty IS '计划数量';
COMMENT ON COLUMN pur_plan_line.uom_id IS '业务单位ID';
COMMENT ON COLUMN pur_plan_line.planned_amount IS '计划授权金额';
COMMENT ON COLUMN pur_plan_line.currency_code IS '币种';
COMMENT ON COLUMN pur_plan_line.amount_basis IS '金额控制口径';
COMMENT ON COLUMN pur_plan_line.estimated_unit_price IS '估算单价，空表示未知';
COMMENT ON COLUMN pur_plan_line.price_quantity IS '计价基数';
COMMENT ON COLUMN pur_plan_line.price_uom_id IS '计价单位参考ID';
COMMENT ON COLUMN pur_plan_line.price_input_basis IS '单价含税或未税口径';
COMMENT ON COLUMN pur_plan_line.conversion_numerator IS '业务单位到计价单位换算分子';
COMMENT ON COLUMN pur_plan_line.conversion_denominator IS '业务单位到计价单位换算分母';
COMMENT ON COLUMN pur_plan_line.conversion_source_id IS '单位换算依据ID';
COMMENT ON COLUMN pur_plan_line.tax_code_id IS '税码参考ID';
COMMENT ON COLUMN pur_plan_line.tax_rate IS '税率，0到1；空表示未知';
COMMENT ON COLUMN pur_plan_line.tax_confirmed IS '税口径是否已确认';
COMMENT ON COLUMN pur_plan_line.estimated_net IS '估算未税金额';
COMMENT ON COLUMN pur_plan_line.estimated_tax IS '估算税额';
COMMENT ON COLUMN pur_plan_line.estimated_gross IS '估算含税金额';
COMMENT ON COLUMN pur_plan_line.estimate_source IS '估算依据';
COMMENT ON COLUMN pur_plan_line.required_date IS '原始要求日期';
COMMENT ON COLUMN pur_plan_line.delivery_location_id IS '交付地点参考ID';
COMMENT ON COLUMN pur_plan_line.using_department_id IS '使用部门ID';
COMMENT ON COLUMN pur_plan_line.project_ref_id IS '项目参考ID';
COMMENT ON COLUMN pur_plan_line.service_start IS '服务开始日';
COMMENT ON COLUMN pur_plan_line.service_end IS '服务结束日';
COMMENT ON COLUMN pur_plan_line.acceptance_criteria IS '验收要求';
COMMENT ON COLUMN pur_plan_line.acceptor_id IS '验收人ID';
COMMENT ON COLUMN pur_plan_line.independent_reason IS '独立采购计划原因';
COMMENT ON COLUMN pur_plan_line.closed_qty IS '不再采购的已关闭数量';
COMMENT ON COLUMN pur_plan_line.closed_amount IS '不再采购的已关闭金额';
COMMENT ON COLUMN pur_plan_line.closure_reason IS '关闭原因';
COMMENT ON COLUMN pur_plan_line.master_snapshot IS '目录名称、编码等展示快照JSON';
COMMENT ON COLUMN pur_plan_line.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_plan_line.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_plan_line.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_plan_line.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_plan_line.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_plan_line_i01 ON pur_plan_line (document_id, line_id);

CREATE INDEX pur_plan_line_i02 ON pur_plan_line (line_id);

CREATE INDEX pur_plan_line_i03 ON pur_plan_line (revision_id, required_date);

-- 采购订单头版本内容
CREATE TABLE pur_order_header (
    revision_id NUMBER(19,0) NOT NULL,
    purchase_org_id NUMBER(19,0),
    purchase_group_id NUMBER(19,0),
    buyer_id NUMBER(19,0),
    supplier_id NUMBER(19,0),
    supplier_site_id NUMBER(19,0),
    order_date DATE,
    currency_code VARCHAR2(3 CHAR),
    payment_term_id NUMBER(19,0),
    delivery_term_id NUMBER(19,0),
    supplier_contact VARCHAR2(200 CHAR),
    contact_channel VARCHAR2(200 CHAR),
    authority_system VARCHAR2(64 CHAR) DEFAULT 'SAP' NOT NULL,
    pricing_origin VARCHAR2(64 CHAR) NOT NULL,
    total_net NUMBER(20,6),
    total_tax NUMBER(20,6),
    total_gross NUMBER(20,6),
    exposure_net NUMBER(20,6),
    exposure_gross NUMBER(20,6),
    procurement_reason VARCHAR2(2000 CHAR),
    notes VARCHAR2(2000 CHAR),
    master_snapshot CLOB,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_order_header_pk PRIMARY KEY (revision_id),
    CONSTRAINT pur_order_header_c01 CHECK ((revision_id BETWEEN 1 AND 9223372036854775807) AND (purchase_org_id BETWEEN 1 AND 9223372036854775807) AND (purchase_group_id BETWEEN 1 AND 9223372036854775807) AND (buyer_id BETWEEN 1 AND 9223372036854775807) AND (supplier_id BETWEEN 1 AND 9223372036854775807) AND (supplier_site_id BETWEEN 1 AND 9223372036854775807) AND (payment_term_id BETWEEN 1 AND 9223372036854775807) AND (delivery_term_id BETWEEN 1 AND 9223372036854775807) AND (total_net >= 0) AND (total_tax >= 0) AND (total_gross >= 0) AND (exposure_net >= 0) AND (exposure_gross >= 0) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_order_header_c02 CHECK (pricing_origin IN ('LOCAL_SIMPLE', 'EXTERNAL_AUTHORITATIVE')),
    CONSTRAINT pur_order_header_c03 CHECK (total_net + total_tax = total_gross)
);

COMMENT ON TABLE pur_order_header IS '采购订单头版本内容';
COMMENT ON COLUMN pur_order_header.revision_id IS '订单版本ID';
COMMENT ON COLUMN pur_order_header.purchase_org_id IS '采购组织ID';
COMMENT ON COLUMN pur_order_header.purchase_group_id IS '采购组ID';
COMMENT ON COLUMN pur_order_header.buyer_id IS '采购员ID';
COMMENT ON COLUMN pur_order_header.supplier_id IS '实际供应商参考ID，提交时必须有效';
COMMENT ON COLUMN pur_order_header.supplier_site_id IS '供应商站点参考ID';
COMMENT ON COLUMN pur_order_header.order_date IS '订单日期';
COMMENT ON COLUMN pur_order_header.currency_code IS '单据币种';
COMMENT ON COLUMN pur_order_header.payment_term_id IS '付款条件参考ID';
COMMENT ON COLUMN pur_order_header.delivery_term_id IS '交付条件参考ID';
COMMENT ON COLUMN pur_order_header.supplier_contact IS '供应商业务联系人';
COMMENT ON COLUMN pur_order_header.contact_channel IS '联系渠道';
COMMENT ON COLUMN pur_order_header.authority_system IS '正式订单权威系统';
COMMENT ON COLUMN pur_order_header.pricing_origin IS '简单本地定价或外部权威金额';
COMMENT ON COLUMN pur_order_header.total_net IS '普通约定加限额预计的未税合计';
COMMENT ON COLUMN pur_order_header.total_tax IS '对应税额合计';
COMMENT ON COLUMN pur_order_header.total_gross IS '普通约定加限额预计的含税合计';
COMMENT ON COLUMN pur_order_header.exposure_net IS '普通约定加限额上限的未税风险敞口';
COMMENT ON COLUMN pur_order_header.exposure_gross IS '普通约定加限额上限的含税风险敞口';
COMMENT ON COLUMN pur_order_header.procurement_reason IS '直接采购或例外依据';
COMMENT ON COLUMN pur_order_header.notes IS '订单说明';
COMMENT ON COLUMN pur_order_header.master_snapshot IS '供应商、组织、条款展示快照JSON';
COMMENT ON COLUMN pur_order_header.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_order_header.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_order_header.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_order_header.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_order_header.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_order_header_i01 ON pur_order_header (supplier_id, order_date, revision_id);

CREATE INDEX pur_order_header_i02 ON pur_order_header (purchase_org_id, buyer_id);

-- 采购订单行版本内容
CREATE TABLE pur_order_line (
    revision_id NUMBER(19,0) NOT NULL,
    line_id NUMBER(19,0) NOT NULL,
    document_id NUMBER(19,0) NOT NULL,
    product_kind VARCHAR2(64 CHAR) NOT NULL,
    identification_mode VARCHAR2(64 CHAR) NOT NULL,
    item_ref_id NUMBER(19,0),
    content VARCHAR2(200 CHAR),
    category_id NUMBER(19,0),
    specification VARCHAR2(2000 CHAR),
    stock_mode VARCHAR2(64 CHAR) NOT NULL,
    execution_scenario VARCHAR2(64 CHAR),
    pricing_method VARCHAR2(64 CHAR) NOT NULL,
    control_mode VARCHAR2(64 CHAR) NOT NULL,
    origin_mode VARCHAR2(64 CHAR) NOT NULL,
    ordered_qty NUMBER(20,6),
    order_uom_id NUMBER(19,0),
    price_uom_id NUMBER(19,0),
    conversion_numerator NUMBER(24,10),
    conversion_denominator NUMBER(24,10),
    conversion_source_id NUMBER(19,0),
    entered_unit_price NUMBER(24,10),
    price_quantity NUMBER(24,10),
    price_input_basis VARCHAR2(64 CHAR),
    tax_code_id NUMBER(19,0),
    tax_rate NUMBER(18,10),
    tax_confirmed NUMBER(1,0) DEFAULT 0 NOT NULL,
    net_amount NUMBER(20,6),
    tax_amount NUMBER(20,6),
    gross_amount NUMBER(20,6),
    amount_basis VARCHAR2(64 CHAR),
    fixed_amount NUMBER(20,6),
    expected_amount NUMBER(20,6),
    overall_limit NUMBER(20,6),
    is_free NUMBER(1,0) DEFAULT 0 NOT NULL,
    free_reason VARCHAR2(2000 CHAR),
    price_source_type VARCHAR2(64 CHAR),
    price_source_ref_id NUMBER(19,0),
    price_confirmed NUMBER(1,0) DEFAULT 0 NOT NULL,
    plant_id NUMBER(19,0),
    default_location_id NUMBER(19,0),
    service_start DATE,
    service_end DATE,
    acceptance_criteria VARCHAR2(2000 CHAR),
    acceptor_id NUMBER(19,0),
    over_receipt_rate NUMBER(18,10) DEFAULT 0 NOT NULL,
    under_receipt_rate NUMBER(18,10) DEFAULT 0 NOT NULL,
    batch_managed NUMBER(1,0) DEFAULT 0 NOT NULL,
    serial_managed NUMBER(1,0) DEFAULT 0 NOT NULL,
    closed_unfulfilled_qty NUMBER(20,6) DEFAULT 0 NOT NULL,
    closed_unfulfilled_amount NUMBER(20,6) DEFAULT 0 NOT NULL,
    delivery_closed NUMBER(1,0) DEFAULT 0 NOT NULL,
    closure_reason VARCHAR2(2000 CHAR),
    master_snapshot CLOB,
    extension_values CLOB,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_order_line_pk PRIMARY KEY (revision_id, line_id),
    CONSTRAINT pur_order_line_c01 CHECK ((revision_id BETWEEN 1 AND 9223372036854775807) AND (line_id BETWEEN 1 AND 9223372036854775807) AND (document_id BETWEEN 1 AND 9223372036854775807) AND (item_ref_id BETWEEN 1 AND 9223372036854775807) AND (category_id BETWEEN 1 AND 9223372036854775807) AND (ordered_qty >= 0) AND (order_uom_id BETWEEN 1 AND 9223372036854775807) AND (price_uom_id BETWEEN 1 AND 9223372036854775807) AND (conversion_numerator >= 0) AND (conversion_denominator >= 0) AND (conversion_source_id BETWEEN 1 AND 9223372036854775807) AND (entered_unit_price >= 0) AND (price_quantity >= 0) AND (tax_code_id BETWEEN 1 AND 9223372036854775807) AND (tax_rate BETWEEN 0 AND 1) AND (tax_confirmed IN (0,1)) AND (net_amount >= 0) AND (tax_amount >= 0) AND (gross_amount >= 0) AND (fixed_amount >= 0) AND (expected_amount >= 0) AND (overall_limit >= 0) AND (is_free IN (0,1)) AND (price_source_ref_id BETWEEN 1 AND 9223372036854775807) AND (price_confirmed IN (0,1)) AND (plant_id BETWEEN 1 AND 9223372036854775807) AND (default_location_id BETWEEN 1 AND 9223372036854775807) AND (acceptor_id BETWEEN 1 AND 9223372036854775807) AND (over_receipt_rate BETWEEN 0 AND 1) AND (under_receipt_rate BETWEEN 0 AND 1) AND (batch_managed IN (0,1)) AND (serial_managed IN (0,1)) AND (closed_unfulfilled_qty >= 0) AND (closed_unfulfilled_amount >= 0) AND (delivery_closed IN (0,1)) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_order_line_c02 CHECK (product_kind IN ('GOODS', 'SERVICE')),
    CONSTRAINT pur_order_line_c03 CHECK (identification_mode IN ('CODED', 'FREE_TEXT')),
    CONSTRAINT pur_order_line_c04 CHECK (stock_mode IN ('STOCK', 'NON_STOCK', 'NOT_APPLICABLE')),
    CONSTRAINT pur_order_line_c05 CHECK (pricing_method IN ('UNIT_PRICE', 'FIXED_AMOUNT', 'LIMIT')),
    CONSTRAINT pur_order_line_c06 CHECK (control_mode IN ('QUANTITY', 'AMOUNT', 'QUANTITY_AMOUNT', 'LIMIT')),
    CONSTRAINT pur_order_line_c07 CHECK (origin_mode IN ('SOURCED', 'DIRECT')),
    CONSTRAINT pur_order_line_c08 CHECK (amount_basis IN ('NET', 'GROSS')),
    CONSTRAINT pur_order_line_c09 CHECK (price_input_basis IN ('NET', 'GROSS')),
    CONSTRAINT pur_order_line_c10 CHECK (net_amount + tax_amount = gross_amount),
    CONSTRAINT pur_order_line_c11 CHECK (price_quantity > 0),
    CONSTRAINT pur_order_line_c12 CHECK (conversion_numerator > 0),
    CONSTRAINT pur_order_line_c13 CHECK (conversion_denominator > 0),
    CONSTRAINT pur_order_line_c14 CHECK (expected_amount <= overall_limit),
    CONSTRAINT pur_order_line_c15 CHECK (service_end IS NULL OR service_start IS NULL OR service_end >= service_start),
    CONSTRAINT pur_order_line_c16 CHECK (is_free = 0 OR free_reason IS NOT NULL),
    CONSTRAINT pur_order_line_c17 CHECK (closed_unfulfilled_qty <= ordered_qty)
);

COMMENT ON TABLE pur_order_line IS '采购订单行版本内容';
COMMENT ON COLUMN pur_order_line.revision_id IS '所属内容版本ID';
COMMENT ON COLUMN pur_order_line.line_id IS '所属稳定业务行ID';
COMMENT ON COLUMN pur_order_line.document_id IS '所属稳定单据ID';
COMMENT ON COLUMN pur_order_line.product_kind IS '采购对象：货物或服务';
COMMENT ON COLUMN pur_order_line.identification_mode IS '编码或自由描述标识方式';
COMMENT ON COLUMN pur_order_line.item_ref_id IS '物料参考ID，可空';
COMMENT ON COLUMN pur_order_line.content IS '采购内容描述';
COMMENT ON COLUMN pur_order_line.category_id IS '采购品类参考ID';
COMMENT ON COLUMN pur_order_line.specification IS '规格或服务范围说明';
COMMENT ON COLUMN pur_order_line.stock_mode IS '库存、非库存或不适用';
COMMENT ON COLUMN pur_order_line.execution_scenario IS '已支持的履约场景编码';
COMMENT ON COLUMN pur_order_line.pricing_method IS '单价、固定金额或限额';
COMMENT ON COLUMN pur_order_line.control_mode IS '数量、金额、双控或限额';
COMMENT ON COLUMN pur_order_line.origin_mode IS '来源型或直接采购';
COMMENT ON COLUMN pur_order_line.ordered_qty IS '商业订购数量';
COMMENT ON COLUMN pur_order_line.order_uom_id IS '业务计量单位ID';
COMMENT ON COLUMN pur_order_line.price_uom_id IS '计价单位ID';
COMMENT ON COLUMN pur_order_line.conversion_numerator IS '单位换算分子';
COMMENT ON COLUMN pur_order_line.conversion_denominator IS '单位换算分母';
COMMENT ON COLUMN pur_order_line.conversion_source_id IS '换算依据ID';
COMMENT ON COLUMN pur_order_line.entered_unit_price IS '输入单价';
COMMENT ON COLUMN pur_order_line.price_quantity IS '单价对应的计价数量基数';
COMMENT ON COLUMN pur_order_line.price_input_basis IS '输入价格含税或未税';
COMMENT ON COLUMN pur_order_line.tax_code_id IS '税码参考ID';
COMMENT ON COLUMN pur_order_line.tax_rate IS '税率，空表示待确认';
COMMENT ON COLUMN pur_order_line.tax_confirmed IS '税口径是否已确认';
COMMENT ON COLUMN pur_order_line.net_amount IS '行未税金额';
COMMENT ON COLUMN pur_order_line.tax_amount IS '行税额';
COMMENT ON COLUMN pur_order_line.gross_amount IS '行含税金额';
COMMENT ON COLUMN pur_order_line.amount_basis IS '执行金额控制口径';
COMMENT ON COLUMN pur_order_line.fixed_amount IS '固定价服务约定金额';
COMMENT ON COLUMN pur_order_line.expected_amount IS '限额服务预计金额';
COMMENT ON COLUMN pur_order_line.overall_limit IS '限额服务最高限额';
COMMENT ON COLUMN pur_order_line.is_free IS '是否明确免费';
COMMENT ON COLUMN pur_order_line.free_reason IS '免费原因';
COMMENT ON COLUMN pur_order_line.price_source_type IS '价格依据类型，估算不能冒充成交价';
COMMENT ON COLUMN pur_order_line.price_source_ref_id IS '外部价格依据ID';
COMMENT ON COLUMN pur_order_line.price_confirmed IS '成交价格是否已确认';
COMMENT ON COLUMN pur_order_line.plant_id IS '工厂组织ID';
COMMENT ON COLUMN pur_order_line.default_location_id IS '默认地点参考ID';
COMMENT ON COLUMN pur_order_line.service_start IS '服务期间开始';
COMMENT ON COLUMN pur_order_line.service_end IS '服务期间结束';
COMMENT ON COLUMN pur_order_line.acceptance_criteria IS '验收依据';
COMMENT ON COLUMN pur_order_line.acceptor_id IS '验收人ID';
COMMENT ON COLUMN pur_order_line.over_receipt_rate IS '允许超收容差率';
COMMENT ON COLUMN pur_order_line.under_receipt_rate IS '允许短交容差率';
COMMENT ON COLUMN pur_order_line.batch_managed IS '是否批次管理';
COMMENT ON COLUMN pur_order_line.serial_managed IS '是否序列号管理，未适配场景禁止提交';
COMMENT ON COLUMN pur_order_line.closed_unfulfilled_qty IS '未交关闭量，不计为收货';
COMMENT ON COLUMN pur_order_line.closed_unfulfilled_amount IS '未履约关闭金额';
COMMENT ON COLUMN pur_order_line.delivery_closed IS '是否履约关闭';
COMMENT ON COLUMN pur_order_line.closure_reason IS '关闭原因';
COMMENT ON COLUMN pur_order_line.master_snapshot IS '主数据快照JSON';
COMMENT ON COLUMN pur_order_line.extension_values IS '受规则约束的扩展字段JSON';
COMMENT ON COLUMN pur_order_line.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_order_line.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_order_line.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_order_line.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_order_line.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_order_line_i01 ON pur_order_line (document_id, line_id);

CREATE INDEX pur_order_line_i02 ON pur_order_line (line_id);

CREATE INDEX pur_order_line_i03 ON pur_order_line (execution_scenario, delivery_closed);

-- 版本化的订单交付安排，不含供应商回复
CREATE TABLE pur_order_schedule (
    id NUMBER(19,0) NOT NULL,
    revision_id NUMBER(19,0) NOT NULL,
    order_line_id NUMBER(19,0) NOT NULL,
    schedule_key VARCHAR2(64 CHAR) NOT NULL,
    schedule_no VARCHAR2(20 CHAR) NOT NULL,
    required_date DATE,
    delivery_location_id NUMBER(19,0),
    scheduled_qty NUMBER(20,6),
    scheduled_amount NUMBER(20,6),
    closed_qty NUMBER(20,6) DEFAULT 0 NOT NULL,
    closed_amount NUMBER(20,6) DEFAULT 0 NOT NULL,
    recipient_id NUMBER(19,0),
    address_snapshot VARCHAR2(2000 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_order_schedule_pk PRIMARY KEY (id),
    CONSTRAINT pur_order_schedule_u01 UNIQUE (revision_id, order_line_id, schedule_key),
    CONSTRAINT pur_order_schedule_u02 UNIQUE (revision_id, order_line_id, schedule_no),
    CONSTRAINT pur_order_schedule_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (revision_id BETWEEN 1 AND 9223372036854775807) AND (order_line_id BETWEEN 1 AND 9223372036854775807) AND (delivery_location_id BETWEEN 1 AND 9223372036854775807) AND (scheduled_qty >= 0) AND (scheduled_amount >= 0) AND (closed_qty >= 0) AND (closed_amount >= 0) AND (recipient_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_order_schedule_c02 CHECK (closed_qty <= scheduled_qty),
    CONSTRAINT pur_order_schedule_c03 CHECK (closed_amount <= scheduled_amount)
);

COMMENT ON TABLE pur_order_schedule IS '版本化的订单交付安排，不含供应商回复';
COMMENT ON COLUMN pur_order_schedule.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_order_schedule.revision_id IS '所属正式或草稿订单版本ID';
COMMENT ON COLUMN pur_order_schedule.order_line_id IS '所属订单稳定行ID';
COMMENT ON COLUMN pur_order_schedule.schedule_key IS '跨版本稳定交付安排键';
COMMENT ON COLUMN pur_order_schedule.schedule_no IS '版本内显示批次号';
COMMENT ON COLUMN pur_order_schedule.required_date IS '正式约定交期，不由内部预计覆盖';
COMMENT ON COLUMN pur_order_schedule.delivery_location_id IS '交付地点参考ID';
COMMENT ON COLUMN pur_order_schedule.scheduled_qty IS '安排数量';
COMMENT ON COLUMN pur_order_schedule.scheduled_amount IS '安排控制金额';
COMMENT ON COLUMN pur_order_schedule.closed_qty IS '未交关闭数量';
COMMENT ON COLUMN pur_order_schedule.closed_amount IS '未履约关闭金额';
COMMENT ON COLUMN pur_order_schedule.recipient_id IS '接收人用户ID';
COMMENT ON COLUMN pur_order_schedule.address_snapshot IS '交付地址快照';
COMMENT ON COLUMN pur_order_schedule.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_order_schedule.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_order_schedule.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_order_schedule.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_order_schedule.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_order_schedule_i01 ON pur_order_schedule (required_date, order_line_id);

CREATE INDEX pur_order_schedule_i02 ON pur_order_schedule (order_line_id, schedule_key);

-- 订单行业务归属分配
CREATE TABLE pur_order_distribution (
    id NUMBER(19,0) NOT NULL,
    revision_id NUMBER(19,0) NOT NULL,
    order_line_id NUMBER(19,0) NOT NULL,
    distribution_key VARCHAR2(64 CHAR) NOT NULL,
    department_id NUMBER(19,0),
    project_ref_id NUMBER(19,0),
    using_location_id NUMBER(19,0),
    share_qty NUMBER(20,6),
    share_amount NUMBER(20,6),
    share_ratio NUMBER(18,10),
    source_allocation_id NUMBER(19,0),
    account_assignment_snapshot CLOB,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_order_distribution_pk PRIMARY KEY (id),
    CONSTRAINT pur_order_distribution_u01 UNIQUE (revision_id, order_line_id, distribution_key),
    CONSTRAINT pur_order_distribution_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (revision_id BETWEEN 1 AND 9223372036854775807) AND (order_line_id BETWEEN 1 AND 9223372036854775807) AND (department_id BETWEEN 1 AND 9223372036854775807) AND (project_ref_id BETWEEN 1 AND 9223372036854775807) AND (using_location_id BETWEEN 1 AND 9223372036854775807) AND (share_qty >= 0) AND (share_amount >= 0) AND (share_ratio BETWEEN 0 AND 1) AND (source_allocation_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0))
);

COMMENT ON TABLE pur_order_distribution IS '订单行业务归属分配';
COMMENT ON COLUMN pur_order_distribution.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_order_distribution.revision_id IS '订单版本ID';
COMMENT ON COLUMN pur_order_distribution.order_line_id IS '订单稳定行ID';
COMMENT ON COLUMN pur_order_distribution.distribution_key IS '跨版本稳定归属分配键';
COMMENT ON COLUMN pur_order_distribution.department_id IS '使用部门ID';
COMMENT ON COLUMN pur_order_distribution.project_ref_id IS '项目参考ID';
COMMENT ON COLUMN pur_order_distribution.using_location_id IS '使用地点参考ID';
COMMENT ON COLUMN pur_order_distribution.share_qty IS '分配数量';
COMMENT ON COLUMN pur_order_distribution.share_amount IS '分配金额';
COMMENT ON COLUMN pur_order_distribution.share_ratio IS '分配比例，0到1';
COMMENT ON COLUMN pur_order_distribution.source_allocation_id IS '对应的来源分配ID';
COMMENT ON COLUMN pur_order_distribution.account_assignment_snapshot IS '继承的SAP只读业务归属快照JSON';
COMMENT ON COLUMN pur_order_distribution.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_order_distribution.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_order_distribution.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_order_distribution.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_order_distribution.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_order_distribution_i01 ON pur_order_distribution (order_line_id);

CREATE INDEX pur_order_distribution_i02 ON pur_order_distribution (source_allocation_id);

CREATE INDEX pur_order_distribution_i03 ON pur_order_distribution (department_id, project_ref_id);

-- 合同、寻源等外部依据，仅引用不建本地业务模块
CREATE TABLE pur_external_reference (
    id NUMBER(19,0) NOT NULL,
    system_code VARCHAR2(64 CHAR) NOT NULL,
    reference_type VARCHAR2(64 CHAR) NOT NULL,
    external_no VARCHAR2(80 CHAR) NOT NULL,
    external_line_no VARCHAR2(40 CHAR) NOT NULL,
    external_version VARCHAR2(64 CHAR) NOT NULL,
    company_id NUMBER(19,0) NOT NULL,
    supplier_id NUMBER(19,0),
    currency_code VARCHAR2(3 CHAR),
    valid_from DATE,
    valid_to DATE,
    summary VARCHAR2(2000 CHAR),
    snapshot CLOB,
    verification_status VARCHAR2(64 CHAR) DEFAULT 'PENDING' NOT NULL,
    verified_at TIMESTAMP(6),
    verified_by NUMBER(19,0),
    evidence_attachment_id NUMBER(19,0),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_external_reference_pk PRIMARY KEY (id),
    CONSTRAINT pur_external_reference_u01 UNIQUE (system_code, reference_type, external_no, external_line_no, external_version, company_id),
    CONSTRAINT pur_external_reference_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (company_id BETWEEN 1 AND 9223372036854775807) AND (supplier_id BETWEEN 1 AND 9223372036854775807) AND (verified_by BETWEEN 1 AND 9223372036854775807) AND (evidence_attachment_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_external_reference_c02 CHECK (reference_type IN ('CONTRACT', 'SOURCING', 'QUOTE', 'OTHER')),
    CONSTRAINT pur_external_reference_c03 CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED', 'UNKNOWN')),
    CONSTRAINT pur_external_reference_c04 CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

COMMENT ON TABLE pur_external_reference IS '合同、寻源等外部依据，仅引用不建本地业务模块';
COMMENT ON COLUMN pur_external_reference.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_external_reference.system_code IS '来源系统代码';
COMMENT ON COLUMN pur_external_reference.reference_type IS '依据类型';
COMMENT ON COLUMN pur_external_reference.external_no IS '外部业务单号';
COMMENT ON COLUMN pur_external_reference.external_line_no IS '外部行号，无行使用HEADER';
COMMENT ON COLUMN pur_external_reference.external_version IS '外部版本，未提供时使用UNVERSIONED';
COMMENT ON COLUMN pur_external_reference.company_id IS '所属法人ID';
COMMENT ON COLUMN pur_external_reference.supplier_id IS '对应供应商参考ID';
COMMENT ON COLUMN pur_external_reference.currency_code IS '币种';
COMMENT ON COLUMN pur_external_reference.valid_from IS '依据有效起始日';
COMMENT ON COLUMN pur_external_reference.valid_to IS '依据有效终止日';
COMMENT ON COLUMN pur_external_reference.summary IS '业务摘要';
COMMENT ON COLUMN pur_external_reference.snapshot IS '外部内容快照JSON';
COMMENT ON COLUMN pur_external_reference.verification_status IS '核验状态';
COMMENT ON COLUMN pur_external_reference.verified_at IS '核验时间，UTC';
COMMENT ON COLUMN pur_external_reference.verified_by IS '核验人ID';
COMMENT ON COLUMN pur_external_reference.evidence_attachment_id IS '证据附件ID';
COMMENT ON COLUMN pur_external_reference.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_external_reference.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_external_reference.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_external_reference.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_external_reference.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_external_reference_i01 ON pur_external_reference (company_id, supplier_id);

CREATE INDEX pur_external_reference_i02 ON pur_external_reference (evidence_attachment_id);

-- 不消耗额度的单据依据与展示关系
CREATE TABLE pur_document_relation (
    id NUMBER(19,0) NOT NULL,
    target_revision_id NUMBER(19,0) NOT NULL,
    target_line_id NUMBER(19,0),
    source_revision_id NUMBER(19,0),
    source_line_id NUMBER(19,0),
    external_reference_id NUMBER(19,0),
    relation_type VARCHAR2(64 CHAR) NOT NULL,
    note VARCHAR2(2000 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_document_relation_pk PRIMARY KEY (id),
    CONSTRAINT pur_document_relation_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (target_revision_id BETWEEN 1 AND 9223372036854775807) AND (target_line_id BETWEEN 1 AND 9223372036854775807) AND (source_revision_id BETWEEN 1 AND 9223372036854775807) AND (source_line_id BETWEEN 1 AND 9223372036854775807) AND (external_reference_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_document_relation_c02 CHECK (relation_type IN ('BASIS', 'REFERENCE', 'SUPERSEDES', 'CORRECTS')),
    CONSTRAINT pur_document_relation_c03 CHECK ((source_revision_id IS NOT NULL AND external_reference_id IS NULL) OR (source_revision_id IS NULL AND external_reference_id IS NOT NULL)),
    CONSTRAINT pur_document_relation_c04 CHECK (source_line_id IS NULL OR source_revision_id IS NOT NULL),
    CONSTRAINT pur_document_relation_c05 CHECK (source_revision_id <> target_revision_id)
);

COMMENT ON TABLE pur_document_relation IS '不消耗额度的单据依据与展示关系';
COMMENT ON COLUMN pur_document_relation.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_document_relation.target_revision_id IS '目标单据版本ID';
COMMENT ON COLUMN pur_document_relation.target_line_id IS '目标稳定行ID，必须属于目标版本';
COMMENT ON COLUMN pur_document_relation.source_revision_id IS '本地来源版本ID，与外部依据二选一';
COMMENT ON COLUMN pur_document_relation.source_line_id IS '本地来源稳定行ID';
COMMENT ON COLUMN pur_document_relation.external_reference_id IS '外部依据ID，与本地来源二选一';
COMMENT ON COLUMN pur_document_relation.relation_type IS '关系类型';
COMMENT ON COLUMN pur_document_relation.note IS '关系说明';
COMMENT ON COLUMN pur_document_relation.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_document_relation.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_document_relation.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_document_relation.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_document_relation.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_document_relation_i01 ON pur_document_relation (target_revision_id, target_line_id);

CREATE INDEX pur_document_relation_i02 ON pur_document_relation (source_revision_id, source_line_id);

CREATE INDEX pur_document_relation_i03 ON pur_document_relation (external_reference_id);

-- 来源到目标的稳定分配关系，不直接代表余额
CREATE TABLE pur_source_allocation (
    id NUMBER(19,0) NOT NULL,
    source_line_id NUMBER(19,0) NOT NULL,
    target_line_id NUMBER(19,0) NOT NULL,
    relation_type VARCHAR2(64 CHAR) NOT NULL,
    control_dimension VARCHAR2(64 CHAR) NOT NULL,
    uom_id NUMBER(19,0),
    currency_code VARCHAR2(3 CHAR),
    amount_basis VARCHAR2(64 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_source_allocation_pk PRIMARY KEY (id),
    CONSTRAINT pur_source_allocation_u01 UNIQUE (source_line_id, target_line_id, relation_type),
    CONSTRAINT pur_source_allocation_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (source_line_id BETWEEN 1 AND 9223372036854775807) AND (target_line_id BETWEEN 1 AND 9223372036854775807) AND (uom_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_source_allocation_c02 CHECK (relation_type IN ('DEMAND_PLAN', 'DEMAND_ORDER', 'PLAN_ORDER')),
    CONSTRAINT pur_source_allocation_c03 CHECK (control_dimension IN ('QTY', 'AMOUNT')),
    CONSTRAINT pur_source_allocation_c04 CHECK (amount_basis IN ('NET', 'GROSS')),
    CONSTRAINT pur_source_allocation_c05 CHECK (source_line_id <> target_line_id),
    CONSTRAINT pur_source_allocation_c06 CHECK ((control_dimension = 'QTY' AND uom_id IS NOT NULL AND currency_code IS NULL AND amount_basis IS NULL) OR (control_dimension = 'AMOUNT' AND uom_id IS NULL AND currency_code IS NOT NULL AND amount_basis IS NOT NULL))
);

COMMENT ON TABLE pur_source_allocation IS '来源到目标的稳定分配关系，不直接代表余额';
COMMENT ON COLUMN pur_source_allocation.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_source_allocation.source_line_id IS '来源稳定行ID';
COMMENT ON COLUMN pur_source_allocation.target_line_id IS '目标稳定行ID';
COMMENT ON COLUMN pur_source_allocation.relation_type IS '需求到计划、需求到订单或计划到订单';
COMMENT ON COLUMN pur_source_allocation.control_dimension IS '数量或金额控制';
COMMENT ON COLUMN pur_source_allocation.uom_id IS '数量型单位ID';
COMMENT ON COLUMN pur_source_allocation.currency_code IS '金额型币种';
COMMENT ON COLUMN pur_source_allocation.amount_basis IS '金额型税口径';
COMMENT ON COLUMN pur_source_allocation.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_source_allocation.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_source_allocation.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_source_allocation.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_source_allocation.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_source_allocation_i01 ON pur_source_allocation (source_line_id, id);

CREATE INDEX pur_source_allocation_i02 ON pur_source_allocation (target_line_id, id);

-- 工作版本的拟分配，草稿不占用余额
CREATE TABLE pur_source_proposal (
    id NUMBER(19,0) NOT NULL,
    target_revision_id NUMBER(19,0) NOT NULL,
    allocation_id NUMBER(19,0) NOT NULL,
    source_revision_id NUMBER(19,0) NOT NULL,
    origin_allocation_id NUMBER(19,0),
    source_part_key VARCHAR2(64 CHAR) NOT NULL,
    desired_qty NUMBER(20,6),
    desired_amount NUMBER(20,6),
    reference_estimate NUMBER(20,6),
    source_snapshot CLOB,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_source_proposal_pk PRIMARY KEY (id),
    CONSTRAINT pur_source_proposal_u01 UNIQUE (target_revision_id, allocation_id, source_part_key),
    CONSTRAINT pur_source_proposal_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (target_revision_id BETWEEN 1 AND 9223372036854775807) AND (allocation_id BETWEEN 1 AND 9223372036854775807) AND (source_revision_id BETWEEN 1 AND 9223372036854775807) AND (origin_allocation_id BETWEEN 1 AND 9223372036854775807) AND (desired_qty >= 0) AND (desired_amount >= 0) AND (reference_estimate >= 0) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_source_proposal_c02 CHECK (desired_qty IS NULL OR desired_amount IS NULL)
);

COMMENT ON TABLE pur_source_proposal IS '工作版本的拟分配，草稿不占用余额';
COMMENT ON COLUMN pur_source_proposal.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_source_proposal.target_revision_id IS '目标工作版本ID';
COMMENT ON COLUMN pur_source_proposal.allocation_id IS '稳定分配关系ID';
COMMENT ON COLUMN pur_source_proposal.source_revision_id IS '选择的来源版本ID';
COMMENT ON COLUMN pur_source_proposal.origin_allocation_id IS '需求到计划的上游分配ID';
COMMENT ON COLUMN pur_source_proposal.source_part_key IS '非空来源份额键，普通来源为DIRECT';
COMMENT ON COLUMN pur_source_proposal.desired_qty IS '本次拟分配数量';
COMMENT ON COLUMN pur_source_proposal.desired_amount IS '本次拟分配金额';
COMMENT ON COLUMN pur_source_proposal.reference_estimate IS '对应范围参考估算';
COMMENT ON COLUMN pur_source_proposal.source_snapshot IS '来源原值快照JSON';
COMMENT ON COLUMN pur_source_proposal.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_source_proposal.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_source_proposal.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_source_proposal.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_source_proposal.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_source_proposal_i01 ON pur_source_proposal (allocation_id);

CREATE INDEX pur_source_proposal_i02 ON pur_source_proposal (origin_allocation_id);

-- 来源分配不可覆盖变化账
CREATE TABLE pur_allocation_event (
    id NUMBER(19,0) NOT NULL,
    allocation_id NUMBER(19,0) NOT NULL,
    command_id NUMBER(19,0) NOT NULL,
    source_revision_id NUMBER(19,0) NOT NULL,
    target_revision_id NUMBER(19,0) NOT NULL,
    event_kind VARCHAR2(64 CHAR) NOT NULL,
    reserved_qty_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    committed_qty_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    reserved_amount_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    committed_amount_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    reason VARCHAR2(2000 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    CONSTRAINT pur_allocation_event_pk PRIMARY KEY (id),
    CONSTRAINT pur_allocation_event_u01 UNIQUE (command_id, allocation_id, event_kind),
    CONSTRAINT pur_allocation_event_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (allocation_id BETWEEN 1 AND 9223372036854775807) AND (command_id BETWEEN 1 AND 9223372036854775807) AND (source_revision_id BETWEEN 1 AND 9223372036854775807) AND (target_revision_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807)),
    CONSTRAINT pur_allocation_event_c02 CHECK (event_kind IN ('RESERVE', 'COMMIT', 'RELEASE_RESERVE', 'RELEASE_COMMIT')),
    CONSTRAINT pur_allocation_event_c03 CHECK ((reserved_qty_delta = 0 AND committed_qty_delta = 0) OR (reserved_amount_delta = 0 AND committed_amount_delta = 0)),
    CONSTRAINT pur_allocation_event_c04 CHECK ((event_kind = 'RESERVE' AND reserved_qty_delta >= 0 AND reserved_amount_delta >= 0 AND committed_qty_delta = 0 AND committed_amount_delta = 0) OR (event_kind = 'COMMIT' AND reserved_qty_delta <= 0 AND reserved_amount_delta <= 0 AND committed_qty_delta = -reserved_qty_delta AND committed_amount_delta = -reserved_amount_delta) OR (event_kind = 'RELEASE_RESERVE' AND reserved_qty_delta <= 0 AND reserved_amount_delta <= 0 AND committed_qty_delta = 0 AND committed_amount_delta = 0) OR (event_kind = 'RELEASE_COMMIT' AND committed_qty_delta <= 0 AND committed_amount_delta <= 0 AND reserved_qty_delta = 0 AND reserved_amount_delta = 0))
);

COMMENT ON TABLE pur_allocation_event IS '来源分配不可覆盖变化账';
COMMENT ON COLUMN pur_allocation_event.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_allocation_event.allocation_id IS '稳定分配关系ID';
COMMENT ON COLUMN pur_allocation_event.command_id IS '业务幂等命令ID';
COMMENT ON COLUMN pur_allocation_event.source_revision_id IS '校验时来源版本ID';
COMMENT ON COLUMN pur_allocation_event.target_revision_id IS '目标版本ID';
COMMENT ON COLUMN pur_allocation_event.event_kind IS '占用、确认、释放占用或释放承诺';
COMMENT ON COLUMN pur_allocation_event.reserved_qty_delta IS '数量占用变化，可为负';
COMMENT ON COLUMN pur_allocation_event.committed_qty_delta IS '数量承诺变化，可为负';
COMMENT ON COLUMN pur_allocation_event.reserved_amount_delta IS '金额占用变化，可为负';
COMMENT ON COLUMN pur_allocation_event.committed_amount_delta IS '金额承诺变化，可为负';
COMMENT ON COLUMN pur_allocation_event.reason IS '释放或变更原因';
COMMENT ON COLUMN pur_allocation_event.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_allocation_event.created_by IS '创建人或系统主体的用户ID';

CREATE INDEX pur_allocation_event_i01 ON pur_allocation_event (allocation_id, id);

CREATE INDEX pur_allocation_event_i02 ON pur_allocation_event (target_revision_id);

-- 计划转单的原始需求份额账，不二次扣需求
CREATE TABLE pur_allocation_trace (
    id NUMBER(19,0) NOT NULL,
    allocation_event_id NUMBER(19,0) NOT NULL,
    origin_allocation_id NUMBER(19,0) NOT NULL,
    reserved_qty_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    committed_qty_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    reserved_amount_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    committed_amount_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    CONSTRAINT pur_allocation_trace_pk PRIMARY KEY (id),
    CONSTRAINT pur_allocation_trace_u01 UNIQUE (allocation_event_id, origin_allocation_id),
    CONSTRAINT pur_allocation_trace_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (allocation_event_id BETWEEN 1 AND 9223372036854775807) AND (origin_allocation_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807)),
    CONSTRAINT pur_allocation_trace_c02 CHECK ((reserved_qty_delta = 0 AND committed_qty_delta = 0) OR (reserved_amount_delta = 0 AND committed_amount_delta = 0))
);

COMMENT ON TABLE pur_allocation_trace IS '计划转单的原始需求份额账，不二次扣需求';
COMMENT ON COLUMN pur_allocation_trace.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_allocation_trace.allocation_event_id IS '对应计划转单分配事件ID';
COMMENT ON COLUMN pur_allocation_trace.origin_allocation_id IS '需求到计划的原始分配ID';
COMMENT ON COLUMN pur_allocation_trace.reserved_qty_delta IS '该需求份额数量占用变化';
COMMENT ON COLUMN pur_allocation_trace.committed_qty_delta IS '该需求份额数量承诺变化';
COMMENT ON COLUMN pur_allocation_trace.reserved_amount_delta IS '该需求份额金额占用变化';
COMMENT ON COLUMN pur_allocation_trace.committed_amount_delta IS '该需求份额金额承诺变化';
COMMENT ON COLUMN pur_allocation_trace.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_allocation_trace.created_by IS '创建人或系统主体的用户ID';

CREATE INDEX pur_allocation_trace_i01 ON pur_allocation_trace (origin_allocation_id, allocation_event_id);

-- 收货、验收、限额确认及反向处理单据版本
CREATE TABLE pur_execution_header (
    revision_id NUMBER(19,0) NOT NULL,
    action_type VARCHAR2(64 CHAR) NOT NULL,
    business_date DATE,
    posting_date DATE,
    operator_id NUMBER(19,0),
    delivery_note_no VARCHAR2(80 CHAR),
    reason_code VARCHAR2(64 CHAR),
    reason_note VARCHAR2(2000 CHAR),
    physical_occurred_at TIMESTAMP(6),
    business_confirmation_status VARCHAR2(64 CHAR) DEFAULT 'PENDING' NOT NULL,
    confirmed_at TIMESTAMP(6),
    notes VARCHAR2(2000 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_execution_header_pk PRIMARY KEY (revision_id),
    CONSTRAINT pur_execution_header_c01 CHECK ((revision_id BETWEEN 1 AND 9223372036854775807) AND (operator_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_execution_header_c02 CHECK (action_type IN ('GOODS_RECEIPT', 'SERVICE_ACCEPTANCE', 'LIMIT_CONFIRMATION', 'PURCHASE_RETURN', 'GR_REVERSAL', 'RETURN_REVERSAL', 'SERVICE_REVERSAL')),
    CONSTRAINT pur_execution_header_c03 CHECK (business_confirmation_status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED'))
);

COMMENT ON TABLE pur_execution_header IS '收货、验收、限额确认及反向处理单据版本';
COMMENT ON COLUMN pur_execution_header.revision_id IS '执行单据版本ID';
COMMENT ON COLUMN pur_execution_header.action_type IS '业务执行动作';
COMMENT ON COLUMN pur_execution_header.business_date IS '业务日期';
COMMENT ON COLUMN pur_execution_header.posting_date IS '期望过账日期';
COMMENT ON COLUMN pur_execution_header.operator_id IS '经办人ID';
COMMENT ON COLUMN pur_execution_header.delivery_note_no IS '供应商送货单号，可选';
COMMENT ON COLUMN pur_execution_header.reason_code IS '原因分类';
COMMENT ON COLUMN pur_execution_header.reason_note IS '业务原因说明';
COMMENT ON COLUMN pur_execution_header.physical_occurred_at IS '实际物理发生时间，UTC';
COMMENT ON COLUMN pur_execution_header.business_confirmation_status IS '业务确认进度，不等于SAP状态';
COMMENT ON COLUMN pur_execution_header.confirmed_at IS '业务确认时间，UTC';
COMMENT ON COLUMN pur_execution_header.notes IS '备注';
COMMENT ON COLUMN pur_execution_header.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_execution_header.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_execution_header.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_execution_header.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_execution_header.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_execution_header_i01 ON pur_execution_header (action_type, business_date);

CREATE INDEX pur_execution_header_i02 ON pur_execution_header (operator_id);

-- 执行单据行版本内容，最小关联到订单行
CREATE TABLE pur_execution_line (
    revision_id NUMBER(19,0) NOT NULL,
    line_id NUMBER(19,0) NOT NULL,
    document_id NUMBER(19,0) NOT NULL,
    order_revision_id NUMBER(19,0) NOT NULL,
    order_line_id NUMBER(19,0) NOT NULL,
    order_schedule_id NUMBER(19,0),
    order_distribution_id NUMBER(19,0),
    quantity NUMBER(20,6),
    uom_id NUMBER(19,0),
    net_amount NUMBER(20,6),
    tax_amount NUMBER(20,6),
    gross_amount NUMBER(20,6),
    control_amount NUMBER(20,6),
    amount_basis VARCHAR2(64 CHAR),
    currency_code VARCHAR2(3 CHAR),
    service_start DATE,
    service_end DATE,
    completion_note VARCHAR2(2000 CHAR),
    acceptance_result VARCHAR2(64 CHAR),
    acceptance_comment VARCHAR2(2000 CHAR),
    acceptor_id NUMBER(19,0),
    plant_id NUMBER(19,0),
    location_id NUMBER(19,0),
    batch_no VARCHAR2(64 CHAR),
    supplier_batch_no VARCHAR2(64 CHAR),
    manufacture_date DATE,
    expiry_date DATE,
    original_event_id NUMBER(19,0),
    replacement_required NUMBER(1,0),
    source_disposition VARCHAR2(64 CHAR),
    closure_task_id NUMBER(19,0),
    rule_bundle_id NUMBER(19,0) NOT NULL,
    input_snapshot CLOB,
    extension_values CLOB,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_execution_line_pk PRIMARY KEY (revision_id, line_id),
    CONSTRAINT pur_execution_line_c01 CHECK ((revision_id BETWEEN 1 AND 9223372036854775807) AND (line_id BETWEEN 1 AND 9223372036854775807) AND (document_id BETWEEN 1 AND 9223372036854775807) AND (order_revision_id BETWEEN 1 AND 9223372036854775807) AND (order_line_id BETWEEN 1 AND 9223372036854775807) AND (order_schedule_id BETWEEN 1 AND 9223372036854775807) AND (order_distribution_id BETWEEN 1 AND 9223372036854775807) AND (quantity >= 0) AND (uom_id BETWEEN 1 AND 9223372036854775807) AND (net_amount >= 0) AND (tax_amount >= 0) AND (gross_amount >= 0) AND (control_amount >= 0) AND (acceptor_id BETWEEN 1 AND 9223372036854775807) AND (plant_id BETWEEN 1 AND 9223372036854775807) AND (location_id BETWEEN 1 AND 9223372036854775807) AND (original_event_id BETWEEN 1 AND 9223372036854775807) AND (replacement_required IN (0,1)) AND (closure_task_id BETWEEN 1 AND 9223372036854775807) AND (rule_bundle_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_execution_line_c02 CHECK (amount_basis IN ('NET', 'GROSS')),
    CONSTRAINT pur_execution_line_c03 CHECK (acceptance_result IN ('PASS', 'FAIL')),
    CONSTRAINT pur_execution_line_c04 CHECK (source_disposition IN ('REPLACE', 'REPROCURE', 'NO_LONGER_NEEDED')),
    CONSTRAINT pur_execution_line_c05 CHECK (net_amount + tax_amount = gross_amount),
    CONSTRAINT pur_execution_line_c06 CHECK (service_end IS NULL OR service_start IS NULL OR service_end >= service_start),
    CONSTRAINT pur_execution_line_c07 CHECK (expiry_date IS NULL OR manufacture_date IS NULL OR expiry_date >= manufacture_date)
);

COMMENT ON TABLE pur_execution_line IS '执行单据行版本内容，最小关联到订单行';
COMMENT ON COLUMN pur_execution_line.revision_id IS '所属内容版本ID';
COMMENT ON COLUMN pur_execution_line.line_id IS '所属稳定业务行ID';
COMMENT ON COLUMN pur_execution_line.document_id IS '所属稳定单据ID';
COMMENT ON COLUMN pur_execution_line.order_revision_id IS '实际执行的订单正式版本ID';
COMMENT ON COLUMN pur_execution_line.order_line_id IS '订单稳定行ID';
COMMENT ON COLUMN pur_execution_line.order_schedule_id IS '对应订单版本交付安排ID';
COMMENT ON COLUMN pur_execution_line.order_distribution_id IS '对应订单版本业务归属分配ID';
COMMENT ON COLUMN pur_execution_line.quantity IS '本次业务数量，非负输入';
COMMENT ON COLUMN pur_execution_line.uom_id IS '业务单位ID';
COMMENT ON COLUMN pur_execution_line.net_amount IS '本次未税金额';
COMMENT ON COLUMN pur_execution_line.tax_amount IS '本次税额';
COMMENT ON COLUMN pur_execution_line.gross_amount IS '本次含税金额';
COMMENT ON COLUMN pur_execution_line.control_amount IS '按订单控制口径的本次金额';
COMMENT ON COLUMN pur_execution_line.amount_basis IS '控制金额税口径';
COMMENT ON COLUMN pur_execution_line.currency_code IS '币种';
COMMENT ON COLUMN pur_execution_line.service_start IS '本次服务期间开始';
COMMENT ON COLUMN pur_execution_line.service_end IS '本次服务期间结束';
COMMENT ON COLUMN pur_execution_line.completion_note IS '工作完成说明';
COMMENT ON COLUMN pur_execution_line.acceptance_result IS '验收通过或不通过';
COMMENT ON COLUMN pur_execution_line.acceptance_comment IS '验收意见';
COMMENT ON COLUMN pur_execution_line.acceptor_id IS '验收人ID';
COMMENT ON COLUMN pur_execution_line.plant_id IS '工厂组织ID';
COMMENT ON COLUMN pur_execution_line.location_id IS '地点参考ID';
COMMENT ON COLUMN pur_execution_line.batch_no IS '批次号';
COMMENT ON COLUMN pur_execution_line.supplier_batch_no IS '供应商批号';
COMMENT ON COLUMN pur_execution_line.manufacture_date IS '生产日期';
COMMENT ON COLUMN pur_execution_line.expiry_date IS '有效期至';
COMMENT ON COLUMN pur_execution_line.original_event_id IS '反向操作关联的原始执行事件ID';
COMMENT ON COLUMN pur_execution_line.replacement_required IS '退货后是否补货';
COMMENT ON COLUMN pur_execution_line.source_disposition IS '补货、另行采购或不再需要';
COMMENT ON COLUMN pur_execution_line.closure_task_id IS '后续关闭处置任务ID';
COMMENT ON COLUMN pur_execution_line.rule_bundle_id IS '本次执行采用的规则包ID';
COMMENT ON COLUMN pur_execution_line.input_snapshot IS '冻结输入快照JSON';
COMMENT ON COLUMN pur_execution_line.extension_values IS '受控扩展字段JSON';
COMMENT ON COLUMN pur_execution_line.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_execution_line.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_execution_line.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_execution_line.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_execution_line.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_execution_line_i01 ON pur_execution_line (document_id, line_id);

CREATE INDEX pur_execution_line_i02 ON pur_execution_line (line_id);

CREATE INDEX pur_execution_line_i03 ON pur_execution_line (order_revision_id, order_line_id);

CREATE INDEX pur_execution_line_i04 ON pur_execution_line (original_event_id);

CREATE INDEX pur_execution_line_i05 ON pur_execution_line (order_schedule_id);

-- 已生效的正反履约事实，不覆盖历史
CREATE TABLE pur_execution_event (
    id NUMBER(19,0) NOT NULL,
    execution_revision_id NUMBER(19,0) NOT NULL,
    execution_line_id NUMBER(19,0) NOT NULL,
    order_revision_id NUMBER(19,0) NOT NULL,
    order_line_id NUMBER(19,0) NOT NULL,
    schedule_key VARCHAR2(64 CHAR),
    event_type VARCHAR2(64 CHAR) NOT NULL,
    quantity_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    net_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    tax_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    gross_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    control_amount_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    currency_code VARCHAR2(3 CHAR),
    uom_id NUMBER(19,0),
    original_event_id NUMBER(19,0),
    effective_at TIMESTAMP(6) NOT NULL,
    command_id NUMBER(19,0) NOT NULL,
    effect_basis VARCHAR2(64 CHAR) NOT NULL,
    integration_evidence_id NUMBER(19,0),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    CONSTRAINT pur_execution_event_pk PRIMARY KEY (id),
    CONSTRAINT pur_execution_event_u01 UNIQUE (execution_revision_id, execution_line_id, event_type),
    CONSTRAINT pur_execution_event_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (execution_revision_id BETWEEN 1 AND 9223372036854775807) AND (execution_line_id BETWEEN 1 AND 9223372036854775807) AND (order_revision_id BETWEEN 1 AND 9223372036854775807) AND (order_line_id BETWEEN 1 AND 9223372036854775807) AND (uom_id BETWEEN 1 AND 9223372036854775807) AND (original_event_id BETWEEN 1 AND 9223372036854775807) AND (command_id BETWEEN 1 AND 9223372036854775807) AND (integration_evidence_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807)),
    CONSTRAINT pur_execution_event_c02 CHECK (event_type IN ('GOODS_RECEIPT', 'SERVICE_ACCEPTANCE', 'LIMIT_CONFIRMATION', 'PURCHASE_RETURN', 'GR_REVERSAL', 'RETURN_REVERSAL', 'SERVICE_REVERSAL')),
    CONSTRAINT pur_execution_event_c03 CHECK (effect_basis IN ('BUSINESS_CONFIRMED', 'ERP_CONFIRMED', 'PROVEN_LOCAL_CORRECTION')),
    CONSTRAINT pur_execution_event_c04 CHECK (original_event_id <> id),
    CONSTRAINT pur_execution_event_c05 CHECK (net_delta + tax_delta = gross_delta),
    CONSTRAINT pur_execution_event_c06 CHECK (((event_type IN ('GOODS_RECEIPT','SERVICE_ACCEPTANCE','LIMIT_CONFIRMATION','RETURN_REVERSAL')) AND quantity_delta >= 0 AND control_amount_delta >= 0 AND net_delta >= 0 AND tax_delta >= 0 AND gross_delta >= 0) OR ((event_type IN ('PURCHASE_RETURN','GR_REVERSAL','SERVICE_REVERSAL')) AND quantity_delta <= 0 AND control_amount_delta <= 0 AND net_delta <= 0 AND tax_delta <= 0 AND gross_delta <= 0)),
    CONSTRAINT pur_execution_event_c07 CHECK (event_type NOT IN ('PURCHASE_RETURN','GR_REVERSAL','RETURN_REVERSAL','SERVICE_REVERSAL') OR original_event_id IS NOT NULL),
    CONSTRAINT pur_execution_event_c08 CHECK (quantity_delta <> 0 OR control_amount_delta <> 0)
);

COMMENT ON TABLE pur_execution_event IS '已生效的正反履约事实，不覆盖历史';
COMMENT ON COLUMN pur_execution_event.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_execution_event.execution_revision_id IS '执行单据版本ID';
COMMENT ON COLUMN pur_execution_event.execution_line_id IS '执行单据稳定行ID';
COMMENT ON COLUMN pur_execution_event.order_revision_id IS '执行时订单版本ID';
COMMENT ON COLUMN pur_execution_event.order_line_id IS '订单稳定行ID';
COMMENT ON COLUMN pur_execution_event.schedule_key IS '跨版本交付安排键';
COMMENT ON COLUMN pur_execution_event.event_type IS '正向或反向业务事件';
COMMENT ON COLUMN pur_execution_event.quantity_delta IS '生效数量增减';
COMMENT ON COLUMN pur_execution_event.net_delta IS '未税金额增减';
COMMENT ON COLUMN pur_execution_event.tax_delta IS '税额增减';
COMMENT ON COLUMN pur_execution_event.gross_delta IS '含税金额增减';
COMMENT ON COLUMN pur_execution_event.control_amount_delta IS '控制口径金额增减';
COMMENT ON COLUMN pur_execution_event.currency_code IS '币种';
COMMENT ON COLUMN pur_execution_event.uom_id IS '数量单位ID';
COMMENT ON COLUMN pur_execution_event.original_event_id IS '直接被更正的原事件ID';
COMMENT ON COLUMN pur_execution_event.effective_at IS '事件生效时间，UTC';
COMMENT ON COLUMN pur_execution_event.command_id IS '业务幂等命令ID';
COMMENT ON COLUMN pur_execution_event.effect_basis IS '业务确认、ERP确认或证实的本地更正';
COMMENT ON COLUMN pur_execution_event.integration_evidence_id IS '核对证据ID';
COMMENT ON COLUMN pur_execution_event.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_execution_event.created_by IS '创建人或系统主体的用户ID';

CREATE INDEX pur_execution_event_i01 ON pur_execution_event (order_line_id, effective_at, id);

CREATE INDEX pur_execution_event_i02 ON pur_execution_event (original_event_id, id);

CREATE INDEX pur_execution_event_i03 ON pur_execution_event (order_line_id, schedule_key);

CREATE INDEX pur_execution_event_i04 ON pur_execution_event (command_id);

-- 审批或反向处理中占用，不重复计为履约事实
CREATE TABLE pur_execution_hold (
    id NUMBER(19,0) NOT NULL,
    execution_revision_id NUMBER(19,0) NOT NULL,
    execution_line_id NUMBER(19,0) NOT NULL,
    order_line_id NUMBER(19,0) NOT NULL,
    schedule_key VARCHAR2(64 CHAR),
    original_event_id NUMBER(19,0),
    hold_kind VARCHAR2(64 CHAR) NOT NULL,
    quantity NUMBER(20,6) DEFAULT 0 NOT NULL,
    control_amount NUMBER(20,6) DEFAULT 0 NOT NULL,
    status VARCHAR2(64 CHAR) DEFAULT 'ACTIVE' NOT NULL,
    created_by_command_id NUMBER(19,0) NOT NULL,
    resolved_by_command_id NUMBER(19,0),
    resolved_at TIMESTAMP(6),
    resolution_reason VARCHAR2(2000 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_execution_hold_pk PRIMARY KEY (id),
    CONSTRAINT pur_execution_hold_u01 UNIQUE (execution_revision_id, execution_line_id, hold_kind),
    CONSTRAINT pur_execution_hold_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (execution_revision_id BETWEEN 1 AND 9223372036854775807) AND (execution_line_id BETWEEN 1 AND 9223372036854775807) AND (order_line_id BETWEEN 1 AND 9223372036854775807) AND (original_event_id BETWEEN 1 AND 9223372036854775807) AND (quantity >= 0) AND (control_amount >= 0) AND (created_by_command_id BETWEEN 1 AND 9223372036854775807) AND (resolved_by_command_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_execution_hold_c02 CHECK (hold_kind IN ('FORWARD_APPROVAL', 'REVERSE_PENDING', 'NO_REPLACE_BLOCK')),
    CONSTRAINT pur_execution_hold_c03 CHECK (status IN ('ACTIVE', 'CONSUMED', 'RELEASED')),
    CONSTRAINT pur_execution_hold_c04 CHECK (quantity > 0 OR control_amount > 0),
    CONSTRAINT pur_execution_hold_c05 CHECK (hold_kind = 'FORWARD_APPROVAL' OR original_event_id IS NOT NULL),
    CONSTRAINT pur_execution_hold_c06 CHECK (status = 'ACTIVE' OR (resolved_by_command_id IS NOT NULL AND resolved_at IS NOT NULL))
);

COMMENT ON TABLE pur_execution_hold IS '审批或反向处理中占用，不重复计为履约事实';
COMMENT ON COLUMN pur_execution_hold.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_execution_hold.execution_revision_id IS '执行申请版本ID';
COMMENT ON COLUMN pur_execution_hold.execution_line_id IS '执行申请稳定行ID';
COMMENT ON COLUMN pur_execution_hold.order_line_id IS '订单稳定行ID';
COMMENT ON COLUMN pur_execution_hold.schedule_key IS '交付安排稳定键';
COMMENT ON COLUMN pur_execution_hold.original_event_id IS '反向占用的原执行事件ID';
COMMENT ON COLUMN pur_execution_hold.hold_kind IS '正向审批、反向在途或不补货阻断';
COMMENT ON COLUMN pur_execution_hold.quantity IS '占用数量';
COMMENT ON COLUMN pur_execution_hold.control_amount IS '占用控制金额';
COMMENT ON COLUMN pur_execution_hold.status IS '占用状态';
COMMENT ON COLUMN pur_execution_hold.created_by_command_id IS '创建占用的幂等命令ID';
COMMENT ON COLUMN pur_execution_hold.resolved_by_command_id IS '结清占用的幂等命令ID';
COMMENT ON COLUMN pur_execution_hold.resolved_at IS '结清时间，UTC';
COMMENT ON COLUMN pur_execution_hold.resolution_reason IS '结清说明';
COMMENT ON COLUMN pur_execution_hold.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_execution_hold.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_execution_hold.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_execution_hold.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_execution_hold.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_execution_hold_i01 ON pur_execution_hold (order_line_id, status, hold_kind);

CREATE INDEX pur_execution_hold_i02 ON pur_execution_hold (original_event_id, status);

-- 履约事实的原需求或独立来源份额
CREATE TABLE pur_execution_attribution (
    id NUMBER(19,0) NOT NULL,
    execution_event_id NUMBER(19,0) NOT NULL,
    order_allocation_id NUMBER(19,0),
    root_source_line_id NUMBER(19,0),
    origin_allocation_id NUMBER(19,0),
    attribution_type VARCHAR2(64 CHAR) NOT NULL,
    quantity_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    control_amount_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    net_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    gross_delta NUMBER(20,6) DEFAULT 0 NOT NULL,
    reverses_attribution_id NUMBER(19,0),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    CONSTRAINT pur_execution_attribution_pk PRIMARY KEY (id),
    CONSTRAINT pur_execution_attribution_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (execution_event_id BETWEEN 1 AND 9223372036854775807) AND (order_allocation_id BETWEEN 1 AND 9223372036854775807) AND (root_source_line_id BETWEEN 1 AND 9223372036854775807) AND (origin_allocation_id BETWEEN 1 AND 9223372036854775807) AND (reverses_attribution_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807)),
    CONSTRAINT pur_execution_attribution_c02 CHECK (attribution_type IN ('SOURCED', 'DIRECT', 'OVER_DELIVERY')),
    CONSTRAINT pur_execution_attribution_c03 CHECK (reverses_attribution_id <> id),
    CONSTRAINT pur_execution_attribution_c04 CHECK ((attribution_type = 'SOURCED' AND order_allocation_id IS NOT NULL AND root_source_line_id IS NOT NULL) OR (attribution_type IN ('DIRECT','OVER_DELIVERY') AND order_allocation_id IS NULL AND root_source_line_id IS NULL AND origin_allocation_id IS NULL))
);

COMMENT ON TABLE pur_execution_attribution IS '履约事实的原需求或独立来源份额';
COMMENT ON COLUMN pur_execution_attribution.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_execution_attribution.execution_event_id IS '所属执行事件ID';
COMMENT ON COLUMN pur_execution_attribution.order_allocation_id IS '订单直接来源分配ID';
COMMENT ON COLUMN pur_execution_attribution.root_source_line_id IS '根需求或独立计划稳定行ID';
COMMENT ON COLUMN pur_execution_attribution.origin_allocation_id IS '计划路径的需求到计划分配ID';
COMMENT ON COLUMN pur_execution_attribution.attribution_type IS '来源支持、直接采购或容差超收';
COMMENT ON COLUMN pur_execution_attribution.quantity_delta IS '对应数量增减';
COMMENT ON COLUMN pur_execution_attribution.control_amount_delta IS '控制金额增减';
COMMENT ON COLUMN pur_execution_attribution.net_delta IS '未税金额增减';
COMMENT ON COLUMN pur_execution_attribution.gross_delta IS '含税金额增减';
COMMENT ON COLUMN pur_execution_attribution.reverses_attribution_id IS '反向更正的原份额ID';
COMMENT ON COLUMN pur_execution_attribution.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_execution_attribution.created_by IS '创建人或系统主体的用户ID';

CREATE INDEX pur_execution_attribution_i01 ON pur_execution_attribution (execution_event_id);

CREATE INDEX pur_execution_attribution_i02 ON pur_execution_attribution (root_source_line_id);

CREATE INDEX pur_execution_attribution_i03 ON pur_execution_attribution (order_allocation_id);

CREATE INDEX pur_execution_attribution_i04 ON pur_execution_attribution (origin_allocation_id);

CREATE INDEX pur_execution_attribution_i05 ON pur_execution_attribution (reverses_attribution_id);

-- 业务异常与处置责任
CREATE TABLE pur_exception_case (
    id NUMBER(19,0) NOT NULL,
    case_no VARCHAR2(80 CHAR) NOT NULL,
    dedup_key VARCHAR2(200 CHAR) NOT NULL,
    document_id NUMBER(19,0) NOT NULL,
    line_id NUMBER(19,0),
    integration_task_id NUMBER(19,0),
    exception_type VARCHAR2(64 CHAR) NOT NULL,
    severity VARCHAR2(64 CHAR) NOT NULL,
    status VARCHAR2(64 CHAR) DEFAULT 'OPEN' NOT NULL,
    owner_id NUMBER(19,0),
    due_at TIMESTAMP(6),
    fact_snapshot CLOB NOT NULL,
    resolution_type VARCHAR2(64 CHAR),
    resolution_note VARCHAR2(2000 CHAR),
    resolved_by NUMBER(19,0),
    resolved_at TIMESTAMP(6),
    verified_at TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_exception_case_pk PRIMARY KEY (id),
    CONSTRAINT pur_exception_case_u01 UNIQUE (case_no),
    CONSTRAINT pur_exception_case_u02 UNIQUE (dedup_key),
    CONSTRAINT pur_exception_case_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (document_id BETWEEN 1 AND 9223372036854775807) AND (line_id BETWEEN 1 AND 9223372036854775807) AND (integration_task_id BETWEEN 1 AND 9223372036854775807) AND (owner_id BETWEEN 1 AND 9223372036854775807) AND (resolved_by BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_exception_case_c02 CHECK (status IN ('OPEN', 'IN_PROGRESS', 'WAITING_EXTERNAL', 'RESOLVED', 'CLOSED')),
    CONSTRAINT pur_exception_case_c03 CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL'))
);

COMMENT ON TABLE pur_exception_case IS '业务异常与处置责任';
COMMENT ON COLUMN pur_exception_case.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_exception_case.case_no IS '异常业务编号';
COMMENT ON COLUMN pur_exception_case.dedup_key IS '对象、版本、异常代次组成的防重键';
COMMENT ON COLUMN pur_exception_case.document_id IS '所属业务单据ID';
COMMENT ON COLUMN pur_exception_case.line_id IS '涉及稳定行ID';
COMMENT ON COLUMN pur_exception_case.integration_task_id IS '相关SAP集成任务ID';
COMMENT ON COLUMN pur_exception_case.exception_type IS '异常类型，不包含供应商回复流程';
COMMENT ON COLUMN pur_exception_case.severity IS '严重程度';
COMMENT ON COLUMN pur_exception_case.status IS '异常处理状态';
COMMENT ON COLUMN pur_exception_case.owner_id IS '当前处置责任人ID';
COMMENT ON COLUMN pur_exception_case.due_at IS '处理期限，UTC';
COMMENT ON COLUMN pur_exception_case.fact_snapshot IS '发现时业务事实快照JSON';
COMMENT ON COLUMN pur_exception_case.resolution_type IS '实际处置方式';
COMMENT ON COLUMN pur_exception_case.resolution_note IS '处置说明';
COMMENT ON COLUMN pur_exception_case.resolved_by IS '处置人ID';
COMMENT ON COLUMN pur_exception_case.resolved_at IS '处置时间，UTC';
COMMENT ON COLUMN pur_exception_case.verified_at IS '复核关闭时间，UTC';
COMMENT ON COLUMN pur_exception_case.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_exception_case.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_exception_case.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_exception_case.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_exception_case.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_exception_case_i01 ON pur_exception_case (owner_id, status, due_at, id);

CREATE INDEX pur_exception_case_i02 ON pur_exception_case (document_id, line_id, status);

CREATE INDEX pur_exception_case_i03 ON pur_exception_case (integration_task_id);

-- 冻结版本对应的审批实例
CREATE TABLE pur_approval_instance (
    id NUMBER(19,0) NOT NULL,
    revision_id NUMBER(19,0) NOT NULL,
    approval_purpose VARCHAR2(64 CHAR) NOT NULL,
    policy_rule_id NUMBER(19,0) NOT NULL,
    status VARCHAR2(64 CHAR) NOT NULL,
    current_step_no NUMBER(10,0),
    submitted_by NUMBER(19,0) NOT NULL,
    submitted_at TIMESTAMP(6) NOT NULL,
    completed_at TIMESTAMP(6),
    decision_snapshot CLOB,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_approval_instance_pk PRIMARY KEY (id),
    CONSTRAINT pur_approval_instance_u01 UNIQUE (revision_id, approval_purpose),
    CONSTRAINT pur_approval_instance_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (revision_id BETWEEN 1 AND 9223372036854775807) AND (policy_rule_id BETWEEN 1 AND 9223372036854775807) AND (current_step_no >= 0) AND (submitted_by BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_approval_instance_c02 CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'NOT_REQUIRED')),
    CONSTRAINT pur_approval_instance_c03 CHECK (current_step_no > 0),
    CONSTRAINT pur_approval_instance_c04 CHECK (completed_at IS NULL OR completed_at >= submitted_at)
);

COMMENT ON TABLE pur_approval_instance IS '冻结版本对应的审批实例';
COMMENT ON COLUMN pur_approval_instance.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_approval_instance.revision_id IS '被审批业务版本ID';
COMMENT ON COLUMN pur_approval_instance.approval_purpose IS '审批目的';
COMMENT ON COLUMN pur_approval_instance.policy_rule_id IS '命中的已发布审批规则版本ID';
COMMENT ON COLUMN pur_approval_instance.status IS '审批状态';
COMMENT ON COLUMN pur_approval_instance.current_step_no IS '当前有效审批步骤号';
COMMENT ON COLUMN pur_approval_instance.submitted_by IS '提交人ID';
COMMENT ON COLUMN pur_approval_instance.submitted_at IS '提交时间，UTC';
COMMENT ON COLUMN pur_approval_instance.completed_at IS '审批结束时间，UTC';
COMMENT ON COLUMN pur_approval_instance.decision_snapshot IS '审批结论及策略快照JSON';
COMMENT ON COLUMN pur_approval_instance.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_approval_instance.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_approval_instance.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_approval_instance.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_approval_instance.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_approval_instance_i01 ON pur_approval_instance (policy_rule_id);

CREATE INDEX pur_approval_instance_i02 ON pur_approval_instance (submitted_by, status);

-- 首期串行审批步骤与实际决策人
CREATE TABLE pur_approval_step (
    id NUMBER(19,0) NOT NULL,
    instance_id NUMBER(19,0) NOT NULL,
    step_no NUMBER(10,0) NOT NULL,
    assigned_user_id NUMBER(19,0),
    assigned_role_id NUMBER(19,0),
    status VARCHAR2(64 CHAR) NOT NULL,
    actual_actor_id NUMBER(19,0),
    delegated_from_id NUMBER(19,0),
    decision VARCHAR2(64 CHAR),
    decision_comment VARCHAR2(2000 CHAR),
    decided_at TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_approval_step_pk PRIMARY KEY (id),
    CONSTRAINT pur_approval_step_u01 UNIQUE (instance_id, step_no),
    CONSTRAINT pur_approval_step_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (instance_id BETWEEN 1 AND 9223372036854775807) AND (step_no >= 0) AND (assigned_user_id BETWEEN 1 AND 9223372036854775807) AND (assigned_role_id BETWEEN 1 AND 9223372036854775807) AND (actual_actor_id BETWEEN 1 AND 9223372036854775807) AND (delegated_from_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_approval_step_c02 CHECK (step_no > 0),
    CONSTRAINT pur_approval_step_c03 CHECK (status IN ('WAITING', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'SKIPPED')),
    CONSTRAINT pur_approval_step_c04 CHECK (decision IN ('APPROVE', 'REJECT')),
    CONSTRAINT pur_approval_step_c05 CHECK ((assigned_user_id IS NOT NULL AND assigned_role_id IS NULL) OR (assigned_user_id IS NULL AND assigned_role_id IS NOT NULL))
);

COMMENT ON TABLE pur_approval_step IS '首期串行审批步骤与实际决策人';
COMMENT ON COLUMN pur_approval_step.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_approval_step.instance_id IS '审批实例ID';
COMMENT ON COLUMN pur_approval_step.step_no IS '步骤号，从1开始';
COMMENT ON COLUMN pur_approval_step.assigned_user_id IS '指定审批人ID';
COMMENT ON COLUMN pur_approval_step.assigned_role_id IS '候选审批角色ID';
COMMENT ON COLUMN pur_approval_step.status IS '步骤状态';
COMMENT ON COLUMN pur_approval_step.actual_actor_id IS '实际决策用户ID';
COMMENT ON COLUMN pur_approval_step.delegated_from_id IS '被代理用户ID';
COMMENT ON COLUMN pur_approval_step.decision IS '批准或驳回决定';
COMMENT ON COLUMN pur_approval_step.decision_comment IS '审批意见，避免使用COMMENT保留字';
COMMENT ON COLUMN pur_approval_step.decided_at IS '决策时间，UTC';
COMMENT ON COLUMN pur_approval_step.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_approval_step.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_approval_step.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_approval_step.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_approval_step.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_approval_step_i01 ON pur_approval_step (assigned_user_id, status);

CREATE INDEX pur_approval_step_i02 ON pur_approval_step (assigned_role_id, status);

-- 业务待办入口，不代替业务命令
CREATE TABLE pur_task (
    id NUMBER(19,0) NOT NULL,
    task_key VARCHAR2(200 CHAR) NOT NULL,
    task_type VARCHAR2(64 CHAR) NOT NULL,
    document_id NUMBER(19,0),
    revision_id NUMBER(19,0),
    approval_step_id NUMBER(19,0),
    exception_id NUMBER(19,0),
    assignee_id NUMBER(19,0),
    candidate_role_id NUMBER(19,0),
    company_id NUMBER(19,0) NOT NULL,
    status VARCHAR2(64 CHAR) DEFAULT 'OPEN' NOT NULL,
    due_at TIMESTAMP(6),
    completed_at TIMESTAMP(6),
    result_note VARCHAR2(2000 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_task_pk PRIMARY KEY (id),
    CONSTRAINT pur_task_u01 UNIQUE (task_key),
    CONSTRAINT pur_task_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (document_id BETWEEN 1 AND 9223372036854775807) AND (revision_id BETWEEN 1 AND 9223372036854775807) AND (approval_step_id BETWEEN 1 AND 9223372036854775807) AND (exception_id BETWEEN 1 AND 9223372036854775807) AND (assignee_id BETWEEN 1 AND 9223372036854775807) AND (candidate_role_id BETWEEN 1 AND 9223372036854775807) AND (company_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_task_c02 CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
    CONSTRAINT pur_task_c03 CHECK (approval_step_id IS NULL OR exception_id IS NULL)
);

COMMENT ON TABLE pur_task IS '业务待办入口，不代替业务命令';
COMMENT ON COLUMN pur_task.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_task.task_key IS '业务待办唯一键';
COMMENT ON COLUMN pur_task.task_type IS '待办类型，不创建供应商确认任务';
COMMENT ON COLUMN pur_task.document_id IS '所属业务单据ID';
COMMENT ON COLUMN pur_task.revision_id IS '所属单据版本ID';
COMMENT ON COLUMN pur_task.approval_step_id IS '当前有效审批步骤ID';
COMMENT ON COLUMN pur_task.exception_id IS '关联异常ID';
COMMENT ON COLUMN pur_task.assignee_id IS '指定处理人ID';
COMMENT ON COLUMN pur_task.candidate_role_id IS '候选处理角色ID';
COMMENT ON COLUMN pur_task.company_id IS '授权法人ID';
COMMENT ON COLUMN pur_task.status IS '待办状态';
COMMENT ON COLUMN pur_task.due_at IS '处理到期时间，UTC';
COMMENT ON COLUMN pur_task.completed_at IS '完成时间，UTC';
COMMENT ON COLUMN pur_task.result_note IS '处理结果';
COMMENT ON COLUMN pur_task.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_task.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_task.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_task.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_task.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_task_i01 ON pur_task (assignee_id, status, due_at, id);

CREATE INDEX pur_task_i02 ON pur_task (candidate_role_id, status);

CREATE INDEX pur_task_i03 ON pur_task (company_id, status);

CREATE INDEX pur_task_i04 ON pur_task (document_id, revision_id);

CREATE INDEX pur_task_i05 ON pur_task (approval_step_id);

CREATE INDEX pur_task_i06 ON pur_task (exception_id);

-- 受控对象存储中的附件元数据
CREATE TABLE pur_attachment (
    id NUMBER(19,0) NOT NULL,
    storage_key VARCHAR2(500 CHAR) NOT NULL,
    file_name VARCHAR2(255 CHAR) NOT NULL,
    content_type VARCHAR2(150 CHAR) NOT NULL,
    size_bytes NUMBER(19,0) NOT NULL,
    sha256 VARCHAR2(64 CHAR) NOT NULL,
    upload_status VARCHAR2(64 CHAR) NOT NULL,
    scan_status VARCHAR2(64 CHAR) NOT NULL,
    uploaded_by NUMBER(19,0) NOT NULL,
    uploaded_at TIMESTAMP(6) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_attachment_pk PRIMARY KEY (id),
    CONSTRAINT pur_attachment_u01 UNIQUE (storage_key),
    CONSTRAINT pur_attachment_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (size_bytes >= 0) AND (uploaded_by BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_attachment_c02 CHECK (upload_status IN ('PENDING', 'UPLOADED', 'FAILED')),
    CONSTRAINT pur_attachment_c03 CHECK (scan_status IN ('PENDING', 'PASSED', 'REJECTED', 'ERROR'))
);

COMMENT ON TABLE pur_attachment IS '受控对象存储中的附件元数据';
COMMENT ON COLUMN pur_attachment.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_attachment.storage_key IS '对象存储键，不保存永久公开URL';
COMMENT ON COLUMN pur_attachment.file_name IS '原文件名';
COMMENT ON COLUMN pur_attachment.content_type IS '文件内容类型';
COMMENT ON COLUMN pur_attachment.size_bytes IS '文件字节大小';
COMMENT ON COLUMN pur_attachment.sha256 IS '内容哈希';
COMMENT ON COLUMN pur_attachment.upload_status IS '上传状态';
COMMENT ON COLUMN pur_attachment.scan_status IS '安全扫描状态';
COMMENT ON COLUMN pur_attachment.uploaded_by IS '上传人ID';
COMMENT ON COLUMN pur_attachment.uploaded_at IS '上传时间，UTC';
COMMENT ON COLUMN pur_attachment.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_attachment.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_attachment.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_attachment.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_attachment.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_attachment_i01 ON pur_attachment (uploaded_by, uploaded_at);

-- 附件与版本、补充记录、异常或证据的逻辑关联
CREATE TABLE pur_attachment_link (
    id NUMBER(19,0) NOT NULL,
    attachment_id NUMBER(19,0) NOT NULL,
    target_type VARCHAR2(64 CHAR) NOT NULL,
    target_id NUMBER(19,0) NOT NULL,
    purpose VARCHAR2(64 CHAR) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    CONSTRAINT pur_attachment_link_pk PRIMARY KEY (id),
    CONSTRAINT pur_attachment_link_u01 UNIQUE (attachment_id, target_type, target_id, purpose),
    CONSTRAINT pur_attachment_link_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (attachment_id BETWEEN 1 AND 9223372036854775807) AND (target_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807)),
    CONSTRAINT pur_attachment_link_c02 CHECK (target_type IN ('REVISION', 'AUDIT_EVENT', 'EXCEPTION', 'INTEGRATION_EVIDENCE'))
);

COMMENT ON TABLE pur_attachment_link IS '附件与版本、补充记录、异常或证据的逻辑关联';
COMMENT ON COLUMN pur_attachment_link.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_attachment_link.attachment_id IS '附件ID';
COMMENT ON COLUMN pur_attachment_link.target_type IS '明确的附件目标类型';
COMMENT ON COLUMN pur_attachment_link.target_id IS '目标记录ID，由服务端校验存在和归属';
COMMENT ON COLUMN pur_attachment_link.purpose IS '附件用途';
COMMENT ON COLUMN pur_attachment_link.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_attachment_link.created_by IS '创建人或系统主体的用户ID';

CREATE INDEX pur_attachment_link_i01 ON pur_attachment_link (target_type, target_id);

-- 不可覆盖审计与可选内部交付备注
CREATE TABLE pur_audit_event (
    id NUMBER(19,0) NOT NULL,
    document_id NUMBER(19,0),
    revision_id NUMBER(19,0),
    entity_type VARCHAR2(64 CHAR) NOT NULL,
    entity_key VARCHAR2(200 CHAR) NOT NULL,
    action_code VARCHAR2(64 CHAR) NOT NULL,
    entity_version NUMBER(19,0),
    actor_id NUMBER(19,0) NOT NULL,
    delegated_from_id NUMBER(19,0),
    command_id NUMBER(19,0),
    occurred_at TIMESTAMP(6) NOT NULL,
    reason VARCHAR2(2000 CHAR),
    before_values CLOB,
    after_values CLOB,
    trace_id VARCHAR2(100 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    CONSTRAINT pur_audit_event_pk PRIMARY KEY (id),
    CONSTRAINT pur_audit_event_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (document_id BETWEEN 1 AND 9223372036854775807) AND (revision_id BETWEEN 1 AND 9223372036854775807) AND (entity_version >= 0) AND (actor_id BETWEEN 1 AND 9223372036854775807) AND (delegated_from_id BETWEEN 1 AND 9223372036854775807) AND (command_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807)),
    CONSTRAINT pur_audit_event_c02 CHECK (action_code <> 'ORDER_DELIVERY_NOTE' OR (document_id IS NOT NULL AND revision_id IS NOT NULL AND entity_type = 'ORDER_SCHEDULE' AND entity_version IS NOT NULL AND command_id IS NOT NULL))
);

COMMENT ON TABLE pur_audit_event IS '不可覆盖审计与可选内部交付备注';
COMMENT ON COLUMN pur_audit_event.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_audit_event.document_id IS '关联稳定单据ID';
COMMENT ON COLUMN pur_audit_event.revision_id IS '关联业务版本ID';
COMMENT ON COLUMN pur_audit_event.entity_type IS '业务对象类型';
COMMENT ON COLUMN pur_audit_event.entity_key IS '规范化对象身份键';
COMMENT ON COLUMN pur_audit_event.action_code IS '动作代码；交付备注使用ORDER_DELIVERY_NOTE';
COMMENT ON COLUMN pur_audit_event.entity_version IS '业务对象的受锁版本号；交付备注为订单根row_version';
COMMENT ON COLUMN pur_audit_event.actor_id IS '实际操作者ID';
COMMENT ON COLUMN pur_audit_event.delegated_from_id IS '代理前身份ID';
COMMENT ON COLUMN pur_audit_event.command_id IS '幂等命令ID';
COMMENT ON COLUMN pur_audit_event.occurred_at IS '服务端记录时间，UTC';
COMMENT ON COLUMN pur_audit_event.reason IS '操作原因';
COMMENT ON COLUMN pur_audit_event.before_values IS '受控、脱敏的原值JSON';
COMMENT ON COLUMN pur_audit_event.after_values IS '受控、脱敏的新值JSON；预计日期不覆盖订单交期';
COMMENT ON COLUMN pur_audit_event.trace_id IS '调用链追踪标识';
COMMENT ON COLUMN pur_audit_event.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_audit_event.created_by IS '创建人或系统主体的用户ID';

CREATE INDEX pur_audit_event_i01 ON pur_audit_event (document_id, occurred_at, id);

CREATE INDEX pur_audit_event_i02 ON pur_audit_event (document_id, revision_id, action_code, entity_key, entity_version);

CREATE INDEX pur_audit_event_i03 ON pur_audit_event (command_id);

-- 场景、字段、采购策略、审批及容差版本
CREATE TABLE pur_rule_version (
    id NUMBER(19,0) NOT NULL,
    rule_key VARCHAR2(64 CHAR) NOT NULL,
    version_no NUMBER(10,0) NOT NULL,
    rule_category VARCHAR2(64 CHAR) NOT NULL,
    scope_company_id NUMBER(19,0),
    scope_org_id NUMBER(19,0),
    priority NUMBER(10,0) NOT NULL,
    status VARCHAR2(64 CHAR) NOT NULL,
    valid_from TIMESTAMP(6),
    valid_to TIMESTAMP(6),
    definition CLOB NOT NULL,
    content_hash VARCHAR2(64 CHAR) NOT NULL,
    published_by NUMBER(19,0),
    published_at TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_rule_version_pk PRIMARY KEY (id),
    CONSTRAINT pur_rule_version_u01 UNIQUE (rule_key, version_no),
    CONSTRAINT pur_rule_version_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (version_no >= 0) AND (scope_company_id BETWEEN 1 AND 9223372036854775807) AND (scope_org_id BETWEEN 1 AND 9223372036854775807) AND (priority >= 0) AND (published_by BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_rule_version_c02 CHECK (version_no > 0),
    CONSTRAINT pur_rule_version_c03 CHECK (rule_category IN ('SCENARIO', 'FIELDS', 'POLICY', 'APPROVAL', 'TOLERANCE')),
    CONSTRAINT pur_rule_version_c04 CHECK (status IN ('DRAFT', 'PUBLISHED', 'RETIRED')),
    CONSTRAINT pur_rule_version_c05 CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
    CONSTRAINT pur_rule_version_c06 CHECK (status = 'DRAFT' OR (published_by IS NOT NULL AND published_at IS NOT NULL))
);

COMMENT ON TABLE pur_rule_version IS '场景、字段、采购策略、审批及容差版本';
COMMENT ON COLUMN pur_rule_version.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_rule_version.rule_key IS '跨版本稳定规则键';
COMMENT ON COLUMN pur_rule_version.version_no IS '规则版本号';
COMMENT ON COLUMN pur_rule_version.rule_category IS '规则类别';
COMMENT ON COLUMN pur_rule_version.scope_company_id IS '适用法人ID';
COMMENT ON COLUMN pur_rule_version.scope_org_id IS '适用组织ID';
COMMENT ON COLUMN pur_rule_version.priority IS '规则匹配优先级';
COMMENT ON COLUMN pur_rule_version.status IS '草稿、已发布或已停用';
COMMENT ON COLUMN pur_rule_version.valid_from IS '生效时间，UTC';
COMMENT ON COLUMN pur_rule_version.valid_to IS '终止时间，UTC';
COMMENT ON COLUMN pur_rule_version.definition IS '受限规则定义JSON，不能执行任意脚本';
COMMENT ON COLUMN pur_rule_version.content_hash IS '规则内容哈希';
COMMENT ON COLUMN pur_rule_version.published_by IS '发布人ID';
COMMENT ON COLUMN pur_rule_version.published_at IS '发布时间，UTC';
COMMENT ON COLUMN pur_rule_version.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_rule_version.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_rule_version.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_rule_version.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_rule_version.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_rule_version_i01 ON pur_rule_version (scope_company_id, scope_org_id, rule_category, status, priority);

-- 单据冻结的已发布规则版本包
CREATE TABLE pur_rule_bundle (
    id NUMBER(19,0) NOT NULL,
    bundle_key VARCHAR2(64 CHAR) NOT NULL,
    version_no NUMBER(10,0) NOT NULL,
    member_rule_ids CLOB NOT NULL,
    content_hash VARCHAR2(64 CHAR) NOT NULL,
    published_at TIMESTAMP(6) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    CONSTRAINT pur_rule_bundle_pk PRIMARY KEY (id),
    CONSTRAINT pur_rule_bundle_u01 UNIQUE (bundle_key, version_no),
    CONSTRAINT pur_rule_bundle_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (version_no >= 0) AND (created_by BETWEEN 1 AND 9223372036854775807)),
    CONSTRAINT pur_rule_bundle_c02 CHECK (version_no > 0)
);

COMMENT ON TABLE pur_rule_bundle IS '单据冻结的已发布规则版本包';
COMMENT ON COLUMN pur_rule_bundle.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_rule_bundle.bundle_key IS '规则包稳定键';
COMMENT ON COLUMN pur_rule_bundle.version_no IS '规则包版本号';
COMMENT ON COLUMN pur_rule_bundle.member_rule_ids IS '已发布规则ID清单JSON，由发布服务校验有效性';
COMMENT ON COLUMN pur_rule_bundle.content_hash IS '版本包内容哈希';
COMMENT ON COLUMN pur_rule_bundle.published_at IS '发布时间，UTC';
COMMENT ON COLUMN pur_rule_bundle.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_rule_bundle.created_by IS '创建人或系统主体的用户ID';

-- 业务事务内登记的SAP任务兼事务发件箱
CREATE TABLE pur_integration_task (
    id NUMBER(19,0) NOT NULL,
    business_request_id VARCHAR2(100 CHAR) NOT NULL,
    document_revision_id NUMBER(19,0) NOT NULL,
    execution_event_id NUMBER(19,0),
    action_code VARCHAR2(64 CHAR) NOT NULL,
    target_system VARCHAR2(64 CHAR) NOT NULL,
    operation_key VARCHAR2(200 CHAR) NOT NULL,
    status VARCHAR2(64 CHAR) DEFAULT 'WAITING' NOT NULL,
    payload_hash VARCHAR2(64 CHAR) NOT NULL,
    payload CLOB NOT NULL,
    available_at TIMESTAMP(6) NOT NULL,
    lease_owner VARCHAR2(64 CHAR),
    lease_until TIMESTAMP(6),
    attempt_count NUMBER(10,0) DEFAULT 0 NOT NULL,
    last_error_code VARCHAR2(64 CHAR),
    last_error_summary VARCHAR2(2000 CHAR),
    created_by_command_id NUMBER(19,0) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_integration_task_pk PRIMARY KEY (id),
    CONSTRAINT pur_integration_task_u01 UNIQUE (business_request_id),
    CONSTRAINT pur_integration_task_u02 UNIQUE (target_system, operation_key),
    CONSTRAINT pur_integration_task_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (document_revision_id BETWEEN 1 AND 9223372036854775807) AND (execution_event_id BETWEEN 1 AND 9223372036854775807) AND (attempt_count >= 0) AND (created_by_command_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_integration_task_c02 CHECK (status IN ('WAITING', 'PROCESSING', 'SUCCESS', 'FAILED', 'UNKNOWN'))
);

COMMENT ON TABLE pur_integration_task IS '业务事务内登记的SAP任务兼事务发件箱';
COMMENT ON COLUMN pur_integration_task.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_integration_task.business_request_id IS '全局业务请求身份，所有重试保持不变';
COMMENT ON COLUMN pur_integration_task.document_revision_id IS '关联的冻结业务版本ID';
COMMENT ON COLUMN pur_integration_task.execution_event_id IS '正向事实事件ID，反向在途可能为空';
COMMENT ON COLUMN pur_integration_task.action_code IS '集成动作代码';
COMMENT ON COLUMN pur_integration_task.target_system IS '精确到SAP客户端的目标系统';
COMMENT ON COLUMN pur_integration_task.operation_key IS '目标系统内业务操作幂等键';
COMMENT ON COLUMN pur_integration_task.status IS 'SAP任务状态';
COMMENT ON COLUMN pur_integration_task.payload_hash IS '冻结请求体哈希';
COMMENT ON COLUMN pur_integration_task.payload IS '已验证和脱敏存储的请求内容JSON';
COMMENT ON COLUMN pur_integration_task.available_at IS '可领取时间，UTC';
COMMENT ON COLUMN pur_integration_task.lease_owner IS '领取工作进程身份';
COMMENT ON COLUMN pur_integration_task.lease_until IS '租约截止时间，UTC';
COMMENT ON COLUMN pur_integration_task.attempt_count IS '已经创建的调用尝试数';
COMMENT ON COLUMN pur_integration_task.last_error_code IS '最近错误代码';
COMMENT ON COLUMN pur_integration_task.last_error_summary IS '最近业务可读错误摘要';
COMMENT ON COLUMN pur_integration_task.created_by_command_id IS '创建本任务的业务幂等命令ID';
COMMENT ON COLUMN pur_integration_task.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_integration_task.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_integration_task.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_integration_task.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_integration_task.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_integration_task_i01 ON pur_integration_task (status, available_at, id);

CREATE INDEX pur_integration_task_i02 ON pur_integration_task (document_revision_id, action_code);

CREATE INDEX pur_integration_task_i03 ON pur_integration_task (execution_event_id);

CREATE INDEX pur_integration_task_i04 ON pur_integration_task (created_by_command_id);

-- 一次网络调用尝试，不代表再次执行业务
CREATE TABLE pur_integration_attempt (
    id NUMBER(19,0) NOT NULL,
    task_id NUMBER(19,0) NOT NULL,
    attempt_no NUMBER(10,0) NOT NULL,
    started_at TIMESTAMP(6) NOT NULL,
    ended_at TIMESTAMP(6),
    transport_status VARCHAR2(64 CHAR) NOT NULL,
    request_digest VARCHAR2(64 CHAR) NOT NULL,
    response_code VARCHAR2(64 CHAR),
    response_summary VARCHAR2(2000 CHAR),
    request_blob_ref VARCHAR2(500 CHAR),
    response_blob_ref VARCHAR2(500 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_integration_attempt_pk PRIMARY KEY (id),
    CONSTRAINT pur_integration_attempt_u01 UNIQUE (task_id, attempt_no),
    CONSTRAINT pur_integration_attempt_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (task_id BETWEEN 1 AND 9223372036854775807) AND (attempt_no >= 0) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_integration_attempt_c02 CHECK (attempt_no > 0),
    CONSTRAINT pur_integration_attempt_c03 CHECK (transport_status IN ('STARTED', 'RECEIVED', 'TIMEOUT', 'CONNECTION_ERROR')),
    CONSTRAINT pur_integration_attempt_c04 CHECK (ended_at IS NULL OR ended_at >= started_at)
);

COMMENT ON TABLE pur_integration_attempt IS '一次网络调用尝试，不代表再次执行业务';
COMMENT ON COLUMN pur_integration_attempt.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_integration_attempt.task_id IS '所属集成任务ID';
COMMENT ON COLUMN pur_integration_attempt.attempt_no IS '任务内调用次数编号';
COMMENT ON COLUMN pur_integration_attempt.started_at IS '调用开始时间，UTC';
COMMENT ON COLUMN pur_integration_attempt.ended_at IS '调用结束时间，UTC';
COMMENT ON COLUMN pur_integration_attempt.transport_status IS '传输结果，不直接等于业务过账结果';
COMMENT ON COLUMN pur_integration_attempt.request_digest IS '本次请求摘要';
COMMENT ON COLUMN pur_integration_attempt.response_code IS '响应代码';
COMMENT ON COLUMN pur_integration_attempt.response_summary IS '脱敏响应摘要';
COMMENT ON COLUMN pur_integration_attempt.request_blob_ref IS '受控原始请求存储键';
COMMENT ON COLUMN pur_integration_attempt.response_blob_ref IS '受控原始响应存储键';
COMMENT ON COLUMN pur_integration_attempt.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_integration_attempt.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_integration_attempt.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_integration_attempt.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_integration_attempt.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_integration_attempt_i01 ON pur_integration_attempt (started_at);

-- SAP状态核对结果与证据
CREATE TABLE pur_integration_evidence (
    id NUMBER(19,0) NOT NULL,
    task_id NUMBER(19,0) NOT NULL,
    check_result VARCHAR2(64 CHAR) NOT NULL,
    checked_at TIMESTAMP(6) NOT NULL,
    checked_by NUMBER(19,0) NOT NULL,
    method VARCHAR2(64 CHAR) NOT NULL,
    query_key CLOB NOT NULL,
    evidence CLOB NOT NULL,
    allow_retry NUMBER(1,0) DEFAULT 0 NOT NULL,
    expires_at TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    CONSTRAINT pur_integration_evidence_pk PRIMARY KEY (id),
    CONSTRAINT pur_integration_evidence_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (task_id BETWEEN 1 AND 9223372036854775807) AND (checked_by BETWEEN 1 AND 9223372036854775807) AND (allow_retry IN (0,1)) AND (created_by BETWEEN 1 AND 9223372036854775807)),
    CONSTRAINT pur_integration_evidence_c02 CHECK (check_result IN ('FOUND', 'NOT_EXECUTED', 'UNKNOWN', 'MISMATCH')),
    CONSTRAINT pur_integration_evidence_c03 CHECK (allow_retry = 0 OR check_result = 'NOT_EXECUTED'),
    CONSTRAINT pur_integration_evidence_c04 CHECK (expires_at IS NULL OR expires_at >= checked_at)
);

COMMENT ON TABLE pur_integration_evidence IS 'SAP状态核对结果与证据';
COMMENT ON COLUMN pur_integration_evidence.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_integration_evidence.task_id IS '被核对集成任务ID';
COMMENT ON COLUMN pur_integration_evidence.check_result IS '找到、明确未执行、未知或不一致';
COMMENT ON COLUMN pur_integration_evidence.checked_at IS '核对时间，UTC';
COMMENT ON COLUMN pur_integration_evidence.checked_by IS '核对人或系统主体ID';
COMMENT ON COLUMN pur_integration_evidence.method IS '核对方式，不允许无凭据人工点成功';
COMMENT ON COLUMN pur_integration_evidence.query_key IS '核对查询条件JSON';
COMMENT ON COLUMN pur_integration_evidence.evidence IS '核对证据JSON';
COMMENT ON COLUMN pur_integration_evidence.allow_retry IS '核验后是否满足安全重发条件';
COMMENT ON COLUMN pur_integration_evidence.expires_at IS '核对证据失效时间，UTC';
COMMENT ON COLUMN pur_integration_evidence.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_integration_evidence.created_by IS '创建人或系统主体的用户ID';

CREATE INDEX pur_integration_evidence_i01 ON pur_integration_evidence (task_id, checked_at, id);

-- 本地单据与多个外部ERP凭证的受控映射
CREATE TABLE pur_external_document_link (
    id NUMBER(19,0) NOT NULL,
    task_id NUMBER(19,0) NOT NULL,
    local_event_id NUMBER(19,0),
    local_document_id NUMBER(19,0) NOT NULL,
    system_code VARCHAR2(64 CHAR) NOT NULL,
    company_external_code VARCHAR2(64 CHAR) NOT NULL,
    document_type VARCHAR2(64 CHAR) NOT NULL,
    document_no VARCHAR2(80 CHAR) NOT NULL,
    fiscal_year VARCHAR2(4 CHAR) NOT NULL,
    external_line_no VARCHAR2(40 CHAR) NOT NULL,
    relation_role VARCHAR2(64 CHAR) NOT NULL,
    mapping_key VARCHAR2(500 CHAR) NOT NULL,
    reversal_of_link_id NUMBER(19,0),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    CONSTRAINT pur_external_document_link_pk PRIMARY KEY (id),
    CONSTRAINT pur_external_document_link_u01 UNIQUE (mapping_key),
    CONSTRAINT pur_external_document_link_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (task_id BETWEEN 1 AND 9223372036854775807) AND (local_event_id BETWEEN 1 AND 9223372036854775807) AND (local_document_id BETWEEN 1 AND 9223372036854775807) AND (reversal_of_link_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807)),
    CONSTRAINT pur_external_document_link_c02 CHECK (reversal_of_link_id <> id),
    CONSTRAINT pur_external_document_link_c03 CHECK (relation_role <> 'PO_ROOT' OR local_event_id IS NULL)
);

COMMENT ON TABLE pur_external_document_link IS '本地单据与多个外部ERP凭证的受控映射';
COMMENT ON COLUMN pur_external_document_link.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_external_document_link.task_id IS '最初建立映射的集成任务ID';
COMMENT ON COLUMN pur_external_document_link.local_event_id IS '关联本地履约事件ID';
COMMENT ON COLUMN pur_external_document_link.local_document_id IS '本地稳定单据ID';
COMMENT ON COLUMN pur_external_document_link.system_code IS '精确到SAP客户端的外部系统范围';
COMMENT ON COLUMN pur_external_document_link.company_external_code IS '外部法人代码';
COMMENT ON COLUMN pur_external_document_link.document_type IS '外部单据类型';
COMMENT ON COLUMN pur_external_document_link.document_no IS '外部凭证或订单号';
COMMENT ON COLUMN pur_external_document_link.fiscal_year IS '实际会计年度，不适用时NA';
COMMENT ON COLUMN pur_external_document_link.external_line_no IS '外部行号，无行时HEADER';
COMMENT ON COLUMN pur_external_document_link.relation_role IS 'PO_ROOT或具体执行凭证角色';
COMMENT ON COLUMN pur_external_document_link.mapping_key IS '非空规范化映射唯一键，PO_ROOT不含本地ID或版本';
COMMENT ON COLUMN pur_external_document_link.reversal_of_link_id IS '所冲销外部凭证映射ID';
COMMENT ON COLUMN pur_external_document_link.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_external_document_link.created_by IS '创建人或系统主体的用户ID';

CREATE INDEX pur_external_document_link_i01 ON pur_external_document_link (system_code, company_external_code, document_type, document_no, fiscal_year, external_line_no);

CREATE INDEX pur_external_document_link_i02 ON pur_external_document_link (local_document_id);

CREATE INDEX pur_external_document_link_i03 ON pur_external_document_link (local_event_id);

CREATE INDEX pur_external_document_link_i04 ON pur_external_document_link (task_id);

CREATE INDEX pur_external_document_link_i05 ON pur_external_document_link (reversal_of_link_id);

-- 外部回调消息去重与处理记录
CREATE TABLE pur_inbox_message (
    id NUMBER(19,0) NOT NULL,
    source_system VARCHAR2(64 CHAR) NOT NULL,
    message_id VARCHAR2(150 CHAR) NOT NULL,
    payload_hash VARCHAR2(64 CHAR) NOT NULL,
    received_at TIMESTAMP(6) NOT NULL,
    processed_at TIMESTAMP(6),
    status VARCHAR2(64 CHAR) DEFAULT 'RECEIVED' NOT NULL,
    payload CLOB NOT NULL,
    error_summary VARCHAR2(2000 CHAR),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_inbox_message_pk PRIMARY KEY (id),
    CONSTRAINT pur_inbox_message_u01 UNIQUE (source_system, message_id),
    CONSTRAINT pur_inbox_message_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_inbox_message_c02 CHECK (status IN ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED'))
);

COMMENT ON TABLE pur_inbox_message IS '外部回调消息去重与处理记录';
COMMENT ON COLUMN pur_inbox_message.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_inbox_message.source_system IS '外部来源系统范围';
COMMENT ON COLUMN pur_inbox_message.message_id IS '来源系统唯一消息ID';
COMMENT ON COLUMN pur_inbox_message.payload_hash IS '消息内容摘要，同ID异内容必须报警';
COMMENT ON COLUMN pur_inbox_message.received_at IS '接收时间，UTC';
COMMENT ON COLUMN pur_inbox_message.processed_at IS '处理完成时间，UTC';
COMMENT ON COLUMN pur_inbox_message.status IS '消息处理状态';
COMMENT ON COLUMN pur_inbox_message.payload IS '脱敏消息内容JSON';
COMMENT ON COLUMN pur_inbox_message.error_summary IS '处理错误摘要';
COMMENT ON COLUMN pur_inbox_message.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_inbox_message.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_inbox_message.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_inbox_message.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_inbox_message.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_inbox_message_i01 ON pur_inbox_message (status, received_at, id);

-- 业务命令请求键与结果防重
CREATE TABLE pur_command_dedup (
    id NUMBER(19,0) NOT NULL,
    client_id VARCHAR2(64 CHAR) NOT NULL,
    request_key VARCHAR2(100 CHAR) NOT NULL,
    command_type VARCHAR2(64 CHAR) NOT NULL,
    actor_id NUMBER(19,0) NOT NULL,
    payload_hash VARCHAR2(64 CHAR) NOT NULL,
    status VARCHAR2(64 CHAR) NOT NULL,
    document_id NUMBER(19,0),
    response_snapshot CLOB,
    started_at TIMESTAMP(6) NOT NULL,
    completed_at TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_command_dedup_pk PRIMARY KEY (id),
    CONSTRAINT pur_command_dedup_u01 UNIQUE (client_id, request_key),
    CONSTRAINT pur_command_dedup_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (actor_id BETWEEN 1 AND 9223372036854775807) AND (document_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0)),
    CONSTRAINT pur_command_dedup_c02 CHECK (status IN ('PROCESSING', 'SUCCEEDED', 'FAILED')),
    CONSTRAINT pur_command_dedup_c03 CHECK (completed_at IS NULL OR completed_at >= started_at)
);

COMMENT ON TABLE pur_command_dedup IS '业务命令请求键与结果防重';
COMMENT ON COLUMN pur_command_dedup.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_command_dedup.client_id IS '调用方应用身份';
COMMENT ON COLUMN pur_command_dedup.request_key IS '同一逻辑操作使用相同请求键';
COMMENT ON COLUMN pur_command_dedup.command_type IS '业务命令类型';
COMMENT ON COLUMN pur_command_dedup.actor_id IS '实际操作者ID';
COMMENT ON COLUMN pur_command_dedup.payload_hash IS '业务输入摘要，同键异输入拒绝';
COMMENT ON COLUMN pur_command_dedup.status IS '命令处理状态';
COMMENT ON COLUMN pur_command_dedup.document_id IS '本次命令涉及的稳定单据ID';
COMMENT ON COLUMN pur_command_dedup.response_snapshot IS '可安全返回的结果快照JSON';
COMMENT ON COLUMN pur_command_dedup.started_at IS '开始时间，UTC';
COMMENT ON COLUMN pur_command_dedup.completed_at IS '完成时间，UTC';
COMMENT ON COLUMN pur_command_dedup.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_command_dedup.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_command_dedup.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_command_dedup.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_command_dedup.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_command_dedup_i01 ON pur_command_dedup (document_id);

CREATE INDEX pur_command_dedup_i02 ON pur_command_dedup (status, started_at);

-- 订单行版本继承的SAP只读技术上下文
CREATE TABLE pur_sap_line_context (
    id NUMBER(19,0) NOT NULL,
    order_revision_id NUMBER(19,0) NOT NULL,
    order_line_id NUMBER(19,0) NOT NULL,
    system_code VARCHAR2(64 CHAR) NOT NULL,
    sap_client VARCHAR2(64 CHAR) NOT NULL,
    sap_po_no VARCHAR2(80 CHAR) NOT NULL,
    sap_item_no VARCHAR2(20 CHAR) NOT NULL,
    external_version VARCHAR2(64 CHAR),
    synced_at TIMESTAMP(6) NOT NULL,
    document_type VARCHAR2(64 CHAR),
    item_category VARCHAR2(64 CHAR),
    account_assignment_category VARCHAR2(64 CHAR),
    account_assignment CLOB,
    raw_context CLOB,
    created_at TIMESTAMP(6) NOT NULL,
    created_by NUMBER(19,0) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    updated_by NUMBER(19,0) NOT NULL,
    row_version NUMBER(19,0) DEFAULT 0 NOT NULL,
    CONSTRAINT pur_sap_line_context_pk PRIMARY KEY (id),
    CONSTRAINT pur_sap_line_context_u01 UNIQUE (order_revision_id, order_line_id, system_code, sap_client),
    CONSTRAINT pur_sap_line_context_c01 CHECK ((id BETWEEN 1 AND 9223372036854775807) AND (order_revision_id BETWEEN 1 AND 9223372036854775807) AND (order_line_id BETWEEN 1 AND 9223372036854775807) AND (created_by BETWEEN 1 AND 9223372036854775807) AND (updated_by BETWEEN 1 AND 9223372036854775807) AND (row_version >= 0))
);

COMMENT ON TABLE pur_sap_line_context IS '订单行版本继承的SAP只读技术上下文';
COMMENT ON COLUMN pur_sap_line_context.id IS '内部稳定主键，由统一序列或ID服务分配';
COMMENT ON COLUMN pur_sap_line_context.order_revision_id IS '本地订单版本ID';
COMMENT ON COLUMN pur_sap_line_context.order_line_id IS '本地订单稳定行ID';
COMMENT ON COLUMN pur_sap_line_context.system_code IS '外部系统代码';
COMMENT ON COLUMN pur_sap_line_context.sap_client IS 'SAP客户端';
COMMENT ON COLUMN pur_sap_line_context.sap_po_no IS 'SAP采购订单号';
COMMENT ON COLUMN pur_sap_line_context.sap_item_no IS 'SAP采购订单行项目';
COMMENT ON COLUMN pur_sap_line_context.external_version IS '外部版本标识';
COMMENT ON COLUMN pur_sap_line_context.synced_at IS '同步时间，UTC';
COMMENT ON COLUMN pur_sap_line_context.document_type IS 'SAP单据类型';
COMMENT ON COLUMN pur_sap_line_context.item_category IS 'SAP行项目类别';
COMMENT ON COLUMN pur_sap_line_context.account_assignment_category IS 'SAP科目分配类别，仅技术区展示';
COMMENT ON COLUMN pur_sap_line_context.account_assignment IS '只读成本中心、WBS等上下文JSON';
COMMENT ON COLUMN pur_sap_line_context.raw_context IS '脱敏原始技术上下文JSON';
COMMENT ON COLUMN pur_sap_line_context.created_at IS '创建时间，UTC';
COMMENT ON COLUMN pur_sap_line_context.created_by IS '创建人或系统主体的用户ID';
COMMENT ON COLUMN pur_sap_line_context.updated_at IS '最后更新时间，UTC';
COMMENT ON COLUMN pur_sap_line_context.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN pur_sap_line_context.row_version IS '乐观锁版本，更新时递增';

CREATE INDEX pur_sap_line_context_i01 ON pur_sap_line_context (system_code, sap_client, sap_po_no, sap_item_no);

CREATE INDEX pur_sap_line_context_i02 ON pur_sap_line_context (order_line_id);
