"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, Home, Sun, Moon, Users, RotateCcw, Settings, X, Search, ZoomIn, ZoomOut, Plus, ChevronLeft, ChevronRight, Truck, MapPin, CreditCard, Banknote, Package } from "lucide-react";
import Cropper from "react-easy-crop";

interface Participant {
  id: number;
  name: string;
  phone: string;
  quantity: number;
  status: string;
  created_at: string;
  paid_at?: string;
  picked_at?: string;
  user_id?: string;
  payment_method?: string; // "card" | "cash"
  delivery_method?: string; // "pickup" | "delivery"
  address?: string;
  address_detail?: string;
  courier?: string;
  tracking_number?: string;
}

interface GroupBuy {
  id: number;
  title: string;
  description?: string;
  sale_price: number;
  original_price?: number;
  current_quantity: number;
  min_quantity: number;
  max_quantity?: number;
  image_url?: string;
  images?: string[];
  pickup_date?: string;
  pickup_start_time?: string;
  pickup_end_time?: string;
  pickup_location?: string;
  pickup_address?: string;
  pickup_address_detail?: string;
  end_date?: string;
  payment_methods?: string[];
  delivery_methods?: string[];
  shop: {
    id: number;
    name: string;
    user_id: string;
  };
}

interface CroppedArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PendingImage {
  id: string;
  originalUrl: string;
  croppedUrl?: string;
  croppedBlob?: Blob;
}

declare global {
  interface Window {
    daum: any;
  }
}

// 택배사 목록
const COURIER_LIST = [
  { code: "cj", name: "CJ대한통운", url: "https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=" },
  { code: "hanjin", name: "한진택배", url: "https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mession=mession&wblnb=" },
  { code: "lotte", name: "롯데택배", url: "https://www.lotteglogis.com/open/tracking?invno=" },
  { code: "logen", name: "로젠택배", url: "https://www.ilogen.com/web/personal/trace/" },
  { code: "post", name: "우체국택배", url: "https://service.epost.go.kr/trace.RetrieveDomRiGidTraceXmlInfo.comm?sid1=" },
  { code: "cu", name: "CU편의점택배", url: "https://www.cupost.co.kr/postbox/delivery/localResult.cupost?invoice_no=" },
  { code: "gs", name: "GS편의점택배", url: "https://www.cvsnet.co.kr/invoice/tracking.do?invoice_no=" },
  { code: "kyungdong", name: "경동택배", url: "https://kdexp.com/service/delivery/delivery_result.do?barcode=" },
  { code: "daesin", name: "대신택배", url: "https://www.ds3211.com/freight/internalFreightSearch.ht?billno=" },
];

// 크롭된 이미지 생성 함수
const createCroppedImage = async (imageSrc: string, pixelCrop: CroppedArea): Promise<Blob> => {
  const image = new Image();
  image.src = imageSrc;
  
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas toBlob failed"));
        }
      },
      "image/jpeg",
      0.9
    );
  });
};

