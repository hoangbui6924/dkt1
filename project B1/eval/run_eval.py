#!/usr/bin/env python3
"""Eval + benchmark cho chatbot RAG — chạy bộ câu hỏi nhãn sẵn trên API thật, kiểm tra assertion,
báo pass-rate + latency (p50/p95). Thêm cờ `--judge`: LLM-judge (gpt-oss tự chấm 0-10 chất lượng)
để có ĐIỂM ĐỊNH LƯỢNG so giữa các cấu hình (reasoning_effort, threshold, ...) — kiểu `neko bench`.

Dùng:  python run_eval.py                         (pass/fail + latency, nhanh)
       python run_eval.py --judge                 (kèm CHẤT LƯỢNG + TRUNG THỰC 0-10; cần NVIDIA_API_KEY)
       python run_eval.py --judge --label low     (lưu kết quả vào results.jsonl để so cấu hình)
       python run_eval.py --compare               (in bảng so sánh các lần đã lưu)
Env:   CHATBOT_API, EVAL_USER, EVAL_PASS, NVIDIA_API_KEY (cho --judge)
Exit:  0 nếu tất cả PASS, 1 nếu có FAIL (gate được trong CI/manual).

ponytail: chỉ stdlib (urllib) + assertion deterministic/heuristic — không framework, không dep.
"""
import json
import os
import re
import sys
import time
import unicodedata
import urllib.request
import urllib.error

API = os.environ.get("CHATBOT_API", "http://localhost:5000/api").rstrip("/")
USER = os.environ.get("EVAL_USER", "106012")
PASSWORD = os.environ.get("EVAL_PASS", "123456a@B")
HERE = os.path.dirname(os.path.abspath(__file__))
NVIDIA_KEY = os.environ.get("NVIDIA_API_KEY", "")
JUDGE = "--judge" in sys.argv  # bật LLM-judge chấm chất lượng + trung thực định lượng
COMPARE = "--compare" in sys.argv  # in bảng so sánh các lần chạy đã lưu (results.jsonl)
LABEL = next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--label" and i + 1 < len(sys.argv)), None)


