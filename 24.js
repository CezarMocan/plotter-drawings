const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const random = require('canvas-sketch-util/random');
const paper = require('paper/dist/paper-core')
const { squaredDistance } = require('canvas-sketch-util/lib/vec2');

const p5 = require('p5')
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

let canvasWidth, canvasHeight

// Holds all our 'path' objects
// which could be from createPath, or SVGPath string, or polylines
const pathsThick = [];
const pathsThin = [];
const circles = []

const intersectsCircles = (target, circles) => {
  let tC = new p5.Vector(target.x, target.y)
  for (let c of circles) {
    let cC = new p5.Vector(c.x, c.y)
    // console.log('Intersects: ', tC.dist(cC), target.radius + c.radius)
    if (tC.dist(cC) + 0.01 < target.radius + c.radius) return true
  }
  return false
}

const inBoundsFn = (x, y, radius) => {
  // if ((new p5.Vector(x, y)).dist(new p5.Vector(canvasWidth / 2, canvasHeight / 2)) > 7) return false
  if (x < 0) return false
  if (y < 0) return false
  if (x > canvasWidth) return false
  if (y > canvasHeight) return false
  return true
}

const getPointOnCircle = (x, y, r, angle) => {
  return {
    x: x + Math.cos(angle) * r,
    y: y + Math.sin(angle) * r
  }
}

const getSgn = (a, b) => {
  if (a < b) return -1
  if (a == b) return 0
  if (a > b) return 1
}

const allPolys = []

const contains = (polys, point) => {
  for (let i = polys.length - 1; i >= 0; i--) {
    if (polys[i].contains(point)) return true
  }
  return false
}


const drawOutline = ({ x1, y1, r1, x2, y2, r2, direction, radius }, { drawLeft, drawRight, drawCenter }) => {
  const leftStart = getPointOnCircle(x1, y1, r1, direction - Math.PI / 2)
  const rightStart = getPointOnCircle(x1, y1, r1, direction + Math.PI / 2)
  const leftStop = getPointOnCircle(x2, y2, r2, direction - Math.PI / 2)
  const rightStop = getPointOnCircle(x2, y2, r2, direction + Math.PI / 2)

  const p = createPath()
  
  if (drawCenter) {
    p.moveTo(x1, y1)
    p.lineTo(x2, y2)
  }

  if (drawLeft) {
    p.moveTo(leftStart.x, leftStart.y)
    if (!contains(allPolys, new paper.Point(leftStop.x, leftStop.y)))
      p.lineTo(leftStop.x, leftStop.y)
  }

  if (drawRight) {
    p.moveTo(rightStart.x, rightStart.y)
    if (!contains(allPolys, new paper.Point(rightStop.x, rightStop.y)))
      p.lineTo(rightStop.x, rightStop.y)
  }

  let sgn_i = (leftStart.x < rightStart.x) ? 1 : -1
  let step_i = 0.05 * sgn_i
  let iCondition = true

  let sgn_j = (leftStart.y < leftStop.y) ? 1 : -1
  let step_j = 0.05 * sgn_j

  let currPolygon = new paper.Path()
  currPolygon.add(new paper.Point(leftStart.x, leftStart.y))
  currPolygon.add(new paper.Point(leftStop.x, leftStop.y))
  currPolygon.add(new paper.Point(rightStop.x, rightStop.y))
  currPolygon.add(new paper.Point(rightStart.x, rightStart.y))

  let lengthTotalSplits = parseInt(map(r1, 0.5, 0.05, 15, 3))
  let widthTotalSplits = parseInt(map(r1, 0.5, 0.05, 15, 3))

  // Shading
  for (let lengthSplits = 0; lengthSplits <= lengthTotalSplits; lengthSplits++) {
    let currStart = new p5.Vector(leftStart.x, leftStart.y).lerp(new p5.Vector(rightStart.x, rightStart.y), lengthSplits / lengthTotalSplits)
    let currStop = new p5.Vector(leftStop.x, leftStop.y).lerp(new p5.Vector(rightStop.x, rightStop.y), lengthSplits / lengthTotalSplits)
    for (let widthSplits = 0; widthSplits <= widthTotalSplits; widthSplits++) {
      let currPoint = new p5.Vector(currStart.x, currStart.y).lerp(new p5.Vector(currStop.x, currStop.y), widthSplits / widthTotalSplits)
      let i = currPoint.x, j = currPoint.y

      let pX = i + random.noise1D(i, j, 0.3, 0.01)
      let pY = j + random.noise1D(10 * i, 10 * j, 0.3, 0.01)

      if (!currPolygon.contains(new paper.Point(pX, pY))) continue

      if (lengthSplits <= 0.3 * lengthTotalSplits) {
        if (Math.random() < 0.5) {
          p.moveTo(pX, pY)
          p.lineTo(pX, pY - 0.01)  
        }
      } else if (lengthSplits <= 0.7 * lengthTotalSplits) {
        if (Math.random() < 0.1) {
          p.moveTo(pX, pY)
          p.lineTo(pX, pY - 0.01)  
        }
      } else {
        if (lengthSplits >= 0.9 * lengthTotalSplits) {
          if (Math.random() < 0.75) {
            p.moveTo(pX, pY)
            p.lineTo(pX, pY - 0.01)      
          }
        }
        if (Math.random() < 0.4) {
          p.moveTo(pX, pY)
          let length = map(random.noise2D(pX, pY, 0.2, 1), -1, 1, r1 / 3, r1 / 8)
          let dest = new paper.Point(pX + Math.cos(direction + Math.PI / 2) * length, pY + Math.sin(direction + Math.PI / 2) * length)
          if (currPolygon.contains(dest))
            p.lineTo(dest.x, dest.y)

          p.moveTo(pX, pY)
          p.lineTo(pX, pY - 0.01)    
        }
      }
    }
  }

  allPolys.push(currPolygon)
  return p
}

