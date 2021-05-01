const STRING = `A shining breakfast, a breakfast shining, no dispute, no practice, nothing, nothing at all.`//.toLowerCase()
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

const drawFont = (path, proba) => {
  const p = createPath()
  let lastStart = { x: 0, y: 0 }
  let prevWasZ = true
  path.commands.forEach((c, index) => {
    if (prevWasZ) {
      lastStart = { x: c.x, y: c.y }
      prevWasZ = false
    }
    const draws = random.noise1D(new Date().getTime(), 10, 0.5) + 0.5
    if (draws <= proba) {
      if (c.type == 'M') p.moveTo(c.x, c.y)
      else if (c.type == 'C') p.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y)
      else if (c.type == 'Q') p.quadraticCurveTo(c.x1, c.y1, c.x, c.y)
      else if (c.type == 'L') p.lineTo(c.x, c.y)
      else if (c.type == 'Z') {
        prevWasZ = true
        p.lineTo(lastStart.x, lastStart.y)
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
    // opentype.load("assets/FoundersGrotesk-Light.otf", (err, font) => {  
    opentype.load("assets/BasisGrotesqueProMono-Regular.otf", (err, font) => {        
      res(font)
    })
  })

  const noCircles = 1
  let centerX = width / 2 //random.noise1D(sd, 30, width * 0.4) + width / 2
  let centerY = height / 2 //random.noise1D(sd, 13, height * 0.4) + height / 2      


  for (let line = 3; line < 35; line++) {
    for (let col = 2; col <= 18; col += 0.25) {
      const x = col //line + random.noise2D(line / 10, col / 10, 1, map(line, 0, 10, 0, 0.25))
      const fL = Math.min(4, line)
      const y = line + random.noise2D(line / 10, col / 10, 10, map(line, fL, 35, 0, 2))

      const fontPath = font.getPath(STRING[STRING_INDEX], x, y, 0.5, {})
      STRING_INDEX = (STRING_INDEX + 1) % STRING.length
      const p = drawFont(fontPath, map(line, 3, 25, 1, 0.5))
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
