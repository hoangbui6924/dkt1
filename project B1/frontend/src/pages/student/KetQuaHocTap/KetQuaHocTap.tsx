import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { type KetQuaHocTap, getKetQuaHocTapMe } from '../../../services/ketQuaHocTapService';
import '../../admin/Home/Home.css';

export default function StudentKetQuaHocTapPage() {
  const [data, setData] = useState<KetQuaHocTap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getKetQuaHocTapMe()
      .then(setData)
      .catch(() => setError('Không thể tải kết quả học tập'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-400">Đang tải...</div>;
  if (error || !data) return <div className="p-10 text-center text-red-600">{error || 'Không có dữ liệu'}</div>;

  return (
    <div className="dashboard">
      <div className="page-toolbar">
        <div className="page-toolbar-title">
          <Award size={18} />
          <span>Tra cứu kết quả học tập</span>
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-sm)',
          fontSize: 15,
          lineHeight: 1.7,
        }}
      >
        <p>
          <strong>Mã sinh viên:</strong> {data.maSoSV}
        </p>
        <p>
          <strong>Họ tên:</strong> {data.hoTen}
        </p>
        <p>
          <strong>Ngày sinh:</strong> {data.ngaySinh ?? '-'}
        </p>
        <p>
          <strong>Giới tính:</strong> {data.gioiTinh ?? '-'}
        </p>
        <p>
          <strong>Lớp hành chính:</strong> {data.tenNhomLop || '-'}
        </p>
        <p style={{ marginTop: 8 }}>
          <strong>TC tích lũy:</strong> {data.tongTinChiTichLuy}
        </p>
        <p>
          <strong>TBC tích lũy:</strong> {data.gpaTichLuy.toFixed(2)}
        </p>
      </div>

      {data.hocKys.length === 0 && (
        <p style={{ color: 'var(--text-muted)' }}>Chưa có dữ liệu đăng ký học phần nào.</p>
      )}

      {data.hocKys.map((hk) => (
        <div key={hk.maHocKy}>
          <div
            style={{
              background: 'var(--primary-soft)',
              padding: '8px 14px',
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--text-h)',
              borderRadius: 'var(--radius) var(--radius) 0 0',
            }}
          >
            Năm học {hk.tenNamHoc}, {hk.tenHocKy}
          </div>
          <div
            style={{
              border: '1px solid var(--border)',
              borderTop: 'none',
              borderRadius: '0 0 var(--radius) var(--radius)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14.5 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Học phần</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>TCHT</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>X</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Y</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Z</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Điểm chữ</th>
                  <th style={{ padding: '10px 14px' }}></th>
                </tr>
              </thead>
              <tbody>
                {hk.hocPhans.map((hp, idx) => (
                  <tr
                    key={hp.maMonHoc}
                    style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '10px 14px', color: 'var(--primary)' }}>
                      {hp.maMonHoc} - {hp.tenMonHoc}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{hp.soTinChi}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{hp.diemX ?? '-'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{hp.diemY ?? '-'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{hp.diemZ ?? '-'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {hp.diemChu ? (
                        <span
                          style={{
                            fontWeight: 700,
                            color: hp.diemChu === 'F' ? 'var(--danger)' : 'var(--success)',
                          }}
                        >
                          {hp.diemChu}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--warning)', fontSize: 13 }}>{hp.ghiChu ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
