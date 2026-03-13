import { Outlet, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";

function MainLayout() {
  const navigate = useNavigate();
  const { sessionInvalidReason } = useAuth();

  // === Xử lý khi bị logout do đăng nhập ở thiết bị khác ===
  useEffect(() => {
    if (sessionInvalidReason === 'SESSION_INVALID') {
      toast.error("🔐 Phiên đăng nhập của bạn đã hết hạn vì bạn đã đăng nhập từ thiết bị khác");
      setTimeout(() => {
        navigate('/dang-nhap');
      }, 2000);
    }
  }, [sessionInvalidReason, navigate]);




  

  
  return (
    <>
      <Toaster
        position="top-right"
        duration={2000}
        richColors
      />

      {/* Header */}
      <Outlet />
      {/* Footer */}
    </>
  );
}

export default MainLayout;
