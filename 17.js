const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const p5 = require('p5');
const paper = require('paper/dist/paper-core')
const random = require('canvas-sketch-util/random');
const { Bezier } = require('bezier-js')

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

const generateBlob = (radius, offsetX, offsetY, offsetR, scaleY, width, height, noPoints) => {
  const circleOffset = offsetR
  const randomOffset = Math.floor(Math.random() * 100000)
  let dots = []
  for (let i = 0; i < noPoints; i++) {
    const weight = createVector(0, 0)
    const pos = {}
    let angle = map(i, 0, noPoints, 0 + circleOffset, 2 * Math.PI + circleOffset)

    const radiusFun = radius * map(random.noise1D(angle + randomOffset, 1, 1), -1, 1, 0.85, 1.15)
    const base = {
      x: Math.cos(angle),
      y: Math.sin(angle) * scaleY
    }

    pos.x = base.x * radiusFun + width / 2 + offsetX
    pos.y = base.y * radiusFun + height / 2 + offsetY
    dots.push(new Dot(pos.x, pos.y, weight)); 
  }

  return dots
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

        const mid = dots[i].lerp(dots2[newIndex].pos, 0.3)
        const normal = new p5.Vector(dots[i].pos.x, dots[i].pos.y).sub(dots2[newIndex].pos).rotate(Math.PI / 2).add(mid)

        const b = new Bezier(dots[i].pos.x, dots[i].pos.y, normal.x, normal.y, dots2[newIndex].pos.x, dots2[newIndex].pos.y)
        const lut = b.getLUT(resolution + 1)  
        // console.log('lut: ', lut)      
        const pos = lut[step]
        // const pos = dots[i].lerp(dots2[newIndex].pos, amt)
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
            let amt = 0.9999
            // let amt = map(random.noise2D(pos.x, pos.y, 0.05, 1), -1, 1, 0, 1.8)
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
            if (Math.random() < 0.5) { const aux = startPos; startPos = endPos; endPos = aux; }
            let finalPos = p5.Vector.lerp(startPos, endPos, Math.min(intersectionAmt, amt))
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

  let circleOffset = 0
  let scaleY = 0.3

  let totalAngleOffset = 0

  let r1 = 0.2
  let r2 = 0.4

  for (let layers = 0; layers < 14; layers++) {
    let dotCheckpoints = []
    let topCheckpoints = []
    let y = -5
    let offsetX = -5 //random.noise1D(column, 0.6, 13) - 3
    let heightFactor = 1

    let noPointsOnCircle = 8
    // let r1 = 2 * layers + 1
    // let r2 = 2 * layers + 3

    r1 = r2
    r2 += 0.4
    

    for (let i = 0; i < 2 * noPointsOnCircle; i++) {
      let index, angle, radius, angleOffset
      if (i % 2 == 0) {
        index = i / 2
        radius = r1
        angleOffset = totalAngleOffset
      } else {
        index = (i - 1) / 2
        radius = r2
        angleOffset = totalAngleOffset + Math.PI / noPointsOnCircle
      }
      angle = map(index, 0, noPointsOnCircle, 0 + angleOffset, 2 * Math.PI + angleOffset)
      let x = Math.cos(angle) * radius
      let y = Math.sin(angle) * radius * (12 / 9)

      dotCheckpoints.push(generateBlob(0.1 + Math.abs(random.noise1D(2 * noPointsOnCircle * layers + i, 0.1, 0.8)), x, y, 0, 1, width, height, noPoints))
    }

    totalAngleOffset += Math.PI / noPointsOnCircle + random.noise1D(layers, 1, 0.5)

    dotCheckpoints.push(dotCheckpoints[0])


    // dotCheckpoints2.push(generateBlob(3.3, 4, -8, 2, 0.9, width, height, noPoints))

    // dotCheckpoints2.push(
    //   generateBlob(3.6, -5, -1, 3, 0.7, width, height, noPoints)
    // )

    // dotCheckpoints3.push(dotCheckpoints2[1])

    // dotCheckpoints3.push(
    //   generateBlob(3.2, 5, 5.5, 4, 1.05, width, height, noPoints)
    // )

    // dotCheckpoints4.push(dotCheckpoints3[1])

    // dotCheckpoints4.push( dotCheckpoints2[0] )

    // drawInterpolation({
    //   dotCheckpoints,
    //   circleResolution: noPoints,
    //   interpResolution: 40,
    //   horizontalStripes: true,
    //   verticalStripes: false,
    //   hasCulling: true
    // }, paths)
    let interpResolution = 5
    drawInterpolation({
      dotCheckpoints: dotCheckpoints,
      circleResolution: noPoints,
      interpResolution,
      horizontalStripes: true,
      verticalStripes: false,
      hasCulling: true
    }, paths)

  /*
    prevPolys = prevPolys.slice(interpResolution)

    drawInterpolation({
      dotCheckpoints: dotCheckpoints2,
      circleResolution: noPoints,
      interpResolution,
      horizontalStripes: true,
      verticalStripes: true,
      hasCulling: true
    }, paths)
  */
  }
  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let linesToRender = pathsToPolylines(paths, { units, curveResolution: 4 });

  // Clip to bounds, using a margin in working units
  const margin = 1; // in working 'units' based on settings
  const actualMargin = 0.05
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
