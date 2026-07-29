'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export type SignatureCanvasHandle = {
  clear: () => void
  toDataURL: () => string | null
  isEmpty: () => boolean
}

const SignatureCanvas = forwardRef<SignatureCanvasHandle, { className?: string }>(
  function SignatureCanvas({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const drawing = useRef(false)
    const hasDrawn = useRef(false)

    useImperativeHandle(ref, () => ({
      clear() {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
        hasDrawn.current = false
      },
      toDataURL() {
        if (!hasDrawn.current) return null
        return canvasRef.current?.toDataURL('image/png') ?? null
      },
      isEmpty() {
        return !hasDrawn.current
      },
    }))

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
        ctx.lineWidth = 2.5
        ctx.strokeStyle = '#111827'
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }, [])

    function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        const t = e.touches[0]
        return { x: t.clientX - rect.left, y: t.clientY - rect.top }
      }
      return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
    }

    function onStart(e: React.MouseEvent | React.TouchEvent) {
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      drawing.current = true
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const { x, y } = getPos(e, canvas)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }

    function onMove(e: React.MouseEvent | React.TouchEvent) {
      e.preventDefault()
      if (!drawing.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const { x, y } = getPos(e, canvas)
      ctx.lineTo(x, y)
      ctx.stroke()
      hasDrawn.current = true
    }

    function onEnd(e: React.MouseEvent | React.TouchEvent) {
      e.preventDefault()
      drawing.current = false
    }

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ touchAction: 'none' }}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
      />
    )
  },
)

export default SignatureCanvas
