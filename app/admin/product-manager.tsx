"use client";

import { useState, useEffect } from "react";
import { createProduct, updateProduct, deleteProduct } from "./actions";
import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";

type Product = {
  id: string;
  name: string;
  price: number;
  tenant_id: string;
  image_urls?: string[];
};

export default function ProductManager({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingImages, setEditingImages] = useState<string[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [bucketLimit, setBucketLimit] = useState<number>(10485760); // default 10MB
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchBucketConfig() {
      const { data } = await supabase.storage.getBucket("objects");
      if (data && data.file_size_limit) {
        setBucketLimit(data.file_size_limit);
      }
    }
    fetchBucketConfig();
  }, [supabase]);

  async function handleCompressAndUpload(files: FileList | File[]): Promise<string[]> {
    try {
      setIsUploading(true);
      const options = {
        maxSizeMB: bucketLimit / (1024 * 1024),
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedFile = await imageCompression(file, options);
        
        if (compressedFile.size > bucketLimit) {
          throw new Error(`La imagen ${file.name} comprimida sigue siendo demasiado grande para el límite del bucket.`);
        }

        const fileExt = file.name.split('.').pop();
        const uniqueFileName = `${crypto.randomUUID()}.${fileExt}`;
        const tenantId = initialProducts.length > 0 ? initialProducts[0].tenant_id : process.env.NEXT_PUBLIC_TENANT_ID;
        
        const filePath = `${tenantId}/${uniqueFileName}`;

        const { error } = await supabase.storage
          .from("objects")
          .upload(filePath, compressedFile);

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
          .from("objects")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      return uploadedUrls;
    } catch (err: any) {
      console.error("Upload error:", err);
      setMessage({ type: "error", text: err.message || "Error al subir imagen" });
      setTimeout(() => setMessage(null), 3000);
      return [];
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteImagesFromStorage(urls: string[]) {
    if (!urls || urls.length === 0) return;
    try {
      const pathsToDelete = urls.map(url => {
        const match = "/objects/";
        const idx = url.indexOf(match);
        if (idx !== -1) {
          return url.substring(idx + match.length);
        }
        return "";
      }).filter(p => p !== "");

      if (pathsToDelete.length > 0) {
        const { error } = await supabase.storage.from("objects").remove(pathsToDelete);
        if (error) {
          console.error("Error removing old images:", error);
        }
      }
    } catch (err) {
      console.error("Failed to delete old images from storage:", err);
    }
  }

  async function handleCreate(formData: FormData) {
    const files = formData.getAll("images") as File[];
    const validFiles = files.filter(f => f.size > 0);
    let imageUrls: string[] = [];

    if (validFiles.length > 0) {
      const urls = await handleCompressAndUpload(validFiles);
      if (!urls || urls.length === 0) return; // Error handled inside
      imageUrls = urls;
    }

    if (imageUrls.length > 0) formData.set("image_urls", JSON.stringify(imageUrls));

    const result = await createProduct(formData);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Producto creado" });
      setShowForm(false);
    }
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleUpdate(formData: FormData) {
    const files = formData.getAll("images") as File[];
    const validFiles = files.filter(f => f.size > 0);
    
    const keptUrls = formData.getAll("kept_images") as string[];
    const currentUrlsRaw = formData.get("current_image_urls") as string;
    let originalUrls: string[] = [];
    if (currentUrlsRaw) {
      try { originalUrls = JSON.parse(currentUrlsRaw); } catch (e) {}
    }

    // Determine which images were removed by the user
    const removedUrls = originalUrls.filter(url => !keptUrls.includes(url));
    if (removedUrls.length > 0) {
      await handleDeleteImagesFromStorage(removedUrls);
    }
    
    let finalUrls: string[] = [...keptUrls];

    if (validFiles.length > 0) {
      const newUrls = await handleCompressAndUpload(validFiles);
      if (!newUrls || newUrls.length === 0) return; // Error handled inside
      finalUrls = [...finalUrls, ...newUrls]; // Appending new images to kept ones
    }

    formData.set("image_urls", JSON.stringify(finalUrls));

    const result = await updateProduct(formData);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Producto actualizado" });
      setEditingId(null);
    }
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleDelete(formData: FormData) {
    const urlsRaw = formData.get("current_image_urls") as string;
    if (urlsRaw) {
      try {
        const urls = JSON.parse(urlsRaw);
        if (urls && urls.length > 0) {
          await handleDeleteImagesFromStorage(urls);
        }
      } catch (e) {}
    }

    const result = await deleteProduct(formData);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Producto eliminado" });
    }
    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div className="pm-section">
      <div className="pm-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          </svg>
          Productos ({initialProducts.length})
        </h2>
        <button
          className="pm-add-btn"
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
          }}
        >
          {showForm ? "Cancelar" : "+ Nuevo"}
        </button>
      </div>

      {message && (
        <div className={`pm-message pm-message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form action={handleCreate} className="pm-form">
          <div className="pm-form-fields">
            <input
              name="name"
              placeholder="Nombre del producto"
              required
              className="pm-input"
            />
            <input
              name="price"
              type="number"
              step="0.01"
              placeholder="Precio"
              required
              className="pm-input pm-input-price"
            />
            <input
              name="images"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="pm-input"
            />
          </div>
          <button type="submit" className="pm-save-btn" disabled={isUploading}>
            {isUploading ? "Subiendo..." : "Crear"}
          </button>
        </form>
      )}

      {/* Product List */}
      <div className="pm-list">
        {initialProducts.length === 0 ? (
          <p className="pm-empty">No hay productos. Creá el primero.</p>
        ) : (
          initialProducts.map((product) => (
            <div key={product.id} className="pm-item">
              {editingId === product.id ? (
                <form action={handleUpdate} className="pm-form pm-form-inline">
                  <input type="hidden" name="id" value={product.id} />
                  <div className="pm-form-fields">
                    <input
                      name="name"
                      defaultValue={product.name}
                      required
                      className="pm-input"
                    />
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={product.price}
                      required
                      className="pm-input pm-input-price"
                    />
                  </div>
                  
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                    {editingImages.map((url, idx) => (
                      <div key={idx} style={{ position: "relative", width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1px solid #374151" }}>
                        <img src={url} alt="img" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button
                          type="button"
                          onClick={() => setEditingImages(prev => prev.filter(u => u !== url))}
                          style={{ position: "absolute", top: 0, right: 0, background: "rgba(239, 68, 68, 0.9)", color: "white", border: "none", borderRadius: "0 0 0 4px", cursor: "pointer", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}
                        >
                          ×
                        </button>
                        <input type="hidden" name="kept_images" value={url} />
                      </div>
                    ))}
                  </div>
                  
                  <input
                    name="images"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="pm-input"
                    style={{ marginBottom: "16px" }}
                  />
                  <input type="hidden" name="current_image_urls" value={product.image_urls ? JSON.stringify(product.image_urls) : "[]"} />
                  <div className="pm-item-actions">
                    <button type="submit" className="pm-save-btn" disabled={isUploading}>
                      {isUploading ? "Subiendo..." : "Guardar"}
                    </button>
                    <button
                      type="button"
                      className="pm-cancel-btn"
                      onClick={() => setEditingId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="pm-item-info" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    {product.image_urls && product.image_urls.length > 0 ? (
                      <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                        <img 
                          src={product.image_urls[0]} 
                          alt={product.name} 
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        />
                        {product.image_urls.length > 1 && (
                          <div style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '2px 4px', borderRadius: '4px' }}>
                            +{product.image_urls.length - 1}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: "#374151", flexShrink: 0 }} />
                    )}
                    <div>
                      <span className="pm-item-name">{product.name}</span>
                      <span className="pm-item-price" style={{ display: "block" }}>
                        ${product.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="pm-item-actions">
                    <button
                      className="pm-edit-btn"
                      onClick={() => {
                        setEditingImages(product.image_urls || []);
                        setEditingId(product.id);
                        setShowForm(false);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <form action={handleDelete} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="current_image_urls" value={product.image_urls ? JSON.stringify(product.image_urls) : "[]"} />
                      <button type="submit" className="pm-delete-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
