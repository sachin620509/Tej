/** Returns a broadly supported H.264/AAC MP4 delivery URL for Cloudinary videos. */
export function compatibleVideoUrl(url: string) {
  if (!url.includes('/res.cloudinary.com/') || !url.includes('/video/upload/')) return url;
  return url.replace('/video/upload/', '/video/upload/f_mp4,vc_h264,ac_aac,q_auto:good/');
}
