import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, Popconfirm, Tag, message, Row, Col, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, QrcodeOutlined } from '@ant-design/icons';
import { tableApi, qrApi } from '../../api';

import QRCode from 'qrcode';

function drawQR(canvas, text = 'http://localhost:3000/', size = 160) {
  QRCode.toCanvas(canvas, text, { width: size, margin: 1, color: { dark: '#000', light: '#fff' } })
    .catch(err => console.error('QR error:', err));
}

export default function TableManage() {
  const [tables, setTables] = useState([]);
  const [zones, setZones] = useState([]);
  const [qrcodes, setQrcodes] = useState({}); // {tableId: qrRecord}
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTable, setQrTable] = useState(null);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [editingTable, setEditingTable] = useState(null);
  const [editingUrl, setEditingUrl] = useState({});
  const [form] = Form.useForm();
  const qrCanvasRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t, z, q] = await Promise.all([
        tableApi.getAll().catch(() => []),
        tableApi.getZones().catch(() => []),
        qrApi.getAll().catch(() => []),
      ]);
      setTables(t);
      setZones(z);
      // Build qr lookup by table_id
      const qMap = {};
      q.forEach(item => { if (item.table_id) qMap[item.table_id] = item; });
      setQrcodes(qMap);
    } catch (e) { message.error('加载失败'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Generate QR code in canvas
  useEffect(() => {
    if (qrModalOpen && qrTable && qrCanvasRef.current) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/q/${qrTable.qr_code || ''}`;
      drawQR(qrCanvasRef.current, url, 240);
    }
  }, [qrModalOpen, qrTable]);

  const downloadQR = () => {
    if (!qrCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `桌台_${qrTable?.table_no}_${qrTable?.qr_code || ''}.png`;
    link.href = qrCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  const saveUrl = async (tableId, codeId) => {
    const url = editingUrl[tableId];
    if (url === undefined) return;
    await qrApi.update(codeId, { target_url: url || '' });
    message.success('跳转目标已更新');
    setEditingUrl(prev => { const n = { ...prev }; delete n[tableId]; return n; });
  };

  const columns = [
    { title: '桌号', dataIndex: 'table_no', key: 'no',
      render: (v, r) => <span style={{ fontSize: 16, fontWeight: 'bold' }}>{v}</span> },
    { title: '区域', dataIndex: 'zone_name', key: 'zone', render: v => v || '-' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: s => <Tag color={s === 'idle' ? 'green' : 'red'}>{s === 'idle' ? '空闲' : '使用中'}</Tag> },
    {
      title: '二维码', key: 'qr', width: 100,
      render: (_, r) => {
        const qr = qrcodes[r.id];
        return (
          <canvas ref={el => {
            if (el) {
              const baseUrl = window.location.origin;
              drawQR(el, `${baseUrl}/q/${qr?.code || ''}`, 80);
            }
          }}
            style={{ width: 60, height: 60, borderRadius: 4, cursor: 'pointer' }}
            onClick={() => { setQrTable({ ...r, ...qr }); setQrModalOpen(true); }}
            title="点击查看大图"
          />
        );
      }
    },
    {
      title: '跳转目标', key: 'url', width: 200,
      render: (_, r) => {
        const qr = qrcodes[r.id];
        if (!qr) return <Tag color="orange">未生成</Tag>;
        return (
          <Input size="small" defaultValue={qr.target_url || ''}
            placeholder="留空=默认跳转"
            onChange={e => setEditingUrl(prev => ({ ...prev, [r.id]: e.target.value }))}
            onPressEnter={() => saveUrl(r.id, qr.id)}
            suffix={<Button size="small" type="link" onClick={() => saveUrl(r.id, qr.id)}>保存</Button>}
            style={{ maxWidth: 180 }}
          />
        );
      }
    },
    {
      title: '扫码次数', key: 'scans', width: 70,
      render: (_, r) => qrcodes[r.id]?.scan_count || 0
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}
            onClick={() => { setEditingTable(r); form.setFieldsValue(r); setModalOpen(true); }} />
          <Popconfirm title="确定删除？" onConfirm={async () => {
            await tableApi.delete(r.id); load();
          }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="桌台管理" extra={
        <Space>
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => { setEditingTable(null); form.resetFields(); setModalOpen(true); }}>
            添加桌台
          </Button>
          <Button onClick={() => setZoneModalOpen(true)}>管理区域</Button>
        </Space>
      }>
        <Table dataSource={tables} columns={columns} rowKey="id" loading={loading}
          pagination={false} size="small" />

        <Modal title={editingTable ? '编辑桌台' : '添加桌台'} open={modalOpen}
          onCancel={() => { setModalOpen(false); setEditingTable(null); }}
          onOk={() => form.submit()}>
          <Form form={form} layout="vertical" onFinish={async (v) => {
            try {
              if (editingTable) {
                await tableApi.update(editingTable.id, v);
              } else {
                await tableApi.create(v);
              }
              message.success(editingTable ? '已更新' : '已添加');
              setModalOpen(false); setEditingTable(null); form.resetFields(); load();
            } catch (e) { message.error(e.message); }
          }}>
            <Form.Item name="table_no" label="桌号" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="zone_id" label="所属区域">
              <Select allowClear options={zones.map(z => ({ label: z.name, value: z.id }))} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal title="管理区域" open={zoneModalOpen} onCancel={() => setZoneModalOpen(false)} footer={null}>
          <Space style={{ marginBottom: 16 }}>
            <Input value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="区域名称"
              onPressEnter={async () => { if (zoneName) { await tableApi.createZone(zoneName); setZoneName(''); load(); } }} />
            <Button type="primary" onClick={async () => { if (zoneName) { await tableApi.createZone(zoneName); setZoneName(''); load(); } }}>添加</Button>
          </Space>
          {zones.map(z => (
            <div key={z.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span>{z.name}</span>
              <Popconfirm title="确定删除？" onConfirm={async () => { await tableApi.deleteZone(z.id); load(); }}>
                <Button size="small" danger>删除</Button>
              </Popconfirm>
            </div>
          ))}
        </Modal>
      </Card>

      {/* QR Code Preview Modal */}
      <Modal title={qrTable ? `桌台 ${qrTable.table_no} 二维码` : '二维码'}
        open={qrModalOpen} onCancel={() => setQrModalOpen(false)}
        footer={<Button type="primary" icon={<DownloadOutlined />} onClick={downloadQR}>下载二维码</Button>}
        width={360}>
        {qrTable && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <canvas ref={qrCanvasRef} style={{ width: 240, height: 240 }} />
            <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
              桌号: {qrTable.table_no} &nbsp;|&nbsp; 编码: {qrTable.qr_code || qrTable.code}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
              扫码后跳转: {qrTable.target_url || '默认'}(可编辑)
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
