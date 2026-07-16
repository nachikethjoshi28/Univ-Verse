import { useState, useRef } from 'react'
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop'
import { createPortal } from 'react-dom'
import { X, Check, Crop as CropIcon } from 'lucide-react'
import 'react-image-crop/dist/ReactCrop.css'

function centerAspectCrop(w: number, h: number, aspect?: number): Crop {
  if (aspect) {
    return centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, aspect, w, h),
      w, h
    )
  }
  return { unit: '%', x: 5, y: 5, width: 90, height: 90 }
}

export function CropModal({
  src,
  aspect,
  title = 'Crop Image',
  onDone,
  onCancel,
}: {
  src: string
  aspect?: number   // undefined = free-form, 1 = square, 16/9 etc.
  title?: string
  onDone: (blob: Blob) => void
  onCancel: () => void
}) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const imgRef = useRef<HTMLImageElement>(null)

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    setCrop(centerAspectCrop(w, h, aspect))
  }

  async function apply() {
    const img = imgRef.current
    if (!img || !completedCrop) return
    const canvas = document.createElement('canvas')
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height
    canvas.width  = completedCrop.width  * scaleX
    canvas.height = completedCrop.height * scaleY
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width  * scaleX,
      completedCrop.height * scaleY,
      0, 0, canvas.width, canvas.height
    )
    canvas.toBlob(blob => { if (blob) onDone(blob) }, 'image/jpeg', 0.93)
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <CropIcon className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-text-primary text-sm">{title}</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-xl text-text-muted hover:bg-surface-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop area */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-black/60 min-h-0 p-3">
          <ReactCrop
            crop={crop}
            onChange={(_, pct) => setCrop(pct)}
            onComplete={c => setCompletedCrop(c)}
            aspect={aspect}
            style={{ maxHeight: 'calc(90vh - 130px)' }}
          >
            <img
              ref={imgRef}
              src={src}
              onLoad={onImageLoad}
              alt="Crop preview"
              style={{ maxHeight: 'calc(90vh - 130px)', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-surface-border flex-shrink-0">
          <p className="text-xs text-text-muted">Drag to reposition • Handles to resize</p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-text-secondary rounded-xl border border-surface-border hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              disabled={!completedCrop}
              className="px-4 py-2 text-sm bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> Apply
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
