const STRING = `a`//.toLowerCase()
// const STRING = `048-97-6863`//.toLowerCase()
// const STRING = `░==~=^=©▓o│┤|`
// const STRING = `3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280`
let STRING_INDEX = 0

const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const paper = require('paper/dist/paper-core')
const { squaredDistance } = require('canvas-sketch-util/lib/vec2');
const random = require('canvas-sketch-util/random');
const p5 = require('p5');
new p5()
paper.setup(document.createElement('canvas'))
const opentype = require('opentype.js');

// You can force a specific seed by replacing this with a string value
// const defaultSeed = '391220';
const defaultSeed = '';

// Set a random seed so we can reproduce this print later
Random.setSeed(defaultSeed || Random.getRandomSeed());

// Print to console so we can see which seed is being used and copy it if desired
console.log('Random Seed:', Random.getSeed());

let paths = []

const settings = {
  suffix: Random.getSeed(),
  dimensions: 'A4',
  orientation: 'portrait',
  pixelsPerInch: 300,
  scaleToView: true,
  units: 'cm'
};

const getPointOnLine = (p1, p2, t) => {
  return {
    x: (p2.x - p1.x) * t + p1.x,
    y: (p2.y - p1.y) * t + p1.y
  }
}

const getPointOnQuadraticCurve = (p1, pC, p2, t) => {
  const x = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * pC.x + t * t * p2.x;
  const y = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * pC.y + t * t * p2.y;
  return { x, y }
}

const getPointOnCubicCurve = (p1, pC1, pC2, p2, t) => {
  const x = (1-t)*(1-t)*(1-t)*p1.x + 3*(1-t)*(1-t)*t*pC1.x + 3*(1-t)*t*t*pC2.x + t*t*t*p2.x;
  const y = (1-t)*(1-t)*(1-t)*p1.y + 3*(1-t)*(1-t)*t*pC1.y + 3*(1-t)*t*t*pC2.y + t*t*t*p2.y;
  return { x, y }
}

const drawInterpolatedLine = (startX, startY, stopX, stopY, p, res = 100, proba) => {
  for (let i = 17; i < 22; i += 3.5) {
    p.moveTo(startX, startY)
    for (let step = 1 / res; step <= 1; step += (1 / res)) {
      const newP = getPointOnLine({ x: startX, y: startY }, { x: stopX, y: stopY }, step)

      const stepDistance = Math.min(step, 1 - step)
      let stepFactor = 1
      const stepPadding = 0.0
      if (stepDistance < stepPadding) stepFactor = map(stepDistance, 0, stepPadding, 0, 1)

      const rX = random.noise2D(newP.x * i, newP.y * i, 0.015, i / 220 * stepFactor * 3)
      const rY = random.noise2D(newP.x * i, newP.y * i, 0.114, i / 235 * stepFactor * 3)
      // p.lineTo(newP.x + rX, newP.y + rY)
      const draws = random.noise1D(rX * rY, 100, 0.5) + 0.5
      if (draws < proba)
        p.lineTo(newP.x + rX * Math.cos(i / 100) * 0.1, newP.y + rY * Math.sin(i / 100) * 0.1)
      else
        p.moveTo(newP.x + rX * Math.cos(i / 100) * 0.1, newP.y + rY * Math.sin(i / 100) * 0.1)
    }
  }
}

const drawInterpolatedQuadraticCurve = (startX, startY, controlX, controlY, stopX, stopY, p, res = 10, proba) => {
  p.moveTo(startX, startY)
  for (let step = 1 / res; step <= 1; step += (1 / res)) {
    const newP = getPointOnQuadraticCurve({ x: startX, y: startY }, { x: controlX, y: controlY }, { x: stopX, y: stopY }, step)

    p.lineTo(newP.x, newP.y)
  }
}

const drawInterpolatedBezierCurve = (startX, startY, control1X, control1Y, control2X, control2Y, stopX, stopY, p, res = 100, proba) => {
  for (let i = 37; i < 39; i++) {
    p.moveTo(startX, startY)
    for (let step = 1 / res; step <= 1; step += (1 / res)) {
      const newP = getPointOnCubicCurve({ x: startX, y: startY }, { x: control1X, y: control1Y }, { x: control2X, y: control2Y }, { x: stopX, y: stopY }, step)

      const stepDistance = Math.min(step, 1 - step)
      let stepFactor = 1
      const stepPadding = 0.0
      if (stepDistance < stepPadding) stepFactor = map(stepDistance, 0, stepPadding, 0, 1)

      const rX = random.noise2D(newP.x * i, newP.y * i, 0.015, i / 200 * stepFactor * 3)
      const rY = random.noise2D(newP.x * i, newP.y * i, 0.0254, i / 260 * stepFactor * 3)

      const draws = random.noise1D(rX * rY, 100, 0.5) + 0.5
      if (draws < proba)
        p.lineTo(newP.x + rX * Math.cos(i / 100) * 0.1, newP.y + rY * Math.sin(i / 100) * 0.1)
      else
        p.moveTo(newP.x + rX * Math.cos(i / 100) * 0.1, newP.y + rY * Math.sin(i / 100) * 0.1)
    }  
  }
}

