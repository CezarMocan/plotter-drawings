const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const paper = require('paper/dist/paper-core')
const { squaredDistance } = require('canvas-sketch-util/lib/vec2');
const p5 = require('p5');
const random = require('canvas-sketch-util/random');
new p5()
paper.setup(document.createElement('canvas'))

let paths = []
let N, M
let polygons = []
let W, H

// You can force a specific seed by replacing this with a string value
const defaultSeed = '';

const FILL_LINE_SPACING = 0.03

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

const interpolate = (x, y, pct) => {
  return x + (y - x) * pct
}

const interpolatePoint = (a, b, pct1, pct2) => {
  if (pct2 === undefined) pct2 = pct1
  return {
    x: interpolate(a.x, b.x, pct1),
    y: interpolate(a.y, b.y, pct2)
  }
}

const dist = (p1, p2) => {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

const drawPolygon = (polygon, all) => {
  // console.log(polygon)
  const p = createPath()
  // p.moveTo(polygon.segments[0].point.x, polygon.segments[0].point.y)

  var inX, inY, outX, outY, curX, curY, prevX, prevY

  for (let i = 0; i <= polygon.segments.length; i++) {
    let index = i % polygon.segments.length

    const segment = polygon.segments[index]
    const point = segment.point
    let handle = segment.handleIn;

    // console.log(point, handle)
    curX = point.x, curY = point.y

    if (i == 0 ) {
      p.moveTo(curX, curY)
    } else {
      inX = curX + handle.x;
      inY = curY + handle.y;
      if (inX === curX && inY === curY && outX === prevX && outY === prevY) {
        p.lineTo(curX, curY);
      } else {
        // if (Math.random() < 0.9)
        // if (!all && Math.random() < 0.25) {

        // } else {
          p.bezierCurveTo(outX, outY, inX, inY, curX, curY);
        // }
          
      }
    }
    prevX = curX;
    prevY = curY;
    handle = segment.handleOut;
    outX = prevX + handle.x;
    outY = prevY + handle.y;
  }
  paths.push(p)
}

const getPolygonCenter = (polygon) => {
  const fullCenterX = polygon.segments.reduce((acc, s) => (acc + s.point.x), 0) / polygon.segments.length
  const fullCenterY = polygon.segments.reduce((acc, s) => (acc + s.point.y), 0) / polygon.segments.length
  return { x: fullCenterX, y: fullCenterY }
}

const allPolys = []

const contains = (polys, point) => {
  for (let i = polys.length - 1; i >= 0; i--) {
    if (polys[i].contains(point)) return polys[i]
  }
  return null
}

const createPolygon = (center, radius, noPoints, scale, angleOffset) => {
  const polygon = new paper.Path()

  for (let i = 0; i <= noPoints; i++) {
    const angle = map(i, 0, noPoints, 0, 2 * PI)
    polygon.add(new paper.Point(
      Math.cos(angle + angleOffset) * radius * scale.x + center.x,
      Math.sin(angle + angleOffset) * radius * scale.y + center.y
    ))
  }

  return polygon
}

const sketch = (props) => {
  const { width, height, units } = props;
  W = width
  H = height
 
  let topLeft = { x: 1, y: 1 }
  let bottomRight = { x: width - topLeft.x, y: height - topLeft.y }

  // smoothed.interpolate(smoothed, newPath, holeSize)

  const radius = 16
  const scale = { x: 1, y: 1.33 }
  const center = { x: W / 2, y: H / 2}  
  const noPoints = 4
  const noPointsSmall = noPoints
  const angleOffset = Math.PI / 4

  const polygon = createPolygon(center, radius, noPoints, scale, angleOffset)

  const centerOffset = { x: -1.5, y: 6.0 }
  const centerSmall = { x: centerOffset.x + center.x, y: centerOffset.y + center.y }
  // const centerPolygon = createPolygon(centerSmall, 1, noPointsSmall, scale, angleOffset)
  
  drawPolygon(polygon)


  // drawPolygon(centerPolygon)  

  const subdivisionsTotal = 130
  let step = 1 / subdivisionsTotal
  for (let i = 0; i < 1; i += step) {
    const currPoly = new paper.Path()

    centerOffset.x -= Math.sin(i * 20) * 0.1
    centerOffset.y -= Math.cos(i * 10) * 0.02
    const centerSmall = { x: centerOffset.x + center.x, y: centerOffset.y + center.y }
    const centerPolygon = createPolygon(centerSmall, 0.5, noPointsSmall, { x: 0.275, y: 6 }, angleOffset + (1 - i))

    currPoly.interpolate(polygon, centerPolygon, i)    

    if (random.noise1D(i, 100, 1) > -1)
      drawPolygon(currPoly)
    
    step += Math.sin(i * 200) * 0.0003

    allPolys.push(currPoly.clone())
  }
  
  console.log(allPolys)
  for (let i = 0; i < allPolys.length - 1; i++) {
    const path = createPath()
    for (let steps = 0; steps < 1; steps += 0.05) {
      let currPoint = interpolatePoint(allPolys[i].segments[2].point, allPolys[i].segments[3].point, steps)
      let nextPoint = interpolatePoint(allPolys[i + 1].segments[2].point, allPolys[i + 1].segments[3].point, steps)

      path.moveTo(currPoint.x + random.noise2D(currPoint.x, currPoint.y, 0.1, 0.05), currPoint.y)
      path.lineTo(nextPoint.x + random.noise2D(nextPoint.x, nextPoint.y, 0.1, 0.05), nextPoint.y)

      currPoint = interpolatePoint(allPolys[i].segments[3].point, allPolys[i].segments[0].point, steps)
      nextPoint = interpolatePoint(allPolys[i + 1].segments[3].point, allPolys[i + 1].segments[0].point, steps)

      path.moveTo(currPoint.x, currPoint.y)
      if (random.noise2D(nextPoint.x, nextPoint.y, 2, 1) > 0)
        path.lineTo(nextPoint.x, nextPoint.y)

      currPoint = interpolatePoint(allPolys[i].segments[0].point, allPolys[i].segments[1].point, steps)
      nextPoint = interpolatePoint(allPolys[i + 1].segments[0].point, allPolys[i + 1].segments[1].point, steps)

      path.moveTo(currPoint.x, currPoint.y)
      if (random.noise2D(nextPoint.x, nextPoint.y, 10, 1) > 0.5)
        path.lineTo(nextPoint.x, nextPoint.y)

      currPoint = interpolatePoint(allPolys[i].segments[1].point, allPolys[i].segments[2].point, steps)
      nextPoint = interpolatePoint(allPolys[i + 1].segments[1].point, allPolys[i + 1].segments[2].point, steps)

      path.moveTo(currPoint.x, currPoint.y)
      if (random.noise2D(nextPoint.x, nextPoint.y, 1, 1) > 0)
        path.lineTo(nextPoint.x, nextPoint.y)
      // else

    }
    paths.push(path)
  }  

  let lines = pathsToPolylines(paths, { units });

  // Clip to bounds, using a margin in working units
  const margin = 0.5; // in working 'units' based on settings
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
