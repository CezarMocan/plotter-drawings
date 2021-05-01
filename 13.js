const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const p5 = require('p5');
const paper = require('paper/dist/paper-core')
const random = require('canvas-sketch-util/random');

new p5()
paper.setup(document.createElement('canvas'))

// You can force a specific seed by replacing this with a string value
const defaultSeed = '';

// Set a random seed so we can reproduce this print later
Random.setSeed(defaultSeed || Random.getRandomSeed());

// Print to console so we can see which seed is being used and copy it if desired
console.log('Random Seed:', Random.getSeed());

const settings = {
  suffix: Random.getSeed(),
  dimensions: 'A4',
  orientation: 'portrait',
  pixelsPerInch: 300,
  scaleToView: true,
  units: 'cm'
};

class Dot {
  constructor(x, y, gravity) {
    this.pos = createVector(x, y);
    this.oldpos = createVector(x, y);
    
    this.friction = 0.4;
    this.groundFriction = 0.7;
    
    this.gravity = gravity || createVector(0, 0);    
    
    this.radius = 5;
    this.color = '#e62a4f';
    this.mass = 1;
  } 
  update() {
    let vel = p5.Vector.sub(this.pos, this.oldpos);
    vel.mult(this.friction);    
    this.oldpos.set(this.pos.x, this.pos.y);
    this.pos.add(vel);
    this.pos.add(this.gravity);
  }
  render(p) {
    p.moveTo(this.pos.x, this.pos.y)
    p.lineTo(this.oldpos.x, this.oldpos.y)
  }
  lerp(d, amt) {
    return p5.Vector.lerp(this.pos, d, amt)
  }
}

class Stick {
  constructor(p1, p2, length) {
    this.startPoint = p1;
    this.endPoint = p2;
    this.stiffness = 2;
    this.color = '#f5476a';
    
    // if the length is not given then calculate the distance based on position
    if (!length) {
      this.length = this.startPoint.pos.dist(this.endPoint.pos);
    } else {
      this.length = length;
    }    
  }
  update() {
    // calculate the distance between two dots
    let dx = this.endPoint.pos.x - this.startPoint.pos.x;
    let dy = this.endPoint.pos.y - this.startPoint.pos.y;
    // pythagoras theorem
    let dist = Math.sqrt(dx * dx + dy * dy);
    // calculate the resting distance betwen the dots
    let diff = (this.length - dist) / dist * this.stiffness;

    // getting the offset of the points
    let offsetx = dx * diff * 0.5;
    let offsety = dy * diff * 0.5;

    // calculate mass
    let m1 = this.startPoint.mass + this.endPoint.mass;
    let m2 = this.startPoint.mass / m1;
    m1 = this.endPoint.mass / m1;

    // and finally apply the offset with calculated mass
    if (!this.startPoint.pinned) {
      this.startPoint.pos.x -= offsetx * m1;
      this.startPoint.pos.y -= offsety * m1;
    }
    if (!this.endPoint.pinned) {
      this.endPoint.pos.x += offsetx * m2;
      this.endPoint.pos.y += offsety * m2;
    }
  }
  render(p) {
    p.moveTo(this.startPoint.pos.x, this.startPoint.pos.y)
    p.lineTo(this.endPoint.pos.x, this.endPoint.pos.y)
    // line(this.startPoint.pos.x, this.startPoint.pos.y, this.endPoint.pos.x, this.endPoint.pos.y)
  }
}

const generateCircle = (radius, offsetX, offsetY, width, height, noPoints, f1, f2, dots, sticks) => {
  const circleOffset = Math.PI / 12
  for (let i = 0; i < noPoints; i++) {    
    // const weightVal = Math.sin(((weightLimit - i) / weightLimit) / 950) / 1300 + random.noise1D(i, 0.008, 0.003)
    const weight = createVector(0, 0)
    const pos = {}
    const radiusFun = radius
    const base = {
      x: Math.cos(map(i, 0, noPoints, 0 + circleOffset, 2 * Math.PI + circleOffset)),
      y: Math.sin(map(i, 0, noPoints, 0 + circleOffset, 2 * Math.PI + circleOffset)) * 0.4
    }

    pos.x = base.x * radiusFun + width / 2 + offsetX
    pos.y = base.y * radiusFun + height / 2 + offsetY
    dots.push(new Dot(pos.x, pos.y, weight)); 
    if (i > 0) {
      sticks.push(new Stick(dots[i - 1], dots[i]))
    }
  }
  sticks.push(new Stick(dots[0], dots[noPoints - 1]))
}

