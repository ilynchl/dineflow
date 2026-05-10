import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, message, Popconfirm } from 'antd';
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { qrApi } from '../../api';

export default function QrManage() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setCodes(await qrApi.getAll()); } catch (e) { message.error('加载失败'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Sort: unbound codes at top, then by scan_count desc
  const sorted = [...codes].sort((a, b) => {
    if (!a.table_id && b.table_id) return -1;
    if (a.table_id && !b.table_id) return 1;
    return (b.scan_count || 0) - (a.scan_count || 0);
  });

  const totalScans = codes.reduce((s, c) => s + (c.scan_count || 0), 0);
  const boundCount = codes.filter(c => c.table_id).length;
  const unboundCount = codes.filter(c => !c.table_id).length;

  const columns = [
    { title: '编码', dataIndex: 'code', key: 'code' },
    { title: '关联桌台', dataIndex: 'table_no', key: 'table', render: v => v ? <Tag color="blue">{v}</Tag> : <Tag>未绑定</Tag> },
    { title: '扫码次数', dataIndex: 'scan_count', key: 'scans', render: v => <span style={{ fontSize: 16, fontWeight: v > 0 ? 'bold' : 'normal' }}>{v || 0}</span> },
    { title: '最后扫码', dataIndex: 'last_scan_at', key: 'last', render: v => v || '-' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created', render: v => v?.slice(0, 19)?.replace('T', ' ') || '-' },
  ];

  return (
    <Card title="活码统计" extra={
      <Space>
        <Tag>总计 {codes.length} 个</Tag>
        <Tag color="blue">已绑定 {boundCount}</Tag>
        <Tag>未绑定 {unboundCount}</Tag>
        <Tag color="green">总扫码 {totalScans} 次</Tag>
        <Button size="small" icon={<ReloadOutlined />} onClick={load}>刷新</Button>
      </Space>
    }>
      <Table dataSource={sorted} columns={columns} rowKey="id" loading={loading}
        pagination={false} size="small" />
    </Card>
  );
}
