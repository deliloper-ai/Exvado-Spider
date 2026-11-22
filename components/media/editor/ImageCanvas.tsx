// @ts-nocheck
'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import { FabricJSCanvas, useFabricJSEditor } from 'fabricjs-react'

// Fabric global instance
declare global {
  interface Window {
    fabric: any
  }
}

interface ImageCanvasProps {
  activeTool: string
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void
}

export interface ImageCanvasRef {
  loadImage: (url: string) => void
  addImage: (url: string, position?: { x: number; y: number }) => void
  loadTemplate: (data: any) => void
  createBlank: (width: number, height: number, bgColor: string) => void
  exportImage: (format: 'png' | 'jpeg' | 'webp') => string
  undo: () => void
  redo: () => void
  getCanvas: () => any
  addText: () => void
  addRect: () => void
  addCircle: () => void
  addTriangle: () => void
  addStar: () => void
  addLine: () => void
  addArrow: () => void
  rotateObject: (angle: number) => void
  applyFilter: (filterType: string, value: number) => void
  cropImage: () => void
  applyCrop: () => void
  cancelCrop: () => void
  isCropMode: () => boolean
  setBrushColor: (color: string) => void
  setBrushWidth: (width: number) => void
  setEraserMode: (enabled: boolean) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setZoom: (level: number) => void
  getZoom: () => number
  fitToViewport: () => number
  getCanvasInfo: () => { canvasWidth: number; canvasHeight: number; imageWidth: number; imageHeight: number; zoom: number }
  alignLeft: () => void
  alignCenter: () => void
  alignRight: () => void
  alignTop: () => void
  alignMiddle: () => void
  alignBottom: () => void
  bringToFront: () => void
  sendToBack: () => void
  setTextStroke: (color: string, width: number) => void
  setTextShadow: (color: string, blur: number, offsetX: number, offsetY: number) => void
  updateTextProperty: (property: string, value: any) => void
  removeBackground: () => Promise<void>
}

