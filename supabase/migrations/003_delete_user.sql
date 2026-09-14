CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS void AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Lấy vai trò của người đang thao tác
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  IF caller_role != 'OWNER' THEN
    RAISE EXCEPTION 'Chỉ có Chủ quán (OWNER) mới có quyền xóa tài khoản nhân viên';
  END IF;

  -- Không cho phép tự xóa chính mình
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Bạn không thể tự xóa tài khoản của chính mình';
  END IF;

  -- Kiểm tra nếu nhân viên đã có dữ liệu hóa đơn/thanh toán
  IF EXISTS (SELECT 1 FROM public.orders WHERE cashier_id = user_id) OR
     EXISTS (SELECT 1 FROM public.payments WHERE cashier_id = user_id) THEN
    RAISE EXCEPTION 'Nhân viên này đã có lịch sử tạo hóa đơn. Vui lòng chọn Khóa tài khoản để bảo toàn dữ liệu sổ sách!';
  END IF;

  -- Xóa từ profiles
  DELETE FROM public.profiles WHERE id = user_id;

  -- Xóa từ auth.users
  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Cấp quyền gọi hàm cho authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;
