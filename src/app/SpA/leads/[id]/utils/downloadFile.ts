export function downloadFile(url: string) {
  if (!url) return;

  // No usar fl_attachment porque puede dar 401 si Cloudinary pide URL firmada
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}