const generateBubble = (radius, offsetX, offsetY, width, height, noPoints, f1, f2, dots, sticks) => {
  for (let i = 0; i < noPoints; i++) {    
    // const weightVal = Math.sin(((weightLimit - i) / weightLimit) / 950) / 1300 + random.noise1D(i, 0.008, 0.003)
    const weight = createVector(0, 0)
    const pos = {}
    // 6, 7.5
    let waveFun = Math.sin(map(i, 0, noPoints - 1, 0, f1 * Math.PI)) * Math.cos(map(i, 0, noPoints - 1, 0, f2 * Math.PI))
    const radiusFun = radius * map(waveFun, -1, 1, 0.8, 1.2)

    const base = {
      x: Math.cos(map(i, 0, noPoints, 0, 2 * Math.PI)),
      y: Math.sin(map(i, 0, noPoints, 0, 2 * Math.PI)) * 0.7
    }

    pos.x = base.x * radiusFun + width / 2 + offsetX
    pos.y = base.y * radiusFun + height / 2 + offsetY
    const finalPos = {
      x: pos.x + random.noise2D(pos.x, pos.y, 0.3, 0.15),
      y: pos.y + random.noise2D(pos.x, pos.y, 0.3, 0.15) - map(random.noise2D(pos.x, pos.y, 0.13, 1), -1, 1, 0, 1 * constrain(base.y + 1, 0, 2)),
    }
    // pos.x += random.noise2D()
    dots.push(new Dot(finalPos.x, finalPos.y, weight)); 

    if (i > 0) {
      sticks.push(new Stick(dots[i - 1], dots[i]))
    }
  }
  sticks.push(new Stick(dots[0], dots[noPoints - 1]))
}

const contains = (polys, point) => {
  for (let i = polys.length - 1; i >= 0; i--) {
    if (polys[i].contains(point)) return true
  }
  return false
}

let prevPolygon = null
let prevPolys = []

const drawInterpolation = ({ dotCheckpoints, circleResolution, interpResolution, hasCulling, horizontalStripes, verticalStripes }, paths) => {
  const noPoints = circleResolution
  const resolution = interpResolution

  const stickLayers = [], dotLayers = []
  for (let dotLayer = 0; dotLayer < dotCheckpoints.length - 1; dotLayer++) {
    let dots = dotCheckpoints[dotLayer]
    let dots2 = dotCheckpoints[dotLayer + 1]

    let allDots = []
    let allSticks = []
  
    for (let step = 0; step < resolution; step++) {
      allDots.push([])
      allSticks.push([])
      for (let i = 0; i < noPoints; i++) {
        const amt = map(step, 0, resolution - 1, 0, 1)
        const newIndex = Math.floor(i + 0 * (step)) % noPoints
        const pos = dots[i].lerp(dots2[newIndex].pos, amt)
        // if (step == 5 && i % 10 == 0) console.log(step, i, dots[i], dots2[i], amt, pos)
        allDots[step].push(new Dot(pos.x, pos.y, createVector(0, 0)))
        if (i > 0) allSticks[step].push(new Stick(allDots[step][i - 1], allDots[step][i]))
      }
      allSticks[step].push(new Stick(allDots[step][noPoints - 1], allDots[step][0]))
    }

    dotLayers.push(allDots)
    stickLayers.push(allSticks)
  }

  let prevDots

  for (let dotLayerIndex = 0; dotLayerIndex < dotLayers.length; dotLayerIndex++) {
    let allDots = dotLayers[dotLayerIndex]
    for (let dotsIndex = 0; dotsIndex < allDots.length; dotsIndex++) {      
      let dots = allDots[dotsIndex]
      prevDots = dotsIndex > 0 ? allDots[dotsIndex - 1] : dots

      // console.log('Dots: ', dots, 'Prev: ', prevDots)

      let currPolygon = new paper.Path()
      const p = createPath()

      let isLastRow = (dotLayerIndex == dotLayers.length - 1) && (dotsIndex == allDots.length - 1)

      if (prevDots) {
        for (let i = 0; i < dots.length; i++) {
          let pos = dots[i].pos, nextPosH, nextPosV

          nextPosV = prevDots[i].pos
          nextPosH = dots[(i + 1) % dots.length].pos

          const nP = [
            { draws: horizontalStripes || isLastRow, nextPos: nextPosH },
            { draws: verticalStripes, nextPos: nextPosV }
          ]

          nP.forEach(({ draws, nextPos}) => {
            if (!draws) return
            let amt = 0.999 //map(random.noise2D(pos.x, pos.y, 0.55, 1), -1, 1, 0, 1)
            let startPos = pos
            let endPos = nextPos

            let containsStart = contains(prevPolys, new paper.Point(startPos.x, startPos.y)) 
            let containsEnd = contains(prevPolys, new paper.Point(endPos.x, endPos.y))

            let shouldDraw = true
            let intersectionAmt = 0.999

            if (hasCulling) {
              let shouldIntersect = false
              if (containsStart && containsEnd) shouldDraw = false
              if (containsStart && !containsEnd) { 
                const aux = startPos; startPos = endPos; endPos = aux; 
                shouldIntersect = true
              }
              if (!containsStart && containsEnd) {  
                shouldIntersect = true
              }
              
              if (shouldIntersect) {
                let step = intersectionAmt / 2
                intersectionAmt = 0
                while (step > 0.001) {
                  let testPos = p5.Vector.lerp(startPos, endPos, intersectionAmt + step)
                  if (contains(prevPolys, new paper.Point(testPos.x, testPos.y))) {
                  } else {
                    intersectionAmt += step
                  }
                  step /= 2
                }
              }
            }

            let finalPos = p5.Vector.lerp(startPos, endPos, intersectionAmt)
            if (shouldDraw) {
              p.moveTo(startPos.x, startPos.y)
              p.lineTo(finalPos.x, finalPos.y)  
            }    
          })
  
          currPolygon.add(new paper.Point(pos.x, pos.y))
        }  
      }
      
      prevPolys.push(currPolygon)
      prevPolygon = currPolygon
      paths.push(p)          
    }  
  }
}

