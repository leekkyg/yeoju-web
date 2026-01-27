const R2_WORKER_URL = "https://yeoju-r2-worker.kkyg9300.workers.dev";

export interface UploadResult {
  url: string;
  success: boolean;
  error?: string;
}

export const uploadToR2 = async (
  file: File, 
  folder: string = 'uploads'
): Promise<string> => {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  
  console.log(`[Upload] 시작: ${file.name} (${file.size} bytes) -> ${fileName}`);
  
  try {
    const response = await fetch(`${R2_WORKER_URL}/${fileName}`, {
      method: 'PUT',
      body: file,
      headers: { 
        'Content-Type': file.type || 'application/octet-stream' 
      }
    });
    
    console.log(`[Upload] 응답: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Upload] 실패 응답:`, errorText);
      throw new Error(`업로드 실패: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`[Upload] 결과:`, data);
    
    if (!data.url) {
      throw new Error("서버에서 URL을 반환하지 않았습니다");
    }
    
    return data.url;
  } catch (error: any) {
    console.error(`[Upload] 에러:`, error);
    throw new Error(`파일 업로드 실패: ${error.message || '알 수 없는 오류'}`);
  }
};

export const compressImage = async (file: File, maxSize: number = 2048, quality: number = 0.85): Promise<File> => {
  if (!file.type.startsWith('image/') || file.size < 1024 * 1024) {
    return file;
  }
  
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
};

export const uploadImageWithCompression = async (
  file: File,
  folder: string = 'uploads'
): Promise<string> => {
  const compressed = await compressImage(file);
  return uploadToR2(compressed, folder);
};
