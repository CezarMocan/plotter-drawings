// const STRING = `A shining breakfast, a breakfast shining, no dispute, no practice, nothing, nothing at all.`//.toLowerCase()
// const STRING = `048-97-6863`//.toLowerCase()
// const STRING = `░==~=^=©▓o│┤|`
const STRING = `abcd`
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

const drawInterpolatedLine = (startX, startY, stopX, stopY, p, res = 100) => {
  for (let i = 0; i < 6; i++) {
    p.moveTo(startX, startY)
    for (let step = 1 / res; step <= 1; step += (1 / res)) {
      const newP = getPointOnLine({ x: startX, y: startY }, { x: stopX, y: stopY }, step)

      const stepDistance = Math.min(step, 1 - step)
      let stepFactor = 1
      const stepPadding = 0.0
      if (stepDistance < stepPadding) stepFactor = map(stepDistance, 0, stepPadding, 0, 1)

      const rX = random.noise2D(newP.x * i, newP.y * i, 0.005, i / 20 * stepFactor)
      const rY = random.noise2D(newP.x * i, newP.y * i, 0.014, 5)
      // p.lineTo(newP.x + rX, newP.y + rY)
      p.lineTo(newP.x + rX * Math.cos(i / 20), newP.y + rY * Math.sin(i / 20))
    }
  }
}

const drawInterpolatedQuadraticCurve = (startX, startY, controlX, controlY, stopX, stopY, p, res = 10) => {
  p.moveTo(startX, startY)
  for (let step = 1 / res; step <= 1; step += (1 / res)) {
    const newP = getPointOnQuadraticCurve({ x: startX, y: startY }, { x: controlX, y: controlY }, { x: stopX, y: stopY }, step)

    p.lineTo(newP.x, newP.y)
  }
}

const drawInterpolatedBezierCurve = (startX, startY, control1X, control1Y, control2X, control2Y, stopX, stopY, p, res = 100) => {
  for (let i = 0; i < 10; i++) {
    p.moveTo(startX, startY)
    for (let step = 1 / res; step <= 1; step += (1 / res)) {
      const newP = getPointOnCubicCurve({ x: startX, y: startY }, { x: control1X, y: control1Y }, { x: control2X, y: control2Y }, { x: stopX, y: stopY }, step)

      const stepDistance = Math.min(step, 1 - step)
      let stepFactor = 1
      const stepPadding = 0.0
      if (stepDistance < stepPadding) stepFactor = map(stepDistance, 0, stepPadding, 0, 1)

      const rX = random.noise2D(newP.x * i, newP.y * i, 0.005, i / 8 * stepFactor)
      const rY = random.noise2D(newP.x * i, newP.y * i, 0.0054, i / 12 * stepFactor)
      p.lineTo(newP.x + rX * Math.cos(i / 20), newP.y + rY * Math.sin(i / 20))
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
    const draws = random.noise1D(new Date().getTime() / 10000.0 + index, 10, 0.5) + 0.5
    if (draws <= proba) {
      if (c.type == 'M') p.moveTo(c.x, c.y)
      else if (c.type == 'C') drawInterpolatedBezierCurve(lastPoint.x, lastPoint.y, c.x1, c.y1, c.x2, c.y2, c.x, c.y, p) //p.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y)
      else if (c.type == 'Q') drawInterpolatedQuadraticCurve(lastPoint.x, lastPoint.y, c.x1, c.y1, c.x, c.y, p) //p.quadraticCurveTo(c.x1, c.y1, c.x, c.y)
      else if (c.type == 'L') drawInterpolatedLine(lastPoint.x, lastPoint.y, c.x, c.y, p)//p.lineTo(c.x, c.y)
      else if (c.type == 'Z') {
        prevWasZ = true
        drawInterpolatedLine(lastPoint.x, lastPoint.y, lastStart.x, lastStart.y, p)//p.lineTo(c.x, c.y)
        // p.lineTo(lastStart.x, lastStart.y)
      }  
    } else {
      if (c.type == 'M') p.moveTo(c.x, c.y)
      else if (c.type == 'C') p.moveTo(c.x, c.y)
      else if (c.type == 'Q') p.moveTo(c.x, c.y)
      else if (c.type == 'L') p.moveTo(c.x, c.y)
      else if (c.type == 'Z') {
        prevWasZ = true
        p.moveTo(lastStart.x, lastStart.y)
      }  
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

const sketch = async (props) => {
  const { width, height, units } = props;

  const font = await new Promise((res, rej) => { 
    opentype.load("assets/BasisGrotesqueProMono-Regular.otf", (err, font) => {        
      res(font)
    })
  })

  const noCircles = 1
  let centerX = width / 2 //random.noise1D(sd, 30, width * 0.4) + width / 2
  let centerY = height / 2 //random.noise1D(sd, 13, height * 0.4) + height / 2      


  for (let line = 0; line <= 35; line += 3) {
    for (let col = 0; col <= 22; col += 3) {
      const x = col //line + random.noise2D(line / 10, col / 10, 1, map(line, 0, 10, 0, 0.25))
      const fL = Math.min(4, line)
      const y = line + random.noise2D(line / 10, col / 10, 10, map(line, fL, 35, 0, 2))

      const fontPath = font.getPath(STRING[STRING_INDEX], x, y, 6 + random.noise2D(x, y, 2, 6), {})
      STRING_INDEX = (STRING_INDEX + Math.floor(random.noise2D(x, y, 2, 10) + 10)) % STRING.length
      // const p = drawFont(fontPath, map(line, 3, 25, 0.5, 0.5))
      rotateFontAroundPoint(fontPath, { x: x, y: y }, random.noise2D(x, y, 0.1, 1.5))

      const p = drawFont(fontPath, 0.8)

      paths.push(p)
    }
  }

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