const ImageCanvas = forwardRef<ImageCanvasRef, ImageCanvasProps>(
  ({ activeTool, onHistoryChange }, ref) => {
    const { editor, onReady } = useFabricJSEditor()
    const historyRef = useRef<string[]>([])
    const historyIndexRef = useRef(-1)
    const trackHistoryRef = useRef<(() => void) | null>(null) // trackHistory fonksiyonunu sakla
    const proxyTrackHistoryRef = useRef<(() => void) | null>(null) // Proxy fonksiyonunu da sakla
    const isLoadingHistoryRef = useRef(false) // Flag'i ref'te sakla - canvas objesinde değil!
    const [fabricLoaded, setFabricLoaded] = useState(false)
    const canvasResizedRef = useRef(false) // Canvas resize edildi mi?
    const containerRef = useRef<HTMLDivElement>(null) // Canvas container ref
    const originalCanvasSizeRef = useRef({ width: 800, height: 600 }) // Orijinal canvas boyutu (zoom=1)

    // Pan (Space tuşu) için state
    const [isSpacePressed, setIsSpacePressed] = useState(false)
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const dragStartRef = useRef({ x: 0, y: 0 })
    const lastOffsetRef = useRef({ x: 0, y: 0 })

    // Crop rectangle boyutları için state
    const [cropDimensions, setCropDimensions] = useState({ width: 0, height: 0, left: 0, top: 0 })

    // Load fabric.js dynamically
    useEffect(() => {
      if (typeof window !== 'undefined' && !window.fabric) {
        import('fabric').then((fabricModule: any) => {
          window.fabric = fabricModule.fabric || fabricModule.default || fabricModule
          setFabricLoaded(true)
        }).catch(err => {
          console.error('Failed to load fabric:', err)
        })
      } else if (window.fabric) {
        setFabricLoaded(true)
      }
    }, [])

    useEffect(() => {
      if (!editor || !editor.canvas) return

      const canvas = editor.canvas

      // SADECE canvas henüz resize edilmemişse default boyut ver
      if (!canvasResizedRef.current) {
        canvas.setWidth(800)
        canvas.setHeight(600)
        console.log('📌 Canvas initialized: 800x600 (default)')
      } else {
        console.log('📌 Canvas already resized, skipping default size')
      }

      canvas.backgroundColor = '#f0f0f0'
      if (canvas.renderAll) {
        canvas.renderAll()
      }

      // History tracking - save immediately on changes
      const trackHistory = () => {
        console.log('🎯 trackHistory called')

        if (!canvas) {
          console.log('❌ trackHistory: no canvas')
          return
        }

        // DON'T track history while loading from history (undo/redo)
        if (isLoadingHistoryRef.current) {
          console.log('⏸️ trackHistory: paused (loading history)')
          return
        }

        try {
          // Canvas boşsa ve henüz history yoksa kaydetme
          if (canvas.getObjects().length === 0 && historyRef.current.length === 0) {
            console.log('⏭️ Skipping empty canvas (no objects yet)')
            return
          }

          const json = (canvas as any).toJSON([
            'name',
            'selectable',
            'evented',
            'opacity',
            'flipX',
            'flipY',
            'originX',
            'originY',
          ])

          // Blob URL'lerini base64'e çevir (undo/redo için)
          if (json.objects) {
            const canvasObjects = canvas.getObjects()
            json.objects = json.objects.map((obj: any, index: number) => {
              if (obj.type === 'image' && obj.src && obj.src.startsWith('blob:')) {
                // Blob URL'si varsa, fabric objesinden base64'e çevir
                try {
                  const fabricObj = canvasObjects[index]
                  if (fabricObj && fabricObj.type === 'image') {
                    // Create a temp canvas to convert image to base64
                    const tempCanvas = document.createElement('canvas')
                    const imgElement = (fabricObj as any)._element || (fabricObj as any)._originalElement
                    if (imgElement) {
                      tempCanvas.width = imgElement.width || imgElement.naturalWidth
                      tempCanvas.height = imgElement.height || imgElement.naturalHeight
                      const ctx = tempCanvas.getContext('2d')
                      if (ctx) {
                        ctx.drawImage(imgElement, 0, 0)
                        obj.src = tempCanvas.toDataURL()
                        console.log('✅ Converted blob to base64 for history')
                      }
                    }
                  }
                } catch (e) {
                  console.warn('⚠️ Failed to convert blob to base64:', e)
                }
              }
              return obj
            })
          }

          // Remove future history if we're not at the end
          historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
          historyRef.current.push(json)
          historyIndexRef.current++

          // Limit history to 20 entries (performance)
          if (historyRef.current.length > 20) {
            historyRef.current.shift()
            historyIndexRef.current--
          }

          console.log('📝 History saved:', {
            total: historyRef.current.length,
            currentIndex: historyIndexRef.current,
            objects: canvas.getObjects().length,
            objectNames: canvas.getObjects().map((obj: any) => obj.name || obj.type)
          })

          onHistoryChange(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1)
        } catch (err) {
          console.error('❌ trackHistory error:', err)
        }
      }

      // Ref'e kaydet (güncel fonksiyonu sakla)
      trackHistoryRef.current = trackHistory

      // Proxy fonksiyon - sadece ILKINDE oluştur, sonra hep aynı referansı kullan
      if (!proxyTrackHistoryRef.current) {
        proxyTrackHistoryRef.current = () => {
          trackHistoryRef.current?.()
        }
      }

      // Proxy referansını al
      const proxyFn = proxyTrackHistoryRef.current

      // Proxy'yi canvas'a kaydet (undo/redo için)
      ;(canvas as any).__trackHistory = proxyFn

      // Proxy'yi event listener olarak ekle
      canvas.on('object:modified', proxyFn)
      canvas.on('object:added', proxyFn)
      canvas.on('object:removed', proxyFn)

      console.log('✅ Event listeners attached to canvas')

      // NOT: Initial save YAPILMIYOR çünkü:
      // 1. Canvas henüz boş olabilir
      // 2. Görsel loadImage() ile yüklenince object:added eventi otomatik tetiklenecek
      // 3. O zaman trackHistory otomatik çağrılacak

      return () => {
        if (proxyTrackHistoryRef.current) {
          canvas.off('object:modified', proxyTrackHistoryRef.current)
          canvas.off('object:added', proxyTrackHistoryRef.current)
          canvas.off('object:removed', proxyTrackHistoryRef.current)
        }
      }
    }, [editor]) // onHistoryChange dependency kaldırıldı!

    // Space tuşu ile pan mode (Photoshop gibi)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Input elementinde yazarken çalışmasın
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

        if (e.code === 'Space' && !isSpacePressed) {
          e.preventDefault()
          setIsSpacePressed(true)
        }
      }

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
          e.preventDefault()
          setIsSpacePressed(false)
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp)

      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
      }
    }, [isSpacePressed])

    // DOM-based pan - Canvas element'ini CSS transform ile hareket ettir
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
      const isPanMode = isSpacePressed || activeTool === 'pan'
      if (!isPanMode) return

      e.preventDefault()
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      console.log('🟢 PAN BAŞLADI')
    }

    useEffect(() => {
      if (!isDragging) return

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStartRef.current.x
        const deltaY = e.clientY - dragStartRef.current.y

        const newOffset = {
          x: lastOffsetRef.current.x + deltaX,
          y: lastOffsetRef.current.y + deltaY
        }

        setCanvasOffset(newOffset)
        console.log(`🔵 CANVAS HAREKET EDİYOR: x=${newOffset.x}, y=${newOffset.y}`)
      }

      const handleMouseUp = () => {
        // Son pozisyonu kaydet
        lastOffsetRef.current = canvasOffset
        setIsDragging(false)
        console.log('🔴 PAN DURDU - Son pozisyon:', canvasOffset)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }, [isDragging, canvasOffset])

    // Pan mode'da objeleri kilitle ve cursor'u değiştir
    useEffect(() => {
      if (!editor || !editor.canvas) return

      const canvas = editor.canvas
      const isPanMode = isSpacePressed || activeTool === 'pan'

      if (isPanMode) {
        canvas.selection = false
        canvas.discardActiveObject()
        canvas.defaultCursor = 'grab'
        canvas.hoverCursor = 'grab'

        // Tüm objeleri seçilemez yap
        canvas.forEachObject((obj: any) => {
          obj.selectable = false
          obj.evented = false
        })
      } else {
        canvas.selection = true
        canvas.defaultCursor = 'default'
        canvas.hoverCursor = 'move'

        // Tüm objeleri tekrar seçilebilir yap
        canvas.forEachObject((obj: any) => {
          obj.selectable = true
          obj.evented = true
        })
      }

      canvas.renderAll()
    }, [isSpacePressed, activeTool, editor])

    const loadImage = (url: string) => {
      console.log('=== loadImage called ===')
      console.log('URL:', url)
      console.log('Editor exists:', !!editor)
      console.log('Canvas exists:', !!editor?.canvas)
      console.log('Fabric exists:', !!window.fabric)

      if (!editor || !editor.canvas || !window.fabric) {
        console.error('❌ Prerequisites missing!')
        return
      }

      console.log('✅ Starting image load...')

      // Native Image kullanarak yükle
      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🖼️  IMAGE LOAD DEBUG INFO')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📏 Native Image (gerçek dosya boyutu):')
        console.log('   naturalWidth:', img.naturalWidth)
        console.log('   naturalHeight:', img.naturalHeight)
        console.log('📐 Display boyutu (scaled olabilir):')
        console.log('   width:', img.width)
        console.log('   height:', img.height)

        if (!editor || !editor.canvas) {
          console.error('❌ Canvas not ready in callback')
          return
        }

        try {
          // GERÇEK görsel boyutlarını kullan (naturalWidth/naturalHeight)
          const imageWidth = img.naturalWidth
          const imageHeight = img.naturalHeight

          console.log('✅ Görsel gerçek boyutu:', imageWidth, 'x', imageHeight)

          // Canvas'ı görselin tam boyutuna ayarla
          editor.canvas.setWidth(imageWidth)
          editor.canvas.setHeight(imageHeight)
          editor.canvas.backgroundColor = '#ffffff'

          // Orijinal canvas boyutunu kaydet
          originalCanvasSizeRef.current = { width: imageWidth, height: imageHeight }

          // Canvas resize edildi flag'ini set et
          canvasResizedRef.current = true

          // Fabric Image'i oluştur
          const fabricImg = new window.fabric.Image(img, {
            crossOrigin: 'anonymous'
          })

          // ZORLA görsel boyutunu canvas boyutuna eşitle
          fabricImg.width = imageWidth
          fabricImg.height = imageHeight
          fabricImg.scaleX = 1
          fabricImg.scaleY = 1
          fabricImg.left = 0
          fabricImg.top = 0
          fabricImg.selectable = true
          fabricImg.evented = true
          fabricImg.name = 'Background Image'

          // ======================================
          // HISTORY TRACKING'I GEÇİCİ OLARAK KAPAT
          // ======================================
          console.log('⏸️ Pausing history tracking for loadImage')
          isLoadingHistoryRef.current = true

          const trackHistoryFn = (editor.canvas as any).__trackHistory
          if (trackHistoryFn) {
            editor.canvas.off('object:modified', trackHistoryFn)
            editor.canvas.off('object:added', trackHistoryFn)
            editor.canvas.off('object:removed', trackHistoryFn)
          }

          // Canvas'ı temizle ve görseli ekle
          editor.canvas.clear()
          editor.canvas.add(fabricImg)
          editor.canvas.setActiveObject(fabricImg)
          editor.canvas.renderAll()

          console.log('✅✅✅ Görsel canvas\'a eklendi!')
          console.log('   Görsel boyutu:', imageWidth, 'x', imageHeight)
          console.log('   Canvas boyutu:', editor.canvas.getWidth(), 'x', editor.canvas.getHeight())

          // ======================================
          // EVENT LISTENER'LARI TEKRAR EKLE VE İLK STATE'İ KAYDET
          // ======================================
          setTimeout(() => {
            if (trackHistoryFn) {
              editor.canvas.on('object:modified', trackHistoryFn)
              editor.canvas.on('object:added', trackHistoryFn)
              editor.canvas.on('object:removed', trackHistoryFn)
            }

            // Flag'i kapat
            isLoadingHistoryRef.current = false

            // History'yi sıfırla ve ilk state'i kaydet
            historyRef.current = []
            historyIndexRef.current = -1

            console.log('💾 Saving initial state after loadImage')
            trackHistoryFn?.()

            console.log('▶️ History tracking resumed')
          }, 100)

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

          // Canvas'ı alana sığdır ve HTML element boyutunu zoom'a göre ayarla
          fitToViewport()

        } catch (err) {
          console.error('❌ Error creating Fabric image:', err)
        }
      }

      img.onerror = (err) => {
        console.error('❌ Native image load failed:', err)
        console.error('URL:', url)
      }

      console.log('Setting image src to:', url)
      img.src = url
    }

    // Add image as new layer (without clearing canvas)
    const addImage = (url: string, position?: { x: number; y: number }) => {
      console.log('🖼️ addImage called - Adding as new layer')
      console.log('URL:', url)

      if (!editor || !editor.canvas || !window.fabric) {
        console.error('❌ Prerequisites missing!')
        return
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        console.log('✅ Image loaded for new layer')

        if (!editor || !editor.canvas) return

        try {
          const fabricImg = new window.fabric.Image(img, {
            crossOrigin: 'anonymous'
          })

          // Görseli uygun boyuta scale et (max 500px)
          const maxSize = 500
          let scale = 1

          if (fabricImg.width > maxSize || fabricImg.height > maxSize) {
            scale = Math.min(maxSize / fabricImg.width, maxSize / fabricImg.height)
          }

          fabricImg.scale(scale)

          // Pozisyon belirle
          const left = position?.x || (editor.canvas.width / 2 - (fabricImg.width * scale) / 2)
          const top = position?.y || (editor.canvas.height / 2 - (fabricImg.height * scale) / 2)

          fabricImg.set({
            left,
            top,
            selectable: true,
            evented: true
          })

          // Yeni layer olarak ekle (clear YAPMA!)
          editor.canvas.add(fabricImg)
          editor.canvas.setActiveObject(fabricImg)
          editor.canvas.renderAll()

          console.log('✅✅✅ Image added as new layer successfully! ✅✅✅')
        } catch (err) {
          console.error('❌ Error adding image layer:', err)
        }
      }

      img.onerror = (err) => {
        console.error('❌ Image load failed:', err)
      }

      img.src = url
    }

    const createBlank = (width: number, height: number, bgColor: string) => {
      if (!editor || !editor.canvas) return

      console.log('Creating blank canvas:', width, 'x', height, bgColor)

      // ======================================
      // HISTORY TRACKING'I GEÇİCİ OLARAK KAPAT
      // ======================================
      console.log('⏸️ Pausing history tracking for createBlank')
      isLoadingHistoryRef.current = true

      const trackHistoryFn = (editor.canvas as any).__trackHistory
      if (trackHistoryFn) {
        editor.canvas.off('object:modified', trackHistoryFn)
        editor.canvas.off('object:added', trackHistoryFn)
        editor.canvas.off('object:removed', trackHistoryFn)
      }

      // Canvas'ı istenen gerçek boyutta oluştur (physical scaling YOK)
      editor.canvas.clear()
      editor.canvas.setWidth(width)
      editor.canvas.setHeight(height)

      // bgColor gradient de olabilir (Instagram için)
      if (bgColor.startsWith('linear-gradient')) {
        // Gradient ise, rectangle olarak ekle
        const rect = new window.fabric.Rect({
          left: 0,
          top: 0,
          width: width,
          height: height,
          fill: new window.fabric.Gradient({
            type: 'linear',
            coords: { x1: 0, y1: 0, x2: width, y2: height },
            colorStops: [
              { offset: 0, color: '#f09433' },
              { offset: 0.25, color: '#e6683c' },
              { offset: 0.5, color: '#dc2743' },
              { offset: 0.75, color: '#cc2366' },
              { offset: 1, color: '#bc1888' }
            ]
          }),
          selectable: false,
          evented: false
        })
        editor.canvas.add(rect)
        editor.canvas.sendObjectToBack(rect)
        editor.canvas.backgroundColor = '#ffffff'
      } else {
        editor.canvas.backgroundColor = bgColor
      }

      editor.canvas.renderAll()

      // Orijinal canvas boyutunu kaydet (zoom = 1 için)
      originalCanvasSizeRef.current = { width, height }

      // Canvas resize edildi olarak işaretle (800x600 default'a dönmesin)
      canvasResizedRef.current = true

      console.log('✅ Blank canvas created at:', width, 'x', height)

      // ======================================
      // EVENT LISTENER'LARI TEKRAR EKLE VE HISTORY'Yİ SIFIRLA
      // ======================================
      setTimeout(() => {
        if (trackHistoryFn) {
          editor.canvas.on('object:modified', trackHistoryFn)
          editor.canvas.on('object:added', trackHistoryFn)
          editor.canvas.on('object:removed', trackHistoryFn)
        }

        // Flag'i kapat
        isLoadingHistoryRef.current = false

        // History'yi sıfırla (boş canvas için initial save YAPMA)
        historyRef.current = []
        historyIndexRef.current = -1

        console.log('▶️ History tracking resumed (blank canvas - no initial save)')
      }, 100)

      // Viewport'a sığdır (retry mekanizması ile)
      fitToViewport()
    }

    const loadTemplate = (data: any) => {
      console.log('🎨 loadTemplate called with:', data)
      console.log('📏 Template size:', data.width, 'x', data.height)
      createBlank(data.width, data.height, data.bgColor)
    }

    const exportImage = (format: 'png' | 'jpeg' | 'webp'): string => {
      if (!editor || !editor.canvas) return ''
      return editor.canvas.toDataURL({ format, quality: 1, multiplier: 1 })
    }

    const addText = () => {
      if (!editor || !editor.canvas || !window.fabric) return

      // Drawing mode'u kapat
      editor.canvas.isDrawingMode = false

      // Textbox kullan - textAlign için width şart
      const text = new window.fabric.Textbox('Metninizi yazın', {
        left: 100,
        top: 100,
        fontFamily: 'Arial',
        fontSize: 40,
        fill: '#000000',
        editable: true,
        width: 600,
        textAlign: 'left',
      })

      editor.canvas.add(text)
      editor.canvas.setActiveObject(text)
      editor.canvas.renderAll()

      // Editing moduna gir - focus trap artık olmadığı için çalışacak
      setTimeout(() => {
        text.enterEditing()
        text.selectAll()
        console.log('✅ Text editing mode activated - keyboard ready!')
      }, 50)
    }

    const addRect = () => {
      if (!editor || !editor.canvas || !window.fabric) return

      const rect = new window.fabric.Rect({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        fill: '#3b82f6',
        stroke: '#1e40af',
        strokeWidth: 2,
      })

      editor.canvas.add(rect)
      editor.canvas.setActiveObject(rect)
      editor.canvas.renderAll()
    }

    const addCircle = () => {
      if (!editor || !editor.canvas || !window.fabric) return

      const circle = new window.fabric.Circle({
        left: 100,
        top: 100,
        radius: 75,
        fill: '#10b981',
        stroke: '#059669',
        strokeWidth: 2,
      })

      editor.canvas.add(circle)
      editor.canvas.setActiveObject(circle)
      editor.canvas.renderAll()
    }

    const addTriangle = () => {
      if (!editor || !editor.canvas || !window.fabric) return

      const triangle = new window.fabric.Triangle({
        left: 100,
        top: 100,
        width: 150,
        height: 130,
        fill: '#f59e0b',
        stroke: '#d97706',
        strokeWidth: 2,
      })

      editor.canvas.add(triangle)
      editor.canvas.setActiveObject(triangle)
      editor.canvas.renderAll()
    }

    const addStar = () => {
      if (!editor || !editor.canvas || !window.fabric) return

      // Create a 5-pointed star
      const points = []
      const numPoints = 5
      const outerRadius = 75
      const innerRadius = 30

      for (let i = 0; i < numPoints * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius
        const angle = (Math.PI * i) / numPoints - Math.PI / 2
        points.push({
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle)
        })
      }

      const star = new window.fabric.Polygon(points, {
        left: 150,
        top: 150,
        fill: '#fbbf24',
        stroke: '#f59e0b',
        strokeWidth: 2,
      })

      editor.canvas.add(star)
      editor.canvas.setActiveObject(star)
      editor.canvas.renderAll()
    }

    const addLine = () => {
      if (!editor || !editor.canvas || !window.fabric) return

      const line = new window.fabric.Line([50, 100, 250, 100], {
        stroke: '#ef4444',
        strokeWidth: 3,
      })

      editor.canvas.add(line)
      editor.canvas.setActiveObject(line)
      editor.canvas.renderAll()
    }

    const addArrow = () => {
      if (!editor || !editor.canvas || !window.fabric) return

      // Create arrow with line and triangle head
      const line = new window.fabric.Line([50, 100, 200, 100], {
        stroke: '#8b5cf6',
        strokeWidth: 3,
      })

      const triangle = new window.fabric.Triangle({
        left: 200,
        top: 100,
        width: 20,
        height: 20,
        fill: '#8b5cf6',
        stroke: '#8b5cf6',
        angle: 90,
        originX: 'center',
        originY: 'center',
      })

      const group = new window.fabric.Group([line, triangle], {
        left: 100,
        top: 100,
      })

      editor.canvas.add(group)
      editor.canvas.setActiveObject(group)
      editor.canvas.renderAll()
    }

    const rotateObject = (angle: number) => {
      if (!editor || !editor.canvas) return
      const activeObject = editor.canvas.getActiveObject()
      if (activeObject) {
        activeObject.rotate((activeObject.angle || 0) + angle)
        editor.canvas.renderAll()
      }
    }

    const applyFilter = (filterType: string, value: number) => {
      if (!editor || !editor.canvas || !window.fabric) return

      const activeObject = editor.canvas.getActiveObject()
      if (!activeObject || !activeObject.filters) return

      // Filter index mapping
      const filterMap: { [key: string]: number } = {
        brightness: 0,
        contrast: 1,
        saturation: 2,
        blur: 3,
        grayscale: 4,
        sepia: 5,
        invert: 6
      }

      const filterIndex = filterMap[filterType]
      if (filterIndex === undefined) return

      // Clear existing filter at this index
      activeObject.filters[filterIndex] = null

      // Apply new filter based on type
      switch (filterType) {
        case 'brightness':
          if (value !== 0) {
            activeObject.filters[filterIndex] = new window.fabric.Image.filters.Brightness({
              brightness: value
            })
          }
          break

        case 'contrast':
          if (value !== 0) {
            activeObject.filters[filterIndex] = new window.fabric.Image.filters.Contrast({
              contrast: value
            })
          }
          break

        case 'saturation':
          if (value !== 0) {
            activeObject.filters[filterIndex] = new window.fabric.Image.filters.Saturation({
              saturation: value
            })
          }
          break

        case 'blur':
          if (value > 0) {
            activeObject.filters[filterIndex] = new window.fabric.Image.filters.Blur({
              blur: value
            })
          }
          break

        case 'grayscale':
          // Grayscale is a toggle filter
          activeObject.filters[filterIndex] = new window.fabric.Image.filters.Grayscale()
          break

        case 'sepia':
          // Sepia is a toggle filter
          activeObject.filters[filterIndex] = new window.fabric.Image.filters.Sepia()
          break

        case 'invert':
          // Invert is a toggle filter
          activeObject.filters[filterIndex] = new window.fabric.Image.filters.Invert()
          break
      }

      // Apply filters and render
      activeObject.applyFilters()
      editor.canvas.renderAll()
    }

    const cropImage = () => {
      if (!editor || !editor.canvas || !window.fabric) return

      const canvas = editor.canvas
      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()

      // Canvas'ın tamamını kaplayan kırpma alanı oluştur (biraz kenarlık bırak)
      const margin = Math.min(canvasWidth, canvasHeight) * 0.1
      const cropRect = new window.fabric.Rect({
        left: margin,
        top: margin,
        width: canvasWidth - (margin * 2),
        height: canvasHeight - (margin * 2),
        fill: 'rgba(0,0,0,0.3)',
        stroke: '#00ff00',
        strokeWidth: 3,
        strokeDashArray: [10, 5],
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockRotation: true,
        cornerColor: '#00ff00',
        cornerSize: 12,
        transparentCorners: false,
        name: 'cropRect'
      })

      // Tüm objeleri seçilemez yap, sadece crop rect seçilebilsin
      canvas.forEachObject((obj: any) => {
        if (obj.name !== 'cropRect') {
          obj.selectable = false
          obj.evented = false
        }
      })

      canvas.add(cropRect)
      canvas.setActiveObject(cropRect)
      canvas.renderAll()

      // Crop mode'u aktifleştir
      ;(canvas as any)._cropMode = true
      ;(canvas as any)._cropRect = cropRect

      // İlk boyutları set et
      const updateCropDimensions = () => {
        const width = Math.round(cropRect.width * cropRect.scaleX)
        const height = Math.round(cropRect.height * cropRect.scaleY)
        const zoom = canvas.getZoom()

        // Crop rectangle'ın sağ alt köşesini hesapla (canvas koordinatlarında)
        const rectRight = cropRect.left + (cropRect.width * cropRect.scaleX)
        const rectBottom = cropRect.top + (cropRect.height * cropRect.scaleY)

        setCropDimensions({
          width,
          height,
          left: rectRight * zoom,
          top: rectBottom * zoom
        })
      }

      updateCropDimensions()

      // Event listener'lar ekle - her değişiklikte boyutları güncelle
      const handleCropChange = () => {
        updateCropDimensions()
      }

      cropRect.on('scaling', handleCropChange)
      cropRect.on('moving', handleCropChange)
      cropRect.on('modified', handleCropChange)

      // Cleanup için event listener'ları sakla
      ;(canvas as any)._cropUpdateHandler = updateCropDimensions

      console.log('✅ Kırpma modu aktif - Alanı ayarlayın, sonra Kırpmayı Uygula\'ya basın')
    }

    const applyCrop = () => {
      if (!editor || !editor.canvas) return

      const canvas = editor.canvas
      const cropRect = (canvas as any)._cropRect

      if (!cropRect) {
        console.log('Kırpma modu aktif değil')
        return
      }

      // Crop rectangle'ın gerçek boyutlarını al (scale dahil) ve yuvarla
      const cropLeft = Math.round(cropRect.left)
      const cropTop = Math.round(cropRect.top)
      const cropWidth = Math.round(cropRect.width * cropRect.scaleX)
      const cropHeight = Math.round(cropRect.height * cropRect.scaleY)

      console.log('🔪 Kırpma uygulanıyor:', cropWidth, 'x', cropHeight)

      // ======================================
      // HISTORY TRACKING'I GEÇİCİ OLARAK KAPAT
      // ======================================
      console.log('⏸️ Pausing history tracking for crop')
      isLoadingHistoryRef.current = true

      const trackHistoryFn = (canvas as any).__trackHistory
      if (trackHistoryFn) {
        canvas.off('object:modified', trackHistoryFn)
        canvas.off('object:added', trackHistoryFn)
        canvas.off('object:removed', trackHistoryFn)
      }

      // Mevcut zoom seviyesini kaydet
      const currentZoom = canvas.getZoom()

      // Tüm objeleri crop area'ya göre yeniden konumlandır
      const objectsToKeep: any[] = []
      canvas.forEachObject((obj: any) => {
        if (obj.name === 'cropRect') return // Crop rect'i atla

        // Objenin yeni pozisyonunu hesapla
        obj.left -= cropLeft
        obj.top -= cropTop

        // Obje crop alanı içindeyse sakla
        objectsToKeep.push(obj)
      })

      // Canvas'ı temizle
      canvas.clear()

      // Canvas boyutunu crop area boyutuna değiştir
      canvas.setWidth(cropWidth)
      canvas.setHeight(cropHeight)
      canvas.backgroundColor = '#ffffff'

      // Orijinal canvas boyutunu güncelle (zoom = 1 için)
      originalCanvasSizeRef.current = { width: cropWidth, height: cropHeight }

      // Objeleri tekrar ekle
      objectsToKeep.forEach(obj => {
        obj.selectable = true
        obj.evented = true
        canvas.add(obj)
      })

      // Zoom'u yeniden uygula
      updateCanvasDimensions(currentZoom)

      canvas.renderAll()

      // Crop mode'u kapat
      delete (canvas as any)._cropMode
      delete (canvas as any)._cropRect
      delete (canvas as any)._cropUpdateHandler

      // Crop dimensions state'ini sıfırla
      setCropDimensions({ width: 0, height: 0, left: 0, top: 0 })

      console.log('✅ Kırpma uygulandı - Yeni canvas boyutu:', cropWidth, 'x', cropHeight)

      // ======================================
      // EVENT LISTENER'LARI TEKRAR EKLE VE CROP STATE'İNİ KAYDET
      // ======================================
      setTimeout(() => {
        if (trackHistoryFn) {
          canvas.on('object:modified', trackHistoryFn)
          canvas.on('object:added', trackHistoryFn)
          canvas.on('object:removed', trackHistoryFn)
        }

        // Flag'i kapat
        isLoadingHistoryRef.current = false

        // Crop sonrası state'i kaydet
        console.log('💾 Saving state after crop')
        trackHistoryFn?.()

        console.log('▶️ History tracking resumed after crop')
      }, 100)

      // Canvas bilgisini güncelle (parent'a event gönder)
      window.dispatchEvent(new CustomEvent('canvas-crop-applied', {
        detail: { width: cropWidth, height: cropHeight }
      }))
    }

    const cancelCrop = () => {
      if (!editor || !editor.canvas) return

      const canvas = editor.canvas
      const cropRect = (canvas as any)._cropRect

      if (cropRect) {
        canvas.remove(cropRect)
      }

      // Tüm objeleri tekrar seçilebilir yap
      canvas.forEachObject((obj: any) => {
        obj.selectable = true
        obj.evented = true
      })

      canvas.discardActiveObject()
      canvas.renderAll()

      // Crop mode'u kapat
      delete (canvas as any)._cropMode
      delete (canvas as any)._cropRect
      delete (canvas as any)._cropUpdateHandler

      // Crop dimensions state'ini sıfırla
      setCropDimensions({ width: 0, height: 0, left: 0, top: 0 })

      console.log('✅ Kırpma iptal edildi')
    }

    const isCropMode = () => {
      return !!(editor?.canvas as any)?._cropMode
    }

    const undo = () => {
      console.log('↩️ UNDO called')

      if (historyIndexRef.current <= 0) return
      if (!editor?.canvas) return

      const currentCanvas = editor.canvas
      const trackHistoryFn = (currentCanvas as any).__trackHistory

      // SET FLAG BEFORE anything else
      isLoadingHistoryRef.current = true

      // REMOVE event listeners
      if (trackHistoryFn) {
        currentCanvas.off('object:modified', trackHistoryFn)
        currentCanvas.off('object:added', trackHistoryFn)
        currentCanvas.off('object:removed', trackHistoryFn)
      }

      historyIndexRef.current--
      const previousState = historyRef.current[historyIndexRef.current]

      console.log('📋 UNDO: Going to history index', historyIndexRef.current)
      console.log('📋 Previous state objects:', previousState?.objects?.length || 0)
      console.log('📋 Previous state:', JSON.stringify(previousState?.objects || []).substring(0, 200))

      if (!previousState) {
        isLoadingHistoryRef.current = false
        return
      }

      // Canvas'a flag ekle - LayerPanel ve diğer componentler için
      ;(currentCanvas as any)._isLoadingHistory = true

      // Canvas HTML element'i bul ve opacity azalt (smooth transition için)
      const canvasElement = currentCanvas.getElement()
      if (canvasElement) {
        canvasElement.style.transition = 'opacity 0.15s ease-in-out'
        canvasElement.style.opacity = '0.5'
      }

      currentCanvas.loadFromJSON(previousState, () => {
        currentCanvas.renderAll()

        setTimeout(() => {
          // RE-ADD event listeners
          if (trackHistoryFn) {
            currentCanvas.on('object:modified', trackHistoryFn)
            currentCanvas.on('object:added', trackHistoryFn)
            currentCanvas.on('object:removed', trackHistoryFn)
          }

          // CLEAR FLAGS
          isLoadingHistoryRef.current = false
          delete (currentCanvas as any)._isLoadingHistory

          currentCanvas.renderAll()

          // Opacity'yi geri yükselt
          if (canvasElement) {
            canvasElement.style.opacity = '1'
          }

          console.log('✅ UNDO: Done -', currentCanvas.getObjects().length, 'objects')
          onHistoryChange(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1)
        }, 50)
      })
    }

    const redo = () => {
      console.log('↪️ REDO called')

      if (historyIndexRef.current >= historyRef.current.length - 1) return
      if (!editor?.canvas) return

      const currentCanvas = editor.canvas
      const trackHistoryFn = (currentCanvas as any).__trackHistory

      // SET FLAG BEFORE anything else
      isLoadingHistoryRef.current = true

      // REMOVE event listeners
      if (trackHistoryFn) {
        currentCanvas.off('object:modified', trackHistoryFn)
        currentCanvas.off('object:added', trackHistoryFn)
        currentCanvas.off('object:removed', trackHistoryFn)
      }

      historyIndexRef.current++
      const nextState = historyRef.current[historyIndexRef.current]

      if (!nextState) {
        isLoadingHistoryRef.current = false
        return
      }

      // Canvas'a flag ekle - LayerPanel ve diğer componentler için
      ;(currentCanvas as any)._isLoadingHistory = true

      // Canvas HTML element'i bul ve opacity azalt (smooth transition için)
      const canvasElement = currentCanvas.getElement()
      if (canvasElement) {
        canvasElement.style.transition = 'opacity 0.15s ease-in-out'
        canvasElement.style.opacity = '0.5'
      }

      currentCanvas.loadFromJSON(nextState, () => {
        currentCanvas.renderAll()

        setTimeout(() => {
          // RE-ADD event listeners
          if (trackHistoryFn) {
            currentCanvas.on('object:modified', trackHistoryFn)
            currentCanvas.on('object:added', trackHistoryFn)
            currentCanvas.on('object:removed', trackHistoryFn)
          }

          // CLEAR FLAGS
          isLoadingHistoryRef.current = false
          delete (currentCanvas as any)._isLoadingHistory

          currentCanvas.renderAll()

          // Opacity'yi geri yükselt
          if (canvasElement) {
            canvasElement.style.opacity = '1'
          }

          console.log('✅ REDO: Done -', currentCanvas.getObjects().length, 'objects')
          onHistoryChange(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1)
        }, 50)
      })
    }

    const getCanvas = () => editor?.canvas

    useImperativeHandle(ref, () => ({
      loadImage,
      addImage,
      loadTemplate,
      createBlank,
      exportImage,
      undo,
      redo,
      getCanvas,
      addText,
      addRect,
      addCircle,
      addTriangle,
      addStar,
      addLine,
      addArrow,
      rotateObject,
      applyFilter,
      cropImage,
      applyCrop,
      cancelCrop,
      isCropMode,
      setBrushColor,
      setBrushWidth,
      setEraserMode,
      zoomIn,
      zoomOut,
      resetZoom,
      setZoom,
      getZoom,
      fitToViewport,
      getCanvasInfo,
      alignLeft,
      alignCenter,
      alignRight,
      alignTop,
      alignMiddle,
      alignBottom,
      bringToFront,
      sendToBack,
      setTextStroke,
      setTextShadow,
      updateTextProperty,
      removeBackground,
    }))

    // Drawing methods
    const setBrushColor = (color: string) => {
      if (!editor || !editor.canvas) return
      if (editor.canvas.freeDrawingBrush) {
        editor.canvas.freeDrawingBrush.color = color
      }
    }

    const setBrushWidth = (width: number) => {
      if (!editor || !editor.canvas) return
      if (editor.canvas.freeDrawingBrush) {
        editor.canvas.freeDrawingBrush.width = width
      }
    }

    const setEraserMode = (enabled: boolean) => {
      if (!editor || !editor.canvas || !window.fabric) return

      if (enabled) {
        // Eraser mode - white color with destination-out blend
        editor.canvas.isDrawingMode = true
        if (editor.canvas.freeDrawingBrush) {
          editor.canvas.freeDrawingBrush.color = '#ffffff'
          // Use EraserBrush if available, otherwise use PencilBrush with blend mode
          if (window.fabric.EraserBrush) {
            editor.canvas.freeDrawingBrush = new window.fabric.EraserBrush(editor.canvas)
          }
        }
      } else {
        // Back to normal drawing
        if (window.fabric.PencilBrush) {
          editor.canvas.freeDrawingBrush = new window.fabric.PencilBrush(editor.canvas)
          editor.canvas.freeDrawingBrush.color = '#000000'
          editor.canvas.freeDrawingBrush.width = 2
        }
      }
    }

    // NOTE: Keyboard shortcuts TAMAMEN KALDIRILDI
    // Text editing için engelleyici olduğundan tüm klavye kısayolları ImageEditorModal'a taşındı

    // Handle tool changes
    useEffect(() => {
      if (!editor || !editor.canvas || !window.fabric) return

      const canvas = editor.canvas

      switch (activeTool) {
        case 'draw':
          canvas.isDrawingMode = true
          // Initialize brush if not exists
          if (!canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush = new window.fabric.PencilBrush(canvas)
            canvas.freeDrawingBrush.color = '#000000'
            canvas.freeDrawingBrush.width = 2
          }
          break
        case 'crop':
          // Crop tool seçilince otomatik crop mode'u aç
          if (!isCropMode()) {
            cropImage()
          }
          break
        case 'transform':
          // Transform tool seçilince, eğer hiçbir obje seçili değilse background image'ı seç
          canvas.isDrawingMode = false
          if (isCropMode()) {
            cancelCrop()
          }

          // Eğer hiçbir obje seçili değilse, background image'ı seç
          const activeObj = canvas.getActiveObject()
          if (!activeObj) {
            const backgroundImage = canvas.getObjects().find((obj: any) => obj.name === 'Background Image')
            if (backgroundImage) {
              canvas.setActiveObject(backgroundImage)
              canvas.renderAll()
            }
          }
          break
        case 'bgremove':
          canvas.isDrawingMode = false
          if (isCropMode()) {
            cancelCrop()
          }

          // Eğer hiçbir obje seçili değilse, background image'ı seç
          const activeBgObj = canvas.getActiveObject()
          if (!activeBgObj) {
            const backgroundImage = canvas.getObjects().find((obj: any) => obj.name === 'Background Image')
            if (backgroundImage) {
              canvas.setActiveObject(backgroundImage)
              canvas.renderAll()
              // Manual olarak selection event'ini fire et
              canvas.fire('selection:created', { target: backgroundImage, selected: [backgroundImage] })
            }
          }
          console.log('🎨 Background Remove tool activated')
          break
        default:
          canvas.isDrawingMode = false
          // Crop mode aktifse ve farklı bir tool seçildiyse, crop'u iptal et
          if (isCropMode()) {
            cancelCrop()
          }
          break
      }
    }, [activeTool, editor])

    // Zoom & Pan functions
    const updateCanvasDimensions = (zoom: number) => {
      if (!editor || !editor.canvas) return

      const canvas = editor.canvas
      const originalWidth = originalCanvasSizeRef.current.width
      const originalHeight = originalCanvasSizeRef.current.height

      // Canvas HTML element boyutunu zoom'a göre ayarla
      const newWidth = Math.round(originalWidth * zoom)
      const newHeight = Math.round(originalHeight * zoom)

      canvas.setDimensions({ width: newWidth, height: newHeight })
      canvas.setZoom(zoom)
      canvas.renderAll()

      console.log(`🔍 Zoom: ${Math.round(zoom * 100)}% - Canvas HTML: ${newWidth}x${newHeight}`)
    }

    const zoomIn = () => {
      if (!editor || !editor.canvas) return
      const canvas = editor.canvas
      let zoom = canvas.getZoom()
      zoom = zoom * 1.1
      if (zoom > 5) zoom = 5 // Max zoom 500%

      updateCanvasDimensions(zoom)
      console.log('Zoom In:', Math.round(zoom * 100) + '%')
    }

    const zoomOut = () => {
      if (!editor || !editor.canvas) return
      const canvas = editor.canvas
      let zoom = canvas.getZoom()
      zoom = zoom / 1.1
      if (zoom < 0.1) zoom = 0.1 // Min zoom 10%

      updateCanvasDimensions(zoom)
      console.log('Zoom Out:', Math.round(zoom * 100) + '%')
    }

    const resetZoom = () => {
      if (!editor || !editor.canvas) return
      const zoom = 1

      updateCanvasDimensions(zoom)
      editor.canvas.viewportTransform = [1, 0, 0, 1, 0, 0]
      console.log('Zoom Reset: 100%')
    }

    const setZoom = (zoomLevel: number) => {
      if (!editor || !editor.canvas) return

      updateCanvasDimensions(zoomLevel)
      console.log('Zoom Set:', Math.round(zoomLevel * 100) + '%')
    }

    const getZoom = () => {
      if (!editor || !editor.canvas) return 100
      return Math.round(editor.canvas.getZoom() * 100)
    }

    const fitToViewport = (retryCount = 0): number => {
      if (!editor || !editor.canvas) return 1

      const canvas = editor.canvas
      // Orijinal canvas boyutunu kullan (zoom = 1 için)
      const canvasWidth = originalCanvasSizeRef.current.width
      const canvasHeight = originalCanvasSizeRef.current.height

      // Container ref'den GERÇEK boyutu al
      let viewportWidth = 0
      let viewportHeight = 0

      if (containerRef.current) {
        viewportWidth = containerRef.current.clientWidth
        viewportHeight = containerRef.current.clientHeight
      }

      // Container boyutu henüz hazır değilse, biraz bekle ve tekrar dene
      if ((viewportWidth === 0 || viewportHeight === 0) && retryCount < 10) {
        console.log(`⏳ Container not ready yet, retry ${retryCount + 1}/10...`)
        setTimeout(() => {
          fitToViewport(retryCount + 1)
        }, 100)
        return 1
      }

      // Hala boyut alınamadıysa varsayılan kullan
      if (viewportWidth === 0 || viewportHeight === 0) {
        console.warn('⚠️ Container size still 0, using window size')
        viewportWidth = window.innerWidth - 500
        viewportHeight = window.innerHeight - 200
      }

      console.log(`📦 Container size: ${viewportWidth}x${viewportHeight}`)

      // %85 sığdır (kenarlardan biraz boşluk bırak)
      const safeWidth = viewportWidth * 0.85
      const safeHeight = viewportHeight * 0.85

      // Sığdırma için gerekli zoom oranını hesapla
      const scaleX = safeWidth / canvasWidth
      const scaleY = safeHeight / canvasHeight
      const optimalZoom = Math.min(scaleX, scaleY, 1) // Max %100

      // updateCanvasDimensions ile zoom ve HTML element boyutunu güncelle
      updateCanvasDimensions(optimalZoom)

      const zoomedWidth = Math.round(canvasWidth * optimalZoom)
      const zoomedHeight = Math.round(canvasHeight * optimalZoom)

      console.log(`🔍 Photoshop-style fit: ${Math.round(optimalZoom * 100)}%`)
      console.log(`   Logical canvas: ${canvasWidth}x${canvasHeight}`)
      console.log(`   HTML element: ${zoomedWidth}x${zoomedHeight}`)
      console.log(`   Container: ${viewportWidth}x${viewportHeight}`)
      console.log(`   Safe area: ${Math.round(safeWidth)}x${Math.round(safeHeight)}`)

      // Parent'a zoom değişimini bildir
      window.dispatchEvent(new CustomEvent('canvas-zoom-changed', {
        detail: { zoom: Math.round(optimalZoom * 100) }
      }))

      return optimalZoom
    }

    const getCanvasInfo = () => {
      if (!editor || !editor.canvas) {
        return {
          canvasWidth: 0,
          canvasHeight: 0,
          imageWidth: 0,
          imageHeight: 0,
          zoom: 100
        }
      }

      const canvas = editor.canvas
      const backgroundImage = canvas.getObjects().find((obj: any) => obj.name === 'Background Image')

      return {
        canvasWidth: originalCanvasSizeRef.current.width,
        canvasHeight: originalCanvasSizeRef.current.height,
        imageWidth: backgroundImage ? Math.round(backgroundImage.width * backgroundImage.scaleX) : 0,
        imageHeight: backgroundImage ? Math.round(backgroundImage.height * backgroundImage.scaleY) : 0,
        zoom: Math.round(canvas.getZoom() * 100)
      }
    }

    // Alignment functions
    const alignLeft = () => {
      if (!editor || !editor.canvas) return
      const activeObject = editor.canvas.getActiveObject()
      if (!activeObject) return
      activeObject.set({ left: 0 })
      editor.canvas.renderAll()
    }

    const alignCenter = () => {
      if (!editor || !editor.canvas) return
      const activeObject = editor.canvas.getActiveObject()
      if (!activeObject) return
      activeObject.set({ left: (editor.canvas.width / 2) - ((activeObject.width * activeObject.scaleX) / 2) })
      editor.canvas.renderAll()
    }

    const alignRight = () => {
      if (!editor || !editor.canvas) return
      const activeObject = editor.canvas.getActiveObject()
      if (!activeObject) return
      activeObject.set({ left: editor.canvas.width - (activeObject.width * activeObject.scaleX) })
      editor.canvas.renderAll()
    }

    const alignTop = () => {
      if (!editor || !editor.canvas) return
      const activeObject = editor.canvas.getActiveObject()
      if (!activeObject) return
      activeObject.set({ top: 0 })
      editor.canvas.renderAll()
    }

    const alignMiddle = () => {
      if (!editor || !editor.canvas) return
      const activeObject = editor.canvas.getActiveObject()
      if (!activeObject) return
      activeObject.set({ top: (editor.canvas.height / 2) - ((activeObject.height * activeObject.scaleY) / 2) })
      editor.canvas.renderAll()
    }

    const alignBottom = () => {
      if (!editor || !editor.canvas) return
      const activeObject = editor.canvas.getActiveObject()
      if (!activeObject) return
      activeObject.set({ top: editor.canvas.height - (activeObject.height * activeObject.scaleY) })
      editor.canvas.renderAll()
    }

    const bringToFront = () => {
      if (!editor || !editor.canvas) return
      const activeObject = editor.canvas.getActiveObject()
      if (!activeObject) return
      editor.canvas.bringToFront(activeObject)
      editor.canvas.renderAll()
    }

    const sendToBack = () => {
      if (!editor || !editor.canvas) return
      const activeObject = editor.canvas.getActiveObject()
      if (!activeObject) return
      editor.canvas.sendToBack(activeObject)
      editor.canvas.renderAll()
    }

    // Text property methods
    const setTextStroke = (color: string, width: number) => {
      if (!editor || !editor.canvas) return
      const activeObject = editor.canvas.getActiveObject()
      if (!activeObject || activeObject.type !== 'i-text') return

      activeObject.set({
        stroke: color,
        strokeWidth: width
      })
      editor.canvas.renderAll()
    }

    const setTextShadow = (color: string, blur: number, offsetX: number, offsetY: number) => {
      if (!editor || !editor.canvas) return
      const activeObject = editor.canvas.getActiveObject()
      if (!activeObject || activeObject.type !== 'i-text') return

      activeObject.set({
        shadow: new window.fabric.Shadow({
          color: color,
          blur: blur,
          offsetX: offsetX,
          offsetY: offsetY
        })
      })
      editor.canvas.renderAll()
    }

    const updateTextProperty = (property: string, value: any) => {
      if (!editor || !editor.canvas) return
      const activeObject = editor.canvas.getActiveObject()
      if (!activeObject || activeObject.type !== 'i-text') return

      activeObject.set({ [property]: value })
      editor.canvas.renderAll()
    }

    const removeBackground = async () => {
      if (!editor || !editor.canvas) return

      const activeObject = editor.canvas.getActiveObject()

      // Check if we should work with canvas background or selected object
      let isCanvasBackground = false
      let targetObject: any = null

      if (!activeObject || activeObject.type !== 'image') {
        // Check if canvas has a background image
        const bgImage = editor.canvas.backgroundImage as any
        if (bgImage && bgImage._element) {
          console.log('🖼️ No image selected, using canvas background image')
          isCanvasBackground = true
          targetObject = bgImage
        } else {
          console.error('No image selected and no canvas background image')
          return
        }
      } else {
        targetObject = activeObject
      }

      try {
        console.log('🎨 Starting background removal...')
        console.log('⏰ Timestamp:', new Date().toISOString())
        console.log('📌 Target:', isCanvasBackground ? 'Canvas Background' : 'Selected Image')

        // Get the image element from the fabric object
        const imgElement = (targetObject as any)._element

        if (!imgElement) {
          console.error('No image element found')
          return
        }

        console.log('📸 Image element:', imgElement)
        console.log('   src:', imgElement.src?.substring(0, 100) + '...')
        console.log('   width:', imgElement.width, 'height:', imgElement.height)
        console.log('   naturalWidth:', imgElement.naturalWidth, 'naturalHeight:', imgElement.naturalHeight)

        // Convert image to blob first
        console.log('🔄 Step 1/4: Creating canvas...')
        const canvas = document.createElement('canvas')
        canvas.width = imgElement.naturalWidth || imgElement.width
        canvas.height = imgElement.naturalHeight || imgElement.height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          throw new Error('Could not get canvas context')
        }

        ctx.drawImage(imgElement, 0, 0)

        // Convert to blob
        console.log('🔄 Step 2/4: Converting to blob...')
        const imageBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Failed to create blob'))
          }, 'image/png')
        })

        console.log('✅ Blob created:', imageBlob.size, 'bytes', '(' + (imageBlob.size / 1024 / 1024).toFixed(2) + ' MB)')

        // Remove background using backend proxy
        console.log('🔄 Step 3/4: Sending to backend API...')
        const startTime = Date.now()

        const formData = new FormData()
        formData.append('image', imageBlob, 'image.png')

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const response = await fetch(`${apiUrl}/api/removebg/remove-background`, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('❌ Backend API error:', response.status, errorData)
          throw new Error(`Background removal failed: ${errorData.error || response.statusText}`)
        }

        console.log('🔄 Step 4/4: Processing response...')
        const resultBlob = await response.blob()

        const elapsed = Date.now() - startTime
        console.log('✅ Background removed in', elapsed, 'ms', '(' + (elapsed / 1000).toFixed(1) + ' seconds)')
        console.log('✅ Result blob:', resultBlob.size, 'bytes', '(' + (resultBlob.size / 1024 / 1024).toFixed(2) + ' MB)')

        // Create object URL from blob
        const objectUrl = URL.createObjectURL(resultBlob)
        console.log('🖼️ Loading new image to canvas from object URL...')

        // Load HTMLImageElement first
        const newImgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            console.log('✅ Image loaded successfully:', img.width, 'x', img.height)
            resolve(img)
          }
          img.onerror = (error) => {
            console.error('❌ Image load error:', error)
            URL.revokeObjectURL(objectUrl)
            reject(new Error('Failed to load image'))
          }
          img.src = objectUrl
        })

        // Create Fabric image from HTMLImageElement (NOT from URL!)
        console.log('🔄 Creating Fabric.js image from HTMLImageElement...')

        if (isCanvasBackground) {
          // For canvas background, just replace it
          console.log('🖼️ Replacing canvas background image...')

          const fabricImage = new window.fabric.Image(newImgElement, {
            scaleX: targetObject.scaleX,
            scaleY: targetObject.scaleY,
          })

          editor.canvas.setBackgroundImage(fabricImage, editor.canvas.renderAll.bind(editor.canvas), {
            scaleX: targetObject.scaleX,
            scaleY: targetObject.scaleY,
          })

          // Clean up object URL
          URL.revokeObjectURL(objectUrl)

          console.log('✅✅✅ BAŞARILI! Canvas arka planı temizlendi!')
        } else {
          // For regular image objects
          // Calculate displayed dimensions of old image
          const oldWidth = targetObject.width * targetObject.scaleX
          const oldHeight = targetObject.height * targetObject.scaleY

          console.log('📏 Old image displayed size:', oldWidth, 'x', oldHeight)
          console.log('📏 New image natural size:', newImgElement.width, 'x', newImgElement.height)

          // Calculate new scale to maintain displayed size
          const newScaleX = oldWidth / newImgElement.width
          const newScaleY = oldHeight / newImgElement.height

          console.log('📐 Calculated new scale:', newScaleX, 'x', newScaleY)

          const fabricImage = new window.fabric.Image(newImgElement, {
            left: targetObject.left,
            top: targetObject.top,
            scaleX: newScaleX,
            scaleY: newScaleY,
            angle: targetObject.angle,
            opacity: targetObject.opacity,
            originX: targetObject.originX,
            originY: targetObject.originY,
            name: targetObject.name || 'Background Removed Image',
          })

          console.log('✅ Fabric image created:', fabricImage.width, 'x', fabricImage.height)
          console.log('🔄 Removing old image and adding new one...')
          console.log('   Old image:', targetObject.name, targetObject.type)
          console.log('   Canvas objects before:', editor.canvas.getObjects().length)

          // Remove old image
          editor.canvas.remove(targetObject)

          // Add new image to canvas
          editor.canvas.add(fabricImage)

          // Update coordinates
          fabricImage.setCoords()

          // Select new image
          editor.canvas.setActiveObject(fabricImage)

          // Force render
          editor.canvas.renderAll()

          // Clean up object URL
          URL.revokeObjectURL(objectUrl)

          console.log('   Canvas objects after:', editor.canvas.getObjects().length)
          console.log('   New image position:', fabricImage.left, fabricImage.top)
          console.log('   New image scale:', fabricImage.scaleX, fabricImage.scaleY)
          console.log('   New image displayed size:', fabricImage.width * fabricImage.scaleX, 'x', fabricImage.height * fabricImage.scaleY)
          console.log('✅✅✅ BAŞARILI! Arka plan temizlendi ve canvas güncellendi!')
        }
      } catch (error) {
        console.error('❌ Background removal failed:', error)
        throw error
      }
    }

    // Mouse wheel zoom
    useEffect(() => {
      if (!editor || !editor.canvas) return

      const canvas = editor.canvas

      const handleMouseWheel = (opt: any) => {
        const e = opt.e
        if (!e.ctrlKey && !e.metaKey) return // Only zoom with Ctrl/Cmd + wheel

        e.preventDefault()
        e.stopPropagation()

        const delta = e.deltaY
        let zoom = canvas.getZoom()
        zoom *= 0.999 ** delta

        if (zoom > 5) zoom = 5
        if (zoom < 0.1) zoom = 0.1

        canvas.setZoom(zoom)
        canvas.renderAll()
      }

      canvas.on('mouse:wheel', handleMouseWheel)

      return () => {
        canvas.off('mouse:wheel', handleMouseWheel)
      }
    }, [editor])

    // Drag & Drop handlers
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      console.log('🎯 File(s) dropped on canvas')

      const files = Array.from(e.dataTransfer.files)
      const imageFiles = files.filter(file => file.type.startsWith('image/'))

      if (imageFiles.length === 0) {
        console.log('No image files dropped')
        return
      }

      console.log(`📁 ${imageFiles.length} image file(s) dropped`)

      // Get drop position relative to canvas
      const canvasElement = editor?.canvas?.getElement()
      if (!canvasElement) return

      const rect = canvasElement.getBoundingClientRect()
      const dropX = e.clientX - rect.left
      const dropY = e.clientY - rect.top

      // Load each image
      imageFiles.forEach((file, index) => {
        // File validation
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          console.warn(`File ${file.name} too large (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
          return
        }

        const reader = new FileReader()

        reader.onload = (event) => {
          const imageUrl = event.target?.result as string
          if (imageUrl) {
            // Offset each image slightly if multiple files
            const offsetX = index * 20
            const offsetY = index * 20
            addImage(imageUrl, { x: dropX + offsetX, y: dropY + offsetY })
          }
        }

        reader.readAsDataURL(file)
      })
    }

    const isPanMode = isSpacePressed || activeTool === 'pan'

    console.log(`🟢 RENDER: activeTool=${activeTool}, isSpacePressed=${isSpacePressed}, isPanMode=${isPanMode}`)

    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div
          className="relative"
          style={{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
            cursor: (isSpacePressed || activeTool === 'pan') ? (isDragging ? 'grabbing' : 'grab') : 'default',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
          onMouseDown={handleCanvasMouseDown}
        >
          <FabricJSCanvas className="border border-gray-300" onReady={onReady} />

          {/* Crop dimensions overlay - Crop rectangle'ın sağ alt köşesinde */}
          {cropDimensions.width > 0 && (
            <div
              className="absolute bg-green-500 text-white px-3 py-1.5 rounded text-sm font-mono font-semibold shadow-lg pointer-events-none"
              style={{
                left: `${cropDimensions.left}px`,
                top: `${cropDimensions.top + 5}px`,
                transform: 'translateX(-100%)'
              }}
            >
              {cropDimensions.width} × {cropDimensions.height}px
            </div>
          )}
        </div>
      </div>
    )
  }
)

ImageCanvas.displayName = 'ImageCanvas'

export default ImageCanvas
