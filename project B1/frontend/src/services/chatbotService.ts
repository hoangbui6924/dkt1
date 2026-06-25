import api from './api';

export interface NguonTraLoi {
  maTaiLieu: number;
  tenFile: string;
  trang: number;
}

export interface ChatbotResponse {
  traLoi: string;
  nguon: NguonTraLoi[];
}

export interface ChatLichSuItem {
  vaiTro: 'user' | 'bot';
  noiDung: string;
}

export async function hoiChatbot(
  cauHoi: string,
  maMonHoc: number | null,
  lichSu: ChatLichSuItem[],
): Promise<ChatbotResponse> {
  const res = await api.post<ChatbotResponse>('/chatbot/hoi', { cauHoi, maMonHoc, lichSu });
  return res.data;
}
