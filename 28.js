const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
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

const sketch = (props) => {
  const { width, height, units } = props;

  // Holds all our 'path' objects
  // which could be from createPath, or SVGPath string, or polylines
  const paths = [];

  const topLeft = { x: 1, y: 1 }
  const bottomRight = { x: width - 1, y: height - 1 }

  // Draw random arcs
  const count = 300;
  let delta
  for (let i = 0; i <= count; i++) {
    // setup arc properties randomly
    const p = createPath();
    let y = map(i, 0, count, topLeft.y, bottomRight.y)
    let prevY = map(i - 1, 0, count, topLeft.y, bottomRight.y)
    delta = y - prevY
    p.moveTo(topLeft.x, y)
    p.lineTo(bottomRight.x, y)
    paths.push(p);
  }

  let slashStart = { x: width * 7 / 10, y: topLeft.y}
  let slashStop = { x: width * 4 / 10, y: bottomRight.y}

  let offset = 0
  for (let i = 0; i < 20; i++) {
    const p = createPath()
    p.moveTo(slashStart.x + offset, slashStart.y)
    p.lineTo(slashStop.x + offset, slashStop.y)
    paths.push(p)  
    offset += delta
  }

  slashStart = { x: topLeft.x, y: height * 6 / 10}
  slashStop = { x: bottomRight.x, y: height * 8.5 / 10}

  offset = 0
  for (let i = 0; i < 35; i++) {
    const p = createPath()
    p.moveTo(slashStart.x, slashStart.y + offset)
    p.lineTo(slashStop.x, slashStop.y + offset)
    paths.push(p)  
    offset += delta
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
    lineWidth: 0.06,
    // Optimize SVG paths for pen plotter use
    optimize: false
  });
};

canvasSketch(sketch, settings);
