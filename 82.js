const STRING = `
A PLATE. An occasion for a plate, an occasional resource is in buying and how soon does washing enable a selection of the same thing neater. If the party is small a clever song is in order. Plates and a dinner set of colored china. Pack together a string and enough with it to protect the centre, cause a considerable haste and gather more as it is cooling, collect more trembling and not any even trembling, cause a whole thing to be a church. A sad size a size that is not sad is blue as every bit of blue is precocious. A kind of green a game in green and nothing flat nothing quite flat and more round, nothing a particular color strangely, nothing breaking the losing of no little piece. A splendid address a really splendid address is not shown by giving a flower freely, it is not shown by a mark or by wetting. Cut cut in white, cut in white so lately. Cut more than any other and show it. Show it in the stem and in starting and in evening coming complication. A lamp is not the only sign of glass. The lamp and the cake are not the only sign of stone. The lamp and the cake and the cover are not the only necessity altogether. A plan a hearty plan, a compressed disease and no coffee, not even a card or a change to incline each way, a plan that has that excess and that break is the one that shows filling.
`//.toLowerCase()
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

const drawFont = (path) => {
  const p = createPath()
  let lastStart = { x: 0, y: 0 }
  let prevWasZ = true
  path.commands.forEach((c, index) => {
    if (prevWasZ) {
      lastStart = { x: c.x, y: c.y }
      prevWasZ = false
    }
    if (c.type == 'M') p.moveTo(c.x, c.y)
    else if (c.type == 'C') p.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y)
    else if (c.type == 'Q') p.quadraticCurveTo(c.x1, c.y1, c.x, c.y)
    else if (c.type == 'L') p.lineTo(c.x, c.y)
    else if (c.type == 'Z') {
      prevWasZ = true
      p.lineTo(lastStart.x, lastStart.y)
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

  for (let i = 1; i < noCircles + 1; i++) {
    const sd = new Date().getTime() + i
    let radius = 18 //random.noise1D(sd, 1000, 3) + 8
    console.log(radius)
    let noElementsOnCircle = Math.floor((random.noise1D(sd, 1000, 30) + 80) * map(radius, 1, 7, 1, 1))
    while (radius > 0) {
      const step = 2 * Math.PI / noElementsOnCircle
      for (let j = 0; j < 2 * Math.PI; j += step) {        
        if (radius < 0) continue
        // centerX += random.noise1D(j, 2, 0.1) + 0.005
        // centerY += random.noise1D(j, 5, 0.1) + 0.001
        const fontPath = font.getPath(STRING[STRING_INDEX], centerX, centerY - radius, 0.25, {})
        STRING_INDEX = (STRING_INDEX + 1) % STRING.length
        rotateFontAroundPoint(fontPath, { x: centerX + random.noise1D(j, 0.2, 0), y: centerY }, j)
        const p = drawFont(fontPath)
        paths.push(p)
        radius -= (Math.sin((sd + j / 10)) + 1) * 0.004      
      }

      noElementsOnCircle -= 6
      if (noElementsOnCircle < 0) noElementsOnCircle = 200
      radius -= 0.2
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