const sketch = (props) => {
  const { width, height, units } = props;

  // Holds all our 'path' objects
  // which could be from createPath, or SVGPath string, or polylines
  const paths = [];

  const noPoints = 4
  const noColumns = 1

  for (let column = 0; column < noColumns; column++) {
    let dotCheckpoints = []
    let topCheckpoints = []
    let y = -18 - column / 2
    let offsetX = random.noise1D(column, 0.6, 13)
    let heightFactor = 1
  
    for (let i = 0; i < 39; i++) {
      let dots = [], sticks = []
      let x = random.noise1D(i, 0.06, 0.1) + offsetX
      const f1 = 2.5 + Math.random() * 4
      const f2 = 2.7 + Math.random() * 3.8
      // let radius = 6 - (i / 2.5) //(i % 2 == 0) ? 1 : 3
      // let radius = (random.noise1D(i + 100000, 0.5, 4.55) + map(i, 0, 6, 17, 17))
      let radius = (random.noise1D(i + 100000, 0.5, 0.05) + map(i, 0, 6, 17, 17))
      generateCircle(radius, x, y, width, height, noPoints, f1, f2, dots, sticks)
      dotCheckpoints.push(dots)

      if (i == 0) {
        topCheckpoints.push(dots.slice(0))
        let topDots = [], topSticks = []
        generateCircle(0.1, x, y, width, height, noPoints, f1, f2, topDots, topSticks)
        topCheckpoints.push(topDots)
      }
      // y += 0.18 + (Math.sin(i / 6) / 16)//random.noise1D(i + 100, 0.01, 0.175) + 0.2//1.75 * heightFactor
      y += 1.15 + (Math.sin(i / 10 + 3.2) / 2)//random.noise1D(i + 100, 0.01, 0.175) + 0.2//1.75 * heightFactor
    }

    drawInterpolation({
      dotCheckpoints,
      circleResolution: noPoints,
      interpResolution: 12,
      horizontalStripes: true,
      verticalStripes: false,
      hasCulling: true
    }, paths)

    drawInterpolation({
      dotCheckpoints: topCheckpoints,
      circleResolution: noPoints,
      interpResolution: 80,
      horizontalStripes: true,
      verticalStripes: false,
      hasCulling: false
    }, paths)  
  }
    
  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let linesToRender = pathsToPolylines(paths, { units, curveResolution: 4 });

  // Clip to bounds, using a margin in working units
  const margin = 1; // in working 'units' based on settings
  const actualMargin = 0.5
  const box = [ actualMargin, actualMargin, width - actualMargin, height - actualMargin ];
  linesToRender = clipPolylinesToBox(linesToRender, box, true);

  // The 'penplot' util includes a utility to render
  // and export both PNG and SVG files
  return props => renderPaths(linesToRender, {
    ...props,
    lineJoin: 'round',
    lineCap: 'round',
    // in working units; you might have a thicker pen
    lineWidth: 0.055,
    // Optimize SVG paths for pen plotter use
    optimize: true
    // optimize: {
    //   mergeThreshold: 25
    // }
  });
};

canvasSketch(sketch, settings);