const generatePath = (x, y, radius, direction, weight, depth, maxDepth, branchDepth, inBoundsFn) => {

  let averageAngle = map(radius, 0.05, 0.5, 0.5, 0.28)
  const splitAngle = Math.PI * (averageAngle + random.noise2D(x, y, 1, averageAngle))

  while (direction < 0) direction += 2 * Math.PI
  while (direction > 2 * Math.PI) direction -= 2 * Math.PI
  if (direction >= Math.PI / 8 && direction <= Math.PI - Math.PI / 8) return
  if (direction >= Math.PI / 8 && direction - Math.PI / 8 < 0.5) direction -= 0.2
  if (direction <= Math.PI - Math.PI / 8 && Math.PI - Math.PI / 8 - direction <= 0.5) direction += 0.2
  // if (radius < 0.03) return
  // if (radius < 0.035) return
  if (radius < 0.027) return
  if (depth > maxDepth) return
  // if (weight < 0.001) return
  // if (intersectsCircles({ x, y, radius }, circles)) radius *= 0.65
  // if (intersectsCircles({ x, y, radius }, circles)) return
  if (!inBoundsFn(x, y, radius)) return
  // todo: check for bounds

  const paths = (radius < 0.04 ? pathsThin : pathsThick)

  const startPoint = { x, y }
  const endPoint = { 
    x: x + Math.cos(direction) * radius,
    y: y + Math.sin(direction) * radius
  }

  // const p = createPath()
  // p.moveTo(startPoint.x, startPoint.y)
  // p.lineTo(endPoint.x, endPoint.y)  

  circles.push({ x, y, radius })

  let sgns = [-1, 1]
  let splits = []

  let splitMap = {}
  let splitsForSign = []
  for (let splitSgn of sgns) {
    // let isSplitting = (Math.random() < (0.35 * (0.2 + Math.abs(Math.sin(depth / 4)))))  
    let isSplitting = (Math.random() < 0.4)  
    splitsForSign.push(isSplitting)
  }
  let mainBranchContinues = inBoundsFn(endPoint.x, endPoint.y, radius) && (branchDepth < 30)
  if (mainBranchContinues) {
    splitsForSign.push(true)
  } else {
    splitsForSign.push(false)
  }
  let noSplits = splitsForSign.reduce((acc, val) => {
    return acc + val
  }, 0)
  // console.log('noSplits: ', noSplits, radius)
  const newRadius = radius //radius * map(Math.random(), 0, 1, 0.6, 0.9)
  const directionOffset = map(radius, 0.5, 0.05, 0.15, 0.22)
  const newDirection = direction + random.noise2D(x, y, 5, directionOffset)
  // const newRadius = radius
  const newCenter = {
    x: endPoint.x + Math.cos(newDirection) * newRadius,
    y: endPoint.y + Math.sin(newDirection) * newRadius
  }

  if (branchDepth > 9 * radius) {
    let index = 0
    for (let splitSgn of sgns) {
      let isSplitting = splitsForSign[index]
      if (!isSplitting) {
        // newWeight = weight
      } else {
        // const newRadius = radius / noSplits

        const newEndPoint = { 
          x: x + Math.cos(direction + splitAngle * splitSgn) * radius,
          y: y + Math.sin(direction + splitAngle * splitSgn) * radius
        }  
        const newDirection2 = newDirection + splitAngle * splitSgn
        const newCenter2 = {
          x: newEndPoint.x + Math.cos(newDirection2) * newRadius,
          y: newEndPoint.y + Math.sin(newDirection2) * newRadius
        }

        if (inBoundsFn(newEndPoint.x, newEndPoint.y, newRadius) 
            && inBoundsFn(newCenter2.x, newCenter2.y, newRadius) 
            && depth + 1 <= maxDepth)
          splits.push({ x: newCenter2.x, y: newCenter2.y, direction: newDirection2, radius: newRadius * 0.6, boundX: newEndPoint.x, boundY: newEndPoint.y, sgn: splitSgn, branchDepth: 0 })
          splitMap[splitSgn] = true
      }

      index++
    }
  }

  if (mainBranchContinues) {
    let sizeReducingFactor = 0.945 + map(1 / radius, 0, 100, 0.005, 0.035)
    splits.push({ x: newCenter.x, y: newCenter.y, radius: newRadius * sizeReducingFactor, direction: newDirection, boundX: endPoint.x, boundY: endPoint.y, sgn: 0, branchDepth: branchDepth + 1 })
  }

  // if (depth == 0) splits.push({ x: newCenter.x, y: newCenter.y, radius: newRadius, direction: newDirection + Math.PI, boundX: endPoint.x, boundY: endPoint.y })
  const prevRadius = radius
  const prevDirection = direction

  const trueStartPoint = getPointOnCircle(startPoint.x, startPoint.y, radius, direction + Math.PI)
  const trueMidPoint = startPoint
  const trueEndPoint = endPoint

  const p1 = drawOutline({
    x1: trueStartPoint.x, y1: trueStartPoint.y, r1: prevRadius,
    x2: trueMidPoint.x, y2: trueMidPoint.y, r2: prevRadius,
    direction: prevDirection
  },
  // { drawCenter: false/*(radius > 0.19)*/, drawLeft: !splitMap[-1], drawRight: !splitMap[1] }
  { drawCenter: false, drawLeft: true, drawRight: true }
  // { drawCenter: true }
  )

  const p2 = drawOutline({
    x1: trueMidPoint.x, y1: trueMidPoint.y, r1: prevRadius,
    x2: trueEndPoint.x, y2: trueEndPoint.y, r2: prevRadius,
    direction: direction
  },
  // { drawCenter: false, drawLeft: !splitMap[-1], drawRight: !splitMap[1] }
  { drawCenter: false, drawLeft: true, drawRight: true }
  // { drawCenter: true }
  )

  if (inBoundsFn(trueStartPoint.x, trueStartPoint.y, radius))
    paths.push(p1)
  paths.push(p2)

  const parc = createPath()
  parc.arc(x, y, radius * 0.55, 0, 2 * Math.PI)
  // paths.push(parc)

  splits.forEach(({ x, y, radius, direction, boundX, boundY, sgn, branchDepth }) => {    
    generatePath(x, y, radius, direction, weight / splits.length, depth + 1, maxDepth, branchDepth, inBoundsFn)
  })
}

