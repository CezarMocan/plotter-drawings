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

const drawPolygon = (polygon) => {
  const p = createPath()
  var inX, inY, outX, outY, curX, curY, prevX, prevY
  for (let i = 0; i <= polygon.segments.length; i++) {
    let index = i % polygon.segments.length

    const segment = polygon.segments[index]
    const point = segment.point
    let handle = segment.handleIn;
    curX = point.x, curY = point.y

    if (i == 0) {
      p.moveTo(curX, curY)
    } else {
      inX = curX + handle.x;
      inY = curY + handle.y;
      if (random.noise2D(curX, curY, 1, 1) < 0.5) p.moveTo(curX, curY)
      else {
        if (inX === curX && inY === curY && outX === prevX && outY === prevY) {
          p.lineTo(curX, curY);
        } else {
          p.bezierCurveTo(outX, outY, inX, inY, curX, curY);          
        }  
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

const sketch = (props) => {
  const { width, height, units } = props;
  
  N = 24
  M = N * 12 / 9

  let topLeft = { x: 1, y: 1 }
  let bottomRight = { x: width - topLeft.x, y: height - topLeft.y }

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      let p = interpolatePoint(topLeft, bottomRight, i / N, j / M)
      let p2 = interpolatePoint(topLeft, bottomRight, (i + 1) / N, (j + 1) / M)
      let rf = 0.1
      let poly = new paper.Path([
        new paper.Point(p.x + random.noise2D(i, j, 1, rf), p.y + random.noise2D(i, j, 1.3, rf)),
        new paper.Point(p.x + random.noise2D(i, j, 1.2, rf), p2.y + random.noise2D(i, j, 1.1, rf)),
        new paper.Point(p2.x + random.noise2D(i, j, 1.6, rf), p2.y + random.noise2D(i, j, 1.8, rf)),
        new paper.Point(p2.x + random.noise2D(i, j, 1.8, rf), p.y + random.noise2D(i, j, 2.3, rf)),
      ])
      poly.closePath()

      const centerX = poly.segments.reduce((acc, s) => (acc + s.point.x), 0) / poly.segments.length
      const centerY = poly.segments.reduce((acc, s) => (acc + s.point.y), 0) / poly.segments.length  

      const smoothed = poly.clone()
      smoothed.smooth({ type: 'continuous' })

      let centerPoly = new paper.Path([
        new paper.Point(centerX, centerY),
        new paper.Point(centerX, centerY + 0.001),
        new paper.Point(centerX + 0.001, centerY + 0.001),
        new paper.Point(centerX + 0.001, centerY),
      ])
      centerPoly.closePath()
  
      const smallPoly = poly.clone()
      smallPoly.interpolate(poly, centerPoly, -0.5)

      // poly.interpolate(poly, smoothed, random.noise2D(i, j, 0.1, 0.5) + 0.5)
      let newPoly = poly.clone()
      for (let t = -20; t < (10 / 3); t++) {
        newPoly.interpolate(poly, centerPoly, t / (44 / 3))
        drawPolygon(newPoly)
      }
      // drawPolygon(newPoly)

      let steps = Math.floor(random.noise2D(i, j, 1, 5) + 5)
      let distance = 0.2 + random.noise2D(p.x, p.y, 0.5, 0.15)
      let angle = map(random.noise2D(p.x, p.y, 0.06, 1), -1, 1, 0, 2 * Math.PI)
      angle -= angle % (Math.PI / 4)
      let center = { 
        x: (p.x + p2.x) / 2 + Math.cos(angle - Math.PI / 2) * (steps / 2) * distance, 
        y: (p.y + p2.y) / 2 + Math.sin(angle - Math.PI / 2) * (steps / 2) * distance 
      }
      let radius = (p2.x - p.x) * 5

      for (let k = 0; k <= steps; k++) {
        let p1 = { x: Math.cos(angle) * radius + center.x, y: Math.sin(angle) * radius + center.y }
        let p2 = { x: Math.cos(angle + Math.PI) * radius + center.x, y: Math.sin(angle + Math.PI) * radius + center.y }
        let line = new paper.Path([ new paper.Point(p1.x, p1.y), new paper.Point(p2.x, p2.y) ])
        let intersection = line.getIntersections(smallPoly)
        if (intersection.length > 0) {
          let start = intersection[0].point
          let stop = intersection[1].point
          const p = createPath()
          p.moveTo(start.x, start.y)
          const interSteps = 15
          for (let interStep = 0; interStep <= interSteps; interStep++) {
            const pt = interpolatePoint(start, stop, interStep / interSteps, interStep / interSteps)
            pt.x += random.noise3D(pt.x, pt.y, interStep, 0.1, 0.08)
            if (random.noise2D(pt.x, pt.y, 2, 1) < -0.4) p.moveTo(pt.x, pt.y)
            else p.lineTo(pt.x, pt.y)
          }                    
          paths.push(p)  
        }

        center.x += Math.cos(angle + Math.PI / 2) * distance
        center.y += Math.sin(angle + Math.PI / 2) * distance
        // console.log(intersection)
        // drawPolygon(intersection)
      }
    }
  }

  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
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