const drawFont = (path, proba) => {
  const p = createPath()
  let lastStart = { x: 0, y: 0 }
  let lastPoint = { x: 0, y: 0 }

  let prevWasZ = true
  path.commands.forEach((c, index) => {
    if (prevWasZ) {
      lastStart = { x: c.x, y: c.y }
      prevWasZ = false
    }
    
    if (c.type == 'M') p.moveTo(c.x, c.y)
    else if (c.type == 'C') drawInterpolatedBezierCurve(lastPoint.x, lastPoint.y, c.x1, c.y1, c.x2, c.y2, c.x, c.y, p, 20, proba) //p.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y)
    else if (c.type == 'Q') drawInterpolatedQuadraticCurve(lastPoint.x, lastPoint.y, c.x1, c.y1, c.x, c.y, p, 20, proba) //p.quadraticCurveTo(c.x1, c.y1, c.x, c.y)
    else if (c.type == 'L') drawInterpolatedLine(lastPoint.x, lastPoint.y, c.x, c.y, p, 20, proba)//p.lineTo(c.x, c.y)
    else if (c.type == 'Z') {
      prevWasZ = true
      drawInterpolatedLine(lastPoint.x, lastPoint.y, lastStart.x, lastStart.y, p, 20, proba)//p.lineTo(c.x, c.y)
      // p.lineTo(lastStart.x, lastStart.y)
    }
    lastPoint = { x: c.x, y: c.y }
  })
  return p
}

const rotateFontAroundPoint = (path, center, angle) => {
  path.commands.forEach((c, index) => {
    const newP = rotatePointAroundPoint(c, center, angle)
    c.x = newP.x; c.y = newP.y
    if (c.x1) {
      const newP = rotatePointAroundPoint({ x: c.x1, y: c.y1 }, center, angle)
      c.x1 = newP.x; c.y1 = newP.y  
    }
    if (c.x2) {
      const newP = rotatePointAroundPoint({ x: c.x2, y: c.y2 }, center, angle)
      c.x2 = newP.x; c.y2 = newP.y  
    }
  })
}

const rotatePointAroundPoint = (point, center, angleOffset) => {
  const radius = Math.sqrt((point.x - center.x) ** 2 + (point.y - center.y) ** 2)
  const currentAngle = Math.atan2(center.y - point.y, center.x - point.x) + Math.PI
  return {
    x: Math.cos(angleOffset + currentAngle) * radius + center.x,
    y: Math.sin(angleOffset + currentAngle) * radius + center.y
  }
}

drawGrid = (topLeft, bottomRight, resX, resY) => {
  let incX = (bottomRight.x - topLeft.x) / resX
  let incY = (bottomRight.y - topLeft.y) / resY
  const p = createPath()

  for (let x = topLeft.x + incX; x <= bottomRight.x + 0.001 - incX; x += incX) {
    p.moveTo(x, topLeft.y)
    p.lineTo(x, bottomRight.y)
  }

  for (let y = topLeft.y + incY; y <= bottomRight.y + 0.001 - incY; y += incY) {
    p.moveTo(topLeft.x, y)
    p.lineTo(bottomRight.x, y)
  }

  paths.push(p)
}