const sketch = (props) => {
  const { width, height, units } = props;
  canvasWidth = width
  canvasHeight = height

  let rectPadding = 0.25
  let noX = 1
  let noY = 1
  let rectWidth = (width - 2 - (noX - 1) * rectPadding) / noX
  let rectHeight = (height - 2 - (noY - 1) * rectPadding) / noY
  
  for (let i = 0; i < noX; i++) {
    for (let j = 0; j < noY; j++) {
      const p = createPath()
      let topLeftX = i * rectWidth + 1 + i * rectPadding
      let topLeftY = j * rectHeight + 1 + j * rectPadding

      p.moveTo(topLeftX, topLeftY)
      p.lineTo(topLeftX, topLeftY + rectHeight)
      p.lineTo(topLeftX + rectWidth, topLeftY + rectHeight)
      p.lineTo(topLeftX + rectWidth, topLeftY)
      p.lineTo(topLeftX, topLeftY)
      const box = [topLeftX, topLeftY, topLeftX + rectWidth, topLeftY + rectHeight]
      // paths.push(clipPolylinesToBox(pathsToPolylines(p, { units }), box))
      // paths.push(p)

      let x = topLeftX + rectWidth / 2
      let y = topLeftY + rectHeight * 1
      let inBoundsFn = (cx, cy, cr) => {
        if (cx < topLeftX) return false
        if (cx > topLeftX + rectWidth) return false
        if (cy < topLeftY) return false
        if (cy > topLeftY + rectHeight) return false
        return true
      }
      // generatePath(x, y, 0.5, -Math.PI / 2, 2, 0, 182, inBoundsFn)
      generatePath(x, y, 0.6, -Math.PI / 2, 2, 0, 82, 0, inBoundsFn)
    }
  }  

  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let lines = pathsToPolylines([pathsThick, pathsThin], { units });

  // Clip to bounds, using a margin in working units
  const margin = 1; // in working 'units' based on settings
  const box = [ margin, margin, width - margin, height - margin ];
  lines = clipPolylinesToBox(lines, box);

  // The 'penplot' util includes a utility to render
  // and export both PNG and SVG files
  return props => renderPaths(lines, {
    ...props,
    lineJoin: 'round',
    lineCap: 'round',
    // in working units; you might have a thicker pen
    lineWidth: 0.055,
    // Optimize SVG paths for pen plotter use
    optimize: true
  });
};

canvasSketch(sketch, settings);
