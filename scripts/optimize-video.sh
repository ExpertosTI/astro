#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# OPTIMIZE VIDEO FOR MOBILE
# ═══════════════════════════════════════════════════════════════════════════
# Este script optimiza el video para carga móvil:
# - Crea versión WebM (mejor compresión, soporte moderno)
# - Mantiene versión MP4 como fallback
# - Reduce bitrate para conexiones lentas
# - Optimiza tamaño de archivo
#
# Requisitos:
#   ffmpeg: brew install ffmpeg  (macOS)
#           apt install ffmpeg   (Linux)
#           choco install ffmpeg (Windows)
# ═══════════════════════════════════════════════════════════════════════════

set -e

INPUT_FILE="${1:-public/astro/backgrounds/video.mp4}"
OUTPUT_DIR="public/astro/backgrounds"

if [ ! -f "$INPUT_FILE" ]; then
  echo "❌ Error: Archivo no encontrado: $INPUT_FILE"
  exit 1
fi

echo "🎬 Optimizando video para móvil..."
echo "   Input: $INPUT_FILE"
echo ""

# ─ VP9 WebM (mejor compresión, ~50% más pequeño que MP4)
# ─ Bitrate: 1500kbps (bueno para conexiones 4G)
# ─ Resolución: escalada a 1080p max
echo "📹 Creando versión WebM (VP9)..."
ffmpeg -i "$INPUT_FILE" \
  -c:v libvpx-vp9 \
  -b:v 1500k \
  -maxrate 2000k \
  -bufsize 4000k \
  -vf "scale=min(iw\,1080):min(ih\,1080):force_original_aspect_ratio=decrease" \
  -c:a libopus \
  -b:a 128k \
  -preset slow \
  "$OUTPUT_DIR/video.webm" \
  -y

# ─ MP4 H.264 optimizado (fallback para navegadores antiguos)
# ─ Bitrate: 1800kbps
echo "🎞️  Creando versión MP4 optimizada (H.264)..."
ffmpeg -i "$INPUT_FILE" \
  -c:v libx264 \
  -b:v 1800k \
  -maxrate 2400k \
  -bufsize 4800k \
  -vf "scale=min(iw\,1080):min(ih\,1080):force_original_aspect_ratio=decrease" \
  -c:a aac \
  -b:a 128k \
  -preset medium \
  "$OUTPUT_DIR/video-optimized.mp4" \
  -y

echo ""
echo "✅ Optimización completa"
echo ""
echo "📊 Tamaños:"
ls -lh "$INPUT_FILE" | awk '{print "   Original MP4: " $5}'
ls -lh "$OUTPUT_DIR/video.webm" | awk '{print "   WebM (VP9):  " $5}'
ls -lh "$OUTPUT_DIR/video-optimized.mp4" | awk '{print "   MP4 (H.264): " $5}'
echo ""

echo "💡 Próximos pasos:"
echo "   1. Reemplaza video.mp4 con video-optimized.mp4 (opcional)"
echo "   2. Actualiza astro-hero.tsx para usar WebM primero:"
echo ""
echo "      <video ...>"
echo "        <source src=\"/astro/backgrounds/video.webm\" type=\"video/webm\" />"
echo "        <source src=\"/astro/backgrounds/video.mp4\" type=\"video/mp4\" />"
echo "      </video>"
echo ""
echo "🚀 Esto reduce carga móvil ~40-50% con mejor calidad"