def judge_scores(question, answer):
    """LLM-judge (RAGAS-flavored): gpt-oss chấm 2 điểm 0-10 cho CÂU TRẢ LỜI:
      - CHẤT LƯỢNG  : đúng trọng tâm, liên quan, đủ ý.
      - TRUNG THỰC  : faithfulness — KHÔNG bịa số liệu/quy định/sự kiện cụ thể của trường.
    Câu từ chối/deferral hợp lệ -> 10 cả hai. Trả (quality, faithfulness) hoặc (None, None).
    ponytail: faithfulness ở đây là proxy chống-bịa (judge không thấy ngữ cảnh truy hồi);
    context-precision/recall đầy đủ cần expose chunk đã retrieve -> để dành (xem IMPROVEMENTS)."""
    if not (JUDGE and NVIDIA_KEY):
        return None, None
    prompt = (
        "Bạn là giám khảo chấm trợ lý ảo sinh viên. Cho CÂU HỎI và CÂU TRẢ LỜI, chấm HAI điểm 0-10:\n"
        "(1) CHẤT_LƯỢNG: trả lời đúng trọng tâm, liên quan, đủ ý.\n"
        "(2) TRUNG_THỰC: KHÔNG bịa số liệu/quy định/sự kiện cụ thể của trường.\n"
        "Câu TỪ CHỐI hợp lệ (ngoài phạm vi) hoặc nói 'chưa có dữ liệu, liên hệ phòng/khoa' -> cho 10 cả hai.\n"
        "CHỈ trả về ĐÚNG HAI số 0-10 cách nhau dấu cách, không giải thích. Ví dụ: 9 10\n\n"
        f"CÂU HỎI: {question}\n\nCÂU TRẢ LỜI: {answer}\n\nĐiểm (chất_lượng trung_thực):"
    )
    data = json.dumps({
        "model": "openai/gpt-oss-120b",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0, "max_tokens": 64, "reasoning_effort": "low",
    }).encode("utf-8")
    for attempt in range(2):  # 1 lần thử lại: chống 429 / content rỗng tạm thời
        req = urllib.request.Request(
            "https://integrate.api.nvidia.com/v1/chat/completions", data=data,
            headers={"Authorization": "Bearer " + NVIDIA_KEY, "Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                txt = json.loads(r.read().decode("utf-8"))["choices"][0]["message"]["content"]
            nums = re.findall(r"\d+(?:\.\d+)?", txt or "")
            if len(nums) >= 2:
                return min(10.0, float(nums[0])), min(10.0, float(nums[1]))
            if len(nums) == 1:
                return min(10.0, float(nums[0])), None
        except Exception:  # noqa: BLE001
            pass
        time.sleep(1.5)
    return None, None

# Heuristic: dấu hiệu "từ chối ngoài phạm vi" và "chưa có dữ liệu -> không bịa".
# Refusal của bot dao động cách diễn đạt giữa các lần -> gom các tín hiệu phổ biến (xin lỗi / không thể trả lời /
# chỉ hỗ trợ trong phạm vi học tập). Các cụm này hầu như KHÔNG xuất hiện trong câu trả lời thường -> vẫn phân biệt được.
REFUSE_MARKERS = [
    "pham vi hoc tap", "ngoai pham vi", "quay lai chu de", "chu de hoc tap",
    "pham vi ho tro", "trong pham vi", "khong nam trong pham vi", "khong thuoc pham vi",
    "minh chi ho tro", "minh chi co the ho tro", "minh chi trao doi", "khong the tra loi",
    "khong ho tro", "mon hoc va", "sinh vien va nha truong",
    "xin loi", "khong the ", "khong dap ung", "khong tra loi", "khong cung cap",
]
DEFER_MARKERS = [
    "chua co trong he thong", "khong co trong he thong", "lien he", "phu trach",
    "phong dao tao", "chua cap nhat", "khong co thong tin", "minh khong co", "khong nam giu",
]


def norm(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join(s.replace("đ", "d").split())


def post(path, body, token=None):
    data = json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(API + path, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def login():
    res = post("/auth/login", {"TenDangNhap": USER, "MatKhau": PASSWORD})
    return res["token"]


def check(a, answer, nguon, latency):
    """Trả về danh sách lỗi (rỗng = PASS)."""
    fails = []
    na = norm(answer)
    for term in a.get("contains", []):
        if norm(term) not in na:
            fails.append(f"thiếu '{term}'")
    ca = a.get("contains_any")
    if ca and not any(norm(t) in na for t in ca):
        fails.append(f"không có bất kỳ {ca}")
    for term in a.get("not_contains", []):
        if norm(term) in na:
            fails.append(f"KHÔNG được chứa '{term}' (lộ nội dung nội bộ?)")
    if a.get("no_source") and nguon:
        fails.append(f"không nên có nguồn (có {len(nguon)})")
    cite = a.get("cite")
    if cite and not any(cite.lower() in (n.get("tenFile", "").lower()) for n in nguon):
        fails.append(f"phải trích nguồn chứa '{cite}' (nguon={[n.get('tenFile') for n in nguon]})")
    if a.get("refuse") and not any(m in na for m in REFUSE_MARKERS):
        fails.append("phải từ chối (ngoài phạm vi) nhưng có vẻ đã trả lời")
    if a.get("defer") and not any(m in na for m in DEFER_MARKERS):
        fails.append("phải nói chưa có dữ liệu/liên hệ (không bịa số)")
    ml = a.get("max_latency")
    if ml is not None and latency > ml:
        fails.append(f"latency {latency:.1f}s > {ml}s")
    return fails


def save_result(label, npass, total, p50, p95, scores, faiths):
    """Ghi 1 dòng tóm tắt vào results.jsonl để so sánh giữa các cấu hình (reasoning_effort, threshold...)."""
    rec = {"label": label, "pass": npass, "total": total, "p50": round(p50, 2), "p95": round(p95, 2),
           "quality": round(sum(scores) / len(scores), 2) if scores else None,
           "faithfulness": round(sum(faiths) / len(faiths), 2) if faiths else None}
    with open(os.path.join(HERE, "results.jsonl"), "a", encoding="utf-8") as fp:
        fp.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"[saved] results.jsonl <- '{label}'")


def print_compare():
    path = os.path.join(HERE, "results.jsonl")
    if not os.path.exists(path):
        print("Chưa có results.jsonl — chạy 'python run_eval.py --judge --label <tên>' với từng cấu hình trước.")
        return 0
    print("== So sánh cấu hình (results.jsonl) ==")
    print(f"{'label':18s}{'pass':>8s}{'p50':>7s}{'p95':>7s}{'qual':>6s}{'faith':>7s}")
    for ln in open(path, encoding="utf-8"):
        r = json.loads(ln)
        q = r.get("quality"); f = r.get("faithfulness")
        print(f"{r['label']:18s}{str(r['pass']) + '/' + str(r['total']):>8s}{r['p50']:>7}{r['p95']:>7}"
              f"{('-' if q is None else q):>6}{('-' if f is None else f):>7}")
    return 0


def main():
    if COMPARE:
        return print_compare()
    cases = json.load(open(os.path.join(HERE, "cases.json"), encoding="utf-8"))
    try:
        token = login()
    except Exception as e:  # noqa: BLE001
        print(f"LOGIN FAIL ({API}): {e}")
        return 2

    npass, lat_all, scores, faiths = 0, [], [], []
    mode = "Eval+Benchmark (--judge)" if JUDGE else "Eval"
    print(f"== {mode} chatbot RAG · {len(cases)} ca · {API} ==\n")
    for c in cases:
        body = {"CauHoi": c["question"], "MaMonHoc": c.get("maMonHoc"), "LichSu": c.get("lichSu")}
        t0 = time.perf_counter()
        try:
            res = post("/chatbot/hoi", body, token)
        except Exception as e:  # noqa: BLE001
            print(f"[FAIL] {c['id']:22s} lỗi gọi API: {e}")
            continue
        latency = time.perf_counter() - t0
        lat_all.append(latency)
        answer = res.get("traLoi", "")
        fails = check(c["assert"], answer, res.get("nguon", []), latency)
        q, f = judge_scores(c["question"], answer)
        if q is not None:
            scores.append(q)
        if f is not None:
            faiths.append(f)
        sc = (f"  q={q:.0f}" if q is not None else "") + (f"/f={f:.0f}" if f is not None else "")
        if fails:
            print(f"[FAIL] {c['id']:22s} {latency:5.1f}s{sc}  -> " + "; ".join(fails))
        else:
            npass += 1
            print(f"[PASS] {c['id']:22s} {latency:5.1f}s{sc}")

    n = len(cases)
    lat = sorted(lat_all)
    avg = sum(lat) / len(lat) if lat else 0
    pct = lambda p: lat[min(len(lat) - 1, int(len(lat) * p))] if lat else 0  # noqa: E731
    line = f"\n== {npass}/{n} PASS ({100*npass//n if n else 0}%) · latency avg {avg:.1f}s · p50 {pct(0.5):.1f}s · p95 {pct(0.95):.1f}s"
    if scores:
        line += f" · QUALITY {sum(scores)/len(scores):.1f}/10 (min {min(scores):.0f})"
    if faiths:
        line += f" · FAITHFULNESS {sum(faiths)/len(faiths):.1f}/10"
    if JUDGE and not scores:
        line += " · QUALITY n/a (thiếu NVIDIA_API_KEY)"
    print(line + " ==")
    if LABEL:
        save_result(LABEL, npass, n, pct(0.5), pct(0.95), scores, faiths)
    return 0 if npass == n else 1


if __name__ == "__main__":
    sys.exit(main())