// 이미지 슬라이더 컴포넌트
function ImageSlider({ images, autoPlay = true, interval = 3000 }: { images: string[], autoPlay?: boolean, interval?: number }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const { theme } = useTheme();

  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, interval);
    return () => clearInterval(timer);
  }, [autoPlay, images.length, interval]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.touches[0].clientX);
  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) setCurrentIndex(prev => (prev + 1) % images.length);
    if (touchEnd - touchStart > 50) setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  };

  if (images.length === 0) return null;

  return (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
      <div className="w-full h-full" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <img src={images[currentIndex]} alt="" className="w-full h-full object-cover" />
      </div>
      {images.length > 1 && (
        <>
          <button onClick={() => setCurrentIndex(prev => (prev - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-black/40">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button onClick={() => setCurrentIndex(prev => (prev + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-black/40">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "#fff" }}>
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function ShopGroupBuyManagePage() {
  const params = useParams();
  const router = useRouter();
  const { theme, isDark, mounted, toggleTheme } = useTheme();
  
  const [groupBuy, setGroupBuy] = useState<GroupBuy | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [user, setUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);

  // 수정 모달 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    sale_price: 0,
    original_price: 0,
    min_quantity: 0,
    max_quantity: 0,
    pickup_date: "",
    pickup_start_time: "",
    pickup_end_time: "",
    pickup_address: "",
    pickup_address_detail: "",
    end_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 관리 상태
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  
  // 크롭 모달 상태
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageIndex, setCropImageIndex] = useState<number>(-1);
  const [cropImageType, setCropImageType] = useState<"existing" | "pending">("pending");
  const [cropImage, setCropImage] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedArea | null>(null);

  // 운송장 입력 모달 상태
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingParticipant, setTrackingParticipant] = useState<Participant | null>(null);
  const [trackingCourier, setTrackingCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const hasParticipants = participants.filter(p => p.status !== "cancelled").length > 0;

  // 다음 주소 API 스크립트 로드
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { if (user) fetchData(); }, [user, params.id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUser(user);
  };

  const fetchData = async () => {
    const { data: gbData } = await supabase
      .from("group_buys")
      .select("*, shop:shops(id, name, user_id)")
      .eq("id", params.id)
      .single();

    if (!gbData) { alert("공구를 찾을 수 없습니다"); router.back(); return; }
    if (gbData.shop?.user_id !== user.id) { alert("접근 권한이 없습니다"); router.back(); return; }

    setGroupBuy(gbData);
    setIsOwner(true);

    const imgs = gbData.images || (gbData.image_url ? [gbData.image_url] : []);
    setExistingImages(imgs);

    setEditForm({
      title: gbData.title || "",
      description: gbData.description || "",
      sale_price: gbData.sale_price || 0,
      original_price: gbData.original_price || 0,
      min_quantity: gbData.min_quantity || 0,
      max_quantity: gbData.max_quantity || 0,
      pickup_date: gbData.pickup_date || "",
      pickup_start_time: gbData.pickup_start_time?.slice(0, 5) || "",
      pickup_end_time: gbData.pickup_end_time?.slice(0, 5) || "",
      pickup_address: gbData.pickup_address || gbData.pickup_location || "",
      pickup_address_detail: gbData.pickup_address_detail || "",
      end_date: gbData.end_date?.slice(0, 16) || "",
    });

    const { data: pData } = await supabase
      .from("group_buy_participants")
      .select("*")
      .eq("group_buy_id", params.id)
      .order("created_at", { ascending: false });

    setParticipants(pData || []);
    setLoading(false);
  };

  const handleAddressSearch = () => {
    if (!window.daum) { alert("주소 검색 서비스를 불러오는 중입니다."); return; }
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        setEditForm(prev => ({ ...prev, pickup_address: data.roadAddress || data.jibunAddress }));
      },
    }).open();
  };

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const validFiles = Array.from(files).filter(file => file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024);
    for (const file of validFiles) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPendingImages(prev => [...prev, {
          id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          originalUrl: event.target?.result as string,
        }]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handlePendingImageClick = (index: number) => {
    const img = pendingImages[index];
    if (!img) return;
    setCropImage(img.croppedUrl || img.originalUrl);
    setCropImageIndex(index);
    setCropImageType("pending");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setShowCropModal(true);
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: CroppedArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!croppedAreaPixels || cropImageIndex < 0) return;
    try {
      const croppedBlob = await createCroppedImage(cropImage, croppedAreaPixels);
      const croppedUrl = URL.createObjectURL(croppedBlob);
      if (cropImageType === "pending") {
        setPendingImages(prev => prev.map((img, idx) => idx === cropImageIndex ? { ...img, croppedUrl, croppedBlob } : img));
      }
      setShowCropModal(false);
      setCropImage("");
      setCropImageIndex(-1);
    } catch (error) {
      alert("이미지 크롭 실패");
    }
  };

  const handleRemoveExistingImage = (index: number) => setExistingImages(prev => prev.filter((_, idx) => idx !== index));
  const handleRemovePendingImage = (index: number) => setPendingImages(prev => prev.filter((_, idx) => idx !== index));

  const handleSaveEdit = async () => {
    if (!groupBuy) return;
    setSaving(true);
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const pending of pendingImages) {
        let blob: Blob;
        if (pending.croppedBlob) blob = pending.croppedBlob;
        else { const response = await fetch(pending.originalUrl); blob = await response.blob(); }
        const fileName = `groupbuy_${groupBuy.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        const { error: uploadError } = await supabase.storage.from("images").upload(`group-buys/${fileName}`, blob, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("images").getPublicUrl(`group-buys/${fileName}`);
        uploadedUrls.push(publicUrl);
      }
      const finalImages = [...existingImages, ...uploadedUrls];
      let updateData: any = hasParticipants ? {
        image_url: finalImages[0] || null,
        images: finalImages,
        pickup_address: editForm.pickup_address,
        pickup_address_detail: editForm.pickup_address_detail,
        pickup_location: editForm.pickup_address + (editForm.pickup_address_detail ? ` ${editForm.pickup_address_detail}` : ""),
      } : {
        title: editForm.title,
        description: editForm.description,
        sale_price: editForm.sale_price,
        original_price: editForm.original_price,
        min_quantity: editForm.min_quantity,
        max_quantity: editForm.max_quantity,
        pickup_date: editForm.pickup_date || null,
        pickup_start_time: editForm.pickup_start_time || null,
        pickup_end_time: editForm.pickup_end_time || null,
        pickup_address: editForm.pickup_address,
        pickup_address_detail: editForm.pickup_address_detail,
        pickup_location: editForm.pickup_address + (editForm.pickup_address_detail ? ` ${editForm.pickup_address_detail}` : ""),
        end_date: editForm.end_date || null,
        image_url: finalImages[0] || null,
        images: finalImages,
      };
      const { error } = await supabase.from("group_buys").update(updateData).eq("id", groupBuy.id);
      if (error) throw error;
      setGroupBuy(prev => prev ? { ...prev, ...updateData } : null);
      setExistingImages(finalImages);
      setPendingImages([]);
      setShowEditModal(false);
      alert("수정되었습니다");
    } catch (error: any) {
      alert("수정 실패: " + error.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  // 상태 변경 로직 (결제/배송 방식에 따라)
  const getNextStatus = (p: Participant) => {
    const isDelivery = p.delivery_method === "delivery";
    const isCard = p.payment_method === "card";
    
    if (isDelivery) {
      // 배송
      if (p.status === "unpaid") return "paid";
      if (p.status === "paid") return "preparing";
      if (p.status === "preparing") return "shipping"; // 운송장 입력 필요
      if (p.status === "shipping") return "delivered";
    } else {
      // 픽업
      if (p.status === "unpaid") return "paid";
      if (p.status === "paid") return "picked";
    }
    return null;
  };

  const getPrevStatus = (p: Participant) => {
    const isDelivery = p.delivery_method === "delivery";
    
    if (isDelivery) {
      if (p.status === "paid") return "unpaid";
      if (p.status === "preparing") return "paid";
      if (p.status === "shipping") return "preparing";
      if (p.status === "delivered") return "shipping";
    } else {
      if (p.status === "paid") return "unpaid";
      if (p.status === "picked") return "paid";
    }
    return null;
  };

  const handleStatusChange = async (participant: Participant) => {
    const nextStatus = getNextStatus(participant);
    if (!nextStatus) return;

    // 배송중으로 변경 시 운송장 입력 모달
    if (nextStatus === "shipping") {
      setTrackingParticipant(participant);
      setTrackingCourier(participant.courier || "");
      setTrackingNumber(participant.tracking_number || "");
      setShowTrackingModal(true);
      return;
    }

    let updateData: any = { status: nextStatus };
    if (nextStatus === "paid") updateData.paid_at = new Date().toISOString();
    if (nextStatus === "picked") updateData.picked_at = new Date().toISOString();

    const { error } = await supabase.from("group_buy_participants").update(updateData).eq("id", participant.id);
    if (error) { alert("상태 변경 실패: " + error.message); return; }
    setParticipants(prev => prev.map(p => p.id === participant.id ? { ...p, ...updateData } : p));
  };

  // 운송장 입력 후 배송중 처리
  const handleTrackingSubmit = async () => {
    if (!trackingParticipant) return;
    if (!trackingCourier) { alert("택배사를 선택해주세요"); return; }
    if (!trackingNumber.trim()) { alert("운송장 번호를 입력해주세요"); return; }

    const updateData = {
      status: "shipping",
      courier: trackingCourier,
      tracking_number: trackingNumber.trim(),
    };

    const { error } = await supabase.from("group_buy_participants").update(updateData).eq("id", trackingParticipant.id);
    if (error) { alert("저장 실패: " + error.message); return; }

    setParticipants(prev => prev.map(p => p.id === trackingParticipant.id ? { ...p, ...updateData } : p));
    setShowTrackingModal(false);
    setTrackingParticipant(null);
    setTrackingCourier("");
    setTrackingNumber("");
  };

  const handleRevert = async (participant: Participant) => {
    const prevStatus = getPrevStatus(participant);
    if (!prevStatus) return;
    if (!confirm("이전 상태로 되돌리시겠습니까?")) return;

    let updateData: any = { status: prevStatus };
    if (prevStatus === "unpaid") updateData.paid_at = null;
    if (prevStatus === "paid" && participant.status === "picked") updateData.picked_at = null;

    const { error } = await supabase.from("group_buy_participants").update(updateData).eq("id", participant.id);
    if (error) { alert("되돌리기 실패: " + error.message); return; }
    setParticipants(prev => prev.map(p => p.id === participant.id ? { ...p, ...updateData } : p));
  };

  const handleCancel = async (participant: Participant) => {
    if (!confirm(`${participant.name}님의 주문을 취소하시겠습니까?`)) return;
    const { error } = await supabase.from("group_buy_participants").update({ status: "cancelled" }).eq("id", participant.id);
    if (error) { alert("취소 실패: " + error.message); return; }
    setParticipants(prev => prev.map(p => p.id === participant.id ? { ...p, status: "cancelled" } : p));
  };

  // 배송조회 URL 생성
  const getTrackingUrl = (courier: string, trackingNumber: string) => {
    const courierInfo = COURIER_LIST.find(c => c.code === courier);
    if (!courierInfo) return null;
    return courierInfo.url + trackingNumber;
  };

  const filteredParticipants = filter === "all" ? participants : participants.filter(p => p.status === filter);

  const unpaidCount = participants.filter(p => p.status === "unpaid").length;
  const paidCount = participants.filter(p => p.status === "paid").length;
  const preparingCount = participants.filter(p => p.status === "preparing").length;
  const shippingCount = participants.filter(p => p.status === "shipping").length;
  const deliveredCount = participants.filter(p => p.status === "delivered").length;
  const pickedCount = participants.filter(p => p.status === "picked").length;
  const cancelledCount = participants.filter(p => p.status === "cancelled").length;
  const totalAmount = participants.filter(p => p.status !== "cancelled").reduce((sum, p) => sum + (p.quantity * (groupBuy?.sale_price || 0)), 0);

  const getStatusBadge = (status: string, deliveryMethod?: string) => {
    switch (status) {
      case "unpaid": return { text: "미입금", bg: theme.red, color: "#fff" };
      case "paid": return { text: deliveryMethod === "delivery" ? "결제완료" : "입금확인", bg: "#F59E0B", color: "#fff" };
      case "preparing": return { text: "배송준비", bg: "#8B5CF6", color: "#fff" };
      case "shipping": return { text: "배송중", bg: "#3B82F6", color: "#fff" };
      case "delivered": return { text: "배송완료", bg: "#10B981", color: "#fff" };
      case "picked": return { text: "픽업완료", bg: "#3B82F6", color: "#fff" };
      case "cancelled": return { text: "취소", bg: theme.textMuted, color: "#fff" };
      default: return { text: "확인중", bg: theme.bgInput, color: theme.textMuted };
    }
  };

  const getActionButton = (p: Participant) => {
    const isDelivery = p.delivery_method === "delivery";
    const badge = getStatusBadge(p.status, p.delivery_method);
    
    if (p.status === "cancelled") return null;
    
    // 최종 상태면 버튼 비활성
    if ((isDelivery && p.status === "delivered") || (!isDelivery && p.status === "picked")) {
      return (
        <span className="px-4 py-2 rounded-xl text-sm font-bold" style={{ backgroundColor: badge.bg, color: badge.color }}>
          {badge.text}
        </span>
      );
    }

    return (
      <button onClick={() => handleStatusChange(p)} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ backgroundColor: badge.bg, color: badge.color }}>
        {badge.text}
      </button>
    );
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  if (!groupBuy || !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <p style={{ color: theme.textPrimary }}>접근 권한이 없습니다</p>
      </div>
    );
  }

  const allPreviewImages = [...existingImages, ...pendingImages.map(p => p.croppedUrl || p.originalUrl)];

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: theme.bgCard, borderColor: theme.borderLight }}>
        <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" style={{ color: theme.textPrimary }} />
            </button>
            <h1 className="font-bold" style={{ color: theme.textPrimary }}>주문 관리</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center">
              {isDark ? <Sun className="w-5 h-5" style={{ color: theme.accent }} /> : <Moon className="w-5 h-5" style={{ color: theme.accent }} />}
            </button>
            <Link href="/" className="w-10 h-10 flex items-center justify-center">
              <Home className="w-5 h-5" style={{ color: theme.textSecondary }} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        {/* 공구 정보 */}
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.bgCard }}>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 flex-shrink-0">
              {(groupBuy.images?.length || 0) > 0 || groupBuy.image_url ? (
                <div className="relative w-full h-full rounded-xl overflow-hidden">
                  <ImageSlider images={groupBuy.images?.length ? groupBuy.images : (groupBuy.image_url ? [groupBuy.image_url] : [])} autoPlay={true} interval={3000} />
                </div>
              ) : (
                <div className="w-full h-full rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                  <span className="text-2xl">🛒</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate" style={{ color: theme.textPrimary }}>{groupBuy.title}</p>
              <p className="text-sm" style={{ color: theme.textMuted }}>{groupBuy.sale_price.toLocaleString()}원</p>
            </div>
            <button onClick={() => setShowEditModal(true)} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.bgInput }}>
              <Settings className="w-5 h-5" style={{ color: theme.textSecondary }} />
            </button>
          </div>
        </div>

        {/* 통계 */}
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.bgCard }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: theme.bgInput }}>
              <p className="text-xs mb-1" style={{ color: theme.textMuted }}>총 주문</p>
              <p className="text-xl font-black" style={{ color: theme.textPrimary }}>{participants.filter(p => p.status !== "cancelled").length}건</p>
              <p className="text-sm font-bold" style={{ color: theme.accent }}>{totalAmount.toLocaleString()}원</p>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: "#10B98115" }}>
              <p className="text-xs mb-1" style={{ color: "#10B981" }}>완료</p>
              <p className="text-xl font-black" style={{ color: "#10B981" }}>{pickedCount + deliveredCount}건</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 text-xs" style={{ borderTop: `1px solid ${theme.border}` }}>
            {unpaidCount > 0 && <span style={{ color: theme.red }}>미입금 {unpaidCount}</span>}
            {paidCount > 0 && <span style={{ color: "#F59E0B" }}>결제완료 {paidCount}</span>}
            {preparingCount > 0 && <span style={{ color: "#8B5CF6" }}>배송준비 {preparingCount}</span>}
            {shippingCount > 0 && <span style={{ color: "#3B82F6" }}>배송중 {shippingCount}</span>}
            {deliveredCount > 0 && <span style={{ color: "#10B981" }}>배송완료 {deliveredCount}</span>}
            {pickedCount > 0 && <span style={{ color: "#3B82F6" }}>픽업완료 {pickedCount}</span>}
            {cancelledCount > 0 && <span style={{ color: theme.textMuted }}>취소 {cancelledCount}</span>}
          </div>
        </div>

        {/* 필터 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {[
            { key: "all", label: "전체" },
            { key: "unpaid", label: "미입금" },
            { key: "paid", label: "결제완료" },
            { key: "preparing", label: "배송준비" },
            { key: "shipping", label: "배송중" },
            { key: "delivered", label: "배송완료" },
            { key: "picked", label: "픽업완료" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap"
              style={{ 
                backgroundColor: filter === f.key ? `${theme.accent}20` : theme.bgCard, 
                color: filter === f.key ? theme.accent : theme.textSecondary,
                border: filter === f.key ? `1.5px solid ${theme.accent}` : `1px solid ${theme.border}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <p className="text-xs mb-3 px-1" style={{ color: theme.textMuted }}>
          💡 버튼을 누르면 다음 단계로 변경돼요
        </p>

        {/* 참여자 목록 */}
        {filteredParticipants.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: theme.bgCard }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: theme.bgInput }}>
              <Users className="w-8 h-8" style={{ color: theme.textMuted }} />
            </div>
            <p className="font-medium" style={{ color: theme.textPrimary }}>
              {filter === "all" ? "아직 참여자가 없어요" : "해당 상태의 주문이 없습니다"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredParticipants.map((p, idx) => {
              const badge = getStatusBadge(p.status, p.delivery_method);
              const isCancelled = p.status === "cancelled";
              const isDelivery = p.delivery_method === "delivery";
              const trackingUrl = p.courier && p.tracking_number ? getTrackingUrl(p.courier, p.tracking_number) : null;

              return (
                <div key={p.id} className={`rounded-xl p-3 ${isCancelled ? "opacity-50" : ""}`} style={{ backgroundColor: theme.bgCard }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ backgroundColor: badge.bg, color: badge.color }}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-base" style={{ color: theme.textPrimary }}>{p.name}</p>
                        {isDelivery ? <Truck className="w-4 h-4" style={{ color: theme.accent }} /> : <MapPin className="w-4 h-4" style={{ color: theme.textMuted }} />}
                        {p.payment_method === "card" ? <CreditCard className="w-4 h-4" style={{ color: "#3B82F6" }} /> : <Banknote className="w-4 h-4" style={{ color: "#10B981" }} />}
                      </div>
                      <p className="text-xs" style={{ color: theme.textMuted }}>
                        {p.quantity}개 · {(p.quantity * (groupBuy?.sale_price || 0)).toLocaleString()}원
                      </p>
                      {isDelivery && p.address && (
                        <p className="text-xs mt-1 truncate" style={{ color: theme.textMuted }}>
                          📍 {p.address} {p.address_detail}
                        </p>
                      )}
                    </div>
                    {!isCancelled ? (
                      <div className="flex items-center flex-shrink-0">
                        {getPrevStatus(p) && (
                          <button onClick={() => handleRevert(p)} className="w-8 h-8 rounded-lg flex items-center justify-center mr-2" style={{ backgroundColor: theme.bgInput }}>
                            <RotateCcw className="w-4 h-4" style={{ color: theme.textMuted }} />
                          </button>
                        )}
                        {p.status === "unpaid" && (
                          <button onClick={() => handleCancel(p)} className="w-8 h-8 rounded-lg flex items-center justify-center mr-2" style={{ backgroundColor: theme.bgInput }}>
                            <X className="w-4 h-4" style={{ color: theme.textMuted }} />
                          </button>
                        )}
                        {getActionButton(p)}
                      </div>
                    ) : (
                      <span className="px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>
                        취소됨
                      </span>
                    )}
                  </div>
                  
                  {/* 운송장 정보 */}
                  {isDelivery && p.courier && p.tracking_number && (
                    <div className="mt-2 pt-2 flex items-center justify-between" style={{ borderTop: `1px solid ${theme.border}` }}>
                      <p className="text-xs" style={{ color: theme.textMuted }}>
                        📦 {COURIER_LIST.find(c => c.code === p.courier)?.name || p.courier} {p.tracking_number}
                      </p>
                      {trackingUrl && (
                        <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium px-2 py-1 rounded" style={{ backgroundColor: theme.bgInput, color: theme.accent }}>
                          배송조회
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 운송장 입력 모달 */}
      {showTrackingModal && trackingParticipant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTrackingModal(false)} />
          <div className="relative w-full max-w-[400px] rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
              <h2 className="text-lg font-bold" style={{ color: theme.textPrimary }}>운송장 입력</h2>
              <button onClick={() => setShowTrackingModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                <X className="w-4 h-4" style={{ color: theme.textSecondary }} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: theme.bgInput }}>
                <p className="font-bold" style={{ color: theme.textPrimary }}>{trackingParticipant.name}</p>
                <p className="text-sm" style={{ color: theme.textMuted }}>{trackingParticipant.address} {trackingParticipant.address_detail}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>택배사</label>
                <select
                  value={trackingCourier}
                  onChange={(e) => setTrackingCourier(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }}
                >
                  <option value="">택배사 선택</option>
                  {COURIER_LIST.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>운송장 번호</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="운송장 번호 입력"
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }}
                />
              </div>
            </div>
            <div className="p-4 border-t" style={{ borderColor: theme.border }}>
              <button onClick={handleTrackingSubmit} className="w-full py-3 rounded-xl font-bold text-white" style={{ backgroundColor: theme.accent }}>
                배송중 처리
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-[640px] max-h-[85vh] rounded-t-3xl overflow-hidden flex flex-col" style={{ backgroundColor: theme.bgMain }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
              <h2 className="text-lg font-bold" style={{ color: theme.textPrimary }}>공구 정보 수정</h2>
              <button onClick={() => setShowEditModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                <X className="w-5 h-5" style={{ color: theme.textSecondary }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {hasParticipants && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: "#F59E0B15" }}>
                  <p className="text-sm" style={{ color: "#F59E0B" }}>⚠️ 참여자가 있어 <strong>사진</strong>과 <strong>픽업 장소</strong>만 수정할 수 있습니다.</p>
                </div>
              )}

              {/* 이미지 섹션 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>상품 이미지</label>
                {allPreviewImages.length > 0 && <div className="mb-3"><ImageSlider images={allPreviewImages} autoPlay={true} interval={3000} /></div>}
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {existingImages.map((url, idx) => (
                    <div key={`exist_${idx}`} className="relative aspect-square group">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                      {idx === 0 && <span className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: theme.accent, color: "#fff" }}>대표</span>}
                      <button onClick={() => handleRemoveExistingImage(idx)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {pendingImages.map((img, idx) => (
                    <div key={img.id} className="relative aspect-square group">
                      <img src={img.croppedUrl || img.originalUrl} alt="" className="w-full h-full object-cover rounded-lg cursor-pointer" onClick={() => handlePendingImageClick(idx)} />
                      {existingImages.length === 0 && idx === 0 && <span className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: theme.accent, color: "#fff" }}>대표</span>}
                      <button onClick={(e) => { e.stopPropagation(); handleRemovePendingImage(idx); }} className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center" style={{ borderColor: theme.border }}>
                    <Plus className="w-5 h-5" style={{ color: theme.textMuted }} />
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesSelect} className="hidden" />
              </div>

              {/* 나머지 폼 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>상품명</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} disabled={hasParticipants} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}`, opacity: hasParticipants ? 0.5 : 1 }} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>상품 설명</label>
                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} disabled={hasParticipants} rows={3} className="w-full px-4 py-3 rounded-xl resize-none" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}`, opacity: hasParticipants ? 0.5 : 1 }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>판매가</label>
                  <input type="number" value={editForm.sale_price} onChange={e => setEditForm({ ...editForm, sale_price: Number(e.target.value) })} disabled={hasParticipants} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}`, opacity: hasParticipants ? 0.5 : 1 }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>원가</label>
                  <input type="number" value={editForm.original_price} onChange={e => setEditForm({ ...editForm, original_price: Number(e.target.value) })} disabled={hasParticipants} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}`, opacity: hasParticipants ? 0.5 : 1 }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>최소 수량</label>
                  <input type="number" value={editForm.min_quantity} onChange={e => setEditForm({ ...editForm, min_quantity: Number(e.target.value) })} disabled={hasParticipants} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}`, opacity: hasParticipants ? 0.5 : 1 }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>최대 수량</label>
                  <input type="number" value={editForm.max_quantity} onChange={e => setEditForm({ ...editForm, max_quantity: Number(e.target.value) })} disabled={hasParticipants} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}`, opacity: hasParticipants ? 0.5 : 1 }} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>모집 마감일</label>
                <input type="datetime-local" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} disabled={hasParticipants} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}`, opacity: hasParticipants ? 0.5 : 1 }} />
              </div>

              <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
                <p className="text-sm font-bold mb-3" style={{ color: theme.textPrimary }}>픽업 정보</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>픽업 날짜</label>
                    <input type="date" value={editForm.pickup_date} onChange={e => setEditForm({ ...editForm, pickup_date: e.target.value })} disabled={hasParticipants} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}`, opacity: hasParticipants ? 0.5 : 1 }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>시작 시간</label>
                      <input type="time" value={editForm.pickup_start_time} onChange={e => setEditForm({ ...editForm, pickup_start_time: e.target.value })} disabled={hasParticipants} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}`, opacity: hasParticipants ? 0.5 : 1 }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>종료 시간</label>
                      <input type="time" value={editForm.pickup_end_time} onChange={e => setEditForm({ ...editForm, pickup_end_time: e.target.value })} disabled={hasParticipants} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}`, opacity: hasParticipants ? 0.5 : 1 }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>픽업 장소</label>
                    <div className="flex gap-2">
                      <input type="text" value={editForm.pickup_address} readOnly placeholder="주소 검색" className="flex-1 px-4 py-3 rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }} />
                      <button onClick={handleAddressSearch} className="px-4 py-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: theme.accent, color: "#fff" }}>
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>상세 위치</label>
                    <input type="text" value={editForm.pickup_address_detail} onChange={e => setEditForm({ ...editForm, pickup_address_detail: e.target.value })} placeholder="예: 매장 앞" className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t" style={{ borderColor: theme.border }}>
              <button onClick={handleSaveEdit} disabled={saving || uploading} className="w-full py-4 rounded-xl font-bold text-white" style={{ backgroundColor: (saving || uploading) ? theme.textMuted : theme.accent }}>
                {uploading ? "업로드 중..." : saving ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 크롭 모달 */}
      {showCropModal && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black">
          <div className="flex items-center justify-between p-4 bg-[#111]">
            <button onClick={() => { setShowCropModal(false); setCropImage(""); setCropImageIndex(-1); }} className="text-white font-medium">취소</button>
            <h3 className="text-white font-bold">이미지 편집</h3>
            <button onClick={handleCropConfirm} className="font-bold" style={{ color: theme.accent }}>완료</button>
          </div>
          <div className="flex-1 relative">
            <Cropper image={cropImage} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
          </div>
          <div className="p-4 flex items-center gap-4 bg-[#111]">
            <ZoomOut className="w-5 h-5 text-white" />
            <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1" />
            <ZoomIn className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
