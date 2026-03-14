import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./CookiePolicyPage.css";

export default function CookiePolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Chinh sach Cookie - UAV Training Center";

    return () => {
      document.title = "UAV Training Center";
    };
  }, []);

  return (
    <div className="cookie-policy-page">
      <div className="cookie-policy-shell">
        <div className="cookie-policy-breadcrumb">
          <Link to="/">Trang chu</Link>
          <span>/</span>
          <span>Chinh sach Cookie</span>
        </div>

        <div className="cookie-policy-hero">
          <h1>Chinh sach Cookie</h1>
          <p>
            Chung toi su dung cookie de dam bao he thong hoc UAV van hanh on dinh, tang toc do tai trang va toi uu
            trai nghiem hoc vien.
          </p>
        </div>

        <div className="cookie-policy-grid">
          <section className="cookie-policy-card">
            <h2>1. Cookie la gi?</h2>
            <p>
              Cookie la tep nho duoc trinh duyet luu tren thiet bi cua ban. Cookie cho phep website ghi nho lua chon,
              trang thai dang nhap va mot so thiet lap ca nhan.
            </p>
          </section>

          <section className="cookie-policy-card">
            <h2>2. Nhom cookie chung toi su dung</h2>
            <ul>
              <li>Can thiet: bat buoc de dang nhap, bao mat phien va tai du lieu.</li>
              <li>Phan tich: giup danh gia hieu suat chuc nang va cai thien toc do.</li>
              <li>Tiep thi: dung de ca nhan hoa thong tin goi y noi dung.</li>
            </ul>
          </section>

          <section className="cookie-policy-card">
            <h2>3. Kiem soat cookie</h2>
            <p>
              Ban co the doi lua chon bat ky luc nao bang nut Cookie settings o goc duoi phai man hinh. Ngoai ra,
              ban co the xoa cookie tu cai dat trinh duyet.
            </p>
          </section>

          <section className="cookie-policy-card">
            <h2>4. Luu tru va cap nhat</h2>
            <p>
              Lua chon cookie duoc luu tren trinh duyet cua ban de tranh hoi lai nhieu lan. Chung toi co the cap nhat
              chinh sach nay khi co thay doi ve cong nghe hoac quy dinh phap ly.
            </p>
          </section>
        </div>

        <div className="cookie-policy-footer">
          <Link to="/chinh-sach-bao-mat">Xem Chinh sach Bao mat</Link>
          <Link to="/dieu-khoan-su-dung">Xem Dieu khoan Su dung</Link>
        </div>
      </div>
    </div>
  );
}
