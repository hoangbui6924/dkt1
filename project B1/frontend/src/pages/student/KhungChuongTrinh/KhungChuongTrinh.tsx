import { useEffect, useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { type SinhVien, getSinhVienMe } from '../../../services/sinhVienService';
import {
  type KhungChuongTrinh as KhungChuongTrinhModel,
  type MonHocTrongKhung,
  getKhungChuongTrinhByNganh,
  getMonHocsTrongKhung,
} from '../../../services/khungChuongTrinhService';
import '../../admin/Home/Home.css';

export default function StudentKhungChuongTrinhPage() {
  const [sinhVien, setSinhVien] = useState<SinhVien | null>(null);
  const [khung, setKhung] = useState<KhungChuongTrinhModel | null>(null);
  const [monHocs, setMonHocs] = useState<MonHocTrongKhung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const sv = await getSinhVienMe();
        setSinhVien(sv);

        const k = await getKhungChuongTrinhByNganh(sv.maNganhHoc);
        setKhung(k);
        if (k) {
          const mh = await getMonHocsTrongKhung(k.maKhungChuongTrinh);
          setMonHocs(mh);
        }
      } catch {
        setError('Không thể tải khung chương trình');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const monHocTheoKy = useMemo(() => {
    const map = new Map<number, MonHocTrongKhung[]>();
    monHocs.forEach((m) => {
      const list = map.get(m.kyHoc) ?? [];
      list.push(m);
      map.set(m.kyHoc, list);
    });
    return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
  }, [monHocs]);

  const tienDoTinChi = khung?.tongTinChi && sinhVien
    ? Math.min(100, Math.round((sinhVien.tongTinChiTichLuy / khung.tongTinChi) * 100))
    : 0;

  return (
    <div className="dashboard">
      <div className="page-toolbar">
        <div className="page-toolbar-title">
          <BookOpen size={18} />
          <span>Khung chương trình{sinhVien ? ` — ${sinhVien.tenNganh}` : ''}</span>
        </div>
      </div>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Đang tải...</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {!loading && !error && !khung && (
        <p style={{ color: 'var(--text-muted)' }}>Ngành học của bạn chưa được cấu hình khung chương trình.</p>
      )}

      {khung && sinhVien && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-blue">
                <BookOpen size={20} />
              </div>
              <div>
                <div className="stat-value">{khung.tongTinChi}</div>
                <div className="stat-label">Tổng tín chỉ chương trình</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-green">
                <BookOpen size={20} />
              </div>
              <div>
                <div className="stat-value">{sinhVien.tongTinChiTichLuy}</div>
                <div className="stat-label">Tín chỉ đã tích lũy</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-amber">
                <BookOpen size={20} />
              </div>
              <div>
                <div className="stat-value">{khung.soTinChiBatBuoc}</div>
                <div className="stat-label">Tín chỉ bắt buộc</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-purple">
                <BookOpen size={20} />
              </div>
              <div>
                <div className="stat-value">{khung.soTinChiTuChonToiThieu}</div>
                <div className="stat-label">Tín chỉ tự chọn tối thiểu</div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '14px 18px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                height: 8,
                width: '100%',
                borderRadius: 999,
                background: 'var(--bg)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 999,
                  background: 'var(--primary)',
                  width: `${tienDoTinChi}%`,
                }}
              />
            </div>
            <p style={{ marginTop: 6, fontSize: 12.5, color: 'var(--text-muted)' }}>
              Tiến độ tích lũy tín chỉ: {tienDoTinChi}%
            </p>
          </div>

          <h2 className="section-title">Môn học theo từng học kỳ</h2>

          {monHocTheoKy.size === 0 && (
            <p style={{ color: 'var(--text-muted)' }}>Khung chương trình chưa có môn học nào.</p>
          )}

          <div className="module-grid">
            {[...monHocTheoKy.entries()].map(([ky, mons]) => {
              const tongTC = mons.reduce((sum, m) => sum + m.soTinChi, 0);
              return (
                <div
                  key={ky}
                  className="module-card"
                  style={{ padding: 0, overflow: 'hidden' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--primary-soft)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <strong style={{ fontSize: 13.5, color: 'var(--text-h)' }}>Học kỳ {ky}</strong>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tongTC} TC</span>
                  </div>
                  <div>
                    {mons.map((m, idx) => (
                      <div
                        key={m.ma}
                        style={{
                          padding: '10px 14px',
                          borderBottom: idx === mons.length - 1 ? 'none' : '1px solid var(--border)',
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--text-h)' }}>
                          {m.tenMonHoc}
                        </p>
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 999,
                              background: m.loaiMonHoc === 'Bắt buộc' ? 'var(--primary-soft)' : 'var(--warning-soft)',
                              color: m.loaiMonHoc === 'Bắt buộc' ? 'var(--primary)' : 'var(--warning)',
                            }}
                          >
                            {m.loaiMonHoc}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.soTinChi} TC</span>
                        </div>
                        {m.tenMonHocTienQuyet && (
                          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>
                            Tiên quyết: {m.tenMonHocTienQuyet}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
