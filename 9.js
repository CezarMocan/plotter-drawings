const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const p5 = require('p5');
const random = require('canvas-sketch-util/random');

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

const generateBubble = (radius, width, height, noPoints, f1, f2, dots, sticks) => {
  for (let i = 0; i < noPoints; i++) {    
    // const weightVal = Math.sin(((weightLimit - i) / weightLimit) / 950) / 1300 + random.noise1D(i, 0.008, 0.003)
    const weight = createVector(0, 0)
    const pos = {}
    // 6, 7.5
    let waveFun = Math.sin(map(i, 0, noPoints - 1, 0, f1 * Math.PI)) * Math.cos(map(i, 0, noPoints - 1, 0, f2 * Math.PI))
    const radiusFun = radius * map(waveFun, -1, 1, 0.8, 1.2)
    pos.x = Math.cos(map(i, 0, noPoints, 0, 2 * Math.PI)) * radiusFun + width / 2
    pos.y = Math.sin(map(i, 0, noPoints, 0, 2 * Math.PI)) * radiusFun + height / 2
    const finalPos = {
      x: pos.x + random.noise2D(pos.x, pos.y, 0.3, 0.15),
      y: pos.y + random.noise2D(pos.x, pos.y, 0.3, 0.15),
    }
    // pos.x += random.noise2D()
    dots.push(new Dot(finalPos.x, finalPos.y, weight)); 

    if (i > 0) {
      sticks.push(new Stick(dots[i - 1], dots[i]))
    }
  }
  sticks.push(new Stick(dots[0], dots[noPoints - 1]))
}

const sketch = (props) => {
  const { width, height, units } = props;

  // Holds all our 'path' objects
  // which could be from createPath, or SVGPath string, or polylines
  const paths = [];

  const noPoints = 150
  const weightLimit = noPoints
  
  let dots = [], sticks = []
  generateBubble(7, width, height, noPoints, 6, 7.5, dots, sticks)

  let dots2 = [], sticks2 = []
  generateBubble(5, width, height, noPoints, 6.2, 7.1, dots2, sticks2)

  let dots3 = [], sticks3 = []
  generateBubble(4.4, width, height, noPoints, 3.8, 5.53, dots3, sticks3)

  let dots4 = [], sticks4 = []
  generateBubble(1.8, width, height, noPoints, 6, 7.5, dots4, sticks4)

  const resolution = 60
  const stickLayers = []

  let dotLayers = [
   dots, dots3, dots4
  ]

  for (let dotLayer = 0; dotLayer < dotLayers.length - 1; dotLayer++) {
    dots = dotLayers[dotLayer]
    dots2 = dotLayers[dotLayer + 1]

    let allDots = []
    let allSticks = []
  
    for (let step = 0; step < resolution; step++) {
      allDots.push([])
      allSticks.push([])
      for (let i = 0; i < noPoints; i++) {
        const amt = map(step, 0, resolution - 1, 0, 1)
        const newIndex = Math.floor(i + 0.5 * (step)) % noPoints
        const pos = dots[i].lerp(dots2[newIndex].pos, amt)
        // if (step == 5 && i % 10 == 0) console.log(step, i, dots[i], dots2[i], amt, pos)
        allDots[step].push(new Dot(pos.x, pos.y, createVector(0, 0)))
        if (i > 0) allSticks[step].push(new Stick(allDots[step][i - 1], allDots[step][i]))
      }
      allSticks[step].push(new Stick(allDots[step][noPoints - 1], allDots[step][0]))
    }

    stickLayers.push(allSticks)
  }

  for (let allSticks of stickLayers) {
    for (let sticks of allSticks) {
      const p = createPath()
      for (let s of sticks) {
        let pos = s.startPoint.pos
        let amt = map(random.noise2D(pos.x, pos.y, 2.85, 1), -1, 1, 0, 1)
        const newPos = s.startPoint.lerp(s.endPoint.pos, amt)
        // if (random.noise2D(pos.x, pos.y, 0.15, 1) < 0) s.render(p)
        // s.render(p)
        p.moveTo(s.startPoint.pos.x, s.startPoint.pos.y)
        p.lineTo(newPos.x, newPos.y)    
      }
      // for (let s of sticks2) s.render(p)
      paths.push(p)          
    }  
  }
    
  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let linesToRender = pathsToPolylines(paths, { units });

  // Clip to bounds, using a margin in working units
  const margin = 1; // in working 'units' based on settings
  const actualMargin = 0.1
  const box = [ actualMargin, actualMargin, width - actualMargin, height - actualMargin ];
  linesToRender = clipPolylinesToBox(linesToRender, box);

  // The 'penplot' util includes a utility to render
  // and export both PNG and SVG files
  return props => renderPaths(linesToRender, {
    ...props,
    lineJoin: 'round',
    lineCap: 'round',
    // in working units; you might have a thicker pen
    lineWidth: 0.025,
    // Optimize SVG paths for pen plotter use
    optimize: true
  });
};

canvasSketch(sketch, settings);