const sketch = async (props) => {
  const { width, height, units } = props;

  let fontPaths = [
    "assets/Adieu-Regular.otf",
    "assets/AkkLg_Pro_1.otf",
    "assets/AkzidenzGrotesk-Light.otf",
    "assets/BasisGrotesqueProMono-Regular.otf",
    "assets/BemboStd-Semibold.otf",
    "assets/Brown-Thin.otf",
    "assets/CentaurMTPro-Regular.otf",
    "assets/CerebriSans-LightItalic.ttf",
    "assets/CooperBlackStd.otf",
    "assets/CourierStd-Oblique.otf",
    "assets/DINMittelschriftStd.otf",
    "assets/DTL Nobel T Bold.otf",
    "assets/Dia-Regular.ttf",
    "assets/DidotLTStd-Roman.otf",
    "assets/Feijoa-Display.otf",
    "assets/FilosofiaOT-Regular.otf",
    "assets/FoundersGrotesk-Light.otf",
    "assets/FrutigerLTStd-BoldCn.otf",
    "assets/FuturaStd-CondensedLight.otf",
    "assets/GT-Cinetype-Mono.ttf",
    "assets/GT-Eesti-Text-Book.otf",
    "assets/GT-Sectra-Fine-Book-Italic.ttf",
    "assets/GT-Super-Display-Light.ttf",
    "assets/GT-Super-Text-Book.ttf",
    "assets/GaramondPremrPro-Capt.otf",
    "assets/GillSansMTPro-Book.otf",
    "assets/GrotesqueMTStd-LightCond.otf",
    "assets/ITCFranklinGothicStd-DemiIt.otf",
    "assets/ImpactLTStd.otf",
    "assets/LegacySerifStd-Medium.otf",
    "assets/LucidaSansStd-BoldItalic.otf",
    "assets/MHTIROGLA.ttf",
    "assets/NeueHaasUnicaPro-Regular.ttf",
    "assets/OfficinaSansStd-Book.otf",
    "assets/Opposit-Medium.otf",
    "assets/Self Modern.otf",
    "assets/SerifGothicStd-Heavy.otf",
    "assets/StoneSerifStd-MediumItalic.otf",
    "assets/Syne-Mono.ttf",
    "assets/WorkSans[wght].ttf",
    "assets/ZapfChanceryStd-Light.otf",
    "assets/fugue-regular.ttf"
  ]

  let allFonts = []
  let FONT_INDEX = 0

  for (let index = 0; index < fontPaths.length; index++) {
    const font = await new Promise((res, rej) => { 
      opentype.load(fontPaths[index], (err, font) => {        
        res(font)
      })
    })
    allFonts.push(font)      
  }


  const globalOffsetX = 0
  const globalOffsetY = 0

  let r = 0.5
  let centerX = width / 2
  let centerY = height / 2

  let paddingX = 2
  let paddingY = 2

  let noRows = 8
  let noCols = 5

  let cellPaddingWidth = 0.5
  let cellPaddingHeight = 0.5

  let cellWidth = (width - 2 * paddingX - (cellPaddingWidth * (noCols - 1))) / noCols
  let cellHeight = (height - 2 * paddingY - (cellPaddingHeight * (noRows - 1))) / noRows
  
  console.log(width, cellWidth)

  for (let row = 0; row < noRows; row++) {
    for (let col = 0; col < noCols; col++) {
      let topLeft = {
        x: paddingX + col * cellWidth + (col) * cellPaddingWidth,
        y: paddingY + row * cellHeight + (row) * cellPaddingHeight
      }
      let bottomRight = {
        x: topLeft.x + cellWidth,
        y: topLeft.y + cellHeight
      }

      drawGrid(topLeft, bottomRight, 10, 10)
      let font = allFonts[FONT_INDEX]
      const fontPath = font.getPath(STRING[STRING_INDEX], topLeft.x + 0.25, bottomRight.y - 0.25, 4.5, {})
      const p = drawFont(fontPath, 1)
      // paths.push(p)
      STRING_INDEX = (STRING_INDEX + 1) % STRING.length
      FONT_INDEX = (FONT_INDEX + 1) % allFonts.length
    }
  }

  /*
  for (let i = 0; i < 2.5 * STRING.length; i++) {
    // if (STRING_INDEX >= STRING.length) continue
    console.log(i)
    let x = Math.cos(i / 3) * r + centerX, y = Math.sin(i / 3) * r + centerY

    const fontPath = font.getPath(STRING[STRING_INDEX], x, y, 1 + 1.5 * (r / 4 * 0) + random.noise2D(x, y, 20, 0.75), {})
    rotateFontAroundPoint(fontPath, { x: x, y: y }, random.noise2D(x / 10, y / 10, 2, 0.5))
    const p = drawFont(fontPath, 1)      
    STRING_INDEX = (STRING_INDEX + 1) % STRING.length
    paths.push(p)

    r += 0.05 + (0.05 * Math.cos(i / 5) + 0.05)
  }
  */

  let lines = pathsToPolylines(paths, { units });

  const margin = 0.1; // in working 'units' based on settings
  const box = [ margin, margin, width - margin, height - margin ];
  lines = clipPolylinesToBox(lines, box);

  return props => renderPaths(lines, {
    ...props,
    lineJoin: 'round',
    lineCap: 'round',
    lineWidth: 0.04,
    optimize: false
  });
};

canvasSketch(sketch, settings);
