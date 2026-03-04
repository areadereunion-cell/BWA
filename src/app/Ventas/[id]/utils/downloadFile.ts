// src/app/SpA/ventas/[id]/utils/downloadFile.ts
export function downloadFile(url: string) {
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}