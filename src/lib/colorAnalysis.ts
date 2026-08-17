/**
 * Analyzes the chromatic distribution of the central subject (the animal),
 * excluding the background periphery / borders.
 * Detects if the animal contains high contrast patches (e.g. White + Black / Brown / Grey)
 * indicating it is Bicolor / Manchado.
 */

export interface ColorAnalysisResult {
  isLikelyBicolor: boolean;
  detectedDominantColors: string[];
  contrastRatio: number;
  reason: string;
}

export function analyzeSubjectColors(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): ColorAnalysisResult {
  const width = canvas.width;
  const height = canvas.height;

  // Focus only on the central area (subject area: inner 60% box) to ignore peripheral backgrounds
  const startX = Math.floor(width * 0.2);
  const startY = Math.floor(height * 0.2);
  const subjectW = Math.floor(width * 0.6);
  const subjectH = Math.floor(height * 0.6);

  if (subjectW <= 0 || subjectH <= 0) {
    return {
      isLikelyBicolor: false,
      detectedDominantColors: [],
      contrastRatio: 0,
      reason: ''
    };
  }

  const imageData = ctx.getImageData(startX, startY, subjectW, subjectH);
  const data = imageData.data;
  const totalPixels = data.length / 4;

  let lightCount = 0; // White / Cream / Light grey
  let darkCount = 0;  // Black / Deep dark
  let warmCount = 0;  // Brown / Tan / Golden / Orange
  let greyCount = 0;  // Neutral medium grey

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Luminance (perceived brightness)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Saturation approximation
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;

    if (lum > 175) {
      // Light / White tones
      lightCount++;
    } else if (lum < 60) {
      // Dark / Black tones
      darkCount++;
    } else if (sat > 0.25 && r > b) {
      // Warm brown, caramel, golden, ginger
      warmCount++;
    } else if (sat < 0.18 && lum >= 60 && lum <= 175) {
      // Neutral grey
      greyCount++;
    }
  }

  const lightRatio = lightCount / totalPixels;
  const darkRatio = darkCount / totalPixels;
  const warmRatio = warmCount / totalPixels;
  const greyRatio = greyCount / totalPixels;

  const detected: string[] = [];
  if (lightRatio > 0.18) detected.push('Blanco/Claro');
  if (darkRatio > 0.18) detected.push('Negro/Oscuro');
  if (warmRatio > 0.18) detected.push('Café/Dorado');
  if (greyRatio > 0.18) detected.push('Gris');

  // A pet is identified as bicolor if it has a substantial amount of Light/White pixels
  // alongside a substantial amount of Dark or Warm or Grey pixels in its central body.
  const hasSubstantialWhite = lightRatio >= 0.16;
  const hasSubstantialOther = (darkRatio >= 0.16) || (warmRatio >= 0.16) || (greyRatio >= 0.16);

  // Or contrasting Dark + Warm (e.g. Rottweiler / Doberman / Calico black+tan)
  const hasDarkAndWarm = (darkRatio >= 0.20) && (warmRatio >= 0.20);

  const isLikelyBicolor = (hasSubstantialWhite && hasSubstantialOther) || hasDarkAndWarm;

  let reason = '';
  if (isLikelyBicolor) {
    reason = `Se detectó combinación de tonos (${detected.join(' + ')}) en el cuerpo de la mascota.`;
  }

  return {
    isLikelyBicolor,
    detectedDominantColors: detected,
    contrastRatio: Math.max(lightRatio, darkRatio, warmRatio),
    reason
  };
}
