const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const random = require('canvas-sketch-util/random');
const { squaredDistance } = require('canvas-sketch-util/lib/vec2');

const p5 = require('p5')
new p5()

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
const paths = [];
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

const drawOutline = ({ x1, y1, r1, x2, y2, r2, direction }, { drawLeft, drawRight, drawCenter }) => {
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
    p.lineTo(leftStop.x, leftStop.y)
  }

  if (drawRight) {
    p.moveTo(rightStart.x, rightStart.y)
    p.lineTo(rightStop.x, rightStop.y)
  }

  return p
}

const generatePath = (x, y, radius, direction, weight, depth, maxDepth, inBoundsFn) => {

  const splitAngle = Math.PI * 0.5 //+ random.noise2D(x, y, 1, map(depth, 0, 80, 0.4, 0.2)))

  if (radius < 0.03) return
  if (depth > maxDepth) return
  // if (weight < 0.001) return
  if (intersectsCircles({ x, y, radius }, circles)) radius *= 0.95
  if (intersectsCircles({ x, y, radius }, circles)) return
  if (!inBoundsFn(x, y, radius)) return
  // todo: check for bounds

  const startPoint = { x, y }
  const endPoint = { 
    x: x + Math.cos(direction) * radius,
    y: y + Math.sin(direction) * radius
  }

  // const p = createPath()
  // p.moveTo(startPoint.x, startPoint.y)
  // p.lineTo(endPoint.x, endPoint.y)  

  circles.push({ x, y, radius })

  const newDirection = direction + random.noise2D(x, y, 3, 0.1)
  const newRadius = radius
  const newCenter = {
    x: endPoint.x + Math.cos(newDirection) * newRadius,
    y: endPoint.y + Math.sin(newDirection) * newRadius
  }

  let sgns = [-1, 1]
  let splits = []

  let splitMap = {}

  if (inBoundsFn(endPoint.x, endPoint.y, newRadius))
    splits.push({ x: newCenter.x, y: newCenter.y, radius: newRadius, direction: newDirection, boundX: endPoint.x, boundY: endPoint.y, sgn: 0 })

  if (depth > 8) {
    for (let splitSgn of sgns) {
      let newWeight
      let isSplitting = (Math.random() < (0.25 * Math.abs(Math.sin(depth / 4))))  
      // console.log('splits', splits)
      if (!isSplitting) {
        // newWeight = weight
      } else {
        // console.log('splitting...')
        newWeight = weight / 2
        const newEndPoint = { 
          x: x + Math.cos(direction + splitAngle * splitSgn) * radius,
          y: y + Math.sin(direction + splitAngle * splitSgn) * radius
        }  
        const newDirection2 = newDirection + splitAngle * splitSgn
        const newCenter2 = {
          x: newEndPoint.x + Math.cos(newDirection2) * newRadius,
          y: newEndPoint.y + Math.sin(newDirection2) * newRadius
        }

        if (inBoundsFn(newEndPoint.x, newEndPoint.y, radius) 
            && inBoundsFn(newCenter2.x, newCenter2.y, newRadius * 0.85) 
            && depth + 1 <= maxDepth
            && !intersectsCircles({ x: newCenter2.x, y: newCenter2.y, radius: newRadius * 0.85 * 0.95 }, circles))
          splits.push({ x: newCenter2.x, y: newCenter2.y, direction: newDirection2, radius: newRadius * 0.85, boundX: newEndPoint.x, boundY: newEndPoint.y, sgn: splitSgn })
          splitMap[splitSgn] = true
      }
    }
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
  { drawCenter: false/*(radius > 0.19)*/, drawLeft: !splitMap[-1], drawRight: !splitMap[1] })

  const p2 = drawOutline({
    x1: trueMidPoint.x, y1: trueMidPoint.y, r1: prevRadius,
    x2: trueEndPoint.x, y2: trueEndPoint.y, r2: prevRadius,
    direction: direction
  },
  { drawCenter: false, drawLeft: !splitMap[-1], drawRight: !splitMap[1] })

  paths.push(p1)
  paths.push(p2)

  // const parc = createPath()
  // parc.arc(x, y, radius * 0.75, 0, 2 * Math.PI)
  // paths.push(parc)

  splits.forEach(({ x, y, radius, direction, boundX, boundY, sgn }) => {
    
    // const p1 = drawOutline({
    //   x1: startPoint.x, y1: startPoint.y, r1: prevRadius,
    //   x2: boundX, y2: boundY, r2: (radius + prevRadius) / 2,
    //   direction: prevDirection
    // },
    // { drawCenter: false, drawLeft: (sgn != 0 || !splitMap[-1]), drawRight: (sgn != 0 || !splitMap[1]) })

    // const p2 = drawOutline({
    //   x1: boundX, y1: boundY, r1: (radius + prevRadius) / 2,
    //   x2: x, y2: y, r2: radius,
    //   direction: direction
    // },
    // { drawCenter: false, drawLeft: (sgn != 0 || !splitMap[-1]), drawRight: (sgn != 0 || !splitMap[1]) })

    generatePath(x, y, radius, direction, weight / splits.length, depth + 1, maxDepth, inBoundsFn)
  })
}

const sketch = (props) => {
  const { width, height, units } = props;
  canvasWidth = width
  canvasHeight = height
  // // Draw random arcs
  // const count = 450;
  // for (let i = 0; i < count; i++) {
  //   // setup arc properties randomly
  //   const angle = Random.gaussian(0, Math.PI / 2);
  //   const arcLength = Math.abs(Random.gaussian(0, Math.PI / 2));
  //   const r = ((i + 1) / count) * Math.min(width, height) / 1;

  //   // draw the arc
  //   const p = createPath();
  //   p.arc(width / 2, height / 2, r, angle, angle + arcLength);
  //   paths.push(p);
  // }
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
      paths.push(p)

      let x = topLeftX + rectWidth / 2
      let y = topLeftY + rectHeight * 1
      let inBoundsFn = (cx, cy, cr) => {
        if (cx < topLeftX) return false
        if (cx > topLeftX + rectWidth) return false
        if (cy < topLeftY) return false
        if (cy > topLeftY + rectHeight) return false
        return true
      }
      generatePath(x, y, 0.35, -Math.PI / 2, 1, 0, 312, inBoundsFn)
    }
  }  

  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let lines = pathsToPolylines(paths, { units });

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
    optimize: false
  });
};

canvasSketch(sketch, settings);
