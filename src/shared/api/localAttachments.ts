/** Browser-only attachment adapter; production uses pur_attachment + protected object storage. */
export interface LocalAttachment { id: string; fileName: string; sizeBytes: number; contentType: string; sha256: string; uploadedAt: string; blob: Blob }
const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('pur-prototype-attachments', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('attachments', { keyPath: 'id' });
  request.onerror = () => reject(new Error('本机附件存储无法打开。'));
  request.onsuccess = () => resolve(request.result);
});
export async function saveLocalAttachment(file: File): Promise<LocalAttachment> {
  if (file.size > 20 * 1024 * 1024) throw new Error('单个附件不得超过20MB。');
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  const record: LocalAttachment = { id: crypto.randomUUID(), fileName: file.name, sizeBytes: file.size, contentType: file.type, sha256: Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join(''), uploadedAt: new Date().toISOString(), blob: file };
  const db = await openDatabase();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction('attachments', 'readwrite'); tx.objectStore('attachments').add(record); tx.oncomplete = () => resolve(); tx.onerror = () => reject(new Error('附件保存失败，请检查浏览器存储空间。')); }); } finally { db.close(); }
  return record;
}
export async function getLocalAttachment(id: string): Promise<LocalAttachment | undefined> {
  const db = await openDatabase();
  try { return await new Promise<LocalAttachment | undefined>((resolve, reject) => { const tx = db.transaction('attachments', 'readonly'); const request = tx.objectStore('attachments').get(id); request.onsuccess = () => resolve(request.result as LocalAttachment | undefined); request.onerror = () => reject(new Error('读取附件失败。')); }); } finally { db.close(); }
}
