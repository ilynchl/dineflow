import { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Tag, Space, message, Popconfirm,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { systemParamApi } from '../api';

export default function SystemParams() {
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParam, setEditingParam] = useState(null);
  const [form] = Form.useForm();

  const loadParams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await systemParamApi.getAll();
      setParams(data);
    } catch (err) {
      message.error(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadParams(); }, [loadParams]);

  const openCreate = () => {
    setEditingParam(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingParam(record);
    form.setFieldsValue({
      param_value: record.param_value,
      description: record.description,
    });
    setModalOpen(true);
  };

  const handleSave = async (values) => {
    try {
      if (editingParam) {
        await systemParamApi.update(editingParam.param_key, values);
        message.success('参数已更新');
      } else {
        await systemParamApi.create(values);
        message.success('参数已添加');
      }
      setModalOpen(false);
      loadParams();
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleDelete = async (key) => {
    try {
      await systemParamApi.delete(key);
      message.success('参数已删除');
      loadParams();
    } catch (err) {
      message.error(err.message);
    }
  };

  const columns = [
    { title: '参数键', dataIndex: 'param_key', width: 200 },
    { title: '参数值', dataIndex: 'param_value', ellipsis: true },
    { title: '说明', dataIndex: 'description', width: 200 },
    {
      title: '操作', key: 'action', width: 160, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除此参数？" onConfirm={() => handleDelete(record.param_key)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="系统参数"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加参数</Button>}
      >
        <Table
          rowKey="param_key"
          columns={columns}
          dataSource={params}
          loading={loading}
          size="small"
          pagination={false}
        />
      </Card>

      <Modal
        title={editingParam ? '编辑参数' : '添加参数'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {!editingParam && (
            <Form.Item name="param_key" label="参数键" rules={[{ required: true, message: '请输入参数键' }]}>
              <Input placeholder="如：default_trial_days" />
            </Form.Item>
          )}
          <Form.Item name="param_value" label="参数值">
            <Input placeholder="参数值" />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input placeholder="参数说明" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
