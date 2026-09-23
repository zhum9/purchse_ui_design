import { InboxOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { DatePicker, Form, Input, InputNumber, Radio, Select, Typography, Upload } from 'antd';
import type { FormInstance, UploadFile } from 'antd';
import type { DynamicFieldSchema, ExecutionFormSchema, ExecutionFormValues } from '@domain/execution-rule/types';

const { RangePicker } = DatePicker;

const groupTitles: Record<DynamicFieldSchema['group'], string> = {
  EXECUTION: '本次执行', DELIVERY: '库存与交付信息', SERVICE: '服务信息', ATTACHMENT: '附件与说明',
};

const renderControl = (field: DynamicFieldSchema) => {
  switch (field.component) {
    case 'number': return <InputNumber className="field-full" min={field.min} max={field.max} precision={3} suffix={field.unit} placeholder={field.placeholder} />;
    case 'select': return <Select options={field.options} placeholder={field.placeholder ?? `请选择${field.label}`} />;
    case 'date': return <DatePicker className="field-full" placeholder={`请选择${field.label}`} />;
    case 'dateRange': return <RangePicker className="field-full" />;
    case 'textarea': return <Input.TextArea rows={3} showCount maxLength={500} placeholder={field.placeholder} />;
    case 'radio': return <Radio.Group options={field.options} optionType="button" buttonStyle="solid" />;
    case 'upload': return (
      <Upload.Dragger beforeUpload={() => false} multiple maxCount={6}>
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">单个文件不超过 20MB，最多上传 6 个文件</p>
      </Upload.Dragger>
    );
    default: return <Input placeholder={field.placeholder} />;
  }
};

interface DynamicFormProps {
  schema: ExecutionFormSchema;
  form: FormInstance<ExecutionFormValues>;
  onValuesChange?: (values: ExecutionFormValues) => void;
}

export function DynamicForm({ schema, form, onValuesChange }: DynamicFormProps) {
  const visibleFields = schema.fields.filter((field) => field.state !== 'HIDDEN');
  const groups = (Object.keys(groupTitles) as DynamicFieldSchema['group'][]).filter((group) => visibleFields.some((field) => field.group === group));
  const initialValues = Object.fromEntries(visibleFields.filter((field) => field.defaultValue !== undefined).map((field) => [field.key, field.defaultValue]));

  return (
    <Form form={form} layout="vertical" initialValues={initialValues} onValuesChange={(_, values: ExecutionFormValues) => onValuesChange?.(values)}>
      {groups.map((group) => (
        <section className="form-section" key={group}>
          <Typography.Title level={5}>{groupTitles[group]}</Typography.Title>
          <div className="dynamic-form-grid">
            {visibleFields.filter((field) => field.group === group).map((field) => {
              const uploadProps = field.component === 'upload' ? {
                valuePropName: 'fileList',
                getValueFromEvent: (event: { fileList: UploadFile[] }) => event.fileList,
              } : {};
              return (
                <Form.Item
                  {...uploadProps}
                  className={field.span === 2 ? 'dynamic-form-grid__wide' : undefined}
                  key={field.key}
                  name={field.key}
                  label={field.label}
                  tooltip={field.businessHelp ? { title: field.businessHelp, icon: <InfoCircleOutlined /> } : undefined}
                  rules={field.state === 'REQUIRED' ? [{ required: true, message: `请填写${field.label}` }] : undefined}
                  extra={field.businessHelp}
                >
                  {field.state === 'DISPLAY'
                    ? <Input readOnly className="readonly-field" suffix={<Typography.Text type="secondary">{field.source}</Typography.Text>} />
                    : renderControl(field)}
                </Form.Item>
              );
            })}
          </div>
        </section>
      ))}
    </Form>
  );
}
